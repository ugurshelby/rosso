/**
 * Sunucu tarafı hata yakalama — Next.js `onRequestError` hook'u.
 *
 * NEDEN VAR (2026-09-17): `system_logs` altyapısı ve admin panelindeki gruplu
 * hata görünümü zaten vardı, ama yalnızca ELLE `systemLog()` çağıran kod
 * yolları oraya düşüyordu. 48 API route'unda BEKLENMEDİK bir hata fırladığında
 * (null deref, üçüncü parti timeout, Supabase şema uyuşmazlığı…) Next sessizce
 * 500 dönüyor ve admin panelinde hiçbir iz kalmıyordu — yani en çok haberdar
 * olmak istediğimiz hata sınıfı, tam olarak görünmeyen sınıftı.
 *
 * `onRequestError` Next'in bu iş için sunduğu resmî kancadır: App Router'daki
 * TÜM sunucu hatalarını (route handler, RSC render, server action, middleware)
 * tek noktadan yakalar. 48 route'u tek tek try/catch ile sarmaktan hem daha
 * kapsayıcı hem de bakımı olmayan bir çözüm.
 *
 * Admin paneli kayıtları `operation + error_code` ile grupluyor
 * (admin/src/lib/admin/system-logs.ts), bu yüzden:
 *  - `operation` = NEREDE patladı (route yolu)
 *  - `error_code` = NE patladı (Next digest'i; aynı bug = aynı digest)
 * Böylece aynı hatanın 126 tekrarı panelde tek satır olur, 126 satır değil.
 */
import type { Instrumentation } from 'next'

/** Stack'in panelde okunabilir kalması için tutulan satır sayısı. */
const STACK_LINES = 8

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Edge runtime'da `server-only` logger (service client) çalışmaz; yalnız
  // Node.js runtime'da raporla. Edge'de sessiz kalmak, çökmekten iyidir.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Sonsuz döngü koruması: logger'ın kendi ucu patlarsa onu tekrar
  // loglamaya çalışmak yeni hata üretir.
  if (request.path?.startsWith('/api/log/')) return

  try {
    const { systemLog } = await import('@/lib/observability/logger')

    const err = error as Error & { digest?: string }
    const stack = err.stack?.split('\n').slice(0, STACK_LINES).join('\n') ?? null

    await systemLog({
      operation: `server_error:${context.routePath || request.path || 'bilinmiyor'}`,
      severity: 'error',
      // Next'in digest'i hata mesajının hash'i — aynı bug tekrar ederse aynı
      // kod gelir, panel doğru gruplar. Yoksa hata sınıfına düşeriz.
      errorCode: err.digest ? `DIGEST_${err.digest}` : (err.name || 'SERVER_ERROR'),
      errorMessage: err.message?.slice(0, 2000) ?? null,
      metadata: {
        method: request.method,
        path: request.path,
        routeType: context.routeType,
        routerKind: context.routerKind,
        errorName: err.name,
        stack,
      },
    })
  } catch {
    // Hata raporlamak asla isteği çöktürmez.
    console.error('[instrumentation] hata raporlanamadı — akış sürüyor')
  }
}
