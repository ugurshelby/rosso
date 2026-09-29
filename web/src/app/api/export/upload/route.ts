import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  validateUpload,
  guvenliDosyaAdi,
  AKTIF_IS_SINIRI,
  SAATLIK_YUKLEME_SINIRI,
} from '@/lib/export/validate-upload'
import { systemLog } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

/** 'uploading' durumunda bu süreden uzun kalan iş terk edilmiş sayılır (sınırı tıkamaz). */
const TERK_EDILMIS_YUKLEME_MS = 3 * 60 * 60 * 1000

/**
 * Spotify export ZIP upload — Phase 1: job kaydı + signed upload URL üret.
 * Dosya bu route'dan GEÇMİYOR — browser Supabase Storage'a direkt yükler (Vercel 4.5MB limitini bypass eder).
 *
 * Akış:
 *   POST {fileName, fileSize, fileType} → export_jobs kaydı (status='uploading') → createSignedUploadUrl → {jobId, signedUrl, path, token}
 *   Browser → fetch(signedUrl, ZIP) → Storage
 *   POST /api/export/queue {jobId} → dosya DOĞRULANIR → status=queued → worker işler
 *
 * 🔴 'uploading' (2026-09-23, migration 0342): kayıt eskiden doğrudan 'queued'
 * açılıyordu. Başka bir kullanıcının yüklemesi worker'ı uyandırınca worker,
 * dosyası henüz Storage'a inmemiş bu işi alıp 404 ile 'failed' yapabiliyordu.
 * Artık iş yalnız /api/export/queue dosyayı doğruladıktan SONRA kuyruğa girer.
 *
 * KÖTÜYE KULLANIM SINIRLARI (DB'den sayılır — sunucusuz örnekler arasında
 * bellek-içi sayaç paylaşılmaz): aynı anda en fazla `AKTIF_IS_SINIRI` aktif
 * iş, saatte en fazla `SAATLIK_YUKLEME_SINIRI` yükleme. Spotify en fazla 3
 * paket verir; meşru kullanım bunların çok altında kalır.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You need to sign in.' }, { status: 401 })

  const body = await request.json().catch(() => null) as { fileName?: string; fileSize?: number; fileType?: string } | null
  if (!body?.fileName || typeof body.fileName !== 'string') {
    return NextResponse.json({ error: 'Dosya bilgisi eksik.' }, { status: 400 })
  }

  const check = validateUpload({ name: body.fileName, type: body.fileType ?? '', size: body.fileSize ?? 0 })
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const service = await createServiceClient()

  // ── Kötüye kullanım sınırları ──────────────────────────────────────────────
  const simdi = Date.now()
  const saatOnce = new Date(simdi - 60 * 60 * 1000).toISOString()
  const terkSiniri = new Date(simdi - TERK_EDILMIS_YUKLEME_MS).toISOString()

  const [{ count: aktif }, { count: saatlik }] = await Promise.all([
    service
      .from('export_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['uploading', 'queued', 'processing'])
      // 'uploading' iş yarım kaldıysa sonsuza dek sayılmasın.
      .or(`status.neq.uploading,created_at.gt.${terkSiniri}`),
    service
      .from('export_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('created_at', saatOnce),
  ])

  if ((aktif ?? 0) >= AKTIF_IS_SINIRI) {
    return NextResponse.json(
      { error: 'Zaten işlenen dosyaların var — bitmelerini bekle, sonra yenisini yükle.' },
      { status: 429, headers: { 'Retry-After': '300' } },
    )
  }
  if ((saatlik ?? 0) >= SAATLIK_YUKLEME_SINIRI) {
    return NextResponse.json(
      { error: 'Bu saat için yükleme sınırına ulaştın — biraz sonra tekrar dene.' },
      { status: 429, headers: { 'Retry-After': '900' } },
    )
  }

  // export_jobs kaydı: 'uploading' — worker dosya doğrulanana kadar bunu ALMAZ.
  const { data: job, error: jobError } = await service
    .from('export_jobs')
    .insert({
      user_id: user.id,
      status: 'uploading',
      file_name: guvenliDosyaAdi(body.fileName),
      file_size: body.fileSize ?? 0,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    void systemLog({ userId: user.id, operation: 'export_upload', severity: 'error', errorCode: 'EXPORT_JOB_INSERT_FAILED', errorMessage: jobError?.message })
    return NextResponse.json({ error: 'Job record couldn’t be created.' }, { status: 500 })
  }

  const path = `${user.id}/${job.id}.zip`

  // file_path kaydet
  await service.from('export_jobs').update({ file_path: path }).eq('id', job.id)

  // Signed upload URL üret (2 saat geçerli)
  const { data: signed, error: signError } = await service.storage
    .from('spotify-exports')
    .createSignedUploadUrl(path)

  if (signError || !signed) {
    await service.from('export_jobs').update({ status: 'failed', error_message: 'Signed URL üretilemedi.' }).eq('id', job.id)
    return NextResponse.json({ error: 'Upload couldn’t start.' }, { status: 500 })
  }

  return NextResponse.json({ jobId: job.id, signedUrl: signed.signedUrl, path, token: signed.token }, { status: 200 })
}
