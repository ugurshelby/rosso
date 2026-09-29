// PERF-3b (2026-07-24): 'use client' KALDIRILDI — bileşen tamamen statik (props
// alıp JSX döner, hook/event/browser API yok). Parent taste/page.tsx server
// component; server'da render edilerek hydration bundle'ından çıkar.
//
// i18n (2026-09-27): aynı sebeple `useT()` YOK — çeviri, `t` sunucudan prop
// olarak geçirilir (parent zaten `getT()` çağırıyor).
import type { Translator } from '@/lib/i18n/translate'
import styles from './identity-hero.module.css'

export interface MusicalIdentity {
  name: string
  subtitle: string
  description: string
}

interface IdentityHeroProps {
  identity: MusicalIdentity | null
  dominantGenreColor: string
  t: Translator['t']
}

// HERO REVİZYONU (2026-07-30): Bu bölüm artık kendi kutusu/arka planı değil —
// ortak sahnenin (taste/page.tsx → .identityPlate) sol sütunu. Atmosfer
// (tür rengi + vibe kartı sanatının bulanık sızıntısı) sahne seviyesinde
// tek katman olarak uygulanıyor; `--identity-color` de aynı sahneden miras
// alınıyor (CSS custom property üst düğümden aşağı sızar) — burada tekrar
// set etmeye gerek yok, ama bileşen tek başına da kullanılabilsin diye prop
// korunuyor ve kendi üstünde de set ediliyor.
export function IdentityHero({ identity, dominantGenreColor, t }: IdentityHeroProps) {
  return (
    <section
      className={styles.hero}
      aria-label={t('taste.identity.eyebrow')}
      style={{ '--identity-color': dominantGenreColor } as React.CSSProperties}
    >
      <span className={styles.eyebrow}>{t('taste.identity.eyebrow')}</span>
      {identity ? (
        <>
          <h1 className={styles.name}>{identity.name}</h1>
          <span className={styles.subtitle}>{identity.subtitle}</span>
          <p className={styles.description}>{identity.description}</p>
        </>
      ) : (
        <p className={styles.unavailable}>
          {t('taste.identity.unavailable')}
        </p>
      )}
    </section>
  )
}
