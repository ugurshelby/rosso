import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { kose, renk } from '@/tema'

export type KapakBoyu = 'satir' | 'kucuk' | 'kart' | 'buyuk'

const OLCU: Record<KapakBoyu, { boyut: number; kose: number }> = {
  satir: { boyut: 48, kose: kose.kapakSatir },
  kucuk: { boyut: 64, kose: kose.kapak },
  kart: { boyut: 148, kose: kose.kapak },
  buyuk: { boyut: 240, kose: kose.kapak },
}

export interface KapakProps {
  uri?: string | null
  boy?: KapakBoyu
  /** Sanatçı: daire (§5). */
  daire?: boolean
  /** Listelerde görünüm geri dönüşümü için (FlashList). */
  geriDonusumAnahtari?: string
  erisimEtiketi?: string
  style?: StyleProp<ViewStyle>
}

/** Kapak: gölgenin tek yeri (§3, satırda yok), yer tutucu `yuzey2`, kısa çapraz geçiş. */
export function Kapak({ uri, boy = 'kart', daire, geriDonusumAnahtari, erisimEtiketi, style }: KapakProps) {
  const o = OLCU[boy]
  const yaricap = daire ? o.boyut / 2 : o.kose
  return (
    <View
      style={[
        { width: o.boyut, height: o.boyut, borderRadius: yaricap, backgroundColor: renk.yuzey2 },
        boy !== 'satir' && {
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: o.boyut, height: o.boyut, borderRadius: yaricap }}
          contentFit="cover"
          transition={120}
          recyclingKey={geriDonusumAnahtari}
          cachePolicy="memory-disk"
          accessibilityLabel={erisimEtiketi}
          accessible={!!erisimEtiketi}
        />
      ) : null}
    </View>
  )
}
