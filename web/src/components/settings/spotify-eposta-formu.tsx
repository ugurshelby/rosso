'use client'

import { useState } from 'react'
import { spotifyEpostasiniKaydet } from '@/lib/spotify/eposta-action'
import { useT } from '@/lib/i18n/provider'
import styles from './spotify-eposta-formu.module.css'

/**
 * B17 — Allowlist sırasında bekleyen kullanıcıdan Spotify e-postasını alır.
 *
 * ⚠ Yalnız `status === 'pending'` VE e-posta henüz yokken gösterilir.
 * `/v1/me` çalışan kullanıcıda e-posta otomatik gelir; ona sormak gereksiz
 * sürtünmedir (planın kendi kuralı).
 *
 * Neden gerekli: Dev Mode'da allowlist dışı kullanıcıda `/v1/me`'nin kendisi
 * 403 veriyor — e-postayı öğrenmenin otomatik yolu kapalı. Ölçüldü: 3
 * kayıttan 2'sinde `spotify_email` NULL, biri sırada bekliyor.
 */
export function SpotifyEpostaFormu() {
  const { t } = useT()
  const [eposta, setEposta] = useState('')
  const [durum, setDurum] = useState<'bos' | 'gonderiliyor' | 'ok' | 'hata'>('bos')
  const [mesaj, setMesaj] = useState<string | null>(null)

  async function gonder(e: React.FormEvent) {
    e.preventDefault()
    if (durum === 'gonderiliyor') return

    setDurum('gonderiliyor')
    setMesaj(null)

    const sonuc = await spotifyEpostasiniKaydet(eposta)
    if (sonuc.ok) {
      setDurum('ok')
      setMesaj(t('settings.spotifyEmailForm.success'))
    } else {
      setDurum('hata')
      setMesaj(sonuc.hata)
    }
  }

  if (durum === 'ok') {
    return (
      <p className={styles.basarili} role="status">
        {mesaj}
      </p>
    )
  }

  return (
    <form className={styles.form} onSubmit={gonder}>
      <label className={styles.etiket} htmlFor="spotify-eposta">
        {t('settings.spotifyEmailForm.label')}
      </label>
      <p className={styles.yardim}>
        {t('settings.spotifyEmailForm.helpBefore')}{' '}
        <strong>{t('settings.spotifyEmailForm.settingsAccountPath')}</strong>
        {t('settings.spotifyEmailForm.helpAfter')}
      </p>

      <div className={styles.satir}>
        <input
          id="spotify-eposta"
          className={styles.girdi}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('settings.spotifyEmailForm.placeholder')}
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          required
          disabled={durum === 'gonderiliyor'}
          aria-describedby={mesaj ? 'spotify-eposta-mesaj' : undefined}
          aria-invalid={durum === 'hata' || undefined}
        />
        <button
          type="submit"
          className={styles.dugme}
          disabled={durum === 'gonderiliyor' || eposta.trim().length === 0}
        >
          {durum === 'gonderiliyor' ? t('settings.spotifyEmailForm.sending') : t('settings.spotifyEmailForm.send')}
        </button>
      </div>

      {/* Sessiz hata YOK: sonuç her durumda yazılır (yeni yüzey denetimi §3). */}
      {mesaj && (
        <p
          id="spotify-eposta-mesaj"
          className={durum === 'hata' ? styles.hata : styles.basarili}
          role={durum === 'hata' ? 'alert' : 'status'}
        >
          {mesaj}
        </p>
      )}
    </form>
  )
}
