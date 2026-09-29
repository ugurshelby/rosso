import type { BooleanCapability } from '@/lib/phase/read'
import { QS_ADIMLARI, kilitAnahtari, qsAnahtari, type QsAdimi } from './anahtarlar'
import {
  KILIT_KATALOGU,
  type AcanAdim,
  type KilitOzelligi,
  type ZipTuru,
} from './kilit-katalogu'

/**
 * Quick Start + faz kilidi durumu — SAF hesap (I/O yok, test edilebilir).
 *
 * Girdi: veritabanından okunan ham gerçekler + faz yetenekleri + "görüldü"
 * kayıtları. Çıktı: arayüzün bir bakışta çizebileceği karar (hangi kart var,
 * hangisi çözülüyor, hangi kilit açılış animasyonu bekliyor).
 *
 * Kural özeti (Sahip, 2026-09-24):
 *  • Adım TAMAMLANDI ama çözülme animasyonu HENÜZ OYNAMADI → kart görünür ve
 *    `animasyonBekliyor` (kullanıcı adımdan dönünce kartın çözülmesini görür).
 *  • Adım tamam VE animasyon oynadı → kart artık HİÇ render edilmez.
 *  • ZIP adımı ÜÇ dosya da yüklenene dek kaybolmaz; ilerleme metni değişir.
 *  • Son kart çözülürken bölümün kendisi de kartla BİRLİKTE çözülür
 *    (`bolumCozulsun`). Hepsi tamam + görülmüşse bölüm hiç çıkmaz.
 */

export interface QuickStartHam {
  spotify: boolean
  streaming: boolean
  account: boolean
  technical: boolean
  yukleniyor: boolean
  sonZipAt: string | null
}

export type YetenekHaritasi = Readonly<Record<BooleanCapability, boolean>>

export interface AdimDurumu {
  adim: QsAdimi
  tamam: boolean
  /** Tamam ama çözülme animasyonu oynamadı → kart bu render'da animasyonla çözülür. */
  animasyonBekliyor: boolean
  /** Kart bu render'da DOM'da olmalı mı? (tamam+görüldü → false) */
  gorunur: boolean
}

export interface ZipIlerlemesi {
  streaming: boolean
  account: boolean
  technical: boolean
  /** Yüklenip işlenen ZIP türü sayısı (0–3). */
  tamamlanan: number
  toplam: 3
  eksik: readonly ZipTuru[]
  /** Kuyrukta / işlenen / az önce başlamış bir yükleme var. */
  yukleniyor: boolean
  /** Son tamamlanan ZIP işi (ISO). Metin: "genellikle şu kadar sürer". */
  sonZipAt: string | null
}

export interface KilitDurumu {
  ozellik: KilitOzelligi
  yetenek: BooleanCapability
  /** Kilit AÇIK mı? (Faz yeteneğinden; test override'ını da yansıtır.) */
  acik: boolean
  /** Açık ama açılış animasyonu bu kullanıcıya hiç oynamadı. */
  animasyonBekliyor: boolean
  acanAdim: AcanAdim
  gerekenZipler: readonly ZipTuru[]
  /** Hâlâ eksik olan ZIP türleri (gerekenler − yüklenenler). */
  eksikZipler: readonly ZipTuru[]
  rota: string | null
}

export interface QuickStartDurumu {
  /**
   * 'hata': durum OKUNAMADI. Güvenli hâl: Quick Start çizilmez, animasyon
   * oynatılmaz, kilitler faz yeteneğinden gelir. Kullanıcıya yanlış "adım
   * tamam" ya da "adım eksik" demektense sessiz kalırız.
   */
  kaynak: 'ok' | 'hata'
  /** Sabit sıra: spotify, zip. */
  adimlar: readonly AdimDurumu[]
  /** DOM'da olması gereken kartlar (sıralı). */
  gorunurKartlar: readonly QsAdimi[]
  /** Quick Start bölümü bu render'da var mı? */
  bolumGorunur: boolean
  /** Görünür kartların tümü çözülüyor ve hiçbir adım eksik değil → bölüm kartla birlikte kaybolur. */
  bolumCozulsun: boolean
  /** Tüm adımlar gerçekten tamam (animasyon durumundan bağımsız). */
  tamamlandi: boolean
  zip: ZipIlerlemesi
  /** Katalog sırasıyla tüm kilitler. */
  kilitler: readonly KilitDurumu[]
  /**
   * Bir adım tamamlanınca (Spotify doğrulaması, ZIP işlenmesi) kullanıcının
   * döneceği yer. Bölüm hâlâ görünüyorsa '/dashboard', değilse `null`.
   */
  donusYolu: '/dashboard' | null
}

const ZIP_SIRASI: readonly ZipTuru[] = ['streaming', 'account', 'technical']

export function hesaplaQuickStart(
  ham: QuickStartHam,
  yetenekler: YetenekHaritasi,
  gorulen: ReadonlySet<string>,
): QuickStartDurumu {
  const zip: ZipIlerlemesi = {
    streaming: ham.streaming,
    account: ham.account,
    technical: ham.technical,
    tamamlanan: [ham.streaming, ham.account, ham.technical].filter(Boolean).length,
    toplam: 3,
    eksik: ZIP_SIRASI.filter((z) => !ham[z]),
    yukleniyor: ham.yukleniyor,
    sonZipAt: ham.sonZipAt,
  }

  const tamamMap: Record<QsAdimi, boolean> = {
    spotify: ham.spotify,
    zip: zip.tamamlanan === 3,
  }

  const adimlar: AdimDurumu[] = QS_ADIMLARI.map((adim) => {
    const tamam = tamamMap[adim]
    const goruldu = gorulen.has(qsAnahtari(adim))
    return {
      adim,
      tamam,
      animasyonBekliyor: tamam && !goruldu,
      gorunur: !(tamam && goruldu),
    }
  })

  const gorunurKartlar = adimlar.filter((a) => a.gorunur).map((a) => a.adim)
  const tamamlandi = adimlar.every((a) => a.tamam)
  const bolumGorunur = gorunurKartlar.length > 0
  const bolumCozulsun =
    bolumGorunur &&
    tamamlandi &&
    adimlar.filter((a) => a.gorunur).every((a) => a.animasyonBekliyor)

  const kilitler: KilitDurumu[] = KILIT_KATALOGU.map((k) => {
    const acik = yetenekler[k.yetenek]
    return {
      ozellik: k.ozellik,
      yetenek: k.yetenek,
      acik,
      animasyonBekliyor: acik && !gorulen.has(kilitAnahtari(k.ozellik)),
      acanAdim: k.acanAdim,
      gerekenZipler: k.gerekenZipler,
      eksikZipler: k.gerekenZipler.filter((z) => !ham[z]),
      rota: k.rota,
    }
  })

  return {
    kaynak: 'ok',
    adimlar,
    gorunurKartlar,
    bolumGorunur,
    bolumCozulsun,
    tamamlandi,
    zip,
    kilitler,
    donusYolu: bolumGorunur ? '/dashboard' : null,
  }
}

/**
 * Durum okunamadığında dönen güvenli hâl: Quick Start yok, animasyon yok,
 * kilitler yalnız faz yeteneğinden (kullanıcı kilitli içeriğe SIZMAZ).
 */
export function guvenliQuickStart(yetenekler: YetenekHaritasi): QuickStartDurumu {
  const bos: QuickStartHam = {
    spotify: false,
    streaming: false,
    account: false,
    technical: false,
    yukleniyor: false,
    sonZipAt: null,
  }
  const durum = hesaplaQuickStart(bos, yetenekler, new Set())
  return {
    ...durum,
    kaynak: 'hata',
    adimlar: durum.adimlar.map((a) => ({ ...a, animasyonBekliyor: false, gorunur: false })),
    gorunurKartlar: [],
    bolumGorunur: false,
    bolumCozulsun: false,
    kilitler: durum.kilitler.map((k) => ({ ...k, animasyonBekliyor: false })),
    donusYolu: null,
  }
}
