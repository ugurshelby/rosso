import type { Metadata } from 'next'
import { UpdatePasswordForm } from './update-password-form'
import { AuthShell } from '../auth-shell'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'New password',
}

export default async function UpdatePasswordPage() {
  const { t } = await getT()

  return (
    <AuthShell
      eyebrow={t('auth.updatePassword.showcase.eyebrow')}
      title={t('auth.updatePassword.showcase.title')}
      feature={t('auth.updatePassword.showcase.feature')}
      footer={t('auth.updatePassword.showcase.footer')}
      coverSrc="/vibe-cards/ringed-planets-moons-space.webp"
    >
      <UpdatePasswordForm />
    </AuthShell>
  )
}
