import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { DeleteAccount } from '@/components/settings/delete-account'
import { AccountSummary } from '@/components/settings/account-summary'
import { DataExportButton } from '@/components/settings/data-export-button'
import { resolveAvatarUrl } from '@/components/user-avatar'
import { PrivacyToggles } from '@/components/settings/privacy-toggles'
import { LanguageSwitch } from '@/components/settings/language-switch'
import { DavetListesi } from '@/components/settings/davet-listesi'
import { requireAuth } from '@/lib/auth'
import { davetleriListele, sahipMi } from '@/lib/auth/davet'
import { createClient } from '@/lib/supabase/server'
import { getLocale, getT } from '@/lib/i18n/server'
import { HelpCircle } from 'lucide-react'
import styles from './settings.module.css'

export default async function SettingsPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const { t } = await getT()

  const sahip = await sahipMi(user.email)
  const davetliler = sahip ? (await davetleriListele()).filter((s) => !s.sahip).map((s) => s.email) : []

  const [prefsResp, locale] = await Promise.all([
    supabase
      .from('user_preferences')
      .select('include_incognito, collaborative_sync')
      .eq('user_id', user.id)
      .single(),
    getLocale(),
  ])

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'U'

  const avatarUrl = resolveAvatarUrl(user.user_metadata)

  const preferences = prefsResp.data ?? {
    include_incognito: false,
    collaborative_sync: false,
  }

  return (
    <>
      <PageHeader title={t('settings.page.title')} subtitle={t('settings.page.subtitle')} />

      {/* Asimetrik bento (V2): Hesap sol tarafta iki satır boyunca uzun;
          sağda Tercihler + Dil (iki yarım kart, üst üste); altında Veri ve
          Yardım eşit yarım genişlikte bir satır. Platform bağlantıları
          kaldırıldı (2026-09-28) — zaten /data sayfasında, burada tekrardı. */}
      <div className={styles.bentoGrid}>

        {/* ── Hesap — sol, uzun: görünen ad · şifre · çıkış ── */}
        <div className={styles.bentoCard + ' ' + styles.bentoCardHalf + ' ' + styles.bentoCardTall}>
          <p className={styles.bentoEyebrow}>{t('settings.bento.account.eyebrow')}</p>
          <h2 className={styles.bentoTitle}>{t('settings.bento.account.title')}</h2>
          <div className={styles.bentoContent}>
            <AccountSummary
              avatarUrl={avatarUrl}
              displayName={displayName}
              email={user.email}
            />
          </div>
        </div>

        {/* ── Tercihler — sağ üst, geniş ── */}
        <div className={styles.bentoCard + ' ' + styles.bentoCardHalf}>
          <p className={styles.bentoEyebrow}>{t('settings.bento.listening.eyebrow')}</p>
          <h2 className={styles.bentoTitle}>{t('settings.bento.listening.title')}</h2>
          <div className={styles.bentoContent}>
            <PrivacyToggles
              includeIncognito={preferences.include_incognito}
              collaborativeSync={preferences.collaborative_sync}
            />
          </div>
        </div>

        {/* ── Dil — sağ, tercihlerin altında ── */}
        <div className={styles.bentoCard + ' ' + styles.bentoCardHalf}>
          <p className={styles.bentoEyebrow}>{t('settings.bento.interface.eyebrow')}</p>
          <h2 className={styles.bentoTitle}>{t('settings.bento.interface.title')}</h2>
          <div className={styles.bentoContent}>
            <LanguageSwitch locale={locale} />
          </div>
        </div>

        {/* ── Davet — yalnız sistem sahibi görür (kayıt kapısı: migration 0359) ── */}
        {sahip && (
          <div className={styles.bentoCard + ' ' + styles.bentoCardWide}>
            <p className={styles.bentoEyebrow}>{t('settings.invite.eyebrow')}</p>
            <h2 className={styles.bentoTitle}>{t('settings.invite.title')}</h2>
            <div className={styles.bentoContent}>
              <DavetListesi davetliler={davetliler} />
            </div>
          </div>
        )}

        {/* ── Veri & Bağlantılar → link kart (yarım genişlik) ── */}
        <Link href="/data" className={styles.bentoCardLink + ' ' + styles.bentoCardLinkWide}>
          <p className={styles.bentoEyebrow}>{t('settings.bento.data.eyebrow')}</p>
          <h2 className={styles.bentoTitle}>{t('settings.bento.data.title')}</h2>
          <p className={styles.bentoDesc}>
            {t('settings.bento.data.desc')}
          </p>
          <div className={styles.bentoArrow} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>

        {/* ── Yardım → link kart (yarım genişlik) ── */}
        <Link href="/help" className={styles.bentoCardLink + ' ' + styles.bentoCardLinkWide}>
          <p className={styles.bentoEyebrow}>{t('settings.bento.help.eyebrow')}</p>
          <h2 className={styles.bentoTitle}>{t('settings.bento.help.title')}</h2>
          <p className={styles.bentoDesc}>
            {t('settings.bento.help.desc')}
          </p>
          <div className={styles.bentoArrow} aria-hidden="true">
            <HelpCircle size={20} strokeWidth={1.5} />
          </div>
        </Link>

      </div>

      {/* ── Aksiyonlar bölümü ── */}
      <div className={styles.actionsSection}>
        <p className={styles.actionsSectionLabel}>{t('settings.other')}</p>
        <div className={styles.actionsList}>

          <DataExportButton
            className={styles.actionItem}
            iconClassName={styles.actionIcon}
            labelClassName={styles.actionLabel}
          />

        </div>
      </div>

      {/* ── Tehlike bölgesi — en alt ── */}
      <div className={styles.dangerSection}>
        <p className={styles.dangerSectionLabel}>{t('settings.dangerZone.label')}</p>
        <div className={styles.dangerCard}>
          <div className={styles.dangerCardHeader}>
            <p className={styles.dangerCardTitle}>{t('settings.dangerZone.title')}</p>
            <p className={styles.dangerCardDesc}>
              {t('settings.dangerZone.desc')}
            </p>
          </div>
          <DeleteAccount />
        </div>
      </div>
    </>
  )
}
