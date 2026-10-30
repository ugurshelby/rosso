import type { ExpoConfig } from 'expo/config'

/**
 * Her kurulum kendi arka ucunu derleme anında alır (docs/mobile/mimari.md M3):
 * uygulamada kimsenin sunucusu gömülü değil. Değerler `.env` ya da EAS ortamından.
 * Android paket adı da ortamdan: iki geliştiricinin derlemesi aynı telefonda çakışmasın.
 */
const ANDROID_PAKET = process.env.ROSSO_ANDROID_PACKAGE || 'app.rosso.mobile'

const config: ExpoConfig = {
  name: 'Rosso',
  slug: 'rosso',
  scheme: 'rosso',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#0a0910',
  ios: {
    supportsTablet: false,
    bundleIdentifier: ANDROID_PAKET,
  },
  android: {
    package: ANDROID_PAKET,
    adaptiveIcon: {
      backgroundColor: '#0a0910',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    [
      'expo-font',
      {
        // Derlemeye gömülü: çalışma anında yükleme yok, ilk kare doğru fontla (spec §1, §4).
        fonts: [
          'node_modules/@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf',
          'node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf',
          'node_modules/@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf',
          'node_modules/@expo-google-fonts/geist/700Bold/Geist_700Bold.ttf',
          'node_modules/@expo-google-fonts/geist-mono/500Medium/GeistMono_500Medium.ttf',
          'node_modules/@expo-google-fonts/bodoni-moda/400Regular_Italic/BodoniModa_400Regular_Italic.ttf',
        ],
      },
    ],
    'expo-image',
    'expo-secure-store',
    'expo-web-browser',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, backgroundColor: '#0a0910' }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? '',
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
  runtimeVersion: { policy: 'fingerprint' },
}

export default config
