/**
 * Tek migration dosyasını canlı Postgres'e uygular (service role REST DDL yapamaz).
 *
 *   node scripts/db-migration-uygula.mjs 0282_kisisel_auth_kayit_kapisi.sql
 *
 * ⚠ 2026-09-19'da EKLENDİ — migration defterine kayıt:
 * Bu script uzun süre `supabase_migrations.schema_migrations` tablosuna HİÇ yazmadı.
 * Sonuç: MCP ile uygulananlar defterde görünüyor, bu script'le uygulananlar
 * görünmüyordu — yani "hangi migration canlıda?" sorusunun cevabı EKSİK çıkıyordu
 * (0314-0318 uygulanmış ama defterde yoktu). Defter, ileride `supabase db push`
 * gibi bir araç kullanılırsa uygulanmış migration'ları yeniden çalıştırmasını
 * engelleyen tek kayıttır. Artık her başarılı uygulama deftere de yazılıyor.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = process.argv[2]
if (!file) {
  console.error('Kullanım: node scripts/db-migration-uygula.mjs <dosya.sql>')
  process.exit(1)
}

const envRaw = readFileSync(join(ROOT, '.env.local'), 'utf8')
const env = {}
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const password = env.DATABASE_PASSWORD
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const refMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/)
const ref = refMatch?.[1]
if (!password || !ref) {
  console.error('DATABASE_PASSWORD veya NEXT_PUBLIC_SUPABASE_URL eksik (.env.local).')
  process.exit(1)
}

const sqlPath = join(ROOT, 'supabase', 'migrations', file)
const sql = readFileSync(sqlPath, 'utf8')

const hosts = [
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-1-eu-west-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
]

/** `0314_catalog_ai_enrichment.sql` → { version: '20260919...', name: '0314_catalog_ai_enrichment' } */
function defterKaydi(dosyaAdi) {
  const name = dosyaAdi.replace(/\.sql$/i, '')
  const d = new Date()
  const p = (n, u = 2) => String(n).padStart(u, '0')
  const version = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  return { version, name }
}

/*
 * ⚠ 2026-09-20'de EKLENDİ — NÖBETÇİ HATASI SESSİZ KALIYORDU.
 *
 * ÖLÇÜLDÜ: 0326 migration'ının nöbetçisi `RAISE EXCEPTION` ile düştü, ama bu
 * döngü onu "bu host olmadı" sayıp sıradaki host'a geçti; en sonda YALNIZ
 * SON host'un bağlantı hatası basıldı: "(ENOTFOUND) tenant/user ... not found".
 * Yani gerçek sebep (nöbetçi mesajı, satır numarası, NOTICE çıktısı) tamamen
 * kayboldu ve migration "bağlantı sorunu" gibi göründü. 14. dersin aynısı.
 *
 * Artık: bağlantı kurulduktan SONRAKİ hata SQL hatasıdır → başka host denenmez,
 * hata olduğu gibi basılır. Yalnız bağlan(a)mama durumunda sıradaki host denenir.
 * NOTICE'lar da basılıyor: nöbetçilerin ölçümleri görünür olsun.
 */
let lastErr
for (const connectionString of hosts) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
  let baglandi = false
  client.on('notice', (n) => {
    if (n?.message) console.log(`  ${n.message}`)
  })
  try {
    await client.connect()
    baglandi = true
    await client.query(sql)

    // Deftere yaz. Aynı `name` zaten varsa (yeniden uygulama) tekrar eklenmez.
    // ⚠ Buradaki hata migration'ı GEÇERSİZ KILMAZ — DDL zaten uygulandı; yalnız
    // uyarı basılır, yoksa başarılı bir migration defter yüzünden hata gibi görünürdü.
    const { version, name } = defterKaydi(file)
    try {
      await client.query(
        `INSERT INTO supabase_migrations.schema_migrations (version, name)
         SELECT $1, $2
         WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name = $2)`,
        [version, name],
      )
    } catch (defterErr) {
      console.warn(`⚠ Deftere yazilamadi (migration UYGULANDI): ${defterErr?.message ?? defterErr}`)
    }

    await client.end()
    console.log(`✓ Uygulandı: ${file}`)
    process.exit(0)
  } catch (err) {
    lastErr = err
    try {
      await client.end()
    } catch {
      /* */
    }
    if (baglandi) {
      // SQL hatası — host değiştirmek hiçbir şeyi düzeltmez, üstelik gerçek
      // sebebi gizler. Olduğu gibi bildir ve dur.
      console.error(`✗ SQL hatası (${file}): ${err?.message ?? err}`)
      if (err?.code) console.error(`  kod: ${err.code}`)
      if (err?.where) console.error(`  yer: ${err.where}`)
      if (err?.position) console.error(`  konum: ${err.position}`)
      process.exit(1)
    }
  }
}

console.error(`✗ Hiçbir host'a bağlanılamadı: ${lastErr?.message ?? lastErr}`)
process.exit(1)
