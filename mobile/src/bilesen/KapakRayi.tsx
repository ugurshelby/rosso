import { FlashList } from '@shopify/flash-list'
import { StyleSheet, View } from 'react-native'
import { bosluk, KENAR } from '@/tema'
import { Basilabilir } from './Basilabilir'
import { Kapak } from './Kapak'
import { Metin } from './Metin'

export interface RayOgesi {
  anahtar: string
  baslik: string
  altBaslik?: string
  kapakUri?: string | null
  daire?: boolean
}

const KAPAK = 148

/**
 * Yatay kapak rayı (§9.1 "son dinlenen"): 148 dp kapak, altında iki satır.
 * FlashList yatay: yalnız görünen kartlar çizilir; kenar boşluğu 16 içerikte.
 */
export function KapakRayi({ ogeler, bas }: { ogeler: RayOgesi[]; bas?: (o: RayOgesi) => void }) {
  return (
    <FlashList
      horizontal
      data={ogeler}
      keyExtractor={(o) => o.anahtar}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: KENAR }}
      ItemSeparatorComponent={() => <View style={{ width: bosluk[3] }} />}
      renderItem={({ item }) => (
        <Basilabilir
          onPress={bas ? () => bas(item) : undefined}
          disabled={!bas}
          accessibilityLabel={item.altBaslik ? `${item.baslik}, ${item.altBaslik}` : item.baslik}
          style={stil.kart}
        >
          <Kapak uri={item.kapakUri} boy="kart" daire={item.daire} geriDonusumAnahtari={item.anahtar} />
          <Metin rol="govde" numberOfLines={1} style={stil.metin}>
            {item.baslik}
          </Metin>
          {item.altBaslik ? (
            <Metin rol="ustVeri" renkAdi="sonuk" numberOfLines={1} style={stil.metin}>
              {item.altBaslik}
            </Metin>
          ) : null}
        </Basilabilir>
      )}
    />
  )
}

const stil = StyleSheet.create({
  kart: { width: KAPAK },
  metin: { marginTop: bosluk[1], width: KAPAK },
})
