import { FlashList } from '@shopify/flash-list'
import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Basilabilir, Hap, Metin, SarkiSatiri, SEKME_YUKSEKLIGI, YerTutucu } from '@/bilesen'
import { bosluk, KENAR, kose, renk } from '@/tema'
import { DONEM_ETIKETI, gunlereBol, saatMetni, type Donem } from '@/veri/bicim'
import { useGecmis, type Dinleme } from '@/veri/gecmis'

const DONEMLER: Donem[] = ['bugun', '7gun', '30gun', 'yil']

/**
 * Geçmiş (PLAN 4.7d, spec §9.5): dönem hapları, günlere göre yapışkan başlık,
 * yoğun şarkı listesi (FlashList, sayfa sayfa). Aşağı çek yenile; liste sonuna
 * gelince bir sonraki 100 dinleme.
 */
export default function Gecmis() {
  const { top, bottom } = useSafeAreaInsets()
  const [donem, setDonem] = useState<Donem>('7gun')
  const sorgu = useGecmis(donem)
  const duz = useMemo(() => sorgu.data?.pages.flat() ?? [], [sorgu.data])
  const { ogeler, basliklar } = useMemo(() => gunlereBol(duz), [duz])

  const ust = (
    <View style={{ paddingTop: top + bosluk[6] }}>
      <Metin rol="buyukBaslik" accessibilityRole="header" style={stil.kenar}>
        Geçmiş
      </Metin>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stil.haplar}>
        {DONEMLER.map((d) => (
          <DonemHapi key={d} etiket={DONEM_ETIKETI[d]} secili={d === donem} bas={() => setDonem(d)} />
        ))}
      </ScrollView>
    </View>
  )

  if (sorgu.isPending) {
    return (
      <View style={stil.kap}>
        {ust}
        <View style={[stil.kenar, { gap: bosluk[2] }]}>
          {Array.from({ length: 8 }, (_, i) => (
            <YerTutucu key={i} yukseklik={56} />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={stil.kap}>
      <FlashList
        data={ogeler}
        keyExtractor={(o) => o.anahtar}
        getItemType={(o) => o.tur}
        stickyHeaderIndices={basliklar}
        ListHeaderComponent={ust}
        contentContainerStyle={{ paddingBottom: bottom + SEKME_YUKSEKLIGI + bosluk[8] }}
        onEndReached={() => {
          if (sorgu.hasNextPage && !sorgu.isFetchingNextPage) void sorgu.fetchNextPage()
        }}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={sorgu.isRefetching && !sorgu.isFetchingNextPage}
            onRefresh={() => void sorgu.refetch()}
            tintColor={renk.vurgu}
            colors={[renk.vurgu]}
            progressBackgroundColor={renk.yuzey2}
          />
        }
        ListEmptyComponent={
          <View style={[stil.kenar, { gap: bosluk[3], marginTop: bosluk[4] }]}>
            {sorgu.isError ? (
              <>
                <Metin rol="govde" renkAdi="sonuk">
                  Dinlemeler getirilemedi.
                </Metin>
                <Hap etiket="Tekrar dene" onPress={() => void sorgu.refetch()} style={{ alignSelf: 'flex-start' }} />
              </>
            ) : (
              <Metin rol="govde" renkAdi="sonuk">
                {`${DONEM_ETIKETI[donem]} içinde dinleme yok.`}
              </Metin>
            )}
          </View>
        }
        renderItem={({ item }) =>
          item.tur === 'baslik' ? (
            <View style={stil.gun}>
              <Metin rol="etiket" renkAdi="sonuk">
                {item.baslik}
              </Metin>
            </View>
          ) : (
            <Satir d={item.oge} />
          )
        }
      />
    </View>
  )
}

function Satir({ d }: { d: Dinleme }) {
  return (
    <SarkiSatiri ad={d.ad} sanatci={d.atlandi ? `${d.sanatci} · atlandı` : d.sanatci} kapakUri={d.kapak} sagVeri={saatMetni(d.zaman)} geriDonusumAnahtari={d.trackId} />
  )
}

function DonemHapi({ etiket, secili, bas }: { etiket: string; secili: boolean; bas: () => void }) {
  return (
    <Basilabilir
      onPress={bas}
      accessibilityRole="tab"
      accessibilityState={{ selected: secili }}
      accessibilityLabel={etiket}
      hitSlop={4}
      style={[stil.hap, { backgroundColor: secili ? renk.vurgu : renk.yuzey2 }]}
    >
      <Metin rol="ustVeri" renkAdi={secili ? 'vurguUstu' : 'metin'}>
        {etiket}
      </Metin>
    </Basilabilir>
  )
}

const stil = StyleSheet.create({
  kap: { flex: 1, backgroundColor: renk.zemin },
  kenar: { paddingHorizontal: KENAR },
  haplar: { paddingHorizontal: KENAR, gap: bosluk[2], marginTop: bosluk[4], marginBottom: bosluk[4] },
  hap: { minHeight: 40, paddingHorizontal: bosluk[4], borderRadius: kose.pil, justifyContent: 'center' },
  gun: { backgroundColor: renk.zemin, paddingHorizontal: KENAR, paddingTop: bosluk[4], paddingBottom: bosluk[2] },
})
