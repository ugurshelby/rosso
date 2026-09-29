import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// 🔴 Mobil i18n (2026-09-27): `locale` eklendi — mobil uygulamanın TEK dil
//    okuma/yazma noktası burası (web'in kendi `setLocale()` sunucu eylemi
//    ayrıca var, ama RN'de sunucu eylemi çağrılamaz; bu rota HTTP üzerinden
//    aynı `user_preferences.locale` kolonunu okur/yazar). `include_incognito`
//    ve `collaborative_sync` davranışı DEĞİŞMEDİ — geriye uyumlu.
const PreferencesSchema = z.object({
  include_incognito: z.boolean().optional(),
  collaborative_sync: z.boolean().optional(),
  locale: z.enum(['en', 'tr']).nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_preferences')
    .select('include_incognito, collaborative_sync, locale')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    preferences: data ?? { include_incognito: false, collaborative_sync: false, locale: null },
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = PreferencesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 422 })
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: true })
}
