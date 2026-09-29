import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/logging/system-logger'
import { isUuid } from '@/lib/security/route-params'

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You need to sign in.' }, { status: 401 })

  const body = await request.json().catch(() => null) as { jobId?: string } | null
  const jobId = body?.jobId
  /*
   * ⚠ Yalnız VARLIK değil BİÇİM de doğrulanıyor (2026-08-22): `id`
   * kolonu `uuid` tipinde ve doğrulanmamış bir dize DB'ye gidip
   * gereksiz hata üretiyordu. Güvenlik açığı değildi (sorgu zaten
   * `user_id` ile sınırlı) ama sağlamlık meselesi — geçersiz girdi
   * sınırda durmalı, veritabanında değil.
   */
  if (!isUuid(jobId)) return NextResponse.json({ error: 'Invalid jobId.' }, { status: 400 })

  const service = await createServiceClient()

  // Job bu kullanıcıya ait mi + file_path'i al
  const { data: job, error: fetchError } = await service
    .from('export_jobs')
    .select('id, file_path, user_id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  }

  // Storage ZIP sil (worker zaten siliyor ama failed job'larda kalabilir)
  if (job.file_path) {
    await supabase.storage.from('spotify-exports').remove([job.file_path])
  }

  // play_events sil (job'a ait period_start/end aralığındaki değil, job_id yok —
  // tüm kullanıcı verisi değil, yalnızca bu job'un yazdığı event'ler temizlenemez
  // çünkü job_id play_events'te yok. Kullanıcı "Verileri sil" derse tüm play_events silinir.)
  // export_jobs sil (cascade yok, manuel)
  const { error: deleteError } = await service
    .from('export_jobs')
    .delete()
    .eq('id', jobId)
    .eq('user_id', user.id)

  if (deleteError) {
    void systemLog({
      userId: user.id,
      operation: 'export_delete',
      severity: 'error',
      errorCode: 'EXPORT_JOB_DELETE_FAILED',
      errorMessage: deleteError.message,
      relatedId: jobId,
    })
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
