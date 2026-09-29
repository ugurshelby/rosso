# Self-hosting Rosso

About **30 minutes**, **no cost**, no server to babysit afterwards. You will create three free accounts, fill in one env file, run one command and click one button.

| You need | Free tier is enough? |
|---|---|
| A **Supabase** account (database, auth, storage, scheduler) | Yes |
| A **Vercel** account (hosts the web app) | Yes (Hobby) |
| A **Spotify** account + a free **developer app** | Yes |
| **Node.js 20+** on your computer | — |
| A **GitHub** account (only for the optional worker) | Yes |

> **Cost check.** Nothing here needs a credit card except optional AI (Google Cloud). Leave AI off and the app runs entirely on free tiers.

---

## 1. Get the code

```bash
git clone https://github.com/ugurshelby/rosso.git
cd rosso/web
npm install
```

(Prefer to fork first if you want your own copy on GitHub — recommended if you'll use the optional worker.)

## 2. Create the Supabase project

1. <https://supabase.com/dashboard> → **New project**. Pick a region close to you and a strong database password (save it).
2. Wait until the project is ready, then collect:
   - **Project URL** and **anon (publishable) key** — *Project Settings → API*
   - **service_role key** — same page (keep it secret; it never goes to the browser)
   - **Connection string** — click **Connect** at the top → **Session pooler** → copy the `postgresql://…` string and replace `[YOUR-PASSWORD]` with your database password.
3. *Authentication → Providers → Email*: keep it enabled. For a private single-user install you may switch **Confirm email** off (otherwise Supabase's built-in mailer sends the confirmation mail; it is rate-limited but fine for one person).

## 3. Fill in `web/.env.local`

```bash
cp .env.example .env.local
```

Set at least these:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `DATABASE_URL` | the Session-pooler connection string (used **only** by the install script) |
| `NEXT_PUBLIC_APP_URL` | where the app will live, **no trailing slash**, e.g. `https://my-rosso.vercel.app` (choose the Vercel project name now: `https://<name>.vercel.app`) |
| `TOKEN_ENCRYPTION_KEY` | 32+ random characters (encrypts Spotify tokens): `openssl rand -hex 32` |
| `CRON_SECRET` | random string, 24+ chars — the scheduler and the app share it: `openssl rand -hex 32` |
| `WORKER_SHARED_SECRET` | another random string |

Everything else is optional (see comments in `.env.example`).

## 4. Install the database

```bash
npm run kur
```

This applies the whole schema (67 tables, RLS, functions, storage buckets, the sign-up gate), stores `app_url` and `cron_secret` in Supabase Vault, and schedules the background jobs with `pg_cron` (Spotify sync, recap refresh, mood playlists, catalog upkeep, log cleanup). It refuses to run on a database that already has Rosso, so it is safe to re-run after a failure on a fresh project.

> If the connection fails, make sure you used the **Session pooler** string, not "Direct connection" (IPv6-only). Some corporate networks block Postgres ports — try from home or a phone hotspot.

## 5. Deploy the app to Vercel

Click **Deploy with Vercel** in the README, or import the repo manually:

- **Root Directory:** `web`
- **Environment variables:** enter the same values as your `.env.local` (all of the table in step 3 except `DATABASE_URL`, which the app does not need).
- Use the project name you chose in step 3 so `NEXT_PUBLIC_APP_URL` is correct. If the URL differs, fix `NEXT_PUBLIC_APP_URL` in Vercel **and** re-run this in the SQL editor:

```sql
select vault.update_secret((select id from vault.secrets where name = 'app_url'), 'https://YOUR-REAL-URL');
```

## 6. Tell Supabase where your site lives

*Supabase → Authentication → URL Configuration*
- **Site URL:** your app URL
- **Redirect URLs:** add `https://YOUR-APP/api/auth/callback`

## 7. Create your account (you become the owner)

Open your site → **Register**. The very first account on a fresh install becomes the **owner**; after that sign-ups are closed for everyone except people you invite (Settings → *Invite a friend*).

## 8. Connect Spotify

You bring your own (free) Spotify developer app — Rosso never shares credentials between installs.

1. <https://developer.spotify.com/dashboard> → **Create app**. Redirect URI: `https://YOUR-APP/api/spotify/callback`. Select *Web API*.
2. In Rosso open **Data** (the setup wizard shows exactly this redirect URI), paste the **Client ID** and **Client Secret**, then connect.
3. In the Spotify dashboard → your app → **User Management**, add the email of *your own* Spotify account (Development Mode only lets listed users through).
4. Optional but recommended: request your **Extended streaming history** at <https://www.spotify.com/account/privacy/> and upload the ZIP on the **Data** page when it arrives (it can take a few days). That is what powers Journey and multi-year Recaps.

Within minutes the scheduler starts syncing your recent plays.

## 9. Optional extras

### Invite a friend
*Settings → Invite a friend* → add their email. Then add the same email in your Spotify dashboard → **User Management** (Spotify has no API for this step). Development Mode allows roughly 25 users; your friends' data lives in *your* database, so only invite people you trust and tell them so.

### The worker (ZIP import + catalog upkeep + backups)
Heavy jobs run in **GitHub Actions**, on demand, so nothing runs 24/7.
1. Use your own copy of this repo (fork).
2. *Settings → Secrets and variables → Actions* → add: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LASTFM_API_KEY` (free at last.fm/api), `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`. For weekly encrypted DB backups also `SUPABASE_DB_URL` and `YEDEK_PAROLA` (a passphrase you keep in a password manager, *not* in Supabase).
3. Create a fine-grained GitHub token limited to your fork with **Contents: read/write** (used for `repository_dispatch`) and set in Vercel: `WORKER_GITHUB_PAT=<token>` and `WORKER_GITHUB_REPO=<you>/<fork>`.

Without the worker, live listening sync and everything except large ZIP imports and catalog cover/genre upkeep still work.

### AI (Gemini on Vertex AI) — optional
Set `GCP_PROJECT_ID` and `GCP_SERVICE_ACCOUNT_JSON` in Vercel. Every AI feature has a fallback, so skipping this loses only editorial copy. To cap spend, `AI_KAPANIS_TARIHI=YYYY-MM-DD` switches AI off automatically on that date (useful when free credits expire).

### Sign-in with Google/Spotify/Apple
See [docs/reference/kimlik-v2-kurulum.md](docs/reference/kimlik-v2-kurulum.md).

---

## Keeping it alive (yearly checklist)

- **Supabase pauses free projects that get no activity for 7 days.** The scheduled jobs run inside the database every few minutes, which should count as activity, but if you ever get a pause warning, open the dashboard and click **Resume** (you have 90 days; nothing is lost).
- Renew your domain if you use a custom one.
- More: [docs/reference/yillik-bakim-kontrol-listesi.md](docs/reference/yillik-bakim-kontrol-listesi.md).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `npm run kur` cannot connect | Used "Direct connection" instead of **Session pooler**, wrong password, or a network that blocks Postgres |
| Sign-up says "check the details" | Sign-up is invite-only and an owner already exists — ask the owner to invite your email |
| Spotify says "not registered for this application" | Add the account under *User Management* in the Spotify developer dashboard |
| Login mail never arrives | Turn off *Confirm email* (single user) or configure custom SMTP in Supabase |
| Nothing syncs | `app_url`/`cron_secret` in Vault don't match Vercel (`select * from cron.job_run_details order by start_time desc limit 5;` shows cron activity; `select * from net._http_response order by created desc limit 5;` shows the responses) |
