export type DashboardAlert =
  | { kind: 'spotify_cooldown'; remainingSeconds: number }
  | { kind: 'sync_delay'; hoursSinceSync: number }
  /**
   * Spotify ile GİRİŞ yaptı ama veri bağlantısı yok.
   *
   * FAZ KİMLİK-V2'nin doğurduğu yeni durum: giriş akışı yalnız
   * `user-read-email` ister, dinleme verisi okuyamaz. Kullanıcı Spotify'la
   * girer ve boş bir dashboard görür. Genel "Spotify'ı bağla" kartı bu
   * soruyu cevaplamaz — kullanıcı zaten Spotify'la girdiğini biliyor,
   * ondan yine Spotify istemek çelişki gibi görünür.
   *
   * Karar: `docs/decisions/spotify-giris-saglayicisi-3-soru.md`
   */
  | { kind: 'spotify_veri_izni_gerekli' }
