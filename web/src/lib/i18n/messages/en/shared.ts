/**
 * Genel kullanımlı, kendi metnini taşıyan UI ilkelleri — dashboard hata/boş
 * durum kabuğu ve katalog sayfalarının paylaştığı "geri" düğmesi gibi.
 * Yalnız bu ajanın kapsamındaki çağıranlar (album/artist/track sayfaları,
 * `app/(dashboard)/error.tsx`) buradan okur; bileşenin kendisi (ör.
 * `components/ui/back-button.tsx`) dashboard dışında da kullanıldığı için
 * varsayılan prop metnini İngilizce olarak korur (bkz. rapor notu).
 */
export const shared = {
  error: {
    code: 'Error',
    title: 'Something went wrong',
    description: "This page couldn't load. Try again; if it keeps happening, come back in a bit.",
    retry: 'Try again',
  },
  backButton: {
    label: 'Go back',
  },
} as const
