import { bosluk, hitSlopIcin, kapanmaliMi, kose, lastikBant, projeksiyon, renk } from '@/tema'

// Kaynakla eşitlik CI'da: `npm run tokenlar:kontrol`.
describe('renk token’ları', () => {
  it('web’in ölçülmüş hex karşılıkları (globals.css yorumları)', () => {
    expect(renk.vurgu).toBe('#7c5cff')
    expect(renk.vurguBasili).toBe('#9d84ff')
    expect(renk.zemin).toBe('#0a0910')
  })
})

describe('ölçü doktrini', () => {
  it('4 pt ızgara, ara değer yok', () => {
    for (const v of Object.values(bosluk)) expect(v % 4).toBe(0)
    expect(kose).toEqual({ kart: 8, kapak: 6, kapakSatir: 4, sheet: 24, pil: 999 })
  })

  it('küçük ikon 48 dp hedefe tamamlanır', () => {
    expect(hitSlopIcin(24)).toEqual({ top: 12, bottom: 12, left: 12, right: 12 })
    expect(hitSlopIcin(60).top).toBe(0)
  })
})

describe('sheet fiziği', () => {
  it('hızlı aşağı fırlatma kısa mesafede de kapatır, yavaş bırakma kapatmaz', () => {
    expect(kapanmaliMi(40, 1500, 400)).toBe(true)
    expect(kapanmaliMi(150, 0, 400)).toBe(false)
    expect(kapanmaliMi(150, -800, 400)).toBe(false)
  })

  it('projeksiyon hızla doğru orantılı', () => {
    expect(projeksiyon(1000)).toBeCloseTo(499, 0)
    expect(projeksiyon(0)).toBe(0)
  })

  it('lastik bant sınırsız uzamaz', () => {
    expect(lastikBant(10_000, 400)).toBeLessThan(400)
    expect(lastikBant(0, 400)).toBe(0)
  })
})
