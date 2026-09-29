'use client'

import dynamic from 'next/dynamic'
import type { Phase } from '@/lib/phase/read'

/**
 * `PhasePanel`'in tembel yüklenen kabuğu (2026-08-11, LCP/TBT turu).
 *
 * ÖLÇÜLDÜ: `PhasePanel` `@/lib/supabase/client`'ı doğrudan import ediyor ve
 * `(dashboard)/layout.tsx` içinden HER dashboard sayfasında (`showPhasePanel`
 * true olduğunda) render ediliyor. Kimlikli Lighthouse turunda (11 Ağu, 8 rota)
 * paylaşılan chunk `_next/static/chunks/25k72r_fk62v6.js` (74 KB transfer /
 * 233 KB decompressed) sekiz rotanın SEKİZİNDE de yükleniyor ve
 * `mainthread-work-breakdown`'da 800-1100ms scripting'in çekirdeği bu.
 *
 * Panel bir overlay — kullanıcı görene kadar (`showPhasePanel` bazen false)
 * DOM'da bile olması gerekmez, ilk boyamayı bloklaması hiç gerekmez.
 * `ssr:false` + `next/dynamic`: sunucu HTML'inde yok, istemci ilk boyamadan
 * SONRA (idle'da) indirir. Modal zaten kullanıcı odağını istediği an açılır,
 * birkaç yüz ms sonra gelmesi hissedilmez.
 */
const PhasePanel = dynamic(
  () => import('./phase-panel').then((m) => m.PhasePanel),
  { ssr: false },
)

export function PhasePanelLazy({ phase }: { phase: Phase }) {
  return <PhasePanel phase={phase} />
}
