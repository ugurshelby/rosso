'use client'

import { useState, useTransition } from 'react'
import { davetEkle, davetKaldir } from '@/lib/auth/davet-action'
import { useT } from '@/lib/i18n/provider'
import styles from './davet-listesi.module.css'

interface Props {
  davetliler: string[]
}

/**
 * Sahibin arkadaş daveti (yalnız sahip görür). Sonuç HER durumda yazılır (sessiz hata yok);
 * ekleme/kaldırma sonrası liste sunucudan (revalidatePath) yenilenir.
 */
export function DavetListesi({ davetliler }: Props) {
  const { t } = useT()
  const [eposta, setEposta] = useState('')
  const [mesaj, setMesaj] = useState<{ tur: 'ok' | 'hata'; metin: string } | null>(null)
  const [bekliyor, basla] = useTransition()

  function ekle(e: React.FormEvent) {
    e.preventDefault()
    if (bekliyor) return
    basla(async () => {
      const sonuc = await davetEkle(eposta)
      if (sonuc.ok) {
        setEposta('')
        setMesaj({ tur: 'ok', metin: t('settings.invite.added') })
      } else {
        setMesaj({ tur: 'hata', metin: t(`settings.invite.errors.${sonuc.kod}`) })
      }
    })
  }

  function kaldir(adres: string) {
    if (bekliyor) return
    basla(async () => {
      const sonuc = await davetKaldir(adres)
      setMesaj(
        sonuc.ok
          ? { tur: 'ok', metin: t('settings.invite.removed') }
          : { tur: 'hata', metin: t(`settings.invite.errors.${sonuc.kod}`) },
      )
    })
  }

  return (
    <div className={styles.kutu}>
      <p className={styles.aciklama}>
        {t('settings.invite.help')} <strong>{t('settings.invite.spotifyPath')}</strong>
      </p>

      <form className={styles.satir} onSubmit={ekle}>
        <label className={styles.gizli} htmlFor="davet-eposta">
          {t('settings.invite.label')}
        </label>
        <input
          id="davet-eposta"
          className={styles.girdi}
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder={t('settings.invite.placeholder')}
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          required
          disabled={bekliyor}
          aria-invalid={mesaj?.tur === 'hata' || undefined}
        />
        <button type="submit" className={styles.dugme} disabled={bekliyor || eposta.trim().length === 0}>
          {bekliyor ? t('settings.invite.saving') : t('settings.invite.add')}
        </button>
      </form>

      {mesaj && (
        <p className={mesaj.tur === 'hata' ? styles.hata : styles.basarili} role={mesaj.tur === 'hata' ? 'alert' : 'status'}>
          {mesaj.metin}
        </p>
      )}

      {davetliler.length === 0 ? (
        <p className={styles.bos}>{t('settings.invite.empty')}</p>
      ) : (
        <ul className={styles.liste}>
          {davetliler.map((adres) => (
            <li key={adres} className={styles.oge}>
              <span className={styles.adres}>{adres}</span>
              <button
                type="button"
                className={styles.kaldir}
                onClick={() => kaldir(adres)}
                disabled={bekliyor}
                aria-label={t('settings.invite.removeAria', { email: adres })}
              >
                {t('settings.invite.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
