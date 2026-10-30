/**
 * Vitrin görsellerindeki ÖRNEK yıl dizisi — her zaman bugünde biter.
 *
 * Landing'deki Journey kartı ve Journey mockup'ı bir "yıllara yayılan arşiv"i
 * yıl hapları ve etiketlerle gösterir. Bu yıllar örnek görseldir, bir veri
 * iddiası değil; elle yazılınca ("2019 … 2023") yıllar içinde bayatlıyor ve
 * site eski görünüyordu (2026-10-12'de 2023'te kalmış halde bulundu).
 * Hesaplanınca her zaman güncel kalır.
 */
export function ornekYillar(adet: number, buYil: number = new Date().getFullYear()): number[] {
  const n = Math.max(1, Math.floor(adet))
  return Array.from({ length: n }, (_, i) => buYil - n + 1 + i)
}
