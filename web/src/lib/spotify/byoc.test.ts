// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/*
 * BYOC (2026-09-23) — bu dosyanın varlık sebebi: kullanıcının kendi Spotify
 * dev app sırrı burada şifrelenip saklanıyor. Yanlış bir dal (doğrulanmamış
 * satırın kullanılması, şifre çözmenin sessizce yutulmaması gerekirken
 * patlaması, paylaşılana düşmenin çalışmaması) doğrudan "kullanıcı
 * kilitlendi" ya da "yanlış sırla bağlanmaya çalışıldı" demek.
 */

vi.mock('@/lib/crypto/token-cipher', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => {
    if (!v.startsWith('enc:')) throw new Error('Invalid ciphertext format')
    return v.replace('enc:', '')
  },
}))

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    SPOTIFY_CLIENT_ID: 'shared-id',
    SPOTIFY_CLIENT_SECRET: 'shared-secret',
  },
}))

const upsertMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: null }))
const deleteEqMock = vi.fn(async () => ({ error: null }))
/** `spotify_byoc_credentials` satırı. */
let maybeSingleResult: { data: Record<string, unknown> | null; error: unknown }
/** `platform_connections` satırı (0341: oauth_client_id). */
let connResult: { data: Record<string, unknown> | null; error: unknown }

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(async () => ({
    from: (table: string) => {
      const sonuc = () => (table === 'platform_connections' ? connResult : maybeSingleResult)
      const zincir = {
        eq: () => zincir,
        maybeSingle: async () => sonuc(),
      }
      return {
        select: () => zincir,
        upsert: upsertMock,
        delete: () => ({ eq: deleteEqMock }),
      }
    },
  })),
}))

import {
  resolveSpotifyClientId,
  resolveSpotifyClientCredentials,
  resolveSpotifyCredentialsForConnection,
  getByocStatus,
  verifyAndSaveByocCredentials,
  deleteByocCredentials,
} from './byoc'

const originalFetch = global.fetch
const VALID_ID = 'a'.repeat(32)
const VALID_SECRET = 'b'.repeat(32)

beforeEach(() => {
  vi.clearAllMocks()
  maybeSingleResult = { data: null, error: null }
  connResult = { data: null, error: null }
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('resolveSpotifyClientId', () => {
  it('paylaşılan env\'e düşer — BYOC satırı yok', async () => {
    maybeSingleResult = { data: null, error: null }
    const id = await resolveSpotifyClientId('user-1')
    expect(id).toBe('shared-id')
  })

  it('doğrulanmış BYOC satırı varsa onu döner', async () => {
    maybeSingleResult = { data: { client_id: 'user-own-id', verified_at: '2026-09-23T00:00:00Z' }, error: null }
    const id = await resolveSpotifyClientId('user-1')
    expect(id).toBe('user-own-id')
  })

  it('doğrulanMAMIŞ BYOC satırı YOK sayılır — paylaşılana düşer', async () => {
    // 🔴 Bu davranışın varlık sebebi: kullanıcı Client ID/Secret'ı girdi ama
    // Spotify'a hiç test edilmedi (ör. istek yarıda kaldı). Doğrulanmamış
    // bir sırla OAuth başlatılırsa kullanıcı anlaşılmaz bir hatayla
    // kilitlenir; paylaşılana düşmek en azından ÇALIŞAN bir yol sunar.
    maybeSingleResult = { data: { client_id: 'user-own-id', verified_at: null }, error: null }
    const id = await resolveSpotifyClientId('user-1')
    expect(id).toBe('shared-id')
  })
})

describe('resolveSpotifyClientCredentials', () => {
  it('doğrulanmış BYOC satırının sırrını çözüp source=byoc döner', async () => {
    maybeSingleResult = {
      data: { client_id: 'user-own-id', client_secret: 'enc:user-secret', verified_at: '2026-09-23T00:00:00Z' },
      error: null,
    }
    const creds = await resolveSpotifyClientCredentials('user-1')
    expect(creds).toEqual({ clientId: 'user-own-id', clientSecret: 'user-secret', source: 'byoc' })
  })

  it('BYOC yoksa paylaşılan kimlik bilgilerini source=shared ile döner', async () => {
    const creds = await resolveSpotifyClientCredentials('user-1')
    expect(creds).toEqual({ clientId: 'shared-id', clientSecret: 'shared-secret', source: 'shared' })
  })

  it('şifre çözme patlarsa (bozuk kayıt) null yerine paylaşılana düşer', async () => {
    // Kaydedilmiş değer beklenen "enc:" biçiminde değil — decrypt mock'u fırlatır.
    maybeSingleResult = {
      data: { client_id: 'user-own-id', client_secret: 'bozuk-deger', verified_at: '2026-09-23T00:00:00Z' },
      error: null,
    }
    const creds = await resolveSpotifyClientCredentials('user-1')
    expect(creds?.source).toBe('shared')
  })
})

describe('resolveSpotifyCredentialsForConnection (0341 — bağlantıyı kuran app)', () => {
  const byocSatiri = {
    client_id: 'user-own-id',
    client_secret: 'enc:user-secret',
    verified_at: '2026-09-23T00:00:00Z',
  }

  it('🔴 paylaşılan app\'le kurulmuş bağlantı, BYOC kaydı OLSA BİLE paylaşılanla yenilenir', async () => {
    // Asıl koruma: BYOC OAuth'u yarıda kalan kullanıcının mevcut bağlantısı
    // BYOC kimliğiyle denenip düşürülmemeli.
    maybeSingleResult = { data: byocSatiri, error: null }
    connResult = { data: { oauth_client_id: 'shared-id' }, error: null }
    const creds = await resolveSpotifyCredentialsForConnection('user-1')
    expect(creds).toEqual({ clientId: 'shared-id', clientSecret: 'shared-secret', source: 'shared' })
  })

  it('0341 öncesi bağlantı (oauth_client_id NULL) paylaşılanla yenilenir', async () => {
    maybeSingleResult = { data: byocSatiri, error: null }
    connResult = { data: { oauth_client_id: null }, error: null }
    const creds = await resolveSpotifyCredentialsForConnection('user-1')
    expect(creds?.source).toBe('shared')
  })

  it('BYOC app\'iyle kurulmuş bağlantı BYOC kimliğiyle yenilenir', async () => {
    maybeSingleResult = { data: byocSatiri, error: null }
    connResult = { data: { oauth_client_id: 'user-own-id' }, error: null }
    const creds = await resolveSpotifyCredentialsForConnection('user-1')
    expect(creds).toEqual({ clientId: 'user-own-id', clientSecret: 'user-secret', source: 'byoc' })
  })

  it('bağlantıyı kuran BYOC kimliği artık yoksa null döner (yanlış kimlikle denenmez)', async () => {
    maybeSingleResult = { data: null, error: null }
    connResult = { data: { oauth_client_id: 'user-own-id' }, error: null }
    const creds = await resolveSpotifyCredentialsForConnection('user-1')
    expect(creds).toBeNull()
  })
})

describe('getByocStatus', () => {
  it('satır yoksa configured=false döner', async () => {
    const status = await getByocStatus('user-1')
    expect(status).toEqual({
      configured: false,
      verified: false,
      active: false,
      clientId: null,
      verifiedAt: null,
    })
  })

  it('doğrulanmış ama bağlantı paylaşılan app\'le kuruluysa active=false', async () => {
    maybeSingleResult = { data: { client_id: 'user-own-id', verified_at: '2026-09-23T00:00:00Z' }, error: null }
    connResult = { data: { is_active: true, oauth_client_id: 'shared-id' }, error: null }
    const status = await getByocStatus('user-1')
    expect(status.verified).toBe(true)
    expect(status.active).toBe(false)
  })

  it('bağlantı BYOC app\'iyle kurulu ve aktifse active=true', async () => {
    maybeSingleResult = { data: { client_id: 'user-own-id', verified_at: '2026-09-23T00:00:00Z' }, error: null }
    connResult = { data: { is_active: true, oauth_client_id: 'user-own-id' }, error: null }
    const status = await getByocStatus('user-1')
    expect(status.active).toBe(true)
  })

  it('satır var ama doğrulanmamışsa verified=false, configured=true', async () => {
    maybeSingleResult = { data: { client_id: 'user-own-id', verified_at: null }, error: null }
    const status = await getByocStatus('user-1')
    expect(status.configured).toBe(true)
    expect(status.verified).toBe(false)
  })

  it('SIR asla dönmez — client_secret alanı hiçbir koşulda yanıtta yok', async () => {
    maybeSingleResult = {
      data: { client_id: 'user-own-id', client_secret: 'enc:sir', verified_at: '2026-09-23T00:00:00Z' },
      error: null,
    }
    const status = await getByocStatus('user-1')
    expect(status).not.toHaveProperty('client_secret')
    expect(status).not.toHaveProperty('clientSecret')
    expect(JSON.stringify(status)).not.toContain('sir')
  })
})

describe('verifyAndSaveByocCredentials', () => {
  it('geçersiz biçimdeki (32-hex olmayan) girdiyi Spotify\'a hiç göndermeden reddeder', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch
    const sonuc = await verifyAndSaveByocCredentials('user-1', 'kisa', 'kisa')
    expect(sonuc).toEqual({ ok: false, kod: 'gecersiz_bicim' })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('Spotify çifti reddederse (401/400) kaydetmez', async () => {
    global.fetch = vi.fn(async () => ({ ok: false })) as unknown as typeof fetch
    const sonuc = await verifyAndSaveByocCredentials('user-1', VALID_ID, VALID_SECRET)
    expect(sonuc).toEqual({ ok: false, kod: 'spotify_reddetti' })
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('ağ hatasında db_hatasi değil ag_hatasi döner', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    const sonuc = await verifyAndSaveByocCredentials('user-1', VALID_ID, VALID_SECRET)
    expect(sonuc).toEqual({ ok: false, kod: 'ag_hatasi' })
  })

  it('Spotify onaylarsa ŞİFRELENMİŞ sırla kaydeder, verified_at doldurur', async () => {
    global.fetch = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch
    const sonuc = await verifyAndSaveByocCredentials('user-1', VALID_ID, VALID_SECRET)
    expect(sonuc).toEqual({ ok: true })

    expect(upsertMock).toHaveBeenCalledTimes(1)
    const [row] = upsertMock.mock.calls[0]
    expect(row.user_id).toBe('user-1')
    expect(row.client_id).toBe(VALID_ID)
    // Düz metin DEĞİL — şifreli olmalı (mock cipher "enc:" öneki ekliyor).
    expect(row.client_secret).toBe(`enc:${VALID_SECRET}`)
    expect(row.client_secret).not.toBe(VALID_SECRET)
    expect(row.verified_at).toBeTruthy()
  })

  it('Client ID/Secret\'ı baştaki/sondaki boşluklardan arındırır', async () => {
    global.fetch = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch
    await verifyAndSaveByocCredentials('user-1', `  ${VALID_ID}  `, `\n${VALID_SECRET}\n`)
    const [row] = upsertMock.mock.calls[0]
    expect(row.client_id).toBe(VALID_ID)
  })
})

describe('deleteByocCredentials', () => {
  it('kullanıcının satırını siler', async () => {
    await deleteByocCredentials('user-1')
    expect(deleteEqMock).toHaveBeenCalledWith('user_id', 'user-1')
  })
})
