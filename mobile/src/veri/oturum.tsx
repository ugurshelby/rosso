import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onbellegiTemizle } from './sorgu'
import { supabase } from './supabase'

export type OturumDurumu =
  | { durum: 'kurulum-eksik' }
  | { durum: 'yukleniyor' }
  | { durum: 'yok' }
  | { durum: 'var'; oturum: Session; kullaniciId: string }

const OturumBaglami = createContext<OturumDurumu>({ durum: 'yukleniyor' })

/**
 * Tek oturum dinleyicisi (kökte). İlk değer SecureStore'dan okunur, ağ beklemez;
 * çıkışta ve hesap değişince önbellek temizlenir — başka kullanıcının verisi görünmez.
 */
export function OturumSaglayici({ children }: { children: ReactNode }) {
  const istemci = supabase()
  const [durum, setDurum] = useState<OturumDurumu>(istemci ? { durum: 'yukleniyor' } : { durum: 'kurulum-eksik' })

  useEffect(() => {
    if (!istemci) return
    let sonKullanici: string | null | undefined
    const uygula = (oturum: Session | null) => {
      const id = oturum?.user.id ?? null
      if (sonKullanici !== undefined && sonKullanici !== id) void onbellegiTemizle()
      sonKullanici = id
      setDurum(oturum && id ? { durum: 'var', oturum, kullaniciId: id } : { durum: 'yok' })
    }
    void istemci.auth.getSession().then(({ data }) => uygula(data.session))
    const { data } = istemci.auth.onAuthStateChange((_olay, oturum) => uygula(oturum))
    return () => data.subscription.unsubscribe()
  }, [istemci])

  return <OturumBaglami.Provider value={durum}>{children}</OturumBaglami.Provider>
}

export const useOturum = () => useContext(OturumBaglami)
