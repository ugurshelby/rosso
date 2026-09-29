'use client'

import { useState, useEffect } from 'react'
import { AcceptCookies } from '@/components/design/accept-cookies'
import { SOZLUK } from '@/lib/marketing/sozluk'
import { CEREZ_OLAYI, cerezKarariniOku, cerezKarariniYaz } from '@/lib/privacy/cerez-onay'
import { yerelYol } from '@/lib/marketing/dil'
import { useMarketingDil } from './use-marketing-dil'

export function CookiesBanner() {
  const [visible, setVisible] = useState(false)
  const { dil } = useMarketingDil()
  const t = SOZLUK[dil].cerez

  useEffect(() => {
    /*
     * 🔴 "Reddet" ARTIK GERÇEKTEN REDDEDİYOR (2026-09-22, KVKK denetimi).
     * Eskiden iki düğme de `dismiss()` çağırıyor, `'true'` yazıp banner'ı
     * kapatıyordu; ölçüm (`<Analytics />`) her hâlükârda yükleniyordu.
     * Karar artık `lib/privacy/cerez-onay.ts`te ve ölçümü fiilen açıp
     * kapatıyor. Gizlilik sayfasından kararı sıfırlayan kullanıcıda banner
     * yeniden çıksın diye olayı da dinliyoruz.
     */
    const uygula = () => setVisible(cerezKarariniOku() === null)
    uygula()
    window.addEventListener(CEREZ_OLAYI, uygula)
    return () => window.removeEventListener(CEREZ_OLAYI, uygula)
  }, [])

  if (!visible) return null

  return (
    <div
      className="rossoCookiesBanner"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
      aria-live="polite"
      role="dialog"
      aria-label={t.bildirimEtiketi}
    >
      {/*
        Animasyon SATIR İÇİ `style` yerine burada tanımlı olmalı (2026-09-17).
        Satır içi stil, CSS media query'siyle EZİLEMEZ — `animation` inline
        verildiğinde `prefers-reduced-motion: reduce` kuralı onu kapatamıyordu,
        yani kullanıcı işletim sisteminde "hareketi azalt" dese bile banner
        her koşulda kayarak giriyordu.
      */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .rossoCookiesBanner {
          animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        @media (prefers-reduced-motion: reduce) {
          .rossoCookiesBanner { animation: none; }
        }
      `}</style>
      <AcceptCookies
        onAccept={() => {
          cerezKarariniYaz('kabul')
          setVisible(false)
        }}
        onDecline={() => {
          cerezKarariniYaz('ret')
          setVisible(false)
        }}
        privacyPolicyHref={yerelYol(dil, '/privacy')}
        metin={t}
      />
    </div>
  )
}
