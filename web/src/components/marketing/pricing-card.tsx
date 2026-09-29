/*
 * ⚠ ÖLÜ KOD (ölçüldü 2026-08-22, refine turu 4) — hiçbir yerden import
 * edilmiyor. `/pricing` sayfası kendi düzenini kullanıyor.
 *
 * SİLİNMEDİ: dosya silme ayrı onay ister (CLAUDE.md §6). Sahip
 * onaylarsa bu dosya ve `pricing-card.module.css` kaldırılabilir.
 */
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import styles from './pricing-card.module.css'

export interface PricingPlan {
  name: string
  description: string
  price: string
  unit: string
  features: string[]
  cta: string
  featured?: boolean
}

export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div className={cn(styles.card, plan.featured && styles.cardFeatured)}>
      <div className={styles.head}>
        <h2 className={styles.planName}>{plan.name}</h2>
        <p className={styles.planDesc}>{plan.description}</p>
        <div className={styles.priceRow}>
          <span className={styles.price}>{plan.price}</span>
          <span className={styles.priceUnit}>{plan.unit}</span>
        </div>
      </div>

      <ul className={styles.features}>
        {plan.features.map((f) => (
          <li key={f} className={styles.featureRow}>
            <Check className={styles.featureCheck} size={16} aria-hidden />
            {f}
          </li>
        ))}
      </ul>

      <div className={styles.cta}>
        <Link
          href="/register"
          className={plan.featured ? styles.ctaSolid : styles.ctaOutline}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  )
}
