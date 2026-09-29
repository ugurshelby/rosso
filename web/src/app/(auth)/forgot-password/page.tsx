import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'
import { AuthShell } from '../auth-shell'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Password reset',
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { t } = await getT()
  const { error } = await searchParams
  return (
    <AuthShell
      eyebrow={t('auth.forgotPassword.showcase.eyebrow')}
      title={t('auth.forgotPassword.showcase.title')}
      feature={t('auth.forgotPassword.showcase.feature')}
      footer={t('auth.forgotPassword.showcase.footer')}
      coverSrc="/vibe-cards/cloud-spiral-staircase.webp"
    >
      <ForgotPasswordForm linkInvalid={error === 'link_invalid'} />
    </AuthShell>
  )
}
