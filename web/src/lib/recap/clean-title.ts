/**
 * Şarkı adı temizliği — Recap kartlarında basılmadan önce.
 *
 * Sahibin tarifi (plan §4.1): "feat.", "remix", "from the movie" gibi
 * kalabalıkları temizleyip saf başlığı bırak.
 *
 * ⚠ Sahibin ilk taslağı `title.split(/[\(\[\-]/)[0]` idi. Bu **her tireden**
 * böler ve gerçek adları kırar:
 *     'Jay-Z'          → 'Jay'
 *     'Lo-fi Dreams'   → 'Lo'
 *     'Yaş-ı Karanlık' → 'Yaş'
 * Sahip güvenli sürümü seçti (2026-07-21): parantez/köşeli ayraç her zaman
 * kesilir; tire YALNIZ boşluklu ' - ' ise VE devamında bilinen bir süsleme
 * (remix/version/edit/live/remaster…) varsa kesilir.
 *
 * Aynı ders ISRC tarafında da yaşandı — bkz.
 * `worker/app/pipeline/isrc_backfill.py::strip_decorations`. İki taraf aynı
 * mantığı paylaşır; biri değişirse diğeri de gözden geçirilmeli.
 */

/** Tireli kuyrukta "bu bir süslemedir" diyen anahtarlar. */
const SUFFIX_KEYWORDS =
  /\b(remix|mix|edit|version|versiyon|remaster(ed)?|live|acoustic|akustik|instrumental|enstrümantal|cover|karaoke|radio|extended|bonus|demo|sped\s*up|speed\s*up|slowed|session[s]?)\b/i

export function cleanTrackTitle(raw: string): string {
  if (!raw) return raw

  // 1) Parantez / köşeli / süslü ayraç bloklarını at — bunlar neredeyse her
  //    zaman süslemedir: '(feat. X)', '[CB REMIX]', '(From "…" Soundtrack)'.
  let out = raw.replace(/[([{][^)\]}]*[)\]}]/g, ' ')

  // 2) Boşluklu ' - ' kuyruğu: yalnız bilinen süsleme geçiyorsa kes.
  //    'Six Days - Remix' → kesilir · 'Jay-Z' dokunulmaz (boşluk yok) ·
  //    'Cambaz - Saygı1' → kesilmez (süsleme anahtarı yok, gerçek alt başlık).
  const dash = out.search(/\s+[-–—]\s+/)
  if (dash !== -1) {
    const tail = out.slice(dash)
    if (SUFFIX_KEYWORDS.test(tail)) {
      out = out.slice(0, dash)
    }
  }

  out = out.replace(/\s{2,}/g, ' ').trim()
  // Her şey silindiyse orijinali koru — boş başlık basmaktansa süslemeli bas.
  return out || raw.trim()
}
