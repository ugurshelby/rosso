// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { cleanTrackTitle } from './clean-title'

/**
 * Kart 4/7 şarkı adı temizliği (plan §4.1).
 *
 * 🔴 Bu testlerin ASIL koruduğu şey: Sahibin ilk taslağı
 * `title.split(/[\(\[\-]/)[0]` HER tireden bölüyordu ve gerçek adları
 * kırıyordu ('Jay-Z' → 'Jay'). Güvenli sürüm seçildi (2026-07-21).
 */
describe('cleanTrackTitle', () => {
  it('parantezli süslemeyi atar', () => {
    expect(cleanTrackTitle('Lose My Mind (feat. Doja Cat)')).toBe('Lose My Mind')
    expect(cleanTrackTitle('Gasoline (feat. Taylor Swift)')).toBe('Gasoline')
  })

  it('köşeli parantezi ve çoklu bloğu atar', () => {
    expect(cleanTrackTitle('MUTT (feat. Chris Brown) [CB REMIX]')).toBe('MUTT')
  })

  it('soundtrack ekini atar', () => {
    expect(cleanTrackTitle('Still Don\'t Know My Name (From "Euphoria")')).toBe(
      "Still Don't Know My Name",
    )
  })

  it('boşluklu tire + bilinen süsleme varsa keser', () => {
    expect(cleanTrackTitle('Six Days - Remix')).toBe('Six Days')
    expect(cleanTrackTitle('Sopa - Clup Remix')).toBe('Sopa')
    expect(cleanTrackTitle('Sen İstanbulsun - Speed Up')).toBe('Sen İstanbulsun')
  })

  it('🔴 tireli GERÇEK isimleri KIRMAZ (eski taslağın hatası)', () => {
    expect(cleanTrackTitle('Jay-Z Forever')).toBe('Jay-Z Forever')
    expect(cleanTrackTitle('Lo-fi Dreams')).toBe('Lo-fi Dreams')
    expect(cleanTrackTitle('Yaş-ı Karanlık')).toBe('Yaş-ı Karanlık')
  })

  it('süsleme anahtarı içermeyen alt başlığı KORUR', () => {
    // 'Saygı1' bir süsleme değil, şarkının parçası — kesilmemeli.
    expect(cleanTrackTitle('Cambaz - Saygı1')).toBe('Cambaz - Saygı1')
  })

  it('süsleme yoksa aynen döner', () => {
    expect(cleanTrackTitle('Nightcall')).toBe('Nightcall')
    expect(cleanTrackTitle('505')).toBe('505')
  })

  it('her şey silinirse orijinali korur (boş başlık basılmaz)', () => {
    expect(cleanTrackTitle('(Live)')).toBe('(Live)')
  })

  it('boş girdiyle çökmez', () => {
    expect(cleanTrackTitle('')).toBe('')
  })
})
