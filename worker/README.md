# Rosso worker

Small Python service for the **rare heavy jobs** the web app should not do itself. It is **never running 24/7**: GitHub Actions starts it on demand and it exits when the queue is empty (zero running cost).

| Job | Trigger | Workflow |
|---|---|---|
| Parse an uploaded Spotify "Extended streaming history" ZIP (streaming parser, tens of MB → hundreds of thousands of events), match tracks (ISRC first, fuzzy fallback), then enrich genres (Deezer → Last.fm → MusicBrainz) | Web app → `repository_dispatch: process_new_export` | `.github/workflows/process-zip.yml` |
| Catalog upkeep: ISRC, covers, artist images, Deezer cover fill | `pg_cron` → web route → `repository_dispatch: scheduled_maintenance` | `.github/workflows/scheduled-maintenance.yml` |
| Weekly encrypted database backup (outside Supabase) | GitHub `schedule` / manual | `.github/workflows/db-yedek.yml` |

Everything else (live sync, recaps, mood playlists, account purge) runs in the web app, triggered by `pg_cron`.

## Layout

```
app/parser/      Spotify export parsers (Account Data + Extended streaming history)
app/matching/    track matcher (ISRC → normalized title/artist)
app/pipeline/    runners invoked by the workflows
app/services/    Deezer / Last.fm / MusicBrainz clients, rate-limit gate
app/cron/        maintenance entry points
tests/           pytest — pure functions and fakes, no network
```

## Run locally

```bash
cd worker
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env      # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ optional keys)
pytest -q
python -m app.pipeline.export_runner   # drain queued ZIP imports
```

## Configuration

See `.env.example`. In GitHub Actions the same names are read from repository **Secrets** (see the root `SELF-HOSTING.md`, "The worker").
`CONTACT_EMAIL` is sent in the MusicBrainz `User-Agent` as their API policy requires (an email or a URL); it defaults to the project URL.
