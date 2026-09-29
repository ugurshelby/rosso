'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/lib/i18n/provider'

const STORAGE_KEY = 'rosso_taste_l3_seen'

interface L3LevelUpToastProps {
  hasL3: boolean
}

/**
 * §1.14-F: L3 (Account Data/Technical Log ZIP) işlendiğinde bir kez
 * "Kimliğin derinleşti" toast'ı gösterir.
 *
 * Görsel çıktısı yok — yalnız efekt. `IdentityHero` bilinçli olarak server
 * component (PERF-3b, hydration bundle'ından çıkarıldı); bu iş için ayrı,
 * izole bir client bileşen daha doğru — ana hero'yu client'a geri çekmez.
 *
 * Mekanizma: `hasL3` sunucudan gelen ANLIK durum, geçmiş bir "değişim
 * olayı" değil — DB'de "L3 az önce işlendi" diye ayrı bir sinyal yok.
 * `localStorage`'da "bu tarayıcıda L3 daha önce görüldü mü" izi tutulur;
 * hiç görülmediyse VE şu an true'ysa toast tetiklenir, sonra iz yazılır.
 * Tarayıcı/cihaz değişirse toast bir kez daha görülebilir — kabul
 * edilebilir (kritik olmayan bir kutlama, veri kaybı riski yok).
 */
export function L3LevelUpToast({ hasL3 }: L3LevelUpToastProps) {
  const { toast } = useToast()
  const { t } = useT()

  useEffect(() => {
    if (!hasL3) return
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // localStorage kapalıysa (gizli mod vb.) sessizce atla — toast görmemek
      // kritik değil.
      return
    }
    toast('success', t('taste.l3Toast.message'))
  }, [hasL3, toast, t])

  return null
}
