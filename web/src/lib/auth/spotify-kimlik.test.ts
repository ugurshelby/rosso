// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, type Dirent } from 'node:fs'
import { join } from 'node:path'

/**
 * Nöbetçi: Spotify GİRİŞ token'ı veri erişimi için ASLA kullanılmaz.
 *
 * ─── Neden bir test, bir yorum değil ────────────────────────────────────
 * Karar (`docs/decisions/spotify-giris-saglayicisi-3-soru.md` §②):
 * `platform_connections` tek gerçektir, `auth.identities`'teki sağlayıcı
 * token'ı okunmaz.
 *
 * Bu karar bir yorumda kalırsa altı ay sonra biri Supabase yanıtında
 * `provider_token` alanını görüp *"zaten elimizde, bir daha istemeyelim"*
 * der. O an sessiz bir kırık doğar: giriş token'ı yalnız `user-read-email`
 * kapsamına sahiptir, dinleme geçmişini okuyamaz. Sonuç 403'tür ve sebebi
 * kodun hiçbir yerinde yazmaz.
 *
 * Ayrıca giriş token'ı AES ile şifrelenmez, yenileme eşiğine tabi değildir
 * ve `is_active` ile kapatılamaz — yani `platform_connections`'ın verdiği
 * her garantiyi sessizce kaybederiz.
 */

const TARANACAK_KOKLER = [
  join(process.cwd(), 'src', 'lib'),
  join(process.cwd(), 'src', 'app'),
  join(process.cwd(), 'src', 'components'),
  join(process.cwd(), 'apps', 'mobile', 'src'),
]

/** Yasak: Supabase oturumundaki sağlayıcı token'ları. */
const YASAK_ALANLAR = ['provider_token', 'provider_refresh_token']

/**
 * ⚠ Kaybolan girdiyi tolere eder. `readdirSync` ile `readFileSync` ARASINDA
 * bir dosya silinirse (dal değiştirme, derleyicinin geçici dosyası) `ENOENT`
 * fırlar ve nöbetçi kodla ilgisi olmayan bir sebeple kırılır — 2026-08-25
 * kararsızlık avında bu yarış ayrı bir betikle kanıtlandı.
 */
function kaynakDosyalari(dir: string): string[] {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const out: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      out.push(...kaynakDosyalari(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function guvenliOku(file: string): string | null {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

/**
 * Satır gerçekten alana ERİŞİYOR mu, yoksa yalnız yorumda mı geçiyor?
 *
 * Bu dosyanın kendi açıklamaları ve `spotify-kimlik.ts`'in gerekçe yorumları
 * yasağı ANLATIYOR — onları ihlal saymak, kuralı açıklamayı yasaklamak olurdu.
 */
function gercekErisim(line: string): boolean {
  const t = line.trim()
  if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return false
  return true
}

describe('Spotify giriş token\'ı — veri erişiminde kullanılmaz', () => {
  it('kaynak kodda provider_token / provider_refresh_token okunmuyor', () => {
    const ihlaller: string[] = []
    let taranan = 0

    for (const kok of TARANACAK_KOKLER) {
      for (const file of kaynakDosyalari(kok)) {
        const icerik = guvenliOku(file)
        if (icerik === null) continue
        taranan++

        icerik.split('\n').forEach((line, i) => {
          if (!gercekErisim(line)) return
          for (const alan of YASAK_ALANLAR) {
            if (line.includes(alan)) {
              ihlaller.push(`${file.replace(process.cwd(), '')}:${i + 1} → ${alan}`)
            }
          }
        })
      }
    }

    /*
     * Nöbetçi SESSİZCE ölmemeli: yarışı tolere etmek, hiç tarama yapmadan
     * "ihlal yok" demeye dönüşmemeli. Bu satır olmasa, kök yolları yanlış
     * yazıldığı gün test yeşil kalır ve koruduğu şeyi korumaz.
     */
    expect(taranan, 'hiçbir kaynak dosyası taranamadı — kök yolları kontrol et').toBeGreaterThan(
      100
    )
    expect(ihlaller).toEqual([])
  }, 15000)

  it('token okuyan tek yer hâlâ token-refresh.ts', () => {
    /*
     * `platform_connections.access_token` okuyan dosya sayısı bir
     * DAVRANIŞ sözleşmesidir (migration 0275/0276): kolon yetkisi
     * `authenticated` rolünden alındı, yalnız service client okuyabilir.
     * Yeni bir okuyucu eklenirse ya `permission denied` alır ya da
     * service client'ı gereksiz yere yayar — ikisi de sessiz kırıktır.
     */
    const okuyucular: string[] = []
    let taranan = 0

    for (const kok of TARANACAK_KOKLER) {
      for (const file of kaynakDosyalari(kok)) {
        const icerik = guvenliOku(file)
        if (icerik === null) continue
        taranan++

        // `.select(...)` içinde access_token/refresh_token geçiyor mu?
        const secimler = icerik.match(/\.select\s*\(\s*['"`][^'"`]*['"`]/g) ?? []
        if (secimler.some((s) => /access_token|refresh_token/.test(s))) {
          okuyucular.push(file.replace(process.cwd(), '').replace(/\\/g, '/'))
        }
      }
    }

    expect(taranan).toBeGreaterThan(100)
    expect(okuyucular).toEqual(['/src/lib/services/token-refresh.ts'])
  }, 15000)
})
