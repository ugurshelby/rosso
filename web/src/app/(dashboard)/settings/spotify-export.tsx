'use client'

import { validateUpload, zipImzasiMi } from '@/lib/export/validate-upload'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, CheckCircle2, AlertTriangle, RotateCcw, FileArchive, Clock, XCircle, Trash2, CalendarRange, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MatrixLoader } from '@/components/export/matrix-loader'
import { ExportStageProgress, exportStagePresentation } from '@/components/export/export-stage-progress'
import { ProcessingTicker } from '@/components/export/processing-ticker'
import { useExportProgress } from '@/lib/export/use-export-progress'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import type { ExportJobState } from '@/lib/export/use-export-progress'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'
import styles from './spotify-export.module.css'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return ''
  if (start && end) {
    const s = new Date(start).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    const e = new Date(end).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    return s === e ? s : `${s} – ${e}`
  }
  if (end) return `… – ${formatDate(end)}`
  return `${formatDate(start)} – …`
}

// ── ZIP tipi etiketleri (FAZ EXPORT-V2, 2026-07-19) ──────────────────────────
// Worker'ın detect_zip_type çıktısı export_jobs.export_type'a yazılır; burada
// kullanıcı diline çevrilir. Eski job'larda alan NULL — etiket gösterilmez.
function exportTypeLabels(t: Translator['t']): Record<string, string> {
  return {
    streaming_history: t('settings.export.typeLabels.streamingHistory'),
    account_data: t('settings.export.typeLabels.accountData'),
    technical_log: t('settings.export.typeLabels.technicalLog'),
    mixed: t('settings.export.typeLabels.mixed'),
  }
}

function exportTypeLabel(t: Translator['t'], type: string | null | undefined): string | null {
  return type ? exportTypeLabels(t)[type] ?? null : null
}

/** Yan-veri ZIP'lerinde sayılar şarkı değil kayıttır (beğeni/playlist olayı/sinyal). */
function eventUnit(t: Translator['t'], type: string | null | undefined): string {
  return type === 'account_data' || type === 'technical_log'
    ? t('settings.export.unit.records')
    : t('settings.export.unit.tracks')
}

// ── Geçmiş Job Satırı ────────────────────────────────────────────────────────
function PastJobRow({
  job,
  onDelete,
}: {
  job: ExportJobState
  onDelete: (id: string) => void
}) {
  const { t } = useT()
  const [confirming, setConfirming] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timer) clearTimeout(timer) }
  }, [timer])

  useEffect(() => {
    if (!confirming || countdown <= 0) return
    const timeoutId = setTimeout(() => setCountdown(p => p - 1), 1000)
    return () => clearTimeout(timeoutId)
  }, [confirming, countdown])

  function startDelete() {
    setConfirming(true)
    setCountdown(5)
    const timeoutId = setTimeout(() => onDelete(job.id), 5000)
    setTimer(timeoutId)
  }

  function cancelDelete() {
    if (timer) clearTimeout(timer)
    setTimer(null)
    setConfirming(false)
    setCountdown(5)
  }

  const failed = job.status === 'failed'
  const period = formatPeriod(job.period_start, job.period_end)

  return (
    <div className={styles.pastJobRow}>
      <div className={styles.pastJobIcon}>
        {failed
          ? <XCircle size={16} style={{ color: 'var(--color-error)' }} aria-hidden />
          : <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} aria-hidden />
        }
      </div>
      <div className={styles.pastJobInfo}>
        <span className={styles.pastJobName}>
          {job.file_name?.replace('.zip', '') ?? t('settings.export.processing.handoffFileNameless')}
        </span>
        <div className={styles.pastJobMeta}>
          {period && (
            <span className={styles.pastJobPeriod}>
              <CalendarRange size={10} aria-hidden />
              {period}
            </span>
          )}
          <span>{formatDate(job.completed_at ?? job.created_at)}</span>
          {exportTypeLabel(t, job.export_type) && (
            <span>{exportTypeLabel(t, job.export_type)}</span>
          )}
          {job.file_size && <span>{formatBytes(job.file_size)}</span>}
          {!failed && job.processed_events != null && (
            <span>{job.processed_events.toLocaleString('en-US')} {eventUnit(t, job.export_type)}</span>
          )}
          {failed && (
            <span style={{ color: 'var(--color-error)' }}>{t('settings.export.failedStatus')}</span>
          )}
        </div>
      </div>
      <div className={styles.pastJobActions}>
        {confirming ? (
          <>
            <span className={styles.pastJobCountdown}>{t('settings.export.uploading.secondsLeft', { count: countdown })}</span>
            <button className={styles.pastJobUndoBtn} onClick={cancelDelete}>{t('settings.export.undo')}</button>
          </>
        ) : (
          <button className={styles.pastJobDeleteBtn} onClick={startDelete} aria-label={t('settings.export.deleteAria')}>
            <Trash2 size={13} aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Processing View ───────────────────────────────────────────────────────────
// İşleme süresi öngörülemez (Spotify lookup + büyük ZIP) — yanıltıcı yüzde yerine
// dürüst bir bekleme deneyimi: Matrix animasyonu + "analiz ediliyor" mesajı.
function ProcessingView({ job }: { job: ExportJobState | null }) {
  const period = formatPeriod(job?.period_start, job?.period_end)
  const stage = exportStagePresentation(job)
  return (
    <div className={styles.statusBox}>
      <MatrixLoader />
      <div className={styles.processingInfo}>
        <span className={styles.processingHeadline}>{stage.headline}</span>
        <span className={styles.processingMessage}>{stage.detail}</span>
        {/* Dönen gerçek durum satırı — ekranın statik kalmamasının tek
            dürüst yolu. Satırlar `export-stage-ticker.ts`'te ve hepsi
            gerçekten dolu olan alanlardan türüyor. */}
        <ProcessingTicker job={job} />
        <ExportStageProgress job={job} />
        {job?.file_name && (
          <span className={styles.processingFileName}>
            <FileArchive size={13} aria-hidden />
            {job.file_name.replace('.zip', '')}
          </span>
        )}
        {period && (
          <span className={styles.processingPeriod}>
            <CalendarRange size={12} aria-hidden />
            {period}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Failed View ───────────────────────────────────────────────────────────────
function FailedView({
  job,
  onRetry,
  onDelete,
}: {
  job: ExportJobState
  onRetry: () => void
  onDelete: (id: string) => void
}) {
  const { t } = useT()
  const period = formatPeriod(job.period_start, job.period_end)

  const friendlyMessage = (() => {
    const msg = job.error_message ?? ''
    if (msg.includes('ConnectionTerminated') || msg.includes('RemoteProtocolError')) {
      return t('settings.export.failedMessages.connectionDropped')
    }
    if (msg.includes('403')) {
      return t('settings.export.failedMessages.forbidden')
    }
    if (msg.includes('429')) {
      return t('settings.export.failedMessages.rateLimited')
    }
    return t('settings.export.failedMessages.generic')
  })()

  return (
    <div className={styles.statusBox}>
      <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} aria-hidden />

      <div className={styles.summaryCard}>
        <div className={styles.filePreviewRow}>
          <FileArchive size={18} className={styles.fileIcon} aria-hidden />
          <div className={styles.filePreviewInfo}>
            <span className={styles.filePreviewName}>
              {job.file_name?.replace('.zip', '') ?? t('settings.export.processing.handoffFileNameless')}
            </span>
            <span className={styles.filePreviewMeta}>
              {period ? `${period} · ` : ''}{t('settings.export.failedStatus')} · {formatDate(job.created_at)}
              {job.file_size ? ` · ${formatBytes(job.file_size)}` : ''}
            </span>
          </div>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {friendlyMessage}
        </p>

        {job.processed_events != null && job.processed_events > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-geist-mono)', marginTop: 0 }}>
            {t('settings.export.playsProcessed', { count: job.processed_events.toLocaleString('en-US') })}
          </p>
        )}

        <div className={styles.summaryActions}>
          <Button variant="primary" onClick={onRetry}>
            <RotateCcw size={14} aria-hidden />
            {t('settings.export.actions.retry')}
          </Button>
          <Button variant="danger" onClick={() => onDelete(job.id)}>
            {t('settings.export.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Completed Summary View ────────────────────────────────────────────────────
function CompletedView({
  job,
  onNewUpload,
  onDelete,
}: {
  job: ExportJobState
  onNewUpload: () => void
  onDelete: (id: string) => void
}) {
  const { t } = useT()
  const [deleting, setDeleting] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timer) clearTimeout(timer) }
  }, [timer])

  useEffect(() => {
    if (!deleting || countdown <= 0) return
    const timeoutId = setTimeout(() => setCountdown(p => p - 1), 1000)
    return () => clearTimeout(timeoutId)
  }, [deleting, countdown])

  const period = formatPeriod(job.period_start, job.period_end)

  function handleDeleteRequest() {
    setDeleting(true)
    setCountdown(5)
    const timeoutId = setTimeout(() => onDelete(job.id), 5000)
    setTimer(timeoutId)
  }

  function handleUndo() {
    if (timer) clearTimeout(timer)
    setTimer(null)
    setDeleting(false)
    setCountdown(5)
  }

  return (
    <div className={styles.statusBox}>
      <CheckCircle2 size={20} className={styles.doneIcon} aria-hidden />

      <div className={styles.summaryCard}>
        {/* Signal 4 — upload preview */}
        <div className={styles.filePreviewRow}>
          <FileArchive size={18} className={styles.fileIcon} aria-hidden />
          <div className={styles.filePreviewInfo}>
            <span className={styles.filePreviewName}>
              {job.file_name?.replace('.zip', '') ?? t('settings.export.processing.handoffFileNameless')}
            </span>
            <span className={styles.filePreviewMeta}>
              {exportTypeLabel(t, job.export_type) ?? 'ZIP'} · {t('settings.export.summary.processed')} {formatDate(job.completed_at)}
              {job.file_size ? ` · ${formatBytes(job.file_size)}` : ''}
            </span>
          </div>
        </div>

        {/* Dönem bilgisi */}
        {period && (
          <div className={styles.periodBadge}>
            <CalendarRange size={13} aria-hidden />
            <span>{period}</span>
          </div>
        )}

        {/* Genre arka planda zenginleşiyor — kullanıcı recap'i şimdi görebilir */}
        {job.genre_pending && (
          <div
            className={styles.periodBadge}
            role="status"
            style={{ gap: 8 }}
          >
            <Sparkles size={13} aria-hidden />
            <span>{t('settings.export.genrePending')}</span>
          </div>
        )}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryGridItem}>
            <div className={styles.summaryTitle}>{t('settings.export.summary.processed')}</div>
            <div className={styles.summaryValue}>
              {(job.processed_events ?? 0).toLocaleString('en-US')}
            </div>
            <div className={styles.summaryMeta}>{eventUnit(t, job.export_type)}</div>
          </div>
          <div className={styles.summaryGridItem}>
            <div className={styles.summaryTitle}>{t('settings.export.summary.matched')}</div>
            <div className={styles.summaryValue}>
              {(job.matched_events ?? 0).toLocaleString('en-US')}
            </div>
            <div className={styles.summaryMeta}>{eventUnit(t, job.export_type)}</div>
          </div>
          {(job.skipped_events ?? 0) > 0 && (
            <div className={styles.summaryGridItem}>
              <div className={styles.summaryTitle}>{t('settings.export.summary.skipped')}</div>
              <div className={styles.summaryValue}>
                {(job.skipped_events ?? 0).toLocaleString('en-US')}
              </div>
              <div className={styles.summaryMeta}>{eventUnit(t, job.export_type)}</div>
            </div>
          )}
          {(job.error_count ?? 0) > 0 && (
            <div className={styles.summaryGridItem}>
              <div className={styles.summaryTitle}>{t('settings.export.summary.error')}</div>
              <div className={styles.summaryValue} style={{ color: 'var(--color-error)' }}>
                {(job.error_count ?? 0).toLocaleString('en-US')}
              </div>
              <div className={styles.summaryMeta}>{t('settings.export.summary.event')}</div>
            </div>
          )}
        </div>

        {/* Yeni Katman Açıldı Kutlama Şeridi */}
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: 'rgba(168, 85, 247, 0.12)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} style={{ color: 'var(--color-accent, #c084fc)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 500 }}>
              {t('settings.export.celebration.text')}
            </span>
          </div>
          <Link
            href="/journey"
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-accent, #c084fc)',
              textDecoration: 'underline',
              whiteSpace: 'nowrap'
            }}
          >
            {t('settings.export.celebration.cta')}
          </Link>
        </div>

        <div className={styles.summaryActions}>
          <Button variant="secondary" onClick={onNewUpload}>
            {t('settings.export.actions.uploadNew')}
          </Button>
          <Button variant="danger" onClick={handleDeleteRequest} disabled={deleting}>
            {t('settings.export.actions.deleteData')}
          </Button>
        </div>
      </div>

      {deleting && (
        <div className={styles.undoBanner}>
          <span className={styles.undoBannerText}>
            {t('settings.export.deletingBanner', { count: countdown })}
          </span>
          <button className={styles.undoButton} onClick={handleUndo} aria-label={t('settings.export.cancelAria')}>
            {t('settings.export.undo')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export function SpotifyExport() {
  const { t } = useT()
  // Tüm export_jobs kullanıcı bazında
  const [allJobs, setAllJobs] = useState<ExportJobState[] | null>(null)
  const [loadingJobs, setLoadingJobs] = useState(true)

  // Aktif (queued/processing) job ID — Realtime takibi için
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // Yeni yükleme başlatıldığında geçici olarak takip edilen job
  const [newJobId, setNewJobId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  /*
   * `null` = ilerleme BİLİNMİYOR (Storage SDK geri çağrı sunmuyor) →
   * arayüz belirsiz şerit çizer. `100` = dosya sunucuda, bu gerçek bilgi.
   * Aradaki hiçbir sayı uydurulmaz; bkz. `uploadWithProgress` yorumu.
   */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null)
  const [uploadStartedAt, setUploadStartedAt] = useState<number | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [draggedFileName, setDraggedFileName] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  // İzlenen job ID: yeni yükleme öncelikli, yoksa DB'deki aktif
  const watchJobId = newJobId ?? activeJobId
  const liveJob = useExportProgress(watchJobId)

  // Sayfa açılınca DB'den tüm export_jobs'ları çek
  useEffect(() => {
    async function loadJobs() {
      const supabase = createClient()
      const { data } = await supabase
        .from('export_jobs')
        .select('id, status, genre_pending, export_type, total_events, processed_events, matched_events, skipped_events, error_count, error_message, file_name, file_size, completed_at, created_at, period_start, period_end')
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setAllJobs(data as ExportJobState[])
        // Aktif (queued/processing) veya en son failed job'u izle
        const jobs = data as ExportJobState[]
        const hasCompleted = jobs.some(j => j.status === 'completed')
        // Başarılı bir job varsa failed'ı aktif gösterme — geçmişe düş
        const active = jobs.find(
          j => j.status === 'queued' || j.status === 'processing' || (!hasCompleted && j.status === 'failed')
        )
        if (active) setActiveJobId(active.id)
      }
      setLoadingJobs(false)
    }
    void loadJobs()
  }, [])

  // liveJob değiştiğinde allJobs listesini güncelle
  useEffect(() => {
    if (!liveJob) return
    const id = requestAnimationFrame(() => {
      setAllJobs(prev => {
        if (!prev) return [liveJob]
        const idx = prev.findIndex(j => j.id === liveJob.id)
        if (idx === -1) return [liveJob, ...prev]
        const next = [...prev]
        next[idx] = liveJob
        return next
      })
      if (liveJob.status === 'completed') {
        setActiveJobId(null)
        setNewJobId(null)
        // Yeni katman açıldı: layout'u ve seviye atlama panelini anında tetikle
        router.refresh()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [liveJob])

  // İki aşamalı upload: Vercel 4.5MB body limitini bypass etmek için
  // browser ZIP'i Supabase Storage'a direkt yükler (signed URL üzerinden).
  // Faz 1: /api/export/upload → jobId + signedUrl
  // Faz 2: XHR ile ZIP → signedUrl (Vercel'den geçmez)
  // Faz 3: /api/export/queue → worker'a mesaj
  const uploadWithProgress = useCallback(async (file: File): Promise<{ jobId: string }> => {
    /*
     * Faz 0 — TARAYICIDA ucuz ön kontrol (2026-09-23): uzantı/boyut + ilk 4
     * bayt ZIP imzası. Uzantısı .zip yapılmış resim/metin, sunucuya ve
     * Storage'a hiç gitmeden burada yakalanır. Sunucu aynı kontrolleri
     * TEKRARLAR (istemciye güvenilmez) — bu yalnız kullanıcıya hızlı geri bildirim.
     */
    const onKontrol = validateUpload({ name: file.name, type: file.type, size: file.size })
    if (!onKontrol.ok) throw new Error(onKontrol.error)
    const ilkBaytlar = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    if (!zipImzasiMi(ilkBaytlar)) {
      throw new Error(t('settings.export.error.notZip'))
    }

    // Faz 1 — job kaydı + signed URL al
    const initRes = await fetch('/api/export/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size, fileType: file.type }),
    })
    if (!initRes.ok) {
      const d = await initRes.json().catch(() => ({})) as { error?: string }
      throw new Error(d.error ?? t('settings.export.error.startFailed'))
    }
    const { jobId, signedUrl, path, token } = await initRes.json() as { jobId: string; signedUrl: string; path: string; token: string }

    /*
     * Faz 2 — ZIP'i Storage'a Supabase SDK ile yükle (signed token üzerinden).
     * XHR yerine SDK: signed URL endpoint'inin doğru path formatını SDK biliyor.
     *
     * 🔴 SAHTE YÜZDE KALDIRILDI (2026-09-21). Eskiden burada şu vardı:
     *     setInterval(() => setUploadProgress(p => p < 85 ? p + 2 : p), 300)
     *   Yani çubuk, gerçek yüklemeyle HİÇ İLGİSİ OLMADAN 300 ms'de %2
     *   tırmanıp %85'te duruyordu. 10 MB'lık ve 400 MB'lık dosya aynı hızda
     *   "ilerliyor" görünüyordu; bağlantı kopsa çubuk yine %85'e çıkıyordu.
     *   Bu, `export-stage-presentation.ts`'in kendi kuralını ihlal ediyordu:
     *   *"Sahte yüzde yok: total_events yokken indeterminate."*
     *
     *   SDK `uploadToSignedUrl` ilerleme geri çağrısı SUNMUYOR, dolayısıyla
     *   dürüst tek seçenek BELİRSİZ (indeterminate) göstergedir. `null`
     *   yüzde = "ne kadar gittiğini bilmiyorum" ve arayüz bunu bilerek
     *   çubuk yerine akan bir şerit olarak çiziyor.
     *   XHR'a dönmek gerçek ilerleme verirdi ama path/token formatını elle
     *   kurmak gerekiyor; ZIP testinden hemen önce o riski almadım.
     *   Bilmemek, yanlış bilmekten iyidir.
     */
    setUploadProgress(null)
    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from('spotify-exports')
      .uploadToSignedUrl(path, token, file, { contentType: 'application/zip', upsert: true })
    if (uploadError) throw new Error(t('settings.export.error.storageUpload', { message: uploadError.message }))

    // Yükleme bitti: bu ANDAN İTİBAREN gerçek bir bilgi var — dosya sunucuda.
    setUploadProgress(100)

    // Faz 3 — Worker kuyruğuna ekle
    const queueRes = await fetch('/api/export/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    })
    if (!queueRes.ok) {
      const d = await queueRes.json().catch(() => ({})) as { error?: string }
      throw new Error(d.error ?? t('settings.export.error.queueFailed'))
    }

    return { jobId }
  }, [t])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    setUploadProgress(null)
    setUploadSpeed(null)
    setUploadStartedAt(Date.now())
    setPendingFile(file)
    try {
      const data = await uploadWithProgress(file)
      setNewJobId(data.jobId)
      setPendingFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.export.error.generic'))
    } finally {
      setUploading(false)
      setUploadStartedAt(null)
    }
  }, [uploadWithProgress, t])

  function handleRetry() {
    if (!pendingFile) return
    void handleFile(pendingFile)
  }

  async function handleDelete(jobId: string) {
    const res = await fetch('/api/export/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    })
    if (res.ok) {
      toast('success', 'Veriler silindi.')
      setAllJobs(prev => prev?.filter(j => j.id !== jobId) ?? null)
      if (watchJobId === jobId) {
        setNewJobId(null)
        setActiveJobId(null)
      }
    } else {
      toast('error', 'Couldn’t delete.')
    }
  }

  function handleNewUpload() {
    setNewJobId(null)
    setActiveJobId(null)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
    const item = e.dataTransfer.items?.[0]
    if (item?.kind === 'file') {
      setDraggedFileName(e.dataTransfer.files?.[0]?.name ?? null)
    }
  }

  function onDragLeave() {
    setDragOver(false)
    setDraggedFileName(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    setDraggedFileName(null)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  // Geçmiş: completed veya failed olan ve aktif izlenenin dışındaki job'lar
  const pastJobs = (allJobs ?? []).filter(
    j => (j.status === 'completed' || j.status === 'failed') && j.id !== watchJobId
  )

  // ── Render ────────────────────────────────────────────────────────────────

  // Upload devam ediyor
  if (uploading && pendingFile) {
    const bilinmiyor = uploadProgress === null
    /*
     * Kalan süre yalnız GERÇEK hız biliniyorsa gösterilir. `uploadSpeed`
     * hiçbir zaman set edilmiyor (SDK vermiyor), yani bu satır pratikte hiç
     * çizilmiyor — bilinçli: uydurma bir "12s left" bekleyişi daha da kötü
     * yapar. Alan, XHR'a geçilirse çalışmaya hazır kalsın diye duruyor.
     */
    const remaining = uploadSpeed && uploadSpeed > 0 && uploadProgress !== null
      ? Math.ceil((pendingFile.size * (1 - uploadProgress / 100)) / uploadSpeed)
      : null

    return (
      <div>
        <div className={styles.uploadingBox}>
          <div className={styles.uploadingHeader}>
            <FileArchive size={16} className={styles.fileIcon} aria-hidden />
            <span className={styles.uploadingFileName}>{pendingFile.name}</span>
            <span className={styles.uploadingSize}>{formatBytes(pendingFile.size)}</span>
          </div>
          <div
            className={styles.progressBarTrack}
            role="progressbar"
            aria-valuenow={bilinmiyor ? undefined : uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={bilinmiyor ? 'Uploading — progress unknown' : `${uploadProgress}%`}
            aria-busy
          >
            {bilinmiyor ? (
              <div className={styles.progressBarIndeterminate} />
            ) : (
              <div className={styles.progressBarFill} style={{ width: `${uploadProgress}%` }} />
            )}
          </div>
          <div className={styles.uploadingMeta}>
            <span className={styles.uploadingPercent}>
              {bilinmiyor ? 'Uploading…' : `${uploadProgress}%`}
            </span>
            <div className={styles.uploadingStats}>
              {uploadSpeed !== null && <span>{formatBytes(Math.round(uploadSpeed))}/s</span>}
              {remaining !== null && remaining > 0 && <span>{remaining}s left</span>}
              {uploadProgress === 100 && <span>Handing off to the worker…</span>}
            </div>
          </div>
        </div>
        {pastJobs.length > 0 && <PastJobList jobs={pastJobs} onDelete={handleDelete} />}
      </div>
    )
  }

  // Aktif job işleniyor (queued/processing)
  if (watchJobId && liveJob && (liveJob.status === 'queued' || liveJob.status === 'processing')) {
    return (
      <div>
        <ProcessingView job={liveJob} />
        {pastJobs.length > 0 && <PastJobList jobs={pastJobs} onDelete={handleDelete} />}
      </div>
    )
  }

  // Aktif job tamamlandı
  if (watchJobId && liveJob && liveJob.status === 'completed') {
    return (
      <div>
        <CompletedView job={liveJob} onNewUpload={handleNewUpload} onDelete={handleDelete} />
        {pastJobs.length > 0 && <PastJobList jobs={pastJobs} onDelete={handleDelete} />}
      </div>
    )
  }

  // Aktif job başarısız
  if (watchJobId && liveJob && liveJob.status === 'failed') {
    return (
      <div>
        <FailedView job={liveJob} onRetry={handleNewUpload} onDelete={handleDelete} />
        {pastJobs.length > 0 && <PastJobList jobs={pastJobs} onDelete={handleDelete} />}
      </div>
    )
  }

  // Sayfa ilk açılışta yükleniyor
  if (loadingJobs) {
    return (
      <div className={styles.statusBox}>
        <Clock size={20} style={{ color: 'var(--color-text-tertiary)' }} aria-hidden />
        <p className={styles.processing}>{t('settings.export.loadingHistory')}</p>
      </div>
    )
  }

  // Drop zone (hiç aktif job yok)
  return (
    <div>
      <div
        className={dragOver ? styles.dropzoneActive : styles.dropzone}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        aria-label={t('settings.export.dropzone.ariaLabel')}
      >
        <Upload size={32} strokeWidth={1.5} className={styles.dropIcon} aria-hidden />

        {dragOver && draggedFileName ? (
          <>
            <p className={styles.dropTextActive}>{t('settings.export.dropzone.active')}</p>
            <div className={styles.dragPreview}>
              <FileArchive size={14} aria-hidden />
              <span>{draggedFileName}</span>
            </div>
          </>
        ) : (
          <>
            <p className={styles.dropText}>{t('settings.export.dropzone.idle')}</p>
            <p className={styles.dropHint}>{t('settings.export.dropzone.hint')}</p>
          </>
        )}

        <input name="spotifyExportZip"
          ref={inputRef}
          type="file"
          accept=".zip"
          className={styles.hiddenInput}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          <div className={styles.errorContent}>
            <AlertTriangle size={14} aria-hidden />
            <span>{error}</span>
            {pendingFile && <span className={styles.errorFile}>{pendingFile.name}</span>}
          </div>
          {pendingFile && (
            <button className={styles.retryButton} onClick={handleRetry}>
              <RotateCcw size={13} aria-hidden />
              {t('settings.export.tryAgain')}
            </button>
          )}
        </div>
      )}

      {pastJobs.length > 0 && <PastJobList jobs={pastJobs} onDelete={handleDelete} />}
    </div>
  )
}

function PastJobList({
  jobs,
  onDelete,
}: {
  jobs: ExportJobState[]
  onDelete: (id: string) => void
}) {
  const { t } = useT()
  return (
    <div className={styles.pastJobsSection}>
      <p className={styles.pastJobsTitle}>{t('settings.export.pastUploads')}</p>
      {jobs.map(j => (
        <PastJobRow key={j.id} job={j} onDelete={onDelete} />
      ))}
    </div>
  )
}
