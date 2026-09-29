import type { Metadata } from 'next'
import { RegisterForm } from './register-form'
import { AuthShell } from '../auth-shell'
import { ProviderButtons } from '@/components/auth/provider-buttons'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Sign up',
}

export default async function RegisterPage() {
  const { t } = await getT()

  return (
    <AuthShell
      eyebrow={t('auth.register.showcase.eyebrow')}
      title={t('auth.register.showcase.title')}
      feature={t('auth.register.showcase.feature')}
      footer={t('auth.register.showcase.footer')}
      coverSrc="/vibe-cards/synthwave-romantic.webp"
    >
      <RegisterForm />
      <ProviderButtons />
    </AuthShell>
  )
}
