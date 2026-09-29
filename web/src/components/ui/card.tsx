import { cn } from '@/lib/cn'
import styles from './card.module.css'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(styles.card, interactive && styles.interactive, className)}
      {...props}
    />
  )
}

export interface StatCardProps {
  value: React.ReactNode
  label: string
  className?: string
}

/** Recap stat bloğu — büyük sayı + uppercase label (design.md §8). */
export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <div className={cn(styles.card, styles.stat, className)}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
