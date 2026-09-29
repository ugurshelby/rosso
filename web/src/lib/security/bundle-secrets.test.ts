// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, type Dirent } from 'node:fs'
import { join } from 'node:path'

/**
 * Doğrulama Kapısı: server-only sırlar client bundle'ında ASLA görünmez.
 *
 * Production build çıktısındaki client'a giden JS dosyalarını (`.next/static`)
 * tarar; `SUPABASE_SERVICE_ROLE_KEY`'in gerçek değeri varsa bulunmamalı.
 * Build yoksa test atlanır (CI'da `next build` sonrası koşar; lokalde build
 * yoksa gürültü yapmaz).
 *
 * Not: `NEXT_PUBLIC_*` olmayan env değişkenleri Next tarafından client'a
 * inline edilmez; bu test o garantiyi otomatik doğrular.
 */

const STATIC_DIR = join(process.cwd(), '.next', 'static')

/**
 * `.next/static` CANLI bir dizindir: `next dev` veya paralel bir `next build`
 * onu test koşarken yeniden yazabilir. `readdirSync` ile `readFileSync`
 * ARASINDA bir dosya silinirse okuma `ENOENT` fırlatır ve test kodla
 * ilgisi olmayan bir sebeple kırılır.
 *
 * 2026-08-25: kararsızlık (flaky) avında bu yarış ayrı bir betikle
 * kanıtlandı — listele → sil → oku sırası `ENOENT` veriyor. Sebep test
 * paketinin paralelliği değil, dizinin canlı olması.
 *
 * Çözüm: hem gezinme hem okuma kaybolan girdiyi ATLAR. Sızıntı taraması
 * açısından güvenli — artık var olmayan bir dosya kullanıcıya da gitmez.
 */
function collectJsFiles(dir: string): string[] {
  const out: string[] = []
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    // Dizin okuma anında yok oldu (yeniden derleme) — tarayacak bir şey yok.
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectJsFiles(full))
    else if (entry.name.endsWith('.js')) out.push(full)
  }
  return out
}

/** Sızması yasak sır değerleri — yalnızca anlamlı uzunlukta olanlar. */
function forbiddenSecrets(): { label: string; value: string }[] {
  const candidates: { label: string; value: string | undefined }[] = [
    { label: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
  ]
  return candidates
    .filter((c): c is { label: string; value: string } => typeof c.value === 'string' && c.value.length >= 16)
    .map((c) => ({ label: c.label, value: c.value }))
}

describe('client bundle secret leak guard', () => {
  /**
   * ⏱ 30sn timeout — bu test yüzlerce `.next/static/**.js` dosyasını diskten
   * okuyup tarıyor. Tek başına ~2,3sn sürüyor ama tam paket koşusunda (76 dosya,
   * paralel I/O) vitest'in 5sn varsayılanını aşıp **yanlış alarm** veriyordu
   * (2026-08-14: `git stash` ile ölçüldü — kod değil ortam kaynaklı).
   * Yanlış alarm veren nöbetçi güvenilmez olur: gerçek bir sızıntıyı da
   * "yine o test" diye geçiştirtir.
   */
  it('does not embed server-only secrets in client JS', { timeout: 30_000 }, () => {
    if (!existsSync(STATIC_DIR)) {
      // Build yok — bu test yalnızca build sonrası anlamlı (CI'da garanti).
      return
    }

    const secrets = forbiddenSecrets()
    if (secrets.length === 0) {
      // Sır env'leri set değil — değer bazlı tarama yapılamaz.
      return
    }

    const files = collectJsFiles(STATIC_DIR)
    const leaks: string[] = []
    let taranan = 0

    for (const file of files) {
      let content: string
      try {
        content = readFileSync(file, 'utf8')
      } catch {
        // Listelendikten sonra kayboldu — yukarıdaki yarış. Atla.
        continue
      }
      taranan++
      for (const secret of secrets) {
        if (content.includes(secret.value)) {
          leaks.push(`${secret.label} leaked into ${file.replace(process.cwd(), '')}`)
        }
      }
    }

    /*
     * ⚠ İKİ DURUMU AYIRT ET — ikisi de "taranan = 0" verir ama anlamları zıt:
     *
     *   a) `files.length === 0`  → dizin BOŞ. Derleme sürüyor ya da
     *      `.next` temizlenmiş. Taranacak bir şey yok; bu bir arıza değil,
     *      geçici bir andır. Test atlanır.
     *
     *   b) `files.length > 0` ama hiçbiri okunamadı → dosyalar listelendi,
     *      sonra topluca kayboldu. Bu gerçek bir sorundur ve sessizce
     *      geçilirse nöbetçi bir sızıntıyı da gizler.
     *
     * 2026-08-25: ilk düzeltme bu ayrımı yapmıyordu; paralel `npm run build`
     * `.next/static`i temizlediği anda koşan test (a) durumunda kırıldı.
     * Kararsızlığı kapatmaya çalışırken yeni bir kararsızlık üretmiştim —
     * ölçümle yakalandı (3 turun 1'i).
     */
    if (files.length === 0) {
      // (a) — derleme sürüyor olabilir. Sınanacak çıktı yok.
      return
    }

    // (b) — dosyalar vardı ama okunamadı: gerçek arıza.
    expect(
      taranan,
      `${files.length} JS dosyası listelendi ama hiçbiri okunamadı`
    ).toBeGreaterThan(0)
    expect(leaks).toEqual([])
  })
})
