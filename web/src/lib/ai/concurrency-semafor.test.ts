import { describe, it, expect } from 'vitest'
import { Semafor } from './concurrency'

describe('Semafor', () => {
  it('farklı kaynaklardan gelen işlerin TOPLAMINI sınırlar', async () => {
    const sem = new Semafor(3)
    let ayni = 0
    let enCok = 0
    const is = () =>
      sem.calistir(async () => {
        ayni += 1
        enCok = Math.max(enCok, ayni)
        await new Promise((r) => setTimeout(r, 5))
        ayni -= 1
      })
    // İki "kullanıcı", her biri 6 iş — toplam 12 ama aynı anda en çok 3.
    await Promise.all([...Array(6)].map(is).concat([...Array(6)].map(is)))
    expect(enCok).toBe(3)
  })

  it('iş fırlatsa bile yer serbest kalır (kilitlenme yok)', async () => {
    const sem = new Semafor(1)
    await expect(sem.calistir(async () => { throw new Error('x') })).rejects.toThrow('x')
    await expect(sem.calistir(async () => 42)).resolves.toBe(42)
  })
})
