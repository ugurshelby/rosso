import type { JourneyYear } from './read'

/**
 * Journey v2 "Hayat Arşivi" — yıl kapağı yardımcıları.
 *
 * FAZ D (2026-07-19, big-changes.md): mikro başlık (MICRO_TITLE_BY_VIBE) ve
 * ritüel rozeti (RITUAL_BADGE_BY_KEY) tabloları kaldırıldı — ikisi de anket
 * cevabından türüyordu, anket kalkınca kaynaksız kaldılar. Geriye yalnız
 * dinleme verisinden hesaplanan mikro milestone'lar kaldı.
 */

/**
 * Yılın kırılma rozetleri (Plan 02 soft-touch §6, felsefe düzeltmesi).
 *
 * ── Eski hâlin sorunu ──
 * Önceki sürüm her yıla şablon cümleler basıyordu: "yolun en çeşitli yılı",
 * "hacmin ikiye katlandı", "yarısından fazlasını oluşturdu". Sahip: her yıl
 * "en çeşitli yıl" olamaz; ayrıca aynı veri (keşif sayısı) hemen altındaki
 * Keşif kutusunda ZATEN yazıyordu — ikinci kez tekrar. Bu, design.md §1'in
 * yasakladığı "şablondan üretilmiş hikâye metni" sınıfına giriyordu.
 *
 * ── Yeni kural ──
 * Yalnız o yıl gerçekten bir REKOR kırdıysa, brutalist veri etiketi bas. Rekor
 * yoksa HİÇBİR ŞEY yazma — boşluk konuşur (§6). Cümle değil, ölçüm damgası:
 * "TÜM ZAMANLARIN KEŞİF REKORU" gibi. `peaks` tüm yılların uç değerleridir;
 * bir yıl ancak bu uçlara EŞİTSE rozet alır.
 */
export interface JourneyPeaks {
  /** En yüksek yeni-sanatçı sayısı (tüm yıllar). */
  newArtists: number
  /** En yüksek dinleme hacmi (tüm yıllar). */
  plays: number
  /** En yüksek tür çeşitliliği (tüm yıllar). */
  variety: number
}

/** Tüm yıllardan uç değerleri çıkarır — rekor kıyaslaması için tek kaynak. */
export function computeJourneyPeaks(years: JourneyYear[]): JourneyPeaks {
  return {
    newArtists: Math.max(0, ...years.map((y) => y.newArtistCount)),
    plays: Math.max(0, ...years.map((y) => y.playCount)),
    variety: Math.max(0, ...years.map((y) => y.genreVariety)),
  }
}

export function buildMicroMilestones(year: JourneyYear, peaks: JourneyPeaks): string[] {
  const out: string[] = []

  // Yalnız GERÇEK rekorlar — ve rekorun anlamlı olması için alt taban.
  if (year.newArtistCount > 0 && year.newArtistCount === peaks.newArtists) {
    out.push(`En çok yeni ses keşfettiğin yıl (${year.newArtistCount} sanatçı)`)
  }
  if (year.playCount > 0 && year.playCount === peaks.plays) {
    out.push(`Müzikle en iç içe olduğun yıl`)
  }
  if (year.genreVariety > 0 && year.genreVariety === peaks.variety && year.genreVariety >= 20) {
    out.push(`En zengin müzikal paletin (${year.genreVariety} farklı tür)`)
  }

  // En fazla 2 rozet — üçü birden bir yıla düşerse ekran şişer.
  return out.slice(0, 2)
}
