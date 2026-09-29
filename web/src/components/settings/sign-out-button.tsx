'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import styles from './sign-out-button.module.css'

export function SignOutButton() {
  const router = useRouter()
  const { t } = useT()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={loading} className={styles.button}>
      <LogOut size={16} aria-hidden className={styles.icon} />
      <span className={styles.label}>
        {loading ? t('settings.signOut.loading') : t('settings.signOut.label')}
      </span>
    </button>
  )
}
