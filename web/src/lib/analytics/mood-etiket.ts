/**
 * Mood uygunluk etiketleri (migration 0338) — istemci ve sunucunun ortak
 * sözlüğü. Saf modül: DB erişimi yok, client bileşeni güvenle import eder.
 *
 * İki ayrı soru, dört cevap:
 *   "Bu parça bu listeye ait mi?"  → katalog (herkes için)
 *   "Ben bu parçayı seviyor muyum?" → kişisel (yalnız bu kullanıcı)
 *
 * ⚠ Değerler DB CHECK kısıtıyla birebir (`mood_track_feedback_etiket_gecerli`).
 */

export const MOOD_ETIKETLERI = ['alakasiz', 'alakali_sevmedim', 'uygun', 'cok_sevdim'] as const

export type MoodEtiketi = (typeof MOOD_ETIKETLERI)[number]

export type MoodEtiketBilgisi = {
  etiket: MoodEtiketi
  ad: string
  aciklama: string
  /** true → parça kullanıcının kişisel listesinden çıkar. */
  listedenCikarir: boolean
  /** Katalog (herkes) için uygunluk yönü. */
  uygunluk: 1 | -1
}

/** Menüdeki sıra: olumsuzdan olumluya. */
export const MOOD_ETIKET_BILGISI: readonly MoodEtiketBilgisi[] = [
  {
    etiket: 'alakasiz',
    ad: 'Alakasız',
    aciklama: 'Bu listeye ait değil',
    listedenCikarir: true,
    uygunluk: -1,
  },
  {
    etiket: 'alakali_sevmedim',
    ad: 'Uygun, sevmedim',
    aciklama: 'Listeye ait ama bana göre değil',
    listedenCikarir: true,
    uygunluk: 1,
  },
  {
    etiket: 'uygun',
    ad: 'Uygun',
    aciklama: 'Bu listede olmalı',
    listedenCikarir: false,
    uygunluk: 1,
  },
  {
    etiket: 'cok_sevdim',
    ad: 'Çok sevdim',
    aciklama: 'Tam yerinde, kesinlikle kalsın',
    listedenCikarir: false,
    uygunluk: 1,
  },
]

const BILGI = new Map(MOOD_ETIKET_BILGISI.map((b) => [b.etiket, b]))

export function moodEtiketBilgisi(etiket: MoodEtiketi): MoodEtiketBilgisi {
  return BILGI.get(etiket)!
}

export function gecerliMoodEtiketi(deger: unknown): deger is MoodEtiketi {
  return typeof deger === 'string' && (MOOD_ETIKETLERI as readonly string[]).includes(deger)
}

/** Etiketli parça kişisel listeden çıkar mı? Etiketsiz → hayır. */
export function listedenCikarirMi(etiket: MoodEtiketi | null | undefined): boolean {
  return etiket ? moodEtiketBilgisi(etiket).listedenCikarir : false
}

/**
 * AI'a NEGATİF ÖRNEK olarak gösterilebilecek gizlenenleri ayıklar.
 *
 * "Uygun, sevmedim" etiketli parça listeden çıkar AMA modele "bu türden
 * parça seçme" diye gösterilmez — parça listeye AİT; yalnız kullanıcının
 * zevkine uymuyor. Onu negatif örnek yapmak, etiketin var olma sebebini
 * (katalog uygunluğu ile kişisel zevki ayırmak) boşa çıkarırdı.
 */
export function aiNegatifOrnekleri(
  gizliKimlikler: readonly string[],
  etiketler: ReadonlyMap<string, MoodEtiketi>,
): string[] {
  return gizliKimlikler.filter((id) => etiketler.get(id) !== 'alakali_sevmedim')
}

/**
 * AI'a POZİTİF örnek sırası: açık etiketler (çok sevdim → uygun) önce, örtük
 * onaylar sonra. `buildOrnekler` listeyi kırptığı için sıra, hangi örneğin
 * modele ulaşacağını belirler.
 */
export function aiPozitifOrnekSirasi(
  onayliKimlikler: readonly string[],
  etiketler: ReadonlyMap<string, MoodEtiketi>,
): string[] {
  const agirlik = (id: string) => {
    const e = etiketler.get(id)
    return e === 'cok_sevdim' ? 0 : e === 'uygun' ? 1 : 2
  }
  return [...onayliKimlikler].sort((a, b) => agirlik(a) - agirlik(b))
}
