'use client'

import { useEffect } from 'react'

const BODY_CLASS = 'marketing-route-active'

/**
 * Marketing katmanı mount olduğunda body'ye sabit landing paletini uygular.
 * html.palette-* ayarlar temasından sızmayı keser (özellikle body zemin rengi).
 */
export function MarketingThemeScope() {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS)
    return () => {
      document.body.classList.remove(BODY_CLASS)
    }
  }, [])

  return null
}
