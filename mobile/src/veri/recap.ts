import { sureMetni } from './bicim'

/**
 * Recap hikâyesi (PLAN 4.7f, spec §9.4): `recaps.payload` (canlıda: cover,
 * manifesto, top_tracks, top_artists, obsession, streak, peak_day, discovery?,
 * extras) → sırayla çizilecek sayfalar. Eksik bölüm sayfa üretmez; algoritmik
 * yorum cümlesi yok, yalnız kişinin kendi sayıları.
 */
export interface Oge {
  ad: string
  alt?: string
  kapak: string | null
  sayi?: number
}

export type HikayeSayfasi =
  | { tur: 'kapak'; ust: string; baslik: string }
  | { tur: 'sayilar'; baslik: string; satirlar: { etiket: string; deger: string }[] }
  | { tur: 'bir-numara'; baslik: string; oge: Oge }
  | { tur: 'liste'; baslik: string; ogeler: Oge[]; daire?: boolean }
  | { tur: 'buyuk-sayi'; baslik: string; deger: string; alt: string }

const nesne = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const metin = (v: unknown) => (typeof v === 'string' ? v : '')
const sayi = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0)
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

/** "2026-09-14" → "14 Eylül". */
export function tarihMetni(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])} ${AYLAR[Number(m[2]) - 1] ?? ''}`.trim()
}

export function hikayeSayfalari(payload: unknown, donemEtiketi: string): HikayeSayfasi[] {
  const p = nesne(payload)
  if (!p) return []
  const sayfalar: HikayeSayfasi[] = []

  const kapak = nesne(p.cover)
  sayfalar.push({ tur: 'kapak', ust: metin(kapak?.issue_label) || 'Recap', baslik: metin(kapak?.period_label) || donemEtiketi })

  const man = nesne(p.manifesto)
  if (man) {
    const satirlar = [
      { etiket: 'Dinleme', deger: sureMetni(sayi(man.minutes) * 60000) },
      { etiket: 'Şarkı', deger: sayi(man.tracks).toLocaleString('tr-TR') },
      { etiket: 'Sanatçı', deger: sayi(man.artists).toLocaleString('tr-TR') },
    ]
    if (metin(man.dominant_genre)) satirlar.push({ etiket: 'En çok tür', deger: metin(man.dominant_genre) })
    sayfalar.push({ tur: 'sayilar', baslik: 'Bu dönem', satirlar })
  }

  const sarkilar = (Array.isArray(p.top_tracks) ? p.top_tracks : []).map(nesne).filter((o): o is Record<string, unknown> => !!o)
  const ilk = sarkilar[0]
  if (ilk) {
    sayfalar.push({
      tur: 'bir-numara',
      baslik: 'Bir numara',
      oge: { ad: metin(ilk.title), alt: metin(ilk.artist), kapak: metin(ilk.image_url) || null, sayi: sayi(ilk.plays) },
    })
  }
  if (sarkilar.length > 1) {
    sayfalar.push({
      tur: 'liste',
      baslik: 'En çok dinlediğin şarkılar',
      ogeler: sarkilar.slice(0, 5).map((o) => ({ ad: metin(o.title), alt: metin(o.artist), kapak: metin(o.image_url) || null, sayi: sayi(o.plays) })),
    })
  }

  const sanatcilar = (Array.isArray(p.top_artists) ? p.top_artists : []).map(nesne).filter((o): o is Record<string, unknown> => !!o)
  if (sanatcilar.length) {
    sayfalar.push({
      tur: 'liste',
      baslik: 'En çok dinlediğin sanatçılar',
      daire: true,
      ogeler: sanatcilar.slice(0, 5).map((o) => ({ ad: metin(o.name), kapak: metin(o.image_url) || null, sayi: sayi(o.plays) })),
    })
  }

  const tak = nesne(p.obsession)
  if (tak && metin(tak.title)) {
    sayfalar.push({
      tur: 'buyuk-sayi',
      baslik: 'Takıntın',
      deger: `${sayi(tak.plays)}×`,
      alt: `${metin(tak.title)} · ${metin(tak.artist)} — ${sayi(tak.span_days)} günde`,
    })
  }

  const seri = nesne(p.streak)
  if (seri && sayi(seri.days) > 1) {
    sayfalar.push({
      tur: 'buyuk-sayi',
      baslik: 'Hiç ara vermediğin günler',
      deger: `${sayi(seri.days)} gün`,
      alt: `${tarihMetni(metin(seri.start))} – ${tarihMetni(metin(seri.end))}`,
    })
  }

  const gun = nesne(p.peak_day)
  if (gun && metin(gun.day)) {
    sayfalar.push({
      tur: 'buyuk-sayi',
      baslik: 'En dolu günün',
      deger: tarihMetni(metin(gun.day)),
      alt: `${sureMetni(sayi(gun.minutes) * 60000)} · ${sayi(gun.plays)} dinleme`,
    })
  }

  const kesif = nesne(p.discovery)
  if (kesif && (sayi(kesif.new_tracks) > 0 || sayi(kesif.new_artists) > 0)) {
    sayfalar.push({
      tur: 'sayilar',
      baslik: 'İlk kez',
      satirlar: [
        { etiket: 'Yeni şarkı', deger: sayi(kesif.new_tracks).toLocaleString('tr-TR') },
        { etiket: 'Yeni sanatçı', deger: sayi(kesif.new_artists).toLocaleString('tr-TR') },
      ],
    })
  }

  return sayfalar
}
