import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { UserAvatar } from '@/components/user-avatar'
import { SignOutButton } from '@/components/settings/sign-out-button'
import { DisplayNameField } from '@/components/settings/display-name-field'
import { getT } from '@/lib/i18n/server'
import styles from './account-summary.module.css'

interface AccountSummaryProps {
  avatarUrl: string | null
  displayName: string
  email: string | undefined
}

/**
 * Hesap kartı — görünen ad (yerinde düzenleme) · şifre · çıkış.
 * Avatar yalnız Spotify/OAuth meta verisinden gelir; fotoğraf yükleme yok.
 */
export async function AccountSummary({ avatarUrl, displayName, email }: AccountSummaryProps) {
  const { t } = await getT()
  return (
    <div className={styles.wrap}>
      <div className={styles.heroBand}>
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- yalnız atmosfer/blur kaynağı, dekoratif
          <img src={avatarUrl} alt="" aria-hidden className={styles.heroBg} referrerPolicy="no-referrer" />
        )}
        <div className={styles.heroScrim} aria-hidden />
        <div className={styles.heroContent}>
          <UserAvatar
            src={avatarUrl}
            name={displayName}
            className={styles.avatar}
            imgClassName={styles.avatarImg}
            initialClassName={styles.avatarInitial}
          />
          <div className={styles.identityText}>
            <p className={styles.name}>{displayName}</p>
            <p className={styles.email}>{email}</p>
          </div>
        </div>
      </div>

      <div className={styles.fields}>
        <DisplayNameField initialName={displayName} />

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t('settings.accountSummary.password')}</span>
          <span className={styles.fieldValue} aria-hidden>
            ••••••••
          </span>
          <Link href="/update-password" className={styles.fieldAction}>
            {t('settings.accountSummary.update')}
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.divider} />
        <SignOutButton />
      </div>
    </div>
  )
}
