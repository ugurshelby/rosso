'use client'

import { memo } from 'react'
import type { JourneyYear, JourneyCover, YearPalette } from '@/lib/journey/types'
import type { YilSahnesi } from '@/lib/journey/yil-sahnesi'
import { FocusScene } from './focus-scene'
import { DiscoveryScene } from './discovery-scene'
import { VolumeScene } from './volume-scene'
import { SpreadScene } from './spread-scene'
import { CalmScene } from './calm-scene'

export interface YearSceneProps {
  year: JourneyYear
  sahne: YilSahnesi
  covers: JourneyCover[]
  palette: YearPalette
  isBreak?: boolean
  isFirstYear?: boolean
}

/**
 * Yıl Sahnesi Switch Bileşeni — recap-journey-design.md §3.2
 * `sahne.tur` çıktısına göre veriye dayalı 5 kompozisyondan birini render eder.
 */
export const YearScene = memo(function YearScene(props: YearSceneProps) {
  switch (props.sahne.tur) {
    case 'baglilik':
      return <FocusScene {...props} />
    case 'kesif':
      return <DiscoveryScene {...props} />
    case 'hacim':
      return <VolumeScene {...props} />
    case 'dagilma':
      return <SpreadScene {...props} />
    case 'sakin':
    default:
      return <CalmScene {...props} />
  }
})
