/**
 * Playlist dizi optimizasyonu — enerji eğrisi.
 * `docs/reference/rosso-ai-integration.md` §5.6 (Adım 12).
 *
 *     Enerji
 *       ▲              [Zirve]
 *       │                ╭──╮
 *       │      [Isınma] ╭╯  ╰╮ [İniş]
 *       │         ╭─────╯    ╰────╮ [Dingin kapanış]
 *       │   ╭─────╯               ╰─────
 *       └───┴──────────────────────────────► sıra
 *
 * NEDEN ARTIK YAPILABİLİR (2026-09-19): bu adım "parça enerjisi verisi yok"
 * gerekçesiyle bekletilmişti — parça bazlı katalog kapsaması %0,4'tü. Migration
 * 0319'un SANATÇI geri düşüşüyle gerçek bir aday havuzunda enerji etiketi
 * kapsaması %94'e çıktı (200 adaydan 188'i). Engel kalktı.
 *
 * TASARIM KARARLARI:
 *  • DETERMİNİSTİK, maliyet sıfır: veri zaten aday listesinde (`e` alanı),
 *    ek sorgu ya da AI çağrısı yok.
 *  • MODELİN KARARINA SAYGI: yalnız enerjisi BİLİNEN parçalar yer değiştirir;
 *    enerjisi bilinmeyen parça modelin koyduğu yerde kalır. Aynı enerji
 *    katmanındaki parçaların GÖRELİ sırası modelinki gibi korunur — yani eğri
 *    yalnız enerji seviyeleri arasında karar verir, modelin tercihlerini ezmez.
 *  • TEK SEVİYELİ LİSTEYE DOKUNMAZ: "The Quiet Side" gibi tamamı düşük enerjili
 *    bir listede eğri kurulamaz; liste olduğu gibi döner.
 *  • SANATÇI ÇEŞİTLİLİĞİ: aynı sanatçı art arda gelirse, aynı enerji katmanından
 *    başka sanatçılı bir parçayla yer değiştirilir (eğri bozulmadan).
 */

export type EnerjiSeviyesi = 'low' | 'medium' | 'high' | 'explosive'

const SEVIYE: Record<EnerjiSeviyesi, number> = { low: 1, medium: 2, high: 3, explosive: 4 }

/** Eğriyi kuran aday bilgisi — `AiCandidateTrack`'in ihtiyaç duyulan alt kümesi. */
export interface EgriAdayi {
  id: string
  /** sanatçı */
  a: string
  /** enerji (Katman A) — bilinmiyorsa yok */
  e?: string
}

/** Zirvenin listede nerede olacağı (0..1). */
const ZIRVE_KONUMU = 0.65

/**
 * Normalize konum t (0..1) için hedef enerji (0..1).
 * Isınma ~0,3'ten başlar, zirvede 1'e çıkar, kapanışta ~0,4'e iner.
 */
export function hedefEnerji(t: number): number {
  if (t <= ZIRVE_KONUMU) return 0.3 + 0.7 * (t / ZIRVE_KONUMU)
  return 1 - 0.6 * ((t - ZIRVE_KONUMU) / (1 - ZIRVE_KONUMU))
}

function seviyesi(e: string | undefined): number | undefined {
  return e && e in SEVIYE ? SEVIYE[e as EnerjiSeviyesi] : undefined
}

/**
 * Sıralı parça listesine enerji eğrisini uygular.
 *
 * @param sirali   Modelin (ve deterministik tamamlamanın) ürettiği sıra.
 * @param adaylar  Enerji ve sanatçı bilgisinin geldiği aday havuzu.
 * @returns Aynı parçalar, eğriye göre yeniden sıralanmış. Parça EKLENMEZ, ATILMAZ.
 */
export function enerjiEgrisiUygula(sirali: readonly string[], adaylar: readonly EgriAdayi[]): string[] {
  const bilgi = new Map(adaylar.map((a) => [a.id, a]))

  // Enerjisi bilinen parçaların listedeki yerleri ("yuvalar") ve seviyeleri.
  const yuvalar: number[] = []
  const bilinenler: Array<{ id: string; seviye: number; modelSirasi: number }> = []
  sirali.forEach((id, konum) => {
    const s = seviyesi(bilgi.get(id)?.e)
    if (s === undefined) return
    yuvalar.push(konum)
    bilinenler.push({ id, seviye: s, modelSirasi: bilinenler.length })
  })

  // Eğri kurulamayacak durumlar: çok az veri ya da tek enerji seviyesi.
  if (bilinenler.length < 3) return [...sirali]
  if (new Set(bilinenler.map((b) => b.seviye)).size < 2) return [...sirali]

  const n = yuvalar.length
  // Her yuvanın hedef enerjisi — yuvanın bilinenler arasındaki sırasına göre.
  const yuvaHedefi = yuvalar.map((_, k) => ({ k, hedef: hedefEnerji(n === 1 ? 0 : k / (n - 1)) }))

  // Hedefi düşükten yükseğe sıralı yuvalar; en düşük enerjili parçalar bunlara gider.
  const hedefSirali = [...yuvaHedefi].sort((x, y) => x.hedef - y.hedef || x.k - y.k)

  // Parçalar seviyeye göre (katman içinde MODEL SIRASI korunarak).
  const seviyeSirali = [...bilinenler].sort((x, y) => x.seviye - y.seviye || x.modelSirasi - y.modelSirasi)

  // Katman katman ata: her katman, kendine düşen yuvaları KONUM sırasıyla alır
  // ve parçalarını model sırasıyla yerleştirir → katman içi göreli sıra korunur.
  const atama = new Array<string>(n)
  let imlec = 0
  while (imlec < n) {
    const seviye = seviyeSirali[imlec].seviye
    let son = imlec
    while (son < n && seviyeSirali[son].seviye === seviye) son += 1
    const katmanYuvalari = hedefSirali
      .slice(imlec, son)
      .map((y) => y.k)
      .sort((a, b) => a - b)
    seviyeSirali.slice(imlec, son).forEach((parca, i) => {
      atama[katmanYuvalari[i]] = parca.id
    })
    imlec = son
  }

  const sonuc = [...sirali]
  yuvalar.forEach((konum, k) => {
    sonuc[konum] = atama[k]
  })

  return sanatciTekrariniAzalt(sonuc, bilgi)
}

/**
 * Art arda aynı sanatçıyı, aynı enerji seviyesinden başka sanatçılı bir parçayla
 * yer değiştirerek azaltır. Enerji eğrisi bozulmaz (yalnız aynı seviye takası).
 * Kusursuz olması gerekmez — tek geçiş, sınırlı takas.
 */
function sanatciTekrariniAzalt(liste: string[], bilgi: Map<string, EgriAdayi>): string[] {
  const sanatci = (id: string) => bilgi.get(id)?.a?.trim().toLowerCase() ?? ''
  const seviye = (id: string) => seviyesi(bilgi.get(id)?.e)

  for (let i = 1; i < liste.length; i += 1) {
    const onceki = sanatci(liste[i - 1])
    if (!onceki || sanatci(liste[i]) !== onceki) continue
    const hedefSeviye = seviye(liste[i])
    for (let j = i + 1; j < liste.length; j += 1) {
      if (seviye(liste[j]) !== hedefSeviye) continue
      if (sanatci(liste[j]) === onceki) continue
      // Takas, j'nin çevresinde yeni bir tekrar yaratmasın.
      const jOnceki = sanatci(liste[j - 1])
      const jSonraki = j + 1 < liste.length ? sanatci(liste[j + 1]) : ''
      const gelen = sanatci(liste[i])
      if (j - 1 !== i && jOnceki === gelen) continue
      if (jSonraki === gelen) continue
      ;[liste[i], liste[j]] = [liste[j], liste[i]]
      break
    }
  }
  return liste
}
