'use client'

import {
  ExternalLink,
  Check,
  Clock,
  Mail,
  UploadCloud,
  Lock,
  Radio,
} from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import styles from './spotify-zip-guide.module.css'

export const SPOTIFY_PRIVACY_URL = 'https://www.spotify.com/account/privacy/'

export function SpotifyZipGuide() {
  const { t } = useT()
  return (
    <div className={styles.container}>
      <div className={styles.windowCard}>
        {/* Pencere Üst Çubuğu */}
        <div className={styles.windowHeader}>
          <div className={styles.windowMeta}>
            <span className={styles.spotifyBrandIcon} aria-hidden>
              <Radio size={16} />
            </span>
            <div className={styles.windowTitle}>
              <span>{t('data.zipGuide.windowTitle')}</span>
              <span className={styles.windowBreadcrumb}>{t('data.zipGuide.windowBreadcrumb')}</span>
            </div>
          </div>

          <a
            href={SPOTIFY_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLinkBtn}
          >
            <span>{t('data.zipGuide.privacyLinkLabel')}</span>
            <ExternalLink size={12} aria-hidden />
          </a>
        </div>

        {/* Gövde */}
        <div className={styles.windowBody}>
          <div className={styles.introSection}>
            <h3 className={styles.introTitle}>{t('data.zipGuide.introTitle')}</h3>
            <p className={styles.introDesc}>
              {t('data.zipGuide.introDesc')}
            </p>
          </div>

          {/* 3 Veri Paketi Mockup'ı */}
          <div className={styles.packagesGrid}>
            {/* Paket 1: Hesap verileri (önerilir) */}
            <div className={`${styles.packageCard} ${styles.packageCardRecommended}`}>
              <div className={styles.packageHeader}>
                <div
                  className={`${styles.packageRadioIcon} ${styles.packageRadioIconRecommended}`}
                  aria-hidden
                >
                  <Check size={12} strokeWidth={3} />
                </div>
                <div className={styles.packageTitleGroup}>
                  <span className={styles.packageTitle}>{t('data.zipGuide.packages.account.title')}</span>
                  <span className={`${styles.packageTag} ${styles.packageTagSoft}`}>
                    {t('data.zipGuide.packages.account.tag')}
                  </span>
                </div>
              </div>
              <p className={styles.packageDesc}>
                {t('data.zipGuide.packages.account.desc')}
              </p>
              <div className={styles.packageScope}>
                <span>{t('data.zipGuide.packages.account.scope')}</span>
              </div>
            </div>

            {/* Paket 2: Ayrıntılı çevrimiçi dinleme geçmişi (zorunlu) */}
            <div className={`${styles.packageCard} ${styles.packageCardActive}`}>
              <div className={styles.packageHeader}>
                <div
                  className={`${styles.packageRadioIcon} ${styles.packageRadioIconActive}`}
                  aria-hidden
                >
                  <Check size={12} strokeWidth={3} />
                </div>
                <div className={styles.packageTitleGroup}>
                  <span className={styles.packageTitle}>
                    {t('data.zipGuide.packages.streaming.title')}
                  </span>
                  <span className={styles.packageTag}>{t('data.zipGuide.packages.streaming.tag')}</span>
                </div>
              </div>
              <p className={styles.packageDesc}>
                {t('data.zipGuide.packages.streaming.desc')}
              </p>
              <div className={styles.packageScope} style={{ color: '#1ed760' }}>
                <span>{t('data.zipGuide.packages.streaming.scope')}</span>
              </div>
            </div>

            {/* Paket 3: Teknik günlük verileri (önerilir) */}
            <div className={`${styles.packageCard} ${styles.packageCardRecommended}`}>
              <div className={styles.packageHeader}>
                <div
                  className={`${styles.packageRadioIcon} ${styles.packageRadioIconRecommended}`}
                  aria-hidden
                >
                  <Check size={12} strokeWidth={3} />
                </div>
                <div className={styles.packageTitleGroup}>
                  <span className={styles.packageTitle}>{t('data.zipGuide.packages.technical.title')}</span>
                  <span className={`${styles.packageTag} ${styles.packageTagSoft}`}>
                    {t('data.zipGuide.packages.technical.tag')}
                  </span>
                </div>
              </div>
              <p className={styles.packageDesc}>
                {t('data.zipGuide.packages.technical.desc')}
              </p>
              <div className={styles.packageScope}>
                <span>{t('data.zipGuide.packages.technical.scope')}</span>
              </div>
            </div>
          </div>

          {/* Dürüst Süre ve Beklenti Kılavuzu (Plan §5.3) */}
          <div className={styles.expectationsGrid}>
            <div className={styles.expectationCard}>
              <div className={styles.expectationHeader}>
                <Clock size={15} className={styles.expectationIcon} aria-hidden />
                <span>{t('data.zipGuide.expectations.timeTitle')}</span>
              </div>
              <p className={styles.expectationText}>
                {t('data.zipGuide.expectations.timeDesc')}
              </p>
            </div>

            <div className={styles.expectationCard}>
              <div className={styles.expectationHeader}>
                <Lock size={15} className={styles.expectationIcon} aria-hidden />
                <span>{t('data.zipGuide.expectations.noApiTitle')}</span>
              </div>
              <p className={styles.expectationText}>
                {t('data.zipGuide.expectations.noApiDesc')}
              </p>
            </div>

            <div className={styles.expectationCard}>
              <div className={styles.expectationHeader}>
                <Mail size={15} className={styles.expectationIcon} aria-hidden />
                <span>{t('data.zipGuide.expectations.emailTitle')}</span>
              </div>
              <p className={styles.expectationText}>
                {t('data.zipGuide.expectations.emailDesc')}
              </p>
            </div>

            <div className={styles.expectationCard}>
              <div className={styles.expectationHeader}>
                <UploadCloud size={15} className={styles.expectationIcon} aria-hidden />
                <span>{t('data.zipGuide.expectations.uploadTitle')}</span>
              </div>
              <p className={styles.expectationText}>
                {t('data.zipGuide.expectations.uploadDesc')}
              </p>
            </div>
          </div>

          {/* Alt Aksiyon Çubuğu */}
          <div className={styles.actionFooter}>
            <p className={styles.actionNote}>
              {t('data.zipGuide.actionNote')}
            </p>

            <a
              href={SPOTIFY_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.privacyCtaBtn}
            >
              <span>{t('data.zipGuide.goToPrivacyPage')}</span>
              <ExternalLink size={13} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
