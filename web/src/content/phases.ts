import type { Phase } from '@/lib/phase/read'

/**
 * Rosso Büyüyen Kimlik — Faz ve Seviye Atlama Metinleri (Level-Up Experience).
 *
 * Ton: Rosso dili — "Spotify sana ne dinlediğini gösterir, Rosso bunu dinleyen
 * insanı anlatır." Şiirsel, net ve açılan yetenekleri kutlayan anlatı.
 *
 * ⚠ Metin değiştiğinde `CONTENT_VERSION` artırılır — panel kullanıcılara yeniden gösterilir.
 */

export const CONTENT_VERSION = 3

export interface PhaseSlide {
  title: string
  body: string
  href?: string
  cta?: string
  icon?: 'journey' | 'recap' | 'genre' | 'car' | 'library' | 'inferences' | 'spotify'
}

export interface PhaseContent {
  /** Katman seviye rozeti (örn: "KATMAN 2 · L2 SEVİYE ATLAMA") */
  levelBadge: string
  /** Panel başlığı — faza girildiğinde görünür */
  heading: string
  /** Tek cümlelik şiirsel özet */
  summary: string
  slides: PhaseSlide[]
}

export const PHASE_CONTENT: Record<Phase, PhaseContent> = {
  1: {
    levelBadge: 'KATMAN 0 · BAŞLANGIÇ',
    heading: 'Rosso’ya Hoş Geldin',
    summary: 'Profilin oluşturuldu. Sırada müzikal kimliğini keşfetmek var.',
    slides: [
      {
        title: 'Spotify Hesabını Bağla',
        body: 'Canlı dinleme akışın, mevcut çalma listelerin ve kütüphanen doğrudan Rosso’ya aktarılır.',
        href: '/data',
        cta: 'Spotify’ı Bağla',
        icon: 'spotify',
      },
    ],
  },

  2: {
    levelBadge: 'KATMAN 1 · CANLI AKIŞ',
    heading: 'Spotify Bağlantısı Kuruldu',
    summary: 'Çalma listelerin ve anlık dinleme nabzın artık Rosso ile canlı senkronize.',
    slides: [
      {
        title: 'Canlı Kütüphane & Son Dinlenenler',
        body: 'Son 50 şarkın ve kütüphanen hazır. Dinlediğin her parça gerçek zamanlı hafızaya işlenir.',
        href: '/playlists',
        cta: 'Listelerime Bak',
        icon: 'library',
      },
      {
        title: 'Geçmiş Dinleme Arşivi',
        body: 'Geçmiş yılların kapısını açmak için Spotify Dinleme Geçmişi ZIP’ini yükleyebilirsin.',
        href: '/data',
        cta: 'Geçmişi Nasıl İndiririm?',
        icon: 'journey',
      },
    ],
  },

  3: {
    levelBadge: 'KATMAN 2 · TARİHSEL HAFIZA',
    heading: 'Dinleme Geçmişinin Kilidi Açıldı',
    summary: 'Tüm yılların dinleme verisi işlendi — Rosso artık senin hikâyeni anlatabilir.',
    slides: [
      {
        title: 'Müzikal Yolculuk (Journey) Açıldı',
        body: 'Yıllar içindeki müzik rotan, mevsimsel takıntıların ve dönüm noktası anların canlandı.',
        href: '/journey',
        cta: 'Yolculuğu Keşfet',
        icon: 'journey',
      },
      {
        title: 'Story-Deck Recap Arşivi',
        body: 'Geçmiş yılların ve ayların tüm hikaye kartları hazır; her dönem o günkü müzikal fotoğrafını yansıtır.',
        href: '/recap',
        cta: 'Recap’leri İncele',
        icon: 'recap',
      },
      {
        title: 'Tür Karışımın (Genre DNA)',
        body: '150+ alt tür seviyesinde müzikal gen haritan ve dinleme kronotipin deşifre edildi.',
        href: '/taste',
        cta: 'Zevk Haritana Git',
        icon: 'genre',
      },
    ],
  },

  4: {
    levelBadge: 'KATMAN 3 · TAM TEŞEKKÜLLÜ ARŞİV',
    heading: 'En Derin Katman Açıldı',
    summary: 'Hesap verisi ve teknik loglar birleşti — Rosso’nun en derin analiz katmanındasın.',
    slides: [
      {
        title: 'Araba Sürüş Ritüeli',
        body: 'Gece sürüşleri, yol müzikleri ve araç içi dinleme karakterin teknik loglardan deşifre edildi.',
        href: '/journey',
        cta: 'Yolculuğu Gör',
        icon: 'car',
      },
      {
        title: 'Beğeni Kronolojisi & Kütüphane Evrimi',
        body: 'Hangi şarkıyı ne zaman beğendin, neleri unuttun ve yıllar içinde kütüphanen nasıl değişti.',
        href: '/taste',
        cta: 'Kronolojiyi İncele',
        icon: 'library',
      },
      {
        title: 'Spotify vs Rosso & Sessiz Küratör',
        body: 'Spotify algoritmalarının ticari hedefleme çıkarımları ile gerçek müzik zevkinin analitik kıyası.',
        href: '/taste',
        cta: 'Kıyası Gör',
        icon: 'inferences',
      },
    ],
  },
}

/** Ara durum bantları — panel değil, ince bilgi şeridi */
export const PHASE_BANNERS = {
  processing: {
    title: 'Veri dosyan işleniyor',
    body: 'Bu işlem biraz sürebilir. İşlem bittiğinde yeni bölümler kendiliğinden açılacak.',
  },
  partialPhase4: {
    title: 'Bir dosya daha gerekiyor',
    body: 'Hem Hesap Verisi hem Teknik Log dosyaları işlendiğinde tam arşiv katmanı açılacak.',
    href: '/data',
    cta: 'Dosya Yükle',
  },
  failed: {
    title: 'Dosya işlenemedi',
    body: 'Yükleme sırasında bir aksaklık oluştu. Dosyayı tekrar yüklemeyi deneyebilirsin.',
    href: '/data',
    cta: 'Tekrar Dene',
  },
} as const
