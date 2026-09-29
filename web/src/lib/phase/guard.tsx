import 'server-only'
import type { ReactNode } from 'react'
import { PhaseLocked } from '@/components/phase/phase-locked'
import { getPhaseState, type Phase, type PhaseCapabilities } from './read'

/**
 * P0.3 — Sayfa guard'ı.
 *
 * Kilitli rotaya doğrudan URL ile gelinirse boş/bozuk ekran yerine açıklayıcı
 * durum döner. Sayfa şöyle kullanır:
 *
 *   const locked = await phaseGuard(user.id, 'canSeeRecap', 'Recap', 3)
 *   if (locked) return locked
 *
 * `getPhaseState` cache()'li olduğu için layout zaten çağırmışsa ek sorgu YOK.
 */
import { KILIT_KATALOGU, type KilitOzelligi } from '@/lib/quick-start/kilit-katalogu'

export async function phaseGuard(
  userId: string,
  capability: keyof PhaseCapabilities,
  title: string,
  requiredPhase: Phase,
): Promise<ReactNode | null> {
  const state = await getPhaseState(userId)
  if (state.capabilities[capability]) return null

  const match = KILIT_KATALOGU.find((k) => k.yetenek === capability)
  const featureKey: KilitOzelligi = match ? match.ozellik : 'gecmis'

  return (
    <PhaseLocked
      title={title}
      requiredPhase={requiredPhase}
      currentPhase={state.phase}
      partialPhase4={state.partialPhase4}
      featureKey={featureKey}
    />
  )
}
