import { guvenliDepo } from './guvenliDepo'

const mockDepo = new Map<string, string>()
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockDepo.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => {
    if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error(`geçersiz anahtar ${k}`)
    if (v.length > 2048) throw new Error('çok büyük')
    mockDepo.set(k, v)
  },
  deleteItemAsync: async (k: string) => {
    mockDepo.delete(k)
  },
}))

beforeEach(() => mockDepo.clear())

describe('guvenliDepo', () => {
  it('2 KB üstü oturumu parçalayıp aynen geri verir', async () => {
    const oturum = JSON.stringify({ access_token: 'a'.repeat(5000), refresh_token: 'r' })
    await guvenliDepo.setItem('sb-ornek-auth-token', oturum)
    expect(mockDepo.get('sb-ornek-auth-token.n')).toBe('3')
    expect(await guvenliDepo.getItem('sb-ornek-auth-token')).toBe(oturum)
  })

  it('kısalan değer eski parçaları siler', async () => {
    await guvenliDepo.setItem('k', 'x'.repeat(4000))
    await guvenliDepo.setItem('k', 'kisa')
    expect(mockDepo.has('k.1')).toBe(false)
    expect(await guvenliDepo.getItem('k')).toBe('kisa')
  })

  it('geçersiz karakterli anahtar temizlenir, removeItem her şeyi siler', async () => {
    await guvenliDepo.setItem('sb:ornek/auth', 'deger')
    expect(await guvenliDepo.getItem('sb:ornek/auth')).toBe('deger')
    await guvenliDepo.removeItem('sb:ornek/auth')
    expect(mockDepo.size).toBe(0)
    expect(await guvenliDepo.getItem('sb:ornek/auth')).toBeNull()
  })

  it('eksik parça varsa oturum yok sayılır', async () => {
    await guvenliDepo.setItem('k', 'y'.repeat(4000))
    mockDepo.delete('k.1')
    expect(await guvenliDepo.getItem('k')).toBeNull()
  })
})
