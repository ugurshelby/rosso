// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Doğrulama Kapısı — platform token kolonları istemciye SEÇİLMEZ.
 * FAZ GÜVENLİK-2 · 2026-08-13 (migration 0275 + 0276)
 *
 * ─── Neden bu test var ──────────────────────────────────────────────────
 * `platform_connections` tablosu `access_token` · `refresh_token` ·
 * `music_user_token` taşıyor. Bunlar AES-256-GCM ile şifreli
 * (`token-cipher.ts`) ama yine de istemciye inmemeli.
 *
 * Veritabanı kapısı 0276 ile kapatıldı: `authenticated` rolünün bu üç
 * kolonda SELECT yetkisi YOK (canlıda doğrulandı — `permission denied`).
 *
 * Bu test **ikinci savunma**: bir gün biri istemci kodunda bu kolonları
 * seçmeye kalkarsa, sorgu artık `permission denied` ile PATLAR — yani
 * özellik sessizce bozulur. Test bunu build zamanında yakalar ki
 * geliştirici nedenini arasın.
 *
 * ⚠ Sunucu tarafı (`service_role`) kapsam DIŞI: `token-refresh.ts`
 * token'ları meşru olarak okuyor ve `createServiceClient()` kullanıyor.
 */

/** İstemciye ulaşabilecek kod kökleri — server-only olanlar hariç. */
const CLIENT_REACHABLE_ROOTS = [
  join(process.cwd(), 'src', 'components'),
  join(process.cwd(), 'src', 'hooks'),
  join(process.cwd(), 'apps', 'mobile', 'src'),
]

const TOKEN_COLUMNS = ['access_token', 'refresh_token', 'music_user_token']

function collectSourceFiles(dir: string): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return [] // klasör yoksa sessizce geç
  }
  const out: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      out.push(...collectSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      out.push(full)
    }
  }
  return out
}

/**
 * Listelendikten SONRA kaybolan dosyayı tolere eden okuma.
 *
 * `collectSourceFiles` dizini gezerken bir dosya silinirse (dal değiştirme,
 * derleyicinin geçici dosyası, editör kaydı) `readFileSync` `ENOENT` fırlatır
 * ve nöbetçi kodla ilgisi olmayan bir sebeple kırılır — 2026-08-25 kararsızlık
 * avında `.next` üzerinde aynı yarış kanıtlandı. Taranamayan dosyada ihlal de
 * yoktur; atlamak güvenli.
 */
function safeRead(file: string): string | null {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

/**
 * Bir satır token kolonunu gerçekten SEÇİYOR mu, yoksa yalnız
 * yorumda mı geçiyor? (`library.ts` yasağı yorumda anlatıyor —
 * o bir ihlal değil, tam tersi.)
 */
function isRealSelect(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
    return false
  }
  return /\.select\s*\(|select:\s*['"`]/.test(line)
}

describe('platform token kolonları — istemci erişimi', () => {
  it('istemciye ulaşan kodda token kolonu SEÇİLMİYOR', () => {
    const ihlaller: string[] = []
    let taranan = 0

    for (const root of CLIENT_REACHABLE_ROOTS) {
      for (const file of collectSourceFiles(root)) {
        const kaynak = safeRead(file)
        if (kaynak === null) continue
        taranan++
        const lines = kaynak.split('\n')
        lines.forEach((line, i) => {
          if (!isRealSelect(line)) return
          for (const col of TOKEN_COLUMNS) {
            if (line.includes(col)) {
              ihlaller.push(`${file.replace(process.cwd(), '')}:${i + 1} → ${col}`)
            }
          }
        })
      }
    }

    // Nöbetçi SESSİZCE ölmemeli: yarışı tolere etmek, hiç tarama
    // yapmadan "ihlal yok" demeye dönüşmemeli.
    expect(taranan, 'istemciye ulaşan hiçbir kaynak dosyası taranamadı').toBeGreaterThan(0)
    expect(ihlaller).toEqual([])
  }, 15000)

  it("istemci kodunda platform_connections için select('*') yok", () => {
    /*
     * `select('*')` token kolonlarını da çeker. 0276 sonrası bu sorgu
     * `permission denied` ile patlar — yani özellik ölür. Yasağın
     * kod tarafındaki karşılığı.
     */
    const ihlaller: string[] = []
    let taranan = 0

    for (const root of CLIENT_REACHABLE_ROOTS) {
      for (const file of collectSourceFiles(root)) {
        const content = safeRead(file)
        if (content === null) continue
        taranan++
        if (!content.includes('platform_connections')) continue
        if (/\.select\s*\(\s*['"`]\*['"`]\s*\)/.test(content)) {
          ihlaller.push(file.replace(process.cwd(), ''))
        }
      }
    }

    // Nöbetçi SESSİZCE ölmemeli: yarışı tolere etmek, hiç tarama
    // yapmadan "ihlal yok" demeye dönüşmemeli.
    expect(taranan, 'istemciye ulaşan hiçbir kaynak dosyası taranamadı').toBeGreaterThan(0)
    expect(ihlaller).toEqual([])
  }, 15000)
})
