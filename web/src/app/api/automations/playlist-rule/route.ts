import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UpsertSchema = z.object({
  rule_type: z.enum(['top_month', 'top_year', 'morning_routine', 'nostalgia', 'most_skipped', 'obsession']).default('top_month'),
  track_count: z.union([z.literal(20), z.literal(50), z.literal(100)]).default(50),
  target_platforms: z.array(z.enum(['spotify'])).min(1),
  enabled: z.boolean().default(true),
  /* Sıralama ölçütü (migration 0278). Varsayılan `plays` = eski davranış:
     alan gönderilmese bile mevcut kuralların listesi değişmez. */
  sort_by: z.enum(['plays', 'duration']).default('plays'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = UpsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 })
  }

  const { rule_type, track_count, target_platforms, enabled, sort_by } = parsed.data

  // Upsert: one rule per user per rule_type
  const { data, error } = await supabase
    .from('auto_playlist_rules')
    .upsert(
      {
        user_id: user.id,
        rule_type,
        track_count,
        target_platforms,
        enabled,
        sort_by,
      },
      { onConflict: 'user_id,rule_type' },
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ rule: data })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rules } = await supabase
    .from('auto_playlist_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: recentRuns } = await supabase
    .from('auto_playlist_runs')
    .select(`
      id,
      rule_id,
      generated_playlist_id,
      platform,
      status,
      track_count,
      error_message,
      ran_at,
      auto_playlist_rules!inner(user_id)
    `)
    .eq('auto_playlist_rules.user_id', user.id)
    .order('ran_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ rules: rules ?? [], recentRuns: recentRuns ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ruleId = searchParams.get('id')
  if (!ruleId || !z.string().uuid().safeParse(ruleId).success) {
    return NextResponse.json({ error: 'Invalid rule id' }, { status: 422 })
  }

  const { error } = await supabase
    .from('auto_playlist_rules')
    .delete()
    .eq('id', ruleId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
