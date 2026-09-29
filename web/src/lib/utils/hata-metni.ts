/**
 * Supabase/PostgREST hataları `Error` DEĞİL düz nesnedir; `String(nesne)`
 * "[object Object]" verir ve gerçek sebep (ör. statement timeout) loglarda
 * kaybolur — 2026-09-24'te canlıda tam böyle yaşandı.
 */
export function hataMetni(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const o = err as { message?: unknown; code?: unknown }
    if (typeof o.message === 'string') {
      const kod = typeof o.code === 'string' ? ` [${o.code}]` : ''
      return `${o.message}${kod}`
    }
    try {
      return JSON.stringify(err).slice(0, 300)
    } catch {
      /* dairesel nesne — aşağıdaki String'e düş */
    }
  }
  return String(err)
}
