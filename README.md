# Rosso

**Your music memory, on your own infrastructure.**
Rosso turns your Spotify listening history into a personal mirror: yearly and monthly **Recaps**, a lifelong **Journey**, a living **Taste** profile and smart playlists. It is a *personal* app: you host it, your data lives in *your* database, nobody else can see it.

> Spotify shows you what you listened to. Rosso tells you who was listening.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fugurshelby%2Frosso&root-directory=web&project-name=rosso&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_APP_URL,TOKEN_ENCRYPTION_KEY,CRON_SECRET,WORKER_SHARED_SECRET&envDescription=See%20SELF-HOSTING.md%20for%20where%20to%20find%20each%20value&envLink=https%3A%2F%2Fgithub.com%2Fugurshelby%2Frosso%2Fblob%2Fmain%2FSELF-HOSTING.md)

**→ Setup takes about 30 minutes: [SELF-HOSTING.md](SELF-HOSTING.md)**

---

## What it does

| Surface | What you get |
|---|---|
| **Home** | Listening dashboard: top tracks/artists, streaks, discovery score |
| **Recap** | Frozen monthly and yearly "story" cards — what defined a period of your life |
| **Journey** | A lifetime archive told as five data-driven scenes (focus, discovery, volume, spread, calm) |
| **Taste** | Your musical character (what never changes) and your mood right now (what does) |
| **Playlists** | Auto-generated monthly playlists, mood playlists, liked-songs views, one-tap push to Spotify |
| **History** | Dense, fast listening history |

Data comes from two places: the **Spotify Web API** (recent plays, synced every few minutes) and your **Spotify "Extended streaming history" ZIP** (your whole past). Both are optional to start with; the app has a demo preview so it never looks empty.

## Why self-hosted, and why no social features

Rosso began life as a social app (follows, messages, matching). That layer was **deliberately archived** — the `sosyal-son` tag in the original history preserves it — because a shared social graph needs a shared database, and a shared database contradicts the whole point: *your listening history is yours*. Rosso is now one owner, one database, optionally a few invited friends (see below).

The architecture is built around **zero running cost**:

- **Supabase free tier** — Postgres, Auth, Storage, and `pg_cron` as the only scheduler (no always-on server).
- **Vercel Hobby** — Next.js app and cron endpoints; `pg_cron` calls them through `pg_net`.
- **GitHub Actions** — on-demand Python worker for the rare heavy jobs (ZIP import, catalog enrichment, encrypted DB backups).
- **AI is optional** — Gemini (Vertex AI) can write editorial copy and curate mood playlists, but every feature has a deterministic SQL fallback. Nothing breaks without it.

## Stack

- **Web** — Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4, Supabase SSR, Vitest
- **Database** — PostgreSQL 17 on Supabase; 67 tables, RLS on every table, business logic in SQL functions; one-file schema in [`web/supabase/kurulum/schema.sql`](web/supabase/kurulum/schema.sql)
- **Worker** — Python 3.13, FastAPI, pytest; Deezer + Last.fm + MusicBrainz enrichment
- **Design** — dark, deep-violet identity; spring-based, interruptible motion (see [`docs/design`](docs/design))

## Invite-only by design

The first account created on a fresh install becomes the **owner**; sign-ups then close. The owner can invite a few friends from **Settings → Invite a friend**. (Spotify's Development Mode also requires adding each friend under *User Management* in your Spotify developer dashboard — the app reminds you.) The gate lives in the database (`auth.users` trigger), not just in the UI.

## Repository layout

```
web/        Next.js app, SQL schema (web/supabase/kurulum), install script (web/scripts/kur.mjs)
worker/     Python worker (GitHub Actions on demand)
docs/       Architecture, decisions, data model notes, design system (mostly Turkish)
.github/    CI (tests) and the worker workflows
```

## Notes

- Documentation in `docs/` is largely Turkish; the app UI is fully bilingual (TR/EN).
- Dates in the code that mention a "personal AI shutdown" do not apply here: in this repository `AI_KAPANIS_TARIHI` is disabled by default.
- Not affiliated with Spotify. You bring your own Spotify developer app; Rosso never shares credentials between installs.

## License

[MIT](LICENSE)
