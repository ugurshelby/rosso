'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a display name.')
  .max(60, 'Display name can be at most 60 characters.')

export type DisplayNameResult =
  | { ok: true; data: { displayName: string } }
  | { ok: false; error: string }

/**
 * Görünen adı günceller. V2'de sosyal profil yok; ad Supabase Auth
 * `user_metadata.display_name` alanında yaşar (layout ve ayarlar oradan okur).
 */
export async function updateDisplayName(raw: string): Promise<DisplayNameResult> {
  await requireAuth()

  const parsed = displayNameSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Name is invalid.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { display_name: parsed.data },
  })
  if (error) return { ok: false, error: 'Could not save the name, try again.' }

  return { ok: true, data: { displayName: parsed.data } }
}
