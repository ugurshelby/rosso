import { after, NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, PAHALI_URETIM_LIMIT, rateLimitRetryAfterSeconds } from '@/lib/security/rate-limit'
import { isUuid } from '@/lib/security/route-params'
import { dispatchWorkerEvent } from '@/lib/worker/dispatch'
import { MAX_ZIP_BYTES, zipImzasiMi } from '@/lib/export/validate-upload'

export const dynamic = 'force-dynamic'

const BUCKET = 'spotify-exports'

type ServisIstemcisi = Awaited<ReturnType<typeof createServiceClient>>

/**
 * Storage'daki nesnenin boyutu (bayt) — yoksa null. Nesne listesi metadata
 * döner; dosyayı İNDİRMEZ.
 */
async function nesneBoyutu(service: ServisIstemcisi, userId: string, jobId: string): Promise<number | null> {
  const { data, error } = await service.storage.from(BUCKET).list(userId, { search: `${jobId}.zip`, limit: 1 })
  if (error) return null
  const nesne = data?.find((n) => n.name === `${jobId}.zip`)
  const boyut = (nesne?.metadata as { size?: number } | null | undefined)?.size
  return typeof boyut === 'number' ? boyut : null
}

/**
 * İlk 4 bayt gerçekten ZIP mi? `Range` isteğiyle yalnız başlık okunur — 200 MB'ı
 * sunucuya çekmez. Sunucu Range'i yok sayıp tam gövde dönerse ilk parça
 * okunduktan sonra akış iptal edilir.
 */
async function zipBasligiVarMi(service: ServisIstemcisi, path: string): Promise<boolean> {
  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, 60)
  if (error || !data?.signedUrl) return false
  try {
    const res = await fetch(data.signedUrl, {
      headers: { Range: 'bytes=0-3' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok || !res.body) return false
    const okuyucu = res.body.getReader()
    const { value } = await okuyucu.read()
    await okuyucu.cancel().catch(() => {})
    return value ? zipImzasiMi(value) : false
  } catch {
    return false
  }
}

/**
 * Export queue — Storage upload tamamlandı, dosyayı DOĞRULA ve işleme sırasına al.
 *
 * Cron-tabanlı worker (spec 2026-06-29): pgmq kaldırıldı. `export_jobs.status`
 * sütununun kendisi kuyruk işlevi görür — worker'ın export cron'u
 * `status='queued'` job'ları bulup işler.
 *
 * 🔴 DOĞRULAMA KAPISI (2026-09-23): iş 'uploading' → 'queued' geçişini YALNIZ
 * burada, şu üç kontrolden sonra yapar:
 *   1. Nesne Storage'da VAR (yükleme gerçekten bitti),
 *   2. boyut `MAX_ZIP_BYTES` altında (bucket sınırı ikinci savunma hattı),
 *   3. ilk 4 bayt ZIP imzası (uzantısı .zip yapılmış rastgele dosya worker'a hiç ulaşmaz).
 * Geçemeyen dosya Storage'dan SİLİNİR ve iş 'failed' olur — depo çöp tutmaz.
 * Derin içerik denetimi (giriş sayısı, yol geçişi, zip-bomb) worker'da.
 *
 * POST { jobId } → doğrulama → status: uploading → queued → worker
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You need to sign in.' }, { status: 401 })

  /*
   * 🔴 RATE LIMIT (2026-08-22 güvenlik taraması) — bu uç PAHALI:
   * Uzun süren bir dışa aktarma işi kuyruğa alıyor. Döngüye giren bir
   * istemci ya da sabırsız çift tıklama dış API kotasını yakar.
   */
  const limit = checkRateLimit(`export-queue:${user.id}`, PAHALI_URETIM_LIMIT.limit, PAHALI_URETIM_LIMIT.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'You tried too often — wait a bit.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitRetryAfterSeconds(limit.resetAt)) } },
    )
  }

  const body = await request.json().catch(() => null) as { jobId?: string } | null
  // Yalnız VARLIK değil BİÇİM de doğrulanır (id kolonu uuid).
  if (!isUuid(body?.jobId)) return NextResponse.json({ error: 'Invalid jobId.' }, { status: 400 })

  const service = await createServiceClient()

  // Job bu kullanıcıya ait mi + path'i al
  const { data: job, error: fetchError } = await service
    .from('export_jobs')
    .select('id, file_path, user_id, status')
    .eq('id', body.jobId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (!job.file_path) return NextResponse.json({ error: 'Dosya yolu eksik.' }, { status: 400 })

  // Çift tıklama / yeniden deneme: zaten kuyruğa alınmış ya da işlenmiş iş tekrar doğrulanmaz.
  if (job.status !== 'uploading') {
    return NextResponse.json({ jobId: job.id }, { status: 202 })
  }

  const reddet = async (mesaj: string, kod: number, hataKodu: string) => {
    await service.storage.from(BUCKET).remove([job.file_path as string]).catch(() => {})
    await service
      .from('export_jobs')
      .update({ status: 'failed', error_message: hataKodu })
      .eq('id', job.id)
      .eq('status', 'uploading')
    return NextResponse.json({ error: mesaj }, { status: kod })
  }

  const boyut = await nesneBoyutu(service, user.id, job.id)
  if (boyut === null) {
    // Yükleme bitmemiş olabilir — iş 'uploading' KALIR (istemci yeniden deneyebilir).
    return NextResponse.json({ error: 'Dosya henüz yüklenmemiş görünüyor — yüklemeyi tekrar dene.' }, { status: 409 })
  }
  if (boyut <= 0 || boyut > MAX_ZIP_BYTES) {
    return reddet('Dosya boyutu geçersiz (en fazla 200 MB).', 413, 'boyut_gecersiz')
  }
  if (!(await zipBasligiVarMi(service, job.file_path))) {
    return reddet('Bu dosya geçerli bir ZIP değil.', 415, 'zip_degil')
  }

  // Yalnız 'uploading' → 'queued' (koşullu güncelleme: yarış halinde tek çağrı kazanır).
  const { data: guncellenen } = await service
    .from('export_jobs')
    .update({ status: 'queued', file_size: boyut })
    .eq('id', job.id)
    .eq('status', 'uploading')
    .select('id')
  if (!guncellenen || guncellenen.length === 0) {
    return NextResponse.json({ jobId: job.id }, { status: 202 })
  }

  // On-demand worker'ı uyandır (cron-system.md ADIM 2). Sıfır Maliyet
  // Mimarisi'nde 7/24 worker yok — GitHub Actions yalnız bu
  // repository_dispatch ile tetiklenir. Hata ZIP yükleme akışını ASLA bloke
  // etmemeli: sessizce loglanır, iş 'queued' kalır.
  //
  // `after()` ŞART, `void` DEĞİL (ÖLÇÜLDÜ 2026-09-21): `void` ile yanıt
  // döndükten sonra Vercel fonksiyonu donduruyor, GitHub isteği hiç
  // tamamlanmıyordu.
  after(() => dispatchWorkerEvent('process_new_export', { job_id: job.id }, 'export_queue_wake_worker'))

  return NextResponse.json({ jobId: job.id }, { status: 202 })
}
