# Rosso mobile — agent notes

Expo ships breaking changes every SDK. Before touching an Expo, EAS or React Native API, read the docs for the installed major (`expo` in package.json, now 58): https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt. Do not trust memory.

- Add packages with `npx expo install <pkg>` (SDK-matched versions). New libraries outside `docs/mobile/mimari.md` M12 are an L3 decision.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run doctor`.
- No secrets in the app: only `EXPO_PUBLIC_*` values (public anon key, URLs). Spotify tokens stay on the server.
- Reads go straight to Supabase under RLS; actions go to the web API with `Authorization: Bearer <access token>` (`docs/mobile/api.md`).
- Design is binding: `docs/design/katmanlar/mobile-design.md`. Dark theme only.
