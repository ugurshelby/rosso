import { z } from 'zod'

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const serverOnlyEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().url().optional(),
  CRON_SECRET: z.string().optional(),
  /*
   * Vertex AI (Gemini) — mood AI kürasyonu. HEPSİ OPSİYONEL: eksikse sistem
   * SQL-only fallback'e düşer, AI asla zorunlu değildir (2026-09-18 kararı).
   *
   * İki kimlik yolu desteklenir:
   *  - Yerel geliştirme: `GOOGLE_APPLICATION_CREDENTIALS` (gcp-key.json yolu)
   *  - Production/Vercel: `GCP_SERVICE_ACCOUNT_JSON` (ham JSON, env var)
   * Dosya yolu canlıda ÇALIŞMAZ (gcp-key.json gitignore'da, deploy'a gitmez)
   * — bu yüzden ikinci yol şart.
   *
   * Asıl DOĞRULAMA burada değil `src/lib/ai/vertex-core.ts::vertexYapilandirmasi`
   * içinde: servis hesabı JSON'ı zod ile şekil olarak doğrulanır (type,
   * project_id, client_email, private_key); bozuksa AI sessizce kapanır.
   * Burada opsiyonel tutulması bilinçli — AI yokluğu uygulamayı açılışta
   * DÜŞÜRMEMELİ. `GCP_LOCATION` boşsa `global` kullanılır.
   */
  GCP_PROJECT_ID: z.string().optional(),
  GCP_LOCATION: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GCP_SERVICE_ACCOUNT_JSON: z.string().optional(),
})

const serverEnvSchema = publicEnvSchema.merge(serverOnlyEnvSchema)

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    SPOTIFY_CLIENT_ID: source.SPOTIFY_CLIENT_ID || undefined,
    SPOTIFY_CLIENT_SECRET: source.SPOTIFY_CLIENT_SECRET || undefined,
    SPOTIFY_REDIRECT_URI: source.SPOTIFY_REDIRECT_URI || undefined,
    CRON_SECRET: source.CRON_SECRET || undefined,
    GCP_PROJECT_ID: source.GCP_PROJECT_ID || undefined,
    GCP_LOCATION: source.GCP_LOCATION || undefined,
    GOOGLE_APPLICATION_CREDENTIALS: source.GOOGLE_APPLICATION_CREDENTIALS || undefined,
    GCP_SERVICE_ACCOUNT_JSON: source.GCP_SERVICE_ACCOUNT_JSON || undefined,
  })
}

/** Client-safe environment variables (NEXT_PUBLIC_* only). */
export const publicEnv = parsePublicEnv(process.env)
