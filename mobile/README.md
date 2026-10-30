# Rosso mobile (Android first)

Expo SDK 58 · Expo Router · TypeScript strict · New Architecture · Hermes. The app reads your own Rosso instance (your Supabase + your deployed web app); nothing is shared between installs.

Decisions: [`docs/mobile/mimari.md`](../docs/mobile/mimari.md) · API contract: [`docs/mobile/api.md`](../docs/mobile/api.md) · design spec: [`docs/design/katmanlar/mobile-design.md`](../docs/design/katmanlar/mobile-design.md).

## Setup
1. Deploy the web app first ([SELF-HOSTING.md](../SELF-HOSTING.md)).
2. `cp .env.example .env` and fill in `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the public anon key, never the service role key) and `EXPO_PUBLIC_WEB_URL` (your site, e.g. `https://rosso.example.com`). Optionally `ROSSO_ANDROID_PACKAGE` so your build does not clash with someone else's on the same phone.
3. `npm ci`

## Run on an Android phone
- Development build, free on EAS: `npx eas-cli build --profile development --platform android` → install the APK → `npm start`.
- Or locally with Android Studio: `npm run android`.
- A shareable APK without the dev menu: `npx eas-cli build --profile preview --platform android`. For EAS builds, put the three `EXPO_PUBLIC_*` values in the EAS environment of that profile.

iOS compiles from the same code, but we do not build, test or ship it (an Apple developer account is paid). On an iPhone use the web app: Safari → Share → *Add to Home Screen*.

## Checks
`npm run typecheck` · `npm run lint` · `npm test` · `npm run doctor` (the same run in CI).
