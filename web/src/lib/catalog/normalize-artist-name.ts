/**
 * Sanatçı adı eşleştirme anahtarı — `artists.name_normalized` ile aynı kural.
 *
 * ⚠ Türkçe locale (`toLocaleLowerCase('tr')`) KULLANILMAZ: TR locale'de büyük
 * "I" → "ı" (noktasız) olur. worker (Python, `artist_profile.py`
 * `normalize_artist_name`) `str.lower()` kullanıyor — standart Unicode
 * casefolding, "I" → "i". İki taraf farklı locale kullanınca AYNI sanatçı adı
 * (ör. "Imagine Dragons") iki farklı `name_normalized` üretiyordu; upsert'in
 * `onConflict: 'name_normalized'` mantığı bu yüzden hiç tetiklenmiyor, her
 * fark yeni bir `artists` satırı açıyordu (2026-09-16, canlıda 3 sanatçı
 * etkilenmişti — bkz. migration `0302_artists_name_normalized_birlesme.sql`).
 */
export function normalizeArtistName(name: string): string {
  return name.trim().toLowerCase()
}
