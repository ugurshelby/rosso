/**
 * Çerez / ölçüm rızası — TEK doğruluk kaynağı (2026-09-22, KVKK denetimi).
 *
 * ─── Neden bu dosya var ─────────────────────────────────────────────────
 * Banner'da iki düğme vardı ("Reddet" · "Kabul et") ama ikisi de AYNI
 * fonksiyonu çağırıyordu: `onAccept={dismiss} onDecline={dismiss}`. Yani
 * "Reddet" hiçbir şeyi reddetmiyordu — yalnız banner'ı kapatıyordu. Aynı
 * anda `<Analytics />` (Vercel Web Analytics) koşulsuz yükleniyordu.
 *
 * Bu, kırık bir düğmeden fazlası: kullanıcıya SEÇİM SUNUP seçimi yok saymak,
 * hiç sormamaktan daha kötüdür. KVKK m.5 açık rıza ve GDPR "rıza geri
 * alınabilir olmalı" ilkesi tam olarak bunu yasaklar.
 *
 * ─── Yeni davranış ──────────────────────────────────────────────────────
 * - Varsayılan (karar yok) → ölçüm YÜKLENMEZ. Susmak rıza değildir.
 * - 'kabul' → `<Analytics />` yüklenir.
 * - 'ret'   → yüklenmez; karar saklanır, banner bir daha çıkmaz.
 * - Karar her an değiştirilebilir (gizlilik sayfasındaki düğme).
 *
 * ⚠ Geriye uyum: eski sürüm `'true'` yazıyordu ve o değer "banner kapandı"
 * anlamındaydı, "ölçüme izin verildi" değil. Eski `'true'` kaydı KARARSIZ
 * sayılır (`null`) — banner bir kez daha çıkar ve kullanıcı gerçek seçimini
 * yapar. Alternatifi, hiç verilmemiş bir rızayı verilmiş saymaktı.
 */

export type CerezKarari = 'kabul' | 'ret'

export const CEREZ_ANAHTARI = 'rosso_cookies_accepted'

/** Karar değişince pencerede yayınlanır — dinleyenler anında tepki verir. */
export const CEREZ_OLAYI = 'rosso:cerez-karari'

/**
 * Saklanan kararı okur. Tarayıcı dışında (SSR) ve depolama engelliyse
 * `null` döner — yani ölçüm yüklenmez. Güvenli taraf budur.
 */
export function cerezKarariniOku(): CerezKarari | null {
  if (typeof window === 'undefined') return null
  try {
    const ham = window.localStorage.getItem(CEREZ_ANAHTARI)
    return ham === 'kabul' || ham === 'ret' ? ham : null
  } catch {
    // Gizli sekme / depolama kapalı → kararsız say, ölçüm yükleme.
    return null
  }
}

/** Kararı saklar ve aynı sekmedeki dinleyicileri haberdar eder. */
export function cerezKarariniYaz(karar: CerezKarari): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CEREZ_ANAHTARI, karar)
  } catch {
    /* Depolama yoksa karar bu oturum için geçerli olur; olay yine yayınlanır. */
  }
  window.dispatchEvent(new CustomEvent<CerezKarari>(CEREZ_OLAYI, { detail: karar }))
}

/** Kararı siler → banner yeniden çıkar (gizlilik sayfasındaki "değiştir"). */
export function cerezKarariniSifirla(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CEREZ_ANAHTARI)
  } catch {
    /* yoksay */
  }
  window.dispatchEvent(new CustomEvent(CEREZ_OLAYI, { detail: null }))
}
