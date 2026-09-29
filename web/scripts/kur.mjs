#!/usr/bin/env node
/**
 * Rosso kurulum betiği — boş bir Supabase projesini Rosso için hazırlar.
 *
 *   cd web && npm install && npm run kur
 *
 * Yaptığı işler (sırayla):
 *   1. `supabase/kurulum/schema.sql`'i uygular (tablolar, fonksiyonlar, RLS, storage kovaları, kayıt kapısı).
 *   2. Vault'a `app_url` ve `cron_secret` gizlilerini yazar — pg_cron bunlarla Vercel'e istek atar.
 *   3. `supabase/kurulum/cron.sql`'deki zamanlanmış işleri kurar (Spotify eşitleme, recap, mood, bakım…).
 *   4. Yardımcı görünümü yeniler ve sonucu doğrular.
 *
 * Gerekli ortam değişkenleri (`.env.local` ya da ortamdan):
 *   DATABASE_URL         Supabase → Connect → "Session pooler" bağlantı dizesi (port 5432, parola dolu)
 *   NEXT_PUBLIC_APP_URL  Sitenin yayın adresi, sonunda `/` olmadan (ör. https://benim-rosso.vercel.app)
 *   CRON_SECRET          Rastgele uzun bir dize (Vercel'deki CRON_SECRET ile AYNI olmalı)
 *
 * Güvenlik: yalnız BOŞ bir veritabanına kurar. `public.tracks` varsa hiçbir şey yapmadan durur.
 * `--dry-run`: ortamı doğrular, veritabanına yazmaz.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const KURULUM = join(ROOT, 'supabase', 'kurulum')
const dryRun = process.argv.includes('--dry-run')

function envYukle() {
  const dosya = join(ROOT, '.env.local')
  const env = {}
  if (existsSync(dosya)) {
    for (const satir of readFileSync(dosya, 'utf8').split(/\r?\n/)) {
      const m = satir.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
  return { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)) }
}

function dur(mesaj) {
  console.error(`\n✗ ${mesaj}\n`)
  process.exit(1)
}

const env = envYukle()
const eksik = ['DATABASE_URL', 'NEXT_PUBLIC_APP_URL', 'CRON_SECRET'].filter((k) => !env[k])
if (eksik.length) {
  dur(`Eksik ortam değişkenleri: ${eksik.join(', ')}\n  → web/.env.local dosyana ekle (bkz. SELF-HOSTING.md, adım 3).`)
}
if (env.CRON_SECRET.length < 24) dur('CRON_SECRET en az 24 karakter olmalı (ör. `openssl rand -hex 32`).')
if (!/^https?:\/\/[^/]+$/.test(env.NEXT_PUBLIC_APP_URL)) {
  dur('NEXT_PUBLIC_APP_URL biçimi hatalı — sonunda `/` olmadan, ör. https://benim-rosso.vercel.app')
}
for (const f of ['schema.sql', 'cron.sql']) {
  if (!existsSync(join(KURULUM, f))) dur(`Eksik dosya: supabase/kurulum/${f}`)
}

console.log(`Rosso kurulumu ${dryRun ? '(kuru çalıştırma) ' : ''}başlıyor…`)
if (dryRun) {
  console.log('✓ Ortam değişkenleri ve kurulum dosyaları tamam. Veritabanına dokunulmadı.')
  process.exit(0)
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

try {
  await client.connect()
} catch (err) {
  dur(
    `Veritabanına bağlanılamadı: ${err.message}\n` +
      '  → DATABASE_URL\'in "Session pooler" dizesi olduğundan ve [YOUR-PASSWORD] yerine parolanı yazdığından emin ol.\n' +
      '  → Bazı kurumsal ağlar Postgres bağlantısını engeller; evden/telefon hattından dene.',
  )
}

try {
  const var_ = await client.query("select to_regclass('public.tracks') as t")
  if (var_.rows[0].t) {
    dur('Bu veritabanında Rosso zaten kurulu görünüyor (public.tracks var). Boş bir Supabase projesi kullan.')
  }

  console.log('1/4 Şema uygulanıyor (birkaç saniye sürer)…')
  await client.query(readFileSync(join(KURULUM, 'schema.sql'), 'utf8'))

  console.log('2/4 Vault gizlileri yazılıyor (app_url, cron_secret)…')
  for (const [ad, deger] of [
    ['app_url', env.NEXT_PUBLIC_APP_URL],
    ['cron_secret', env.CRON_SECRET],
  ]) {
    const mevcut = await client.query('select id from vault.secrets where name = $1', [ad])
    if (mevcut.rows[0]) {
      await client.query('select vault.update_secret($1, $2)', [mevcut.rows[0].id, deger])
    } else {
      await client.query('select vault.create_secret($1, $2, $3)', [deger, ad, 'Rosso kurulum betiği'])
    }
  }

  console.log('3/4 Zamanlanmış işler kuruluyor (pg_cron)…')
  await client.query("select cron.unschedule(jobid) from cron.job where jobname like 'rosso-%'")
  await client.query(readFileSync(join(KURULUM, 'cron.sql'), 'utf8'))

  console.log('4/4 Doğrulanıyor…')
  await client.query('refresh materialized view public.artist_idf')
  const ozet = await client.query(`
    select
      (select count(*) from pg_tables where schemaname = 'public')        as tablo,
      (select count(*) from cron.job where jobname like 'rosso-%')         as cron_is,
      (select count(*) from vault.secrets where name in ('app_url','cron_secret')) as gizli
  `)
  const { tablo, cron_is, gizli } = ozet.rows[0]
  if (Number(gizli) !== 2 || Number(cron_is) < 1) dur('Doğrulama başarısız: vault veya cron işleri eksik.')

  console.log(`\n✓ Kurulum tamam — ${tablo} tablo, ${cron_is} zamanlanmış iş, ${gizli} vault gizlisi.`)
  console.log('\nSıradaki adımlar (SELF-HOSTING.md, adım 5+):')
  console.log('  • Uygulamayı Vercel\'e dağıt (root directory: web) ve AYNI ortam değişkenlerini gir.')
  console.log('  • Siteyi aç, ilk hesabı oluştur — ilk kayıt otomatik olarak SAHİP olur, sonra kayıt kapanır.')
} catch (err) {
  dur(`Kurulum hatası: ${err.message}\n  (Yarım kaldıysa Supabase projesini sıfırlayıp yeniden dene; betik yalnız boş veritabanına kurar.)`)
} finally {
  await client.end().catch(() => {})
}
