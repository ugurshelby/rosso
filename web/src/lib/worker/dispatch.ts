import 'server-only'
import { systemLog } from '@/lib/logging/system-logger'

/**
 * GitHub `repository_dispatch` ile worker workflow'unu (`WORKER_GITHUB_REPO`,
 * `sahip/repo` biçiminde) tetikler. Sıfır Maliyet Mimarisi'nde 7/24 worker yok — GitHub Actions
 * yalnız bu çağrıyla (veya nadiren elle `workflow_dispatch` ile) uyanır.
 *
 * `/api/export/queue`'daki orijinal `wakeWorker()`'dan çıkarıldı
 * (01-yillik-kontrolsuz-calisma-plani.md ADIM 2) — `/api/cron/trigger-worker-maintenance`
 * ile aynı tetikleme mantığını paylaşır.
 *
 * Bu çağrı ÇAĞRIYI YAPAN akışı ASLA bloke etmemeli: hata sessizce
 * `systemLog`'a düşer, çağıran taraf state'ini korur (bir sonraki
 * otomatik/elle tetiklemede iş yine işlenir).
 */
/** `WORKER_GITHUB_REPO` tanımsızsa kullanılan repo (yayın kopyasında boştur → dispatch atlanır). */
const VARSAYILAN_WORKER_REPO = ''

export async function dispatchWorkerEvent(
  eventType: string,
  clientPayload: Record<string, unknown>,
  operation: string,
): Promise<void> {
  const pat = process.env.WORKER_GITHUB_PAT
  if (!pat) {
    void systemLog({
      operation,
      severity: 'warn',
      errorCode: 'WORKER_GITHUB_PAT_MISSING',
      errorMessage: 'On-demand worker tetiklenemedi — WORKER_GITHUB_PAT tanımsız.',
      metadata: { eventType, ...clientPayload },
    })
    return
  }
  const repo = (process.env.WORKER_GITHUB_REPO?.trim() || VARSAYILAN_WORKER_REPO).trim()
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    void systemLog({
      operation,
      severity: 'warn',
      errorCode: 'WORKER_GITHUB_REPO_MISSING',
      errorMessage: 'On-demand worker tetiklenemedi — WORKER_GITHUB_REPO (sahip/repo) tanımsız.',
      metadata: { eventType, ...clientPayload },
    })
    return
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: eventType, client_payload: clientPayload }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      void systemLog({
        operation,
        severity: 'warn',
        errorCode: `github_dispatch_${res.status}`,
        errorMessage: `repository_dispatch başarısız: HTTP ${res.status}`,
        metadata: { eventType, ...clientPayload },
      })
    }
  } catch (err) {
    void systemLog({
      operation,
      severity: 'warn',
      errorCode: 'github_dispatch_network',
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: { eventType, ...clientPayload },
    })
  }
}
