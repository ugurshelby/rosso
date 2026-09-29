import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Structured logging (Faz 8.3).
 *
 * `system_logs` tablosuna yazar. Fire-and-forget: log yazımı başarısız olsa
 * bile ana iş akışı etkilenmez.
 *
 * PII REDACTION (zorunlu):
 *  - `ip_addr` ASLA yazılmaz (anayasa kuralı).
 *  - token / secret / şifre içeren metadata anahtarları maskelenir.
 *  - Sentry opsiyoneldir: `SENTRY_DSN` set ise hook noktası; yoksa no-op.
 */

export type LogSeverity = 'info' | 'warn' | 'error' | 'critical'

export interface LogEntry {
  userId?: string
  operation: string
  platform?: string
  errorCode?: string
  errorMessage?: string
  severity?: LogSeverity
  relatedId?: string
  metadata?: Record<string, unknown>
}

/** Maskelenecek hassas anahtar parçaları (büyük/küçük harf duyarsız). */
const SENSITIVE_KEY_PARTS = [
  'ip_addr',
  'ip',
  'token',
  'secret',
  'password',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'private_key',
  'refresh',
  'access_token',
]

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part))
}

/**
 * metadata içindeki hassas alanları derinlemesine maskeler.
 * `ip_addr` ve benzeri anahtarlar tamamen kaldırılır (log'da görünmez);
 * token/secret değerleri `[REDACTED]` ile değiştirilir.
 */
export function redactMetadata(input: unknown, depth = 0): unknown {
  if (depth > 6 || input == null) return input
  if (Array.isArray(input)) return input.map((v) => redactMetadata(v, depth + 1))
  if (typeof input !== 'object') return input

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      // ip_addr tamamen düşürülür; diğer hassas alanlar maskelenir.
      if (key.toLowerCase().includes('ip')) continue
      out[key] = '[REDACTED]'
      continue
    }
    out[key] = redactMetadata(value, depth + 1)
  }
  return out
}

export async function systemLog(entry: LogEntry): Promise<void> {
  const safeMetadata =
    entry.metadata != null
      ? (redactMetadata(entry.metadata) as Record<string, unknown>)
      : null

  try {
    const service = await createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from('system_logs').insert({
      user_id: entry.userId ?? null,
      operation: entry.operation,
      platform: entry.platform ?? null,
      error_code: entry.errorCode ?? null,
      error_message: entry.errorMessage ?? null,
      severity: entry.severity ?? 'info',
      related_id: entry.relatedId ?? null,
      metadata: safeMetadata,
    })

    // Sentry hook (opsiyonel) — env'de DSN varsa kritik/error olayları iletilir.
    if (
      process.env.SENTRY_DSN &&
      (entry.severity === 'error' || entry.severity === 'critical')
    ) {
      // Sentry SDK kurulduğunda burada captureMessage çağrılır; şimdilik no-op.
    }
  } catch {
    // Log yazma asla ana akışı bloke etmez veya çöktürmez.
    console.error('[logger] Failed to write log — continuing')
  }
}
