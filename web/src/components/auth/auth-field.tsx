'use client'

import { useState, type ReactNode } from 'react'
import { AtSign, Eye, EyeOff, Lock, User } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import styles from '@/app/(auth)/auth.module.css'

/**
 * Kimlik ekranlarının ORTAK alan bileşeni — FAZ KİMLİK-V2.1 (2026-08-14).
 *
 * ─── Neden tek bileşen ──────────────────────────────────────────────────
 * Sahibin talimatı: *"tüm giriş kayıt ekranlarını bir standarda
 * bağlamamız lazım."* Ölçüldü (2026-08-14): dört formda (login · register ·
 * forgot-password · update-password) e-posta alanı **dört kez ayrı ayrı**
 * yazılmıştı. Aynı alan dört yerde yaşayınca biri değişip diğerleri
 * geride kalıyor — nitekim ikon yalnız şifre alanında vardı.
 *
 * `apple-design` §16.4 (Familiarity): *"aynı görünen şeyler aynı
 * davranmalı ve aynı yerde olmalı."*
 *
 * ─── İkon neden alanın İÇİNDE ───────────────────────────────────────────
 * Sahip şablondaki ikonlu alanları beğendi. İşlevsel gerekçesi de var:
 * ikon alanın ne beklediğini etikete bakmadan söyler (§16.6 — bağlam
 * eklemek bazen sadeleştirir) ve dört ekranda aynı dili kurar.
 */

type FieldIcon = 'email' | 'password' | 'name'

const ICONS: Record<FieldIcon, ReactNode> = {
  email: <AtSign size={18} aria-hidden />,
  password: <Lock size={18} aria-hidden />,
  name: <User size={18} aria-hidden />,
}

interface AuthFieldProps {
  id: string
  name?: string
  label: string
  icon: FieldIcon
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email'
  autoComplete?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  /** Klavyede "İleri"ye basınca odaklanacak alan. */
  onSubmitNext?: () => void
}

export function AuthField({
  id,
  name,
  label,
  icon,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  required = true,
  disabled,
}: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {/*
        Kap `:focus-within` ile halkalanıyor — ikon da odak halkasının
        içinde kalsın diye. Halka input'un kendisinde olsaydı ikon
        dışarıda kalır, alan iki parçaya bölünmüş görünürdü.
      */}
      <div className={styles.inputShell}>
        <span className={styles.inputIcon} aria-hidden>
          {ICONS[icon]}
        </span>
        <input
          id={id}
          name={name ?? id}
          className={styles.inputBare}
          type={type}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

interface AuthPasswordFieldProps {
  id: string
  name?: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Şifre alanı — kilit ikonu + göz düğmesi.
 *
 * ⚠ Göz düğmesi `type="button"`: varsayılan `submit` olsaydı şifreyi
 * görmek için basmak formu gönderirdi. (Eski `password-field.tsx`'te de
 * böyleydi, korundu.)
 */
export function AuthPasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  required = true,
  disabled,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const { t } = useT()

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputShell}>
        <span className={styles.inputIcon} aria-hidden>
          {ICONS.password}
        </span>
        <input
          id={id}
          name={name ?? id}
          className={styles.inputBare}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={styles.inputAction}
          aria-pressed={visible}
          aria-label={visible ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </div>
  )
}

/**
 * "Beni hatırla" + "Şifremi unuttum" satırı.
 *
 * ─── "Beni hatırla" gerçekte ne yapıyor ─────────────────────────────────
 * ⚠ Süslemek için konmadı; işlevi var ve şablondan farklı. Supabase
 * oturumu **varsayılan olarak kalıcıdır** (localStorage). Kutu işaretsizken
 * oturum `sessionStorage`'a alınır — sekme kapanınca çıkış yapılır.
 * Ortak/paylaşılan bilgisayarlar için gerçek bir güvenlik farkı.
 *
 * Bu yüzden varsayılan **işaretli**: kullanıcıların çoğu kendi cihazında
 * ve mevcut davranış zaten kalıcıydı; varsayılanı değiştirmek herkesi
 * habersiz oturumdan atardı (§16.4 tanıdıklık, §16.2 agency).
 */
export function RememberRow({
  checked,
  onChange,
  forgotHref,
  rememberLabel,
  forgotLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  forgotHref: string
  rememberLabel?: string
  forgotLabel?: string
}) {
  const { t } = useT()
  return (
    <div className={styles.rememberRow}>
      <label className={styles.remember} htmlFor="remember-me">
        <input
          id="remember-me"
          type="checkbox"
          className={styles.checkbox}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{rememberLabel ?? t('auth.login.rememberMe')}</span>
      </label>
      <a className={styles.link} href={forgotHref}>
        {forgotLabel ?? t('auth.login.forgotPassword')}
      </a>
    </div>
  )
}
