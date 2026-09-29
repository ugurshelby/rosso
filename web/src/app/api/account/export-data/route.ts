import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { collectUserDataExport } from '@/lib/account/data-export'
import { systemLog } from '@/lib/observability/logger'

/**
 * KVKK/GDPR veri taşınabilirliği — "Verilerimi talep et" (2026-07-27).
 *
 * ESKİDEN: buton yalnız `mailto:` açıyordu → kullanıcı mail atıyor, veri ELLE
 * hazırlanıyordu. Artık kullanıcı butona basınca kendi verisinin tam kopyasını
 * bir JSON dosyası olarak ANINDA indirir (mail beklemeden, §1.7 en basit hâl).
 *
 * SMTP kurulunca (Resend geçişi): aynı `collectUserDataExport` çıktısı ZIP'lenip
 * maile eklenerek de gönderilebilir — teslim kanalı eklenir, içerik değişmez.
 *
 * Güvenlik:
 *  - Oturum zorunlu. Kullanıcı YALNIZ kendi verisini alır (user.id sabit).
 *  - service client RLS bypass'ı yalnız bu doğrulanmış user.id için kullanılır.
 *  - Erişim jetonları (Spotify/YT token'ları) pakete GİRMEZ (data-export.ts).
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You need to sign in.' }, { status: 401 })
  }

  try {
    const service = await createServiceClient()
    const bundle = await collectUserDataExport(service, user.id, user.email ?? null)

    void systemLog({
      userId: user.id,
      operation: 'account_data_export',
      severity: 'info',
    })

    const filename = `rosso-verilerim-${new Date().toISOString().slice(0, 10)}.json`
    const body = JSON.stringify(bundle, null, 2)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    void systemLog({
      userId: user.id,
      operation: 'account_data_export',
      severity: 'error',
      errorCode: 'EXPORT_FAILED',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: 'The data pack couldn’t be prepared, try again.' },
      { status: 500 },
    )
  }
}
