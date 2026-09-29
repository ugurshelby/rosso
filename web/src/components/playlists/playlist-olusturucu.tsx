'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Image as ImageIcon } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { useToast } from '@/components/ui/toast'
import { SecimPaneli } from './secim-paneli'
import { ZamanPaneli } from './zaman-paneli'
import { PlaylistActionOverlay, type PlaylistActionState } from './playlist-action-overlay'
import { compressCoverImage } from '@/lib/playlists/client-image-compress'
import type { CreateOption } from '@/lib/playlists/create-options'
import { useT } from '@/lib/i18n/provider'
import styles from './playlist-olusturucu.module.css'

/**
 * `/playlists/create` — parametreli playlist üretimi (P4.2).
 *
 * Sahibin tarifi = KABUL KRİTERİ (2026-08-14):
 *   tür · sanatçı · zaman aralığı → **tıklanınca panel açılır**
 *   şarkı sayısı                  → **elle girilir**
 *   çalma sayısı / süre           → **toggle**
 *   ad · açıklama · kapak görseli → panelden girilebilmeli
 *
 * Eski form yalnız "dönem + sayı + platform" soruyordu; kullanıcı kendi
 * verisinden seçerek liste kuramıyordu (kullanıcı testi Ş-33 bağlamı).
 */
export function PlaylistOlusturucu({
  turler,
  sanatcilar,
  spotifyBagli,
}: {
  turler: CreateOption[]
  sanatcilar: CreateOption[]
  spotifyBagli: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useT()
  const [pending, startTransition] = useTransition()

  const bugun = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const birYilOnce = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const [from, setFrom] = useState(birYilOnce)
  const [to, setTo] = useState(bugun)
  const [secilenTurler, setSecilenTurler] = useState<string[]>([])
  const [secilenSanatcilar, setSecilenSanatcilar] = useState<string[]>([])
  const [sayi, setSayi] = useState(50)
  /** Toggle AÇIK = süreye göre. Kapalı (varsayılan) = çalma sayısı. */
  const [sureyeGore, setSureyeGore] = useState(false)
  const [ad, setAd] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [kapak, setKapak] = useState<string | null>(null)
  const [kapakAdi, setKapakAdi] = useState<string | null>(null)
  const [kapakIsleniyor, setKapakIsleniyor] = useState(false)
  const [sonuc, setSonuc] = useState<PlaylistActionState>(null)

  const gecerli = from <= to && sayi >= 1 && sayi <= 500 && spotifyBagli

  async function kapakSec(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setKapakIsleniyor(true)
    try {
      // Reddetmek yerine otomatik küçült — Spotify'ın 256 KB sınırı
      // yükseltilemez (üçüncü taraf kısıtı), o yüzden dosyayı sınıra
      // sığacak şekilde biz sıkıştırıyoruz (bkz. client-image-compress.ts).
      const compressed = await compressCoverImage(file)
      setKapak(compressed)
      setKapakAdi(file.name)
    } catch {
      toast('error', t('playlists.creator.imageErrorToast'))
    } finally {
      setKapakIsleniyor(false)
      e.target.value = ''
    }
  }

  function olustur() {
    if (!gecerli) return
    startTransition(async () => {
      const res = await fetch('/api/playlists/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          count: sayi,
          platforms: ['spotify'],
          name: ad.trim() || undefined,
          description: aciklama.trim() || undefined,
          genres: secilenTurler.length ? secilenTurler : undefined,
          artists: secilenSanatcilar.length ? secilenSanatcilar : undefined,
          sortBy: sureyeGore ? 'duration' : 'plays',
          coverImage: kapak ?? undefined,
        }),
      })
      const data = await res.json().catch(() => null)

      const outcome = data?.result?.outcomes?.[0]
      const basarili = res.ok && outcome && outcome.status !== 'failed'

      if (!basarili) {
        setSonuc('error')
        toast('error', data?.error ?? t('playlists.creator.createErrorToast'))
        setTimeout(() => setSonuc(null), 1600)
        return
      }

      setSonuc('success')
      // Kısa bir onay anından sonra doğrudan yeni playlist'in detay sayfasına
      // git (Sahip: "playlists sayfasından direkt o playlistin detay
      // sayfasına yönlendirmeli bizi ki görelim"). DB senkronu başarısız
      // olduysa (nadiren) playlist listesine düş — hâlâ makul bir sonuç.
      setTimeout(() => {
        router.push(outcome.playlistDbId ? `/playlists/${outcome.playlistDbId}` : '/playlists')
        router.refresh()
      }, 900)
    })
  }

  return (
    <div className={styles.wrap}>
      {/* ── Kimlik & Canlı Playlist Önizleme Vitrini ── */}
      <section className={styles.identity} aria-label={t('playlists.creator.identityAriaLabel')}>
        <label className={styles.coverPicker}>
          {kapak ? (
            /* Kullanıcının kendi dosyası, data: URI — next/image gereksiz. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kapak} alt="" className={styles.coverPreview} />
          ) : (
            <span className={styles.coverPlaceholder} aria-hidden>
              <ImageIcon size={48} strokeWidth={1.25} />
            </span>
          )}
          <span className={styles.coverOverlay}>
            <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
            <span>
              {kapakIsleniyor
                ? t('playlists.creator.coverProcessing')
                : kapak
                  ? t('playlists.creator.coverChangePhoto')
                  : t('playlists.creator.coverChoosePhoto')}
            </span>
          </span>
          <input name="playlistCover"
            type="file"
            accept="image/jpeg,image/png"
            onChange={kapakSec}
            disabled={kapakIsleniyor}
            className={styles.coverInput}
          />
        </label>
        <p className={styles.coverHint}>
          {kapakAdi ?? t('playlists.creator.coverHintDefault')}
        </p>

        <label htmlFor="pl-ad" className={styles.srOnly}>{t('playlists.creator.nameLabel')}</label>
        <input
          id="pl-ad"
          type="text"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          maxLength={120}
          placeholder={t('playlists.creator.namePlaceholder')}
          className={styles.titleInput}
        />
        <p className={styles.nameHint}>{t('playlists.creator.nameHint')}</p>

        <label htmlFor="pl-aciklama" className={styles.srOnly}>{t('playlists.creator.descriptionLabel')}</label>
        <textarea
          id="pl-aciklama"
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder={t('playlists.creator.descriptionPlaceholder')}
          className={styles.textArea}
        />

        {/* Canlı Önizleme Bento Kartı */}
        <div className={styles.previewCard} aria-hidden="true">
          <div className={styles.previewCardHeader}>
            <span className={styles.previewBadge}>Canlı Önizleme</span>
            <span className={styles.previewDuration}>
              ~{Math.round((sayi * 3.4))} dk
            </span>
          </div>
          <div className={styles.previewStats}>
            <div className={styles.previewStatItem}>
              <span className={styles.previewStatVal}>{sayi}</span>
              <span className={styles.previewStatLabel}>Şarkı</span>
            </div>
            <div className={styles.previewStatDivider} />
            <div className={styles.previewStatItem}>
              <span className={styles.previewStatVal}>{sureyeGore ? 'Süre' : 'Çalma'}</span>
              <span className={styles.previewStatLabel}>Sıralama</span>
            </div>
            <div className={styles.previewStatDivider} />
            <div className={styles.previewStatItem}>
              <span className={styles.previewStatVal}>{secilenTurler.length + secilenSanatcilar.length}</span>
              <span className={styles.previewStatLabel}>Filtre</span>
            </div>
          </div>
          {(secilenTurler.length > 0 || secilenSanatcilar.length > 0) && (
            <div className={styles.previewTags}>
              {secilenTurler.slice(0, 3).map((tur) => (
                <span key={tur} className={styles.previewTagPill}>
                  {tur}
                </span>
              ))}
              {secilenSanatcilar.slice(0, 2).map((sanatci) => (
                <span key={sanatci} className={styles.previewTagPill}>
                  {sanatci}
                </span>
              ))}
              {secilenTurler.length + secilenSanatcilar.length > 5 && (
                <span className={styles.previewTagMore}>
                  +{secilenTurler.length + secilenSanatcilar.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <div className={styles.filterCol}>
        {/* ── Neyi seçelim ── */}
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>{t('playlists.creator.whatToPick')}</h2>
          <p className={styles.groupHint}>
            {t('playlists.creator.whatToPickHint')}
          </p>

          <ZamanPaneli from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />

          <SecimPaneli
            label={t('playlists.creator.genre')}
            options={turler}
            selected={secilenTurler}
            onChange={setSecilenTurler}
            searchPlaceholder={t('playlists.creator.genreSearchPlaceholder')}
          />

          <SecimPaneli
            label={t('playlists.creator.artist')}
            options={sanatcilar}
            selected={secilenSanatcilar}
            onChange={setSecilenSanatcilar}
            searchPlaceholder={t('playlists.creator.artistSearchPlaceholder')}
          />
        </section>

        {/* ── Nasıl sıralansın ── */}
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>{t('playlists.creator.howToPick')}</h2>

          <div className={styles.row}>
            <label htmlFor="sarki-sayisi" className={styles.rowLabel}>
              {t('playlists.creator.trackCountLabel')}
            </label>
            <input
              id="sarki-sayisi"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={sayi}
              onChange={(e) => setSayi(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              className={styles.numberInput}
            />
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>
              {t('playlists.creator.sortByDuration')}
              <span className={styles.rowHint}>
                {sureyeGore
                  ? t('playlists.creator.sortByDurationOnHint')
                  : t('playlists.creator.sortByDurationOffHint')}
              </span>
            </span>
            <Toggle
              label={t('playlists.creator.sortByDuration')}
              checked={sureyeGore}
              onChange={(e) => setSureyeGore(e.target.checked)}
            />
          </div>
        </section>

        {/* ── Üret ── */}
        <div className={styles.footer}>
          {!spotifyBagli && (
            <p className={styles.warn}>
              {t('playlists.creator.connectFirst')}
            </p>
          )}
          <button
            type="button"
            className={styles.submit}
            onClick={olustur}
            disabled={!gecerli || pending || kapakIsleniyor}
          >
            {pending ? (
              <><Loader2 size={16} className={styles.spin} aria-hidden /> {t('playlists.creator.creating')}</>
            ) : (
              <><Sparkles size={16} strokeWidth={1.75} aria-hidden /> {t('playlists.creator.createButton')}</>
            )}
          </button>
        </div>

      </div>

      <PlaylistActionOverlay
        state={sonuc}
        successLabel={t('playlists.creator.successLabel')}
        errorLabel={t('playlists.creator.errorLabel')}
      />
    </div>
  )
}
