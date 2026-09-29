/** Supabase auth user_metadata → profil fotoğrafı URL'i */
export function resolveAvatarUrl(
  metadata: Record<string, unknown> | undefined | null,
): string | null {
  if (!metadata) return null

  const raw = metadata.avatar_url ?? metadata.picture
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}
