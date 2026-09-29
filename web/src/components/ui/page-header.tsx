import styles from './page-header.module.css'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  )
}
