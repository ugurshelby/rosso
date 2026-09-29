/**
 * Tür → renk eşleştirmesi.
 * Otorite: docs/design/katmanlar/dashboard-design.md §3.6
 *
 * "Çok renklilik yalnızca veri görselleştirmede." Arayüz tek renklidir;
 * grafiklerde kategori ayrımı için SABİT altı renk kullanılır. Bu renkler
 * kart zeminine, butona veya navigasyona TAŞINMAZ — yalnız bar, yüzde ve
 * tür etiketinde görünür.
 *
 * Neden sabit tablo + rampa (2026-08-01, tek palete geçiş):
 * Önceki sürüm her tür string'ine çemberden (0-360) deterministik bir hue
 * veriyordu. Bu, "her tür kendi rengini alsın" sorununu çözüyordu ama tek
 * renkli arayüz diliyle çelişiyor: 60+ tür = ekranda 60+ rastgele renk.
 * Şimdi ANA türler promptun altı sabit rengini alır; tabloda olmayan türler
 * mor yoğunluk rampasına (--v1…--v5) deterministik olarak dağılır. Böylece
 * yeni bir tür eklenince kod değişikliği yine gerekmez, ama ekran tek
 * renkli kalır.
 */

// Basit, hızlı, deterministik string hash (djb2 varyantı).
function hashString(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return hash >>> 0
}

/** Tür adını normalize eder — büyük/küçük harf ve baştaki/sondaki boşluk fark etmesin. */
function normalizeGenre(genre: string): string {
  return genre.trim().toLowerCase()
}

/**
 * Altı sabit kategori rengi. Anahtarlar TR+EN varyantlarını birlikte tutar —
 * katalogda "elektronik"/"electronic" gibi ikili yazımlar var.
 */
const GENRE_COLORS: Record<string, string> = {
  // hip-hop ailesi
  'hip-hop': '#8B5CF6',
  'hip hop': '#8B5CF6',
  hiphop: '#8B5CF6',
  rap: '#8B5CF6',
  trap: '#8B5CF6',
  drill: '#8B5CF6',
  // pop
  pop: '#F59E0B',
  'türkçe pop': '#F59E0B',
  'turkce pop': '#F59E0B',
  // alternatif
  alternatif: '#10B981',
  alternative: '#10B981',
  indie: '#10B981',
  // rock
  rock: '#3B82F6',
  metal: '#3B82F6',
  punk: '#3B82F6',
  // elektronik
  elektronik: '#EC4899',
  electronic: '#EC4899',
  edm: '#EC4899',
  house: '#EC4899',
  techno: '#EC4899',
  // r&b
  'r&b': '#84CC16',
  rnb: '#84CC16',
  soul: '#84CC16',
  funk: '#84CC16',
}

/** Tabloda olmayan türler için mor yoğunluk rampası (--v1…--v5 karşılıkları). */
const RAMP = [
  'rgba(124, 92, 255, 0.85)',
  'rgba(124, 92, 255, 0.62)',
  'rgba(124, 92, 255, 0.42)',
  'rgba(124, 92, 255, 0.26)',
  'rgba(124, 92, 255, 0.14)',
]

/**
 * Tür → renk. Aynı girdi her zaman aynı çıktıyı üretir.
 * Ana türler sabit kategori rengini, diğerleri mor rampasından
 * deterministik bir basamağı alır.
 */
export function getGenreColor(genre: string): string {
  const key = normalizeGenre(genre)
  const exact = GENRE_COLORS[key]
  if (exact) return exact

  // "türkçe rap", "alternative rock" gibi bileşik adlar: bilinen bir tür
  // adını içeriyorsa onun rengini alır (en uzun eşleşme kazanır — "rock"
  // ile "alternative rock" çakışmasın).
  let best: { len: number; color: string } | null = null
  for (const [name, color] of Object.entries(GENRE_COLORS)) {
    if (key.includes(name) && (!best || name.length > best.len)) {
      best = { len: name.length, color }
    }
  }
  if (best) return best.color

  return RAMP[hashString(key) % RAMP.length]!
}
