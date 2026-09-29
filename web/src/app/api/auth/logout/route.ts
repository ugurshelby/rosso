import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Oturumu kapatır ve /login'e yönlendirir.
 * POST kullanılır — GET logout CSRF'e açıktır (örn. <img src> ile tetiklenebilir).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}
