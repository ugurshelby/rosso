'use client'

import { useEffect, useState } from 'react'
import {
  CEREZ_OLAYI,
  cerezKarariniOku,
  cerezKarariniYaz,
  type CerezKarari,
} from '@/lib/privacy/cerez-onay'

/**
 * Gizlilik sayfasındaki çerez/ölçüm tercih kutusu (2026-09-22).
 *
 * Neden var: rıza GERİ ALINABİLİR olmalı (KVKK m.7 · GDPR Art. 7/3). Banner
 * bir kez kapandıktan sonra kullanıcının kararını değiştirebileceği HİÇBİR
 * yer yoktu — "kabul et"e basan kişi hapsolmuş oluyordu.
 *
 * Kutu mevcut kararı da GÖSTERİR: rızayı geri almak, verildiğini görmekle
 * başlar.
 */
export function CerezTercihi({
  metin,
  className,
  durumClassName,
  butonlarClassName,
  butonClassName,
  birincilButonClassName,
}: {
  metin: {
    durumEtiketi: string
    durumKabul: string
    durumRet: string
    durumKararsiz: string
    kabulEt: string
    reddet: string
  }
  className?: string
  durumClassName?: string
  butonlarClassName?: string
  butonClassName?: string
  birincilButonClassName?: string
}) {
  const [karar, setKarar] = useState<CerezKarari | null>(null)
  const [hazir, setHazir] = useState(false)

  useEffect(() => {
    const uygula = () => {
      setKarar(cerezKarariniOku())
      setHazir(true)
    }
    uygula()
    window.addEventListener(CEREZ_OLAYI, uygula)
    window.addEventListener('storage', uygula)
    return () => {
      window.removeEventListener(CEREZ_OLAYI, uygula)
      window.removeEventListener('storage', uygula)
    }
  }, [])

  function sec(yeni: CerezKarari) {
    cerezKarariniYaz(yeni)
    setKarar(yeni)
  }

  const durum =
    karar === 'kabul' ? metin.durumKabul
    : karar === 'ret' ? metin.durumRet
    : metin.durumKararsiz

  return (
    <div className={className}>
      {/* Sunucuda karar okunamaz; `hazir` olana kadar durum yazılmaz —
          yoksa herkese "henüz seçmedin" yazıp yanlış bilgi verirdik. */}
      <p className={durumClassName} aria-live="polite">
        {metin.durumEtiketi} <strong>{hazir ? durum : '…'}</strong>
      </p>
      <div className={butonlarClassName}>
        <button
          type="button"
          onClick={() => sec('kabul')}
          disabled={karar === 'kabul'}
          className={birincilButonClassName}
        >
          {metin.kabulEt}
        </button>
        <button
          type="button"
          onClick={() => sec('ret')}
          disabled={karar === 'ret'}
          className={butonClassName}
        >
          {metin.reddet}
        </button>
      </div>
    </div>
  )
}
