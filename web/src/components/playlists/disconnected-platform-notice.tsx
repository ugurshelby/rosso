'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { platformConfig } from '@/lib/platforms'
import { useT } from '@/lib/i18n/provider'
import type { Platform } from '@rosso/shared-types'
import styles from './playlists.module.css'

interface DisconnectedPlatformNoticeProps {
  /** Kütüphanede playlist'i olan ama bağlantısı aktif OLMAYAN platformlar. */
  platforms: Platform[]
}

/**
 * Bağlantısı kopmuş platformlar için TEK uyarı şeridi.
 *
 * Neden kart başına rozet değil (2026-08-01, Sahibin bug raporu):
 * Sorun tek — bir bağlantı koptu — ama eski tasarım her kartın köşesine bir
 * uyarı üçgeni basıyordu. 17 playlist = 17 alarm, hepsi aynı şeyi söylüyor.
 * Üstelik rozet `role="img"` idi: çözümü tarif ediyor ("Veri sayfasına git")
 * ama kendisi tıklanamıyordu. Şimdi tek şerit, tek mesaj, tıklanabilir çıkış.
 *
 * Renk `--color-error` — accent DEĞİL. Mor bu üründe "durum ve aksiyon"
 * demek (dashboard-design.md §3.1); bir hatayı accent rengiyle göstermek
 * kullanıcıya yanlış sinyal verir.
 */
export function DisconnectedPlatformNotice({ platforms }: DisconnectedPlatformNoticeProps) {
  const { t } = useT()
  if (platforms.length === 0) return null

  const names = platforms.map((p) => platformConfig[p]?.label ?? p)
  const label =
    names.length === 1
      ? t('playlists.disconnectedNotice.oneDisconnected', { name: names[0] })
      : t('playlists.disconnectedNotice.manyDisconnected', {
          names: names.slice(0, -1).join(', '),
          last: names[names.length - 1],
        })

  return (
    <div className={styles.disconnectNotice} role="status">
      <span className={styles.disconnectIcon} aria-hidden="true">
        <AlertTriangle size={16} strokeWidth={2} />
      </span>
      <p className={styles.disconnectText}>
        <strong>{label}.</strong> {t('playlists.disconnectedNotice.body')}
      </p>
      <Link href="/settings/platforms" className={styles.disconnectAction}>
        {t('playlists.disconnectedNotice.reconnect')}
      </Link>
    </div>
  )
}
