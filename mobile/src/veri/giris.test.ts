import { epostaGecerliMi, girisHatasiMetni } from './giris'

describe('girisHatasiMetni', () => {
  it('davet kapısı reddini açıklar', () => {
    expect(girisHatasiMetni({ message: 'Database error saving new user', status: 500 })).toMatch(/davetle/)
  })

  it('yanlış şifre ve doğrulanmamış e-posta', () => {
    expect(girisHatasiMetni({ message: 'Invalid login credentials', status: 400 })).toBe('E-posta ya da şifre yanlış.')
    expect(girisHatasiMetni({ message: 'Email not confirmed', status: 400 })).toMatch(/doğrulama/)
  })

  it('hız sınırı ve bilinmeyen hata', () => {
    expect(girisHatasiMetni({ message: 'x', status: 429 })).toMatch(/bekleyip/)
    expect(girisHatasiMetni({ message: 'beklenmedik', status: 500 })).toMatch(/yeniden dene/)
    expect(girisHatasiMetni(null)).toBeNull()
  })
})

describe('epostaGecerliMi', () => {
  it('basit biçim kontrolü', () => {
    expect(epostaGecerliMi(' a@b.co ')).toBe(true)
    expect(epostaGecerliMi('a@b')).toBe(false)
  })
})
