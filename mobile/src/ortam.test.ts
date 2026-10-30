import { ortamOku } from './ortam'

describe('ortamOku', () => {
  it('sondaki eğik çizgiyi atar, eksik yok', () => {
    const { ortam, eksik } = ortamOku({
      supabaseUrl: 'https://ornek.supabase.co/',
      supabaseAnonKey: ' anon ',
      webUrl: 'https://rosso.example//',
    })
    expect(ortam).toEqual({
      supabaseUrl: 'https://ornek.supabase.co',
      supabaseAnonKey: 'anon',
      webUrl: 'https://rosso.example',
    })
    expect(eksik).toEqual([])
  })

  it('boş değerleri eksik sayar', () => {
    expect(ortamOku({ supabaseUrl: '', webUrl: 'x' }).eksik).toEqual(['supabaseUrl', 'supabaseAnonKey'])
    expect(ortamOku(undefined).eksik).toHaveLength(3)
  })
})
