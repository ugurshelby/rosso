import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'
import { AuthShell } from '../auth-shell'
import { ProviderButtons } from '@/components/auth/provider-buttons'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage() {
  const { t } = await getT()

  return (
    <AuthShell
      eyebrow={t('auth.login.showcase.eyebrow')}
      title={t('auth.login.showcase.title')}
      feature={t('auth.login.showcase.feature')}
      footer={t('auth.login.showcase.footer')}
      coverSrc="/vibe-cards/statue-rainbow-prism.webp"
    >
      <Suspense>
        <LoginForm />
      </Suspense>
      {/*
        Sağlayıcı düğmeleri form DIŞINDA: `<a>` etiketleri bir `<form>`
        içinde de çalışırdı ama form gönderimiyle karışan bir yapı
        kurmamak daha temiz. Ayrıca bu bir server component — bayrak
        kapalıysa hiç render edilmez, bundle'a girmez.
      */}
      <ProviderButtons />
    </AuthShell>
  )
}
