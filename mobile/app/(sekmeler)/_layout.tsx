import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router/js-tabs'
import type { ComponentProps } from 'react'
import { SekmeCubugu } from '@/bilesen'
import { renk } from '@/tema'

type IkonAdi = ComponentProps<typeof Ionicons>['name']

/** Web'in sırası (spec §2): Ana Sayfa · Listeler · Taste · Recap · Geçmiş. */
const SEKMELER: { ad: string; baslik: string; ikon: IkonAdi; aktifIkon: IkonAdi }[] = [
  { ad: 'index', baslik: 'Ana Sayfa', ikon: 'home-outline', aktifIkon: 'home' },
  { ad: 'listeler', baslik: 'Listeler', ikon: 'albums-outline', aktifIkon: 'albums' },
  { ad: 'taste', baslik: 'Taste', ikon: 'sparkles-outline', aktifIkon: 'sparkles' },
  { ad: 'recap', baslik: 'Recap', ikon: 'calendar-outline', aktifIkon: 'calendar' },
  { ad: 'gecmis', baslik: 'Geçmiş', ikon: 'time-outline', aktifIkon: 'time' },
]

export default function SekmeDuzeni() {
  return (
    <Tabs
      tabBar={(props) => <SekmeCubugu {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: renk.zemin } }}
    >
      {SEKMELER.map((s) => (
        <Tabs.Screen
          key={s.ad}
          name={s.ad}
          options={{
            title: s.baslik,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? s.aktifIkon : s.ikon} color={typeof color === 'string' ? color : renk.sonuk} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
