import Link from 'next/link'
import { PHASE_BANNERS } from '@/content/phases'
import type { PhaseState } from '@/lib/phase/read'
import styles from './phase-banner.module.css'

/**
 * P0.3 — Ara durum bantları.
 *
 * `processing`   : ZIP işleniyor
 * `partialPhase4`: iki dosyadan biri var, diğeri yok → Faz 4 açılmadı
 *
 * Panel değil, ince bilgi şeridi. Sessiz kalmak yerine kullanıcıya durumu
 * söyler (plan §P0.3 — "veri yoksa boş kart değil, açıklama").
 */
export function PhaseBanner({ state }: { state: PhaseState }) {
  const kind = state.processing ? 'processing' : state.partialPhase4 ? 'partialPhase4' : null
  if (!kind) return null

  const b = PHASE_BANNERS[kind]
  const href = 'href' in b ? b.href : undefined
  const cta = 'cta' in b ? b.cta : undefined

  return (
    <aside className={styles.banner} role="status">
      <div className={styles.text}>
        <p className={styles.title}>{b.title}</p>
        <p className={styles.body}>{b.body}</p>
      </div>
      {href && cta && (
        <Link href={href} className={styles.cta}>
          {cta}
        </Link>
      )}
    </aside>
  )
}
