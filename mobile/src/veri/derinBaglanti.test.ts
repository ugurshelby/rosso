import { donusuCoz } from './derinBaglanti'

describe('donusuCoz', () => {
  it('implicit akış: diyezdeki token’lar oturum olur', () => {
    expect(donusuCoz('rosso://giris#access_token=A&refresh_token=R&type=signup&expires_in=3600')).toEqual({
      tur: 'oturum',
      accessToken: 'A',
      refreshToken: 'R',
      olay: 'signup',
    })
  })

  it('PKCE: sorgudaki kod', () => {
    expect(donusuCoz('rosso://giris?code=abc')).toEqual({ tur: 'kod', kod: 'abc' })
  })

  it('Supabase hatası okunur metne döner', () => {
    expect(donusuCoz('rosso://giris#error=access_denied&error_description=Email+link+is+invalid+or+has+expired')).toEqual({
      tur: 'hata',
      mesaj: 'Email link is invalid or has expired',
    })
  })

  it('ilgisiz bağlantı ve boş değer yok sayılır', () => {
    expect(donusuCoz('rosso://recap/2026-09')).toEqual({ tur: 'yok' })
    expect(donusuCoz(null)).toEqual({ tur: 'yok' })
  })
})
