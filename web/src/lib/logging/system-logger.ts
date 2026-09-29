// Faz 8.3: structured logger `src/lib/observability/logger.ts`'e taşındı
// (PII redaction + opsiyonel Sentry hook). Bu dosya geriye dönük uyumluluk
// için yeniden ihraç eder — mevcut importlar (`@/lib/logging/system-logger`)
// bozulmaz. Yeni kod doğrudan `@/lib/observability/logger`'dan import etmeli.
export {
  systemLog,
  redactMetadata,
  type LogEntry,
  type LogSeverity,
} from '@/lib/observability/logger'
