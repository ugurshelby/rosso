-- Rosso — tam veritabanı şeması (public + gerekli storage/cron tanımları)
--
-- Üretim: canlı Rosso veritabanından (pg_catalog) 2026-09-29'da türetildi; 358 migration'ın son hâlidir.
-- Boş bir Supabase projesine TEK SEFERDE uygulanır (bkz. SELF-HOSTING.md — `node scripts/kur.mjs`).
--
-- NOT: Sosyal katman (takip/mesaj/keşfet) bilerek YOKTUR — ürün kişisel Rosso'dur.
-- Cron tanımları bu dosyada DEĞİL, supabase/cron.sql.tmpl içindedir (kurulum betiği doldurur).

SET statement_timeout = 0;
SET check_function_bodies = off;
SET client_min_messages = warning;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS supabase_vault;


-- ─── Tablolar ───

CREATE TABLE public.account_deletions (
  user_id uuid NOT NULL,
  deleted_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_by text NOT NULL,
  deleted_reason text
);

CREATE TABLE public.ai_generation_logs (
  generation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  feature text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  input_hash text NOT NULL,
  prompt_tokens integer DEFAULT 0 NOT NULL,
  output_tokens integer DEFAULT 0 NOT NULL,
  total_tokens integer DEFAULT 0 NOT NULL,
  latency_ms integer DEFAULT 0 NOT NULL,
  estimated_cost numeric(12,6),
  status text NOT NULL,
  error_message text,
  output_payload jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  cached_tokens integer DEFAULT 0 NOT NULL,
  attempts integer DEFAULT 1 NOT NULL,
  error_code text,
  model_version text
);

CREATE TABLE public.ai_model_pricing (
  model text NOT NULL,
  input_usd_per_1m numeric(12,6) NOT NULL,
  output_usd_per_1m numeric(12,6) NOT NULL,
  dogrulandi_at date NOT NULL,
  kaynak text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  cached_input_usd_per_1m numeric(12,6)
);

CREATE TABLE public.ai_usage_counter (
  gun date NOT NULL,
  operation text NOT NULL,
  cagri_sayisi integer DEFAULT 0 NOT NULL,
  hata_sayisi integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.algo_params (
  key text NOT NULL,
  value real NOT NULL,
  measured_at timestamp with time zone DEFAULT now() NOT NULL,
  note text
);

CREATE TABLE public.api_budgets (
  scope text NOT NULL,
  used integer DEFAULT 0 NOT NULL,
  budget integer NOT NULL,
  window_start timestamp with time zone DEFAULT now() NOT NULL,
  window_seconds integer DEFAULT 86400 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.api_cooldowns (
  provider text NOT NULL,
  blocked_until timestamp with time zone,
  reason text,
  hit_count integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.artists (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  genre_data jsonb,
  genres text[],
  genre_source text,
  genre_lookup_failed_at timestamp with time zone,
  refreshed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text,
  deezer_image_url text,
  image_kaynagi text,
  deezer_kapak_denendi_at timestamp with time zone
);

CREATE TABLE public.auto_playlist_rules (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  rule_type text NOT NULL,
  track_count integer DEFAULT 50 NOT NULL,
  target_platforms text[] DEFAULT '{}'::text[] NOT NULL,
  name_format text DEFAULT '{month} - {year}'::text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sort_by text DEFAULT 'plays'::text NOT NULL
);

CREATE TABLE public.auto_playlist_runs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  rule_id uuid NOT NULL,
  generated_playlist_id text,
  platform text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  track_count integer DEFAULT 0 NOT NULL,
  error_message text,
  ran_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.car_sessions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  connected_at timestamp with time zone NOT NULL,
  disconnected_at timestamp with time zone,
  duration_seconds integer,
  import_job_id uuid
);

CREATE TABLE public.catalog_ai_enrichment (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL,
  primary_genre text NOT NULL,
  subgenres text[] DEFAULT '{}'::text[] NOT NULL,
  moods text[] DEFAULT '{}'::text[] NOT NULL,
  vibe text[] DEFAULT '{}'::text[] NOT NULL,
  energy_character text,
  tempo_character text,
  sonic_character text[] DEFAULT '{}'::text[] NOT NULL,
  language text,
  era_context text,
  confidence_score real NOT NULL,
  enrichment_version integer DEFAULT 1 NOT NULL,
  model_used text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cron_kullanici_sirasi (
  is_adi text NOT NULL,
  user_id uuid NOT NULL,
  son_tamamlanma timestamp with time zone,
  kilit_bitis timestamp with time zone,
  son_hata text,
  ardisik_hata integer DEFAULT 0 NOT NULL,
  guncellendi timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.demo_personalar (
  kod text NOT NULL,
  user_id uuid NOT NULL,
  aciklama text,
  olusturuldu timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.editorial_notes (
  user_id uuid NOT NULL,
  kind text NOT NULL,
  scope text NOT NULL,
  body jsonb NOT NULL,
  input_hash text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.editorial_tag_pool (
  slug text NOT NULL,
  category text NOT NULL,
  label_tr text NOT NULL,
  label_en text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.export_jobs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'queued'::text NOT NULL,
  export_type text,
  file_name text,
  file_path text,
  file_size bigint,
  total_events integer DEFAULT 0,
  processed_events integer DEFAULT 0,
  matched_events integer DEFAULT 0,
  skipped_events integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_message text,
  recovery_queued_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  genre_pending boolean DEFAULT false NOT NULL,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  pipeline_step text
);

CREATE TABLE public.izinli_eposta (
  email text NOT NULL,
  sahip boolean DEFAULT false NOT NULL,
  ekleyen uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journey_arc (
  user_id uuid NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journey_ritual_answers (
  user_id uuid NOT NULL,
  question_key text NOT NULL,
  year integer NOT NULL,
  answered_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journey_year_milestones (
  user_id uuid NOT NULL,
  year integer NOT NULL,
  career text[] NOT NULL,
  love text[] NOT NULL,
  social text[] NOT NULL,
  vibe text[] NOT NULL,
  answered_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journey_year_pkg (
  user_id uuid NOT NULL,
  year integer NOT NULL,
  payload jsonb NOT NULL,
  tz text DEFAULT 'Europe/Istanbul'::text NOT NULL,
  is_closed boolean DEFAULT false NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.kullanici_animasyonlari (
  user_id uuid NOT NULL,
  anahtar text NOT NULL,
  gorulme_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.liked_songs_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  spotify_uri text,
  event_type text NOT NULL,
  occurred_at timestamp with time zone NOT NULL,
  import_job_id uuid,
  platform text DEFAULT 'spotify'::text NOT NULL,
  external_id text
);

CREATE TABLE public.maintenance_watermark (
  job_key text NOT NULL,
  last_scan_at timestamp with time zone DEFAULT to_timestamp((0)::double precision) NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.migration_jobs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  source text NOT NULL,
  target text NOT NULL,
  playlist_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  matched integer DEFAULT 0 NOT NULL,
  total integer DEFAULT 0 NOT NULL,
  unmatched jsonb DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  debug_log jsonb
);

CREATE TABLE public.migration_queue (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  playlist_id uuid NOT NULL,
  source text NOT NULL,
  target text NOT NULL,
  playlist_name text NOT NULL,
  status text DEFAULT 'queued'::text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  total_tracks integer DEFAULT 0 NOT NULL,
  done_tracks integer DEFAULT 0 NOT NULL,
  failed_tracks integer DEFAULT 0 NOT NULL,
  target_playlist_id text,
  auto_sync boolean DEFAULT false NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_batch_at timestamp with time zone
);

CREATE TABLE public.migration_queue_items (
  queue_id uuid NOT NULL,
  track_id uuid NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  target_id text,
  reason text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.mood_definitions (
  mood_key text NOT NULL,
  energy_allow text[] DEFAULT '{}'::text[] NOT NULL,
  energy_ideal text[] DEFAULT '{}'::text[] NOT NULL,
  pozitif_tags text[] DEFAULT '{}'::text[] NOT NULL,
  negatif_tags text[] DEFAULT '{}'::text[] NOT NULL,
  enstrumantal text DEFAULT 'none'::text NOT NULL,
  kimlik text NOT NULL,
  olmali text NOT NULL,
  olmamali text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  pozitif_genres text[] DEFAULT '{}'::text[] NOT NULL,
  negatif_genres text[] DEFAULT '{}'::text[] NOT NULL
);

CREATE TABLE public.mood_kural (
  mood_key text NOT NULL,
  hedef_tur text NOT NULL,
  hedef text NOT NULL,
  karar smallint NOT NULL,
  aciklama text,
  kaynak text DEFAULT 'human'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.mood_pkg (
  user_id uuid NOT NULL,
  mood_key text NOT NULL,
  payload jsonb NOT NULL,
  tz text DEFAULT 'Europe/Istanbul'::text NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.mood_tag_sozlugu (
  ham text NOT NULL,
  kanonik text NOT NULL
);

CREATE TABLE public.mood_track_feedback (
  user_id uuid NOT NULL,
  mood_key text NOT NULL,
  track_id uuid NOT NULL,
  etiket text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.mood_workspace (
  user_id uuid NOT NULL,
  mood_key text NOT NULL,
  hidden_track_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  exported_at timestamp with time zone,
  exported_playlist_id text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  weekly_sync_enabled boolean DEFAULT false NOT NULL,
  approved_track_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL
);

CREATE TABLE public.pipeline_runs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  run_type text NOT NULL,
  job_id uuid,
  outcome text NOT NULL,
  stats jsonb,
  error text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.platform_connections (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires timestamp with time zone,
  connected_at timestamp with time zone DEFAULT now(),
  last_synced_at timestamp with time zone,
  is_active boolean DEFAULT true,
  export_imported boolean DEFAULT false,
  export_imported_at timestamp with time zone,
  export_covers_from timestamp with time zone,
  export_covers_until timestamp with time zone,
  music_user_token text,
  apple_reauth_required boolean DEFAULT false NOT NULL,
  storefront text,
  subscription_active boolean,
  last_recently_played_sync_at timestamp with time zone,
  spotify_email text,
  spotify_user_id text,
  oauth_client_id text
);

CREATE TABLE public.play_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  played_at timestamp with time zone NOT NULL,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  platform text DEFAULT 'spotify'::text NOT NULL,
  source text DEFAULT 'spotify_export'::text NOT NULL,
  ms_played integer NOT NULL,
  conn_country text,
  reason_start text,
  reason_end text,
  shuffle boolean,
  skipped boolean DEFAULT false,
  offline boolean DEFAULT false,
  incognito_mode boolean DEFAULT false
);

CREATE TABLE public.playlist_track_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  track_uri text NOT NULL,
  playlist_uri text NOT NULL,
  added_at timestamp with time zone NOT NULL,
  platform text,
  import_job_id uuid
);

CREATE TABLE public.playlist_tracks (
  playlist_id uuid NOT NULL,
  track_id uuid NOT NULL,
  "position" integer NOT NULL,
  added_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.playlists (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  platform_id text,
  name text NOT NULL,
  description text,
  track_count integer DEFAULT 0,
  is_public boolean DEFAULT false,
  snapshot_id text,
  cover_url text,
  synced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text
);

CREATE TABLE public.podcast_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  played_at timestamp with time zone NOT NULL,
  user_id uuid NOT NULL,
  content_type text DEFAULT 'podcast'::text NOT NULL,
  episode_name text,
  episode_show_name text,
  spotify_episode_uri text,
  audiobook_title text,
  audiobook_uri text,
  platform text DEFAULT 'spotify'::text NOT NULL,
  source text DEFAULT 'spotify_export'::text NOT NULL,
  ms_played integer NOT NULL,
  skipped boolean DEFAULT false,
  offline boolean DEFAULT false
);

CREATE TABLE public.recaps (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  period_type text NOT NULL,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.spotify_allowlist_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  spotify_email text,
  spotify_user_id text,
  status text DEFAULT 'pending'::text NOT NULL,
  note text,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  approved_at timestamp with time zone,
  activated_at timestamp with time zone
);

CREATE TABLE public.spotify_byoc_credentials (
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sync_rules (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  playlist_id uuid NOT NULL,
  target_platforms text[] DEFAULT '{}'::text[] NOT NULL,
  conflict_policy text DEFAULT 'source_wins'::text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sync_runs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  rule_id uuid NOT NULL,
  status text DEFAULT 'running'::text NOT NULL,
  added integer DEFAULT 0 NOT NULL,
  removed integer DEFAULT 0 NOT NULL,
  skipped_removals integer DEFAULT 0 NOT NULL,
  errors integer DEFAULT 0 NOT NULL,
  ran_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.system_logs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  operation text NOT NULL,
  platform text,
  error_code text,
  error_message text,
  severity text DEFAULT 'info'::text NOT NULL,
  related_id text,
  metadata jsonb
);

CREATE TABLE public.track_spotify_alias (
  spotify_id text NOT NULL,
  track_id uuid NOT NULL,
  kaynak text DEFAULT 'merge'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tracks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  isrc text,
  title text NOT NULL,
  artists text[] NOT NULL,
  album text,
  duration_ms integer,
  spotify_id text,
  apple_id text,
  yt_video_id text,
  genres text[],
  release_year integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  spotify_artist_ids text[],
  genre_lookup_failed_at timestamp with time zone,
  genre_data jsonb,
  genre_source text,
  genre_pending_reason text,
  catalog_backfill_at timestamp with time zone,
  image_url text,
  deezer_image_url text,
  image_kaynagi text,
  deezer_kapak_denendi_at timestamp with time zone
);

CREATE TABLE public.user_consents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL,
  granted_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_export_signals (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  signal_source text NOT NULL,
  signal_data jsonb NOT NULL,
  imported_at timestamp with time zone DEFAULT now(),
  export_job_id uuid
);

CREATE TABLE public.user_genre_vectors (
  user_id uuid NOT NULL,
  vector jsonb DEFAULT '{}'::jsonb NOT NULL,
  dominant_genre text,
  contributing_tracks integer DEFAULT 0 NOT NULL,
  computed_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_listening_summary_cache (
  user_id uuid NOT NULL,
  total_ms bigint DEFAULT 0 NOT NULL,
  total_tracks bigint DEFAULT 0 NOT NULL,
  total_artists bigint DEFAULT 0 NOT NULL,
  refreshed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_music_intelligence (
  user_id uuid NOT NULL,
  night_ratio real,
  repeat_intensity real,
  skip_rate real,
  album_orientation real,
  toplam_calma integer DEFAULT 0 NOT NULL,
  sonic_affinities text[] DEFAULT '{}'::text[] NOT NULL,
  genre_core text[] DEFAULT '{}'::text[] NOT NULL,
  genre_peripheral text[] DEFAULT '{}'::text[] NOT NULL,
  avoided_signatures text[] DEFAULT '{}'::text[] NOT NULL,
  listening_habits jsonb,
  musical_paradox text,
  ai_model_used text,
  ai_generated_at timestamp with time zone,
  computed_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_pattern_pkg (
  user_id uuid NOT NULL,
  payload jsonb NOT NULL,
  tz text DEFAULT 'Europe/Istanbul'::text NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_period_pkg (
  user_id uuid NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_phase_announcements (
  user_id uuid NOT NULL,
  phase smallint NOT NULL,
  content_version smallint DEFAULT 1 NOT NULL,
  seen_at timestamp with time zone,
  snoozed_until timestamp with time zone,
  dismissed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_phase_overrides (
  user_id uuid NOT NULL,
  forced_phase smallint NOT NULL,
  reason text NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_plans (
  user_id uuid NOT NULL,
  plan text DEFAULT 'free'::text NOT NULL,
  is_locked boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_preferences (
  user_id uuid NOT NULL,
  include_incognito boolean DEFAULT false NOT NULL,
  collaborative_sync boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  locale text
);

CREATE TABLE public.user_saved_library (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  spotify_uri text NOT NULL,
  name text,
  platform text DEFAULT 'spotify'::text NOT NULL,
  import_job_id uuid,
  imported_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_stats_pkg (
  user_id uuid NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_taste_pkg (
  user_id uuid NOT NULL,
  payload jsonb NOT NULL,
  tz text DEFAULT 'Europe/Istanbul'::text NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_taste_profile (
  user_id uuid NOT NULL,
  intentionality numeric,
  impatience numeric,
  shuffle_reliance numeric,
  completion_loyalty numeric,
  peak_hour integer,
  is_night_owl boolean,
  country_diversity integer,
  exploration_rate numeric,
  entropy numeric,
  mainstream_ness numeric,
  mainstream_source text,
  identity_words text[] DEFAULT '{}'::text[] NOT NULL,
  has_l2 boolean DEFAULT false NOT NULL,
  has_l3 boolean DEFAULT false NOT NULL,
  genre_coverage_pct numeric DEFAULT 0 NOT NULL,
  is_mature boolean DEFAULT false NOT NULL,
  computed_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_top_strips (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  strip text NOT NULL,
  rank integer NOT NULL,
  merge_key text NOT NULL,
  track_id uuid,
  title text,
  artist text,
  weight numeric DEFAULT 0 NOT NULL,
  is_hidden boolean DEFAULT false NOT NULL,
  computed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_track_weights (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  merge_key text NOT NULL,
  representative_track_id uuid,
  title text,
  artist text,
  play_count integer DEFAULT 0 NOT NULL,
  raw_weight numeric DEFAULT 0 NOT NULL,
  decayed_weight numeric DEFAULT 0 NOT NULL,
  is_evergreen boolean DEFAULT false NOT NULL,
  final_weight numeric DEFAULT 0 NOT NULL,
  first_played_at timestamp with time zone,
  last_played_at timestamp with time zone,
  computed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.year_pkg (
  user_id uuid NOT NULL,
  year integer NOT NULL,
  payload jsonb NOT NULL,
  cover_url text,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Birincil/benzersiz/check kısıtları ───

ALTER TABLE ONLY public.account_deletions ADD CONSTRAINT account_deletions_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_attempts_check CHECK ((attempts >= 1));

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_cached_tokens_check CHECK ((cached_tokens >= 0));

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_latency_ms_check CHECK ((latency_ms >= 0));

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_output_tokens_check CHECK ((output_tokens >= 0));

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_pkey PRIMARY KEY (generation_id);

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_prompt_tokens_check CHECK ((prompt_tokens >= 0));

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'fallback_triggered'::text, 'error'::text])));

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_total_tokens_check CHECK ((total_tokens >= 0));

ALTER TABLE ONLY public.ai_model_pricing ADD CONSTRAINT ai_model_pricing_cached_input_usd_per_1m_check CHECK (((cached_input_usd_per_1m IS NULL) OR (cached_input_usd_per_1m >= (0)::numeric)));

ALTER TABLE ONLY public.ai_model_pricing ADD CONSTRAINT ai_model_pricing_input_usd_per_1m_check CHECK ((input_usd_per_1m >= (0)::numeric));

ALTER TABLE ONLY public.ai_model_pricing ADD CONSTRAINT ai_model_pricing_output_usd_per_1m_check CHECK ((output_usd_per_1m >= (0)::numeric));

ALTER TABLE ONLY public.ai_model_pricing ADD CONSTRAINT ai_model_pricing_pkey PRIMARY KEY (model);

ALTER TABLE ONLY public.ai_usage_counter ADD CONSTRAINT ai_usage_counter_pkey PRIMARY KEY (gun, operation);

ALTER TABLE ONLY public.algo_params ADD CONSTRAINT algo_params_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.api_budgets ADD CONSTRAINT api_budgets_pkey PRIMARY KEY (scope);

ALTER TABLE ONLY public.api_cooldowns ADD CONSTRAINT api_cooldowns_pkey PRIMARY KEY (provider);

ALTER TABLE ONLY public.artists ADD CONSTRAINT artists_image_kaynagi_check CHECK (((image_kaynagi IS NULL) OR (image_kaynagi = ANY (ARRAY['spotify'::text, 'deezer'::text]))));

ALTER TABLE ONLY public.artists ADD CONSTRAINT artists_name_normalized_key UNIQUE (name_normalized);

ALTER TABLE ONLY public.artists ADD CONSTRAINT artists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auto_playlist_rules ADD CONSTRAINT auto_playlist_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auto_playlist_rules ADD CONSTRAINT auto_playlist_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['top_month'::text, 'top_year'::text, 'morning_routine'::text, 'nostalgia'::text, 'most_skipped'::text, 'obsession'::text])));

ALTER TABLE ONLY public.auto_playlist_rules ADD CONSTRAINT auto_playlist_rules_sort_by_check CHECK ((sort_by = ANY (ARRAY['plays'::text, 'duration'::text])));

ALTER TABLE ONLY public.auto_playlist_rules ADD CONSTRAINT auto_playlist_rules_track_count_check CHECK ((track_count = ANY (ARRAY[20, 50, 100])));

ALTER TABLE ONLY public.auto_playlist_runs ADD CONSTRAINT auto_playlist_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auto_playlist_runs ADD CONSTRAINT auto_playlist_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'partial'::text, 'failed'::text])));

ALTER TABLE ONLY public.car_sessions ADD CONSTRAINT car_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT career_len CHECK (((array_length(career, 1) >= 1) AND (array_length(career, 1) <= 2)));

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT career_vals CHECK ((career <@ ARRAY['focused'::text, 'chaotic'::text, 'static'::text, 'searching'::text, 'new_start'::text, 'burnt_out'::text]));

ALTER TABLE ONLY public.catalog_ai_enrichment ADD CONSTRAINT catalog_ai_enrichment_confidence_score_check CHECK (((confidence_score >= (0.0)::double precision) AND (confidence_score <= (1.0)::double precision)));

ALTER TABLE ONLY public.catalog_ai_enrichment ADD CONSTRAINT catalog_ai_enrichment_energy_character_check CHECK ((energy_character = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'explosive'::text])));

ALTER TABLE ONLY public.catalog_ai_enrichment ADD CONSTRAINT catalog_ai_enrichment_item_id_item_type_key UNIQUE (item_id, item_type);

ALTER TABLE ONLY public.catalog_ai_enrichment ADD CONSTRAINT catalog_ai_enrichment_item_type_check CHECK ((item_type = ANY (ARRAY['track'::text, 'artist'::text, 'album'::text])));

ALTER TABLE ONLY public.catalog_ai_enrichment ADD CONSTRAINT catalog_ai_enrichment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.catalog_ai_enrichment ADD CONSTRAINT catalog_ai_enrichment_tempo_character_check CHECK ((tempo_character = ANY (ARRAY['slow'::text, 'mid-tempo'::text, 'up-tempo'::text, 'variable'::text])));

ALTER TABLE ONLY public.cron_kullanici_sirasi ADD CONSTRAINT cron_kullanici_sirasi_pkey PRIMARY KEY (is_adi, user_id);

ALTER TABLE ONLY public.demo_personalar ADD CONSTRAINT demo_personalar_kod_bicimi CHECK ((kod ~ '^[a-z0-9][a-z0-9_-]{1,31}$'::text));

ALTER TABLE ONLY public.demo_personalar ADD CONSTRAINT demo_personalar_pkey PRIMARY KEY (kod);

ALTER TABLE ONLY public.demo_personalar ADD CONSTRAINT demo_personalar_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.editorial_notes ADD CONSTRAINT editorial_notes_kind_check CHECK ((kind = ANY (ARRAY['recap_character'::text, 'journey_years'::text, 'liner_note'::text, 'taste_identity'::text, 'journey_finale'::text])));

ALTER TABLE ONLY public.editorial_notes ADD CONSTRAINT editorial_notes_pkey PRIMARY KEY (user_id, kind, scope);

ALTER TABLE ONLY public.editorial_notes ADD CONSTRAINT editorial_notes_scope_check CHECK (((char_length(scope) >= 1) AND (char_length(scope) <= 80)));

ALTER TABLE ONLY public.editorial_tag_pool ADD CONSTRAINT editorial_tag_pool_category_check CHECK ((category = ANY (ARRAY['genre'::text, 'mood'::text, 'tempo'::text, 'character'::text, 'period'::text])));

ALTER TABLE ONLY public.editorial_tag_pool ADD CONSTRAINT editorial_tag_pool_label_en_check CHECK (((char_length(label_en) >= 2) AND (char_length(label_en) <= 28)));

ALTER TABLE ONLY public.editorial_tag_pool ADD CONSTRAINT editorial_tag_pool_label_tr_check CHECK (((char_length(label_tr) >= 2) AND (char_length(label_tr) <= 28)));

ALTER TABLE ONLY public.editorial_tag_pool ADD CONSTRAINT editorial_tag_pool_pkey PRIMARY KEY (slug);

ALTER TABLE ONLY public.editorial_tag_pool ADD CONSTRAINT editorial_tag_pool_slug_check CHECK (((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text) AND (char_length(slug) <= 40)));

ALTER TABLE ONLY public.export_jobs ADD CONSTRAINT export_jobs_export_type_check CHECK ((export_type = ANY (ARRAY['streaming_history'::text, 'account_data'::text, 'technical_log'::text, 'mixed'::text, 'unknown'::text])));

ALTER TABLE ONLY public.export_jobs ADD CONSTRAINT export_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.export_jobs ADD CONSTRAINT export_jobs_status_check CHECK ((status = ANY (ARRAY['uploading'::text, 'queued'::text, 'processing'::text, 'completed'::text, 'failed'::text])));

ALTER TABLE ONLY public.izinli_eposta ADD CONSTRAINT izinli_eposta_email_check CHECK ((email = lower(btrim(email))));

ALTER TABLE ONLY public.izinli_eposta ADD CONSTRAINT izinli_eposta_pkey PRIMARY KEY (email);

ALTER TABLE ONLY public.journey_arc ADD CONSTRAINT journey_arc_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.journey_ritual_answers ADD CONSTRAINT journey_ritual_answers_pkey PRIMARY KEY (user_id, question_key, year);

ALTER TABLE ONLY public.journey_ritual_answers ADD CONSTRAINT journey_ritual_answers_question_key_check CHECK ((question_key = ANY (ARRAY['career_peak'::text, 'lost_year'::text, 'found_year'::text, 'love_year'::text, 'inward_year'::text])));

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT journey_year_milestones_pkey PRIMARY KEY (user_id, year);

ALTER TABLE ONLY public.journey_year_pkg ADD CONSTRAINT journey_year_pkg_pkey PRIMARY KEY (user_id, year);

ALTER TABLE ONLY public.kullanici_animasyonlari ADD CONSTRAINT kullanici_animasyonlari_anahtar_bicimi CHECK ((anahtar ~ '^[a-z0-9][a-z0-9:_-]{2,63}$'::text));

ALTER TABLE ONLY public.kullanici_animasyonlari ADD CONSTRAINT kullanici_animasyonlari_pkey PRIMARY KEY (user_id, anahtar);

ALTER TABLE ONLY public.liked_songs_events ADD CONSTRAINT liked_songs_events_dedup_platform_unique UNIQUE (user_id, platform, external_id, event_type);

ALTER TABLE ONLY public.liked_songs_events ADD CONSTRAINT liked_songs_events_event_type_check CHECK ((event_type = ANY (ARRAY['liked'::text, 'unliked'::text])));

ALTER TABLE ONLY public.liked_songs_events ADD CONSTRAINT liked_songs_events_has_identifier CHECK (((spotify_uri IS NOT NULL) OR (external_id IS NOT NULL)));

ALTER TABLE ONLY public.liked_songs_events ADD CONSTRAINT liked_songs_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.liked_songs_events ADD CONSTRAINT liked_songs_events_platform_check CHECK ((platform = ANY (ARRAY['spotify'::text, 'apple_music'::text, 'yt_music'::text])));

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT love_len CHECK (((array_length(love, 1) >= 1) AND (array_length(love, 1) <= 2)));

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT love_vals CHECK ((love <@ ARRAY['stormy'::text, 'peaceful'::text, 'lone_wolf'::text, 'complicated'::text, 'new_love'::text, 'healing'::text]));

ALTER TABLE ONLY public.maintenance_watermark ADD CONSTRAINT maintenance_watermark_pkey PRIMARY KEY (job_key);

ALTER TABLE ONLY public.migration_jobs ADD CONSTRAINT migration_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.migration_jobs ADD CONSTRAINT migration_jobs_source_check CHECK ((source = ANY (ARRAY['spotify'::text, 'apple_music'::text, 'yt_music'::text])));

ALTER TABLE ONLY public.migration_jobs ADD CONSTRAINT migration_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'partial'::text])));

ALTER TABLE ONLY public.migration_jobs ADD CONSTRAINT migration_jobs_target_check CHECK ((target = ANY (ARRAY['spotify'::text, 'apple_music'::text, 'yt_music'::text])));

ALTER TABLE ONLY public.migration_queue_items ADD CONSTRAINT migration_queue_items_pkey PRIMARY KEY (queue_id, track_id);

ALTER TABLE ONLY public.migration_queue ADD CONSTRAINT migration_queue_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mood_definitions ADD CONSTRAINT mood_definitions_enstrumantal_check CHECK ((enstrumantal = ANY (ARRAY['require'::text, 'prefer'::text, 'none'::text])));

ALTER TABLE ONLY public.mood_definitions ADD CONSTRAINT mood_definitions_pkey PRIMARY KEY (mood_key);

ALTER TABLE ONLY public.mood_kural ADD CONSTRAINT mood_kural_hedef_tur_check CHECK ((hedef_tur = ANY (ARRAY['artist'::text, 'genre'::text, 'track'::text])));

ALTER TABLE ONLY public.mood_kural ADD CONSTRAINT mood_kural_karar_check CHECK ((((karar >= '-2'::integer) AND (karar <= 2)) AND (karar <> 0)));

ALTER TABLE ONLY public.mood_kural ADD CONSTRAINT mood_kural_kaynak_check CHECK ((kaynak = ANY (ARRAY['human'::text, 'geri_bildirim'::text])));

ALTER TABLE ONLY public.mood_kural ADD CONSTRAINT mood_kural_pkey PRIMARY KEY (mood_key, hedef_tur, hedef);

ALTER TABLE ONLY public.mood_pkg ADD CONSTRAINT mood_pkg_pkey PRIMARY KEY (user_id, mood_key);

ALTER TABLE ONLY public.mood_tag_sozlugu ADD CONSTRAINT mood_tag_sozlugu_pkey PRIMARY KEY (ham);

ALTER TABLE ONLY public.mood_track_feedback ADD CONSTRAINT mood_track_feedback_etiket_gecerli CHECK ((etiket = ANY (ARRAY['alakasiz'::text, 'alakali_sevmedim'::text, 'uygun'::text, 'cok_sevdim'::text])));

ALTER TABLE ONLY public.mood_track_feedback ADD CONSTRAINT mood_track_feedback_key_gecerli CHECK ((mood_key = ANY (ARRAY['quiet_side'::text, 'full_throttle'::text, 'locked_in'::text, 'no_limit'::text, 'closer'::text, 'miles_away'::text, 'gece_217'::text, 'your_day'::text, 'first_light'::text, 'daylight'::text, 'dusk'::text, 'nocturne'::text])));

ALTER TABLE ONLY public.mood_track_feedback ADD CONSTRAINT mood_track_feedback_pkey PRIMARY KEY (user_id, mood_key, track_id);

ALTER TABLE ONLY public.mood_workspace ADD CONSTRAINT mood_workspace_key_gecerli CHECK ((mood_key = ANY (ARRAY['quiet_side'::text, 'full_throttle'::text, 'locked_in'::text, 'no_limit'::text, 'closer'::text, 'miles_away'::text, 'gece_217'::text, 'your_day'::text, 'first_light'::text, 'daylight'::text, 'dusk'::text, 'nocturne'::text])));

ALTER TABLE ONLY public.mood_workspace ADD CONSTRAINT mood_workspace_pkey PRIMARY KEY (user_id, mood_key);

ALTER TABLE ONLY public.migration_queue ADD CONSTRAINT mq_done_le_total CHECK ((done_tracks <= total_tracks));

ALTER TABLE ONLY public.migration_queue ADD CONSTRAINT mq_source_check CHECK ((source = ANY (ARRAY['spotify'::text, 'apple_music'::text, 'yt_music'::text])));

ALTER TABLE ONLY public.migration_queue ADD CONSTRAINT mq_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])));

ALTER TABLE ONLY public.migration_queue ADD CONSTRAINT mq_target_check CHECK ((target = ANY (ARRAY['spotify'::text, 'apple_music'::text, 'yt_music'::text])));

ALTER TABLE ONLY public.migration_queue_items ADD CONSTRAINT mqi_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'added'::text, 'not_found'::text, 'failed'::text])));

ALTER TABLE ONLY public.pipeline_runs ADD CONSTRAINT pipeline_runs_outcome_check CHECK ((outcome = ANY (ARRAY['success'::text, 'blocked'::text, 'empty'::text, 'error'::text, 'partial'::text])));

ALTER TABLE ONLY public.pipeline_runs ADD CONSTRAINT pipeline_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pipeline_runs ADD CONSTRAINT pipeline_runs_run_type_check CHECK ((run_type = ANY (ARRAY['export'::text, 'enrichment'::text, 'spotify_recently_played'::text, 'playlist_refresh'::text, 'nightly_sync'::text, 'ytmusic_liked'::text, 'ytmusic_history'::text, 'taste_refresh'::text, 'recap_refresh'::text, 'auto_playlist'::text, 'catalog_backfill'::text, 'migration_queue'::text, 'match_batch'::text, 'isrc_backfill'::text, 'cover_backfill'::text, 'account_purge'::text, 'artist_image_backfill'::text, 'journey_pkg'::text, 'taste_pkg'::text, 'pattern_pkg'::text, 'stats_pkg'::text, 'period_pkg'::text, 'mood_pkg'::text, 'playlist_reco_pkg'::text, 'log_cleanup'::text, 'deezer_cover_backfill'::text])));

ALTER TABLE ONLY public.platform_connections ADD CONSTRAINT platform_connections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_connections ADD CONSTRAINT platform_connections_platform_check CHECK ((platform = 'spotify'::text));

ALTER TABLE ONLY public.platform_connections ADD CONSTRAINT platform_connections_user_id_platform_key UNIQUE (user_id, platform);

ALTER TABLE ONLY public.play_events ADD CONSTRAINT play_events_ms_played_check CHECK ((ms_played >= 0));

ALTER TABLE ONLY public.play_events ADD CONSTRAINT play_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.play_events ADD CONSTRAINT play_events_platform_check CHECK ((platform = ANY (ARRAY['spotify'::text, 'apple_music'::text, 'yt_music'::text])));

ALTER TABLE ONLY public.play_events ADD CONSTRAINT play_events_source_check CHECK ((source = ANY (ARRAY['spotify_export'::text, 'api_realtime'::text])));

ALTER TABLE ONLY public.playlist_track_events ADD CONSTRAINT playlist_track_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.playlist_tracks ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (playlist_id, track_id);

ALTER TABLE ONLY public.playlist_tracks ADD CONSTRAINT playlist_tracks_playlist_id_position_key UNIQUE (playlist_id, "position");

ALTER TABLE ONLY public.playlists ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.playlists ADD CONSTRAINT playlists_platform_check CHECK ((platform = ANY (ARRAY['spotify'::text, 'apple_music'::text, 'yt_music'::text, 'rosso'::text])));

ALTER TABLE ONLY public.playlists ADD CONSTRAINT playlists_user_id_platform_platform_id_key UNIQUE (user_id, platform, platform_id);

ALTER TABLE ONLY public.podcast_events ADD CONSTRAINT podcast_events_content_type_check CHECK ((content_type = ANY (ARRAY['podcast'::text, 'audiobook'::text, 'unknown'::text])));

ALTER TABLE ONLY public.podcast_events ADD CONSTRAINT podcast_events_ms_played_check CHECK ((ms_played >= 0));

ALTER TABLE ONLY public.podcast_events ADD CONSTRAINT podcast_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recaps ADD CONSTRAINT recaps_period_type_check CHECK ((period_type = ANY (ARRAY['month'::text, 'year'::text])));

ALTER TABLE ONLY public.recaps ADD CONSTRAINT recaps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recaps ADD CONSTRAINT recaps_user_id_period_type_period_label_key UNIQUE (user_id, period_type, period_label);

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT social_len CHECK (((array_length(social, 1) >= 1) AND (array_length(social, 1) <= 2)));

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT social_vals CHECK ((social <@ ARRAY['lone_ranger'::text, 'crowded'::text, 'safe_harbor'::text, 'selective'::text, 'drifting'::text, 'rebuilding'::text]));

ALTER TABLE ONLY public.spotify_allowlist_requests ADD CONSTRAINT spotify_allowlist_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.spotify_allowlist_requests ADD CONSTRAINT spotify_allowlist_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'active'::text, 'rejected'::text])));

ALTER TABLE ONLY public.spotify_allowlist_requests ADD CONSTRAINT spotify_allowlist_requests_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.spotify_byoc_credentials ADD CONSTRAINT spotify_byoc_client_id_bicimi CHECK (((char_length(client_id) >= 16) AND (char_length(client_id) <= 64)));

ALTER TABLE ONLY public.spotify_byoc_credentials ADD CONSTRAINT spotify_byoc_credentials_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.sync_rules ADD CONSTRAINT sync_rules_conflict_policy_check CHECK ((conflict_policy = ANY (ARRAY['source_wins'::text, 'union'::text, 'manual'::text])));

ALTER TABLE ONLY public.sync_rules ADD CONSTRAINT sync_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sync_rules ADD CONSTRAINT sync_rules_user_id_playlist_id_key UNIQUE (user_id, playlist_id);

ALTER TABLE ONLY public.sync_runs ADD CONSTRAINT sync_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sync_runs ADD CONSTRAINT sync_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'partial'::text, 'failed'::text])));

ALTER TABLE ONLY public.system_logs ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_logs ADD CONSTRAINT system_logs_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warn'::text, 'error'::text, 'critical'::text])));

ALTER TABLE ONLY public.track_spotify_alias ADD CONSTRAINT track_spotify_alias_pkey PRIMARY KEY (spotify_id);

ALTER TABLE ONLY public.tracks ADD CONSTRAINT tracks_apple_id_key UNIQUE (apple_id);

ALTER TABLE ONLY public.tracks ADD CONSTRAINT tracks_image_kaynagi_check CHECK (((image_kaynagi IS NULL) OR (image_kaynagi = ANY (ARRAY['spotify'::text, 'deezer'::text]))));

ALTER TABLE ONLY public.tracks ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tracks ADD CONSTRAINT tracks_spotify_id_key UNIQUE (spotify_id);

ALTER TABLE ONLY public.user_consents ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_consents ADD CONSTRAINT user_consents_user_id_consent_type_key UNIQUE (user_id, consent_type);

ALTER TABLE ONLY public.user_export_signals ADD CONSTRAINT user_export_signals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_export_signals ADD CONSTRAINT user_export_signals_user_id_signal_source_key UNIQUE (user_id, signal_source);

ALTER TABLE ONLY public.user_genre_vectors ADD CONSTRAINT user_genre_vectors_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_listening_summary_cache ADD CONSTRAINT user_listening_summary_cache_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_music_intelligence ADD CONSTRAINT user_music_intelligence_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_pattern_pkg ADD CONSTRAINT user_pattern_pkg_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_period_pkg ADD CONSTRAINT user_period_pkg_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_phase_announcements ADD CONSTRAINT user_phase_announcements_phase_check CHECK (((phase >= 1) AND (phase <= 4)));

ALTER TABLE ONLY public.user_phase_announcements ADD CONSTRAINT user_phase_announcements_pkey PRIMARY KEY (user_id, phase);

ALTER TABLE ONLY public.user_phase_overrides ADD CONSTRAINT user_phase_overrides_forced_phase_check CHECK (((forced_phase >= 1) AND (forced_phase <= 4)));

ALTER TABLE ONLY public.user_phase_overrides ADD CONSTRAINT user_phase_overrides_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_plans ADD CONSTRAINT user_plans_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_plans ADD CONSTRAINT user_plans_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'pro'::text])));

ALTER TABLE ONLY public.user_preferences ADD CONSTRAINT user_preferences_locale_check CHECK (((locale IS NULL) OR (locale = ANY (ARRAY['en'::text, 'tr'::text]))));

ALTER TABLE ONLY public.user_preferences ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_preferences ADD CONSTRAINT user_preferences_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'pending'::text])));

ALTER TABLE ONLY public.user_saved_library ADD CONSTRAINT user_saved_library_item_type_check CHECK ((item_type = ANY (ARRAY['album'::text, 'artist'::text])));

ALTER TABLE ONLY public.user_saved_library ADD CONSTRAINT user_saved_library_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_saved_library ADD CONSTRAINT user_saved_library_user_id_item_type_spotify_uri_key UNIQUE (user_id, item_type, spotify_uri);

ALTER TABLE ONLY public.user_stats_pkg ADD CONSTRAINT user_stats_pkg_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_taste_pkg ADD CONSTRAINT user_taste_pkg_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_taste_profile ADD CONSTRAINT user_taste_profile_mainstream_source_check CHECK ((mainstream_source = ANY (ARRAY['l3_wrapped'::text, 'api_fallback'::text])));

ALTER TABLE ONLY public.user_taste_profile ADD CONSTRAINT user_taste_profile_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_top_strips ADD CONSTRAINT user_top_strips_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_top_strips ADD CONSTRAINT user_top_strips_strip_check CHECK ((strip = ANY (ARRAY['now'::text, 'evergreen'::text])));

ALTER TABLE ONLY public.user_top_strips ADD CONSTRAINT user_top_strips_user_id_strip_rank_key UNIQUE (user_id, strip, rank);

ALTER TABLE ONLY public.user_track_weights ADD CONSTRAINT user_track_weights_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_track_weights ADD CONSTRAINT user_track_weights_user_id_merge_key_key UNIQUE (user_id, merge_key);

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT vibe_len CHECK (((array_length(vibe, 1) >= 1) AND (array_length(vibe, 1) <= 2)));

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT vibe_vals CHECK ((vibe <@ ARRAY['transformation'::text, 'struggle'::text, 'pause'::text, 'discovery'::text, 'momentum'::text, 'reckoning'::text]));

ALTER TABLE ONLY public.year_pkg ADD CONSTRAINT year_pkg_pkey PRIMARY KEY (user_id, year);

-- ─── Fonksiyonlar ───

CREATE OR REPLACE FUNCTION public.rosso_app_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.rosso_app_url() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._affinity_pct(p_raw real, p_percentile real, p_pool_size integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  -- ⚠ p_percentile ve p_pool_size artik KULLANILMIYOR (imza korunuyor ki
  --   cagiranlar kirilmasin). Rejim anahtari kaldirildi: pool_size=100'de
  --   %12 -> %55 sicramasi vardi.
  SELECT GREATEST(
    COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_min'), 1)::int,
    LEAST(
      COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_max'), 99)::int,
      round(100.0 / (1 + exp(
        -COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_k'), 32.15)::numeric
        * (COALESCE(p_raw,0)::numeric - COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_x0'), 0.1515)::numeric)
      )))::int
    )
  );
$function$
;

CREATE OR REPLACE FUNCTION public._affinity_pct_v2(p_score real)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN p_score IS NULL OR p_score <= 0 THEN NULL
    ELSE GREATEST(
      COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_v2_min'), 5)::int,
      LEAST(
        COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_v2_max'), 95)::int,
        round(100.0 / (1 + exp(
          -COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_v2_k'), 4.5)::numeric
          * (p_score::numeric - COALESCE((SELECT value FROM public.algo_params WHERE key='affinity_v2_x0'), 0.36)::numeric)
        )))::int
      )
    )
  END;
$function$
;

CREATE OR REPLACE FUNCTION public._is_test_profile(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT count(*) FROM public.play_events pe WHERE pe.user_id = p_user_id) < 1000,
    true
  );
$function$
;

CREATE OR REPLACE FUNCTION public._ordered_pair(x uuid, y uuid)
 RETURNS uuid[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN x < y THEN ARRAY[x,y] ELSE ARRAY[y,x] END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_pg_cron_ozeti()
 RETURNS TABLE(jobid bigint, jobname text, schedule text, active boolean, son_baslangic timestamp with time zone, son_durum text, son_mesaj text, son24_basarili integer, son24_basarisiz integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  SELECT
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.active,
    (SELECT max(d.start_time) FROM cron.job_run_details d WHERE d.jobid = j.jobid),
    (SELECT d.status::text FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1),
    (SELECT left(d.return_message, 200) FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1),
    (SELECT count(*)::int FROM cron.job_run_details d WHERE d.jobid = j.jobid AND d.status = 'succeeded' AND d.start_time > now() - interval '24 hours'),
    (SELECT count(*)::int FROM cron.job_run_details d WHERE d.jobid = j.jobid AND d.status = 'failed'    AND d.start_time > now() - interval '24 hours')
  FROM cron.job j
  ORDER BY j.jobid;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_generation_logs_temizle(p_gun integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_silinen int;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.ai_generation_logs
  WHERE created_at < now() - make_interval(days => greatest(p_gun, 7));
  GET DIAGNOSTICS v_silinen = ROW_COUNT;

  RETURN v_silinen;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_gunluk_hata_sayisi(p_operation text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    (SELECT hata_sayisi FROM public.ai_usage_counter
     WHERE gun = current_date AND operation = p_operation), 0);
$function$
;

CREATE OR REPLACE FUNCTION public.ai_hata_kaydet(p_operation text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hata int;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.ai_usage_counter (gun, operation, hata_sayisi, updated_at)
  VALUES (current_date, p_operation, 1, now())
  ON CONFLICT (gun, operation) DO UPDATE
    SET hata_sayisi = public.ai_usage_counter.hata_sayisi + 1,
        updated_at = now()
  RETURNING hata_sayisi INTO v_hata;

  RETURN v_hata;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_kota_tuket(p_operation text, p_gunluk_tavan integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_yeni int;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.ai_usage_counter (gun, operation, cagri_sayisi, updated_at)
  VALUES (current_date, p_operation, 1, now())
  ON CONFLICT (gun, operation) DO UPDATE
    SET cagri_sayisi = public.ai_usage_counter.cagri_sayisi + 1,
        updated_at = now()
  RETURNING cagri_sayisi INTO v_yeni;

  IF v_yeni > p_gunluk_tavan THEN
    UPDATE public.ai_usage_counter
      SET cagri_sayisi = p_gunluk_tavan
    WHERE gun = current_date AND operation = p_operation;
    RETURN false;
  END IF;

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_log_generation(p_feature text, p_model text, p_prompt_version text, p_input_hash text, p_prompt_tokens integer, p_output_tokens integer, p_latency_ms integer, p_status text, p_user_id uuid DEFAULT NULL::uuid, p_error_message text DEFAULT NULL::text, p_output_payload jsonb DEFAULT NULL::jsonb, p_cached_tokens integer DEFAULT 0, p_attempts integer DEFAULT 1, p_error_code text DEFAULT NULL::text, p_model_version text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fiyat   public.ai_model_pricing%ROWTYPE;
  v_prompt  int := greatest(coalesce(p_prompt_tokens, 0), 0);
  -- Önbellek token'ı girdi token'ının ALT kümesidir; tutarsız veri maliyeti bozmasın.
  v_cached  int := least(greatest(coalesce(p_cached_tokens, 0), 0), greatest(coalesce(p_prompt_tokens, 0), 0));
  v_output  int := greatest(coalesce(p_output_tokens, 0), 0);
  v_cost    numeric(12, 6);
  v_id      uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_fiyat FROM public.ai_model_pricing WHERE model = p_model;

  IF FOUND THEN
    v_cost := ((v_prompt - v_cached)::numeric / 1000000) * v_fiyat.input_usd_per_1m
            + (v_cached::numeric / 1000000) * coalesce(v_fiyat.cached_input_usd_per_1m, v_fiyat.input_usd_per_1m)
            + (v_output::numeric / 1000000) * v_fiyat.output_usd_per_1m;
  ELSE
    v_cost := NULL;  -- fiyatı bilinmeyen model: UYDURULMAZ
  END IF;

  INSERT INTO public.ai_generation_logs (
    user_id, feature, model, prompt_version, input_hash,
    prompt_tokens, output_tokens, total_tokens, latency_ms,
    estimated_cost, status, error_message, output_payload,
    cached_tokens, attempts, error_code, model_version
  )
  VALUES (
    p_user_id, p_feature, p_model, p_prompt_version, p_input_hash,
    v_prompt, v_output, v_prompt + v_output,
    greatest(coalesce(p_latency_ms, 0), 0),
    v_cost, p_status, left(p_error_message, 500), p_output_payload,
    v_cached, greatest(coalesce(p_attempts, 1), 1), left(p_error_code, 40), left(p_model_version, 80)
  )
  RETURNING generation_id INTO v_id;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_maliyet_ozeti(p_gun_sayisi integer DEFAULT 30)
 RETURNS TABLE(gun date, feature text, model text, cagri bigint, basarili bigint, hatali bigint, yeniden_denenen bigint, toplam_token bigint, onbellek_token bigint, ort_gecikme_ms integer, p95_gecikme_ms integer, toplam_usd numeric, fiyati_bilinmeyen bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    l.created_at::date,
    l.feature,
    l.model,
    count(*),
    count(*) FILTER (WHERE l.status = 'success'),
    count(*) FILTER (WHERE l.status = 'error'),
    count(*) FILTER (WHERE l.attempts > 1),
    sum(l.total_tokens)::bigint,
    sum(l.cached_tokens)::bigint,
    round(avg(l.latency_ms))::integer,
    round(percentile_cont(0.95) WITHIN GROUP (ORDER BY l.latency_ms))::integer,
    round(sum(l.estimated_cost), 6),
    count(*) FILTER (WHERE l.estimated_cost IS NULL)
  FROM public.ai_generation_logs l
  WHERE l.created_at >= now() - make_interval(days => greatest(p_gun_sayisi, 1))
  GROUP BY 1, 2, 3
  ORDER BY 1 DESC, 12 DESC NULLS LAST;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_catalog_backfill(p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
  v_isrc text;
  v_canonical uuid;
  v_loser uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  with src as (
    select
      (r->>'spotify_id')::text    as spotify_id,
      nullif(r->>'isrc', '')      as isrc,
      (r->>'duration_ms')::int    as duration_ms,
      nullif(r->>'album', '')     as album,
      (r->>'release_year')::int   as release_year
    from jsonb_array_elements(p_rows) as r
    where (r->>'spotify_id') is not null
  )
  update public.tracks t
     set isrc         = coalesce(src.isrc, t.isrc),
         duration_ms  = coalesce(src.duration_ms, t.duration_ms),
         album        = coalesce(src.album, t.album),
         release_year = coalesce(src.release_year, t.release_year),
         catalog_backfill_at = now(),
         updated_at   = now()
    from src
   where t.spotify_id = src.spotify_id;

  get diagnostics v_count = row_count;

  FOR v_isrc IN
    SELECT DISTINCT nullif(r->>'isrc', '')
    FROM jsonb_array_elements(p_rows) AS r
    WHERE nullif(r->>'isrc', '') IS NOT NULL
  LOOP
    IF (SELECT count(*) FROM public.tracks WHERE isrc = v_isrc) > 1 THEN
      SELECT t.id INTO v_canonical
      FROM public.tracks t
      WHERE t.isrc = v_isrc
      ORDER BY (SELECT count(*) FROM public.play_events pe WHERE pe.track_id = t.id) DESC,
               t.created_at ASC
      LIMIT 1;

      FOR v_loser IN SELECT id FROM public.tracks WHERE isrc = v_isrc AND id <> v_canonical LOOP
        PERFORM public.merge_track_into(v_loser, v_canonical);
      END LOOP;
    END IF;
  END LOOP;

  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_liked_songs_weight(p_user_id uuid)
 RETURNS TABLE(inserted_count bigint, skipped_existing bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  like_floor constant numeric := 2.0;
  v_inserted bigint;
  v_total bigint;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  with son_durum as (
    select distinct on (l.spotify_uri) l.spotify_uri, l.event_type, l.occurred_at
    from public.liked_songs_events l
    where l.user_id = p_user_id
    order by l.spotify_uri, l.occurred_at desc
  ),
  aktif as (
    select replace(spotify_uri, 'spotify:track:', '') as sid, occurred_at
    from son_durum
    where event_type = 'liked'
  ),
  eksik as (
    select distinct on (mk)
           t.id as track_id,
           t.title,
           coalesce(t.artists[1], '') as artist,
           a.occurred_at,
           lower(regexp_replace(coalesce(t.title,''), '\s+', ' ', 'g'))
             || '|' || lower(coalesce(t.artists[1],'')) as mk
    from aktif a
    join public.tracks t on t.spotify_id = a.sid
    where not exists (
      select 1 from public.user_track_weights w
      where w.user_id = p_user_id and w.representative_track_id = t.id
    )
    order by mk, a.occurred_at asc
  ),
  eklendi as (
    insert into public.user_track_weights (
      user_id, representative_track_id, merge_key, title, artist,
      play_count, raw_weight, decayed_weight, is_evergreen, final_weight,
      first_played_at, last_played_at
    )
    select
      p_user_id,
      e.track_id,
      e.mk,
      e.title,
      e.artist,
      0,
      like_floor,
      like_floor,
      false,
      like_floor,
      e.occurred_at,
      e.occurred_at
    from eksik e
    on conflict (user_id, merge_key) do nothing
    returning 1
  )
  select (select count(*) from eklendi), (select count(*) from eksik)
  into v_inserted, v_total;

  inserted_count := coalesce(v_inserted, 0);
  skipped_existing := coalesce(v_total, 0) - coalesce(v_inserted, 0);
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.artist_image_backfill_candidates(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, name text, bridge_track_spotify_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := GREATEST(p_limit, 1);
  v_bulundu integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH gorunur AS (
    SELECT
      el->>'name' AS artist_name,
      SUM(COALESCE((el->>'plays')::int, 0)) AS agirlik
    FROM recaps r,
         LATERAL jsonb_array_elements(
           COALESCE(r.payload->'top_artists', '[]'::jsonb)
         ) el
    WHERE el->>'name' IS NOT NULL
    GROUP BY el->>'name'
  ),
  hedef AS (
    SELECT a.id, a.name, g.agirlik
    FROM artists a
    JOIN gorunur g ON g.artist_name = a.name
    WHERE a.image_url IS NULL OR a.image_url = ''
    ORDER BY g.agirlik DESC, a.id
    LIMIT v_limit
  )
  SELECT h.id, h.name, k.spotify_id
  FROM hedef h
  CROSS JOIN LATERAL (
    SELECT t.spotify_id
    FROM tracks t
    WHERE t.artists @> ARRAY[h.name]
      AND t.spotify_id IS NOT NULL
      AND array_length(t.artists, 1) = 1
    LIMIT 1
  ) k
  ORDER BY h.agirlik DESC, h.id;

  GET DIAGNOSTICS v_bulundu = ROW_COUNT;
  v_limit := GREATEST(p_limit, 1) - v_bulundu;
  IF v_limit <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH gorunur_adlar AS (
    SELECT DISTINCT el->>'name' AS artist_name
    FROM recaps r,
         LATERAL jsonb_array_elements(
           COALESCE(r.payload->'top_artists', '[]'::jsonb)
         ) el
    WHERE el->>'name' IS NOT NULL
  ),
  hedef2 AS (
    SELECT a.id, a.name
    FROM artists a
    WHERE (a.image_url IS NULL OR a.image_url = '')
      AND NOT EXISTS (SELECT 1 FROM gorunur_adlar ga WHERE ga.artist_name = a.name)
    ORDER BY a.id
    LIMIT v_limit
  )
  SELECT h.id, h.name, k.spotify_id
  FROM hedef2 h
  CROSS JOIN LATERAL (
    SELECT t.spotify_id
    FROM tracks t
    WHERE t.artists @> ARRAY[h.name]
      AND t.spotify_id IS NOT NULL
      AND array_length(t.artists, 1) = 1
    LIMIT 1
  ) k
  ORDER BY h.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_recap_coverage(p_user_id uuid)
 RETURNS TABLE(expected_periods bigint, stored_periods bigint, missing_labels text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with expected as (
    select p.period_label
    from public.recap_periods_with_data(p_user_id) p
    -- Yalnız TAMAMLANMIŞ dönem beklenir. Cari ay/yıl (period_end bugün veya
    -- gelecekte) recap_runner.is_period_completed() tarafından bilinçli
    -- atlanır; nöbetçi de aynı kuralı uygular ki sahte alarm üretmesin.
    where p.period_end < current_date
  ),
  stored as (
    select r.period_label from public.recaps r where r.user_id = p_user_id
  )
  select
    (select count(*) from expected),
    (select count(*) from stored),
    coalesce(
      array(select e.period_label from expected e
            left join stored s on s.period_label = e.period_label
            where s.period_label is null),
      '{}'::text[]
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_secdef_anon_exec()
 RETURNS TABLE(function_name text, function_args text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.proname::text, pg_get_function_identity_arguments(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
    AND p.proname NOT IN ('__none__')
  ORDER BY p.proname;
$function$
;

CREATE OR REPLACE FUNCTION public.behavior_affinity(a uuid, b uuid)
 RETURNS real
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sa numeric; sb numeric;
  ea numeric; eb numeric;
  ha integer; hb integer;
  d_shuffle real; d_kesif real; d_saat real;
  c_kesif_bant CONSTANT numeric := 0.105;
BEGIN
  SELECT shuffle_reliance, exploration_rate, peak_hour INTO sa, ea, ha
  FROM public.user_taste_profile WHERE user_id = a;
  SELECT shuffle_reliance, exploration_rate, peak_hour INTO sb, eb, hb
  FROM public.user_taste_profile WHERE user_id = b;

  IF sa IS NULL OR sb IS NULL THEN RETURN 0.5; END IF;

  d_shuffle := 1.0 - LEAST(1.0, abs(COALESCE(sa,0) - COALESCE(sb,0)))::real;

  d_kesif := 1.0 - LEAST(1.0,
    abs(COALESCE(ea,0) - COALESCE(eb,0)) / c_kesif_bant)::real;

  IF ha IS NULL OR hb IS NULL THEN
    d_saat := 0.5;
  ELSE
    d_saat := 1.0 - (LEAST(abs(ha - hb), 24 - abs(ha - hb))::real / 12.0);
  END IF;

  RETURN GREATEST(0.0, LEAST(1.0, (d_shuffle + d_kesif + d_saat) / 3.0))::real;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.behavior_similarity(a uuid, b uuid)
 RETURNS real
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH pa AS (SELECT * FROM public.user_taste_profile WHERE user_id = a),
       pb AS (SELECT * FROM public.user_taste_profile WHERE user_id = b),
       farklar AS (
         SELECT
           abs(COALESCE(pa.intentionality,0)     - COALESCE(pb.intentionality,0))     AS d1,
           abs(COALESCE(pa.shuffle_reliance,0)   - COALESCE(pb.shuffle_reliance,0))   AS d2,
           abs(COALESCE(pa.completion_loyalty,0) - COALESCE(pb.completion_loyalty,0)) AS d3,
           abs(COALESCE(pa.exploration_rate,0)   - COALESCE(pb.exploration_rate,0))   AS d4
         FROM pa, pb
       )
  SELECT COALESCE(
    (SELECT 1.0 - LEAST(1.0,
       -- Ortalama fark (Manhattan/4) TEK BASINA yetersiz: tek boyuttaki buyuk
       -- ayriligi 4'e bolerek gizliyor. En buyuk farki da katiyoruz ki
       -- "bir eksende tamamen zit" ciftler ayrissin.
       0.5 * ((d1 + d2 + d3 + d4) / 4.0) + 0.5 * GREATEST(d1, d2, d3, d4)
     ) FROM farklar),
    0.5
  )::real;
$function$
;

CREATE OR REPLACE FUNCTION public.budget_check_and_consume(p_scope text, p_count integer DEFAULT 1)
 RETURNS TABLE(allowed boolean, remaining integer, used integer, budget integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row      public.api_budgets%rowtype;
  v_new_used integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select * into v_row from public.api_budgets where scope = p_scope for update;

  if not found and p_scope ~ '^spotify@[0-9A-Za-z]{8,64}:[a-z_]+$' then
    insert into public.api_budgets (scope, used, budget, window_start, window_seconds, updated_at)
    select p_scope, 0, b.budget, now(), b.window_seconds, now()
      from public.api_budgets b
     where b.scope = regexp_replace(p_scope, '^spotify@[0-9A-Za-z]+:', 'spotify:')
    on conflict (scope) do nothing;
    select * into v_row from public.api_budgets where scope = p_scope for update;
  end if;

  if not found then
    return query select false, 0, 0, 0;
    return;
  end if;

  if now() >= v_row.window_start + make_interval(secs => v_row.window_seconds) then
    v_row.used := 0;
    v_row.window_start := now();
  end if;

  if p_count < 0 then
    v_new_used := greatest(v_row.used + p_count, 0);
    update public.api_budgets
       set used = v_new_used, window_start = v_row.window_start, updated_at = now()
     where scope = p_scope;
    return query
      select true,
             greatest(v_row.budget - v_new_used, 0),
             v_new_used,
             v_row.budget;
    return;
  end if;

  if v_row.used + p_count > v_row.budget then
    update public.api_budgets
       set window_start = v_row.window_start, used = v_row.used, updated_at = now()
     where scope = p_scope;
    return query select false, greatest(v_row.budget - v_row.used, 0), v_row.used, v_row.budget;
    return;
  end if;

  v_new_used := v_row.used + p_count;
  update public.api_budgets
     set used = v_new_used, window_start = v_row.window_start, updated_at = now()
   where scope = p_scope;

  return query
    select true,
           greatest(v_row.budget - v_new_used, 0),
           v_new_used,
           v_row.budget;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.budget_reset(p_scope text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  update public.api_budgets
     set used = 0, window_start = now(), updated_at = now()
   where p_scope is null or scope = p_scope;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.budget_status()
 RETURNS TABLE(scope text, used integer, budget integer, remaining integer, window_start timestamp with time zone, window_resets_in_seconds integer, blocked_until timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    b.scope,
    case when now() >= b.window_start + make_interval(secs => b.window_seconds)
         then 0 else b.used end,
    b.budget,
    case when now() >= b.window_start + make_interval(secs => b.window_seconds)
         then b.budget else greatest(b.budget - b.used, 0) end,
    b.window_start,
    greatest(
      extract(epoch from (b.window_start + make_interval(secs => b.window_seconds) - now()))::int,
      0
    ),
    (select c.blocked_until from public.api_cooldowns c
      where c.provider = split_part(b.scope, ':', 1)
        and c.blocked_until > now())
  from public.api_budgets b
  order by b.scope;
$function$
;

CREATE OR REPLACE FUNCTION public.build_journey_arc(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payload jsonb;
  v_first jsonb;
  v_last jsonb;
  v_eras jsonb;
  v_total_years int;
  v_biggest_shift jsonb;
  v_car jsonb;
begin
  if not (p_user_id = auth.uid() or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'title', t.title, 'artist', t.artists[1], 'played_at', pe.played_at
  ) into v_first
  from play_events pe join tracks t on t.id = pe.track_id
  where pe.user_id = p_user_id
  order by pe.played_at asc limit 1;

  select jsonb_build_object(
    'title', t.title, 'artist', t.artists[1], 'played_at', pe.played_at
  ) into v_last
  from play_events pe join tracks t on t.id = pe.track_id
  where pe.user_id = p_user_id
  order by pe.played_at desc limit 1;

  if v_first is null then
    return null;
  end if;

  with yearly_genre as (
    select
      date_part('year', pe.played_at)::int as yil,
      g.genre,
      count(*) as n
    from play_events pe
      join tracks t on t.id = pe.track_id
      cross join lateral unnest(t.genres) as g(genre)
    where pe.user_id = p_user_id and t.genres is not null
    group by 1, 2
  ),
  yearly_totals as (
    select yil, sum(n) as total from yearly_genre group by yil
  ),
  yearly_entropy as (
    select yg.yil,
           -sum((yg.n::numeric / yt.total) * ln(yg.n::numeric / yt.total)) as entropy
    from yearly_genre yg join yearly_totals yt on yt.yil = yg.yil
    group by yg.yil
  ),
  yearly_dominant as (
    select distinct on (yg.yil)
      yg.yil, yg.genre, ye.entropy
    from yearly_genre yg join yearly_entropy ye on ye.yil = yg.yil
    order by yg.yil, yg.n desc
  ),
  labeled as (
    select yil, public.genre_to_label(genre, entropy) as label
    from yearly_dominant
    where yil in (select yil from yearly_totals where total >= 20)
  ),
  grouped as (
    select yil, label,
           row_number() over (order by yil)
             - row_number() over (partition by label order by yil) as grp
    from labeled
  ),
  eras as (
    select label, min(yil) as start_year, max(yil) as end_year
    from grouped group by label, grp
  ),
  eras_with_obsession as (
    select e.label, e.start_year, e.end_year,
      (select jsonb_build_object('title', t.title, 'artist', t.artists[1], 'plays', cnt)
       from (
         select pe.track_id, count(*) as cnt
         from play_events pe
         where pe.user_id = p_user_id
           and date_part('year', pe.played_at) between e.start_year and e.end_year
         group by pe.track_id order by count(*) desc limit 1
       ) top join tracks t on t.id = top.track_id
      ) as obsession
    from eras e
  )
  select
    jsonb_agg(
      jsonb_build_object(
        'label', label,
        'start_year', start_year,
        'end_year', end_year,
        'title', label || ' Dönemi',
        'obsession', obsession
      ) order by start_year
    ),
    count(*)::int
  into v_eras, v_total_years
  from eras_with_obsession;

  select jsonb_build_object(
    'from', (v_eras -> (i - 1) ->> 'label'),
    'to',   (v_eras -> i ->> 'label'),
    'year', (v_eras -> i ->> 'start_year')
  ) into v_biggest_shift
  from generate_series(1, coalesce(jsonb_array_length(v_eras), 1) - 1) as i
  order by i desc limit 1;

  select jsonb_build_object(
    'sessions', count(*),
    'hours', round(sum(coalesce(cs.duration_seconds, 0)) / 3600.0, 1),
    'first_at', min(cs.connected_at),
    'last_at', max(cs.connected_at)
  ) into v_car
  from public.car_sessions cs
  where cs.user_id = p_user_id
  having count(*) > 0;

  v_payload := jsonb_build_object(
    'first_track', v_first,
    'last_track', v_last,
    'eras', coalesce(v_eras, '[]'::jsonb),
    'era_count', coalesce(v_total_years, 0),
    'biggest_shift', v_biggest_shift,
    'car', v_car,
    'schema_version', 2
  );

  insert into public.journey_arc (user_id, payload, generated_at)
  values (p_user_id, v_payload, now())
  on conflict (user_id) do update
    set payload = excluded.payload, generated_at = now();

  return v_payload;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.build_journey_year_pkg(p_user_id uuid, p_covers integer DEFAULT 20)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_current_year int := date_part('year', now() at time zone 'Europe/Istanbul')::int;
  v_row          record;
  v_written      int := 0;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  for v_row in
    select * from public.get_journey_years(p_user_id)
  loop
    insert into public.journey_year_pkg (user_id, year, payload, tz, is_closed, generated_at)
    values (
      p_user_id,
      v_row.year,
      jsonb_build_object(
        'year',            v_row.year,
        'play_count',      v_row.play_count,
        'total_minutes',   v_row.total_minutes,
        'track_count',     v_row.track_count,
        'artist_count',    v_row.artist_count,
        'new_artist_count',v_row.new_artist_count,
        'discovery_rate',  v_row.discovery_rate,
        'loyalty',         v_row.loyalty,
        'genre_label',     v_row.genre_label,
        'genre_variety',   v_row.genre_variety,
        'dominant_share',  v_row.dominant_share,
        'genre_breakdown', v_row.genre_breakdown,
        'is_breakpoint',   v_row.is_breakpoint,
        'top_track_title', v_row.top_track_title,
        'top_track_artist',v_row.top_track_artist,
        'top_track_plays', v_row.top_track_plays,
        'covers', coalesce(
          (select jsonb_agg(
                    jsonb_build_object(
                      'track_id',   c.track_id,
                      'title',      c.title,
                      'artist',     c.artist,
                      'spotify_id', c.spotify_id,
                      'image_url',  c.image_url,
                      'plays',      c.plays
                    ) order by c.plays desc
                  )
           from public.get_journey_year_covers(p_user_id, v_row.year, p_covers) c),
          '[]'::jsonb)
      ),
      'Europe/Istanbul',
      v_row.year < v_current_year,
      now()
    )
    on conflict (user_id, year) do update
      set payload      = excluded.payload,
          tz           = excluded.tz,
          is_closed    = excluded.is_closed,
          generated_at = excluded.generated_at;

    v_written := v_written + 1;
  end loop;

  return v_written;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.build_mood_pkg(p_user_id uuid, p_mood_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tracks jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_mood_key NOT IN (
    'quiet_side','full_throttle','locked_in','no_limit','closer','miles_away','gece_217',
    'your_day','first_light','daylight','dusk','nocturne'
  ) THEN
    RAISE EXCEPTION 'gecersiz mood_key: %', p_mood_key;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'track_id', m.track_id, 'title', m.title, 'artist_name', m.artist_name,
      'album', m.album, 'image_url', m.image_url, 'play_count', m.play_count,
      'spotify_id', m.spotify_id)
      -- 0334: dinlenme sırası. `m.ord` (skor sırası) yalnız eşitlik bozucu.
      ORDER BY m.play_count DESC, m.ord), '[]'::jsonb)
    INTO v_tracks
  FROM (
    SELECT *, row_number() OVER () AS ord
    FROM public.mood_playlist(p_user_id, p_mood_key, 50)
  ) m;

  IF jsonb_array_length(v_tracks) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.mood_pkg (user_id, mood_key, payload, tz, generated_at)
  VALUES (p_user_id, p_mood_key, v_tracks, 'Europe/Istanbul', now())
  ON CONFLICT (user_id, mood_key) DO UPDATE
    SET payload = excluded.payload, tz = excluded.tz, generated_at = excluded.generated_at;

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.build_user_pattern_pkg(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hourly    jsonb;
  v_platforms jsonb;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select coalesce(
           jsonb_agg(jsonb_build_object(
             'hour', h.hour, 'play_count', h.play_count, 'total_ms', h.total_ms)
             order by h.hour),
           '[]'::jsonb)
    into v_hourly
  from public.recap_hourly_pattern(p_user_id, null, now()) h;

  select coalesce(
           jsonb_agg(jsonb_build_object(
             'source', p.source, 'play_count', p.play_count, 'percentage', p.percentage)
             order by p.play_count desc),
           '[]'::jsonb)
    into v_platforms
  from public.recap_platform_breakdown(p_user_id, null, now()) p;

  if jsonb_array_length(v_hourly) = 0 then
    return false;
  end if;

  insert into public.user_pattern_pkg (user_id, payload, tz, generated_at)
  values (
    p_user_id,
    jsonb_build_object('hourly', v_hourly, 'platforms', v_platforms),
    'Europe/Istanbul',
    now()
  )
  on conflict (user_id) do update
    set payload      = excluded.payload,
        tz           = excluded.tz,
        generated_at = excluded.generated_at;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.build_user_period_pkg(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_summary     record;
  v_top_tracks  jsonb;
  v_top_artists jsonb;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select s.total_ms, s.total_tracks, s.total_artists
    into v_summary
  from public.recap_listening_summary(p_user_id, null, now()) s
  limit 1;

  if v_summary is null then
    return false;
  end if;

  select coalesce(
           jsonb_agg(jsonb_build_object(
             'track_id',    t.track_id,
             'title',       t.title,
             'artist_name', t.artist_name,
             'play_count',  t.play_count,
             'total_ms',    t.total_ms,
             'skip_count',  t.skip_count,
             'image_url',   tr.image_url)
             order by t.play_count desc),
           '[]'::jsonb)
    into v_top_tracks
  from public.recap_top_tracks(p_user_id, null, now(), 50) t
  left join public.tracks tr on tr.id = t.track_id;

  select coalesce(
           jsonb_agg(jsonb_build_object(
             'artist_name', a.artist_name,
             'play_count',  a.play_count,
             'total_ms',    a.total_ms,
             'image_url',   ar.image_url)
             order by a.play_count desc),
           '[]'::jsonb)
    into v_top_artists
  from public.recap_top_artists(p_user_id, null, now(), 50) a
  left join public.artists ar
    on ar.name_normalized = lower(trim(a.artist_name));

  if jsonb_array_length(v_top_tracks) = 0 then
    return false;
  end if;

  insert into public.user_period_pkg (user_id, payload, generated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'summary', jsonb_build_object(
        'total_ms',      coalesce(v_summary.total_ms, 0),
        'total_tracks',  coalesce(v_summary.total_tracks, 0),
        'total_artists', coalesce(v_summary.total_artists, 0)
      ),
      'top_tracks',  v_top_tracks,
      'top_artists', v_top_artists
    ),
    now()
  )
  on conflict (user_id) do update
    set payload      = excluded.payload,
        generated_at = excluded.generated_at;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.build_user_stats_pkg(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_summary record;
  v_1y      record;
  v_genres  jsonb;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select s.total_tracks, s.total_artists, s.total_ms
    into v_summary
  from public.recap_listening_summary(p_user_id, null, now()) s
  limit 1;

  if v_summary is null then
    return false;
  end if;

  select s.total_ms
    into v_1y
  from public.recap_listening_summary(
         p_user_id,
         (now() - interval '365 days'),
         now()
       ) s
  limit 1;

  select coalesce(
           jsonb_agg(jsonb_build_object(
             'genre', g.genre, 'play_count', g.play_count)
             order by g.play_count desc),
           '[]'::jsonb)
    into v_genres
  from public.user_genre_primary_counts(p_user_id) g;

  insert into public.user_stats_pkg (user_id, payload, generated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'unique_tracks',  coalesce(v_summary.total_tracks, 0),
      'unique_artists', coalesce(v_summary.total_artists, 0),
      'total_ms',       coalesce(v_summary.total_ms, 0),
      'total_ms_1y',    coalesce(v_1y.total_ms, 0),
      'genres',         v_genres
    ),
    now()
  )
  on conflict (user_id) do update
    set payload      = excluded.payload,
        generated_at = excluded.generated_at;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.build_user_taste_pkg(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_genres jsonb;
  v_hourly jsonb;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select coalesce(
           jsonb_agg(jsonb_build_object('genre', g.genre, 'play_count', g.play_count)
                     order by g.play_count desc),
           '[]'::jsonb)
    into v_genres
  from public.user_genre_all_counts(p_user_id) g;

  select coalesce(
           jsonb_agg(jsonb_build_object('hour', h.hour, 'play_count', h.play_count)
                     order by h.hour),
           '[]'::jsonb)
    into v_hourly
  from public.user_hourly_play_counts(p_user_id) h;

  if jsonb_array_length(v_genres) = 0 and jsonb_array_length(v_hourly) = 0 then
    return false;
  end if;

  insert into public.user_taste_pkg (user_id, payload, tz, generated_at)
  values (
    p_user_id,
    jsonb_build_object('genres', v_genres, 'hourly', v_hourly),
    'Europe/Istanbul',
    now()
  )
  on conflict (user_id) do update
    set payload      = excluded.payload,
        tz           = excluded.tz,
        generated_at = excluded.generated_at;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.build_year_pkg(p_user_id uuid, p_year integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tracks jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM public.year_pkg WHERE user_id = p_user_id AND year = p_year) THEN
    RETURN false;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'track_id', y.track_id, 'title', y.title, 'artist_name', y.artist_name,
      'album', y.album, 'image_url', y.image_url, 'play_count', y.play_count,
      'spotify_id', y.spotify_id)), '[]'::jsonb)
    INTO v_tracks
  FROM public.yearly_top_tracks(p_user_id, p_year) y;

  IF jsonb_array_length(v_tracks) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.year_pkg (user_id, year, payload, generated_at)
  VALUES (p_user_id, p_year, v_tracks, now());

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.car_listening_summary(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(session_count bigint, total_hours numeric, first_session timestamp with time zone, last_session timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  select
    count(*)::bigint,
    round(sum(coalesce(cs.duration_seconds, 0)) / 3600.0, 1)::numeric,
    min(cs.connected_at),
    max(cs.connected_at)
  from public.car_sessions cs
  where cs.user_id = p_user_id
    and (p_from is null or cs.connected_at >= p_from)
    and (p_to   is null or cs.connected_at <  p_to);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.catalog_enrichment_artist_adaylari(p_limit integer DEFAULT 25, p_havuz_tavani integer DEFAULT 800)
 RETURNS TABLE(item_id text, artist_name text, ornek_parcalar text, bilinen_tur text, oncelik numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH istatistik AS (
    SELECT
      t.artists[1]                                AS artist_name,
      count(*)::numeric                           AS calma,
      max(pe.played_at)                           AS son_calma,
      count(DISTINCT pe.played_at::date)::numeric AS farkli_gun
    FROM public.play_events pe
    JOIN public.tracks t ON t.id = pe.track_id
    WHERE pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true
      AND pe.ms_played >= 30000
      AND array_length(t.artists, 1) > 0
    GROUP BY t.artists[1]
  ),
  tavan AS (
    SELECT greatest(max(calma), 1) AS max_calma, greatest(max(farkli_gun), 1) AS max_gun
    FROM istatistik
  ),
  puanli AS (
    SELECT
      i.artist_name,
      public.catalog_item_id('artist', i.artist_name) AS item_id,
      round((
          0.5 * (ln(1 + i.calma) / ln(1 + (SELECT max_calma FROM tavan)))
        + 0.3 * greatest(0, 1 - (extract(epoch FROM (now() - i.son_calma)) / 86400.0) / 365.0)
        + 0.2 * (ln(1 + i.farkli_gun) / ln(1 + (SELECT max_gun FROM tavan)))
      )::numeric, 4) AS oncelik
    FROM istatistik i
  ),
  havuz AS (
    SELECT * FROM puanli ORDER BY oncelik DESC LIMIT greatest(p_havuz_tavani, 1)
  )
  SELECT
    h.item_id,
    h.artist_name,
    -- Modelin sanatçıyı TANIYABİLMESİ için örnek parçalar: en çok dinlenen 5.
    (SELECT string_agg(x.title, ', ' ORDER BY x.n DESC)
     FROM (
       SELECT t2.title, count(*) AS n
       FROM public.play_events p2
       JOIN public.tracks t2 ON t2.id = p2.track_id
       WHERE t2.artists[1] = h.artist_name AND p2.incognito_mode = false
       GROUP BY t2.title
       ORDER BY count(*) DESC
       LIMIT 5
     ) x) AS ornek_parcalar,
    (SELECT array_to_string((array_agg(DISTINCT g))[1:3], ', ')
     FROM public.tracks t3 CROSS JOIN LATERAL unnest(t3.genres) AS g
     WHERE t3.artists[1] = h.artist_name) AS bilinen_tur,
    h.oncelik
  FROM havuz h
  WHERE NOT EXISTS (
    SELECT 1 FROM public.catalog_ai_enrichment e
    WHERE e.item_id = h.item_id AND e.item_type = 'artist'
  )
  ORDER BY h.oncelik DESC
  LIMIT greatest(p_limit, 1);
$function$
;

CREATE OR REPLACE FUNCTION public.catalog_enrichment_durumu()
 RETURNS TABLE(tur text, havuz_tavani integer, zenginlesen bigint, kalan bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 'artist'::text, 200,
         (SELECT count(*) FROM public.catalog_ai_enrichment WHERE item_type = 'artist'),
         (SELECT count(*) FROM public.catalog_enrichment_artist_adaylari(100000, 200))
  UNION ALL
  SELECT 'track'::text, 800,
         (SELECT count(*) FROM public.catalog_ai_enrichment WHERE item_type = 'track'),
         (SELECT count(*) FROM public.catalog_enrichment_track_adaylari(100000, 800));
$function$
;

CREATE OR REPLACE FUNCTION public.catalog_enrichment_for_tracks(p_track_ids uuid[])
 RETURNS TABLE(track_id uuid, primary_genre text, energy_character text, tempo_character text, moods text[], vibe text[], kanonik text[], language text, confidence real, kaynak text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    t.id,
    coalesce(pe.primary_genre, ae.primary_genre),
    coalesce(pe.energy_character, ae.energy_character),
    coalesce(pe.tempo_character, ae.tempo_character),
    coalesce(pe.moods, ae.moods),
    coalesce(pe.vibe, ae.vibe),
    public.mood_kanonik_etiketler(
      coalesce(pe.moods, ae.moods, '{}') || coalesce(pe.vibe, ae.vibe, '{}')),
    coalesce(pe.language, ae.language),
    coalesce(pe.confidence_score, ae.confidence_score),
    CASE WHEN pe.item_id IS NOT NULL THEN 'track' ELSE 'artist' END
  FROM unnest(p_track_ids) AS ids(tid)
  JOIN public.tracks t ON t.id = ids.tid
  LEFT JOIN public.catalog_ai_enrichment pe
    ON pe.item_type = 'track' AND pe.item_id = public.catalog_item_id('track', t.spotify_id)
  LEFT JOIN public.catalog_ai_enrichment ae
    ON ae.item_type = 'artist' AND array_length(t.artists, 1) > 0
   AND ae.item_id = public.catalog_item_id('artist', t.artists[1])
  WHERE pe.item_id IS NOT NULL OR ae.item_id IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.catalog_enrichment_track_adaylari(p_limit integer DEFAULT 50, p_havuz_tavani integer DEFAULT 3500)
 RETURNS TABLE(item_id text, track_id uuid, title text, artist_name text, album text, release_year integer, bilinen_tur text, oncelik numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH istatistik AS (
    SELECT
      pe.track_id,
      count(*)::numeric                           AS calma,
      max(pe.played_at)                           AS son_calma,
      count(DISTINCT pe.played_at::date)::numeric AS farkli_gun
    FROM public.play_events pe
    -- 🔴 0327: mood havuzuyla AYNI uygunluk koşulu. Önceden her play_events
    -- satırı sayılıyordu; atlanan ve 30 sn'den kısa dinlemeler bir parçayı
    -- öncelik sırasında yukarı taşıyabiliyordu — ama o parça hiçbir mood
    -- havuzuna giremediği için etiketi kürasyona hiç dokunmuyordu.
    WHERE pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true
      AND pe.ms_played >= 30000
    GROUP BY pe.track_id
  ),
  tavan AS (
    SELECT greatest(max(calma), 1) AS max_calma, greatest(max(farkli_gun), 1) AS max_gun
    FROM istatistik
  ),
  puanli AS (
    SELECT
      t.id AS track_id,
      t.title,
      t.artists[1] AS artist_name,
      t.album,
      t.release_year,
      CASE WHEN array_length(t.genres, 1) > 0 THEN array_to_string(t.genres[1:3], ', ') ELSE NULL END AS bilinen_tur,
      public.catalog_item_id('track', t.spotify_id) AS item_id,
      round((
          0.5 * (ln(1 + i.calma) / ln(1 + (SELECT max_calma FROM tavan)))
        + 0.3 * greatest(0, 1 - (extract(epoch FROM (now() - i.son_calma)) / 86400.0) / 365.0)
        + 0.2 * (ln(1 + i.farkli_gun) / ln(1 + (SELECT max_gun FROM tavan)))
      )::numeric, 4) AS oncelik
    FROM istatistik i
    JOIN public.tracks t ON t.id = i.track_id
    WHERE t.spotify_id IS NOT NULL
      AND t.title IS NOT NULL
      AND array_length(t.artists, 1) > 0
  ),
  -- 🔴 HAVUZ TAVANI: yalnız en öncelikli N parça hiç aday olabilir.
  -- Bu ELEME, "zenginleştirilmiş mi" filtresinden ÖNCE uygulanır — yoksa
  -- havuz tükendikçe sınır aşağı kayar ve uzun kuyruk içeri sızardı.
  havuz AS (
    SELECT * FROM puanli ORDER BY oncelik DESC LIMIT greatest(p_havuz_tavani, 1)
  )
  SELECT h.item_id, h.track_id, h.title, h.artist_name, h.album, h.release_year, h.bilinen_tur, h.oncelik
  FROM havuz h
  WHERE NOT EXISTS (
    SELECT 1 FROM public.catalog_ai_enrichment e
    WHERE e.item_id = h.item_id AND e.item_type = 'track'
  )
  ORDER BY h.oncelik DESC
  LIMIT greatest(p_limit, 1);
$function$
;

CREATE OR REPLACE FUNCTION public.catalog_item_id(p_item_type text, p_key text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_key IS NULL OR btrim(p_key) = '' THEN NULL
    WHEN p_item_type = 'track'  THEN 'sp:track:'  || p_key
    WHEN p_item_type = 'album'  THEN 'sp:album:'  || p_key
    WHEN p_item_type = 'artist' THEN 'name:artist:' || regexp_replace(lower(btrim(p_key)), '\s+', ' ', 'g')
    ELSE NULL
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_logs(p_days_to_keep integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_days int := coalesce(p_days_to_keep, 30);
  v_runs_deleted int := 0;
  v_sys_logs_deleted int := 0;
  v_cooldowns_deleted int := 0;
  v_cron_deleted int := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH deleted AS (
    DELETE FROM public.pipeline_runs
    WHERE created_at < now() - (v_days || ' days')::interval
      AND outcome IN ('success', 'empty', 'partial')
    RETURNING 1
  )
  SELECT count(*) INTO v_runs_deleted FROM deleted;

  WITH deleted_err AS (
    DELETE FROM public.pipeline_runs
    WHERE created_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT v_runs_deleted + count(*) INTO v_runs_deleted FROM deleted_err;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_logs') THEN
    WITH deleted_sys AS (
      DELETE FROM public.system_logs
      WHERE created_at < now() - (v_days || ' days')::interval
      RETURNING 1
    )
    SELECT count(*) INTO v_sys_logs_deleted FROM deleted_sys;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_cooldowns') THEN
    WITH deleted_cd AS (
      DELETE FROM public.api_cooldowns
      WHERE blocked_until < now() - interval '7 days'
      RETURNING 1
    )
    SELECT count(*) INTO v_cooldowns_deleted FROM deleted_cd;
  END IF;

  -- pg_cron çalışma geçmişi: 14 gün yeter (admin panel son 7 günü okur).
  IF to_regclass('cron.job_run_details') IS NOT NULL THEN
    WITH deleted_cron AS (
      DELETE FROM cron.job_run_details
      WHERE start_time < now() - interval '14 days'
      RETURNING 1
    )
    SELECT count(*) INTO v_cron_deleted FROM deleted_cron;
  END IF;

  RETURN jsonb_build_object(
    'pipeline_runs_deleted', v_runs_deleted,
    'system_logs_deleted', v_sys_logs_deleted,
    'api_cooldowns_deleted', v_cooldowns_deleted,
    'cron_job_run_details_deleted', v_cron_deleted,
    'days_threshold', v_days
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.completed_years_for_user(p_user_id uuid)
 RETURNS integer[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(array_agg(DISTINCT yil ORDER BY yil), '{}')
  FROM (
    SELECT extract(year FROM pe.played_at AT TIME ZONE 'Europe/Istanbul')::int AS yil
    FROM play_events pe
    WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
  ) y
  WHERE yil < extract(year FROM now() AT TIME ZONE 'Europe/Istanbul')::int
$function$
;

CREATE OR REPLACE FUNCTION public.compute_user_behavioral_signals(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total            bigint;
  v_intentionality   numeric;
  v_impatience       numeric;
  v_shuffle          numeric;
  v_completion       numeric;
  v_peak_hour        integer;
  v_night_pct        numeric;
  v_is_night_owl     boolean;
  v_countries        integer;
  v_exploration      numeric;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_total
  FROM play_events WHERE user_id = p_user_id AND incognito_mode = false;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  SELECT
    round(count(*) FILTER (WHERE reason_start = 'clickrow')::numeric / v_total, 4),
    round(count(*) FILTER (WHERE reason_start = 'fwdbtn')::numeric   / v_total, 4),
    round(count(*) FILTER (WHERE shuffle IS TRUE)::numeric           / v_total, 4),
    round(count(*) FILTER (WHERE reason_end = 'trackdone')::numeric  / v_total, 4),
    round(count(*) FILTER (WHERE EXTRACT(HOUR FROM played_at AT TIME ZONE 'Europe/Istanbul') BETWEEN 0 AND 5)::numeric / v_total, 4),
    count(DISTINCT conn_country),
    count(DISTINCT track_id)
  INTO v_intentionality, v_impatience, v_shuffle, v_completion, v_night_pct, v_countries, v_exploration
  FROM play_events
  WHERE user_id = p_user_id AND incognito_mode = false;

  v_exploration := round(v_exploration / v_total, 4);

  SELECT EXTRACT(HOUR FROM played_at AT TIME ZONE 'Europe/Istanbul')::int
  INTO v_peak_hour
  FROM play_events
  WHERE user_id = p_user_id AND incognito_mode = false
  GROUP BY EXTRACT(HOUR FROM played_at AT TIME ZONE 'Europe/Istanbul')
  ORDER BY count(*) DESC
  LIMIT 1;

  v_is_night_owl := v_night_pct > 0.15;

  INSERT INTO user_taste_profile (
    user_id, intentionality, impatience, shuffle_reliance, completion_loyalty,
    peak_hour, is_night_owl, country_diversity, exploration_rate, has_l2, computed_at, updated_at
  ) VALUES (
    p_user_id, v_intentionality, v_impatience, v_shuffle, v_completion,
    v_peak_hour, v_is_night_owl, v_countries, v_exploration, true, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    intentionality    = EXCLUDED.intentionality,
    impatience        = EXCLUDED.impatience,
    shuffle_reliance  = EXCLUDED.shuffle_reliance,
    completion_loyalty= EXCLUDED.completion_loyalty,
    peak_hour         = EXCLUDED.peak_hour,
    is_night_owl      = EXCLUDED.is_night_owl,
    country_diversity = EXCLUDED.country_diversity,
    exploration_rate  = EXCLUDED.exploration_rate,
    has_l2            = true,
    updated_at        = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_user_genre_vector(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_coverage   numeric;
  v_entropy    numeric;
  v_dominant   text;
  v_vector     jsonb;
  v_contrib    integer;
  v_l2norm     numeric;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT round(100.0 * sum(w.final_weight) FILTER (
           WHERE t.genres IS NOT NULL AND array_length(t.genres,1) > 0)
         / NULLIF(sum(w.final_weight), 0), 1)
  INTO v_coverage
  FROM user_track_weights w
  JOIN tracks t ON t.id = w.representative_track_id
  WHERE w.user_id = p_user_id;

  DROP TABLE IF EXISTS _gw;

  CREATE TEMP TABLE _gw ON COMMIT DROP AS
  SELECT genre, sum(gw) AS w
  FROM (
    SELECT unnest(t.genres) AS genre,
           w.final_weight / array_length(t.genres,1) AS gw
    FROM user_track_weights w
    JOIN tracks t ON t.id = w.representative_track_id
    WHERE w.user_id = p_user_id
      AND t.genres IS NOT NULL AND array_length(t.genres,1) > 0
  ) x
  GROUP BY genre;

  SELECT count(*) INTO v_contrib FROM _gw;

  IF v_contrib = 0 THEN
    UPDATE user_taste_profile
    SET genre_coverage_pct = COALESCE(v_coverage,0), is_mature = false, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  SELECT sqrt(sum(w*w)) INTO v_l2norm FROM _gw;

  SELECT jsonb_object_agg(genre, round((w / NULLIF(v_l2norm,0))::numeric, 5))
  INTO v_vector FROM _gw;

  SELECT round((-sum((w/tot) * log(2, w/tot)))::numeric, 4)
  INTO v_entropy
  FROM _gw, (SELECT sum(w) AS tot FROM _gw) s
  WHERE w > 0;

  SELECT genre INTO v_dominant FROM _gw ORDER BY w DESC LIMIT 1;

  INSERT INTO user_genre_vectors (user_id, vector, dominant_genre, contributing_tracks, computed_at, updated_at)
  VALUES (p_user_id, v_vector, v_dominant, v_contrib, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    vector = EXCLUDED.vector,
    dominant_genre = EXCLUDED.dominant_genre,
    contributing_tracks = EXCLUDED.contributing_tracks,
    updated_at = now();

  UPDATE user_taste_profile
  SET entropy = v_entropy,
      genre_coverage_pct = COALESCE(v_coverage, 0),
      is_mature = (COALESCE(v_coverage,0) >= 90),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_user_identity(p_user_id uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prof            user_taste_profile%ROWTYPE;
  v_words         text[] := '{}';
  v_evergreen_pct numeric;
  v_taze_tutku    integer;
  v_sabah numeric; v_ogle numeric; v_aksam numeric; v_gece numeric;
  v_e1 text; v_e2 text; v_e3 text;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO prof FROM user_taste_profile WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  IF    prof.exploration_rate IS NOT NULL AND prof.exploration_rate < 0.15 THEN v_e1 := 'Deep';
  ELSIF prof.exploration_rate IS NOT NULL AND prof.exploration_rate > 0.45 THEN v_e1 := 'Explorer';
  ELSIF prof.completion_loyalty IS NOT NULL AND prof.completion_loyalty > 0.65 THEN v_e1 := 'Patient';
  ELSIF prof.completion_loyalty IS NOT NULL AND prof.completion_loyalty < 0.35 THEN v_e1 := 'Skipper';
  ELSIF prof.shuffle_reliance IS NOT NULL AND prof.shuffle_reliance > 0.65 THEN v_e1 := 'In the Flow';
  ELSIF prof.shuffle_reliance IS NOT NULL AND prof.shuffle_reliance < 0.35 THEN v_e1 := 'In Control';
  END IF;

  SELECT
    round(100.0 * sum(final_weight) FILTER (WHERE is_evergreen) / NULLIF(sum(final_weight),0), 1),
    count(*) FILTER (WHERE first_played_at > now() - interval '6 months' AND play_count >= 30)
  INTO v_evergreen_pct, v_taze_tutku
  FROM user_track_weights WHERE user_id = p_user_id;

  IF v_evergreen_pct IS NOT NULL THEN
    IF    v_taze_tutku < 15 AND v_evergreen_pct >= 85 THEN v_e2 := 'Loyal';
    ELSIF v_taze_tutku >= 40 AND v_evergreen_pct < 70 THEN v_e2 := 'Always Forward';
    ELSIF v_taze_tutku >= 15 AND v_evergreen_pct >= 70 THEN v_e2 := 'Come and Go';
    END IF;
  END IF;

  SELECT
    round(100.0*count(*) FILTER (WHERE hr BETWEEN 6 AND 11)/NULLIF(count(*),0),1),
    round(100.0*count(*) FILTER (WHERE hr BETWEEN 12 AND 16)/NULLIF(count(*),0),1),
    round(100.0*count(*) FILTER (WHERE hr BETWEEN 17 AND 21)/NULLIF(count(*),0),1),
    round(100.0*count(*) FILTER (WHERE hr BETWEEN 22 AND 23 OR hr BETWEEN 0 AND 5)/NULLIF(count(*),0),1)
  INTO v_sabah, v_ogle, v_aksam, v_gece
  FROM (
    SELECT EXTRACT(HOUR FROM played_at AT TIME ZONE 'Europe/Istanbul')::int AS hr
    FROM play_events WHERE user_id = p_user_id AND incognito_mode = false
  ) t;

  IF    v_gece  > 40 THEN v_e3 := 'Night Owl';
  ELSIF v_sabah > 40 THEN v_e3 := 'Dawn';
  ELSIF v_ogle  > 40 THEN v_e3 := 'Midday';
  ELSIF v_aksam > 40 THEN v_e3 := 'Twilight';
  ELSIF v_sabah IS NOT NULL THEN v_e3 := 'Constant';
  END IF;

  IF v_e1 IS NOT NULL THEN v_words := array_append(v_words, v_e1); END IF;
  IF v_e2 IS NOT NULL THEN v_words := array_append(v_words, v_e2); END IF;
  IF v_e3 IS NOT NULL THEN v_words := array_append(v_words, v_e3); END IF;

  UPDATE user_taste_profile
  SET identity_words = v_words, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_words;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_user_mainstream(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wrapped    jsonb;
  v_raw        jsonb;
  v_mainstream numeric;
  v_source     text;
  v_has_l3     boolean := false;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT signal_data INTO v_wrapped
  FROM user_export_signals
  WHERE user_id = p_user_id AND signal_source LIKE 'wrapped%'
  ORDER BY imported_at DESC NULLS LAST
  LIMIT 1;

  IF v_wrapped IS NOT NULL THEN
    v_raw := COALESCE(
      v_wrapped -> 'party' -> 'avgTrackPopularityScore',
      v_wrapped -> 'avgTrackPopularity'
    );

    IF v_raw IS NOT NULL AND jsonb_typeof(v_raw) = 'number' THEN
      v_mainstream := v_raw::text::numeric;
      IF v_mainstream < 0 OR v_mainstream > 1 THEN
        v_mainstream := NULL;
      ELSE
        v_source := 'l3_wrapped';
        v_has_l3 := true;
      END IF;
    END IF;
  END IF;

  UPDATE user_taste_profile
  SET mainstream_ness = v_mainstream,
      mainstream_source = v_source,
      has_l3 = (has_l3 OR v_has_l3),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_user_music_metrics(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_toplam   int;
  v_night    real;
  v_repeat    real;
  v_skip     real;
  v_album    real;
  -- Altında istatistiğin anlamsız olduğu eşik.
  c_min_calma constant int := 50;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_toplam
  FROM public.play_events
  WHERE user_id = p_user_id AND incognito_mode = false;

  IF v_toplam < c_min_calma THEN
    -- Yetersiz veri: satırı yine yaz (varlığı bilinsin) ama metrikleri UYDURMA.
    INSERT INTO public.user_music_intelligence (user_id, toplam_calma, computed_at, updated_at)
    VALUES (p_user_id, coalesce(v_toplam, 0), now(), now())
    ON CONFLICT (user_id) DO UPDATE
      SET night_ratio = NULL, repeat_intensity = NULL, skip_rate = NULL,
          album_orientation = NULL, toplam_calma = excluded.toplam_calma,
          computed_at = now(), updated_at = now();
    RETURN false;
  END IF;

  -- night_ratio: 23:00-04:59 (Europe/Istanbul — kullanıcının yaşadığı saat).
  SELECT (count(*) FILTER (
           WHERE extract(hour FROM (played_at AT TIME ZONE 'Europe/Istanbul')) >= 23
              OR extract(hour FROM (played_at AT TIME ZONE 'Europe/Istanbul')) < 5
         )::real / nullif(count(*), 0))
    INTO v_night
  FROM public.play_events
  WHERE user_id = p_user_id AND incognito_mode = false;

  -- skip_rate: ilk 30 sn içinde bırakılanlar. `skipped` bayrağı ZIP verisinde
  -- her zaman dolu değil, bu yüzden ms_played ile birlikte değerlendiriliyor.
  SELECT (count(*) FILTER (WHERE coalesce(ms_played, 0) < 30000 OR skipped = true)::real
          / nullif(count(*), 0))
    INTO v_skip
  FROM public.play_events
  WHERE user_id = p_user_id AND incognito_mode = false;

  -- repeat_intensity: bir çalmanın, AYNI parçanın 7 gün içindeki başka bir
  -- çalmasının ardından gelme oranı.
  WITH sirali AS (
    SELECT track_id,
           played_at,
           lag(played_at) OVER (PARTITION BY track_id ORDER BY played_at) AS onceki
    FROM public.play_events
    WHERE user_id = p_user_id AND incognito_mode = false AND track_id IS NOT NULL
  )
  SELECT (count(*) FILTER (WHERE onceki IS NOT NULL AND played_at - onceki <= interval '7 days')::real
          / nullif(count(*), 0))
    INTO v_repeat
  FROM sirali;

  /*
   * album_orientation: aynı gün aynı albümden 3+ FARKLI parça dinlenmiş
   * çalmaların payı. Albümü baştan sona dinleme eğiliminin vekili.
   *
   * ⚠ İKİ AYRI TUZAK (2026-09-19'da ölçülerek bulundu):
   *  1. `sum(...) FILTER (...)` hiç satır eşleşmezse NULL döner; NULL/x = NULL.
   *     Yani "albüm dinliyor ama hiç 3+ günü yok" olan kullanıcı, "albüm
   *     verisi yok" olanla aynı NULL'a düşüyordu. `coalesce` ile ayrıldı.
   *  2. Ama sırf coalesce yetmez: 237 çalmasının yalnız 12'si albümlü olan
   *     bir kullanıcıda 0 da en az NULL kadar yanıltıcıdır. Bu yüzden
   *     albümlü çalma sayısı eşiğin altındaysa metrik NULL BIRAKILIR —
   *     "bilmiyorum" demek, uydurmaktan iyidir.
   */
  WITH gunluk AS (
    SELECT (pe.played_at AT TIME ZONE 'Europe/Istanbul')::date AS gun,
           t.album,
           count(DISTINCT pe.track_id) AS farkli_parca,
           count(*)                    AS calma
    FROM public.play_events pe
    JOIN public.tracks t ON t.id = pe.track_id
    WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
      AND t.album IS NOT NULL AND btrim(t.album) <> ''
    GROUP BY 1, 2
  )
  SELECT CASE
           WHEN coalesce(sum(calma), 0) < 30 THEN NULL
           ELSE coalesce(sum(calma) FILTER (WHERE farkli_parca >= 3), 0)::real / sum(calma)
         END
    INTO v_album
  FROM gunluk;

  INSERT INTO public.user_music_intelligence (
    user_id, night_ratio, repeat_intensity, skip_rate, album_orientation,
    toplam_calma, computed_at, updated_at
  )
  VALUES (p_user_id, v_night, v_repeat, v_skip, v_album, v_toplam, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET night_ratio       = excluded.night_ratio,
        repeat_intensity  = excluded.repeat_intensity,
        skip_rate         = excluded.skip_rate,
        album_orientation = excluded.album_orientation,
        toplam_calma      = excluded.toplam_calma,
        computed_at       = now(),
        updated_at        = now();

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_user_track_weights(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  written integer;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM user_track_weights WHERE user_id = p_user_id;

  WITH pe AS (
    SELECT
      p.track_id,
      p.played_at,
      lower(regexp_replace(coalesce(t.title,''), '\s+', ' ', 'g'))
        || '|' || lower(coalesce(t.artists[1],'')) AS merge_key,
      t.title,
      t.artists[1] AS artist,
      t.id AS rep_track_id,
      CASE
        WHEN p.reason_end = 'trackdone' THEN 1.0
        WHEN p.ms_played >= 30000 THEN LEAST(1.0, 0.5 + (p.ms_played - 30000) / 240000.0)
        WHEN p.ms_played >= 5000  THEN 0.5 * p.ms_played / 30000.0
        ELSE 0.0
      END AS completion,
      EXTRACT(EPOCH FROM (now() - p.played_at)) / 2629746.0 AS months_ago
    FROM play_events p
    JOIN tracks t ON t.id = p.track_id
    WHERE p.user_id = p_user_id
      AND p.incognito_mode = false
  ),
  per_merge AS (
    SELECT
      merge_key,
      (array_agg(rep_track_id ORDER BY played_at DESC))[1] AS rep_track_id,
      (array_agg(title ORDER BY played_at DESC))[1] AS title,
      (array_agg(artist ORDER BY played_at DESC))[1] AS artist,
      count(*) AS play_count,
      sum(completion) AS raw_weight,
      sum(completion * power(0.5, months_ago / 3.0)) AS decayed_weight,
      min(played_at) AS first_played_at,
      max(played_at) AS last_played_at
    FROM pe
    GROUP BY merge_key
    HAVING count(*) >= 10
  ),
  evergreen AS (
    SELECT pe.merge_key
    FROM pe
    JOIN per_merge pm ON pm.merge_key = pe.merge_key
    WHERE pe.played_at > pm.first_played_at + interval '3 months'
    GROUP BY pe.merge_key
    HAVING count(*) >= 40
       AND (max(pe.played_at) - min(pe.played_at)) >= interval '2 years'
  )
  INSERT INTO user_track_weights (
    user_id, merge_key, representative_track_id, title, artist,
    play_count, raw_weight, decayed_weight, is_evergreen, final_weight,
    first_played_at, last_played_at
  )
  SELECT
    p_user_id, pm.merge_key, pm.rep_track_id, pm.title, pm.artist,
    pm.play_count,
    round(pm.raw_weight, 4),
    round(pm.decayed_weight, 4),
    (e.merge_key IS NOT NULL) AS is_evergreen,
    round(CASE WHEN e.merge_key IS NOT NULL THEN pm.raw_weight * 2 ELSE pm.decayed_weight END, 4) AS final_weight,
    pm.first_played_at, pm.last_played_at
  FROM per_merge pm
  LEFT JOIN evergreen e ON e.merge_key = pm.merge_key;

  GET DIAGNOSTICS written = ROW_COUNT;
  RETURN written;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cooldown_get(p_provider text)
 RETURNS TABLE(blocked_until timestamp with time zone, reason text, hit_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.blocked_until, c.reason, c.hit_count
  FROM api_cooldowns c
  WHERE c.provider = p_provider;
$function$
;

CREATE OR REPLACE FUNCTION public.cooldown_set(p_provider text, p_blocked_until timestamp with time zone, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO api_cooldowns (provider, blocked_until, reason, hit_count, updated_at)
  VALUES (p_provider, p_blocked_until, p_reason, 1, NOW())
  ON CONFLICT (provider) DO UPDATE
    SET blocked_until = EXCLUDED.blocked_until,
        reason        = EXCLUDED.reason,
        hit_count     = api_cooldowns.hit_count + 1,
        updated_at    = NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cover_backfill_candidates(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, spotify_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_kalan integer := GREATEST(p_limit, 1);
  v_bulundu integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH gorunur AS (
    SELECT
      el->>'title'  AS baslik,
      el->>'artist' AS sanatci,
      SUM(COALESCE((el->>'plays')::int, 0)) AS agirlik
    FROM recaps r,
         LATERAL jsonb_array_elements(
           COALESCE(r.payload->'top_tracks', '[]'::jsonb)
         ) el
    WHERE el->>'title' IS NOT NULL
      AND el->>'artist' IS NOT NULL
    GROUP BY el->>'title', el->>'artist'
  )
  SELECT DISTINCT ON (t.id) t.id, t.spotify_id
  FROM tracks t
  JOIN gorunur g
    ON g.baslik = t.title
   AND t.artists @> ARRAY[g.sanatci]
  WHERE t.image_url IS NULL
    AND t.spotify_id IS NOT NULL
  ORDER BY t.id, g.agirlik DESC
  LIMIT v_kalan;

  GET DIAGNOSTICS v_bulundu = ROW_COUNT;
  v_kalan := v_kalan - v_bulundu;
  IF v_kalan <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT t.id, t.spotify_id
  FROM tracks t
  WHERE t.image_url IS NULL
    AND t.spotify_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.track_id = t.id)
    AND NOT EXISTS (
      SELECT 1
      FROM recaps r,
           LATERAL jsonb_array_elements(
             COALESCE(r.payload->'top_tracks', '[]'::jsonb)
           ) el
      WHERE el->>'title' = t.title
        AND t.artists @> ARRAY[el->>'artist']
    )
  ORDER BY t.id
  LIMIT v_kalan;

  GET DIAGNOSTICS v_bulundu = ROW_COUNT;
  v_kalan := v_kalan - v_bulundu;
  IF v_kalan <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT t.id, t.spotify_id
  FROM tracks t
  WHERE t.image_url IS NULL
    AND t.spotify_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.track_id = t.id)
  ORDER BY t.id
  LIMIT v_kalan;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cron_sira_al(p_is text, p_aralik interval, p_limit integer DEFAULT 1, p_kilit interval DEFAULT '00:10:00'::interval, p_tur_baslangici timestamp with time zone DEFAULT now())
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uygun uuid[];
BEGIN
  v_uygun := ARRAY(SELECT public.cron_uygun_kullanicilar(p_is));

  INSERT INTO public.cron_kullanici_sirasi (is_adi, user_id)
  SELECT p_is, k FROM unnest(v_uygun) AS k
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  WITH secilen AS (
    SELECT s.user_id
    FROM public.cron_kullanici_sirasi s
    WHERE s.is_adi = p_is
      AND s.user_id = ANY (v_uygun)
      AND (s.son_tamamlanma IS NULL
           OR s.son_tamamlanma < LEAST(now() - p_aralik, p_tur_baslangici))
      AND (s.kilit_bitis IS NULL OR s.kilit_bitis < now())
    ORDER BY s.son_tamamlanma ASC NULLS FIRST, s.user_id
    LIMIT GREATEST(1, LEAST(p_limit, 100))
    FOR UPDATE OF s SKIP LOCKED
  )
  UPDATE public.cron_kullanici_sirasi s
     SET kilit_bitis = now() + p_kilit,
         guncellendi = now()
    FROM secilen
   WHERE s.is_adi = p_is AND s.user_id = secilen.user_id
  RETURNING s.user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cron_sira_birak(p_is text, p_user_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.cron_kullanici_sirasi
     SET kilit_bitis = NULL, guncellendi = now()
   WHERE is_adi = p_is AND user_id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.cron_sira_durumu(p_is text, p_aralik interval)
 RETURNS TABLE(toplam bigint, vadesi_gecmis bigint, hatali bigint, en_eski_tamamlanma timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    count(*),
    count(*) FILTER (WHERE son_tamamlanma IS NULL OR son_tamamlanma < now() - p_aralik),
    count(*) FILTER (WHERE ardisik_hata > 0),
    min(son_tamamlanma)
  FROM public.cron_kullanici_sirasi
  WHERE is_adi = p_is;
$function$
;

CREATE OR REPLACE FUNCTION public.cron_sira_tamamla(p_is text, p_user_id uuid, p_hata text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.cron_kullanici_sirasi
     SET son_tamamlanma = CASE WHEN p_hata IS NULL THEN now() ELSE son_tamamlanma END,
         son_hata       = CASE WHEN p_hata IS NULL THEN NULL ELSE left(p_hata, 500) END,
         ardisik_hata   = CASE WHEN p_hata IS NULL THEN 0 ELSE ardisik_hata + 1 END,
         kilit_bitis    = CASE
                            WHEN p_hata IS NULL THEN NULL
                            ELSE now() + LEAST(
                              interval '6 hours',
                              interval '5 minutes' * power(2, LEAST(ardisik_hata, 10))
                            )
                          END,
         guncellendi    = now()
   WHERE is_adi = p_is AND user_id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.cron_uygun_kullanicilar(p_is text)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pc.user_id
  FROM public.platform_connections pc
  JOIN auth.users u ON u.id = pc.user_id
  WHERE p_is = 'spotify_sync'
    AND pc.platform = 'spotify'
    AND pc.is_active IS NOT FALSE
    AND pc.refresh_token IS NOT NULL
    AND COALESCE((u.raw_user_meta_data->>'is_test')::boolean, false) = false
    AND lower(COALESCE(u.email, '')) NOT LIKE '%@rosso-test.local'
    AND EXISTS (
      SELECT 1 FROM public.spotify_allowlist_requests a
      WHERE a.user_id = pc.user_id AND a.status IN ('approved', 'active')
    )
  UNION ALL
  SELECT pc.user_id
  FROM public.platform_connections pc
  WHERE p_is = 'playlist_refresh'
    AND pc.platform = 'spotify'
    AND pc.is_active = true
  UNION ALL
  SELECT u.id
  FROM auth.users u
  WHERE p_is = 'mood_pkg'
    AND COALESCE((u.raw_user_meta_data->>'is_test')::boolean, false) = false
    AND EXISTS (SELECT 1 FROM public.play_events pe WHERE pe.user_id = u.id)
  UNION ALL
  SELECT u.id
  FROM auth.users u
  WHERE p_is = 'recap'
    AND EXISTS (SELECT 1 FROM public.play_events pe WHERE pe.user_id = u.id)
  UNION ALL
  SELECT u.id
  FROM auth.users u
  WHERE p_is = 'gunluk_paket'
    AND (
      EXISTS (SELECT 1 FROM public.play_events pe WHERE pe.user_id = u.id)
      OR EXISTS (
        SELECT 1 FROM public.platform_connections pc
        WHERE pc.user_id = u.id AND pc.is_active = true
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.davet_listeli_kayit_kapisi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
DECLARE
  v_email text := lower(btrim(coalesce(NEW.email, '')));
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'kayit_kapali' USING HINT = 'E-postasız kayıt kabul edilmez.';
  END IF;
  IF v_email LIKE '%@rosso-demo.local' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.izinli_eposta WHERE email = v_email) THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.izinli_eposta WHERE sahip) THEN
    INSERT INTO public.izinli_eposta (email, sahip) VALUES (v_email, true);
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'kayit_kapali'
    USING HINT = 'Bu Rosso kurulumu davetle çalışır; sahibi e-postanı izin listesine eklemeli.';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.daylist_identity_contrast(p_user_id uuid)
 RETURNS TABLE(rosso_words text[], spotify_top_words text[], spotify_word_count integer, overlap_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rosso text[];
  v_pool text[];
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select coalesce(identity_words, '{}') into v_rosso
  from public.user_taste_profile where user_id = p_user_id;
  v_rosso := coalesce(v_rosso, '{}');

  select coalesce(array_agg(word), '{}') into v_pool
  from (select word from public.daylist_name_pool(p_user_id, 2) limit 10) q;
  v_pool := coalesce(v_pool, '{}');

  rosso_words := v_rosso;
  spotify_top_words := v_pool;
  spotify_word_count := (select count(*)::int from public.daylist_name_pool(p_user_id, 2));
  overlap_count := (
    select count(*)::int
    from unnest(v_pool) p(w)
    where exists (select 1 from unnest(v_rosso) r(x) where lower(x) = lower(p.w))
  );
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.daylist_name_pool(p_user_id uuid, p_min_count integer DEFAULT 2)
 RETURNS TABLE(word text, occurrences integer, share numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with ham as (
    select t.k as w, t.v::int as n
    from public.user_export_signals s,
         lateral jsonb_each_text(s.signal_data->'title_word_frequency') as t(k,v)
    where s.user_id = p_user_id
      and s.signal_source = 'daylist_aggregate'
  ),
  suzulmus as (
    select w, n from ham
    where not public.is_calendar_word(w)
      and length(w) >= 3
      and n >= p_min_count
  ),
  toplam as (select coalesce(sum(n),0) as t from suzulmus)
  select s.w,
         s.n,
         round(100.0 * s.n / nullif((select t from toplam),0), 1)
  from suzulmus s
  order by s.n desc, s.w;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.deezer_kapak_adaylari_sanatci(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH paket_sanatci AS (
    SELECT DISTINCT e->>'artist_name' AS ad
    FROM public.user_period_pkg, LATERAL jsonb_array_elements(payload->'top_artists') e
    WHERE nullif(e->>'artist_name', '') IS NOT NULL
  )
  SELECT a.id, a.name
  FROM paket_sanatci p
  JOIN public.artists a ON a.name = p.ad
  WHERE a.image_url IS NULL
    AND a.deezer_image_url IS NULL
    AND (a.deezer_kapak_denendi_at IS NULL OR a.deezer_kapak_denendi_at < now() - interval '30 days')
  ORDER BY a.id
  LIMIT GREATEST(1, LEAST(500, p_limit));
$function$
;

CREATE OR REPLACE FUNCTION public.deezer_kapak_adaylari_track(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, isrc text, title text, artists text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH paket_track AS (
    SELECT DISTINCT (e->>'track_id')::uuid AS track_id
    FROM public.user_period_pkg, LATERAL jsonb_array_elements(payload->'top_tracks') e
    WHERE e->>'track_id' IS NOT NULL
    UNION
    SELECT DISTINCT (c->>'track_id')::uuid
    FROM public.journey_year_pkg,
         LATERAL jsonb_array_elements(COALESCE(payload->'covers', '[]'::jsonb)) c
    WHERE c->>'track_id' IS NOT NULL
  )
  SELECT t.id, t.isrc, t.title, t.artists
  FROM paket_track p
  JOIN public.tracks t ON t.id = p.track_id
  WHERE t.image_url IS NULL
    AND t.deezer_image_url IS NULL
    AND (t.deezer_kapak_denendi_at IS NULL OR t.deezer_kapak_denendi_at < now() - interval '30 days')
  ORDER BY t.id
  LIMIT GREATEST(1, LEAST(500, p_limit));
$function$
;

CREATE OR REPLACE FUNCTION public.demo_dinleme_uret(p_user uuid, p_olay integer DEFAULT 30000, p_gun integer DEFAULT 540)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sanatci  text[]    := ARRAY['Tame Impala', 'Arctic Monkeys', 'Radiohead', 'The Weeknd', 'Billie Eilish',
                                'Daft Punk', 'Dua Lipa', 'Kendrick Lamar', 'Mabel Matiz', 'Duman'];
  v_agirlik  numeric[] := ARRAY[3.0, 2.2, 1.6, 1.5, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6];
  v_toplam_w numeric;
  v_eklenen  integer;
  v_baslik   integer;
BEGIN
  IF NOT public.demo_mi(p_user) THEN
    RAISE EXCEPTION 'demo_dinleme_uret yalniz demo persona icin calisir';
  END IF;
  IF p_olay < 1000 OR p_olay > 100000 OR p_gun < 30 OR p_gun > 1500 THEN
    RAISE EXCEPTION 'gecersiz parametre (olay 1000-100000, gun 30-1500)';
  END IF;

  PERFORM setseed(0.42);
  DELETE FROM public.play_events WHERE user_id = p_user;

  DROP TABLE IF EXISTS _demo_havuz;
  CREATE TEMP TABLE _demo_havuz ON COMMIT DROP AS
  WITH bas AS (
    SELECT DISTINCT ON (t.id)
           t.id, t.duration_ms, a.ord
    FROM unnest(v_sanatci) WITH ORDINALITY AS a(ad, ord)
    JOIN public.tracks t ON a.ad = ANY (t.artists)
    WHERE t.image_url IS NOT NULL AND t.spotify_id IS NOT NULL
    ORDER BY t.id, a.ord
  ),
  bas_agirlikli AS (
    SELECT id, duration_ms,
           v_agirlik[ord] / power(row_number() OVER (PARTITION BY ord ORDER BY id), 0.55) AS w
    FROM bas
  ),
  kuyruk AS (
    SELECT t.id, t.duration_ms, row_number() OVER (ORDER BY random()) AS k
    FROM public.tracks t
    WHERE t.genres IS NOT NULL AND array_length(t.genres, 1) > 0
      AND t.spotify_id IS NOT NULL
      AND t.id NOT IN (SELECT id FROM bas)
    ORDER BY random()
    LIMIT 900
  )
  SELECT id, duration_ms, w FROM bas_agirlikli
  UNION ALL
  SELECT id, duration_ms, 0.5 / power(k, 0.45) FROM kuyruk;

  SELECT count(*) INTO v_baslik FROM _demo_havuz WHERE w >= 0.06;

  DROP TABLE IF EXISTS _demo_kum;
  CREATE TEMP TABLE _demo_kum ON COMMIT DROP AS
  SELECT id, duration_ms, sum(w) OVER (ORDER BY id) AS cum FROM _demo_havuz;
  CREATE INDEX ON _demo_kum (cum);
  SELECT max(cum) INTO v_toplam_w FROM _demo_kum;

  DROP TABLE IF EXISTS _demo_saat;
  CREATE TEMP TABLE _demo_saat ON COMMIT DROP AS
  SELECT h, sum(w) OVER (ORDER BY h) AS cum
  FROM unnest(ARRAY[1.0, 0.5, 0.3, 0.2, 0.2, 0.3, 0.8, 2.0, 3.0, 3.0, 3.2, 3.0,
                    3.2, 3.0, 3.2, 3.5, 4.0, 4.5, 4.5, 4.0, 4.0, 3.8, 3.0, 2.0])
       WITH ORDINALITY AS s(w, h);

  INSERT INTO public.play_events
    (played_at, user_id, track_id, platform, source, ms_played, conn_country,
     reason_start, reason_end, shuffle, skipped, offline, incognito_mode)
  SELECT
    o.played_at, p_user, o.track_id, 'spotify', 'spotify_export',
    o.ms::integer, 'TR',
    CASE WHEN o.atlandi THEN 'clickrow' ELSE 'trackdone' END,
    CASE WHEN o.atlandi THEN 'fwdbtn' ELSE 'trackdone' END,
    o.karisik, o.atlandi, false, false
  FROM (
    SELECT
      date_trunc('day', now())
        - make_interval(days => floor(power(r.r_gun, 1.15) * p_gun)::integer)
        + make_interval(hours => (SELECT s.h - 1 FROM _demo_saat s
                                   WHERE s.cum >= r.r_saat * (SELECT max(cum) FROM _demo_saat)
                                   ORDER BY s.cum LIMIT 1)::integer)
        + make_interval(secs => floor(r.r_sn * 3600)) AS played_at,
      (SELECT k.id FROM _demo_kum k WHERE k.cum >= r.r_sarki * v_toplam_w ORDER BY k.cum LIMIT 1) AS track_id,
      r.atlandi, r.karisik,
      COALESCE((SELECT k.duration_ms FROM _demo_kum k WHERE k.cum >= r.r_sarki * v_toplam_w ORDER BY k.cum LIMIT 1), 210000)
        * CASE WHEN r.atlandi THEN 0.05 + r.r_sure * 0.5 ELSE 0.93 + r.r_sure * 0.07 END AS ms
    FROM (
      SELECT g,
             random() AS r_gun, random() AS r_saat, random() AS r_sn,
             random() AS r_sarki, random() AS r_sure,
             random() < 0.12 AS atlandi, random() < 0.35 AS karisik
      FROM generate_series(1, p_olay) AS g
    ) r
  ) o
  WHERE o.track_id IS NOT NULL AND o.played_at < now()
  ON CONFLICT (user_id, played_at, track_id) DO NOTHING;

  GET DIAGNOSTICS v_eklenen = ROW_COUNT;

  RETURN jsonb_build_object(
    'eklenen', v_eklenen,
    'havuz', (SELECT count(*) FROM _demo_havuz),
    'bas_sarki', v_baslik
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.demo_kullanici_id(p_kod text DEFAULT 'varsayilan'::text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.user_id FROM public.demo_personalar d WHERE d.kod = p_kod;
$function$
;

CREATE OR REPLACE FUNCTION public.demo_kullanici_idleri()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(array_agg(d.user_id) FILTER (WHERE d.user_id IS NOT NULL), '{}'::uuid[])
  FROM public.demo_personalar d;
$function$
;

CREATE OR REPLACE FUNCTION public.demo_mi(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p_user IS NOT NULL AND EXISTS (SELECT 1 FROM public.demo_personalar d WHERE d.user_id = p_user);
$function$
;

CREATE OR REPLACE FUNCTION public.demo_paketleri_uret(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_mood text;
  v_yil  integer;
  v_hata text[] := ARRAY[]::text[];
BEGIN
  IF NOT public.demo_mi(p_user) THEN
    RAISE EXCEPTION 'demo_paketleri_uret yalniz demo persona icin calisir';
  END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  BEGIN PERFORM public.compute_user_track_weights(p_user);     EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('track_weights: ' || SQLERRM); END;
  BEGIN PERFORM public.refresh_listening_summary_cache(p_user); EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('summary_cache: ' || SQLERRM); END;
  BEGIN PERFORM public.build_user_stats_pkg(p_user);            EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('stats: ' || SQLERRM); END;
  BEGIN PERFORM public.build_user_pattern_pkg(p_user);          EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('pattern: ' || SQLERRM); END;
  BEGIN PERFORM public.build_user_period_pkg(p_user);           EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('period: ' || SQLERRM); END;
  BEGIN PERFORM public.build_user_taste_pkg(p_user);            EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('taste_pkg: ' || SQLERRM); END;
  BEGIN PERFORM public.materialize_user_top_strips(p_user, 20); EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('top_strips: ' || SQLERRM); END;
  BEGIN PERFORM public.build_journey_year_pkg(p_user);          EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('journey: ' || SQLERRM); END;
  BEGIN PERFORM public.refresh_user_taste(p_user);              EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('user_taste: ' || SQLERRM); END;
  BEGIN PERFORM public.compute_user_music_metrics(p_user);      EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('metrics: ' || SQLERRM); END;

  FOREACH v_mood IN ARRAY ARRAY['quiet_side', 'full_throttle', 'locked_in', 'no_limit', 'closer', 'miles_away',
                                'gece_217', 'your_day', 'first_light', 'daylight', 'dusk', 'nocturne'] LOOP
    BEGIN PERFORM public.build_mood_pkg(p_user, v_mood);
    EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('mood ' || v_mood || ': ' || SQLERRM); END;
  END LOOP;

  FOR v_yil IN SELECT unnest(public.completed_years_for_user(p_user)) LOOP
    BEGIN PERFORM public.build_year_pkg(p_user, v_yil);
    EXCEPTION WHEN OTHERS THEN v_hata := v_hata || ('year ' || v_yil || ': ' || SQLERRM); END;
  END LOOP;

  RETURN jsonb_build_object('hatalar', to_jsonb(v_hata));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.discovery_bucket_page(p_user_id uuid, p_bucket text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_min_plays integer DEFAULT 20, p_max_plays integer DEFAULT 2, p_stale_days integer DEFAULT 365)
 RETURNS TABLE(track_id uuid, spotify_id text, title text, artist_name text, image_url text, play_count bigint, last_played_at timestamp with time zone, liked_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_bucket not in ('overlooked', 'dusty', 'nostalgia') then
    raise exception 'gecersiz bucket: %', p_bucket;
  end if;

  return query
  with liked as (
    select * from public.user_liked_track_ids(p_user_id)
  ),
  plays as (
    select t.spotify_id as sid, count(*) as n, max(pe.played_at) as last_at
    from public.play_events pe
    join public.tracks t on t.id = pe.track_id
    where pe.user_id = p_user_id and t.spotify_id is not null
    group by t.spotify_id
  ),
  picked as (
    select t.id as track_id, t.spotify_id, t.title,
           coalesce(t.artists[1], '') as artist_name, t.image_url,
           p.n as play_count, p.last_at as last_played_at,
           null::timestamptz as liked_at
    from plays p
    join public.tracks t on t.spotify_id = p.sid
    where p_bucket = 'overlooked'
      and p.n >= p_min_plays
      and not exists (select 1 from liked l where l.spotify_id = p.sid)

    union all

    select t.id, t.spotify_id, t.title, coalesce(t.artists[1], ''), t.image_url,
           coalesce(p.n, 0), p.last_at, l.liked_at
    from liked l
    join public.tracks t on t.spotify_id = l.spotify_id
    left join plays p on p.sid = l.spotify_id
    where p_bucket = 'dusty'
      and coalesce(p.n, 0) <= p_max_plays

    union all

    select t.id, t.spotify_id, t.title, coalesce(t.artists[1], ''), t.image_url,
           coalesce(p.n, 0), p.last_at, l.liked_at
    from liked l
    join public.tracks t on t.spotify_id = l.spotify_id
    left join plays p on p.sid = l.spotify_id
    where p_bucket = 'nostalgia'
      and (p.last_at is null or p.last_at < now() - make_interval(days => p_stale_days))
  ),
  counted as (select count(*) as total from picked)
  select pk.track_id, pk.spotify_id, pk.title, pk.artist_name, pk.image_url,
         pk.play_count, pk.last_played_at, pk.liked_at, c.total
  from picked pk cross join counted c
  order by
    case when p_bucket = 'overlooked' then pk.play_count end desc nulls last,
    case when p_bucket <> 'overlooked' then pk.liked_at end asc nulls last,
    pk.title asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_deleted_not_discoverable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.deleted_at is not null then
    new.is_discoverable := false;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.genre_cosine(a jsonb, b jsonb)
 RETURNS real
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  dot NUMERIC := 0; na NUMERIC := 0; nb NUMERIC := 0; k TEXT; va NUMERIC; vb NUMERIC;
BEGIN
  IF a IS NULL OR b IS NULL THEN RETURN 0; END IF;
  FOR k, va IN SELECT key, value::numeric FROM jsonb_each_text(a) LOOP
    na := na + va*va;
    vb := (b ->> k)::numeric;
    IF vb IS NOT NULL THEN dot := dot + va*vb; END IF;
  END LOOP;
  FOR vb IN SELECT value::numeric FROM jsonb_each_text(b) LOOP nb := nb + vb*vb; END LOOP;
  IF na = 0 OR nb = 0 THEN RETURN 0; END IF;
  RETURN (dot / (sqrt(na) * sqrt(nb)))::real;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.genre_mood_weight(p_genre text, p_mood text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_mood
    when 'party' then case lower(p_genre)
      when 'dance' then 1.0 when 'elektronik' then 1.0 when 'electropop' then 1.0
      when 'house' then 1.0 when 'dubstep' then 1.0 when 'hardstyle' then 1.0
      when 'trap' then 1.0 when 'drill' then 1.0 when 'pop rap' then 1.0
      when 'hip-hop' then 1.0 when 'reggae' then 1.0 when 'latin' then 1.0
      when 't-pop' then 1.0 when 'synthwave' then 1.0 when 'funk' then 0.5
      else 0 end
    when 'love' then case lower(p_genre)
      when 'pop' then 0.6 when 'r&b' then 0.7 when 'soul' then 0.6
      when 'indie pop' then 0.5 when 'funk' then 0.5 when 'art pop' then 0.4
      when 'alternatif' then 0.3 when 'indie rock' then 0.4 when 'rock' then 0.3
      else 0 end
    when 'sad' then case lower(p_genre)
      when 'klasik' then 1.0 when 'ambient' then 1.0 when 'instrumental' then 1.0
      when 'film müzikleri' then 1.0 when 'folk' then 1.0 when 'indie folk' then 1.0
      when 'downtempo' then 1.0 when 'post-rock' then 1.0 when 'lo-fi hip-hop' then 1.0
      when 'blues' then 1.0 when 'jazz' then 1.0 when 'pop' then 0.4
      when 'alternatif' then 0.45 when 'indie pop' then 0.5 when 'indie rock' then 0.25
      when 'r&b' then 0.3 when 'soul' then 0.4 when 'art pop' then 0.6
      else 0 end
    when 'angry' then case lower(p_genre)
      when 'metal' then 1.0 when 'metalcore' then 1.0 when 'hard rock' then 1.0
      when 'punk' then 1.0 when 'pop punk' then 1.0 when 'black metal' then 1.0
      when 'death metal' then 1.0 when 'industrial metal' then 1.0
      when 'alternative rock' then 1.0 when 'rock' then 0.7
      when 'indie rock' then 0.35 when 'alternatif' then 0.25
      else 0 end
    else 0
  end::numeric
$function$
;

CREATE OR REPLACE FUNCTION public.genre_play_counts_2025(p_user_id uuid)
 RETURNS TABLE(genre text, play_count bigint, total_plays bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with p as (
    select pe.id, pe.track_id
    from public.play_events pe
    where pe.user_id = p_user_id
      and pe.played_at >= '2025-01-01'::timestamptz
      and pe.played_at <  '2026-01-01'::timestamptz
  ),
  toplam as (select count(*)::bigint as n from p),
  sayim as (
    select g as tur, count(*)::bigint as n
    from p
    join public.tracks t on t.id = p.track_id
    cross join lateral unnest(t.genres) g
    group by g
  )
  select s.tur, s.n, (select n from toplam)
  from sayim s
  order by s.n desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.genre_to_archetype_noun(p_genre text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_genre in ('hip-hop','rap','underground hip-hop','pop rap','jazz rap') then 'Ritim Avcısı'
    when p_genre in ('trap','drill') then 'Beat Bağımlısı'
    when p_genre = 'pop' or p_genre like '%pop%' then 'Nakarat Ustası'
    when p_genre in ('rock','hard rock','garage rock','post-rock') then 'Rock Tutkunu'
    when p_genre in ('alternatif','alternative','alternative rock') then 'Alternatif Ruh'
    when p_genre in ('indie rock','indie pop','indie') then 'Indie Gezgini'
    when p_genre in ('elektronik','electronic','downtempo','ambient') then 'Elektronik Gezgin'
    when p_genre in ('metal','metalcore') then 'Sert Ritimci'
    when p_genre in ('klasik','classical','instrumental','film müzikleri') then 'Zamansız Dinleyici'
    when p_genre in ('jazz','soul','r&b') then 'Mavi Nota'
    when p_genre = 'folk' then 'Notaların Peşinde'
    when p_genre = 'reggae' then 'Sınır Tanımayan Kulak'
    else 'Müzikal Gezgin'
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.genre_to_label(p_genre text, p_entropy numeric DEFAULT NULL::numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_genre is null or p_genre = '' then ''
    when p_genre in ('hip-hop','rap','underground hip-hop','pop rap','jazz rap') then 'Hip-Hop'
    when p_genre in ('trap','drill') then 'Trap'
    when p_genre = 'pop' or p_genre like '%pop%' then 'Pop'
    when p_genre in ('rock','hard rock','garage rock','post-rock') then 'Rock'
    when p_genre in ('alternatif','alternative','alternative rock') then 'Alternatif'
    when p_genre in ('indie rock','indie pop','indie') then 'Indie'
    when p_genre in ('elektronik','electronic','downtempo','ambient') then 'Elektronik'
    when p_genre in ('metal','metalcore') then 'Metal'
    when p_genre in ('klasik','classical','instrumental','film müzikleri') then 'Klasik'
    when p_genre in ('jazz','soul','r&b') then 'Soul'
    when p_genre = 'folk' then 'Folk'
    when p_genre = 'reggae' then 'Reggae'
    else initcap(p_genre)
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_artist_detail(p_user_id uuid, p_name text)
 RETURNS TABLE(name text, genres text[], play_count bigint, total_minutes bigint, track_count bigint, first_played timestamp with time zone, last_played timestamp with time zone, active_months bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p_name                                               as name,
    (
      select array_agg(distinct g order by g)
      from public.tracks t2, unnest(t2.genres) g
      where t2.artists[1] = p_name and t2.genres is not null
    )                                                    as genres,
    count(pe.*)                                          as play_count,
    coalesce(round(sum(pe.ms_played) / 60000.0), 0)::bigint as total_minutes,
    count(distinct tr.id)                                as track_count,
    min(pe.played_at)                                    as first_played,
    max(pe.played_at)                                    as last_played,
    count(distinct date_trunc('month', pe.played_at))    as active_months
  from public.tracks tr
  join public.play_events pe
    on pe.track_id = tr.id and pe.user_id = p_user_id
  where tr.artists[1] = p_name
    and (p_user_id = auth.uid() or auth.role() = 'service_role');
$function$
;

CREATE OR REPLACE FUNCTION public.get_artist_top_tracks(p_user_id uuid, p_name text, p_limit integer DEFAULT 10)
 RETURNS TABLE(track_id uuid, title text, play_count bigint, minutes bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    tr.id                                                as track_id,
    tr.title,
    count(*)                                             as play_count,
    coalesce(round(sum(pe.ms_played) / 60000.0), 0)::bigint as minutes
  from public.tracks tr
  join public.play_events pe
    on pe.track_id = tr.id and pe.user_id = p_user_id
  where tr.artists[1] = p_name
    and (p_user_id = auth.uid() or auth.role() = 'service_role')
  group by tr.id, tr.title
  order by count(*) desc
  limit greatest(least(p_limit, 50), 1);
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_first_played(p_user_id uuid)
 RETURNS TABLE(track_id uuid, title text, artist text, image_url text, played_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.title, t.artists[1] as artist, t.image_url, pe.played_at
  from public.play_events pe
  join public.tracks t on t.id = pe.track_id
  where pe.user_id = p_user_id
    and (p_user_id = auth.uid() or auth.role() = 'service_role')
    and not (t.spotify_id is null and t.title = 'Unknown Track')
  order by pe.played_at asc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_last_played(p_user_id uuid)
 RETURNS TABLE(track_id uuid, title text, artist text, image_url text, played_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.title, t.artists[1] as artist, t.image_url, pe.played_at
  from public.play_events pe
  join public.tracks t on t.id = pe.track_id
  where pe.user_id = p_user_id
    and (p_user_id = auth.uid() or auth.role() = 'service_role')
    and not (t.spotify_id is null and t.title = 'Unknown Track')
  order by pe.played_at desc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_lock_status(p_user_id uuid)
 RETURNS TABLE(unlocked boolean, questions_total integer, questions_answered integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  a as (
    select count(distinct jra.question_key)::int as n
    from public.journey_ritual_answers jra, guard
    where jra.user_id = p_user_id
  )
  select
    ((select n from a) >= 5) as unlocked,
    5 as questions_total,
    (select n from a) as questions_answered
  from guard;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_mining_events(p_user_id uuid, p_year integer)
 RETURNS TABLE(track_id uuid, played_at timestamp with time zone, ms_played integer, reason_start text, reason_end text, shuffle boolean, skipped boolean, release_year integer, duration_ms integer, title text, artist text, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT 1 WHERE p_user_id = auth.uid() OR auth.role() = 'service_role'
  )
  SELECT
    pe.track_id,
    pe.played_at,
    pe.ms_played,
    pe.reason_start,
    pe.reason_end,
    pe.shuffle,
    pe.skipped,
    t.release_year,
    t.duration_ms,
    t.title,
    coalesce(t.artists[1], 'Bilinmeyen sanatçı') AS artist,
    t.image_url
  FROM public.play_events pe
  JOIN public.tracks t ON t.id = pe.track_id
  JOIN guard ON true
  WHERE pe.user_id = p_user_id
    AND pe.played_at >= make_date(p_year, 1, 1)
    AND pe.played_at <  make_date(p_year + 1, 1, 1)
    AND NOT (t.spotify_id IS NULL AND t.title = 'Unknown Track')
  ORDER BY pe.played_at ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_pillar_candidates(p_user_id uuid)
 RETURNS TABLE(track_id uuid, title text, artist text, image_url text, total_plays bigint, active_months bigint, skip_rate numeric, first_played_at timestamp with time zone, last_played_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH guard AS (
    SELECT 1 WHERE p_user_id = auth.uid() OR auth.role() = 'service_role'
  ),
  track_months AS (
    SELECT
      pe.track_id,
      date_trunc('month', pe.played_at) AS m,
      count(*) AS month_plays,
      count(*) FILTER (WHERE pe.skipped = true OR pe.reason_end = 'fwdbtn') AS month_skips,
      min(pe.played_at) AS min_p,
      max(pe.played_at) AS max_p
    FROM public.play_events pe
    JOIN guard ON true
    WHERE pe.user_id = p_user_id
      AND pe.track_id NOT IN (SELECT id FROM public.tracks WHERE spotify_id IS NULL AND title = 'Unknown Track')
    GROUP BY pe.track_id, date_trunc('month', pe.played_at)
  )
  SELECT
    tm.track_id,
    t.title,
    coalesce(t.artists[1], 'Bilinmeyen sanatçı') AS artist,
    t.image_url,
    sum(tm.month_plays)::bigint AS total_plays,
    count(DISTINCT tm.m)::bigint AS active_months,
    round((sum(tm.month_skips)::numeric / nullif(sum(tm.month_plays), 0)), 4) AS skip_rate,
    min(tm.min_p) AS first_played_at,
    max(tm.max_p) AS last_played_at
  FROM track_months tm
  JOIN public.tracks t ON t.id = tm.track_id
  GROUP BY tm.track_id, t.title, t.artists, t.image_url
  HAVING count(DISTINCT tm.m) >= 12 AND sum(tm.month_plays) >= 30
  ORDER BY active_months DESC, total_plays DESC
  LIMIT 50;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_survey_state(p_user_id uuid)
 RETURNS TABLE(year integer, answered boolean, play_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  yrs as (
    select extract(year from pe.played_at)::int as y,
           count(*) as n,
           count(distinct date_trunc('month', pe.played_at)) as months
    from public.play_events pe, guard
    where pe.user_id = p_user_id
    group by 1
  )
  select yrs.y,
         exists (select 1 from public.journey_year_milestones m
                 where m.user_id = p_user_id and m.year = yrs.y),
         yrs.n
  from yrs
  where yrs.n >= 500 and yrs.months >= 3
  order by yrs.y;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_year_covers(p_user_id uuid, p_year integer, p_limit integer DEFAULT 20)
 RETURNS TABLE(track_id uuid, title text, artist text, spotify_id text, image_url text, plays bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  )
  select t.id, t.title, t.artists[1], t.spotify_id, t.image_url, count(*) as plays
  from public.play_events pe
    join public.tracks t on t.id = pe.track_id, guard
  where pe.user_id = p_user_id
    and pe.played_at >= make_date(p_year, 1, 1)
    and pe.played_at <  make_date(p_year + 1, 1, 1)
    and t.spotify_id is not null
  group by t.id, t.title, t.artists, t.spotify_id, t.image_url
  order by plays desc
  limit greatest(1, least(p_limit, 60));
$function$
;

CREATE OR REPLACE FUNCTION public.get_journey_years(p_user_id uuid)
 RETURNS TABLE(year integer, play_count bigint, total_minutes integer, track_count bigint, artist_count bigint, new_artist_count bigint, discovery_rate numeric, loyalty numeric, dominant_genre text, genre_label text, genre_variety integer, dominant_share numeric, genre_breakdown jsonb, is_breakpoint boolean, top_track_title text, top_track_artist text, top_track_plays bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  ev as (
    select pe.played_at, pe.track_id, pe.ms_played, t.title, t.artists, t.genres,
           date_part('year', pe.played_at)::int as yr
    from public.play_events pe
      join public.tracks t on t.id = pe.track_id, guard
    where pe.user_id = p_user_id
      and not (t.spotify_id is null and t.title = 'Unknown Track')
  ),
  artist_first as (
    select artists[1] as artist, min(yr) as first_year
    from ev where array_length(artists, 1) > 0 group by 1
  ),
  base as (
    select yr,
      count(*) as play_count,
      round(sum(ms_played) / 60000.0)::int as total_minutes,
      count(distinct track_id) as track_count,
      count(distinct artists[1]) filter (where array_length(artists,1) > 0) as artist_count,
      count(distinct date_trunc('month', played_at)) as months
    from ev group by yr
  ),
  new_artists as (
    select e.yr, count(distinct e.artists[1]) as new_artist_count
    from ev e join artist_first af
      on af.artist = e.artists[1] and af.first_year = e.yr
    group by e.yr
  ),
  genre_counts as (
    select e.yr, g.genre, count(*) as n
    from ev e cross join lateral unnest(e.genres) as g(genre)
    where e.genres is not null
    group by 1, 2
  ),
  genre_totals as (
    select yr, sum(n) as total, count(*) as variety from genre_counts group by yr
  ),
  dominant as (
    select distinct on (gc.yr) gc.yr, gc.genre, gc.n
    from genre_counts gc order by gc.yr, gc.n desc
  ),
  labeled as (
    select gc.yr, public.genre_to_label(gc.genre) as label, sum(gc.n) as n
    from genre_counts gc
    where public.genre_to_label(gc.genre) <> ''
    group by 1, 2
  ),
  ranked as (
    select yr, label, n,
           row_number() over (partition by yr order by n desc) as rn
    from labeled
  ),
  breakdown as (
    select r.yr,
      jsonb_agg(
        jsonb_build_object('label', r.label,
                           'share', round(r.n::numeric / gt.total, 4))
        order by r.n desc
      ) as bd
    from ranked r
      join genre_totals gt on gt.yr = r.yr
    where r.rn <= 6
    group by r.yr
  ),
  top_track as (
    select distinct on (yr) yr, title, artists[1] as artist, cnt
    from (
      select yr, track_id, title, artists, count(*) as cnt
      from ev group by yr, track_id, title, artists
    ) x
    order by yr, cnt desc
  ),
  joined as (
    select
      b.yr,
      b.play_count,
      b.total_minutes,
      b.track_count,
      b.artist_count,
      coalesce(na.new_artist_count, 0) as new_artist_count,
      case when b.artist_count > 0
           then round(coalesce(na.new_artist_count,0)::numeric / b.artist_count, 4)
           else 0 end as discovery_rate,
      case when b.track_count > 0
           then round(b.play_count::numeric / b.track_count, 2)
           else 0 end as loyalty,
      d.genre as dominant_genre,
      public.genre_to_label(d.genre) as genre_label,
      coalesce(gt.variety, 0)::int as genre_variety,
      case when gt.total > 0 then round(d.n::numeric / gt.total, 4) else 0 end as dominant_share,
      coalesce(bd.bd, '[]'::jsonb) as genre_breakdown,
      tt.title as top_track_title,
      tt.artist as top_track_artist,
      tt.cnt as top_track_plays
    from base b
      left join new_artists na on na.yr = b.yr
      left join dominant d on d.yr = b.yr
      left join genre_totals gt on gt.yr = b.yr
      left join breakdown bd on bd.yr = b.yr
      left join top_track tt on tt.yr = b.yr
    where b.play_count >= 500 and b.months >= 3
  ),
  with_prev as (
    select j.*,
      lag(j.dominant_genre) over (order by j.yr) as prev_genre,
      lag(j.discovery_rate) over (order by j.yr) as prev_discovery,
      lag(j.play_count)     over (order by j.yr) as prev_plays
    from joined j
  )
  select
    yr, play_count, total_minutes, track_count, artist_count, new_artist_count,
    discovery_rate, loyalty, dominant_genre, genre_label,
    genre_variety, dominant_share, genre_breakdown,
    (
      prev_genre is not null
      and dominant_genre is distinct from prev_genre
      and (
        (prev_discovery - discovery_rate) >= 0.15
        or (prev_plays > 0 and abs(play_count - prev_plays)::numeric / prev_plays >= 0.25)
      )
    ) as is_breakpoint,
    top_track_title, top_track_artist, top_track_plays
  from with_prev
  order by yr;
$function$
;

CREATE OR REPLACE FUNCTION public.get_migration_queue(p_user_id uuid)
 RETURNS TABLE(id uuid, playlist_id uuid, playlist_name text, source text, target text, status text, queue_position integer, total_tracks integer, done_tracks integer, failed_tracks integer, daily_limit integer, capacity_today integer, eta_days integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    q.id, q.playlist_id, q.playlist_name, q.source, q.target, q.status,
    q.position, q.total_tracks, q.done_tracks, q.failed_tracks,
    public.plan_daily_migration_limit(public.get_user_plan(p_user_id)),
    public.user_migration_capacity_today(p_user_id),
    case
      when q.status in ('completed', 'cancelled', 'failed') then 0
      when (q.total_tracks - q.done_tracks)
             <= public.user_migration_capacity_today(p_user_id) then 0
      else ceil(
        (q.total_tracks - q.done_tracks
          - public.user_migration_capacity_today(p_user_id))::numeric
        / greatest(public.plan_daily_migration_limit(public.get_user_plan(p_user_id)), 1)
      )::integer
    end,
    q.created_at
  from public.migration_queue q
  where q.user_id = p_user_id
    and q.status <> 'completed'
    -- Yetki: kendisi veya worker. Başkasının kuyruğu GÖRÜNMEZ.
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
  order by
    case q.status when 'running' then 0 when 'queued' then 1 else 2 end,
    q.position, q.created_at;
$function$
;

CREATE OR REPLACE FUNCTION public.get_mood_weekly_sync_candidates()
 RETURNS TABLE(user_id uuid, mood_key text, exported_playlist_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT w.user_id, w.mood_key, w.exported_playlist_id
  FROM public.mood_workspace w
  WHERE w.weekly_sync_enabled = true
    AND w.exported_playlist_id IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.get_mood_workspace(p_mood_key text)
 RETURNS TABLE(hidden_track_ids uuid[], approved_track_ids uuid[], exported_at timestamp with time zone, exported_playlist_id text, weekly_sync_enabled boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    coalesce(w.hidden_track_ids, '{}'::uuid[]),
    coalesce(w.approved_track_ids, '{}'::uuid[]),
    w.exported_at,
    w.exported_playlist_id,
    coalesce(w.weekly_sync_enabled, false)
  FROM (SELECT (SELECT auth.uid()) AS uid) me
  LEFT JOIN public.mood_workspace w
    ON w.user_id = me.uid AND w.mood_key = p_mood_key;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS TABLE(id uuid, display_name text, avatar_url text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    id,
    raw_user_meta_data->>'display_name' AS display_name,
    raw_user_meta_data->>'avatar_url'   AS avatar_url,
    created_at
  FROM auth.users
  WHERE id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_recap_by_label(p_user_id uuid, p_period_label text)
 RETURNS TABLE(id uuid, period_type text, period_label text, period_start date, period_end date, payload jsonb, generated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  select r.id, r.period_type, r.period_label,
         r.period_start, r.period_end, r.payload, r.generated_at
  from public.recaps r
  where r.user_id = p_user_id
    and r.period_label = p_period_label
  limit 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ritual_state(p_user_id uuid)
 RETURNS TABLE(question_key text, years integer[], answered boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  keys as (
    select unnest(array['career_peak','lost_year','found_year','love_year','inward_year']) as k
    from guard
  ),
  agg as (
    select question_key, array_agg(year order by year) as years
    from public.journey_ritual_answers
    where user_id = p_user_id
    group by question_key
  )
  select
    keys.k,
    coalesce(agg.years, '{}'::int[]),
    (agg.years is not null and array_length(agg.years, 1) > 0) as answered
  from keys
  left join agg on agg.question_key = keys.k
  order by keys.k;
$function$
;

CREATE OR REPLACE FUNCTION public.get_spotify_capacity()
 RETURNS TABLE(used integer, limit_total integer, pending integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    (select count(*)::int from public.spotify_allowlist_requests
      where status in ('approved', 'active')) as used,
    5 as limit_total,
    (select count(*)::int from public.spotify_allowlist_requests
      where status = 'pending') as pending
  where auth.role() = 'service_role';
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_tracks_for_rule(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer DEFAULT 50, p_skipped boolean DEFAULT false, p_min_plays integer DEFAULT NULL::integer, p_hour_from integer DEFAULT NULL::integer, p_hour_to integer DEFAULT NULL::integer, p_sort_by text DEFAULT 'plays'::text)
 RETURNS TABLE(track_id uuid, raw_track_name text, raw_artist_name text, play_count bigint, total_ms bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    pe.track_id,
    tr.title AS raw_track_name,
    (CASE WHEN array_length(tr.artists, 1) > 0 THEN tr.artists[1] ELSE NULL END) AS raw_artist_name,
    COUNT(*) AS play_count,
    COALESCE(sum(pe.ms_played), 0) AS total_ms
  FROM public.play_events pe
  JOIN public.tracks tr ON tr.id = pe.track_id
  WHERE pe.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND pe.played_at >= p_from
    AND pe.played_at <= p_to
    AND pe.incognito_mode = false
    AND (NOT p_skipped OR pe.skipped = true)
    AND (
      p_hour_from IS NULL OR p_hour_to IS NULL
      OR extract(hour FROM pe.played_at AT TIME ZONE 'Europe/Istanbul')::int
         BETWEEN p_hour_from AND p_hour_to
    )
  GROUP BY pe.track_id, tr.title, tr.artists
  HAVING (p_min_plays IS NULL OR COUNT(*) >= p_min_plays)
  ORDER BY
    CASE WHEN p_sort_by = 'duration' THEN COALESCE(sum(pe.ms_played), 0) END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'duration' THEN COUNT(*) END DESC NULLS LAST,
    CASE WHEN p_sort_by <> 'duration' THEN COUNT(*) END DESC NULLS LAST,
    CASE WHEN p_sort_by <> 'duration' THEN COALESCE(sum(pe.ms_played), 0) END DESC NULLS LAST
  LIMIT GREATEST(p_limit, 0);
$function$
;

CREATE OR REPLACE FUNCTION public.get_track_detail(p_user_id uuid, p_track_id uuid)
 RETURNS TABLE(id uuid, title text, artists text[], genres text[], spotify_id text, isrc text, play_count bigint, total_minutes bigint, first_played timestamp with time zone, last_played timestamp with time zone, active_months bigint, playlist_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    tr.id,
    tr.title,
    tr.artists,
    tr.genres,
    tr.spotify_id,
    tr.isrc,
    count(pe.*)                                          as play_count,
    coalesce(round(sum(pe.ms_played) / 60000.0), 0)::bigint as total_minutes,
    min(pe.played_at)                                    as first_played,
    max(pe.played_at)                                    as last_played,
    count(distinct date_trunc('month', pe.played_at))    as active_months,
    (
      select count(*)
      from public.playlist_tracks pt
      join public.playlists pl on pl.id = pt.playlist_id
      where pt.track_id = tr.id and pl.user_id = p_user_id
    )                                                    as playlist_count
  from public.tracks tr
  left join public.play_events pe
    on pe.track_id = tr.id and pe.user_id = p_user_id
  where tr.id = p_track_id
    and (p_user_id = auth.uid() or auth.role() = 'service_role')
  group by tr.id, tr.title, tr.artists, tr.genres, tr.spotify_id, tr.isrc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_track_timeline(p_user_id uuid, p_track_id uuid)
 RETURNS TABLE(month date, plays bigint, bucket_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_min timestamptz;
  v_max timestamptz;
  v_span interval;
  v_trunc text;
begin
  -- IDOR guard: yalnız kendi verisi ya da service_role.
  if not (p_user_id = auth.uid() or auth.role() = 'service_role') then
    return;
  end if;

  select min(pe.played_at), max(pe.played_at)
    into v_min, v_max
  from public.play_events pe
  where pe.user_id = p_user_id
    and pe.track_id = p_track_id;

  if v_min is null then
    return; -- hiç çalma yok
  end if;

  v_span := v_max - v_min;

  -- Kova genişliğini aralığa göre seç.
  if v_span < interval '14 days' then
    v_trunc := 'day';
  elsif v_span < interval '3 months' then
    v_trunc := 'week';
  elsif v_span < interval '2 years' then
    v_trunc := 'month';
  else
    v_trunc := 'quarter';
  end if;

  return query
    select
      date_trunc(v_trunc, pe.played_at)::date as month,
      count(*)                                as plays,
      v_trunc                                 as bucket_type
    from public.play_events pe
    where pe.user_id = p_user_id
      and pe.track_id = p_track_id
    group by 1
    order by 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_export_signals(p_user_id uuid)
 RETURNS TABLE(signal_source text, signal_data jsonb, imported_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.signal_source, s.signal_data, s.imported_at
  FROM public.user_export_signals s
  WHERE s.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
  ORDER BY s.imported_at DESC NULLS LAST;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select plan from public.user_plans where user_id = p_user_id), 'free');
$function$
;

CREATE OR REPLACE FUNCTION public.get_yearly_champion_artists(p_user_id uuid)
 RETURNS TABLE(year integer, artist_name text, play_count bigint, total_ms bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH per_year AS (
    SELECT
      extract(year FROM pe.played_at AT TIME ZONE 'Europe/Istanbul')::int AS yr,
      tr.artists[1] AS artist,
      sum(pe.ms_played) AS total_ms,
      count(*) AS play_count,
      row_number() OVER (
        PARTITION BY extract(year FROM pe.played_at AT TIME ZONE 'Europe/Istanbul')::int
        ORDER BY sum(pe.ms_played) DESC
      ) AS rn
    FROM public.play_events pe
    JOIN public.tracks tr ON tr.id = pe.track_id
    WHERE pe.user_id = p_user_id
      AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
      AND pe.incognito_mode = false
      AND array_length(tr.artists, 1) > 0
    GROUP BY 1, tr.artists[1]
  )
  SELECT yr AS year, artist AS artist_name, play_count, total_ms
  FROM per_year
  WHERE rn = 1
  ORDER BY yr ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.history_top_albums(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50, p_sort text DEFAULT 'time'::text, p_offset integer DEFAULT 0)
 RETURNS TABLE(album text, artist_name text, image_url text, play_count bigint, total_ms bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      t.album                   AS al,
      MIN(t.artists[1])         AS an,
      MIN(t.image_url)          AS img,
      COUNT(*)::bigint          AS pc,
      SUM(pe.ms_played)::bigint AS tms
    FROM play_events pe
    JOIN tracks t ON t.id = pe.track_id
    WHERE pe.user_id        = p_user_id
      AND pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true
      AND pe.ms_played      >= 5000
      AND t.album IS NOT NULL
      AND (p_to   IS NULL OR pe.played_at <= p_to)
      AND (p_from IS NULL OR pe.played_at >= p_from)
      AND NOT (t.spotify_id IS NULL AND t.title = 'Unknown Track')
    GROUP BY t.album
    ORDER BY
      CASE WHEN p_sort = 'count'  THEN COUNT(*) END DESC NULLS LAST,
      CASE WHEN p_sort <> 'count' THEN SUM(pe.ms_played) END DESC NULLS LAST,
      t.album
    LIMIT  GREATEST(p_limit, 1)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT a.al, a.an, a.img, a.pc, a.tms
  FROM agg a
  ORDER BY
    CASE WHEN p_sort = 'count'  THEN a.pc END DESC NULLS LAST,
    CASE WHEN p_sort <> 'count' THEN a.tms END DESC NULLS LAST,
    a.al;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.history_top_artists(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50, p_sort text DEFAULT 'time'::text, p_offset integer DEFAULT 0)
 RETURNS TABLE(artist_name text, image_url text, play_count bigint, total_ms bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      t.artists[1]              AS an,
      COUNT(*)::bigint          AS pc,
      SUM(pe.ms_played)::bigint AS tms
    FROM play_events pe
    JOIN tracks t ON t.id = pe.track_id
    WHERE pe.user_id        = p_user_id
      AND pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true
      AND pe.ms_played      >= 5000
      AND t.artists[1] IS NOT NULL
      AND (p_to   IS NULL OR pe.played_at <= p_to)
      AND (p_from IS NULL OR pe.played_at >= p_from)
      AND NOT (t.spotify_id IS NULL AND t.title = 'Unknown Track')
    GROUP BY t.artists[1]
    ORDER BY
      CASE WHEN p_sort = 'count'  THEN COUNT(*) END DESC NULLS LAST,
      CASE WHEN p_sort <> 'count' THEN SUM(pe.ms_played) END DESC NULLS LAST,
      t.artists[1]
    LIMIT  GREATEST(p_limit, 1)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT
    a.an,
    (
      SELECT ar.image_url
      FROM artists ar
      WHERE ar.name = a.an
      ORDER BY ar.image_url NULLS LAST
      LIMIT 1
    ) AS image_url,
    a.pc, a.tms
  FROM agg a
  ORDER BY
    CASE WHEN p_sort = 'count'  THEN a.pc END DESC NULLS LAST,
    CASE WHEN p_sort <> 'count' THEN a.tms END DESC NULLS LAST,
    a.an;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.history_top_tracks(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50, p_sort text DEFAULT 'time'::text, p_offset integer DEFAULT 0)
 RETURNS TABLE(track_id uuid, title text, artist_name text, album text, image_url text, play_count bigint, total_ms bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      pe.track_id               AS tid,
      COUNT(*)::bigint          AS pc,
      SUM(pe.ms_played)::bigint AS tms
    FROM play_events pe
    WHERE pe.user_id        = p_user_id
      AND pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true
      AND pe.ms_played      >= 5000
      AND (p_to   IS NULL OR pe.played_at <= p_to)
      AND (p_from IS NULL OR pe.played_at >= p_from)
      AND pe.track_id NOT IN (SELECT tracks.id FROM tracks WHERE tracks.spotify_id IS NULL AND tracks.title = 'Unknown Track')
    GROUP BY pe.track_id
    ORDER BY
      CASE WHEN p_sort = 'count'  THEN COUNT(*) END DESC NULLS LAST,
      CASE WHEN p_sort <> 'count' THEN SUM(pe.ms_played) END DESC NULLS LAST,
      pe.track_id
    LIMIT  GREATEST(p_limit, 1)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT
    a.tid, t.title, t.artists[1], t.album, t.image_url, a.pc, a.tms
  FROM agg a
  JOIN tracks t ON t.id = a.tid
  ORDER BY
    CASE WHEN p_sort = 'count'  THEN a.pc END DESC NULLS LAST,
    CASE WHEN p_sort <> 'count' THEN a.tms END DESC NULLS LAST,
    a.tid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.inference_label_to_genre(p_label text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case lower(trim(split_part(p_label, '|', 3)))
    when 'pop'         then 'pop'
    when 'rock'        then 'rock'
    when 'metal'       then 'metal'
    when 'punk'        then 'punk'
    when 'indie'       then 'indie'
    when 'trap'        then 'trap'
    when 'hip-hop'     then 'hip-hop'
    when 'r&b'         then 'r&b'
    when 'soul'        then 'soul'
    when 'blues'       then 'blues'
    when 'jazz'        then 'jazz'
    when 'folk'        then 'folk'
    when 'classical'   then 'classical'
    when 'edm'         then 'electronic'
    when 'emo'         then 'emo'
    when 'soundtrack'  then 'soundtrack'
    when 'eras oldies' then 'oldies'
    else null
  end
$function$
;

CREATE OR REPLACE FUNCTION public.insert_tracks_batch(p_tracks jsonb)
 RETURNS TABLE(spotify_id text, track_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH girdi AS (
    SELECT t AS j, (t->>'spotify_id')::text AS sid
      FROM jsonb_array_elements(p_tracks) AS t
     WHERE (t->>'spotify_id') IS NOT NULL
  ),
  aliasli AS (
    SELECT g.sid, a.track_id AS tid
      FROM girdi g
      JOIN public.track_spotify_alias a ON a.spotify_id = g.sid
     WHERE NOT EXISTS (SELECT 1 FROM public.tracks x WHERE x.spotify_id = g.sid)
  ),
  eklenen AS (
    INSERT INTO public.tracks (spotify_id, title, artists, album, duration_ms, release_year, spotify_artist_ids)
    SELECT
      g.sid,
      (g.j->>'title')::text,
      ARRAY(SELECT jsonb_array_elements_text(g.j->'artists')),
      (g.j->>'album')::text,
      (g.j->>'duration_ms')::integer,
      (g.j->>'release_year')::integer,
      CASE WHEN g.j->'spotify_artist_ids' IS NOT NULL AND jsonb_typeof(g.j->'spotify_artist_ids') = 'array'
           THEN ARRAY(SELECT jsonb_array_elements_text(g.j->'spotify_artist_ids'))
           ELSE NULL END
    FROM girdi g
    WHERE NOT EXISTS (SELECT 1 FROM aliasli a WHERE a.sid = g.sid)
    ON CONFLICT (spotify_id) DO UPDATE
      SET
        title              = EXCLUDED.title,
        artists            = EXCLUDED.artists,
        album              = COALESCE(EXCLUDED.album, tracks.album),
        duration_ms        = COALESCE(EXCLUDED.duration_ms, tracks.duration_ms),
        spotify_artist_ids = COALESCE(EXCLUDED.spotify_artist_ids, tracks.spotify_artist_ids),
        updated_at         = NOW()
    RETURNING tracks.spotify_id AS sid, tracks.id AS tid
  )
  SELECT e.sid, e.tid FROM eklenen e
  UNION ALL
  SELECT a.sid, a.tid FROM aliasli a;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invalidate_journey_years(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  delete from public.journey_year_pkg where user_id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_account_purge_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_app_url text;
  v_target_url text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_account_purge_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_app_url FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1;
  v_target_url := rtrim(coalesce(v_app_url, public.rosso_app_url(), ''), '/') || '/api/cron/account-purge';

  SELECT net.http_post(
    url := v_target_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object('source', 'pg_cron', 'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_auto_playlists_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_auto_playlists_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := coalesce(public.rosso_app_url(), '') || '/api/cron/auto-playlists',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_catalog_enrichment_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_app_url text;
  v_target_url text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_catalog_enrichment_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_app_url FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1;
  v_target_url := rtrim(coalesce(v_app_url, public.rosso_app_url(), ''), '/') || '/api/cron/catalog-enrichment';

  SELECT net.http_post(
    url := v_target_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object('source', 'pg_cron', 'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    -- Rota `maxDuration` 300 sn; pg_net beklemesi onun üstünde olmalı ki
    -- yanıt "timeout" diye kaydedilmesin.
    timeout_milliseconds := 300000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_cron_rota(p_yol text, p_timeout_ms integer DEFAULT 310000, p_govde jsonb DEFAULT '{}'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret     text;
  v_app_url    text;
  v_request_id bigint;
BEGIN
  IF p_yol !~ '^/api/cron/[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'invoke_cron_rota: gecersiz yol %', p_yol;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_cron_rota] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_app_url FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1;

  SELECT net.http_post(
    url := rtrim(coalesce(v_app_url, public.rosso_app_url(), ''), '/') || p_yol,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := p_govde || jsonb_build_object(
      'source', 'pg_cron',
      'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    timeout_milliseconds := p_timeout_ms
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_mood_pkg_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_app_url text;
  v_target_url text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_mood_pkg_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_app_url FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1;
  v_target_url := rtrim(coalesce(v_app_url, public.rosso_app_url(), ''), '/') || '/api/cron/mood-pkg';

  SELECT net.http_post(
    url := v_target_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object('source', 'pg_cron', 'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    -- 🔴 0330: rota `maxDuration` 300 sn. Buradaki değer ONUN ÜSTÜNDE olmalı,
    -- yoksa pg_net turu ortasından keser ve Spotify senkronu hiç çalışmaz.
    timeout_milliseconds := 300000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_playlist_refresh_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_app_url text;
  v_target_url text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_playlist_refresh_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_app_url FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1;
  v_target_url := rtrim(coalesce(v_app_url, public.rosso_app_url(), ''), '/') || '/api/cron/playlist-refresh';

  SELECT net.http_post(
    url := v_target_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object('source', 'pg_cron', 'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_recap_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_recap_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := coalesce(public.rosso_app_url(), '') || '/api/cron/recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_spotify_sync_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_request_id bigint;
BEGIN
  -- Retrieve encrypted secret from Supabase Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_spotify_sync_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  -- Fire async HTTP POST to Next.js API route
  SELECT net.http_post(
    url := coalesce(public.rosso_app_url(), '') || '/api/cron/sync-spotify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_worker_maintenance_cron(p_task text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_secret text;
  v_app_url text;
  v_target_url text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RAISE WARNING '[invoke_worker_maintenance_cron] cron_secret not found in vault.decrypted_secrets';
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_app_url
  FROM vault.decrypted_secrets
  WHERE name = 'app_url'
  LIMIT 1;

  IF v_app_url IS NOT NULL AND length(v_app_url) > 0 THEN
    v_target_url := rtrim(v_app_url, '/') || '/api/cron/trigger-worker-maintenance';
  ELSE
    v_target_url := coalesce(public.rosso_app_url(), '') || '/api/cron/trigger-worker-maintenance';
  END IF;

  SELECT net.http_post(
    url := v_target_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'task', p_task,
      'source', 'pg_cron',
      'scheduled_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_calendar_word(p_word text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select lower(trim(p_word)) in (
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
    'pazartesi','salı','sali','çarşamba','carsamba','perşembe','persembe',
    'cuma','cumartesi','pazar',
    'morning','afternoon','evening','night','early','late','noon','midnight',
    'sabah','öğle','ogle','öğleden','ogleden','sonra','akşam','aksam','gece',
    'geç','gec','saatlerde','erken',
    'daylist','mix','the','and','of','a','an','your','de','da','ve','ile'
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_real_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((raw_user_meta_data->>'is_test')::boolean, false) = false
  FROM auth.users
  WHERE id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.journey_car_top_tracks(p_user_id uuid, p_limit integer DEFAULT 2)
 RETURNS TABLE(track_id uuid, title text, artist_name text, image_url text, plays bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with car_plays as (
    select pe.track_id
    from public.play_events pe
    join public.car_sessions cs on cs.user_id = p_user_id
    where pe.user_id = p_user_id
      and pe.played_at >= cs.connected_at
      and pe.played_at <= coalesce(cs.disconnected_at, cs.connected_at + (coalesce(cs.duration_seconds, 3600) || ' seconds')::interval)
      and pe.track_id not in (select tracks.id from public.tracks where tracks.spotify_id is null and tracks.title = 'Unknown Track')
  ),
  counted as (
    select cp.track_id, count(*) as n
    from car_plays cp
    group by cp.track_id
  )
  select c.track_id, t.title, coalesce(t.artists[1], '') as artist_name, t.image_url, c.n
  from counted c
  join public.tracks t on t.id = c.track_id
  order by c.n desc
  limit p_limit;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.journey_year_facts(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH pe AS (
    SELECT e.track_id,
           e.played_at,
           extract(year  FROM e.played_at AT TIME ZONE 'Europe/Istanbul')::int AS yr,
           extract(hour  FROM e.played_at AT TIME ZONE 'Europe/Istanbul')::int AS hr,
           date_trunc('month', e.played_at AT TIME ZONE 'Europe/Istanbul')     AS mon
    FROM public.play_events e
    WHERE e.user_id = p_user_id
      AND e.incognito_mode = false
      AND e.track_id IS NOT NULL
      AND e.track_id NOT IN (SELECT id FROM public.tracks WHERE spotify_id IS NULL AND title = 'Unknown Track')
  ),
  yil AS (
    SELECT yr,
           count(*)::int AS plays,
           count(*) FILTER (WHERE hr >= 23 OR hr < 5)::int AS night_plays
    FROM pe GROUP BY yr HAVING count(*) >= 200
  ),
  tepe AS (
    SELECT DISTINCT ON (yr) yr, hr AS peak_hour
    FROM (SELECT yr, hr, count(*) AS n FROM pe GROUP BY yr, hr) s
    ORDER BY yr, n DESC, hr
  ),
  izler AS (
    SELECT yr, track_id,
           count(*)::int AS plays,
           count(DISTINCT mon)::int AS months,
           (max(played_at)::date - min(played_at)::date)::int AS span_days
    FROM pe GROUP BY yr, track_id
  ),
  sutun AS (
    SELECT DISTINCT ON (yr) yr, track_id, plays, months
    FROM izler
    WHERE plays >= 8 AND months >= 5
    ORDER BY yr, months DESC, plays DESC
  ),
  kuyruklu AS (
    SELECT DISTINCT ON (yr) yr, track_id, plays, span_days
    FROM izler
    WHERE plays >= 15 AND span_days <= 30
    ORDER BY yr, plays DESC
  )
  SELECT coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'year', y.yr,
      'plays', y.plays,
      'night_pct', round(100.0 * y.night_plays / y.plays)::int,
      'peak_hour', t.peak_hour,
      'pillar', CASE WHEN s.track_id IS NULL THEN NULL ELSE jsonb_build_object(
          'title', ts.title, 'artist', ts.artists[1], 'plays', s.plays, 'active_months', s.months) END,
      'comet', CASE WHEN k.track_id IS NULL THEN NULL ELSE jsonb_build_object(
          'title', tk.title, 'artist', tk.artists[1], 'plays', k.plays, 'span_days', k.span_days) END
    )) ORDER BY y.yr), '[]'::jsonb)
  FROM yil y
  LEFT JOIN tepe t ON t.yr = y.yr
  LEFT JOIN sutun s ON s.yr = y.yr
  LEFT JOIN public.tracks ts ON ts.id = s.track_id
  LEFT JOIN kuyruklu k ON k.yr = y.yr
  LEFT JOIN public.tracks tk ON tk.id = k.track_id;
$function$
;

CREATE OR REPLACE FUNCTION public.kapak_kaynagi_kurali()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.image_kaynagi = 'deezer'
     AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url
     AND NEW.deezer_image_url IS DISTINCT FROM OLD.deezer_image_url THEN
    NEW.image_url := NEW.deezer_image_url;
    NEW.image_kaynagi := CASE WHEN NEW.image_url IS NULL THEN NULL ELSE 'deezer' END;
    RETURN NEW;
  END IF;

  IF NEW.image_url IS NULL THEN
    IF NEW.deezer_image_url IS NOT NULL THEN
      NEW.image_url := NEW.deezer_image_url;
      NEW.image_kaynagi := 'deezer';
    ELSE
      NEW.image_kaynagi := NULL;
    END IF;
  ELSIF NEW.image_url IS NOT DISTINCT FROM NEW.deezer_image_url THEN
    NEW.image_kaynagi := 'deezer';
  ELSE
    NEW.image_kaynagi := 'spotify';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.katalog_dolgu_adaylari_kullanicilar(p_user_ids uuid[], p_limit integer DEFAULT 50)
 RETURNS TABLE(spotify_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.spotify_id
  FROM public.tracks t
  WHERE t.catalog_backfill_at IS NULL
    AND t.spotify_id IS NOT NULL
    AND (t.isrc IS NULL OR t.duration_ms IS NULL)
    AND EXISTS (
      SELECT 1 FROM public.play_events pe
      WHERE pe.track_id = t.id AND pe.user_id = ANY (p_user_ids)
    )
  ORDER BY t.created_at
  LIMIT GREATEST(1, LEAST(500, p_limit));
$function$
;

CREATE OR REPLACE FUNCTION public.kullanici_sanatcilari(p_user_id uuid)
 RETURNS TABLE(artist text, play_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tr.artists[1] as artist, count(*)::bigint as play_count
  from public.play_events pe
  join public.tracks tr on tr.id = pe.track_id
  where pe.user_id = p_user_id
    and (p_user_id = auth.uid() or auth.role() = 'service_role')
    and pe.incognito_mode = false
    and array_length(tr.artists, 1) > 0
    and tr.artists[1] is not null and tr.artists[1] <> ''
  group by tr.artists[1]
  order by count(*) desc
  limit 300;
$function$
;

CREATE OR REPLACE FUNCTION public.kullanici_turleri(p_user_id uuid)
 RETURNS TABLE(genre text, play_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select g.genre, count(*)::bigint as play_count
  from public.play_events pe
  join public.tracks tr on tr.id = pe.track_id
  cross join lateral unnest(coalesce(tr.genres, array[]::text[])) as g(genre)
  where pe.user_id = p_user_id
    and (p_user_id = auth.uid() or auth.role() = 'service_role')
    and pe.incognito_mode = false
    and g.genre is not null and g.genre <> ''
  group by g.genre
  order by count(*) desc
  limit 100;
$function$
;

CREATE OR REPLACE FUNCTION public.liked_songs_page(p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_sort text DEFAULT 'liked_desc'::text)
 RETURNS TABLE(track_id uuid, spotify_id text, title text, artist_name text, image_url text, liked_at timestamp with time zone, play_count bigint, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with liked as (
    select * from public.user_liked_track_ids(p_user_id)
  ),
  joined as (
    select
      t.id                as track_id,
      l.spotify_id,
      t.title,
      coalesce(t.artists[1], '') as artist_name,
      t.image_url,
      l.liked_at,
      coalesce(pc.n, 0)   as play_count
    from liked l
    join public.tracks t on t.spotify_id = l.spotify_id
    left join (
      select t2.spotify_id as sid, count(*) as n
      from public.play_events pe
      join public.tracks t2 on t2.id = pe.track_id
      where pe.user_id = p_user_id and t2.spotify_id is not null
      group by t2.spotify_id
    ) pc on pc.sid = l.spotify_id
  ),
  counted as (select count(*) as total from joined)
  select j.track_id, j.spotify_id, j.title, j.artist_name, j.image_url,
         j.liked_at, j.play_count, c.total
  from joined j cross join counted c
  order by
    case when p_sort = 'liked_desc' then j.liked_at end desc nulls last,
    case when p_sort = 'liked_asc'  then j.liked_at end asc  nulls last,
    case when p_sort = 'plays_desc' then j.play_count end desc nulls last,
    case when p_sort = 'title_asc'  then j.title end asc nulls last,
    j.liked_at desc nulls last
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.liked_sync_diff(p_user_id uuid, p_spotify_ids text[])
 RETURNS TABLE(to_add text[], to_remove text[], catalog_missing text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  with bizim as (
    select l.spotify_id from public.user_liked_track_ids(p_user_id) l
  ),
  spotifyde as (
    select distinct unnest(p_spotify_ids) as spotify_id
  ),
  eklenecek as (
    select s.spotify_id
    from spotifyde s
    where not exists (select 1 from bizim b where b.spotify_id = s.spotify_id)
  ),
  cikarilacak as (
    select b.spotify_id
    from bizim b
    where not exists (select 1 from spotifyde s where s.spotify_id = b.spotify_id)
  ),
  katalogsuz as (
    select s.spotify_id
    from spotifyde s
    where not exists (select 1 from public.tracks t where t.spotify_id = s.spotify_id)
  )
  select
    coalesce((select array_agg(spotify_id) from eklenecek), '{}')::text[],
    coalesce((select array_agg(spotify_id) from cikarilacak), '{}')::text[],
    coalesce((select array_agg(spotify_id) from katalogsuz), '{}')::text[];
END;
$function$
;

CREATE OR REPLACE FUNCTION public.list_recaps(p_user_id uuid, p_period_type text)
 RETURNS TABLE(id uuid, period_type text, period_label text, period_start date, period_end date, generated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  select r.id, r.period_type, r.period_label,
         r.period_start, r.period_end, r.generated_at
  from public.recaps r
  where r.user_id = p_user_id
    and r.period_type = p_period_type
  order by r.period_start desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_mood_exported(p_mood_key text, p_playlist_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  insert into public.mood_workspace
    (user_id, mood_key, exported_at, exported_playlist_id, updated_at)
  values
    ((select auth.uid()), p_mood_key, now(), p_playlist_id, now())
  on conflict (user_id, mood_key) do update
    set exported_at = now(),
        exported_playlist_id = coalesce(excluded.exported_playlist_id,
                                        mood_workspace.exported_playlist_id),
        updated_at = now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_phase_announcement(p_phase smallint, p_action text, p_version smallint DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_action NOT IN ('seen', 'snooze', 'dismiss') THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  INSERT INTO public.user_phase_announcements (user_id, phase, content_version, seen_at, snoozed_until, dismissed_at)
  VALUES (
    v_me,
    p_phase,
    p_version,
    CASE WHEN p_action IN ('seen', 'dismiss') THEN now() END,
    CASE WHEN p_action = 'snooze' THEN now() + interval '24 hours' END,
    CASE WHEN p_action = 'dismiss' THEN now() END
  )
  ON CONFLICT (user_id, phase) DO UPDATE SET
    content_version = EXCLUDED.content_version,
    seen_at       = COALESCE(user_phase_announcements.seen_at, EXCLUDED.seen_at),
    snoozed_until = EXCLUDED.snoozed_until,
    dismissed_at  = COALESCE(user_phase_announcements.dismissed_at, EXCLUDED.dismissed_at);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.materialize_user_top_strips(p_user_id uuid, p_limit integer DEFAULT 20)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hidden text[];
  v_recent_count integer := 0;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- hidden_set'i koru (yeniden hesaptan önce sakla)
  SELECT array_agg(merge_key) INTO v_hidden
  FROM user_top_strips WHERE user_id = p_user_id AND is_hidden = true;

  DELETE FROM user_top_strips WHERE user_id = p_user_id;

  -- ── 1. ŞU AN ŞERİDİ (Son 60 günde en çok dinlenenler / on repeat) ──────────
  -- Kullanıcının son 60 gündeki (son 2 ay) play_events kayıtlarından hesaplanır.
  WITH pe_60d AS (
    SELECT
      p.track_id,
      p.played_at,
      lower(regexp_replace(coalesce(t.title,''), '\s+', ' ', 'g'))
        || '|' || lower(coalesce(t.artists[1],'')) AS merge_key,
      t.title,
      t.artists[1] AS artist,
      t.id AS rep_track_id,
      CASE
        WHEN p.reason_end = 'trackdone' THEN 1.0
        WHEN p.ms_played >= 30000 THEN LEAST(1.0, 0.5 + (p.ms_played - 30000) / 240000.0)
        WHEN p.ms_played >= 5000  THEN 0.5 * p.ms_played / 30000.0
        ELSE 0.0
      END AS comp_score
    FROM play_events p
    JOIN tracks t ON t.id = p.track_id
    WHERE p.user_id = p_user_id
      AND p.incognito_mode = false
      AND p.played_at >= (now() - interval '60 days')
  ),
  aggregated_60d AS (
    SELECT
      merge_key,
      (array_agg(rep_track_id ORDER BY played_at DESC))[1] AS rep_track_id,
      (array_agg(title ORDER BY played_at DESC))[1] AS title,
      (array_agg(artist ORDER BY played_at DESC))[1] AS artist,
      count(*) AS play_count,
      round(sum(comp_score)::numeric, 4) AS total_score
    FROM pe_60d
    GROUP BY merge_key
    HAVING count(*) >= 2
  )
  INSERT INTO user_top_strips (user_id, strip, rank, merge_key, track_id, title, artist, weight, is_hidden, computed_at)
  SELECT p_user_id, 'now',
         row_number() OVER (ORDER BY a.play_count DESC, a.total_score DESC),
         a.merge_key, a.rep_track_id, a.title, a.artist, a.play_count,
         (a.merge_key = ANY(COALESCE(v_hidden,'{}'))),
         now()
  FROM aggregated_60d a
  ORDER BY a.play_count DESC, a.total_score DESC
  LIMIT p_limit;

  GET DIAGNOSTICS v_recent_count = ROW_COUNT;

  -- Son 60 günde yeterli dinleme yoksa user_track_weights fallback'i devreye girer
  IF v_recent_count < 5 THEN
    INSERT INTO user_top_strips (user_id, strip, rank, merge_key, track_id, title, artist, weight, is_hidden, computed_at)
    SELECT p_user_id, 'now',
           v_recent_count + row_number() OVER (ORDER BY w.decayed_weight DESC),
           w.merge_key, w.representative_track_id, w.title, w.artist, w.decayed_weight,
           (w.merge_key = ANY(COALESCE(v_hidden,'{}'))),
           now()
    FROM user_track_weights w
    WHERE w.user_id = p_user_id
      AND NOT w.is_evergreen
      AND NOT EXISTS (
        SELECT 1 FROM user_top_strips s
        WHERE s.user_id = p_user_id AND s.strip = 'now' AND s.merge_key = w.merge_key
      )
    ORDER BY w.decayed_weight DESC
    LIMIT (p_limit - v_recent_count);
  END IF;

  -- ── 2. DEĞİŞMEYENLER ŞERİDİ (evergreen, final_weight) ───────────────────────
  INSERT INTO user_top_strips (user_id, strip, rank, merge_key, track_id, title, artist, weight, is_hidden, computed_at)
  SELECT p_user_id, 'evergreen',
         row_number() OVER (ORDER BY w.final_weight DESC),
         w.merge_key, w.representative_track_id, w.title, w.artist, w.final_weight,
         (w.merge_key = ANY(COALESCE(v_hidden,'{}'))),
         now()
  FROM user_track_weights w
  WHERE w.user_id = p_user_id AND w.is_evergreen
  ORDER BY w.final_weight DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mood_approved_tracks(p_user_id uuid, p_mood_key text)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    (SELECT w.approved_track_ids FROM public.mood_workspace w
     WHERE w.user_id = p_user_id AND w.mood_key = p_mood_key), '{}'::uuid[]);
$function$
;

CREATE OR REPLACE FUNCTION public.mood_artist_penalty_carpan(p_cikarma_sayisi integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_cikarma_sayisi IS NULL OR p_cikarma_sayisi <= 0 THEN 1.0
    WHEN p_cikarma_sayisi = 1 THEN 0.85
    WHEN p_cikarma_sayisi = 2 THEN 0.60
    ELSE 0.35
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.mood_definition_for_key(p_mood_key text)
 RETURNS TABLE(mood_key text, kimlik text, olmali text, olmamali text, energy_allow text[], energy_ideal text[], pozitif_tags text[], negatif_tags text[], enstrumantal text, pozitif_genres text[], negatif_genres text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.mood_key, d.kimlik, d.olmali, d.olmamali,
         d.energy_allow, d.energy_ideal, d.pozitif_tags, d.negatif_tags,
         d.enstrumantal, d.pozitif_genres, d.negatif_genres
  FROM public.mood_definitions d
  WHERE d.mood_key = p_mood_key;
$function$
;

CREATE OR REPLACE FUNCTION public.mood_geri_bildirim_yansit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Eski durumun kişisel etkisini geri al (silme ya da etiket/parça değişimi).
  -- Yalnız OLUMSUZ etiketin gizlemesi geri alınır. Olumlu etiketin onayı
  -- KORUNUR: ölçüldü (0338 testi) — onayı geri almak, etiketten ÖNCE zaten
  -- onaylı olan parçayı (set_mood_hidden_tracks'in örtük onayı) etiketten
  -- öncesinden daha korumasız bırakıyordu. Olumsuz etikete geçişte onay
  -- aşağıdaki NEW dalında zaten düşürülür.
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.etiket IN ('alakasiz', 'alakali_sevmedim') THEN
    UPDATE public.mood_workspace
       SET hidden_track_ids = array_remove(hidden_track_ids, OLD.track_id),
           updated_at = now()
     WHERE user_id = OLD.user_id AND mood_key = OLD.mood_key;
  END IF;

  -- Yeni durumun kişisel etkisini uygula.
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.mood_workspace (user_id, mood_key, hidden_track_ids, approved_track_ids, updated_at)
    VALUES (NEW.user_id, NEW.mood_key, '{}', '{}', now())
    ON CONFLICT (user_id, mood_key) DO NOTHING;

    IF NEW.etiket IN ('alakasiz', 'alakali_sevmedim') THEN
      UPDATE public.mood_workspace
         SET hidden_track_ids = CASE WHEN NEW.track_id = ANY(hidden_track_ids) THEN hidden_track_ids
                                     ELSE array_append(hidden_track_ids, NEW.track_id) END,
             approved_track_ids = array_remove(approved_track_ids, NEW.track_id),
             updated_at = now()
       WHERE user_id = NEW.user_id AND mood_key = NEW.mood_key;
    ELSE
      UPDATE public.mood_workspace
         SET approved_track_ids = CASE WHEN NEW.track_id = ANY(approved_track_ids) THEN approved_track_ids
                                       ELSE array_append(approved_track_ids, NEW.track_id) END,
             hidden_track_ids = array_remove(hidden_track_ids, NEW.track_id),
             updated_at = now()
       WHERE user_id = NEW.user_id AND mood_key = NEW.mood_key;
    END IF;
  END IF;

  -- Katalog kuralı: etkilenen her (mood, parça) için yeniden hesap.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.mood_katalog_uygunluk_hesapla(OLD.mood_key, OLD.track_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.mood_katalog_uygunluk_hesapla(NEW.mood_key, NEW.track_id);
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mood_kanonik_etiketler(p_etiketler text[])
 RETURNS text[]
 LANGUAGE sql
 STABLE
AS $function$
  SELECT coalesce(array_agg(DISTINCT s.kanonik), '{}'::text[])
  FROM unnest(coalesce(p_etiketler, '{}'::text[])) AS e(ham)
  JOIN public.mood_tag_sozlugu s ON s.ham = lower(btrim(e.ham));
$function$
;

CREATE OR REPLACE FUNCTION public.mood_katalog_uygunluk_hesapla(p_mood_key text, p_track_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pozitif int;
  v_negatif int;
  v_karar   int;
BEGIN
  SELECT count(*) FILTER (WHERE etiket IN ('alakali_sevmedim', 'uygun', 'cok_sevdim')),
         count(*) FILTER (WHERE etiket = 'alakasiz')
    INTO v_pozitif, v_negatif
  FROM public.mood_track_feedback
  WHERE mood_key = p_mood_key AND track_id = p_track_id;

  v_karar := CASE
    WHEN v_negatif > v_pozitif THEN -1
    WHEN v_pozitif > v_negatif THEN 1
    ELSE NULL
  END;

  IF v_karar IS NULL THEN
    DELETE FROM public.mood_kural
    WHERE mood_key = p_mood_key AND hedef_tur = 'track'
      AND hedef = p_track_id::text AND kaynak = 'geri_bildirim';
    RETURN;
  END IF;

  INSERT INTO public.mood_kural (mood_key, hedef_tur, hedef, karar, aciklama, kaynak)
  VALUES (p_mood_key, 'track', p_track_id::text, v_karar,
          format('Uygunluk geri bildirimi: %s uygun / %s alakasız', v_pozitif, v_negatif),
          'geri_bildirim')
  ON CONFLICT (mood_key, hedef_tur, hedef) DO UPDATE
    SET karar = excluded.karar, aciklama = excluded.aciklama
    -- Elle yazılmış kural EZİLMEZ.
    WHERE public.mood_kural.kaynak = 'geri_bildirim';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mood_needs_ai_recuration(p_user_id uuid, p_mood_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH son AS (
    SELECT generated_at
    FROM public.mood_pkg
    WHERE user_id = p_user_id AND mood_key = p_mood_key
  )
  SELECT
    NOT EXISTS (SELECT 1 FROM son)
    OR EXISTS (
      SELECT 1 FROM public.mood_workspace w
      WHERE w.user_id = p_user_id AND w.mood_key = p_mood_key
        AND w.updated_at > (SELECT generated_at FROM son)
    )
    OR EXISTS (
      SELECT 1 FROM public.play_events pe
      WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
        AND pe.played_at > (SELECT generated_at FROM son)
    )
    OR (SELECT generated_at FROM son) < now() - interval '7 days';
$function$
;

CREATE OR REPLACE FUNCTION public.mood_playlist(p_user_id uuid, p_mood_key text, p_limit integer DEFAULT 30)
 RETURNS TABLE(track_id uuid, title text, artist_name text, album text, image_url text, play_count bigint, score numeric, spotify_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_saat_min int; v_saat_max int; v_wrap boolean := false;
  v_min_sure int := 0;
  v_sad boolean := false; v_love boolean := false; v_no_limit boolean := false;
  v_your_day boolean := false;
  v_gizli uuid[];
  v_onay uuid[];
  v_tanim public.mood_definitions%ROWTYPE;
  v_enerji_kisit boolean;
  v_sepet text[];
  v_sepet_var boolean;
  v_negatif text[];
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_tanim FROM public.mood_definitions WHERE mood_key = p_mood_key;
  v_enerji_kisit := v_tanim.mood_key IS NOT NULL AND array_length(v_tanim.energy_allow, 1) > 0;
  v_sepet   := coalesce(v_tanim.pozitif_genres, '{}');
  v_negatif := coalesce(v_tanim.negatif_genres, '{}');
  v_sepet_var := coalesce(array_length(v_sepet, 1), 0) > 0;

  SELECT coalesce(hidden_track_ids, '{}'::uuid[]), coalesce(approved_track_ids, '{}'::uuid[])
    INTO v_gizli, v_onay
  FROM public.mood_workspace WHERE user_id = p_user_id AND mood_key = p_mood_key;
  v_gizli := coalesce(v_gizli, '{}'::uuid[]);
  v_onay  := coalesce(v_onay, '{}'::uuid[]);

  -- 🔴 0332: tür dizileri buradan KALKTI, mood_definitions.pozitif_genres'te.
  -- Burada yalnız saat penceresi ve mood'a özgü davranış bayrakları kaldı.
  IF p_mood_key = 'quiet_side' THEN
    v_saat_min := 0; v_saat_max := 23; v_sad := true;
  ELSIF p_mood_key = 'full_throttle' THEN
    v_saat_min := 0; v_saat_max := 23;
  ELSIF p_mood_key = 'locked_in' THEN
    v_saat_min := 0; v_saat_max := 23;
  ELSIF p_mood_key = 'no_limit' THEN
    v_saat_min := 0; v_saat_max := 23;
    v_no_limit := true;
  ELSIF p_mood_key = 'closer' THEN
    v_saat_min := 0; v_saat_max := 23; v_love := true;
  ELSIF p_mood_key = 'miles_away' THEN
    v_saat_min := 0; v_saat_max := 23;
    v_min_sure := 240000;
  ELSIF p_mood_key = 'gece_217' THEN
    v_saat_min := 1; v_saat_max := 4;
    v_min_sure := 240000;
  ELSIF p_mood_key = 'first_light' THEN
    v_saat_min := 5; v_saat_max := 11;
  ELSIF p_mood_key = 'daylight' THEN
    v_saat_min := 11; v_saat_max := 17;
  ELSIF p_mood_key = 'dusk' THEN
    v_saat_min := 17; v_saat_max := 21;
  ELSIF p_mood_key = 'nocturne' THEN
    v_saat_min := 21; v_saat_max := 5; v_wrap := true;
  ELSIF p_mood_key = 'your_day' THEN
    v_your_day := true;
  ELSE
    RETURN;
  END IF;

  IF v_your_day THEN
    -- your_day'de tür sepeti yok (liste kullanıcının kendi ağırlık
    -- merkezidir), bu yüzden mood_kural da uygulanmaz.
    RETURN QUERY
    WITH v_ads AS (
      SELECT t.artists[1] AS sanatci, count(*)::int AS cikarma_sayisi
      FROM public.mood_workspace w
      JOIN public.tracks t ON t.id = ANY(w.hidden_track_ids)
      WHERE w.user_id = p_user_id AND w.mood_key = p_mood_key
        AND array_length(t.artists, 1) > 0
      GROUP BY t.artists[1]
    ),
    recent_30gun AS (
      SELECT pe.track_id, count(*)::bigint AS calma
      FROM play_events pe
      WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
        AND pe.skipped IS DISTINCT FROM true AND pe.ms_played >= 30000
        AND pe.played_at >= now() - interval '30 days'
      GROUP BY pe.track_id
    ),
    core_taste AS (
      SELECT pe.track_id, count(*)::bigint AS calma
      FROM play_events pe
      WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
        AND pe.skipped IS DISTINCT FROM true AND pe.ms_played >= 30000
      GROUP BY pe.track_id HAVING count(*) >= 8
    ),
    eskiden_sevilen AS (
      SELECT pe.track_id, count(*)::bigint AS calma
      FROM play_events pe
      WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
        AND pe.skipped IS DISTINCT FROM true AND pe.ms_played >= 30000
      GROUP BY pe.track_id
      HAVING count(*) >= 5 AND max(pe.played_at) < now() - interval '90 days'
    ),
    kontrollu_kesif AS (
      SELECT t.artists[1] AS sanatci
      FROM play_events pe JOIN tracks t ON t.id = pe.track_id
      WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
        AND pe.skipped IS DISTINCT FROM true AND pe.ms_played >= 30000
        AND array_length(t.artists, 1) > 0
      GROUP BY t.artists[1]
      HAVING min(pe.played_at) >= now() - interval '60 days'
    ),
    havuz AS (
      SELECT r.track_id, 3.0 AS agirlik, r.calma FROM recent_30gun r
      UNION ALL SELECT c.track_id, 2.0, c.calma FROM core_taste c
      UNION ALL SELECT e.track_id, 1.2, e.calma FROM eskiden_sevilen e
      UNION ALL
      SELECT pe.track_id, 0.8, count(*)::bigint
      FROM play_events pe JOIN tracks t ON t.id = pe.track_id
      JOIN kontrollu_kesif kk ON kk.sanatci = t.artists[1]
      WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
        AND pe.skipped IS DISTINCT FROM true AND pe.ms_played >= 30000
      GROUP BY pe.track_id
    ),
    birlesik AS (
      SELECT h.track_id, sum(h.agirlik * ln(1 + h.calma)) AS toplam_skor
      FROM havuz h GROUP BY h.track_id
    ),
    puanli AS (
      SELECT t.id, t.title, t.artists[1] AS sanatci, t.album, t.image_url, t.spotify_id,
        b.toplam_skor
          * public.mood_artist_penalty_carpan(v_ads.cikarma_sayisi)
          * (CASE WHEN t.id = ANY(v_onay) THEN 1.45 ELSE 1.0 END) AS toplam_skor,
        (t.id = ANY(v_onay)) AS onayli,
        row_number() OVER (PARTITION BY t.artists[1]
          ORDER BY (CASE WHEN t.id = ANY(v_onay) THEN 1 ELSE 0 END) DESC, b.toplam_skor DESC, t.id) AS artist_rn
      FROM birlesik b
      JOIN tracks t ON t.id = b.track_id
      LEFT JOIN v_ads ON v_ads.sanatci = t.artists[1]
      WHERE NOT (t.id = ANY(v_gizli))
    )
    , siralanmis AS (
      SELECT p.*,
        CASE WHEN p.onayli
             THEN row_number() OVER (PARTITION BY p.onayli ORDER BY p.toplam_skor DESC)
             END AS onay_rn
      FROM puanli p
      WHERE p.artist_rn <= 3 OR p.onayli
    )
    SELECT s.id, s.title, s.sanatci, s.album, s.image_url, 0::bigint,
           round(s.toplam_skor::numeric, 2), s.spotify_id
    FROM siralanmis s
    ORDER BY
      (CASE WHEN s.onay_rn IS NOT NULL
              AND s.onay_rn <= ceil(GREATEST(p_limit, 1) * 0.7) THEN 0 ELSE 1 END),
      s.toplam_skor DESC, s.id
    LIMIT GREATEST(p_limit, 1);
    RETURN;
  END IF;

  RETURN QUERY
  WITH kural AS (
    SELECT k.hedef_tur, k.hedef, k.karar
    FROM public.mood_kural k WHERE k.mood_key = p_mood_key
  ),
  v_ads AS (
    SELECT t.artists[1] AS sanatci, count(*)::int AS cikarma_sayisi
    FROM public.mood_workspace w
    JOIN public.tracks t ON t.id = ANY(w.hidden_track_ids)
    WHERE w.user_id = p_user_id AND w.mood_key = p_mood_key
      AND array_length(t.artists, 1) > 0
    GROUP BY t.artists[1]
  ),
  mood_plays AS (
    SELECT pe.track_id,
      COUNT(*) FILTER (WHERE
        CASE WHEN v_wrap
          THEN extract(hour from pe.played_at at time zone 'Europe/Istanbul') >= v_saat_min
            OR extract(hour from pe.played_at at time zone 'Europe/Istanbul') <= v_saat_max
          ELSE extract(hour from pe.played_at at time zone 'Europe/Istanbul') BETWEEN v_saat_min AND v_saat_max
        END
      )::bigint AS mood_calma,
      count(*)::bigint AS toplam_calma,
      avg(CASE WHEN pe.ms_played > 0 THEN least(pe.ms_played::numeric/nullif(t.duration_ms,0),1.0) ELSE 0.7 END) AS tamamlanma
    FROM play_events pe JOIN tracks t ON t.id = pe.track_id
    WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true AND pe.ms_played >= 30000
    GROUP BY pe.track_id
  ),
  zengin AS (
    SELECT mp.track_id,
      coalesce(pe.energy_character, ae.energy_character) AS enerji,
      public.mood_kanonik_etiketler(
        coalesce(pe.moods, ae.moods, '{}') || coalesce(pe.vibe, ae.vibe, '{}')) AS kanonik,
      coalesce(pe.language, ae.language) AS dil,
      coalesce(pe.confidence_score, ae.confidence_score) AS guven,
      (pe.item_id IS NOT NULL OR ae.item_id IS NOT NULL) AS var
    FROM mood_plays mp
    JOIN tracks t ON t.id = mp.track_id
    LEFT JOIN public.catalog_ai_enrichment pe
      ON pe.item_type = 'track' AND pe.item_id = public.catalog_item_id('track', t.spotify_id)
    LEFT JOIN public.catalog_ai_enrichment ae
      ON ae.item_type = 'artist' AND array_length(t.artists, 1) > 0
     AND ae.item_id = public.catalog_item_id('artist', t.artists[1])
  ),
  puanli AS (
    SELECT t.id, t.title, t.artists[1] AS sanatci, t.album, t.image_url, t.spotify_id, mp.mood_calma,
      round((
        ln(1 + mp.mood_calma)
        * (0.45 + 0.55 * (mp.mood_calma::numeric / greatest(mp.toplam_calma, 1)))
        -- 🔴 0332: sepet DOLUYSA veriden gelen tür sepeti, BOŞSA eski
        -- genre_mood_weight yolu. quiet_side/closer bugün boş yolda.
        * (CASE
             WHEN v_sepet_var THEN (CASE WHEN t.genres && v_sepet THEN 2.0 ELSE 0.8 END)
             WHEN v_sad THEN 0.4 + 1.6 * coalesce(
               (SELECT max(public.genre_mood_weight(g, 'sad')) FROM unnest(t.genres) AS g), 0)
             WHEN v_love THEN 0.4 + 1.6 * coalesce(
               (SELECT max(public.genre_mood_weight(g, 'love')) FROM unnest(t.genres) AS g), 0)
             ELSE 0.8
           END)
        * (CASE WHEN v_min_sure > 0 AND t.duration_ms >= v_min_sure THEN 1.4 ELSE 1.0 END)
        * (CASE WHEN v_no_limit THEN 1.0 + least(mp.mood_calma::numeric / 10.0, 1.0) ELSE 1.0 END)
        * coalesce(mp.tamamlanma, 0.7)
        * public.mood_artist_penalty_carpan(v_ads.cikarma_sayisi)
        * (CASE
             WHEN z.enerji IS NULL THEN 1.0
             WHEN z.enerji = ANY(v_tanim.energy_ideal) THEN 1.35
             ELSE 1.0
           END)
        * (1.0 + 0.18 * least(coalesce(
            array_length(ARRAY(SELECT unnest(z.kanonik) INTERSECT SELECT unnest(v_tanim.pozitif_tags)), 1), 0), 3))
        * greatest(0.25, 1.0 - 0.28 * least(coalesce(
            array_length(ARRAY(SELECT unnest(z.kanonik) INTERSECT SELECT unnest(v_tanim.negatif_tags)), 1), 0), 3))
        * (CASE WHEN coalesce(z.var, false) THEN 1.0 ELSE 0.6 END)
        * (CASE WHEN z.guven IS NOT NULL AND z.guven < 0.5 THEN 0.85 ELSE 1.0 END)
        * (CASE
             WHEN v_tanim.enstrumantal = 'none' THEN 1.0
             WHEN z.dil IS NULL THEN 1.0
             WHEN lower(z.dil) LIKE 'instrumental%' THEN 1.5
             ELSE 0.55
           END)
        -- 🔴 0326: kullanıcının ONAYLADIĞI parça. Pin DEĞİL — çarpan.
        * (CASE WHEN t.id = ANY(v_onay) THEN 1.45 ELSE 1.0 END)
        -- 🔴 0332: Sahibin yazılı kuralı. Birden çok kural uyarsa
        -- EN GÜÇLÜSÜ (|karar| en büyük) uygulanır; çarpanlar çarpılmaz ki
        -- bir parçanın neden yükseldiği tek cümleyle açıklanabilsin.
        * (CASE (
             SELECT k.karar FROM kural k
             WHERE k.karar <> -2
               AND ((k.hedef_tur = 'artist' AND array_length(t.artists,1) > 0
                     AND lower(t.artists[1]) = k.hedef)
                 OR (k.hedef_tur = 'genre'  AND t.genres && array[k.hedef])
                 OR (k.hedef_tur = 'track'  AND k.hedef = t.id::text))
             ORDER BY abs(k.karar) DESC, k.karar ASC LIMIT 1)
           WHEN -1 THEN 0.45 WHEN 1 THEN 1.30 WHEN 2 THEN 1.70 ELSE 1.0 END)
      )::numeric, 2) AS score,
      (t.id = ANY(v_onay)) AS onayli,
      row_number() OVER (PARTITION BY t.artists[1]
        -- 🔴 0332: `t.id` SON ANAHTAR — ölçülmüş bir hatayı kapatıyor.
        -- Sanatçı tavanı (`artist_rn <= 3`) bugüne kadar YALNIZ mood_calma'ya
        -- göre sıralıyordu. Bir sanatçının 4+ parçası aynı mood_calma'ya
        -- sahipse hangi 3'ünün kalacağı PLAN BAĞIMLIYDI: gece_217'de aynı
        -- fonksiyon, aynı veri, aynı an — iki çağrı arasında 25 parça
        -- takas oluyordu (6LACK↔6LACK, Jacob Lee×2, Sleep Fruits×3...).
        -- Kullanıcı açısından liste "kendi kendine değişiyordu"; bizim
        -- açımızdan hiçbir ölçüm güvenilir değildi, çünkü her karşılaştırma
        -- bu gürültüyü de içeriyordu.
        ORDER BY (CASE WHEN t.id = ANY(v_onay) THEN 1 ELSE 0 END) DESC, mp.mood_calma DESC, t.id) AS artist_rn
    FROM mood_plays mp
    JOIN tracks t ON t.id = mp.track_id
    LEFT JOIN zengin z ON z.track_id = mp.track_id
    LEFT JOIN v_ads ON v_ads.sanatci = t.artists[1]
    WHERE mp.mood_calma > 0
      AND NOT (t.id = ANY(v_gizli))
      -- Onaylanmış parça enerji filtresinden MUAF: kullanıcının açık kararı
      -- bizim etiketimizden üstündür (etiket yanlış olabilir, onay olamaz).
      AND (NOT v_enerji_kisit OR z.enerji IS NULL OR z.enerji = ANY(v_tanim.energy_allow)
           OR t.id = ANY(v_onay))
      -- 🔴 0332: yasak tür. Onay bunu ezer (onay parça bazlı, tür geneldir).
      AND (coalesce(array_length(v_negatif,1),0) = 0
           OR t.genres IS NULL
           OR NOT (t.genres && v_negatif)
           OR t.id = ANY(v_onay))
      -- 🔴 0332: mood_kural vetosu (-2). Onayı DA ezer — veto Sahibin
      -- taze ve açık beyanı, onay ise eski paketten geriye dönük türetildi.
      AND NOT EXISTS (
        SELECT 1 FROM kural k
        WHERE k.karar = -2
          AND ((k.hedef_tur = 'artist' AND array_length(t.artists,1) > 0
                AND lower(t.artists[1]) = k.hedef)
            OR (k.hedef_tur = 'genre'  AND t.genres && array[k.hedef])
            OR (k.hedef_tur = 'track'  AND k.hedef = t.id::text)))
      AND (
        (v_sepet_var AND t.genres && v_sepet)
        OR (NOT v_sepet_var AND v_sad
            AND EXISTS (SELECT 1 FROM unnest(t.genres) AS g WHERE public.genre_mood_weight(g, 'sad') > 0))
        OR (NOT v_sepet_var AND v_love
            AND EXISTS (SELECT 1 FROM unnest(t.genres) AS g WHERE public.genre_mood_weight(g, 'love') > 0))
        OR (z.kanonik && v_tanim.pozitif_tags)
        OR t.id = ANY(v_onay)
      )
  )
  , siralanmis AS (
    SELECT p.*,
      CASE WHEN p.onayli
           THEN row_number() OVER (PARTITION BY p.onayli ORDER BY p.score DESC)
           END AS onay_rn
    FROM puanli p
    -- Sanatçı başına tavan onaylanan parçaya İŞLEMEZ.
    WHERE p.artist_rn <= 3 OR p.onayli
  )
  SELECT s.id, s.title, s.sanatci, s.album, s.image_url, s.mood_calma, s.score, s.spotify_id
  FROM siralanmis s
  ORDER BY
    (CASE WHEN s.onay_rn IS NOT NULL
            AND s.onay_rn <= ceil(GREATEST(p_limit, 1) * 0.7) THEN 0 ELSE 1 END),
    -- `s.id` son anahtar: berabere puanlarda kesim çizgisi artık kura
    -- çekmiyor. Aynı veriyle aynı liste — ölçümün ön şartı.
    s.score DESC, s.id
  LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mood_profile(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(party_pct numeric, love_pct numeric, sad_pct numeric, angry_pct numeric, unclassified_pct numeric, total_plays bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  min_sample constant int := 50;
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with dinleme as (
    select coalesce(t.genres, '{}'::text[]) as gs, count(*)::numeric as n
    from public.play_events pe
    join public.tracks t on t.id = pe.track_id
    where pe.user_id = p_user_id
      and (p_from is null or pe.played_at >= p_from)
      and (p_to   is null or pe.played_at <  p_to)
    group by coalesce(t.genres, '{}'::text[])
  ),
  paylar as (
    select
      d.n,
      coalesce((select sum(public.genre_mood_weight(g, 'party')) from unnest(d.gs) g), 0) as w_party,
      coalesce((select sum(public.genre_mood_weight(g, 'love'))  from unnest(d.gs) g), 0) as w_love,
      coalesce((select sum(public.genre_mood_weight(g, 'sad'))   from unnest(d.gs) g), 0) as w_sad,
      coalesce((select sum(public.genre_mood_weight(g, 'angry')) from unnest(d.gs) g), 0) as w_angry
    from dinleme d
  ),
  bolusmus as (
    select
      p.n,
      (p.w_party + p.w_love + p.w_sad + p.w_angry) as w_top,
      p.w_party, p.w_love, p.w_sad, p.w_angry
    from paylar p
  ),
  toplam as (
    select
      sum(n) as n_all,
      sum(case when w_top > 0 then n * w_party / w_top else 0 end) as party,
      sum(case when w_top > 0 then n * w_love  / w_top else 0 end) as love,
      sum(case when w_top > 0 then n * w_sad   / w_top else 0 end) as sad,
      sum(case when w_top > 0 then n * w_angry / w_top else 0 end) as angry,
      sum(case when w_top = 0 then n else 0 end) as siniflanmamis
    from bolusmus
  )
  select
    case when t.n_all >= min_sample then round(100.0 * t.party / t.n_all, 2) end,
    case when t.n_all >= min_sample then round(100.0 * t.love  / t.n_all, 2) end,
    case when t.n_all >= min_sample then round(100.0 * t.sad   / t.n_all, 2) end,
    case when t.n_all >= min_sample then round(100.0 * t.angry / t.n_all, 2) end,
    case when t.n_all >= min_sample then round(100.0 * t.siniflanmamis / t.n_all, 2) end,
    t.n_all::bigint
  from toplam t;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pair_overlap_raw(a uuid, b uuid)
 RETURNS TABLE(shared_tracks integer, shared_artists integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    (SELECT count(*)::int FROM (
       SELECT DISTINCT merge_key FROM public.user_track_weights WHERE user_id = a
       INTERSECT
       SELECT DISTINCT merge_key FROM public.user_track_weights WHERE user_id = b
     ) x),
    (SELECT count(*)::int FROM (
       SELECT DISTINCT artist FROM public.user_track_weights WHERE user_id = a
       INTERSECT
       SELECT DISTINCT artist FROM public.user_track_weights WHERE user_id = b
     ) y);
$function$
;

CREATE OR REPLACE FUNCTION public.pair_score_v2(a uuid, b uuid)
 RETURNS TABLE(score real, shared_tracks integer, shared_artists integer, music_component real, genre_component real, behavior_component real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  ov RECORD;
  toplam integer;
  s_music real; s_genre real; s_behav real;
  w_m real; w_g real; w_b real;
  c_log_max CONSTANT real := 6.82;
BEGIN
  SELECT * INTO ov FROM public.pair_overlap_raw(a, b);
  toplam := COALESCE(ov.shared_tracks,0) + COALESCE(ov.shared_artists,0);

  shared_tracks  := COALESCE(ov.shared_tracks, 0);
  shared_artists := COALESCE(ov.shared_artists, 0);

  IF toplam <= 0 THEN
    score := 0; music_component := 0; genre_component := 0;
    behavior_component := 0;
    RETURN NEXT; RETURN;
  END IF;

  s_music := LEAST(1.0, ln(1.0 + toplam)::real / c_log_max);

  SELECT public.genre_cosine(ga.vector, gb.vector) INTO s_genre
  FROM public.user_genre_vectors ga, public.user_genre_vectors gb
  WHERE ga.user_id = a AND gb.user_id = b;
  s_genre := COALESCE(s_genre, 0);

  s_behav := public.behavior_affinity(a, b);

  SELECT COALESCE((SELECT value FROM public.algo_params WHERE key='match_w_music'),    0.60),
         COALESCE((SELECT value FROM public.algo_params WHERE key='match_w_genre'),    0.25),
         COALESCE((SELECT value FROM public.algo_params WHERE key='match_w_behavior'), 0.15)
  INTO w_m, w_g, w_b;

  score := (w_m * s_music + w_g * s_genre + w_b * s_behav)::real;
  music_component    := s_music;
  genre_component    := s_genre;
  behavior_component := s_behav;
  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.paket_gorsel_adaylari_sanatci(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, name text, bridge_track_spotify_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with paket_sanatci as (
    select distinct e->>'artist_name' as ad
    from public.user_period_pkg, lateral jsonb_array_elements(payload->'top_artists') e
    where nullif(e->>'artist_name', '') is not null
  )
  select
    a.id,
    a.name,
    (select t.spotify_id
       from public.tracks t
      where t.spotify_id is not null
        and a.name = any(t.artists)
      order by t.id
      limit 1) as bridge_track_spotify_id
  from paket_sanatci p
  join public.artists a on a.name = p.ad
  where a.image_url is null
  order by a.id
  limit greatest(1, least(500, p_limit));
$function$
;

CREATE OR REPLACE FUNCTION public.paket_gorsel_adaylari_sanatci_kullanicilar(p_user_ids uuid[], p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, name text, bridge_track_spotify_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH paket_sanatci AS (
    SELECT DISTINCT e->>'artist_name' AS ad
    FROM public.user_period_pkg p, LATERAL jsonb_array_elements(p.payload->'top_artists') e
    WHERE p.user_id = ANY (p_user_ids) AND nullif(e->>'artist_name', '') IS NOT NULL
  )
  SELECT
    a.id,
    a.name,
    (SELECT t.spotify_id
       FROM public.tracks t
      WHERE t.spotify_id IS NOT NULL
        AND a.name = ANY (t.artists)
      ORDER BY t.id
      LIMIT 1) AS bridge_track_spotify_id
  FROM paket_sanatci p
  JOIN public.artists a ON a.name = p.ad
  WHERE a.image_url IS NULL
  ORDER BY a.id
  LIMIT GREATEST(1, LEAST(500, p_limit));
$function$
;

CREATE OR REPLACE FUNCTION public.paket_gorsel_adaylari_track(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, spotify_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with paket_track as (
    select distinct (e->>'track_id')::uuid as track_id
    from public.user_period_pkg, lateral jsonb_array_elements(payload->'top_tracks') e
    where e->>'track_id' is not null
    union
    select distinct (c->>'track_id')::uuid
    from public.journey_year_pkg,
         lateral jsonb_array_elements(coalesce(payload->'covers', '[]'::jsonb)) c
    where c->>'track_id' is not null
  )
  select t.id, t.spotify_id
  from paket_track p
  join public.tracks t on t.id = p.track_id
  where t.image_url is null
    and t.spotify_id is not null
  order by t.id
  limit greatest(1, least(500, p_limit));
$function$
;

CREATE OR REPLACE FUNCTION public.paket_gorsel_adaylari_track_kullanicilar(p_user_ids uuid[], p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, spotify_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH paket_track AS (
    SELECT DISTINCT (e->>'track_id')::uuid AS track_id
    FROM public.user_period_pkg p, LATERAL jsonb_array_elements(p.payload->'top_tracks') e
    WHERE p.user_id = ANY (p_user_ids) AND e->>'track_id' IS NOT NULL
    UNION
    SELECT DISTINCT (c->>'track_id')::uuid
    FROM public.journey_year_pkg j,
         LATERAL jsonb_array_elements(COALESCE(j.payload->'covers', '[]'::jsonb)) c
    WHERE j.user_id = ANY (p_user_ids) AND c->>'track_id' IS NOT NULL
  )
  SELECT t.id, t.spotify_id
  FROM paket_track p
  JOIN public.tracks t ON t.id = p.track_id
  WHERE t.image_url IS NULL
    AND t.spotify_id IS NOT NULL
  ORDER BY t.id
  LIMIT GREATEST(1, LEAST(500, p_limit));
$function$
;

CREATE OR REPLACE FUNCTION public.parametreli_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer DEFAULT 50, p_genres text[] DEFAULT NULL::text[], p_artists text[] DEFAULT NULL::text[], p_sort_by text DEFAULT 'plays'::text)
 RETURNS TABLE(track_id uuid, raw_track_name text, raw_artist_name text, play_count bigint, total_ms bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    pe.track_id,
    tr.title as raw_track_name,
    (case when array_length(tr.artists, 1) > 0 then tr.artists[1] else null end) as raw_artist_name,
    count(*)::bigint as play_count,
    coalesce(sum(pe.ms_played), 0)::bigint as total_ms
  from public.play_events pe
  join public.tracks tr on tr.id = pe.track_id
  where pe.user_id = p_user_id
    and (p_user_id = auth.uid() or auth.role() = 'service_role')
    and pe.played_at >= p_from
    and pe.played_at <= p_to
    and pe.incognito_mode = false
    and (
      p_genres is null or array_length(p_genres, 1) is null
      or coalesce(tr.genres, array[]::text[]) && p_genres
    )
    and (
      p_artists is null or array_length(p_artists, 1) is null
      or (array_length(tr.artists, 1) > 0 and tr.artists[1] = any(p_artists))
    )
  group by pe.track_id, tr.title, tr.artists
  order by
    case when p_sort_by = 'duration' then coalesce(sum(pe.ms_played), 0) end desc nulls last,
    case when p_sort_by <> 'duration' then count(*) end desc nulls last,
    coalesce(sum(pe.ms_played), 0) desc
  limit greatest(p_limit, 0);
$function$
;

CREATE OR REPLACE FUNCTION public.plan_daily_migration_limit(p_plan text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_plan when 'pro' then 65 when 'free' then 30 else 30 end;
$function$
;

CREATE OR REPLACE FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_uri text DEFAULT NULL::text)
 RETURNS TABLE(month date, added_count bigint, cumulative_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with monthly as (
    select date_trunc('month', pte.added_at)::date as m,
           count(*) as n
    from public.playlist_track_events pte
    where pte.user_id = p_user_id
      and pte.added_at is not null
      and (p_playlist_uri is null or pte.playlist_uri = p_playlist_uri)
    group by 1
  )
  select m,
         n,
         (sum(n) over (order by m rows between unbounded preceding and current row))::bigint
  from monthly
  order by m;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_id uuid)
 RETURNS TABLE(month date, added_count bigint, cumulative_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with pl as (
    select p.name, p.platform_id
    from public.playlists p
    where p.id = p_playlist_id and p.user_id = p_user_id
  ),
  monthly as (
    select date_trunc('month', pte.added_at)::date as m,
           count(*) as n
    from public.playlist_track_events pte
    join pl on (
          pte.playlist_uri = pl.name
       or pte.playlist_uri = 'spotify:playlist:' || pl.platform_id
    )
    where pte.user_id = p_user_id
      and pte.added_at is not null
    group by 1
  )
  select m,
         n,
         (sum(n) over (order by m rows between unbounded preceding and current row))::bigint
  from monthly
  order by m;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.playlist_reco_candidates()
 RETURNS TABLE(user_id uuid, playlist_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.user_id, p.id
  from public.playlists p
  where p.last_viewed_at is not null
    and p.last_viewed_at > now() - interval '30 days'
    and p.user_id in (select public.recap_real_user_ids())
  order by p.last_viewed_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.playlist_track_added_dates(p_user_id uuid, p_playlist_id uuid)
 RETURNS TABLE(track_id uuid, added_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with pl as (
    select p.name, p.platform_id
    from public.playlists p
    where p.id = p_playlist_id and p.user_id = p_user_id
  )
  select t.id,
         min(pte.added_at) as added_at
  from public.playlist_track_events pte
  join pl on (
        pte.playlist_uri = pl.name
     or pte.playlist_uri = 'spotify:playlist:' || pl.platform_id
  )
  join public.tracks t
    on t.spotify_id = replace(pte.track_uri, 'spotify:track:', '')
  where pte.user_id = p_user_id
    and pte.added_at is not null
  group by t.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.playlist_tracks_page(p_user_id uuid, p_playlist_id uuid)
 RETURNS TABLE(track_id uuid, title text, artist_name text, image_url text, duration_ms integer, track_pos integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.title,
         case when array_length(t.artists,1) > 0 then t.artists[1] else null end,
         t.image_url, t.duration_ms, pt.position
  from public.playlist_tracks pt
  join public.tracks t on t.id = pt.track_id
  join public.playlists p on p.id = pt.playlist_id
  where pt.playlist_id = p_playlist_id
    and p.user_id = p_user_id
    and (p_user_id is not distinct from auth.uid() or auth.role() = 'service_role')
  order by pt.position;
$function$
;

CREATE OR REPLACE FUNCTION public.rare_overlap_raw(a uuid, b uuid)
 RETURNS real
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH sinir AS (
    -- Nadirlik penceresi: en az 2 kisi (ortak olabilsin), en fazla kullanicilarin
    -- YARISI (daha yaygini "nadir" degildir). Oran -> topluluk buyudukce olcekler.
    SELECT 2 AS alt,
           GREATEST(2, ceil((SELECT count(DISTINCT user_id) FROM public.user_track_weights) / 2.0))::int AS ust
  ),
  uygun AS (
    SELECT ai.artist, ai.idf
    FROM public.artist_idf ai CROSS JOIN sinir s
    WHERE ai.listener_count BETWEEN s.alt AND s.ust
  ),
  na AS (
    SELECT w.artist, sum(w.final_weight) / NULLIF(
             (SELECT sum(final_weight) FROM public.user_track_weights WHERE user_id = a), 0) AS nw
    FROM public.user_track_weights w JOIN uygun USING (artist)
    WHERE w.user_id = a GROUP BY w.artist
  ),
  nb AS (
    SELECT w.artist, sum(w.final_weight) / NULLIF(
             (SELECT sum(final_weight) FROM public.user_track_weights WHERE user_id = b), 0) AS nw
    FROM public.user_track_weights w JOIN uygun USING (artist)
    WHERE w.user_id = b GROUP BY w.artist
  ),
  pay AS (
    SELECT COALESCE(sum(u.idf * u.idf * na.nw * nb.nw), 0) AS v
    FROM na JOIN nb USING (artist) JOIN uygun u USING (artist)
  ),
  norm AS (
    SELECT
      sqrt(COALESCE((SELECT sum(u.idf*u.idf*na.nw*na.nw) FROM na JOIN uygun u USING (artist)), 0)) AS la,
      sqrt(COALESCE((SELECT sum(u.idf*u.idf*nb.nw*nb.nw) FROM nb JOIN uygun u USING (artist)), 0)) AS lb
  )
  SELECT COALESCE((SELECT v FROM pay) / NULLIF((SELECT la*lb FROM norm), 0), 0)::real;
$function$
;

CREATE OR REPLACE FUNCTION public.reactivate_small_artist_pending()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  cleared         integer;
  v_last_scan     timestamptz;
  v_newest_track  timestamptz;
begin
  if not exists (
    select 1 from public.tracks
    where genre_pending_reason in ('artist_too_small', 'small_artist_no_match')
    limit 1
  ) then
    return 0;
  end if;

  select last_scan_at
    into v_last_scan
  from public.maintenance_watermark
  where job_key = 'small_artist_reactivate';

  v_last_scan := coalesce(v_last_scan, to_timestamp(0));

  with pending_artists as (
    select distinct artists[1] as artist
    from public.tracks
    where genre_pending_reason in ('artist_too_small', 'small_artist_no_match')
      and artists is not null
      and array_length(artists, 1) > 0
  )
  select max(t.created_at)
    into v_newest_track
  from public.tracks t
  join pending_artists pa on pa.artist = t.artists[1];

  if v_newest_track is null or v_newest_track <= v_last_scan then
    return 0;
  end if;

  with pending_artists as (
    select distinct artists[1] as artist
    from public.tracks
    where genre_pending_reason in ('artist_too_small', 'small_artist_no_match')
      and artists is not null
      and array_length(artists, 1) > 0
  ),
  counts as (
    select t.artists[1] as artist, count(*) as n
    from public.tracks t
    join pending_artists pa on pa.artist = t.artists[1]
    group by t.artists[1]
  ),
  eligible as (select artist from counts where n >= 5)
  update public.tracks
  set genre_pending_reason = null
  where genre_pending_reason in ('artist_too_small', 'small_artist_no_match')
    and artists[1] in (select artist from eligible);

  get diagnostics cleared = row_count;

  update public.maintenance_watermark
  set last_scan_at = v_newest_track,
      updated_at   = now()
  where job_key = 'small_artist_reactivate';

  return cleared;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_discovery_by_month(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(month_start date, new_artists bigint, new_tracks bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  ilk_sanatci as (
    select t.artists[1] as ad, min(pe.played_at) as ilk
    from play_events pe join tracks t on t.id = pe.track_id, guard
    where pe.user_id = p_user_id and t.artists[1] is not null
    group by t.artists[1]
  ),
  ilk_track as (
    select pe.track_id, min(pe.played_at) as ilk
    from play_events pe, guard
    where pe.user_id = p_user_id
    group by pe.track_id
  )
  select
    date_trunc('month', coalesce(a.ilk, t.ilk))::date as month_start,
    count(distinct a.ad) as new_artists,
    count(distinct t.track_id) as new_tracks
  from ilk_sanatci a
    full outer join ilk_track t
      on date_trunc('month', a.ilk) = date_trunc('month', t.ilk)
  where coalesce(a.ilk, t.ilk) >= coalesce(p_from, '-infinity'::timestamptz)
    and coalesce(a.ilk, t.ilk) <  coalesce(p_to,   'infinity'::timestamptz)
  group by 1
  order by new_artists desc, new_tracks desc
  limit 12;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_discovery_total(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(new_artists bigint, new_tracks bigint, total_artists bigint, total_tracks bigint, discovery_rate numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  return query
  with donem as (
    select distinct t.id as track_id, coalesce(t.artists[1], '') as artist
    from public.play_events pe join public.tracks t on t.id = pe.track_id
    where pe.user_id = p_user_id and pe.played_at >= p_from and pe.played_at < p_to
  ),
  onceki as (
    select distinct t.id as track_id, coalesce(t.artists[1], '') as artist
    from public.play_events pe join public.tracks t on t.id = pe.track_id
    where pe.user_id = p_user_id and pe.played_at < p_from
  ),
  sayim as (
    select
      (select count(distinct d.artist) from donem d
        where d.artist <> '' and not exists (select 1 from onceki o where o.artist = d.artist)) as n_new_artist,
      (select count(*) from donem d
        where not exists (select 1 from onceki o where o.track_id = d.track_id)) as n_new_track,
      (select count(distinct artist) from donem where artist <> '') as n_artist,
      (select count(*) from donem) as n_track
  )
  select s.n_new_artist, s.n_new_track, s.n_artist, s.n_track,
    case when s.n_track > 0 then round(100.0 * s.n_new_track / s.n_track, 1) else null end
  from sayim s;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_dominant_genre(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(genre_name text, play_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  select g::text, count(*)::bigint
  from play_events pe
  join tracks t on t.id = pe.track_id
  cross join lateral unnest(t.genres) as g
  where pe.user_id = p_user_id
    and pe.incognito_mode = false
    and (p_from is null or pe.played_at >= p_from)
    and (p_to   is null or pe.played_at <= p_to)
  group by g
  order by 2 desc
  limit 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_genre_variety(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(genre_count bigint, top_genre text, top_genre_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  return query
  with g as (
    select unnest(t.genres) as tur
    from public.play_events pe join public.tracks t on t.id = pe.track_id
    where pe.user_id = p_user_id and pe.played_at >= p_from and pe.played_at < p_to
      and t.genres is not null
  ),
  toplam as (select count(*)::numeric as n from g),
  zirve as (select tur, count(*) as n from g group by tur order by count(*) desc limit 1)
  select (select count(distinct tur) from g), (select tur from zirve),
         round(100.0 * (select n from zirve) / nullif((select n from toplam), 0), 1);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_hourly_distribution(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(hour integer, plays bigint, minutes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  hours as (select generate_series(0, 23) as h),
  agg as (
    select
      extract(hour from (pe.played_at at time zone 'Europe/Istanbul'))::int as h,
      count(*)                                as plays,
      round(sum(pe.ms_played) / 60000.0)::bigint as minutes
    from play_events pe, guard
    where pe.user_id = p_user_id
      and pe.played_at >= coalesce(p_from, '-infinity'::timestamptz)
      and pe.played_at <  coalesce(p_to,   'infinity'::timestamptz)
    group by 1
  )
  select hours.h, coalesce(agg.plays, 0), coalesce(agg.minutes, 0)
  from hours left join agg on agg.h = hours.h
  order by hours.h;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_hourly_pattern(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(hour integer, play_count bigint, total_ms bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(0, 23) AS hour
  ),
  counts AS (
    SELECT
      EXTRACT(HOUR FROM played_at AT TIME ZONE 'Europe/Istanbul')::integer AS hour,
      COUNT(*)::bigint       AS play_count,
      SUM(ms_played)::bigint AS total_ms
    FROM play_events
    WHERE user_id        = p_user_id
      AND incognito_mode = false
      AND skipped IS DISTINCT FROM true
      AND ms_played      >= 5000
      AND (p_to   IS NULL OR played_at <= p_to)
      AND (p_from IS NULL OR played_at >= p_from)
    GROUP BY 1
  )
  SELECT
    h.hour,
    COALESCE(c.play_count, 0) AS play_count,
    COALESCE(c.total_ms,   0) AS total_ms
  FROM hours h
  LEFT JOIN counts c USING (hour)
  ORDER BY h.hour;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_listening_summary(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_source text DEFAULT NULL::text)
 RETURNS TABLE(total_ms bigint, total_tracks bigint, total_artists bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cached public.user_listening_summary_cache%ROWTYPE;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_source IS NULL
     AND p_from IS NULL
     AND (p_to IS NULL OR p_to >= now() - interval '1 day') THEN
    SELECT * INTO v_cached
    FROM public.user_listening_summary_cache
    WHERE user_id = p_user_id;

    IF FOUND THEN
      total_ms      := v_cached.total_ms;
      total_tracks  := v_cached.total_tracks;
      total_artists := v_cached.total_artists;
      RETURN NEXT;
      RETURN;
    END IF;
    PERFORM public.refresh_listening_summary_cache(p_user_id);
    SELECT * INTO v_cached
    FROM public.user_listening_summary_cache
    WHERE user_id = p_user_id;
    total_ms      := COALESCE(v_cached.total_ms, 0);
    total_tracks  := COALESCE(v_cached.total_tracks, 0);
    total_artists := COALESCE(v_cached.total_artists, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_source = 'api_realtime' THEN
    RETURN QUERY
    SELECT
      COALESCE(SUM(pe.ms_played), 0)::bigint,
      COUNT(DISTINCT pe.track_id)::bigint,
      COUNT(DISTINCT t.artists[1])::bigint
    FROM play_events pe
    JOIN tracks t ON t.id = pe.track_id
    WHERE pe.user_id        = p_user_id
      AND pe.source         = 'api_realtime'
      AND pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true
      AND pe.ms_played      >= 5000
      AND (p_to   IS NULL OR pe.played_at <= p_to)
      AND (p_from IS NULL OR pe.played_at >= p_from);
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(pe.ms_played), 0)::bigint,
    COUNT(DISTINCT pe.track_id)::bigint,
    COUNT(DISTINCT t.artists[1])::bigint
  FROM play_events pe
  JOIN tracks t ON t.id = pe.track_id
  WHERE pe.user_id        = p_user_id
    AND pe.incognito_mode = false
    AND pe.skipped IS DISTINCT FROM true
    AND pe.ms_played      >= 5000
    AND (p_to     IS NULL OR pe.played_at <= p_to)
    AND (p_from   IS NULL OR pe.played_at >= p_from)
    AND (p_source IS NULL OR pe.source     = p_source);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_longest_streak(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(streak_days integer, streak_start date, streak_end date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  gunler as (
    select distinct pe.played_at::date as gun
    from play_events pe, guard
    where pe.user_id = p_user_id
      and pe.played_at >= coalesce(p_from, '-infinity'::timestamptz)
      and pe.played_at <  coalesce(p_to,   'infinity'::timestamptz)
  ),
  adalar as (
    select gun, gun - (row_number() over (order by gun))::int as ada
    from gunler
  )
  select count(*)::int as streak_days, min(gun) as streak_start, max(gun) as streak_end
  from adalar
  group by ada
  order by streak_days desc, streak_end desc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_number_one(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(artist_name text, artist_hours numeric, artist_plays bigint, track_title text, track_artist text, track_hours numeric, track_plays bigint, artist_image_url text, track_image_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH p AS (
    SELECT t.id, COALESCE(t.artists[1], '') AS artist, t.title, t.image_url, pe.ms_played
    FROM public.play_events pe
    JOIN public.tracks t ON t.id = pe.track_id
    WHERE pe.user_id = p_user_id
      AND pe.played_at >= p_from AND pe.played_at < p_to
      AND NOT (t.spotify_id IS NULL AND t.title = 'Unknown Track')
  ),
  top_artist AS (
    SELECT artist,
           round(sum(ms_played) / 3600000.0, 1) AS saat,
           count(*)::bigint AS calma
    FROM p WHERE artist <> ''
    GROUP BY artist
    ORDER BY sum(ms_played) DESC
    LIMIT 1
  ),
  top_artist_img AS (
    SELECT a.image_url
    FROM top_artist ta
    LEFT JOIN public.artists a ON a.name ILIKE ta.artist AND a.image_url IS NOT NULL
    LIMIT 1
  ),
  top_track AS (
    SELECT title, artist,
           max(image_url) AS img_url,
           round(sum(ms_played) / 3600000.0, 1) AS saat,
           count(*)::bigint AS calma
    FROM p
    GROUP BY title, artist
    ORDER BY sum(ms_played) DESC
    LIMIT 1
  )
  SELECT
    (SELECT artist FROM top_artist),
    (SELECT saat FROM top_artist),
    (SELECT calma FROM top_artist),
    (SELECT title FROM top_track),
    (SELECT artist FROM top_track),
    (SELECT saat FROM top_track),
    (SELECT calma FROM top_track),
    (SELECT COALESCE(
      (SELECT image_url FROM top_artist_img),
      (SELECT img_url FROM top_track WHERE artist = (SELECT artist FROM top_artist))
    )),
    (SELECT img_url FROM top_track);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_obsession(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(title text, artist text, plays bigint, hours numeric, share_pct numeric, first_played timestamp with time zone, last_played timestamp with time zone, span_days integer, peak_window_plays bigint, peak_window_start date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  min_plays constant int := 30;
  min_window constant int := 15;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with p as (
    select t.title, coalesce(t.artists[1], '') as artist, pe.ms_played, pe.played_at
    from public.play_events pe join public.tracks t on t.id = pe.track_id
    where pe.user_id = p_user_id and pe.played_at >= p_from and pe.played_at < p_to
      and not (t.spotify_id is null and t.title = 'Unknown Track')
  ),
  toplam as (select count(*)::numeric as n from p),
  adaylar as (
    select p.title, p.artist, count(*)::bigint as n,
           round(sum(p.ms_played) / 3600000.0, 1) as saat,
           min(p.played_at) as ilk, max(p.played_at) as son
    from p group by p.title, p.artist
    having count(*) >= min_plays
    order by count(*) desc limit 10
  ),
  pencereli as (
    select a.title, a.artist, a.n, a.saat, a.ilk, a.son,
           w.pencere_n, w.pencere_bas
    from adaylar a
    cross join lateral (
      select count(*)::bigint as pencere_n, x.gun as pencere_bas
      from (select distinct p3.played_at::date as gun from p p3
            where p3.title = a.title and p3.artist = a.artist) x
      join p p2 on p2.title = a.title and p2.artist = a.artist
                and p2.played_at >= x.gun::timestamptz
                and p2.played_at <  (x.gun + 30)::timestamptz
      group by x.gun
      order by count(*) desc
      limit 1
    ) w
  )
  select pz.title, pz.artist, pz.n, pz.saat,
    round(100.0 * pz.n / nullif((select n from toplam), 0), 2),
    pz.ilk, pz.son,
    (extract(epoch from (pz.son - pz.ilk)) / 86400)::int,
    pz.pencere_n, pz.pencere_bas
  from pencereli pz
  where pz.pencere_n >= min_window
  order by pz.pencere_n desc
  limit 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_peak_day(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(day date, total_ms bigint, play_count bigint, track_id uuid, title text, artist text, image_url text, plays bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with guard as (
    select 1 where p_user_id = auth.uid() or auth.role() = 'service_role'
  ),
  haric as (
    select id from tracks where spotify_id is null and title = 'Unknown Track'
  ),
  kapsam as (
    select pe.played_at::date as gun, pe.track_id, pe.ms_played
    from play_events pe, guard
    where pe.user_id = p_user_id
      and pe.played_at >= coalesce(p_from, '-infinity'::timestamptz)
      and pe.played_at <  coalesce(p_to,   'infinity'::timestamptz)
      and pe.track_id not in (select id from haric)
  ),
  zirve as (
    select gun, sum(coalesce(ms_played, 0))::bigint as toplam_ms, count(*)::bigint as calma
    from kapsam group by gun
    order by toplam_ms desc, calma desc limit 1
  ),
  o_gunun_sarkilari as (
    select k.track_id, count(*)::bigint as calma
    from kapsam k join zirve z on z.gun = k.gun
    group by k.track_id order by calma desc limit 3
  )
  select z.gun, z.toplam_ms, z.calma, t.id, t.title, t.artists[1], t.image_url, s.calma
  from zirve z
    left join o_gunun_sarkilari s on true
    left join tracks t on t.id = s.track_id
  order by s.calma desc nulls last;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_periods_with_data(p_user_id uuid)
 RETURNS TABLE(period_type text, period_label text, period_start date, period_end date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  select
    'year'::text,
    to_char(date_trunc('year', pe.played_at), 'YYYY'),
    date_trunc('year', pe.played_at)::date,
    (date_trunc('year', pe.played_at) + interval '1 year - 1 day')::date
  from play_events pe
  where pe.user_id = p_user_id
    and pe.incognito_mode = false
  group by date_trunc('year', pe.played_at)
  having count(*) > 0

  union all

  select
    'month'::text,
    to_char(date_trunc('month', pe.played_at), 'TMMonth YYYY'),
    date_trunc('month', pe.played_at)::date,
    (date_trunc('month', pe.played_at) + interval '1 month - 1 day')::date
  from play_events pe
  where pe.user_id = p_user_id
    and pe.incognito_mode = false
  group by date_trunc('month', pe.played_at)
  having count(*) > 0

  order by 3 desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_platform_breakdown(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(source text, play_count bigint, percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH counts AS (
    SELECT
      COALESCE(pe.platform, 'unknown') AS source,
      COUNT(*)::bigint                 AS play_count
    FROM play_events pe
    WHERE pe.user_id        = p_user_id
      AND pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true
      AND pe.ms_played      >= 5000
      AND (p_to   IS NULL OR pe.played_at <= p_to)
      AND (p_from IS NULL OR pe.played_at >= p_from)
    GROUP BY 1
  ),
  total AS (SELECT SUM(counts.play_count) AS t FROM counts)
  SELECT
    c.source,
    c.play_count,
    ROUND(c.play_count * 10000.0 / NULLIF(total.t, 0)) / 100 AS percentage
  FROM counts c, total
  ORDER BY c.play_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_real_user_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id
  FROM auth.users u
  WHERE COALESCE((u.raw_user_meta_data->>'is_test')::boolean, false) = false
    AND EXISTS (SELECT 1 FROM public.play_events pe WHERE pe.user_id = u.id);
$function$
;

CREATE OR REPLACE FUNCTION public.recap_top_albums(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer DEFAULT 5)
 RETURNS TABLE(album text, artist text, distinct_tracks bigint, plays bigint, hours numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  min_distinct constant int := 3;
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  return query
  select t.album, coalesce(t.artists[1], ''), count(distinct t.id)::bigint,
         count(*)::bigint, round(sum(pe.ms_played) / 3600000.0, 1)
  from public.play_events pe join public.tracks t on t.id = pe.track_id
  where pe.user_id = p_user_id and pe.played_at >= p_from and pe.played_at < p_to
    and t.album is not null and t.album <> ''
  group by t.album, coalesce(t.artists[1], '')
  having count(distinct t.id) >= min_distinct
  order by sum(pe.ms_played) desc
  limit greatest(p_limit, 1);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_top_artists(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 5, p_source text DEFAULT NULL::text)
 RETURNS TABLE(artist_name text, play_count bigint, total_ms bigint, image_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      COALESCE(t.artists[1], '(Unknown)') AS artist_name,
      COUNT(*)::bigint                    AS play_count,
      SUM(pe.ms_played)::bigint           AS total_ms
    FROM play_events pe
    JOIN tracks t ON t.id = pe.track_id
    WHERE pe.user_id        = p_user_id
      AND pe.incognito_mode = false
      AND (p_to     IS NULL OR pe.played_at <= p_to)
      AND (p_from   IS NULL OR pe.played_at >= p_from)
      AND (p_source IS NULL OR pe.source     = p_source)
      AND NOT (t.spotify_id IS NULL AND t.title = 'Unknown Track')
    GROUP BY t.artists[1]
    ORDER BY play_count DESC
    LIMIT p_limit
  )
  SELECT
    agg.artist_name,
    agg.play_count,
    agg.total_ms,
    ar.image_url
  FROM agg
  LEFT JOIN public.artists ar ON ar.name_normalized = lower(trim(agg.artist_name));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_top_tracks(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 5, p_source text DEFAULT NULL::text)
 RETURNS TABLE(track_id uuid, title text, artist_name text, play_count bigint, total_ms bigint, skip_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    pe.track_id,
    t.title,
    t.artists[1]              AS artist_name,
    COUNT(*)::bigint          AS play_count,
    SUM(pe.ms_played)::bigint AS total_ms,
    0::bigint                 AS skip_count
  FROM play_events pe
  JOIN tracks t ON t.id = pe.track_id
  WHERE pe.user_id        = p_user_id
    AND pe.incognito_mode = false
    AND pe.skipped IS DISTINCT FROM true
    AND pe.ms_played      >= 5000
    AND (p_to     IS NULL OR pe.played_at <= p_to)
    AND (p_from   IS NULL OR pe.played_at >= p_from)
    AND (p_source IS NULL OR pe.source     = p_source)
    AND NOT (t.spotify_id IS NULL AND t.title = 'Unknown Track')
  GROUP BY pe.track_id, t.title, t.artists[1]
  ORDER BY play_count DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recap_user_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT user_id FROM public.play_events WHERE user_id IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.record_run(p_run_type text, p_job_id uuid, p_outcome text, p_stats jsonb, p_error text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO pipeline_runs (run_type, job_id, outcome, stats, error)
  VALUES (p_run_type, p_job_id, p_outcome, p_stats, p_error)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_active_users_batch(p_butce_sn integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  v_bas   timestamptz := clock_timestamp();
  v_uid   uuid;
  v_n     integer := 0;
  v_hata  integer := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  END IF;

  LOOP
    EXIT WHEN clock_timestamp() - v_bas > make_interval(secs => p_butce_sn);

    SELECT k INTO v_uid
    FROM public.cron_sira_al('gunluk_paket', interval '20 hours', 1, interval '30 minutes') AS k
    LIMIT 1;
    EXIT WHEN v_uid IS NULL;

    BEGIN
      PERFORM public.refresh_listening_summary_cache(v_uid);
      PERFORM public.build_user_stats_pkg(v_uid);
      PERFORM public.build_user_pattern_pkg(v_uid);
      PERFORM public.build_user_period_pkg(v_uid);
      PERFORM public.build_user_taste_pkg(v_uid);
      PERFORM public.materialize_user_top_strips(v_uid, 20);
      PERFORM public.build_journey_year_pkg(v_uid);
      PERFORM public.refresh_user_taste(v_uid);
      PERFORM public.cron_sira_tamamla('gunluk_paket', v_uid, NULL);
      v_n := v_n + 1;
    EXCEPTION WHEN OTHERS THEN
      v_hata := v_hata + 1;
      PERFORM public.cron_sira_tamamla('gunluk_paket', v_uid, SQLERRM);
      RAISE WARNING '[refresh_active_users_batch] user % failed: %', v_uid, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'users_processed', v_n,
    'errors', v_hata,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_bas)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_all_active_users_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  r RECORD;
  v_users_count integer := 0;
  v_errors_count integer := 0;
  v_start_time timestamptz := clock_timestamp();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  END IF;

  FOR r IN (
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM play_events WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM platform_connections WHERE is_active = TRUE
    ) u
  ) LOOP
    BEGIN
      PERFORM public.refresh_listening_summary_cache(r.user_id);
      PERFORM public.build_user_stats_pkg(r.user_id);
      PERFORM public.build_user_pattern_pkg(r.user_id);
      PERFORM public.build_user_period_pkg(r.user_id);
      PERFORM public.build_user_taste_pkg(r.user_id);
      PERFORM public.materialize_user_top_strips(r.user_id, 20);
      PERFORM public.build_journey_year_pkg(r.user_id);
      PERFORM public.refresh_user_taste(r.user_id);

      v_users_count := v_users_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING '[refresh_all_active_users_data] User % refresh failed: %', r.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'users_processed', v_users_count,
    'errors', v_errors_count,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_artist_idf()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_n INTEGER;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.artist_idf;
  SELECT count(*) INTO v_n FROM public.artist_idf;
  RETURN v_n;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_listening_summary_cache(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Test profilleri gerçek kullanıcı değil → cache tutulmaz (Sahip 2026-07-24).
  IF NOT public.is_real_user(p_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_listening_summary_cache
    (user_id, total_ms, total_tracks, total_artists, refreshed_at)
  SELECT
    p_user_id,
    COALESCE(SUM(pe.ms_played), 0)::bigint,
    COUNT(DISTINCT pe.track_id)::bigint,
    COUNT(DISTINCT t.artists[1])::bigint,
    now()
  FROM play_events pe
  JOIN tracks t ON t.id = pe.track_id
  WHERE pe.user_id        = p_user_id
    AND pe.incognito_mode = false
    AND pe.skipped IS DISTINCT FROM true
    AND pe.ms_played      >= 5000
  ON CONFLICT (user_id) DO UPDATE SET
    total_ms      = EXCLUDED.total_ms,
    total_tracks  = EXCLUDED.total_tracks,
    total_artists = EXCLUDED.total_artists,
    refreshed_at  = EXCLUDED.refreshed_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_user_taste(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '60000'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM compute_user_track_weights(p_user_id);
  PERFORM apply_liked_songs_weight(p_user_id);
  PERFORM compute_user_behavioral_signals(p_user_id);
  PERFORM compute_user_genre_vector(p_user_id);
  PERFORM compute_user_mainstream(p_user_id);
  PERFORM compute_user_identity(p_user_id);
  PERFORM materialize_user_top_strips(p_user_id, 20);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_or_create_track_by_name(p_tracks jsonb)
 RETURNS TABLE(idx integer, track_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH girdi AS (
    SELECT
      (t->>'idx')::int AS idx,
      trim((t->>'title')::text) AS title,
      NULLIF(trim((t->>'artist')::text), '') AS artist
    FROM jsonb_array_elements(p_tracks) AS t
    WHERE (t->>'title') IS NOT NULL AND trim((t->>'title')::text) <> ''
      -- 2026-09-28: Spotify'ın kendi export'unda tanımlanamayan/silinmiş
      -- parçalar için verdiği placeholder — gerçek bir şarkı değil, hiç
      -- işlenmez (worker o olayı sessizce atlar, pre-0356 davranışı).
      AND trim((t->>'title')::text) <> 'Unknown Track'
  ),
  eslesen AS (
    SELECT g.idx, tr.id AS track_id
    FROM girdi g
    CROSS JOIN LATERAL (
      SELECT x.id
      FROM public.tracks x
      WHERE lower(x.title) = lower(g.title)
        AND (g.artist IS NULL OR lower(x.artists[1]) = lower(g.artist))
      ORDER BY (x.spotify_id IS NOT NULL) DESC, x.created_at ASC
      LIMIT 1
    ) tr
  ),
  eslesmeyen AS (
    SELECT g.idx, g.title, g.artist
    FROM girdi g
    WHERE NOT EXISTS (SELECT 1 FROM eslesen e WHERE e.idx = g.idx)
  ),
  benzersiz_yeni AS (
    SELECT DISTINCT title, artist FROM eslesmeyen
  ),
  eklenen AS (
    INSERT INTO public.tracks (spotify_id, title, artists)
    SELECT NULL, b.title, ARRAY[COALESCE(b.artist, 'Unknown')]
    FROM benzersiz_yeni b
    RETURNING id, title, artists[1] AS artist
  )
  SELECT em.idx, ek.id
  FROM eslesmeyen em
  JOIN eklenen ek
    ON ek.title = em.title
   AND (ek.artist = em.artist OR (ek.artist = 'Unknown' AND em.artist IS NULL))
  UNION ALL
  SELECT e.idx, e.track_id FROM eslesen e;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rosso_bugun()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (now() AT TIME ZONE 'Europe/Istanbul')::date;
$function$
;

CREATE OR REPLACE FUNCTION public.save_catalog_enrichment(p_item_type text, p_model text, p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_yazilan int := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_item_type NOT IN ('track', 'artist', 'album') THEN
    RAISE EXCEPTION 'gecersiz item_type: %', p_item_type;
  END IF;

  INSERT INTO public.catalog_ai_enrichment AS c (
    item_id, item_type, primary_genre, subgenres, moods, vibe,
    energy_character, tempo_character, sonic_character,
    language, era_context, confidence_score, model_used, updated_at
  )
  SELECT
    e.item_id,
    p_item_type,
    left(e.primary_genre, 80),
    coalesce(e.subgenres, '{}')::text[],
    coalesce(e.moods, '{}')::text[],
    coalesce(e.vibe, '{}')::text[],
    -- Modelin uydurduğu bir değer CHECK'i patlatıp TÜM batch'i düşürmesin:
    -- geçersizse NULL'a düşür, satırın kalanı korunur.
    CASE WHEN e.energy_character IN ('low','medium','high','explosive') THEN e.energy_character END,
    CASE WHEN e.tempo_character IN ('slow','mid-tempo','up-tempo','variable') THEN e.tempo_character END,
    coalesce(e.sonic_character, '{}')::text[],
    left(e.language, 40),
    left(e.era_context, 80),
    least(greatest(coalesce(e.confidence_score, 0.5), 0.0), 1.0),
    p_model,
    now()
  FROM jsonb_to_recordset(p_items) AS e(
    item_id          text,
    primary_genre    text,
    subgenres        text[],
    moods            text[],
    vibe             text[],
    energy_character text,
    tempo_character  text,
    sonic_character  text[],
    language         text,
    era_context      text,
    confidence_score real
  )
  WHERE e.item_id IS NOT NULL
    AND btrim(coalesce(e.primary_genre, '')) <> ''
  ON CONFLICT (item_id, item_type) DO UPDATE
    SET primary_genre    = excluded.primary_genre,
        subgenres        = excluded.subgenres,
        moods            = excluded.moods,
        vibe             = excluded.vibe,
        energy_character = excluded.energy_character,
        tempo_character  = excluded.tempo_character,
        sonic_character  = excluded.sonic_character,
        language         = excluded.language,
        era_context      = excluded.era_context,
        confidence_score = excluded.confidence_score,
        model_used       = excluded.model_used,
        enrichment_version = c.enrichment_version + 1,
        updated_at       = now();

  GET DIAGNOSTICS v_yazilan = ROW_COUNT;
  RETURN v_yazilan;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_mood_pkg_payload(p_user_id uuid, p_mood_key text, p_track_ids uuid[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hidden uuid[];
  v_tracks jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_mood_key NOT IN (
    'quiet_side','full_throttle','locked_in','no_limit','closer','miles_away','gece_217',
    'your_day','first_light','daylight','dusk','nocturne'
  ) THEN
    RAISE EXCEPTION 'gecersiz mood_key: %', p_mood_key;
  END IF;

  SELECT coalesce(hidden_track_ids, '{}') INTO v_hidden
  FROM public.mood_workspace
  WHERE user_id = p_user_id AND mood_key = p_mood_key;

  /*
   * `mood_playlist` burada YENİDEN çağrılıyor — yalnız `play_count` için.
   * Alternatifi, pencere/çalma mantığını bu fonksiyona kopyalamaktı; iki
   * yerde duran aynı mantık ilk değişiklikte ayrışır. Limit 100000 çünkü
   * AI'ın seçtiği her parçanın sayısı gerekli, ilk 50'nin değil.
   */
  WITH sayim AS (
    SELECT m.track_id, m.play_count
    FROM public.mood_playlist(p_user_id, p_mood_key, 100000) m
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'track_id', t.id,
      'title', t.title,
      'artist_name', t.artists[1],
      'album', t.album,
      'image_url', t.image_url,
      'play_count', coalesce(s.play_count, 0),
      'spotify_id', t.spotify_id)
      ORDER BY coalesce(s.play_count, 0) DESC, ord.i), '[]'::jsonb)
    INTO v_tracks
  FROM unnest(p_track_ids) WITH ORDINALITY AS ord(tid, i)
  JOIN public.tracks t ON t.id = ord.tid
  LEFT JOIN sayim s ON s.track_id = ord.tid
  WHERE NOT (ord.tid = ANY(coalesce(v_hidden, '{}'::uuid[])));

  IF v_tracks IS NULL OR jsonb_array_length(v_tracks) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.mood_pkg (user_id, mood_key, payload, tz, generated_at)
  VALUES (p_user_id, p_mood_key, v_tracks, 'Europe/Istanbul', now())
  ON CONFLICT (user_id, mood_key) DO UPDATE
    SET payload = excluded.payload, tz = excluded.tz, generated_at = excluded.generated_at;

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_user_music_intelligence_ai(p_user_id uuid, p_model text, p_sonic_affinities text[], p_genre_core text[], p_genre_peripheral text[], p_avoided_signatures text[], p_listening_habits jsonb, p_musical_paradox text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Metrik satırı yoksa AI profili de yazılmaz: semantik yorum, deterministik
  -- tabanın ÜSTÜNE kurulur (§4) — tabansız yorum havada kalırdı.
  UPDATE public.user_music_intelligence
     SET sonic_affinities   = coalesce(p_sonic_affinities, '{}'),
         genre_core         = coalesce(p_genre_core, '{}'),
         genre_peripheral   = coalesce(p_genre_peripheral, '{}'),
         avoided_signatures = coalesce(p_avoided_signatures, '{}'),
         listening_habits   = p_listening_habits,
         -- Boş string NULL'a çevrilir: "model yazmadı" ile "boş yazdı" aynı olsun.
         musical_paradox    = nullif(btrim(left(p_musical_paradox, 600)), ''),
         ai_model_used      = p_model,
         ai_generated_at    = now(),
         updated_at         = now()
   WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_year_milestones(p_user_id uuid, p_year integer, p_career text[], p_love text[], p_social text[], p_vibe text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (p_user_id = auth.uid() or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;

  if not public.year_has_enough_data(p_user_id, p_year) then
    raise exception 'insufficient_data_for_year';
  end if;

  insert into public.journey_year_milestones
    (user_id, year, career, love, social, vibe)
  values (p_user_id, p_year, p_career, p_love, p_social, p_vibe)
  on conflict (user_id, year) do update
    set career = excluded.career,
        love   = excluded.love,
        social = excluded.social,
        vibe   = excluded.vibe,
        updated_at = now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.saved_library_page(p_user_id uuid, p_item_type text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(spotify_uri text, name text, imported_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_item_type not in ('album', 'artist') then
    raise exception 'gecersiz item_type: %', p_item_type;
  end if;

  return query
  with rows_ as (
    select l.spotify_uri, l.name, l.imported_at
    from public.user_saved_library l
    where l.user_id = p_user_id and l.item_type = p_item_type
  ),
  counted as (select count(*) as total from rows_)
  select r.spotify_uri, r.name, r.imported_at, c.total
  from rows_ r cross join counted c
  order by r.name asc nulls last
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_my_tracks(p_user_id uuid, p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(track_id uuid, track_title text, artist_name text, play_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q text := btrim(coalesce(p_query, ''));
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if length(q) < 2 then
    return;
  end if;

  return query
  select t.id,
         t.title,
         coalesce(t.artists[1], '') as artist_name,
         count(*)::bigint as play_count
  from public.play_events pe
  join public.tracks t on t.id = pe.track_id
  where pe.user_id = p_user_id
    and (
      t.title ilike '%' || q || '%'
      or exists (select 1 from unnest(t.artists) a where a ilike '%' || q || '%')
    )
  group by t.id, t.title, t.artists
  order by count(*) desc, t.title asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_mood_hidden_tracks(p_mood_key text, p_hidden uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user     uuid := (SELECT auth.uid());
  v_hidden   uuid[] := coalesce(p_hidden, '{}'::uuid[]);
  v_paket    uuid[];
  v_onceki   uuid[];
  v_onay     uuid[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT (e->>'track_id')::uuid
    FROM public.mood_pkg p, jsonb_array_elements(p.payload) e
    WHERE p.user_id = v_user AND p.mood_key = p_mood_key AND e->>'track_id' IS NOT NULL
  ) INTO v_paket;

  SELECT coalesce(approved_track_ids, '{}'::uuid[]) INTO v_onceki
  FROM public.mood_workspace
  WHERE user_id = v_user AND mood_key = p_mood_key;

  SELECT ARRAY(
    SELECT DISTINCT x FROM unnest(coalesce(v_onceki, '{}'::uuid[]) || coalesce(v_paket, '{}'::uuid[])) AS x
    WHERE NOT (x = ANY(v_hidden))
  ) INTO v_onay;

  INSERT INTO public.mood_workspace (user_id, mood_key, hidden_track_ids, approved_track_ids, updated_at)
  VALUES (v_user, p_mood_key, v_hidden, coalesce(v_onay, '{}'::uuid[]), now())
  ON CONFLICT (user_id, mood_key) DO UPDATE
    SET hidden_track_ids   = excluded.hidden_track_ids,
        approved_track_ids = excluded.approved_track_ids,
        updated_at         = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_mood_track_feedback(p_mood_key text, p_track_id uuid, p_etiket text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := (SELECT auth.uid());
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_etiket IS NULL THEN
    DELETE FROM public.mood_track_feedback
    WHERE user_id = v_user AND mood_key = p_mood_key AND track_id = p_track_id;
    RETURN;
  END IF;

  INSERT INTO public.mood_track_feedback (user_id, mood_key, track_id, etiket)
  VALUES (v_user, p_mood_key, p_track_id, p_etiket)
  ON CONFLICT (user_id, mood_key, track_id) DO UPDATE
    SET etiket = excluded.etiket, updated_at = now()
    WHERE public.mood_track_feedback.etiket IS DISTINCT FROM excluded.etiket;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_mood_weekly_sync(p_mood_key text, p_enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.mood_workspace (user_id, mood_key, weekly_sync_enabled, updated_at)
  VALUES ((SELECT auth.uid()), p_mood_key, p_enabled, now())
  ON CONFLICT (user_id, mood_key) DO UPDATE
    SET weekly_sync_enabled = excluded.weekly_sync_enabled,
        updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.shuffle_identity(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(measurable_events bigint, shuffle_pct numeric, style text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  min_sample constant int := 100;
begin
  if p_user_id IS DISTINCT FROM auth.uid() AND NOT public.demo_mi(p_user_id) AND auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with olcum as (
    select count(*) filter (where pe.shuffle is not null) as n,
           count(*) filter (where pe.shuffle is true) as n_shuffle
    from public.play_events pe
    where pe.user_id = p_user_id
      and (p_from is null or pe.played_at >= p_from)
      and (p_to   is null or pe.played_at <  p_to)
  )
  select
    o.n,
    case when o.n >= min_sample
         then round(100.0 * o.n_shuffle / o.n, 1)
         else null end,
    case
      when o.n < min_sample then null
      when (100.0 * o.n_shuffle / o.n) < 25 then 'sequential'
      when (100.0 * o.n_shuffle / o.n) > 70 then 'shuffle'
      else 'mixed'
    end
  from olcum o;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.shuffle_similarity(a uuid, b uuid)
 RETURNS real
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pct_a numeric;
  pct_b numeric;
begin
  select shuffle_pct into pct_a from public.shuffle_identity(a);
  select shuffle_pct into pct_b from public.shuffle_identity(b);

  if pct_a is null or pct_b is null then
    return null;
  end if;

  return (1.0 - abs(pct_a - pct_b) / 100.0)::real;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.soundcapsule_coverage(p_user_id uuid)
 RETURNS TABLE(week_start date, spotify_seconds bigint, our_seconds bigint, our_events bigint, coverage_pct numeric, verdict text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with capsule as (
    select (w->>'date')::date as wk,
           (w->>'secondsPlayed')::bigint as spotify_s
    from public.user_export_signals s,
         lateral jsonb_array_elements(s.signal_data->'stats') w
    where s.user_id = p_user_id
      and s.signal_source = 'sound_capsule'
      and (w->>'date') is not null
  ),
  ours as (
    select c.wk,
           c.spotify_s,
           coalesce(sum(pe.ms_played) / 1000, 0)::bigint as our_s,
           count(pe.id)::bigint as our_n
    from capsule c
    left join public.play_events pe
      on pe.user_id = p_user_id
     and pe.played_at >= c.wk::timestamptz
     and pe.played_at <  (c.wk + 7)::timestamptz
    group by c.wk, c.spotify_s
  )
  select
    o.wk,
    o.spotify_s,
    o.our_s,
    o.our_n,
    round(100.0 * o.our_s / nullif(o.spotify_s, 0), 1),
    case
      when o.spotify_s = 0 then 'no_reference'
      when o.our_s >= o.spotify_s * 0.90 then 'ok'
      when o.our_s > 0 then 'partial'
      else 'missing'
    end
  from ours o
  order by o.wk;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.soundcapsule_coverage_audit()
 RETURNS TABLE(user_id uuid, weeks_checked bigint, weeks_ok bigint, weeks_partial bigint, weeks_missing bigint, worst_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with capsule as (
    select s.user_id,
           (w->>'date')::date as wk,
           (w->>'secondsPlayed')::bigint as spotify_s
    from public.user_export_signals s,
         lateral jsonb_array_elements(s.signal_data->'stats') w
    where s.signal_source = 'sound_capsule'
      and (w->>'date') is not null
  ),
  ours as (
    select c.user_id,
           c.wk,
           c.spotify_s,
           coalesce(sum(pe.ms_played) / 1000, 0)::bigint as our_s
    from capsule c
    left join public.play_events pe
      on pe.user_id = c.user_id
     and pe.played_at >= c.wk::timestamptz
     and pe.played_at <  (c.wk + 7)::timestamptz
    group by c.user_id, c.wk, c.spotify_s
  )
  select
    o.user_id,
    count(*)::bigint,
    count(*) filter (where o.spotify_s > 0 and o.our_s >= o.spotify_s * 0.90)::bigint,
    count(*) filter (where o.spotify_s > 0 and o.our_s > 0
                       and o.our_s < o.spotify_s * 0.90)::bigint,
    count(*) filter (where o.spotify_s > 0 and o.our_s = 0)::bigint,
    min(round(100.0 * o.our_s / nullif(o.spotify_s, 0), 1))
  from ours o
  group by o.user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.spotify_byoc_credentials_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.strip_overlap(a uuid, b uuid, p_evergreen boolean)
 RETURNS real
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH ta AS (
    SELECT merge_key, final_weight FROM public.user_track_weights
    WHERE user_id = a AND is_evergreen = p_evergreen
  ),
  tb AS (
    SELECT merge_key, final_weight FROM public.user_track_weights
    WHERE user_id = b AND is_evergreen = p_evergreen
  ),
  pay AS (
    SELECT COALESCE(sum(ta.final_weight * tb.final_weight), 0) AS v
    FROM ta JOIN tb USING (merge_key)
  ),
  norm AS (
    SELECT
      sqrt(COALESCE((SELECT sum(final_weight * final_weight) FROM ta), 0)) AS na,
      sqrt(COALESCE((SELECT sum(final_weight * final_weight) FROM tb), 0)) AS nb
  )
  SELECT COALESCE(
    (SELECT v FROM pay) / NULLIF((SELECT na * nb FROM norm), 0),
    0
  )::real;
$function$
;

CREATE OR REPLACE FUNCTION public.toggle_ritual_answer(p_user_id uuid, p_question_key text, p_year integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_existed boolean;
begin
  if not (p_user_id = auth.uid() or auth.role() = 'service_role') then
    raise exception 'forbidden';
  end if;

  if p_question_key not in ('career_peak', 'lost_year', 'found_year', 'love_year', 'inward_year') then
    raise exception 'invalid_question_key';
  end if;

  select exists(
    select 1 from public.journey_ritual_answers
    where user_id = p_user_id and question_key = p_question_key and year = p_year
  ) into v_existed;

  if v_existed then
    delete from public.journey_ritual_answers
    where user_id = p_user_id and question_key = p_question_key and year = p_year;
    return false;
  end if;

  if not public.year_has_enough_data(p_user_id, p_year) then
    raise exception 'insufficient_data_for_year';
  end if;

  insert into public.journey_ritual_answers (user_id, question_key, year)
  values (p_user_id, p_question_key, p_year);
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.track_genre_plays_2025(p_user_id uuid)
 RETURNS TABLE(genres text[], play_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  select coalesce(t.genres, '{}'::text[]) as g,
         count(*)::bigint
  from public.play_events pe
  join public.tracks t on t.id = pe.track_id
  where pe.user_id = p_user_id
    and pe.played_at >= '2025-01-01'::timestamptz
    and pe.played_at <  '2026-01-01'::timestamptz
  group by coalesce(t.genres, '{}'::text[]);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_recap_partial(p_user_id uuid, p_period_type text, p_period_label text, p_period_start date, p_period_end date, p_payload jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  insert into public.recaps as r
    (user_id, period_type, period_label, period_start, period_end, payload)
  values
    (p_user_id, p_period_type, p_period_label, p_period_start, p_period_end,
     coalesce(p_payload, '{}'::jsonb))
  on conflict (user_id, period_type, period_label) do update
    set payload      = r.payload || coalesce(excluded.payload, '{}'::jsonb),
        period_start = coalesce(excluded.period_start, r.period_start),
        period_end   = coalesce(excluded.period_end,   r.period_end),
        updated_at   = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_era_shift(p_user_id uuid)
 RETURNS TABLE(year integer, top_artist text, top_genre text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH plays AS (
    SELECT
      extract(year FROM pe.played_at AT TIME ZONE 'Europe/Istanbul')::int AS yr,
      tr.artists[1] AS artist,
      tr.genres[1]  AS genre
    FROM public.play_events pe
    JOIN public.tracks tr ON tr.id = pe.track_id
    WHERE pe.user_id = p_user_id
      AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
      AND pe.incognito_mode = false
      AND array_length(tr.artists, 1) > 0
  ),
  year_top AS (
    SELECT yr, artist, count(*) AS cnt,
           row_number() OVER (PARTITION BY yr ORDER BY count(*) DESC, artist) AS rn
    FROM plays
    GROUP BY yr, artist
  ),
  artist_genre AS (
    SELECT artist, mode() WITHIN GROUP (ORDER BY genre) AS top_genre
    FROM plays
    WHERE genre IS NOT NULL
    GROUP BY artist
  )
  SELECT yt.yr AS year, yt.artist AS top_artist, ag.top_genre
  FROM year_top yt
  LEFT JOIN artist_genre ag ON ag.artist = yt.artist
  WHERE yt.rn = 1
  ORDER BY yt.yr ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.user_genre_all_counts(p_user_id uuid)
 RETURNS TABLE(genre text, play_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.genre, count(*) AS play_count
  FROM public.play_events pe
  JOIN public.tracks tr ON tr.id = pe.track_id
  CROSS JOIN LATERAL unnest(tr.genres) AS g(genre)
  WHERE pe.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND pe.incognito_mode = false
    AND tr.genres IS NOT NULL
  GROUP BY g.genre
  ORDER BY play_count DESC
  LIMIT 200;
$function$
;

CREATE OR REPLACE FUNCTION public.user_genre_primary_counts(p_user_id uuid, p_source text DEFAULT NULL::text)
 RETURNS TABLE(genre text, play_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tr.genres[1] AS genre, count(*) AS play_count
  FROM public.play_events pe
  JOIN public.tracks tr ON tr.id = pe.track_id
  WHERE pe.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND pe.incognito_mode = false
    AND tr.genres IS NOT NULL
    AND array_length(tr.genres, 1) > 0
    AND (p_source IS NULL OR pe.source = p_source)
  GROUP BY tr.genres[1]
  ORDER BY play_count DESC
  LIMIT 200;
$function$
;

CREATE OR REPLACE FUNCTION public.user_hourly_play_counts(p_user_id uuid)
 RETURNS TABLE(hour integer, play_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    extract(hour FROM pe.played_at AT TIME ZONE 'Europe/Istanbul')::int AS hour,
    count(*) AS play_count
  FROM public.play_events pe
  WHERE pe.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND pe.incognito_mode = false
  GROUP BY 1
  ORDER BY 1;
$function$
;

CREATE OR REPLACE FUNCTION public.user_liked_track_ids(p_user_id uuid)
 RETURNS TABLE(spotify_id text, liked_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select replace(s.spotify_uri, 'spotify:track:', '') as spotify_id,
         s.occurred_at as liked_at
  from (
    select distinct on (spotify_uri) spotify_uri, event_type, occurred_at
    from public.liked_songs_events
    where user_id = p_user_id
      and spotify_uri is not null
    order by spotify_uri, occurred_at desc
  ) s
  where s.event_type = 'liked';
$function$
;

CREATE OR REPLACE FUNCTION public.user_listening_stats(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now())
 RETURNS TABLE(play_count bigint, total_ms bigint, distinct_tracks bigint, after_midnight bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    count(*) AS play_count,
    COALESCE(sum(pe.ms_played), 0)::bigint AS total_ms,
    count(DISTINCT pe.track_id) AS distinct_tracks,
    count(*) FILTER (
      WHERE extract(hour FROM pe.played_at AT TIME ZONE 'Europe/Istanbul') < 5
    ) AS after_midnight
  FROM public.play_events pe
  WHERE pe.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND pe.incognito_mode = false
    AND pe.played_at <= p_to
    AND (p_from IS NULL OR pe.played_at >= p_from);
$function$
;

CREATE OR REPLACE FUNCTION public.user_most_skipped(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now(), p_limit integer DEFAULT 5)
 RETURNS TABLE(track_id uuid, title text, artist_name text, skip_count bigint, total_ms bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pe.track_id, tr.title, tr.artists[1] AS artist_name,
         count(*) AS skip_count,
         COALESCE(sum(pe.ms_played), 0)::bigint AS total_ms
  FROM play_events pe
  JOIN tracks tr ON tr.id = pe.track_id
  WHERE pe.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND pe.incognito_mode = false
    AND pe.skipped = true
    AND pe.played_at <= p_to
    AND (p_from IS NULL OR pe.played_at >= p_from)
  GROUP BY pe.track_id, tr.title, tr.artists[1]
  ORDER BY skip_count DESC
  LIMIT LEAST(p_limit, 50);
$function$
;

CREATE OR REPLACE FUNCTION public.user_music_intelligence_needs_ai(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    NOT EXISTS (SELECT 1 FROM public.user_music_intelligence WHERE user_id = p_user_id AND ai_generated_at IS NOT NULL)
    OR coalesce((SELECT ai_generated_at FROM public.user_music_intelligence WHERE user_id = p_user_id), '-infinity'::timestamptz)
       < now() - interval '30 days';
$function$
;

CREATE OR REPLACE FUNCTION public.user_phase(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(phase smallint, is_override boolean, natural_phase smallint, has_spotify boolean, has_history boolean, has_account_data boolean, has_technical_log boolean, processing boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user  uuid := COALESCE(p_user, auth.uid());
  v_sp    boolean;
  v_hist  boolean;
  v_acc   boolean;
  v_tech  boolean;
  v_proc  boolean;
  v_nat   smallint;
  v_ovr   smallint;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  IF auth.role() <> 'service_role' AND v_user <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM platform_connections pc
    WHERE pc.user_id = v_user AND pc.platform = 'spotify' AND pc.is_active
  ) INTO v_sp;

  SELECT EXISTS (
    SELECT 1 FROM play_events pe
    WHERE pe.user_id = v_user AND pe.source = 'spotify_export'
  ) INTO v_hist;

  SELECT EXISTS (
           SELECT 1 FROM user_export_signals s
           WHERE s.user_id = v_user
             AND s.signal_source IN ('inferences', 'wrapped_2025', 'sound_capsule')
         )
      OR EXISTS (SELECT 1 FROM user_saved_library l WHERE l.user_id = v_user)
    INTO v_acc;

  SELECT EXISTS (
           SELECT 1 FROM user_export_signals s
           WHERE s.user_id = v_user
             AND s.signal_source IN ('daylist_aggregate', 'on_repeat', 'shuffle_behavior',
                                     'home_section_categories', 'playlist_created')
         )
      OR EXISTS (SELECT 1 FROM car_sessions c WHERE c.user_id = v_user)
    INTO v_tech;

  SELECT EXISTS (
    SELECT 1 FROM export_jobs ej
    WHERE ej.user_id = v_user AND ej.status IN ('queued', 'processing')
  ) INTO v_proc;

  v_nat := CASE
             WHEN v_acc AND v_tech THEN 4
             WHEN v_hist           THEN 3
             WHEN v_sp             THEN 2
             ELSE 1
           END;

  SELECT o.forced_phase INTO v_ovr
  FROM user_phase_overrides o
  WHERE o.user_id = v_user
    AND (o.expires_at IS NULL OR o.expires_at > now());

  RETURN QUERY SELECT
    COALESCE(v_ovr, v_nat)::smallint,
    (v_ovr IS NOT NULL),
    v_nat,
    v_sp, v_hist, v_acc, v_tech, v_proc;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_streaks(p_user_id uuid)
 RETURNS TABLE(longest_days integer, current_days integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH days AS (
    SELECT DISTINCT (pe.played_at AT TIME ZONE 'Europe/Istanbul')::date AS d
    FROM public.play_events pe
    WHERE pe.user_id = p_user_id
      AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
      AND pe.incognito_mode = false
  ),
  grp AS (
    SELECT d, d - (row_number() OVER (ORDER BY d))::int AS g
    FROM days
  ),
  runs AS (
    SELECT g, count(*)::int AS len, max(d) AS run_end
    FROM grp
    GROUP BY g
  )
  SELECT
    COALESCE((SELECT max(len) FROM runs), 0) AS longest_days,
    COALESCE((
      SELECT len FROM runs
      WHERE run_end >= ((now() AT TIME ZONE 'Europe/Istanbul')::date - 1)
      ORDER BY run_end DESC
      LIMIT 1
    ), 0) AS current_days;
$function$
;

CREATE OR REPLACE FUNCTION public.user_weekday_pattern(p_user_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now())
 RETURNS TABLE(weekday integer, play_count bigint, total_ms bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    extract(dow FROM pe.played_at AT TIME ZONE 'Europe/Istanbul')::int AS weekday,
    count(*) AS play_count,
    COALESCE(sum(pe.ms_played), 0)::bigint AS total_ms
  FROM public.play_events pe
  WHERE pe.user_id = p_user_id
    AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
    AND pe.incognito_mode = false
    AND pe.skipped <> true
    AND pe.ms_played >= 5000
    AND pe.played_at <= p_to
    AND (p_from IS NULL OR pe.played_at >= p_from)
  GROUP BY 1
  ORDER BY 1;
$function$
;

CREATE OR REPLACE FUNCTION public.wrapped_engine_inputs(p_user_id uuid)
 RETURNS TABLE(avg_track_popularity numeric, percent_explicit numeric, multilinguist_score numeric, chaos_score numeric, percent_top_artist numeric, source_year integer, is_stale boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is distinct from auth.uid() and auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with kaynak as (
    select s.signal_data as d,
           nullif(regexp_replace(s.signal_source, '\D', '', 'g'), '')::int as yil
    from public.user_export_signals s
    where s.user_id = p_user_id
      and s.signal_source like 'wrapped_%'
    order by s.signal_source desc
    limit 1
  )
  select
    (k.d->'party'->>'avgTrackPopularityScore')::numeric,
    (k.d->'party'->>'percentListenedExplicit')::numeric,
    (k.d->'party'->>'multilinguistRankingScore')::numeric,
    (k.d->'party'->>'absoluteChaosRankingScore')::numeric,
    (k.d->'party'->>'percentListenedTopArtist')::numeric,
    k.yil,
    (k.yil is null or k.yil < date_part('year', current_date)::int - 1)
  from kaynak k;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.wrapped_taste_similarity(a uuid, b uuid)
 RETURNS real
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pop_a numeric; pop_b numeric;
  exp_a numeric; exp_b numeric;
  stale_a boolean; stale_b boolean;
begin
  select avg_track_popularity, percent_explicit, is_stale
  into pop_a, exp_a, stale_a from public.wrapped_engine_inputs(a);

  select avg_track_popularity, percent_explicit, is_stale
  into pop_b, exp_b, stale_b from public.wrapped_engine_inputs(b);

  if pop_a is null or pop_b is null or coalesce(stale_a, true) or coalesce(stale_b, true) then
    return null;
  end if;

  return (
    ( (1.0 - abs(pop_a - pop_b))
    + (1.0 - abs(exp_a - exp_b) / 100.0)
    ) / 2.0
  )::real;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.year_has_enough_data(p_user_id uuid, p_year integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select count(*) >= 500
        and count(distinct date_trunc('month', pe.played_at)) >= 3
     from public.play_events pe
     where pe.user_id = p_user_id
       and pe.played_at >= make_date(p_year, 1, 1)
       and pe.played_at <  make_date(p_year + 1, 1, 1)),
    false);
$function$
;

CREATE OR REPLACE FUNCTION public.yearly_top_tracks(p_user_id uuid, p_year integer)
 RETURNS TABLE(track_id uuid, title text, artist_name text, album text, image_url text, play_count bigint, spotify_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH yil_calmalari AS (
    SELECT pe.track_id, count(*)::bigint AS calma
    FROM play_events pe
    WHERE pe.user_id = p_user_id AND pe.incognito_mode = false
      AND pe.skipped IS DISTINCT FROM true AND pe.ms_played >= 30000
      AND pe.played_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'Europe/Istanbul')
      AND pe.played_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'Europe/Istanbul')
    GROUP BY pe.track_id
  ),
  puanli AS (
    SELECT t.id, t.title, t.artists[1] AS sanatci, t.album, t.image_url, t.spotify_id, yc.calma,
      row_number() OVER (PARTITION BY t.artists[1] ORDER BY yc.calma DESC) AS artist_rn
    FROM yil_calmalari yc JOIN tracks t ON t.id = yc.track_id
    WHERE array_length(t.artists, 1) > 0
  )
  SELECT p.id, p.title, p.sanatci, p.album, p.image_url, p.calma, p.spotify_id
  FROM puanli p
  WHERE p.artist_rn <= 3
  ORDER BY p.calma DESC
  LIMIT 100
$function$
;

CREATE OR REPLACE FUNCTION public.zodiac_sign(p_birth date)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_birth IS NULL THEN NULL
    ELSE (
      WITH md AS (SELECT extract(month FROM p_birth)::int AS m, extract(day FROM p_birth)::int AS d)
      SELECT CASE
        WHEN (m=3 AND d>=21) OR (m=4 AND d<=19) THEN 'aries'
        WHEN (m=4 AND d>=20) OR (m=5 AND d<=20) THEN 'taurus'
        WHEN (m=5 AND d>=21) OR (m=6 AND d<=20) THEN 'gemini'
        WHEN (m=6 AND d>=21) OR (m=7 AND d<=22) THEN 'cancer'
        WHEN (m=7 AND d>=23) OR (m=8 AND d<=22) THEN 'leo'
        WHEN (m=8 AND d>=23) OR (m=9 AND d<=22) THEN 'virgo'
        WHEN (m=9 AND d>=23) OR (m=10 AND d<=22) THEN 'libra'
        WHEN (m=10 AND d>=23) OR (m=11 AND d<=21) THEN 'scorpio'
        WHEN (m=11 AND d>=22) OR (m=12 AND d<=21) THEN 'sagittarius'
        WHEN (m=12 AND d>=22) OR (m=1 AND d<=19) THEN 'capricorn'
        WHEN (m=1 AND d>=20) OR (m=2 AND d<=18) THEN 'aquarius'
        ELSE 'pisces'
      END FROM md
    )
  END;
$function$
;

-- ─── Görünümler ───

CREATE MATERIALIZED VIEW public.artist_idf AS  WITH toplam AS (
         SELECT count(DISTINCT user_track_weights.user_id)::numeric AS u
           FROM user_track_weights
        ), yayginlik AS (
         SELECT user_track_weights.artist,
            count(DISTINCT user_track_weights.user_id)::numeric AS dinleyen
           FROM user_track_weights
          WHERE user_track_weights.artist IS NOT NULL AND user_track_weights.artist <> ''::text
          GROUP BY user_track_weights.artist
        )
 SELECT y.artist,
    y.dinleyen::integer AS listener_count,
    ln(1.0 + t.u / (1.0 + y.dinleyen))::real AS idf
   FROM yayginlik y
     CROSS JOIN toplam t WITH NO DATA;

-- ─── İndeksler ───

CREATE INDEX account_deletions_deleted_at_idx ON public.account_deletions USING btree (deleted_at);

CREATE UNIQUE INDEX artist_idf_artist_idx ON public.artist_idf USING btree (artist);

CREATE INDEX artist_idf_idf_idx ON public.artist_idf USING btree (idf DESC);

CREATE INDEX artist_idf_listener_count_idx ON public.artist_idf USING btree (listener_count);

CREATE UNIQUE INDEX auto_playlist_rules_user_rule_type_key ON public.auto_playlist_rules USING btree (user_id, rule_type);

CREATE INDEX cron_kullanici_sirasi_vade_idx ON public.cron_kullanici_sirasi USING btree (is_adi, son_tamamlanma NULLS FIRST);

CREATE INDEX idx_ai_generation_logs_user ON public.ai_generation_logs USING btree (user_id, feature, created_at DESC);

CREATE INDEX idx_ai_generation_logs_zaman ON public.ai_generation_logs USING btree (created_at DESC, feature, status);

CREATE INDEX idx_artists_name ON public.artists USING btree (name);

CREATE INDEX idx_artists_refreshed_at ON public.artists USING btree (refreshed_at) WHERE (refreshed_at IS NOT NULL);

CREATE INDEX idx_auto_playlist_runs_rule_id ON public.auto_playlist_runs USING btree (rule_id);

CREATE UNIQUE INDEX idx_car_sessions_dedup ON public.car_sessions USING btree (user_id, connected_at);

CREATE INDEX idx_car_sessions_import_job_id ON public.car_sessions USING btree (import_job_id);

CREATE INDEX idx_car_sessions_user_time ON public.car_sessions USING btree (user_id, connected_at DESC);

CREATE INDEX idx_catalog_enrichment_lookup ON public.catalog_ai_enrichment USING btree (item_id, item_type);

CREATE INDEX idx_cron_kullanici_sirasi_user_id ON public.cron_kullanici_sirasi USING btree (user_id);

CREATE INDEX idx_export_jobs_user ON public.export_jobs USING btree (user_id, created_at DESC);

CREATE INDEX idx_journey_year_pkg_stale ON public.journey_year_pkg USING btree (generated_at) WHERE (is_closed = false);

CREATE UNIQUE INDEX idx_liked_songs_dedup ON public.liked_songs_events USING btree (user_id, spotify_uri, occurred_at, event_type);

CREATE INDEX idx_liked_songs_events_import_job_id ON public.liked_songs_events USING btree (import_job_id);

CREATE INDEX idx_liked_songs_user_time ON public.liked_songs_events USING btree (user_id, occurred_at DESC);

CREATE INDEX idx_migration_jobs_playlist_id ON public.migration_jobs USING btree (playlist_id);

CREATE INDEX idx_migration_queue_items_track_id ON public.migration_queue_items USING btree (track_id);

CREATE INDEX idx_migration_queue_playlist_id ON public.migration_queue USING btree (playlist_id);

CREATE INDEX idx_mood_pkg_stale ON public.mood_pkg USING btree (generated_at);

CREATE INDEX idx_mood_track_feedback_track_id ON public.mood_track_feedback USING btree (track_id);

CREATE INDEX idx_pipeline_runs_created ON public.pipeline_runs USING btree (created_at DESC);

CREATE INDEX idx_pipeline_runs_job ON public.pipeline_runs USING btree (job_id) WHERE (job_id IS NOT NULL);

CREATE INDEX idx_pipeline_runs_type_time ON public.pipeline_runs USING btree (run_type, created_at DESC);

CREATE INDEX idx_play_events_api_realtime ON public.play_events USING btree (user_id, played_at DESC) INCLUDE (track_id, ms_played, incognito_mode) WHERE (source = 'api_realtime'::text);

CREATE INDEX idx_play_events_track_time ON public.play_events USING btree (track_id, played_at DESC);

CREATE INDEX idx_play_events_user_chronological ON public.play_events USING btree (user_id, played_at);

CREATE INDEX idx_play_events_user_time ON public.play_events USING btree (user_id, played_at DESC);

CREATE UNIQUE INDEX idx_playlist_track_events_dedup ON public.playlist_track_events USING btree (user_id, track_uri, playlist_uri, added_at);

CREATE INDEX idx_playlist_track_events_import_job_id ON public.playlist_track_events USING btree (import_job_id);

CREATE INDEX idx_playlist_track_events_user ON public.playlist_track_events USING btree (user_id, added_at DESC);

CREATE INDEX idx_playlist_tracks_track_id ON public.playlist_tracks USING btree (track_id);

CREATE INDEX idx_podcast_events_user_time ON public.podcast_events USING btree (user_id, played_at DESC);

CREATE INDEX idx_recaps_user_period ON public.recaps USING btree (user_id, period_type, period_start DESC);

CREATE INDEX idx_spotify_allowlist_status ON public.spotify_allowlist_requests USING btree (status, requested_at DESC);

CREATE INDEX idx_sync_rules_playlist_id ON public.sync_rules USING btree (playlist_id);

CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at DESC);

CREATE INDEX idx_system_logs_severity_error ON public.system_logs USING btree (severity, created_at DESC) WHERE (severity = ANY (ARRAY['error'::text, 'critical'::text]));

CREATE INDEX idx_system_logs_user_id ON public.system_logs USING btree (user_id);

CREATE INDEX idx_track_spotify_alias_track_id ON public.track_spotify_alias USING btree (track_id);

CREATE INDEX idx_tracks_artist_ids_pending ON public.tracks USING btree (created_at, id) WHERE ((spotify_artist_ids IS NULL) AND (spotify_id IS NOT NULL));

CREATE INDEX idx_tracks_artists_gin ON public.tracks USING gin (artists);

CREATE INDEX idx_tracks_first_artist ON public.tracks USING btree ((artists[1]));

CREATE INDEX idx_tracks_genre_pending ON public.tracks USING btree (created_at, id) WHERE ((genres IS NULL) AND (spotify_artist_ids IS NOT NULL));

CREATE INDEX idx_tracks_isrc ON public.tracks USING btree (isrc) WHERE (isrc IS NOT NULL);

CREATE INDEX idx_tracks_lower_title ON public.tracks USING btree (lower(title));

CREATE INDEX idx_tracks_spotify_id ON public.tracks USING btree (spotify_id) WHERE (spotify_id IS NOT NULL);

CREATE INDEX idx_tracks_title_trgm ON public.tracks USING gin (title gin_trgm_ops);

CREATE INDEX idx_user_export_signals_export_job_id ON public.user_export_signals USING btree (export_job_id);

CREATE INDEX idx_user_export_signals_user ON public.user_export_signals USING btree (user_id, signal_source);

CREATE INDEX idx_user_pattern_pkg_stale ON public.user_pattern_pkg USING btree (generated_at);

CREATE INDEX idx_user_period_pkg_stale ON public.user_period_pkg USING btree (generated_at);

CREATE INDEX idx_user_stats_pkg_stale ON public.user_stats_pkg USING btree (generated_at);

CREATE INDEX idx_user_taste_pkg_stale ON public.user_taste_pkg USING btree (generated_at);

CREATE INDEX idx_user_top_strips_track_id ON public.user_top_strips USING btree (track_id);

CREATE INDEX idx_user_track_weights_representative_track_id ON public.user_track_weights USING btree (representative_track_id);

CREATE UNIQUE INDEX izinli_eposta_tek_sahip ON public.izinli_eposta USING btree ((true)) WHERE sahip;

CREATE INDEX migration_jobs_status_idx ON public.migration_jobs USING btree (status);

CREATE INDEX migration_jobs_user_id_idx ON public.migration_jobs USING btree (user_id);

CREATE UNIQUE INDEX migration_queue_no_dupe_idx ON public.migration_queue USING btree (user_id, playlist_id, target) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text, 'paused'::text]));

CREATE INDEX migration_queue_pending_idx ON public.migration_queue USING btree (status, "position", created_at) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]));

CREATE INDEX migration_queue_user_idx ON public.migration_queue USING btree (user_id, status);

CREATE INDEX mood_kural_mood_idx ON public.mood_kural USING btree (mood_key);

CREATE INDEX mood_track_feedback_mood_track_idx ON public.mood_track_feedback USING btree (mood_key, track_id);

CREATE INDEX mqi_pending_idx ON public.migration_queue_items USING btree (queue_id, status) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX play_events_dedup_idx ON public.play_events USING btree (user_id, played_at, track_id);

CREATE INDEX sync_rules_enabled_idx ON public.sync_rules USING btree (enabled) WHERE (enabled = true);

CREATE INDEX sync_rules_user_id_idx ON public.sync_rules USING btree (user_id);

CREATE INDEX sync_runs_ran_at_idx ON public.sync_runs USING btree (ran_at DESC);

CREATE INDEX sync_runs_rule_id_idx ON public.sync_runs USING btree (rule_id);

CREATE INDEX tracks_catalog_backfill_queue_idx ON public.tracks USING btree (created_at) WHERE ((catalog_backfill_at IS NULL) AND (spotify_id IS NOT NULL) AND ((isrc IS NULL) OR (duration_ms IS NULL)));

CREATE INDEX tracks_genre_pending_idx ON public.tracks USING btree (created_at) WHERE ((genres IS NULL) AND (genre_lookup_failed_at IS NULL));

CREATE INDEX tracks_genre_pending_reason_idx ON public.tracks USING btree (genre_pending_reason) WHERE (genre_pending_reason IS NOT NULL);

CREATE INDEX tracks_yt_video_id_idx ON public.tracks USING btree (yt_video_id) WHERE (yt_video_id IS NOT NULL);

CREATE INDEX user_saved_library_user_type_idx ON public.user_saved_library USING btree (user_id, item_type);

CREATE INDEX user_top_strips_user_strip_idx ON public.user_top_strips USING btree (user_id, strip, rank);

CREATE INDEX user_track_weights_evergreen_idx ON public.user_track_weights USING btree (user_id, final_weight DESC) WHERE (is_evergreen = true);

CREATE INDEX user_track_weights_now_idx ON public.user_track_weights USING btree (user_id, decayed_weight DESC);

CREATE INDEX user_track_weights_user_idx ON public.user_track_weights USING btree (user_id);

-- ─── Yabancı anahtarlar ───

ALTER TABLE ONLY public.account_deletions ADD CONSTRAINT account_deletions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_generation_logs ADD CONSTRAINT ai_generation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.auto_playlist_rules ADD CONSTRAINT auto_playlist_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.auto_playlist_runs ADD CONSTRAINT auto_playlist_runs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES auto_playlist_rules(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.car_sessions ADD CONSTRAINT car_sessions_import_job_id_fkey FOREIGN KEY (import_job_id) REFERENCES export_jobs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.car_sessions ADD CONSTRAINT car_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cron_kullanici_sirasi ADD CONSTRAINT cron_kullanici_sirasi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.demo_personalar ADD CONSTRAINT demo_personalar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.editorial_notes ADD CONSTRAINT editorial_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.export_jobs ADD CONSTRAINT export_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.izinli_eposta ADD CONSTRAINT izinli_eposta_ekleyen_fkey FOREIGN KEY (ekleyen) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.journey_arc ADD CONSTRAINT journey_arc_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.journey_ritual_answers ADD CONSTRAINT journey_ritual_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.journey_year_milestones ADD CONSTRAINT journey_year_milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.journey_year_pkg ADD CONSTRAINT journey_year_pkg_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.kullanici_animasyonlari ADD CONSTRAINT kullanici_animasyonlari_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.liked_songs_events ADD CONSTRAINT liked_songs_events_import_job_id_fkey FOREIGN KEY (import_job_id) REFERENCES export_jobs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.liked_songs_events ADD CONSTRAINT liked_songs_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.migration_jobs ADD CONSTRAINT migration_jobs_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.migration_jobs ADD CONSTRAINT migration_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.migration_queue_items ADD CONSTRAINT migration_queue_items_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES migration_queue(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.migration_queue_items ADD CONSTRAINT migration_queue_items_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.migration_queue ADD CONSTRAINT migration_queue_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.migration_queue ADD CONSTRAINT migration_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.mood_pkg ADD CONSTRAINT mood_pkg_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.mood_track_feedback ADD CONSTRAINT mood_track_feedback_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.mood_track_feedback ADD CONSTRAINT mood_track_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.mood_workspace ADD CONSTRAINT mood_workspace_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pipeline_runs ADD CONSTRAINT pipeline_runs_job_id_fkey FOREIGN KEY (job_id) REFERENCES export_jobs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.platform_connections ADD CONSTRAINT platform_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.play_events ADD CONSTRAINT play_events_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id);

ALTER TABLE ONLY public.play_events ADD CONSTRAINT play_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.playlist_track_events ADD CONSTRAINT playlist_track_events_import_job_id_fkey FOREIGN KEY (import_job_id) REFERENCES export_jobs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.playlist_track_events ADD CONSTRAINT playlist_track_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.playlist_tracks ADD CONSTRAINT playlist_tracks_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.playlist_tracks ADD CONSTRAINT playlist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.playlists ADD CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.podcast_events ADD CONSTRAINT podcast_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.recaps ADD CONSTRAINT recaps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.spotify_allowlist_requests ADD CONSTRAINT spotify_allowlist_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.spotify_byoc_credentials ADD CONSTRAINT spotify_byoc_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sync_rules ADD CONSTRAINT sync_rules_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sync_rules ADD CONSTRAINT sync_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sync_runs ADD CONSTRAINT sync_runs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES sync_rules(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.system_logs ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.track_spotify_alias ADD CONSTRAINT track_spotify_alias_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_consents ADD CONSTRAINT user_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_export_signals ADD CONSTRAINT user_export_signals_export_job_id_fkey FOREIGN KEY (export_job_id) REFERENCES export_jobs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_export_signals ADD CONSTRAINT user_export_signals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_genre_vectors ADD CONSTRAINT user_genre_vectors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_listening_summary_cache ADD CONSTRAINT user_listening_summary_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_music_intelligence ADD CONSTRAINT user_music_intelligence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_pattern_pkg ADD CONSTRAINT user_pattern_pkg_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_period_pkg ADD CONSTRAINT user_period_pkg_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_phase_announcements ADD CONSTRAINT user_phase_announcements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_phase_overrides ADD CONSTRAINT user_phase_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_plans ADD CONSTRAINT user_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_saved_library ADD CONSTRAINT user_saved_library_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_stats_pkg ADD CONSTRAINT user_stats_pkg_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_taste_pkg ADD CONSTRAINT user_taste_pkg_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_taste_profile ADD CONSTRAINT user_taste_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_top_strips ADD CONSTRAINT user_top_strips_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_top_strips ADD CONSTRAINT user_top_strips_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_track_weights ADD CONSTRAINT user_track_weights_representative_track_id_fkey FOREIGN KEY (representative_track_id) REFERENCES tracks(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_track_weights ADD CONSTRAINT user_track_weights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.year_pkg ADD CONSTRAINT year_pkg_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── Tetikleyiciler ───

CREATE TRIGGER artists_kapak_kaynagi BEFORE INSERT OR UPDATE OF image_url, deezer_image_url ON public.artists FOR EACH ROW EXECUTE FUNCTION kapak_kaynagi_kurali();

CREATE TRIGGER artists_updated_at BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER export_jobs_updated_at BEFORE UPDATE ON public.export_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER mood_track_feedback_yansit AFTER INSERT OR DELETE OR UPDATE ON public.mood_track_feedback FOR EACH ROW EXECUTE FUNCTION mood_geri_bildirim_yansit();

CREATE TRIGGER playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tracks_kapak_kaynagi BEFORE INSERT OR UPDATE OF image_url, deezer_image_url ON public.tracks FOR EACH ROW EXECUTE FUNCTION kapak_kaynagi_kurali();

CREATE TRIGGER tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_spotify_byoc_credentials_updated_at BEFORE UPDATE ON public.spotify_byoc_credentials FOR EACH ROW EXECUTE FUNCTION spotify_byoc_credentials_updated_at();

CREATE TRIGGER user_genre_vectors_updated_at BEFORE UPDATE ON public.user_genre_vectors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_taste_profile_updated_at BEFORE UPDATE ON public.user_taste_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Satır düzeyi güvenlik ───

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_usage_counter ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.algo_params ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.api_budgets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.api_cooldowns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auto_playlist_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auto_playlist_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.car_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.catalog_ai_enrichment ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cron_kullanici_sirasi ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.demo_personalar ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.editorial_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.editorial_tag_pool ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.izinli_eposta ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.journey_arc ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.journey_ritual_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.journey_year_milestones ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.journey_year_pkg ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.kullanici_animasyonlari ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.liked_songs_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.maintenance_watermark ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.migration_queue ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.migration_queue_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mood_definitions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mood_kural ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mood_pkg ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mood_tag_sozlugu ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mood_track_feedback ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mood_workspace ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.playlist_track_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.podcast_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recaps ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.spotify_allowlist_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.spotify_byoc_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sync_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.track_spotify_alias ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_export_signals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_genre_vectors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_listening_summary_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_music_intelligence ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_pattern_pkg ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_period_pkg ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_phase_announcements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_phase_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_saved_library ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_stats_pkg ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_taste_pkg ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_taste_profile ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_top_strips ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_track_weights ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.year_pkg ENABLE ROW LEVEL SECURITY;

-- ─── Politikalar ───

CREATE POLICY "Artists herkese acik" ON public.artists AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Kullanici kendi baglantilarini ekleyebilir" ON public.platform_connections AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi baglantilarini gorebilir" ON public.platform_connections AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi baglantilarini guncelleyebilir" ON public.platform_connections AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi baglantilarini silebilir" ON public.platform_connections AS PERMISSIVE FOR DELETE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi car_sessions gorebilir" ON public.car_sessions AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi eventlerini gorebilir" ON public.play_events AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi export_signals gorebilir" ON public.user_export_signals AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi joblarini ekleyebilir" ON public.export_jobs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi joblarini gorebilir" ON public.export_jobs AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi joblarini silebilir" ON public.export_jobs AS PERMISSIVE FOR DELETE TO public
  USING (((( SELECT auth.uid() AS uid) = user_id) AND (status = ANY (ARRAY['completed'::text, 'failed'::text]))));

CREATE POLICY "Kullanici kendi liked_songs_events gorebilir" ON public.liked_songs_events AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi mood calisma alanini ekleyebilir" ON public.mood_workspace AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi mood calisma alanini gorebilir" ON public.mood_workspace AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi mood calisma alanini guncelleyebilir" ON public.mood_workspace AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi mood calisma alanini silebilir" ON public.mood_workspace AS PERMISSIVE FOR DELETE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi playlist tracklerini ekleyebilir" ON public.playlist_tracks AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM playlists
  WHERE ((playlists.id = playlist_tracks.playlist_id) AND (playlists.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Kullanici kendi playlist tracklerini gorebilir" ON public.playlist_tracks AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM playlists
  WHERE ((playlists.id = playlist_tracks.playlist_id) AND (playlists.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Kullanici kendi playlist tracklerini silebilir" ON public.playlist_tracks AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM playlists
  WHERE ((playlists.id = playlist_tracks.playlist_id) AND (playlists.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Kullanici kendi playlist_track_events gorebilir" ON public.playlist_track_events AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi playlistlerini ekleyebilir" ON public.playlists AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi playlistlerini gorebilir" ON public.playlists AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi playlistlerini guncelleyebilir" ON public.playlists AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi playlistlerini silebilir" ON public.playlists AS PERMISSIVE FOR DELETE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Kullanici kendi podcast_events gorebilir" ON public.podcast_events AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Service role artists guncelleyebilir" ON public.artists AS PERMISSIVE FOR UPDATE TO service_role
  USING (true);

CREATE POLICY "Service role artists yazabilir" ON public.artists AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role car_sessions yazabilir" ON public.car_sessions AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role liked_songs_events yazabilir" ON public.liked_songs_events AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role play_events yazabilir" ON public.play_events AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role playlist_track_events yazabilir" ON public.playlist_track_events AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role podcast_events yazabilir" ON public.podcast_events AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role system_logs yazabilir" ON public.system_logs AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role tracks guncelleyebilir" ON public.tracks AS PERMISSIVE FOR UPDATE TO service_role
  USING (true);

CREATE POLICY "Service role tracks yazabilir" ON public.tracks AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Tracks herkese acik" ON public.tracks AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users delete own sync rules" ON public.sync_rules AS PERMISSIVE FOR DELETE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users insert own migration jobs" ON public.migration_jobs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users insert own sync rules" ON public.sync_rules AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users see own migration jobs" ON public.migration_jobs AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users see own sync rules" ON public.sync_rules AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users see own sync runs" ON public.sync_runs AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM sync_rules sr
  WHERE ((sr.id = sync_runs.rule_id) AND (sr.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users update own migration jobs" ON public.migration_jobs AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users update own sync rules" ON public.sync_rules AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY auto_playlist_rules_owner ON public.auto_playlist_rules AS PERMISSIVE FOR ALL TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY auto_playlist_runs_owner ON public.auto_playlist_runs AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM auto_playlist_rules r
  WHERE ((r.id = auto_playlist_runs.rule_id) AND (r.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY car_sessions_demo_oku ON public.car_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY editorial_notes_sahibi_okur ON public.editorial_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY editorial_tag_pool_okuma ON public.editorial_tag_pool AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY journey_arc_demo_oku ON public.journey_arc AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY journey_year_milestones_demo_oku ON public.journey_year_milestones AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY journey_year_pkg_demo_oku ON public.journey_year_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY journey_year_pkg_own_read ON public.journey_year_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY kullanici_animasyonlari_ekle ON public.kullanici_animasyonlari AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY kullanici_animasyonlari_oku ON public.kullanici_animasyonlari AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY liked_songs_events_demo_oku ON public.liked_songs_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY mood_kural_okuma ON public.mood_kural AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY mood_pkg_demo_oku ON public.mood_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY mood_pkg_own_read ON public.mood_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY mood_track_feedback_ekleme ON public.mood_track_feedback AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mood_track_feedback_guncelleme ON public.mood_track_feedback AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mood_track_feedback_okuma ON public.mood_track_feedback AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mood_track_feedback_silme ON public.mood_track_feedback AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mq_delete_own ON public.migration_queue AS PERMISSIVE FOR DELETE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mq_insert_own ON public.migration_queue AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mq_select_own ON public.migration_queue AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mq_update_own ON public.migration_queue AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY mqi_select_own ON public.migration_queue_items AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM migration_queue q
  WHERE ((q.id = migration_queue_items.queue_id) AND (q.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "own allowlist request readable" ON public.spotify_allowlist_requests AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "own arc readable" ON public.journey_arc AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "own ritual answers readable" ON public.journey_ritual_answers AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "own year milestones readable" ON public.journey_year_milestones AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY play_events_demo_oku ON public.play_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY playlist_track_events_demo_oku ON public.playlist_track_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY recaps_demo_oku ON public.recaps AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY recaps_select_own ON public.recaps AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY spotify_byoc_credentials_delete_own ON public.spotify_byoc_credentials AS PERMISSIVE FOR DELETE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY spotify_byoc_credentials_insert_own ON public.spotify_byoc_credentials AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY spotify_byoc_credentials_select_own ON public.spotify_byoc_credentials AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY spotify_byoc_credentials_update_own ON public.spotify_byoc_credentials AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY uc_own ON public.user_consents AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY upa_insert_own ON public.user_phase_announcements AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY upa_select_own ON public.user_phase_announcements AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY upa_update_own ON public.user_phase_announcements AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY user_export_signals_demo_oku ON public.user_export_signals AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_genre_vectors_demo_oku ON public.user_genre_vectors AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_genre_vectors_owner ON public.user_genre_vectors AS PERMISSIVE FOR ALL TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_music_intelligence_self_read ON public.user_music_intelligence AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_pattern_pkg_demo_oku ON public.user_pattern_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_pattern_pkg_own_read ON public.user_pattern_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_period_pkg_demo_oku ON public.user_period_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_period_pkg_own_read ON public.user_period_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_phase_overrides_select_own ON public.user_phase_overrides AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY user_plans_select_own ON public.user_plans AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY user_preferences_owner ON public.user_preferences AS PERMISSIVE FOR ALL TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_saved_library_select_own ON public.user_saved_library AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_stats_pkg_demo_oku ON public.user_stats_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_stats_pkg_own_read ON public.user_stats_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_taste_pkg_demo_oku ON public.user_taste_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_taste_pkg_own_read ON public.user_taste_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_taste_profile_demo_oku ON public.user_taste_profile AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_taste_profile_owner ON public.user_taste_profile AS PERMISSIVE FOR ALL TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_top_strips_demo_oku ON public.user_top_strips AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY user_top_strips_owner ON public.user_top_strips AS PERMISSIVE FOR ALL TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_track_weights_owner ON public.user_track_weights AS PERMISSIVE FOR ALL TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY year_pkg_demo_oku ON public.year_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ANY (( SELECT demo_kullanici_idleri() AS demo_kullanici_idleri)::uuid[])));

CREATE POLICY year_pkg_own_read ON public.year_pkg AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ─── Yetkiler (tablo) ───

REVOKE ALL ON TABLE public.account_deletions FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.account_deletions TO service_role;
GRANT SELECT ON TABLE public.account_deletions TO service_role;
GRANT UPDATE ON TABLE public.account_deletions TO service_role;
GRANT DELETE ON TABLE public.account_deletions TO service_role;
GRANT TRUNCATE ON TABLE public.account_deletions TO service_role;
GRANT REFERENCES ON TABLE public.account_deletions TO service_role;
GRANT TRIGGER ON TABLE public.account_deletions TO service_role;
GRANT MAINTAIN ON TABLE public.account_deletions TO service_role;

REVOKE ALL ON TABLE public.ai_generation_logs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.ai_generation_logs TO anon;
GRANT MAINTAIN ON TABLE public.ai_generation_logs TO anon;
GRANT INSERT ON TABLE public.ai_generation_logs TO authenticated;
GRANT SELECT ON TABLE public.ai_generation_logs TO authenticated;
GRANT UPDATE ON TABLE public.ai_generation_logs TO authenticated;
GRANT DELETE ON TABLE public.ai_generation_logs TO authenticated;
GRANT TRUNCATE ON TABLE public.ai_generation_logs TO authenticated;
GRANT REFERENCES ON TABLE public.ai_generation_logs TO authenticated;
GRANT TRIGGER ON TABLE public.ai_generation_logs TO authenticated;
GRANT MAINTAIN ON TABLE public.ai_generation_logs TO authenticated;
GRANT INSERT ON TABLE public.ai_generation_logs TO service_role;
GRANT SELECT ON TABLE public.ai_generation_logs TO service_role;
GRANT UPDATE ON TABLE public.ai_generation_logs TO service_role;
GRANT DELETE ON TABLE public.ai_generation_logs TO service_role;
GRANT TRUNCATE ON TABLE public.ai_generation_logs TO service_role;
GRANT REFERENCES ON TABLE public.ai_generation_logs TO service_role;
GRANT TRIGGER ON TABLE public.ai_generation_logs TO service_role;
GRANT MAINTAIN ON TABLE public.ai_generation_logs TO service_role;

REVOKE ALL ON TABLE public.ai_model_pricing FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.ai_model_pricing TO anon;
GRANT MAINTAIN ON TABLE public.ai_model_pricing TO anon;
GRANT INSERT ON TABLE public.ai_model_pricing TO authenticated;
GRANT SELECT ON TABLE public.ai_model_pricing TO authenticated;
GRANT UPDATE ON TABLE public.ai_model_pricing TO authenticated;
GRANT DELETE ON TABLE public.ai_model_pricing TO authenticated;
GRANT TRUNCATE ON TABLE public.ai_model_pricing TO authenticated;
GRANT REFERENCES ON TABLE public.ai_model_pricing TO authenticated;
GRANT TRIGGER ON TABLE public.ai_model_pricing TO authenticated;
GRANT MAINTAIN ON TABLE public.ai_model_pricing TO authenticated;
GRANT INSERT ON TABLE public.ai_model_pricing TO service_role;
GRANT SELECT ON TABLE public.ai_model_pricing TO service_role;
GRANT UPDATE ON TABLE public.ai_model_pricing TO service_role;
GRANT DELETE ON TABLE public.ai_model_pricing TO service_role;
GRANT TRUNCATE ON TABLE public.ai_model_pricing TO service_role;
GRANT REFERENCES ON TABLE public.ai_model_pricing TO service_role;
GRANT TRIGGER ON TABLE public.ai_model_pricing TO service_role;
GRANT MAINTAIN ON TABLE public.ai_model_pricing TO service_role;

REVOKE ALL ON TABLE public.ai_usage_counter FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.ai_usage_counter TO anon;
GRANT MAINTAIN ON TABLE public.ai_usage_counter TO anon;
GRANT INSERT ON TABLE public.ai_usage_counter TO authenticated;
GRANT SELECT ON TABLE public.ai_usage_counter TO authenticated;
GRANT UPDATE ON TABLE public.ai_usage_counter TO authenticated;
GRANT DELETE ON TABLE public.ai_usage_counter TO authenticated;
GRANT TRUNCATE ON TABLE public.ai_usage_counter TO authenticated;
GRANT REFERENCES ON TABLE public.ai_usage_counter TO authenticated;
GRANT TRIGGER ON TABLE public.ai_usage_counter TO authenticated;
GRANT MAINTAIN ON TABLE public.ai_usage_counter TO authenticated;
GRANT INSERT ON TABLE public.ai_usage_counter TO service_role;
GRANT SELECT ON TABLE public.ai_usage_counter TO service_role;
GRANT UPDATE ON TABLE public.ai_usage_counter TO service_role;
GRANT DELETE ON TABLE public.ai_usage_counter TO service_role;
GRANT TRUNCATE ON TABLE public.ai_usage_counter TO service_role;
GRANT REFERENCES ON TABLE public.ai_usage_counter TO service_role;
GRANT TRIGGER ON TABLE public.ai_usage_counter TO service_role;
GRANT MAINTAIN ON TABLE public.ai_usage_counter TO service_role;

REVOKE ALL ON TABLE public.algo_params FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.algo_params TO authenticated;
GRANT SELECT ON TABLE public.algo_params TO authenticated;
GRANT UPDATE ON TABLE public.algo_params TO authenticated;
GRANT DELETE ON TABLE public.algo_params TO authenticated;
GRANT TRUNCATE ON TABLE public.algo_params TO authenticated;
GRANT REFERENCES ON TABLE public.algo_params TO authenticated;
GRANT TRIGGER ON TABLE public.algo_params TO authenticated;
GRANT MAINTAIN ON TABLE public.algo_params TO authenticated;
GRANT INSERT ON TABLE public.algo_params TO service_role;
GRANT SELECT ON TABLE public.algo_params TO service_role;
GRANT UPDATE ON TABLE public.algo_params TO service_role;
GRANT DELETE ON TABLE public.algo_params TO service_role;
GRANT TRUNCATE ON TABLE public.algo_params TO service_role;
GRANT REFERENCES ON TABLE public.algo_params TO service_role;
GRANT TRIGGER ON TABLE public.algo_params TO service_role;
GRANT MAINTAIN ON TABLE public.algo_params TO service_role;

REVOKE ALL ON TABLE public.api_budgets FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.api_budgets TO anon;
GRANT MAINTAIN ON TABLE public.api_budgets TO anon;
GRANT INSERT ON TABLE public.api_budgets TO authenticated;
GRANT SELECT ON TABLE public.api_budgets TO authenticated;
GRANT UPDATE ON TABLE public.api_budgets TO authenticated;
GRANT DELETE ON TABLE public.api_budgets TO authenticated;
GRANT TRUNCATE ON TABLE public.api_budgets TO authenticated;
GRANT REFERENCES ON TABLE public.api_budgets TO authenticated;
GRANT TRIGGER ON TABLE public.api_budgets TO authenticated;
GRANT MAINTAIN ON TABLE public.api_budgets TO authenticated;
GRANT INSERT ON TABLE public.api_budgets TO service_role;
GRANT SELECT ON TABLE public.api_budgets TO service_role;
GRANT UPDATE ON TABLE public.api_budgets TO service_role;
GRANT DELETE ON TABLE public.api_budgets TO service_role;
GRANT TRUNCATE ON TABLE public.api_budgets TO service_role;
GRANT REFERENCES ON TABLE public.api_budgets TO service_role;
GRANT TRIGGER ON TABLE public.api_budgets TO service_role;
GRANT MAINTAIN ON TABLE public.api_budgets TO service_role;

REVOKE ALL ON TABLE public.api_cooldowns FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.api_cooldowns TO anon;
GRANT MAINTAIN ON TABLE public.api_cooldowns TO anon;
GRANT INSERT ON TABLE public.api_cooldowns TO authenticated;
GRANT SELECT ON TABLE public.api_cooldowns TO authenticated;
GRANT UPDATE ON TABLE public.api_cooldowns TO authenticated;
GRANT DELETE ON TABLE public.api_cooldowns TO authenticated;
GRANT TRUNCATE ON TABLE public.api_cooldowns TO authenticated;
GRANT REFERENCES ON TABLE public.api_cooldowns TO authenticated;
GRANT TRIGGER ON TABLE public.api_cooldowns TO authenticated;
GRANT MAINTAIN ON TABLE public.api_cooldowns TO authenticated;
GRANT INSERT ON TABLE public.api_cooldowns TO service_role;
GRANT SELECT ON TABLE public.api_cooldowns TO service_role;
GRANT UPDATE ON TABLE public.api_cooldowns TO service_role;
GRANT DELETE ON TABLE public.api_cooldowns TO service_role;
GRANT TRUNCATE ON TABLE public.api_cooldowns TO service_role;
GRANT REFERENCES ON TABLE public.api_cooldowns TO service_role;
GRANT TRIGGER ON TABLE public.api_cooldowns TO service_role;
GRANT MAINTAIN ON TABLE public.api_cooldowns TO service_role;

REVOKE ALL ON TABLE public.artists FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.artists TO anon;
GRANT MAINTAIN ON TABLE public.artists TO anon;
GRANT INSERT ON TABLE public.artists TO authenticated;
GRANT SELECT ON TABLE public.artists TO authenticated;
GRANT UPDATE ON TABLE public.artists TO authenticated;
GRANT DELETE ON TABLE public.artists TO authenticated;
GRANT TRUNCATE ON TABLE public.artists TO authenticated;
GRANT REFERENCES ON TABLE public.artists TO authenticated;
GRANT TRIGGER ON TABLE public.artists TO authenticated;
GRANT MAINTAIN ON TABLE public.artists TO authenticated;
GRANT INSERT ON TABLE public.artists TO service_role;
GRANT SELECT ON TABLE public.artists TO service_role;
GRANT UPDATE ON TABLE public.artists TO service_role;
GRANT DELETE ON TABLE public.artists TO service_role;
GRANT TRUNCATE ON TABLE public.artists TO service_role;
GRANT REFERENCES ON TABLE public.artists TO service_role;
GRANT TRIGGER ON TABLE public.artists TO service_role;
GRANT MAINTAIN ON TABLE public.artists TO service_role;

REVOKE ALL ON TABLE public.auto_playlist_rules FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.auto_playlist_rules TO anon;
GRANT MAINTAIN ON TABLE public.auto_playlist_rules TO anon;
GRANT INSERT ON TABLE public.auto_playlist_rules TO authenticated;
GRANT SELECT ON TABLE public.auto_playlist_rules TO authenticated;
GRANT UPDATE ON TABLE public.auto_playlist_rules TO authenticated;
GRANT DELETE ON TABLE public.auto_playlist_rules TO authenticated;
GRANT TRUNCATE ON TABLE public.auto_playlist_rules TO authenticated;
GRANT REFERENCES ON TABLE public.auto_playlist_rules TO authenticated;
GRANT TRIGGER ON TABLE public.auto_playlist_rules TO authenticated;
GRANT MAINTAIN ON TABLE public.auto_playlist_rules TO authenticated;
GRANT INSERT ON TABLE public.auto_playlist_rules TO service_role;
GRANT SELECT ON TABLE public.auto_playlist_rules TO service_role;
GRANT UPDATE ON TABLE public.auto_playlist_rules TO service_role;
GRANT DELETE ON TABLE public.auto_playlist_rules TO service_role;
GRANT TRUNCATE ON TABLE public.auto_playlist_rules TO service_role;
GRANT REFERENCES ON TABLE public.auto_playlist_rules TO service_role;
GRANT TRIGGER ON TABLE public.auto_playlist_rules TO service_role;
GRANT MAINTAIN ON TABLE public.auto_playlist_rules TO service_role;

REVOKE ALL ON TABLE public.auto_playlist_runs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.auto_playlist_runs TO anon;
GRANT MAINTAIN ON TABLE public.auto_playlist_runs TO anon;
GRANT INSERT ON TABLE public.auto_playlist_runs TO authenticated;
GRANT SELECT ON TABLE public.auto_playlist_runs TO authenticated;
GRANT UPDATE ON TABLE public.auto_playlist_runs TO authenticated;
GRANT DELETE ON TABLE public.auto_playlist_runs TO authenticated;
GRANT TRUNCATE ON TABLE public.auto_playlist_runs TO authenticated;
GRANT REFERENCES ON TABLE public.auto_playlist_runs TO authenticated;
GRANT TRIGGER ON TABLE public.auto_playlist_runs TO authenticated;
GRANT MAINTAIN ON TABLE public.auto_playlist_runs TO authenticated;
GRANT INSERT ON TABLE public.auto_playlist_runs TO service_role;
GRANT SELECT ON TABLE public.auto_playlist_runs TO service_role;
GRANT UPDATE ON TABLE public.auto_playlist_runs TO service_role;
GRANT DELETE ON TABLE public.auto_playlist_runs TO service_role;
GRANT TRUNCATE ON TABLE public.auto_playlist_runs TO service_role;
GRANT REFERENCES ON TABLE public.auto_playlist_runs TO service_role;
GRANT TRIGGER ON TABLE public.auto_playlist_runs TO service_role;
GRANT MAINTAIN ON TABLE public.auto_playlist_runs TO service_role;

REVOKE ALL ON TABLE public.car_sessions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.car_sessions TO anon;
GRANT MAINTAIN ON TABLE public.car_sessions TO anon;
GRANT INSERT ON TABLE public.car_sessions TO authenticated;
GRANT SELECT ON TABLE public.car_sessions TO authenticated;
GRANT UPDATE ON TABLE public.car_sessions TO authenticated;
GRANT DELETE ON TABLE public.car_sessions TO authenticated;
GRANT TRUNCATE ON TABLE public.car_sessions TO authenticated;
GRANT REFERENCES ON TABLE public.car_sessions TO authenticated;
GRANT TRIGGER ON TABLE public.car_sessions TO authenticated;
GRANT MAINTAIN ON TABLE public.car_sessions TO authenticated;
GRANT INSERT ON TABLE public.car_sessions TO service_role;
GRANT SELECT ON TABLE public.car_sessions TO service_role;
GRANT UPDATE ON TABLE public.car_sessions TO service_role;
GRANT DELETE ON TABLE public.car_sessions TO service_role;
GRANT TRUNCATE ON TABLE public.car_sessions TO service_role;
GRANT REFERENCES ON TABLE public.car_sessions TO service_role;
GRANT TRIGGER ON TABLE public.car_sessions TO service_role;
GRANT MAINTAIN ON TABLE public.car_sessions TO service_role;

REVOKE ALL ON TABLE public.catalog_ai_enrichment FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.catalog_ai_enrichment TO anon;
GRANT MAINTAIN ON TABLE public.catalog_ai_enrichment TO anon;
GRANT INSERT ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT SELECT ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT UPDATE ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT DELETE ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT TRUNCATE ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT REFERENCES ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT TRIGGER ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT MAINTAIN ON TABLE public.catalog_ai_enrichment TO authenticated;
GRANT INSERT ON TABLE public.catalog_ai_enrichment TO service_role;
GRANT SELECT ON TABLE public.catalog_ai_enrichment TO service_role;
GRANT UPDATE ON TABLE public.catalog_ai_enrichment TO service_role;
GRANT DELETE ON TABLE public.catalog_ai_enrichment TO service_role;
GRANT TRUNCATE ON TABLE public.catalog_ai_enrichment TO service_role;
GRANT REFERENCES ON TABLE public.catalog_ai_enrichment TO service_role;
GRANT TRIGGER ON TABLE public.catalog_ai_enrichment TO service_role;
GRANT MAINTAIN ON TABLE public.catalog_ai_enrichment TO service_role;

REVOKE ALL ON TABLE public.cron_kullanici_sirasi FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.cron_kullanici_sirasi TO service_role;
GRANT SELECT ON TABLE public.cron_kullanici_sirasi TO service_role;
GRANT UPDATE ON TABLE public.cron_kullanici_sirasi TO service_role;
GRANT DELETE ON TABLE public.cron_kullanici_sirasi TO service_role;
GRANT TRUNCATE ON TABLE public.cron_kullanici_sirasi TO service_role;
GRANT REFERENCES ON TABLE public.cron_kullanici_sirasi TO service_role;
GRANT TRIGGER ON TABLE public.cron_kullanici_sirasi TO service_role;
GRANT MAINTAIN ON TABLE public.cron_kullanici_sirasi TO service_role;

REVOKE ALL ON TABLE public.demo_personalar FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.demo_personalar TO service_role;
GRANT SELECT ON TABLE public.demo_personalar TO service_role;
GRANT UPDATE ON TABLE public.demo_personalar TO service_role;
GRANT DELETE ON TABLE public.demo_personalar TO service_role;
GRANT TRUNCATE ON TABLE public.demo_personalar TO service_role;
GRANT REFERENCES ON TABLE public.demo_personalar TO service_role;
GRANT TRIGGER ON TABLE public.demo_personalar TO service_role;
GRANT MAINTAIN ON TABLE public.demo_personalar TO service_role;

REVOKE ALL ON TABLE public.editorial_notes FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.editorial_notes TO service_role;
GRANT SELECT ON TABLE public.editorial_notes TO service_role;
GRANT UPDATE ON TABLE public.editorial_notes TO service_role;
GRANT DELETE ON TABLE public.editorial_notes TO service_role;
GRANT TRUNCATE ON TABLE public.editorial_notes TO service_role;
GRANT REFERENCES ON TABLE public.editorial_notes TO service_role;
GRANT TRIGGER ON TABLE public.editorial_notes TO service_role;
GRANT MAINTAIN ON TABLE public.editorial_notes TO service_role;
GRANT SELECT ON TABLE public.editorial_notes TO authenticated;

REVOKE ALL ON TABLE public.editorial_tag_pool FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.editorial_tag_pool TO service_role;
GRANT SELECT ON TABLE public.editorial_tag_pool TO service_role;
GRANT UPDATE ON TABLE public.editorial_tag_pool TO service_role;
GRANT DELETE ON TABLE public.editorial_tag_pool TO service_role;
GRANT TRUNCATE ON TABLE public.editorial_tag_pool TO service_role;
GRANT REFERENCES ON TABLE public.editorial_tag_pool TO service_role;
GRANT TRIGGER ON TABLE public.editorial_tag_pool TO service_role;
GRANT MAINTAIN ON TABLE public.editorial_tag_pool TO service_role;
GRANT SELECT ON TABLE public.editorial_tag_pool TO authenticated;

REVOKE ALL ON TABLE public.export_jobs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.export_jobs TO anon;
GRANT MAINTAIN ON TABLE public.export_jobs TO anon;
GRANT INSERT ON TABLE public.export_jobs TO authenticated;
GRANT SELECT ON TABLE public.export_jobs TO authenticated;
GRANT UPDATE ON TABLE public.export_jobs TO authenticated;
GRANT DELETE ON TABLE public.export_jobs TO authenticated;
GRANT TRUNCATE ON TABLE public.export_jobs TO authenticated;
GRANT REFERENCES ON TABLE public.export_jobs TO authenticated;
GRANT TRIGGER ON TABLE public.export_jobs TO authenticated;
GRANT MAINTAIN ON TABLE public.export_jobs TO authenticated;
GRANT INSERT ON TABLE public.export_jobs TO service_role;
GRANT SELECT ON TABLE public.export_jobs TO service_role;
GRANT UPDATE ON TABLE public.export_jobs TO service_role;
GRANT DELETE ON TABLE public.export_jobs TO service_role;
GRANT TRUNCATE ON TABLE public.export_jobs TO service_role;
GRANT REFERENCES ON TABLE public.export_jobs TO service_role;
GRANT TRIGGER ON TABLE public.export_jobs TO service_role;
GRANT MAINTAIN ON TABLE public.export_jobs TO service_role;

REVOKE ALL ON TABLE public.izinli_eposta FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.izinli_eposta TO service_role;
GRANT SELECT ON TABLE public.izinli_eposta TO service_role;
GRANT UPDATE ON TABLE public.izinli_eposta TO service_role;
GRANT DELETE ON TABLE public.izinli_eposta TO service_role;
GRANT TRUNCATE ON TABLE public.izinli_eposta TO service_role;
GRANT REFERENCES ON TABLE public.izinli_eposta TO service_role;
GRANT TRIGGER ON TABLE public.izinli_eposta TO service_role;
GRANT MAINTAIN ON TABLE public.izinli_eposta TO service_role;

REVOKE ALL ON TABLE public.journey_arc FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.journey_arc TO anon;
GRANT MAINTAIN ON TABLE public.journey_arc TO anon;
GRANT INSERT ON TABLE public.journey_arc TO authenticated;
GRANT SELECT ON TABLE public.journey_arc TO authenticated;
GRANT UPDATE ON TABLE public.journey_arc TO authenticated;
GRANT DELETE ON TABLE public.journey_arc TO authenticated;
GRANT TRUNCATE ON TABLE public.journey_arc TO authenticated;
GRANT REFERENCES ON TABLE public.journey_arc TO authenticated;
GRANT TRIGGER ON TABLE public.journey_arc TO authenticated;
GRANT MAINTAIN ON TABLE public.journey_arc TO authenticated;
GRANT INSERT ON TABLE public.journey_arc TO service_role;
GRANT SELECT ON TABLE public.journey_arc TO service_role;
GRANT UPDATE ON TABLE public.journey_arc TO service_role;
GRANT DELETE ON TABLE public.journey_arc TO service_role;
GRANT TRUNCATE ON TABLE public.journey_arc TO service_role;
GRANT REFERENCES ON TABLE public.journey_arc TO service_role;
GRANT TRIGGER ON TABLE public.journey_arc TO service_role;
GRANT MAINTAIN ON TABLE public.journey_arc TO service_role;

REVOKE ALL ON TABLE public.journey_ritual_answers FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.journey_ritual_answers TO anon;
GRANT MAINTAIN ON TABLE public.journey_ritual_answers TO anon;
GRANT INSERT ON TABLE public.journey_ritual_answers TO authenticated;
GRANT SELECT ON TABLE public.journey_ritual_answers TO authenticated;
GRANT UPDATE ON TABLE public.journey_ritual_answers TO authenticated;
GRANT DELETE ON TABLE public.journey_ritual_answers TO authenticated;
GRANT TRUNCATE ON TABLE public.journey_ritual_answers TO authenticated;
GRANT REFERENCES ON TABLE public.journey_ritual_answers TO authenticated;
GRANT TRIGGER ON TABLE public.journey_ritual_answers TO authenticated;
GRANT MAINTAIN ON TABLE public.journey_ritual_answers TO authenticated;
GRANT INSERT ON TABLE public.journey_ritual_answers TO service_role;
GRANT SELECT ON TABLE public.journey_ritual_answers TO service_role;
GRANT UPDATE ON TABLE public.journey_ritual_answers TO service_role;
GRANT DELETE ON TABLE public.journey_ritual_answers TO service_role;
GRANT TRUNCATE ON TABLE public.journey_ritual_answers TO service_role;
GRANT REFERENCES ON TABLE public.journey_ritual_answers TO service_role;
GRANT TRIGGER ON TABLE public.journey_ritual_answers TO service_role;
GRANT MAINTAIN ON TABLE public.journey_ritual_answers TO service_role;

REVOKE ALL ON TABLE public.journey_year_milestones FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.journey_year_milestones TO anon;
GRANT MAINTAIN ON TABLE public.journey_year_milestones TO anon;
GRANT INSERT ON TABLE public.journey_year_milestones TO authenticated;
GRANT SELECT ON TABLE public.journey_year_milestones TO authenticated;
GRANT UPDATE ON TABLE public.journey_year_milestones TO authenticated;
GRANT DELETE ON TABLE public.journey_year_milestones TO authenticated;
GRANT TRUNCATE ON TABLE public.journey_year_milestones TO authenticated;
GRANT REFERENCES ON TABLE public.journey_year_milestones TO authenticated;
GRANT TRIGGER ON TABLE public.journey_year_milestones TO authenticated;
GRANT MAINTAIN ON TABLE public.journey_year_milestones TO authenticated;
GRANT INSERT ON TABLE public.journey_year_milestones TO service_role;
GRANT SELECT ON TABLE public.journey_year_milestones TO service_role;
GRANT UPDATE ON TABLE public.journey_year_milestones TO service_role;
GRANT DELETE ON TABLE public.journey_year_milestones TO service_role;
GRANT TRUNCATE ON TABLE public.journey_year_milestones TO service_role;
GRANT REFERENCES ON TABLE public.journey_year_milestones TO service_role;
GRANT TRIGGER ON TABLE public.journey_year_milestones TO service_role;
GRANT MAINTAIN ON TABLE public.journey_year_milestones TO service_role;

REVOKE ALL ON TABLE public.journey_year_pkg FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.journey_year_pkg TO anon;
GRANT MAINTAIN ON TABLE public.journey_year_pkg TO anon;
GRANT INSERT ON TABLE public.journey_year_pkg TO authenticated;
GRANT SELECT ON TABLE public.journey_year_pkg TO authenticated;
GRANT UPDATE ON TABLE public.journey_year_pkg TO authenticated;
GRANT DELETE ON TABLE public.journey_year_pkg TO authenticated;
GRANT TRUNCATE ON TABLE public.journey_year_pkg TO authenticated;
GRANT REFERENCES ON TABLE public.journey_year_pkg TO authenticated;
GRANT TRIGGER ON TABLE public.journey_year_pkg TO authenticated;
GRANT MAINTAIN ON TABLE public.journey_year_pkg TO authenticated;
GRANT INSERT ON TABLE public.journey_year_pkg TO service_role;
GRANT SELECT ON TABLE public.journey_year_pkg TO service_role;
GRANT UPDATE ON TABLE public.journey_year_pkg TO service_role;
GRANT DELETE ON TABLE public.journey_year_pkg TO service_role;
GRANT TRUNCATE ON TABLE public.journey_year_pkg TO service_role;
GRANT REFERENCES ON TABLE public.journey_year_pkg TO service_role;
GRANT TRIGGER ON TABLE public.journey_year_pkg TO service_role;
GRANT MAINTAIN ON TABLE public.journey_year_pkg TO service_role;

REVOKE ALL ON TABLE public.kullanici_animasyonlari FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.kullanici_animasyonlari TO authenticated;
GRANT SELECT ON TABLE public.kullanici_animasyonlari TO authenticated;
GRANT MAINTAIN ON TABLE public.kullanici_animasyonlari TO authenticated;
GRANT INSERT ON TABLE public.kullanici_animasyonlari TO service_role;
GRANT SELECT ON TABLE public.kullanici_animasyonlari TO service_role;
GRANT UPDATE ON TABLE public.kullanici_animasyonlari TO service_role;
GRANT DELETE ON TABLE public.kullanici_animasyonlari TO service_role;
GRANT TRUNCATE ON TABLE public.kullanici_animasyonlari TO service_role;
GRANT REFERENCES ON TABLE public.kullanici_animasyonlari TO service_role;
GRANT TRIGGER ON TABLE public.kullanici_animasyonlari TO service_role;
GRANT MAINTAIN ON TABLE public.kullanici_animasyonlari TO service_role;

REVOKE ALL ON TABLE public.liked_songs_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.liked_songs_events TO anon;
GRANT MAINTAIN ON TABLE public.liked_songs_events TO anon;
GRANT INSERT ON TABLE public.liked_songs_events TO authenticated;
GRANT SELECT ON TABLE public.liked_songs_events TO authenticated;
GRANT UPDATE ON TABLE public.liked_songs_events TO authenticated;
GRANT DELETE ON TABLE public.liked_songs_events TO authenticated;
GRANT TRUNCATE ON TABLE public.liked_songs_events TO authenticated;
GRANT REFERENCES ON TABLE public.liked_songs_events TO authenticated;
GRANT TRIGGER ON TABLE public.liked_songs_events TO authenticated;
GRANT MAINTAIN ON TABLE public.liked_songs_events TO authenticated;
GRANT INSERT ON TABLE public.liked_songs_events TO service_role;
GRANT SELECT ON TABLE public.liked_songs_events TO service_role;
GRANT UPDATE ON TABLE public.liked_songs_events TO service_role;
GRANT DELETE ON TABLE public.liked_songs_events TO service_role;
GRANT TRUNCATE ON TABLE public.liked_songs_events TO service_role;
GRANT REFERENCES ON TABLE public.liked_songs_events TO service_role;
GRANT TRIGGER ON TABLE public.liked_songs_events TO service_role;
GRANT MAINTAIN ON TABLE public.liked_songs_events TO service_role;

REVOKE ALL ON TABLE public.maintenance_watermark FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.maintenance_watermark TO service_role;
GRANT SELECT ON TABLE public.maintenance_watermark TO service_role;
GRANT UPDATE ON TABLE public.maintenance_watermark TO service_role;
GRANT DELETE ON TABLE public.maintenance_watermark TO service_role;
GRANT TRUNCATE ON TABLE public.maintenance_watermark TO service_role;
GRANT REFERENCES ON TABLE public.maintenance_watermark TO service_role;
GRANT TRIGGER ON TABLE public.maintenance_watermark TO service_role;
GRANT MAINTAIN ON TABLE public.maintenance_watermark TO service_role;

REVOKE ALL ON TABLE public.migration_jobs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.migration_jobs TO anon;
GRANT MAINTAIN ON TABLE public.migration_jobs TO anon;
GRANT INSERT ON TABLE public.migration_jobs TO authenticated;
GRANT SELECT ON TABLE public.migration_jobs TO authenticated;
GRANT UPDATE ON TABLE public.migration_jobs TO authenticated;
GRANT DELETE ON TABLE public.migration_jobs TO authenticated;
GRANT TRUNCATE ON TABLE public.migration_jobs TO authenticated;
GRANT REFERENCES ON TABLE public.migration_jobs TO authenticated;
GRANT TRIGGER ON TABLE public.migration_jobs TO authenticated;
GRANT MAINTAIN ON TABLE public.migration_jobs TO authenticated;
GRANT INSERT ON TABLE public.migration_jobs TO service_role;
GRANT SELECT ON TABLE public.migration_jobs TO service_role;
GRANT UPDATE ON TABLE public.migration_jobs TO service_role;
GRANT DELETE ON TABLE public.migration_jobs TO service_role;
GRANT TRUNCATE ON TABLE public.migration_jobs TO service_role;
GRANT REFERENCES ON TABLE public.migration_jobs TO service_role;
GRANT TRIGGER ON TABLE public.migration_jobs TO service_role;
GRANT MAINTAIN ON TABLE public.migration_jobs TO service_role;

REVOKE ALL ON TABLE public.migration_queue FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.migration_queue TO anon;
GRANT MAINTAIN ON TABLE public.migration_queue TO anon;
GRANT INSERT ON TABLE public.migration_queue TO authenticated;
GRANT SELECT ON TABLE public.migration_queue TO authenticated;
GRANT UPDATE ON TABLE public.migration_queue TO authenticated;
GRANT DELETE ON TABLE public.migration_queue TO authenticated;
GRANT TRUNCATE ON TABLE public.migration_queue TO authenticated;
GRANT REFERENCES ON TABLE public.migration_queue TO authenticated;
GRANT TRIGGER ON TABLE public.migration_queue TO authenticated;
GRANT MAINTAIN ON TABLE public.migration_queue TO authenticated;
GRANT INSERT ON TABLE public.migration_queue TO service_role;
GRANT SELECT ON TABLE public.migration_queue TO service_role;
GRANT UPDATE ON TABLE public.migration_queue TO service_role;
GRANT DELETE ON TABLE public.migration_queue TO service_role;
GRANT TRUNCATE ON TABLE public.migration_queue TO service_role;
GRANT REFERENCES ON TABLE public.migration_queue TO service_role;
GRANT TRIGGER ON TABLE public.migration_queue TO service_role;
GRANT MAINTAIN ON TABLE public.migration_queue TO service_role;

REVOKE ALL ON TABLE public.migration_queue_items FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.migration_queue_items TO anon;
GRANT MAINTAIN ON TABLE public.migration_queue_items TO anon;
GRANT INSERT ON TABLE public.migration_queue_items TO authenticated;
GRANT SELECT ON TABLE public.migration_queue_items TO authenticated;
GRANT UPDATE ON TABLE public.migration_queue_items TO authenticated;
GRANT DELETE ON TABLE public.migration_queue_items TO authenticated;
GRANT TRUNCATE ON TABLE public.migration_queue_items TO authenticated;
GRANT REFERENCES ON TABLE public.migration_queue_items TO authenticated;
GRANT TRIGGER ON TABLE public.migration_queue_items TO authenticated;
GRANT MAINTAIN ON TABLE public.migration_queue_items TO authenticated;
GRANT INSERT ON TABLE public.migration_queue_items TO service_role;
GRANT SELECT ON TABLE public.migration_queue_items TO service_role;
GRANT UPDATE ON TABLE public.migration_queue_items TO service_role;
GRANT DELETE ON TABLE public.migration_queue_items TO service_role;
GRANT TRUNCATE ON TABLE public.migration_queue_items TO service_role;
GRANT REFERENCES ON TABLE public.migration_queue_items TO service_role;
GRANT TRIGGER ON TABLE public.migration_queue_items TO service_role;
GRANT MAINTAIN ON TABLE public.migration_queue_items TO service_role;

REVOKE ALL ON TABLE public.mood_definitions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.mood_definitions TO anon;
GRANT MAINTAIN ON TABLE public.mood_definitions TO anon;
GRANT INSERT ON TABLE public.mood_definitions TO authenticated;
GRANT SELECT ON TABLE public.mood_definitions TO authenticated;
GRANT UPDATE ON TABLE public.mood_definitions TO authenticated;
GRANT DELETE ON TABLE public.mood_definitions TO authenticated;
GRANT TRUNCATE ON TABLE public.mood_definitions TO authenticated;
GRANT REFERENCES ON TABLE public.mood_definitions TO authenticated;
GRANT TRIGGER ON TABLE public.mood_definitions TO authenticated;
GRANT MAINTAIN ON TABLE public.mood_definitions TO authenticated;
GRANT INSERT ON TABLE public.mood_definitions TO service_role;
GRANT SELECT ON TABLE public.mood_definitions TO service_role;
GRANT UPDATE ON TABLE public.mood_definitions TO service_role;
GRANT DELETE ON TABLE public.mood_definitions TO service_role;
GRANT TRUNCATE ON TABLE public.mood_definitions TO service_role;
GRANT REFERENCES ON TABLE public.mood_definitions TO service_role;
GRANT TRIGGER ON TABLE public.mood_definitions TO service_role;
GRANT MAINTAIN ON TABLE public.mood_definitions TO service_role;

REVOKE ALL ON TABLE public.mood_kural FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.mood_kural TO authenticated;
GRANT SELECT ON TABLE public.mood_kural TO authenticated;
GRANT UPDATE ON TABLE public.mood_kural TO authenticated;
GRANT DELETE ON TABLE public.mood_kural TO authenticated;
GRANT TRUNCATE ON TABLE public.mood_kural TO authenticated;
GRANT REFERENCES ON TABLE public.mood_kural TO authenticated;
GRANT TRIGGER ON TABLE public.mood_kural TO authenticated;
GRANT MAINTAIN ON TABLE public.mood_kural TO authenticated;
GRANT INSERT ON TABLE public.mood_kural TO service_role;
GRANT SELECT ON TABLE public.mood_kural TO service_role;
GRANT UPDATE ON TABLE public.mood_kural TO service_role;
GRANT DELETE ON TABLE public.mood_kural TO service_role;
GRANT TRUNCATE ON TABLE public.mood_kural TO service_role;
GRANT REFERENCES ON TABLE public.mood_kural TO service_role;
GRANT TRIGGER ON TABLE public.mood_kural TO service_role;
GRANT MAINTAIN ON TABLE public.mood_kural TO service_role;

REVOKE ALL ON TABLE public.mood_pkg FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.mood_pkg TO anon;
GRANT MAINTAIN ON TABLE public.mood_pkg TO anon;
GRANT INSERT ON TABLE public.mood_pkg TO authenticated;
GRANT SELECT ON TABLE public.mood_pkg TO authenticated;
GRANT UPDATE ON TABLE public.mood_pkg TO authenticated;
GRANT DELETE ON TABLE public.mood_pkg TO authenticated;
GRANT TRUNCATE ON TABLE public.mood_pkg TO authenticated;
GRANT REFERENCES ON TABLE public.mood_pkg TO authenticated;
GRANT TRIGGER ON TABLE public.mood_pkg TO authenticated;
GRANT MAINTAIN ON TABLE public.mood_pkg TO authenticated;
GRANT INSERT ON TABLE public.mood_pkg TO service_role;
GRANT SELECT ON TABLE public.mood_pkg TO service_role;
GRANT UPDATE ON TABLE public.mood_pkg TO service_role;
GRANT DELETE ON TABLE public.mood_pkg TO service_role;
GRANT TRUNCATE ON TABLE public.mood_pkg TO service_role;
GRANT REFERENCES ON TABLE public.mood_pkg TO service_role;
GRANT TRIGGER ON TABLE public.mood_pkg TO service_role;
GRANT MAINTAIN ON TABLE public.mood_pkg TO service_role;

REVOKE ALL ON TABLE public.mood_tag_sozlugu FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.mood_tag_sozlugu TO anon;
GRANT MAINTAIN ON TABLE public.mood_tag_sozlugu TO anon;
GRANT INSERT ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT SELECT ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT UPDATE ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT DELETE ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT TRUNCATE ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT REFERENCES ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT TRIGGER ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT MAINTAIN ON TABLE public.mood_tag_sozlugu TO authenticated;
GRANT INSERT ON TABLE public.mood_tag_sozlugu TO service_role;
GRANT SELECT ON TABLE public.mood_tag_sozlugu TO service_role;
GRANT UPDATE ON TABLE public.mood_tag_sozlugu TO service_role;
GRANT DELETE ON TABLE public.mood_tag_sozlugu TO service_role;
GRANT TRUNCATE ON TABLE public.mood_tag_sozlugu TO service_role;
GRANT REFERENCES ON TABLE public.mood_tag_sozlugu TO service_role;
GRANT TRIGGER ON TABLE public.mood_tag_sozlugu TO service_role;
GRANT MAINTAIN ON TABLE public.mood_tag_sozlugu TO service_role;

REVOKE ALL ON TABLE public.mood_track_feedback FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.mood_track_feedback TO anon;
GRANT MAINTAIN ON TABLE public.mood_track_feedback TO anon;
GRANT INSERT ON TABLE public.mood_track_feedback TO authenticated;
GRANT SELECT ON TABLE public.mood_track_feedback TO authenticated;
GRANT UPDATE ON TABLE public.mood_track_feedback TO authenticated;
GRANT DELETE ON TABLE public.mood_track_feedback TO authenticated;
GRANT TRUNCATE ON TABLE public.mood_track_feedback TO authenticated;
GRANT REFERENCES ON TABLE public.mood_track_feedback TO authenticated;
GRANT TRIGGER ON TABLE public.mood_track_feedback TO authenticated;
GRANT MAINTAIN ON TABLE public.mood_track_feedback TO authenticated;
GRANT INSERT ON TABLE public.mood_track_feedback TO service_role;
GRANT SELECT ON TABLE public.mood_track_feedback TO service_role;
GRANT UPDATE ON TABLE public.mood_track_feedback TO service_role;
GRANT DELETE ON TABLE public.mood_track_feedback TO service_role;
GRANT TRUNCATE ON TABLE public.mood_track_feedback TO service_role;
GRANT REFERENCES ON TABLE public.mood_track_feedback TO service_role;
GRANT TRIGGER ON TABLE public.mood_track_feedback TO service_role;
GRANT MAINTAIN ON TABLE public.mood_track_feedback TO service_role;

REVOKE ALL ON TABLE public.mood_workspace FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.mood_workspace TO anon;
GRANT MAINTAIN ON TABLE public.mood_workspace TO anon;
GRANT INSERT ON TABLE public.mood_workspace TO authenticated;
GRANT SELECT ON TABLE public.mood_workspace TO authenticated;
GRANT UPDATE ON TABLE public.mood_workspace TO authenticated;
GRANT DELETE ON TABLE public.mood_workspace TO authenticated;
GRANT TRUNCATE ON TABLE public.mood_workspace TO authenticated;
GRANT REFERENCES ON TABLE public.mood_workspace TO authenticated;
GRANT TRIGGER ON TABLE public.mood_workspace TO authenticated;
GRANT MAINTAIN ON TABLE public.mood_workspace TO authenticated;
GRANT INSERT ON TABLE public.mood_workspace TO service_role;
GRANT SELECT ON TABLE public.mood_workspace TO service_role;
GRANT UPDATE ON TABLE public.mood_workspace TO service_role;
GRANT DELETE ON TABLE public.mood_workspace TO service_role;
GRANT TRUNCATE ON TABLE public.mood_workspace TO service_role;
GRANT REFERENCES ON TABLE public.mood_workspace TO service_role;
GRANT TRIGGER ON TABLE public.mood_workspace TO service_role;
GRANT MAINTAIN ON TABLE public.mood_workspace TO service_role;

REVOKE ALL ON TABLE public.pipeline_runs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.pipeline_runs TO anon;
GRANT MAINTAIN ON TABLE public.pipeline_runs TO anon;
GRANT INSERT ON TABLE public.pipeline_runs TO authenticated;
GRANT SELECT ON TABLE public.pipeline_runs TO authenticated;
GRANT UPDATE ON TABLE public.pipeline_runs TO authenticated;
GRANT DELETE ON TABLE public.pipeline_runs TO authenticated;
GRANT TRUNCATE ON TABLE public.pipeline_runs TO authenticated;
GRANT REFERENCES ON TABLE public.pipeline_runs TO authenticated;
GRANT TRIGGER ON TABLE public.pipeline_runs TO authenticated;
GRANT MAINTAIN ON TABLE public.pipeline_runs TO authenticated;
GRANT INSERT ON TABLE public.pipeline_runs TO service_role;
GRANT SELECT ON TABLE public.pipeline_runs TO service_role;
GRANT UPDATE ON TABLE public.pipeline_runs TO service_role;
GRANT DELETE ON TABLE public.pipeline_runs TO service_role;
GRANT TRUNCATE ON TABLE public.pipeline_runs TO service_role;
GRANT REFERENCES ON TABLE public.pipeline_runs TO service_role;
GRANT TRIGGER ON TABLE public.pipeline_runs TO service_role;
GRANT MAINTAIN ON TABLE public.pipeline_runs TO service_role;

REVOKE ALL ON TABLE public.platform_connections FROM PUBLIC, anon, authenticated, service_role;
GRANT MAINTAIN ON TABLE public.platform_connections TO anon;
GRANT INSERT ON TABLE public.platform_connections TO authenticated;
GRANT UPDATE ON TABLE public.platform_connections TO authenticated;
GRANT DELETE ON TABLE public.platform_connections TO authenticated;
GRANT MAINTAIN ON TABLE public.platform_connections TO authenticated;
GRANT INSERT ON TABLE public.platform_connections TO service_role;
GRANT SELECT ON TABLE public.platform_connections TO service_role;
GRANT UPDATE ON TABLE public.platform_connections TO service_role;
GRANT DELETE ON TABLE public.platform_connections TO service_role;
GRANT TRUNCATE ON TABLE public.platform_connections TO service_role;
GRANT REFERENCES ON TABLE public.platform_connections TO service_role;
GRANT TRIGGER ON TABLE public.platform_connections TO service_role;
GRANT MAINTAIN ON TABLE public.platform_connections TO service_role;

REVOKE ALL ON TABLE public.play_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.play_events TO anon;
GRANT MAINTAIN ON TABLE public.play_events TO anon;
GRANT INSERT ON TABLE public.play_events TO authenticated;
GRANT SELECT ON TABLE public.play_events TO authenticated;
GRANT UPDATE ON TABLE public.play_events TO authenticated;
GRANT DELETE ON TABLE public.play_events TO authenticated;
GRANT TRUNCATE ON TABLE public.play_events TO authenticated;
GRANT REFERENCES ON TABLE public.play_events TO authenticated;
GRANT TRIGGER ON TABLE public.play_events TO authenticated;
GRANT MAINTAIN ON TABLE public.play_events TO authenticated;
GRANT INSERT ON TABLE public.play_events TO service_role;
GRANT SELECT ON TABLE public.play_events TO service_role;
GRANT UPDATE ON TABLE public.play_events TO service_role;
GRANT DELETE ON TABLE public.play_events TO service_role;
GRANT TRUNCATE ON TABLE public.play_events TO service_role;
GRANT REFERENCES ON TABLE public.play_events TO service_role;
GRANT TRIGGER ON TABLE public.play_events TO service_role;
GRANT MAINTAIN ON TABLE public.play_events TO service_role;

REVOKE ALL ON TABLE public.playlist_track_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.playlist_track_events TO anon;
GRANT MAINTAIN ON TABLE public.playlist_track_events TO anon;
GRANT INSERT ON TABLE public.playlist_track_events TO authenticated;
GRANT SELECT ON TABLE public.playlist_track_events TO authenticated;
GRANT UPDATE ON TABLE public.playlist_track_events TO authenticated;
GRANT DELETE ON TABLE public.playlist_track_events TO authenticated;
GRANT TRUNCATE ON TABLE public.playlist_track_events TO authenticated;
GRANT REFERENCES ON TABLE public.playlist_track_events TO authenticated;
GRANT TRIGGER ON TABLE public.playlist_track_events TO authenticated;
GRANT MAINTAIN ON TABLE public.playlist_track_events TO authenticated;
GRANT INSERT ON TABLE public.playlist_track_events TO service_role;
GRANT SELECT ON TABLE public.playlist_track_events TO service_role;
GRANT UPDATE ON TABLE public.playlist_track_events TO service_role;
GRANT DELETE ON TABLE public.playlist_track_events TO service_role;
GRANT TRUNCATE ON TABLE public.playlist_track_events TO service_role;
GRANT REFERENCES ON TABLE public.playlist_track_events TO service_role;
GRANT TRIGGER ON TABLE public.playlist_track_events TO service_role;
GRANT MAINTAIN ON TABLE public.playlist_track_events TO service_role;

REVOKE ALL ON TABLE public.playlist_tracks FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.playlist_tracks TO anon;
GRANT MAINTAIN ON TABLE public.playlist_tracks TO anon;
GRANT INSERT ON TABLE public.playlist_tracks TO authenticated;
GRANT SELECT ON TABLE public.playlist_tracks TO authenticated;
GRANT UPDATE ON TABLE public.playlist_tracks TO authenticated;
GRANT DELETE ON TABLE public.playlist_tracks TO authenticated;
GRANT TRUNCATE ON TABLE public.playlist_tracks TO authenticated;
GRANT REFERENCES ON TABLE public.playlist_tracks TO authenticated;
GRANT TRIGGER ON TABLE public.playlist_tracks TO authenticated;
GRANT MAINTAIN ON TABLE public.playlist_tracks TO authenticated;
GRANT INSERT ON TABLE public.playlist_tracks TO service_role;
GRANT SELECT ON TABLE public.playlist_tracks TO service_role;
GRANT UPDATE ON TABLE public.playlist_tracks TO service_role;
GRANT DELETE ON TABLE public.playlist_tracks TO service_role;
GRANT TRUNCATE ON TABLE public.playlist_tracks TO service_role;
GRANT REFERENCES ON TABLE public.playlist_tracks TO service_role;
GRANT TRIGGER ON TABLE public.playlist_tracks TO service_role;
GRANT MAINTAIN ON TABLE public.playlist_tracks TO service_role;

REVOKE ALL ON TABLE public.playlists FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.playlists TO anon;
GRANT MAINTAIN ON TABLE public.playlists TO anon;
GRANT INSERT ON TABLE public.playlists TO authenticated;
GRANT SELECT ON TABLE public.playlists TO authenticated;
GRANT UPDATE ON TABLE public.playlists TO authenticated;
GRANT DELETE ON TABLE public.playlists TO authenticated;
GRANT TRUNCATE ON TABLE public.playlists TO authenticated;
GRANT REFERENCES ON TABLE public.playlists TO authenticated;
GRANT TRIGGER ON TABLE public.playlists TO authenticated;
GRANT MAINTAIN ON TABLE public.playlists TO authenticated;
GRANT INSERT ON TABLE public.playlists TO service_role;
GRANT SELECT ON TABLE public.playlists TO service_role;
GRANT UPDATE ON TABLE public.playlists TO service_role;
GRANT DELETE ON TABLE public.playlists TO service_role;
GRANT TRUNCATE ON TABLE public.playlists TO service_role;
GRANT REFERENCES ON TABLE public.playlists TO service_role;
GRANT TRIGGER ON TABLE public.playlists TO service_role;
GRANT MAINTAIN ON TABLE public.playlists TO service_role;

REVOKE ALL ON TABLE public.podcast_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.podcast_events TO anon;
GRANT MAINTAIN ON TABLE public.podcast_events TO anon;
GRANT INSERT ON TABLE public.podcast_events TO authenticated;
GRANT SELECT ON TABLE public.podcast_events TO authenticated;
GRANT UPDATE ON TABLE public.podcast_events TO authenticated;
GRANT DELETE ON TABLE public.podcast_events TO authenticated;
GRANT TRUNCATE ON TABLE public.podcast_events TO authenticated;
GRANT REFERENCES ON TABLE public.podcast_events TO authenticated;
GRANT TRIGGER ON TABLE public.podcast_events TO authenticated;
GRANT MAINTAIN ON TABLE public.podcast_events TO authenticated;
GRANT INSERT ON TABLE public.podcast_events TO service_role;
GRANT SELECT ON TABLE public.podcast_events TO service_role;
GRANT UPDATE ON TABLE public.podcast_events TO service_role;
GRANT DELETE ON TABLE public.podcast_events TO service_role;
GRANT TRUNCATE ON TABLE public.podcast_events TO service_role;
GRANT REFERENCES ON TABLE public.podcast_events TO service_role;
GRANT TRIGGER ON TABLE public.podcast_events TO service_role;
GRANT MAINTAIN ON TABLE public.podcast_events TO service_role;

REVOKE ALL ON TABLE public.recaps FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.recaps TO anon;
GRANT MAINTAIN ON TABLE public.recaps TO anon;
GRANT INSERT ON TABLE public.recaps TO authenticated;
GRANT SELECT ON TABLE public.recaps TO authenticated;
GRANT UPDATE ON TABLE public.recaps TO authenticated;
GRANT DELETE ON TABLE public.recaps TO authenticated;
GRANT TRUNCATE ON TABLE public.recaps TO authenticated;
GRANT REFERENCES ON TABLE public.recaps TO authenticated;
GRANT TRIGGER ON TABLE public.recaps TO authenticated;
GRANT MAINTAIN ON TABLE public.recaps TO authenticated;
GRANT INSERT ON TABLE public.recaps TO service_role;
GRANT SELECT ON TABLE public.recaps TO service_role;
GRANT UPDATE ON TABLE public.recaps TO service_role;
GRANT DELETE ON TABLE public.recaps TO service_role;
GRANT TRUNCATE ON TABLE public.recaps TO service_role;
GRANT REFERENCES ON TABLE public.recaps TO service_role;
GRANT TRIGGER ON TABLE public.recaps TO service_role;
GRANT MAINTAIN ON TABLE public.recaps TO service_role;

REVOKE ALL ON TABLE public.spotify_allowlist_requests FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.spotify_allowlist_requests TO anon;
GRANT MAINTAIN ON TABLE public.spotify_allowlist_requests TO anon;
GRANT INSERT ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT SELECT ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT UPDATE ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT DELETE ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT TRUNCATE ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT REFERENCES ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT TRIGGER ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT MAINTAIN ON TABLE public.spotify_allowlist_requests TO authenticated;
GRANT INSERT ON TABLE public.spotify_allowlist_requests TO service_role;
GRANT SELECT ON TABLE public.spotify_allowlist_requests TO service_role;
GRANT UPDATE ON TABLE public.spotify_allowlist_requests TO service_role;
GRANT DELETE ON TABLE public.spotify_allowlist_requests TO service_role;
GRANT TRUNCATE ON TABLE public.spotify_allowlist_requests TO service_role;
GRANT REFERENCES ON TABLE public.spotify_allowlist_requests TO service_role;
GRANT TRIGGER ON TABLE public.spotify_allowlist_requests TO service_role;
GRANT MAINTAIN ON TABLE public.spotify_allowlist_requests TO service_role;

REVOKE ALL ON TABLE public.spotify_byoc_credentials FROM PUBLIC, anon, authenticated, service_role;
GRANT MAINTAIN ON TABLE public.spotify_byoc_credentials TO anon;
GRANT INSERT ON TABLE public.spotify_byoc_credentials TO authenticated;
GRANT SELECT ON TABLE public.spotify_byoc_credentials TO authenticated;
GRANT UPDATE ON TABLE public.spotify_byoc_credentials TO authenticated;
GRANT DELETE ON TABLE public.spotify_byoc_credentials TO authenticated;
GRANT MAINTAIN ON TABLE public.spotify_byoc_credentials TO authenticated;
GRANT INSERT ON TABLE public.spotify_byoc_credentials TO service_role;
GRANT SELECT ON TABLE public.spotify_byoc_credentials TO service_role;
GRANT UPDATE ON TABLE public.spotify_byoc_credentials TO service_role;
GRANT DELETE ON TABLE public.spotify_byoc_credentials TO service_role;
GRANT TRUNCATE ON TABLE public.spotify_byoc_credentials TO service_role;
GRANT REFERENCES ON TABLE public.spotify_byoc_credentials TO service_role;
GRANT TRIGGER ON TABLE public.spotify_byoc_credentials TO service_role;
GRANT MAINTAIN ON TABLE public.spotify_byoc_credentials TO service_role;

REVOKE ALL ON TABLE public.sync_rules FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.sync_rules TO anon;
GRANT MAINTAIN ON TABLE public.sync_rules TO anon;
GRANT INSERT ON TABLE public.sync_rules TO authenticated;
GRANT SELECT ON TABLE public.sync_rules TO authenticated;
GRANT UPDATE ON TABLE public.sync_rules TO authenticated;
GRANT DELETE ON TABLE public.sync_rules TO authenticated;
GRANT TRUNCATE ON TABLE public.sync_rules TO authenticated;
GRANT REFERENCES ON TABLE public.sync_rules TO authenticated;
GRANT TRIGGER ON TABLE public.sync_rules TO authenticated;
GRANT MAINTAIN ON TABLE public.sync_rules TO authenticated;
GRANT INSERT ON TABLE public.sync_rules TO service_role;
GRANT SELECT ON TABLE public.sync_rules TO service_role;
GRANT UPDATE ON TABLE public.sync_rules TO service_role;
GRANT DELETE ON TABLE public.sync_rules TO service_role;
GRANT TRUNCATE ON TABLE public.sync_rules TO service_role;
GRANT REFERENCES ON TABLE public.sync_rules TO service_role;
GRANT TRIGGER ON TABLE public.sync_rules TO service_role;
GRANT MAINTAIN ON TABLE public.sync_rules TO service_role;

REVOKE ALL ON TABLE public.sync_runs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.sync_runs TO anon;
GRANT MAINTAIN ON TABLE public.sync_runs TO anon;
GRANT INSERT ON TABLE public.sync_runs TO authenticated;
GRANT SELECT ON TABLE public.sync_runs TO authenticated;
GRANT UPDATE ON TABLE public.sync_runs TO authenticated;
GRANT DELETE ON TABLE public.sync_runs TO authenticated;
GRANT TRUNCATE ON TABLE public.sync_runs TO authenticated;
GRANT REFERENCES ON TABLE public.sync_runs TO authenticated;
GRANT TRIGGER ON TABLE public.sync_runs TO authenticated;
GRANT MAINTAIN ON TABLE public.sync_runs TO authenticated;
GRANT INSERT ON TABLE public.sync_runs TO service_role;
GRANT SELECT ON TABLE public.sync_runs TO service_role;
GRANT UPDATE ON TABLE public.sync_runs TO service_role;
GRANT DELETE ON TABLE public.sync_runs TO service_role;
GRANT TRUNCATE ON TABLE public.sync_runs TO service_role;
GRANT REFERENCES ON TABLE public.sync_runs TO service_role;
GRANT TRIGGER ON TABLE public.sync_runs TO service_role;
GRANT MAINTAIN ON TABLE public.sync_runs TO service_role;

REVOKE ALL ON TABLE public.system_logs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.system_logs TO anon;
GRANT MAINTAIN ON TABLE public.system_logs TO anon;
GRANT INSERT ON TABLE public.system_logs TO authenticated;
GRANT SELECT ON TABLE public.system_logs TO authenticated;
GRANT UPDATE ON TABLE public.system_logs TO authenticated;
GRANT DELETE ON TABLE public.system_logs TO authenticated;
GRANT TRUNCATE ON TABLE public.system_logs TO authenticated;
GRANT REFERENCES ON TABLE public.system_logs TO authenticated;
GRANT TRIGGER ON TABLE public.system_logs TO authenticated;
GRANT MAINTAIN ON TABLE public.system_logs TO authenticated;
GRANT INSERT ON TABLE public.system_logs TO service_role;
GRANT SELECT ON TABLE public.system_logs TO service_role;
GRANT UPDATE ON TABLE public.system_logs TO service_role;
GRANT DELETE ON TABLE public.system_logs TO service_role;
GRANT TRUNCATE ON TABLE public.system_logs TO service_role;
GRANT REFERENCES ON TABLE public.system_logs TO service_role;
GRANT TRIGGER ON TABLE public.system_logs TO service_role;
GRANT MAINTAIN ON TABLE public.system_logs TO service_role;

REVOKE ALL ON TABLE public.track_spotify_alias FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON TABLE public.track_spotify_alias TO service_role;
GRANT SELECT ON TABLE public.track_spotify_alias TO service_role;
GRANT UPDATE ON TABLE public.track_spotify_alias TO service_role;
GRANT DELETE ON TABLE public.track_spotify_alias TO service_role;
GRANT TRUNCATE ON TABLE public.track_spotify_alias TO service_role;
GRANT REFERENCES ON TABLE public.track_spotify_alias TO service_role;
GRANT TRIGGER ON TABLE public.track_spotify_alias TO service_role;
GRANT MAINTAIN ON TABLE public.track_spotify_alias TO service_role;

REVOKE ALL ON TABLE public.tracks FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.tracks TO anon;
GRANT MAINTAIN ON TABLE public.tracks TO anon;
GRANT INSERT ON TABLE public.tracks TO authenticated;
GRANT SELECT ON TABLE public.tracks TO authenticated;
GRANT UPDATE ON TABLE public.tracks TO authenticated;
GRANT DELETE ON TABLE public.tracks TO authenticated;
GRANT TRUNCATE ON TABLE public.tracks TO authenticated;
GRANT REFERENCES ON TABLE public.tracks TO authenticated;
GRANT TRIGGER ON TABLE public.tracks TO authenticated;
GRANT MAINTAIN ON TABLE public.tracks TO authenticated;
GRANT INSERT ON TABLE public.tracks TO service_role;
GRANT SELECT ON TABLE public.tracks TO service_role;
GRANT UPDATE ON TABLE public.tracks TO service_role;
GRANT DELETE ON TABLE public.tracks TO service_role;
GRANT TRUNCATE ON TABLE public.tracks TO service_role;
GRANT REFERENCES ON TABLE public.tracks TO service_role;
GRANT TRIGGER ON TABLE public.tracks TO service_role;
GRANT MAINTAIN ON TABLE public.tracks TO service_role;

REVOKE ALL ON TABLE public.user_consents FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_consents TO anon;
GRANT MAINTAIN ON TABLE public.user_consents TO anon;
GRANT INSERT ON TABLE public.user_consents TO authenticated;
GRANT SELECT ON TABLE public.user_consents TO authenticated;
GRANT UPDATE ON TABLE public.user_consents TO authenticated;
GRANT DELETE ON TABLE public.user_consents TO authenticated;
GRANT TRUNCATE ON TABLE public.user_consents TO authenticated;
GRANT REFERENCES ON TABLE public.user_consents TO authenticated;
GRANT TRIGGER ON TABLE public.user_consents TO authenticated;
GRANT MAINTAIN ON TABLE public.user_consents TO authenticated;
GRANT INSERT ON TABLE public.user_consents TO service_role;
GRANT SELECT ON TABLE public.user_consents TO service_role;
GRANT UPDATE ON TABLE public.user_consents TO service_role;
GRANT DELETE ON TABLE public.user_consents TO service_role;
GRANT TRUNCATE ON TABLE public.user_consents TO service_role;
GRANT REFERENCES ON TABLE public.user_consents TO service_role;
GRANT TRIGGER ON TABLE public.user_consents TO service_role;
GRANT MAINTAIN ON TABLE public.user_consents TO service_role;

REVOKE ALL ON TABLE public.user_export_signals FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_export_signals TO anon;
GRANT MAINTAIN ON TABLE public.user_export_signals TO anon;
GRANT INSERT ON TABLE public.user_export_signals TO authenticated;
GRANT SELECT ON TABLE public.user_export_signals TO authenticated;
GRANT UPDATE ON TABLE public.user_export_signals TO authenticated;
GRANT DELETE ON TABLE public.user_export_signals TO authenticated;
GRANT TRUNCATE ON TABLE public.user_export_signals TO authenticated;
GRANT REFERENCES ON TABLE public.user_export_signals TO authenticated;
GRANT TRIGGER ON TABLE public.user_export_signals TO authenticated;
GRANT MAINTAIN ON TABLE public.user_export_signals TO authenticated;
GRANT INSERT ON TABLE public.user_export_signals TO service_role;
GRANT SELECT ON TABLE public.user_export_signals TO service_role;
GRANT UPDATE ON TABLE public.user_export_signals TO service_role;
GRANT DELETE ON TABLE public.user_export_signals TO service_role;
GRANT TRUNCATE ON TABLE public.user_export_signals TO service_role;
GRANT REFERENCES ON TABLE public.user_export_signals TO service_role;
GRANT TRIGGER ON TABLE public.user_export_signals TO service_role;
GRANT MAINTAIN ON TABLE public.user_export_signals TO service_role;

REVOKE ALL ON TABLE public.user_genre_vectors FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_genre_vectors TO anon;
GRANT MAINTAIN ON TABLE public.user_genre_vectors TO anon;
GRANT INSERT ON TABLE public.user_genre_vectors TO authenticated;
GRANT SELECT ON TABLE public.user_genre_vectors TO authenticated;
GRANT UPDATE ON TABLE public.user_genre_vectors TO authenticated;
GRANT DELETE ON TABLE public.user_genre_vectors TO authenticated;
GRANT TRUNCATE ON TABLE public.user_genre_vectors TO authenticated;
GRANT REFERENCES ON TABLE public.user_genre_vectors TO authenticated;
GRANT TRIGGER ON TABLE public.user_genre_vectors TO authenticated;
GRANT MAINTAIN ON TABLE public.user_genre_vectors TO authenticated;
GRANT INSERT ON TABLE public.user_genre_vectors TO service_role;
GRANT SELECT ON TABLE public.user_genre_vectors TO service_role;
GRANT UPDATE ON TABLE public.user_genre_vectors TO service_role;
GRANT DELETE ON TABLE public.user_genre_vectors TO service_role;
GRANT TRUNCATE ON TABLE public.user_genre_vectors TO service_role;
GRANT REFERENCES ON TABLE public.user_genre_vectors TO service_role;
GRANT TRIGGER ON TABLE public.user_genre_vectors TO service_role;
GRANT MAINTAIN ON TABLE public.user_genre_vectors TO service_role;

REVOKE ALL ON TABLE public.user_listening_summary_cache FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_listening_summary_cache TO anon;
GRANT MAINTAIN ON TABLE public.user_listening_summary_cache TO anon;
GRANT INSERT ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT SELECT ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT UPDATE ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT DELETE ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT TRUNCATE ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT REFERENCES ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT TRIGGER ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT MAINTAIN ON TABLE public.user_listening_summary_cache TO authenticated;
GRANT INSERT ON TABLE public.user_listening_summary_cache TO service_role;
GRANT SELECT ON TABLE public.user_listening_summary_cache TO service_role;
GRANT UPDATE ON TABLE public.user_listening_summary_cache TO service_role;
GRANT DELETE ON TABLE public.user_listening_summary_cache TO service_role;
GRANT TRUNCATE ON TABLE public.user_listening_summary_cache TO service_role;
GRANT REFERENCES ON TABLE public.user_listening_summary_cache TO service_role;
GRANT TRIGGER ON TABLE public.user_listening_summary_cache TO service_role;
GRANT MAINTAIN ON TABLE public.user_listening_summary_cache TO service_role;

REVOKE ALL ON TABLE public.user_music_intelligence FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_music_intelligence TO anon;
GRANT MAINTAIN ON TABLE public.user_music_intelligence TO anon;
GRANT INSERT ON TABLE public.user_music_intelligence TO authenticated;
GRANT SELECT ON TABLE public.user_music_intelligence TO authenticated;
GRANT UPDATE ON TABLE public.user_music_intelligence TO authenticated;
GRANT DELETE ON TABLE public.user_music_intelligence TO authenticated;
GRANT TRUNCATE ON TABLE public.user_music_intelligence TO authenticated;
GRANT REFERENCES ON TABLE public.user_music_intelligence TO authenticated;
GRANT TRIGGER ON TABLE public.user_music_intelligence TO authenticated;
GRANT MAINTAIN ON TABLE public.user_music_intelligence TO authenticated;
GRANT INSERT ON TABLE public.user_music_intelligence TO service_role;
GRANT SELECT ON TABLE public.user_music_intelligence TO service_role;
GRANT UPDATE ON TABLE public.user_music_intelligence TO service_role;
GRANT DELETE ON TABLE public.user_music_intelligence TO service_role;
GRANT TRUNCATE ON TABLE public.user_music_intelligence TO service_role;
GRANT REFERENCES ON TABLE public.user_music_intelligence TO service_role;
GRANT TRIGGER ON TABLE public.user_music_intelligence TO service_role;
GRANT MAINTAIN ON TABLE public.user_music_intelligence TO service_role;

REVOKE ALL ON TABLE public.user_pattern_pkg FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_pattern_pkg TO anon;
GRANT MAINTAIN ON TABLE public.user_pattern_pkg TO anon;
GRANT INSERT ON TABLE public.user_pattern_pkg TO authenticated;
GRANT SELECT ON TABLE public.user_pattern_pkg TO authenticated;
GRANT UPDATE ON TABLE public.user_pattern_pkg TO authenticated;
GRANT DELETE ON TABLE public.user_pattern_pkg TO authenticated;
GRANT TRUNCATE ON TABLE public.user_pattern_pkg TO authenticated;
GRANT REFERENCES ON TABLE public.user_pattern_pkg TO authenticated;
GRANT TRIGGER ON TABLE public.user_pattern_pkg TO authenticated;
GRANT MAINTAIN ON TABLE public.user_pattern_pkg TO authenticated;
GRANT INSERT ON TABLE public.user_pattern_pkg TO service_role;
GRANT SELECT ON TABLE public.user_pattern_pkg TO service_role;
GRANT UPDATE ON TABLE public.user_pattern_pkg TO service_role;
GRANT DELETE ON TABLE public.user_pattern_pkg TO service_role;
GRANT TRUNCATE ON TABLE public.user_pattern_pkg TO service_role;
GRANT REFERENCES ON TABLE public.user_pattern_pkg TO service_role;
GRANT TRIGGER ON TABLE public.user_pattern_pkg TO service_role;
GRANT MAINTAIN ON TABLE public.user_pattern_pkg TO service_role;

REVOKE ALL ON TABLE public.user_period_pkg FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_period_pkg TO anon;
GRANT MAINTAIN ON TABLE public.user_period_pkg TO anon;
GRANT INSERT ON TABLE public.user_period_pkg TO authenticated;
GRANT SELECT ON TABLE public.user_period_pkg TO authenticated;
GRANT UPDATE ON TABLE public.user_period_pkg TO authenticated;
GRANT DELETE ON TABLE public.user_period_pkg TO authenticated;
GRANT TRUNCATE ON TABLE public.user_period_pkg TO authenticated;
GRANT REFERENCES ON TABLE public.user_period_pkg TO authenticated;
GRANT TRIGGER ON TABLE public.user_period_pkg TO authenticated;
GRANT MAINTAIN ON TABLE public.user_period_pkg TO authenticated;
GRANT INSERT ON TABLE public.user_period_pkg TO service_role;
GRANT SELECT ON TABLE public.user_period_pkg TO service_role;
GRANT UPDATE ON TABLE public.user_period_pkg TO service_role;
GRANT DELETE ON TABLE public.user_period_pkg TO service_role;
GRANT TRUNCATE ON TABLE public.user_period_pkg TO service_role;
GRANT REFERENCES ON TABLE public.user_period_pkg TO service_role;
GRANT TRIGGER ON TABLE public.user_period_pkg TO service_role;
GRANT MAINTAIN ON TABLE public.user_period_pkg TO service_role;

REVOKE ALL ON TABLE public.user_phase_announcements FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_phase_announcements TO anon;
GRANT MAINTAIN ON TABLE public.user_phase_announcements TO anon;
GRANT INSERT ON TABLE public.user_phase_announcements TO authenticated;
GRANT SELECT ON TABLE public.user_phase_announcements TO authenticated;
GRANT UPDATE ON TABLE public.user_phase_announcements TO authenticated;
GRANT DELETE ON TABLE public.user_phase_announcements TO authenticated;
GRANT TRUNCATE ON TABLE public.user_phase_announcements TO authenticated;
GRANT REFERENCES ON TABLE public.user_phase_announcements TO authenticated;
GRANT TRIGGER ON TABLE public.user_phase_announcements TO authenticated;
GRANT MAINTAIN ON TABLE public.user_phase_announcements TO authenticated;
GRANT INSERT ON TABLE public.user_phase_announcements TO service_role;
GRANT SELECT ON TABLE public.user_phase_announcements TO service_role;
GRANT UPDATE ON TABLE public.user_phase_announcements TO service_role;
GRANT DELETE ON TABLE public.user_phase_announcements TO service_role;
GRANT TRUNCATE ON TABLE public.user_phase_announcements TO service_role;
GRANT REFERENCES ON TABLE public.user_phase_announcements TO service_role;
GRANT TRIGGER ON TABLE public.user_phase_announcements TO service_role;
GRANT MAINTAIN ON TABLE public.user_phase_announcements TO service_role;

REVOKE ALL ON TABLE public.user_phase_overrides FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_phase_overrides TO anon;
GRANT MAINTAIN ON TABLE public.user_phase_overrides TO anon;
GRANT INSERT ON TABLE public.user_phase_overrides TO authenticated;
GRANT SELECT ON TABLE public.user_phase_overrides TO authenticated;
GRANT UPDATE ON TABLE public.user_phase_overrides TO authenticated;
GRANT DELETE ON TABLE public.user_phase_overrides TO authenticated;
GRANT TRUNCATE ON TABLE public.user_phase_overrides TO authenticated;
GRANT REFERENCES ON TABLE public.user_phase_overrides TO authenticated;
GRANT TRIGGER ON TABLE public.user_phase_overrides TO authenticated;
GRANT MAINTAIN ON TABLE public.user_phase_overrides TO authenticated;
GRANT INSERT ON TABLE public.user_phase_overrides TO service_role;
GRANT SELECT ON TABLE public.user_phase_overrides TO service_role;
GRANT UPDATE ON TABLE public.user_phase_overrides TO service_role;
GRANT DELETE ON TABLE public.user_phase_overrides TO service_role;
GRANT TRUNCATE ON TABLE public.user_phase_overrides TO service_role;
GRANT REFERENCES ON TABLE public.user_phase_overrides TO service_role;
GRANT TRIGGER ON TABLE public.user_phase_overrides TO service_role;
GRANT MAINTAIN ON TABLE public.user_phase_overrides TO service_role;

REVOKE ALL ON TABLE public.user_plans FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_plans TO anon;
GRANT MAINTAIN ON TABLE public.user_plans TO anon;
GRANT INSERT ON TABLE public.user_plans TO authenticated;
GRANT SELECT ON TABLE public.user_plans TO authenticated;
GRANT UPDATE ON TABLE public.user_plans TO authenticated;
GRANT DELETE ON TABLE public.user_plans TO authenticated;
GRANT TRUNCATE ON TABLE public.user_plans TO authenticated;
GRANT REFERENCES ON TABLE public.user_plans TO authenticated;
GRANT TRIGGER ON TABLE public.user_plans TO authenticated;
GRANT MAINTAIN ON TABLE public.user_plans TO authenticated;
GRANT INSERT ON TABLE public.user_plans TO service_role;
GRANT SELECT ON TABLE public.user_plans TO service_role;
GRANT UPDATE ON TABLE public.user_plans TO service_role;
GRANT DELETE ON TABLE public.user_plans TO service_role;
GRANT TRUNCATE ON TABLE public.user_plans TO service_role;
GRANT REFERENCES ON TABLE public.user_plans TO service_role;
GRANT TRIGGER ON TABLE public.user_plans TO service_role;
GRANT MAINTAIN ON TABLE public.user_plans TO service_role;

REVOKE ALL ON TABLE public.user_preferences FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_preferences TO anon;
GRANT MAINTAIN ON TABLE public.user_preferences TO anon;
GRANT INSERT ON TABLE public.user_preferences TO authenticated;
GRANT SELECT ON TABLE public.user_preferences TO authenticated;
GRANT UPDATE ON TABLE public.user_preferences TO authenticated;
GRANT DELETE ON TABLE public.user_preferences TO authenticated;
GRANT TRUNCATE ON TABLE public.user_preferences TO authenticated;
GRANT REFERENCES ON TABLE public.user_preferences TO authenticated;
GRANT TRIGGER ON TABLE public.user_preferences TO authenticated;
GRANT MAINTAIN ON TABLE public.user_preferences TO authenticated;
GRANT INSERT ON TABLE public.user_preferences TO service_role;
GRANT SELECT ON TABLE public.user_preferences TO service_role;
GRANT UPDATE ON TABLE public.user_preferences TO service_role;
GRANT DELETE ON TABLE public.user_preferences TO service_role;
GRANT TRUNCATE ON TABLE public.user_preferences TO service_role;
GRANT REFERENCES ON TABLE public.user_preferences TO service_role;
GRANT TRIGGER ON TABLE public.user_preferences TO service_role;
GRANT MAINTAIN ON TABLE public.user_preferences TO service_role;

REVOKE ALL ON TABLE public.user_saved_library FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_saved_library TO anon;
GRANT MAINTAIN ON TABLE public.user_saved_library TO anon;
GRANT INSERT ON TABLE public.user_saved_library TO authenticated;
GRANT SELECT ON TABLE public.user_saved_library TO authenticated;
GRANT UPDATE ON TABLE public.user_saved_library TO authenticated;
GRANT DELETE ON TABLE public.user_saved_library TO authenticated;
GRANT TRUNCATE ON TABLE public.user_saved_library TO authenticated;
GRANT REFERENCES ON TABLE public.user_saved_library TO authenticated;
GRANT TRIGGER ON TABLE public.user_saved_library TO authenticated;
GRANT MAINTAIN ON TABLE public.user_saved_library TO authenticated;
GRANT INSERT ON TABLE public.user_saved_library TO service_role;
GRANT SELECT ON TABLE public.user_saved_library TO service_role;
GRANT UPDATE ON TABLE public.user_saved_library TO service_role;
GRANT DELETE ON TABLE public.user_saved_library TO service_role;
GRANT TRUNCATE ON TABLE public.user_saved_library TO service_role;
GRANT REFERENCES ON TABLE public.user_saved_library TO service_role;
GRANT TRIGGER ON TABLE public.user_saved_library TO service_role;
GRANT MAINTAIN ON TABLE public.user_saved_library TO service_role;

REVOKE ALL ON TABLE public.user_stats_pkg FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_stats_pkg TO anon;
GRANT MAINTAIN ON TABLE public.user_stats_pkg TO anon;
GRANT INSERT ON TABLE public.user_stats_pkg TO authenticated;
GRANT SELECT ON TABLE public.user_stats_pkg TO authenticated;
GRANT UPDATE ON TABLE public.user_stats_pkg TO authenticated;
GRANT DELETE ON TABLE public.user_stats_pkg TO authenticated;
GRANT TRUNCATE ON TABLE public.user_stats_pkg TO authenticated;
GRANT REFERENCES ON TABLE public.user_stats_pkg TO authenticated;
GRANT TRIGGER ON TABLE public.user_stats_pkg TO authenticated;
GRANT MAINTAIN ON TABLE public.user_stats_pkg TO authenticated;
GRANT INSERT ON TABLE public.user_stats_pkg TO service_role;
GRANT SELECT ON TABLE public.user_stats_pkg TO service_role;
GRANT UPDATE ON TABLE public.user_stats_pkg TO service_role;
GRANT DELETE ON TABLE public.user_stats_pkg TO service_role;
GRANT TRUNCATE ON TABLE public.user_stats_pkg TO service_role;
GRANT REFERENCES ON TABLE public.user_stats_pkg TO service_role;
GRANT TRIGGER ON TABLE public.user_stats_pkg TO service_role;
GRANT MAINTAIN ON TABLE public.user_stats_pkg TO service_role;

REVOKE ALL ON TABLE public.user_taste_pkg FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_taste_pkg TO anon;
GRANT MAINTAIN ON TABLE public.user_taste_pkg TO anon;
GRANT INSERT ON TABLE public.user_taste_pkg TO authenticated;
GRANT SELECT ON TABLE public.user_taste_pkg TO authenticated;
GRANT UPDATE ON TABLE public.user_taste_pkg TO authenticated;
GRANT DELETE ON TABLE public.user_taste_pkg TO authenticated;
GRANT TRUNCATE ON TABLE public.user_taste_pkg TO authenticated;
GRANT REFERENCES ON TABLE public.user_taste_pkg TO authenticated;
GRANT TRIGGER ON TABLE public.user_taste_pkg TO authenticated;
GRANT MAINTAIN ON TABLE public.user_taste_pkg TO authenticated;
GRANT INSERT ON TABLE public.user_taste_pkg TO service_role;
GRANT SELECT ON TABLE public.user_taste_pkg TO service_role;
GRANT UPDATE ON TABLE public.user_taste_pkg TO service_role;
GRANT DELETE ON TABLE public.user_taste_pkg TO service_role;
GRANT TRUNCATE ON TABLE public.user_taste_pkg TO service_role;
GRANT REFERENCES ON TABLE public.user_taste_pkg TO service_role;
GRANT TRIGGER ON TABLE public.user_taste_pkg TO service_role;
GRANT MAINTAIN ON TABLE public.user_taste_pkg TO service_role;

REVOKE ALL ON TABLE public.user_taste_profile FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_taste_profile TO anon;
GRANT MAINTAIN ON TABLE public.user_taste_profile TO anon;
GRANT INSERT ON TABLE public.user_taste_profile TO authenticated;
GRANT SELECT ON TABLE public.user_taste_profile TO authenticated;
GRANT UPDATE ON TABLE public.user_taste_profile TO authenticated;
GRANT DELETE ON TABLE public.user_taste_profile TO authenticated;
GRANT TRUNCATE ON TABLE public.user_taste_profile TO authenticated;
GRANT REFERENCES ON TABLE public.user_taste_profile TO authenticated;
GRANT TRIGGER ON TABLE public.user_taste_profile TO authenticated;
GRANT MAINTAIN ON TABLE public.user_taste_profile TO authenticated;
GRANT INSERT ON TABLE public.user_taste_profile TO service_role;
GRANT SELECT ON TABLE public.user_taste_profile TO service_role;
GRANT UPDATE ON TABLE public.user_taste_profile TO service_role;
GRANT DELETE ON TABLE public.user_taste_profile TO service_role;
GRANT TRUNCATE ON TABLE public.user_taste_profile TO service_role;
GRANT REFERENCES ON TABLE public.user_taste_profile TO service_role;
GRANT TRIGGER ON TABLE public.user_taste_profile TO service_role;
GRANT MAINTAIN ON TABLE public.user_taste_profile TO service_role;

REVOKE ALL ON TABLE public.user_top_strips FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_top_strips TO anon;
GRANT MAINTAIN ON TABLE public.user_top_strips TO anon;
GRANT INSERT ON TABLE public.user_top_strips TO authenticated;
GRANT SELECT ON TABLE public.user_top_strips TO authenticated;
GRANT UPDATE ON TABLE public.user_top_strips TO authenticated;
GRANT DELETE ON TABLE public.user_top_strips TO authenticated;
GRANT TRUNCATE ON TABLE public.user_top_strips TO authenticated;
GRANT REFERENCES ON TABLE public.user_top_strips TO authenticated;
GRANT TRIGGER ON TABLE public.user_top_strips TO authenticated;
GRANT MAINTAIN ON TABLE public.user_top_strips TO authenticated;
GRANT INSERT ON TABLE public.user_top_strips TO service_role;
GRANT SELECT ON TABLE public.user_top_strips TO service_role;
GRANT UPDATE ON TABLE public.user_top_strips TO service_role;
GRANT DELETE ON TABLE public.user_top_strips TO service_role;
GRANT TRUNCATE ON TABLE public.user_top_strips TO service_role;
GRANT REFERENCES ON TABLE public.user_top_strips TO service_role;
GRANT TRIGGER ON TABLE public.user_top_strips TO service_role;
GRANT MAINTAIN ON TABLE public.user_top_strips TO service_role;

REVOKE ALL ON TABLE public.user_track_weights FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_track_weights TO anon;
GRANT MAINTAIN ON TABLE public.user_track_weights TO anon;
GRANT INSERT ON TABLE public.user_track_weights TO authenticated;
GRANT SELECT ON TABLE public.user_track_weights TO authenticated;
GRANT UPDATE ON TABLE public.user_track_weights TO authenticated;
GRANT DELETE ON TABLE public.user_track_weights TO authenticated;
GRANT TRUNCATE ON TABLE public.user_track_weights TO authenticated;
GRANT REFERENCES ON TABLE public.user_track_weights TO authenticated;
GRANT TRIGGER ON TABLE public.user_track_weights TO authenticated;
GRANT MAINTAIN ON TABLE public.user_track_weights TO authenticated;
GRANT INSERT ON TABLE public.user_track_weights TO service_role;
GRANT SELECT ON TABLE public.user_track_weights TO service_role;
GRANT UPDATE ON TABLE public.user_track_weights TO service_role;
GRANT DELETE ON TABLE public.user_track_weights TO service_role;
GRANT TRUNCATE ON TABLE public.user_track_weights TO service_role;
GRANT REFERENCES ON TABLE public.user_track_weights TO service_role;
GRANT TRIGGER ON TABLE public.user_track_weights TO service_role;
GRANT MAINTAIN ON TABLE public.user_track_weights TO service_role;

REVOKE ALL ON TABLE public.year_pkg FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.year_pkg TO anon;
GRANT MAINTAIN ON TABLE public.year_pkg TO anon;
GRANT INSERT ON TABLE public.year_pkg TO authenticated;
GRANT SELECT ON TABLE public.year_pkg TO authenticated;
GRANT UPDATE ON TABLE public.year_pkg TO authenticated;
GRANT DELETE ON TABLE public.year_pkg TO authenticated;
GRANT TRUNCATE ON TABLE public.year_pkg TO authenticated;
GRANT REFERENCES ON TABLE public.year_pkg TO authenticated;
GRANT TRIGGER ON TABLE public.year_pkg TO authenticated;
GRANT MAINTAIN ON TABLE public.year_pkg TO authenticated;
GRANT INSERT ON TABLE public.year_pkg TO service_role;
GRANT SELECT ON TABLE public.year_pkg TO service_role;
GRANT UPDATE ON TABLE public.year_pkg TO service_role;
GRANT DELETE ON TABLE public.year_pkg TO service_role;
GRANT TRUNCATE ON TABLE public.year_pkg TO service_role;
GRANT REFERENCES ON TABLE public.year_pkg TO service_role;
GRANT TRIGGER ON TABLE public.year_pkg TO service_role;
GRANT MAINTAIN ON TABLE public.year_pkg TO service_role;

-- ─── Yetkiler (fonksiyon) ───

REVOKE ALL ON FUNCTION public._affinity_pct(p_raw real, p_percentile real, p_pool_size integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._affinity_pct(p_raw real, p_percentile real, p_pool_size integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public._affinity_pct(p_raw real, p_percentile real, p_pool_size integer) TO service_role;

REVOKE ALL ON FUNCTION public._affinity_pct_v2(p_score real) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._affinity_pct_v2(p_score real) TO service_role;

REVOKE ALL ON FUNCTION public._is_test_profile(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._is_test_profile(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._is_test_profile(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public._ordered_pair(x uuid, y uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ordered_pair(x uuid, y uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public._ordered_pair(x uuid, y uuid) TO anon;
GRANT EXECUTE ON FUNCTION public._ordered_pair(x uuid, y uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._ordered_pair(x uuid, y uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_pg_cron_ozeti() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_pg_cron_ozeti() TO service_role;

REVOKE ALL ON FUNCTION public.ai_generation_logs_temizle(p_gun integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_generation_logs_temizle(p_gun integer) TO service_role;

REVOKE ALL ON FUNCTION public.ai_gunluk_hata_sayisi(p_operation text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_gunluk_hata_sayisi(p_operation text) TO service_role;

REVOKE ALL ON FUNCTION public.ai_hata_kaydet(p_operation text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_hata_kaydet(p_operation text) TO service_role;

REVOKE ALL ON FUNCTION public.ai_kota_tuket(p_operation text, p_gunluk_tavan integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_kota_tuket(p_operation text, p_gunluk_tavan integer) TO service_role;

REVOKE ALL ON FUNCTION public.ai_log_generation(p_feature text, p_model text, p_prompt_version text, p_input_hash text, p_prompt_tokens integer, p_output_tokens integer, p_latency_ms integer, p_status text, p_user_id uuid, p_error_message text, p_output_payload jsonb, p_cached_tokens integer, p_attempts integer, p_error_code text, p_model_version text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_log_generation(p_feature text, p_model text, p_prompt_version text, p_input_hash text, p_prompt_tokens integer, p_output_tokens integer, p_latency_ms integer, p_status text, p_user_id uuid, p_error_message text, p_output_payload jsonb, p_cached_tokens integer, p_attempts integer, p_error_code text, p_model_version text) TO service_role;

REVOKE ALL ON FUNCTION public.ai_maliyet_ozeti(p_gun_sayisi integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_maliyet_ozeti(p_gun_sayisi integer) TO service_role;

REVOKE ALL ON FUNCTION public.apply_catalog_backfill(p_rows jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_catalog_backfill(p_rows jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.apply_liked_songs_weight(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_liked_songs_weight(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.artist_image_backfill_candidates(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.artist_image_backfill_candidates(p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.audit_recap_coverage(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_recap_coverage(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.audit_secdef_anon_exec() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_secdef_anon_exec() TO service_role;

REVOKE ALL ON FUNCTION public.behavior_affinity(a uuid, b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.behavior_affinity(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.behavior_similarity(a uuid, b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.behavior_similarity(a uuid, b uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.behavior_similarity(a uuid, b uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.behavior_similarity(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.budget_check_and_consume(p_scope text, p_count integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.budget_check_and_consume(p_scope text, p_count integer) TO service_role;

REVOKE ALL ON FUNCTION public.budget_reset(p_scope text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.budget_reset(p_scope text) TO service_role;

REVOKE ALL ON FUNCTION public.budget_status() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.budget_status() TO service_role;

REVOKE ALL ON FUNCTION public.build_journey_arc(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_journey_arc(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.build_journey_arc(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.build_journey_year_pkg(p_user_id uuid, p_covers integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_journey_year_pkg(p_user_id uuid, p_covers integer) TO service_role;

REVOKE ALL ON FUNCTION public.build_mood_pkg(p_user_id uuid, p_mood_key text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_mood_pkg(p_user_id uuid, p_mood_key text) TO service_role;

REVOKE ALL ON FUNCTION public.build_user_pattern_pkg(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_user_pattern_pkg(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.build_user_period_pkg(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_user_period_pkg(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.build_user_stats_pkg(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_user_stats_pkg(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.build_user_taste_pkg(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_user_taste_pkg(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.build_year_pkg(p_user_id uuid, p_year integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_year_pkg(p_user_id uuid, p_year integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.build_year_pkg(p_user_id uuid, p_year integer) TO service_role;

REVOKE ALL ON FUNCTION public.car_listening_summary(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.car_listening_summary(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.car_listening_summary(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.catalog_enrichment_artist_adaylari(p_limit integer, p_havuz_tavani integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_enrichment_artist_adaylari(p_limit integer, p_havuz_tavani integer) TO service_role;

REVOKE ALL ON FUNCTION public.catalog_enrichment_durumu() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_enrichment_durumu() TO service_role;

REVOKE ALL ON FUNCTION public.catalog_enrichment_for_tracks(p_track_ids uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_enrichment_for_tracks(p_track_ids uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.catalog_enrichment_track_adaylari(p_limit integer, p_havuz_tavani integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_enrichment_track_adaylari(p_limit integer, p_havuz_tavani integer) TO service_role;

REVOKE ALL ON FUNCTION public.catalog_item_id(p_item_type text, p_key text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_item_id(p_item_type text, p_key text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_item_id(p_item_type text, p_key text) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_logs(p_days_to_keep integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_logs(p_days_to_keep integer) TO service_role;

REVOKE ALL ON FUNCTION public.completed_years_for_user(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.completed_years_for_user(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.completed_years_for_user(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.compute_user_behavioral_signals(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_user_behavioral_signals(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.compute_user_genre_vector(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_user_genre_vector(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.compute_user_identity(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_user_identity(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.compute_user_mainstream(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_user_mainstream(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.compute_user_music_metrics(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_user_music_metrics(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.compute_user_track_weights(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_user_track_weights(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cooldown_get(p_provider text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cooldown_get(p_provider text) TO service_role;

REVOKE ALL ON FUNCTION public.cooldown_set(p_provider text, p_blocked_until timestamp with time zone, p_reason text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cooldown_set(p_provider text, p_blocked_until timestamp with time zone, p_reason text) TO service_role;

REVOKE ALL ON FUNCTION public.cover_backfill_candidates(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cover_backfill_candidates(p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.cron_sira_al(p_is text, p_aralik interval, p_limit integer, p_kilit interval, p_tur_baslangici timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_sira_al(p_is text, p_aralik interval, p_limit integer, p_kilit interval, p_tur_baslangici timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.cron_sira_birak(p_is text, p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_sira_birak(p_is text, p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cron_sira_durumu(p_is text, p_aralik interval) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_sira_durumu(p_is text, p_aralik interval) TO service_role;

REVOKE ALL ON FUNCTION public.cron_sira_tamamla(p_is text, p_user_id uuid, p_hata text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_sira_tamamla(p_is text, p_user_id uuid, p_hata text) TO service_role;

REVOKE ALL ON FUNCTION public.cron_uygun_kullanicilar(p_is text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_uygun_kullanicilar(p_is text) TO service_role;

REVOKE ALL ON FUNCTION public.davet_listeli_kayit_kapisi() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.davet_listeli_kayit_kapisi() TO service_role;

REVOKE ALL ON FUNCTION public.daylist_identity_contrast(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.daylist_identity_contrast(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.daylist_name_pool(p_user_id uuid, p_min_count integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.daylist_name_pool(p_user_id uuid, p_min_count integer) TO service_role;

REVOKE ALL ON FUNCTION public.deezer_kapak_adaylari_sanatci(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deezer_kapak_adaylari_sanatci(p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.deezer_kapak_adaylari_track(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deezer_kapak_adaylari_track(p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.demo_dinleme_uret(p_user uuid, p_olay integer, p_gun integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demo_dinleme_uret(p_user uuid, p_olay integer, p_gun integer) TO service_role;

REVOKE ALL ON FUNCTION public.demo_kullanici_id(p_kod text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demo_kullanici_id(p_kod text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demo_kullanici_id(p_kod text) TO service_role;

REVOKE ALL ON FUNCTION public.demo_kullanici_idleri() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demo_kullanici_idleri() TO authenticated;
GRANT EXECUTE ON FUNCTION public.demo_kullanici_idleri() TO service_role;

REVOKE ALL ON FUNCTION public.demo_mi(p_user uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demo_mi(p_user uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demo_mi(p_user uuid) TO service_role;

REVOKE ALL ON FUNCTION public.demo_paketleri_uret(p_user uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demo_paketleri_uret(p_user uuid) TO service_role;

REVOKE ALL ON FUNCTION public.discovery_bucket_page(p_user_id uuid, p_bucket text, p_limit integer, p_offset integer, p_min_plays integer, p_max_plays integer, p_stale_days integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discovery_bucket_page(p_user_id uuid, p_bucket text, p_limit integer, p_offset integer, p_min_plays integer, p_max_plays integer, p_stale_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discovery_bucket_page(p_user_id uuid, p_bucket text, p_limit integer, p_offset integer, p_min_plays integer, p_max_plays integer, p_stale_days integer) TO service_role;

REVOKE ALL ON FUNCTION public.enforce_deleted_not_discoverable() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_deleted_not_discoverable() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_deleted_not_discoverable() TO anon;
GRANT EXECUTE ON FUNCTION public.enforce_deleted_not_discoverable() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_deleted_not_discoverable() TO service_role;

REVOKE ALL ON FUNCTION public.genre_cosine(a jsonb, b jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.genre_cosine(a jsonb, b jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.genre_cosine(a jsonb, b jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.genre_cosine(a jsonb, b jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.genre_mood_weight(p_genre text, p_mood text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.genre_mood_weight(p_genre text, p_mood text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.genre_mood_weight(p_genre text, p_mood text) TO service_role;

REVOKE ALL ON FUNCTION public.genre_play_counts_2025(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.genre_play_counts_2025(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.genre_to_archetype_noun(p_genre text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.genre_to_archetype_noun(p_genre text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.genre_to_archetype_noun(p_genre text) TO anon;
GRANT EXECUTE ON FUNCTION public.genre_to_archetype_noun(p_genre text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.genre_to_archetype_noun(p_genre text) TO service_role;

REVOKE ALL ON FUNCTION public.genre_to_label(p_genre text, p_entropy numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.genre_to_label(p_genre text, p_entropy numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.genre_to_label(p_genre text, p_entropy numeric) TO service_role;

REVOKE ALL ON FUNCTION public.get_artist_detail(p_user_id uuid, p_name text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_artist_detail(p_user_id uuid, p_name text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_artist_detail(p_user_id uuid, p_name text) TO service_role;

REVOKE ALL ON FUNCTION public.get_artist_top_tracks(p_user_id uuid, p_name text, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_artist_top_tracks(p_user_id uuid, p_name text, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_artist_top_tracks(p_user_id uuid, p_name text, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_first_played(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_first_played(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_first_played(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_last_played(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_last_played(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_last_played(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_lock_status(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_lock_status(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_mining_events(p_user_id uuid, p_year integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_mining_events(p_user_id uuid, p_year integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_pillar_candidates(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_pillar_candidates(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_survey_state(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_survey_state(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_year_covers(p_user_id uuid, p_year integer, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_year_covers(p_user_id uuid, p_year integer, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_year_covers(p_user_id uuid, p_year integer, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_journey_years(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_journey_years(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_years(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_migration_queue(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_migration_queue(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_mood_weekly_sync_candidates() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_mood_weekly_sync_candidates() TO service_role;

REVOKE ALL ON FUNCTION public.get_mood_workspace(p_mood_key text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_mood_workspace(p_mood_key text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mood_workspace(p_mood_key text) TO service_role;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO service_role;

REVOKE ALL ON FUNCTION public.get_recap_by_label(p_user_id uuid, p_period_label text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_recap_by_label(p_user_id uuid, p_period_label text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recap_by_label(p_user_id uuid, p_period_label text) TO service_role;

REVOKE ALL ON FUNCTION public.get_ritual_state(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ritual_state(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_spotify_capacity() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_spotify_capacity() TO service_role;

REVOKE ALL ON FUNCTION public.get_top_tracks_for_rule(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_skipped boolean, p_min_plays integer, p_hour_from integer, p_hour_to integer, p_sort_by text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_tracks_for_rule(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_skipped boolean, p_min_plays integer, p_hour_from integer, p_hour_to integer, p_sort_by text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_tracks_for_rule(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_skipped boolean, p_min_plays integer, p_hour_from integer, p_hour_to integer, p_sort_by text) TO service_role;

REVOKE ALL ON FUNCTION public.get_track_detail(p_user_id uuid, p_track_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_track_detail(p_user_id uuid, p_track_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_track_detail(p_user_id uuid, p_track_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_track_timeline(p_user_id uuid, p_track_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_track_timeline(p_user_id uuid, p_track_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_track_timeline(p_user_id uuid, p_track_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_user_export_signals(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_export_signals(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_user_plan(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_plan(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_yearly_champion_artists(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_yearly_champion_artists(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_yearly_champion_artists(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.history_top_albums(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.history_top_albums(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.history_top_albums(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) TO service_role;

REVOKE ALL ON FUNCTION public.history_top_artists(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.history_top_artists(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.history_top_artists(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) TO service_role;

REVOKE ALL ON FUNCTION public.history_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.history_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.history_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_sort text, p_offset integer) TO service_role;

REVOKE ALL ON FUNCTION public.inference_label_to_genre(p_label text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inference_label_to_genre(p_label text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inference_label_to_genre(p_label text) TO service_role;

REVOKE ALL ON FUNCTION public.insert_tracks_batch(p_tracks jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.insert_tracks_batch(p_tracks jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.invalidate_journey_years(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invalidate_journey_years(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.invoke_account_purge_cron() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_account_purge_cron() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_auto_playlists_cron() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_auto_playlists_cron() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_catalog_enrichment_cron() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_catalog_enrichment_cron() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_cron_rota(p_yol text, p_timeout_ms integer, p_govde jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_cron_rota(p_yol text, p_timeout_ms integer, p_govde jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.invoke_mood_pkg_cron() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_mood_pkg_cron() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_playlist_refresh_cron() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_playlist_refresh_cron() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_recap_cron() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_recap_cron() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_spotify_sync_cron() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_spotify_sync_cron() TO service_role;

REVOKE ALL ON FUNCTION public.invoke_worker_maintenance_cron(p_task text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_worker_maintenance_cron(p_task text) TO service_role;

REVOKE ALL ON FUNCTION public.is_calendar_word(p_word text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_calendar_word(p_word text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_calendar_word(p_word text) TO service_role;

REVOKE ALL ON FUNCTION public.is_real_user(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_real_user(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.journey_car_top_tracks(p_user_id uuid, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.journey_car_top_tracks(p_user_id uuid, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_car_top_tracks(p_user_id uuid, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.journey_year_facts(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.journey_year_facts(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.kapak_kaynagi_kurali() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kapak_kaynagi_kurali() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kapak_kaynagi_kurali() TO service_role;

REVOKE ALL ON FUNCTION public.katalog_dolgu_adaylari_kullanicilar(p_user_ids uuid[], p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.katalog_dolgu_adaylari_kullanicilar(p_user_ids uuid[], p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.kullanici_sanatcilari(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kullanici_sanatcilari(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kullanici_sanatcilari(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.kullanici_turleri(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kullanici_turleri(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kullanici_turleri(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.liked_songs_page(p_user_id uuid, p_limit integer, p_offset integer, p_sort text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.liked_songs_page(p_user_id uuid, p_limit integer, p_offset integer, p_sort text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liked_songs_page(p_user_id uuid, p_limit integer, p_offset integer, p_sort text) TO service_role;

REVOKE ALL ON FUNCTION public.liked_sync_diff(p_user_id uuid, p_spotify_ids text[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.liked_sync_diff(p_user_id uuid, p_spotify_ids text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liked_sync_diff(p_user_id uuid, p_spotify_ids text[]) TO service_role;

REVOKE ALL ON FUNCTION public.list_recaps(p_user_id uuid, p_period_type text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_recaps(p_user_id uuid, p_period_type text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_recaps(p_user_id uuid, p_period_type text) TO service_role;

REVOKE ALL ON FUNCTION public.mark_mood_exported(p_mood_key text, p_playlist_id text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_mood_exported(p_mood_key text, p_playlist_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_mood_exported(p_mood_key text, p_playlist_id text) TO service_role;

REVOKE ALL ON FUNCTION public.mark_phase_announcement(p_phase smallint, p_action text, p_version smallint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_phase_announcement(p_phase smallint, p_action text, p_version smallint) TO service_role;

REVOKE ALL ON FUNCTION public.materialize_user_top_strips(p_user_id uuid, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.materialize_user_top_strips(p_user_id uuid, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_user_top_strips(p_user_id uuid, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.mood_approved_tracks(p_user_id uuid, p_mood_key text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_approved_tracks(p_user_id uuid, p_mood_key text) TO service_role;

REVOKE ALL ON FUNCTION public.mood_artist_penalty_carpan(p_cikarma_sayisi integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_artist_penalty_carpan(p_cikarma_sayisi integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mood_artist_penalty_carpan(p_cikarma_sayisi integer) TO service_role;

REVOKE ALL ON FUNCTION public.mood_definition_for_key(p_mood_key text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_definition_for_key(p_mood_key text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mood_definition_for_key(p_mood_key text) TO service_role;

REVOKE ALL ON FUNCTION public.mood_geri_bildirim_yansit() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_geri_bildirim_yansit() TO service_role;

REVOKE ALL ON FUNCTION public.mood_kanonik_etiketler(p_etiketler text[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_kanonik_etiketler(p_etiketler text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mood_kanonik_etiketler(p_etiketler text[]) TO service_role;

REVOKE ALL ON FUNCTION public.mood_katalog_uygunluk_hesapla(p_mood_key text, p_track_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_katalog_uygunluk_hesapla(p_mood_key text, p_track_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mood_needs_ai_recuration(p_user_id uuid, p_mood_key text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_needs_ai_recuration(p_user_id uuid, p_mood_key text) TO service_role;

REVOKE ALL ON FUNCTION public.mood_playlist(p_user_id uuid, p_mood_key text, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_playlist(p_user_id uuid, p_mood_key text, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mood_playlist(p_user_id uuid, p_mood_key text, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.mood_profile(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mood_profile(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.pair_overlap_raw(a uuid, b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pair_overlap_raw(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.pair_score_v2(a uuid, b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pair_score_v2(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.paket_gorsel_adaylari_sanatci(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.paket_gorsel_adaylari_sanatci(p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.paket_gorsel_adaylari_sanatci_kullanicilar(p_user_ids uuid[], p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.paket_gorsel_adaylari_sanatci_kullanicilar(p_user_ids uuid[], p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.paket_gorsel_adaylari_track(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.paket_gorsel_adaylari_track(p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.paket_gorsel_adaylari_track_kullanicilar(p_user_ids uuid[], p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.paket_gorsel_adaylari_track_kullanicilar(p_user_ids uuid[], p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.parametreli_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_genres text[], p_artists text[], p_sort_by text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parametreli_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_genres text[], p_artists text[], p_sort_by text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.parametreli_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_genres text[], p_artists text[], p_sort_by text) TO service_role;

REVOKE ALL ON FUNCTION public.plan_daily_migration_limit(p_plan text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plan_daily_migration_limit(p_plan text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_daily_migration_limit(p_plan text) TO service_role;

REVOKE ALL ON FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_uri text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_uri text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_uri text) TO service_role;

REVOKE ALL ON FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.playlist_growth_series(p_user_id uuid, p_playlist_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.playlist_reco_candidates() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.playlist_reco_candidates() TO service_role;

REVOKE ALL ON FUNCTION public.playlist_track_added_dates(p_user_id uuid, p_playlist_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.playlist_track_added_dates(p_user_id uuid, p_playlist_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.playlist_track_added_dates(p_user_id uuid, p_playlist_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.playlist_tracks_page(p_user_id uuid, p_playlist_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.playlist_tracks_page(p_user_id uuid, p_playlist_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.rare_overlap_raw(a uuid, b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rare_overlap_raw(a uuid, b uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rare_overlap_raw(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.reactivate_small_artist_pending() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_small_artist_pending() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_small_artist_pending() TO service_role;

REVOKE ALL ON FUNCTION public.recap_discovery_by_month(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_discovery_by_month(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_discovery_by_month(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_discovery_total(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_discovery_total(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_dominant_genre(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_dominant_genre(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_dominant_genre(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_genre_variety(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_genre_variety(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_hourly_distribution(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_hourly_distribution(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_hourly_pattern(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_hourly_pattern(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_hourly_pattern(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_listening_summary(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_source text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_listening_summary(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_source text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_listening_summary(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_source text) TO service_role;

REVOKE ALL ON FUNCTION public.recap_longest_streak(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_longest_streak(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_longest_streak(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_number_one(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_number_one(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_obsession(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_obsession(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_obsession(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_peak_day(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_peak_day(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_peak_day(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_periods_with_data(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_periods_with_data(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_periods_with_data(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.recap_platform_breakdown(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_platform_breakdown(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_platform_breakdown(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.recap_real_user_ids() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_real_user_ids() TO service_role;

REVOKE ALL ON FUNCTION public.recap_top_albums(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_top_albums(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.recap_top_artists(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_source text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_top_artists(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_source text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_top_artists(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_source text) TO service_role;

REVOKE ALL ON FUNCTION public.recap_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_source text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_source text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recap_top_tracks(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer, p_source text) TO service_role;

REVOKE ALL ON FUNCTION public.recap_user_ids() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recap_user_ids() TO service_role;

REVOKE ALL ON FUNCTION public.record_run(p_run_type text, p_job_id uuid, p_outcome text, p_stats jsonb, p_error text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_run(p_run_type text, p_job_id uuid, p_outcome text, p_stats jsonb, p_error text) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_active_users_batch(p_butce_sn integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_active_users_batch(p_butce_sn integer) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_all_active_users_data() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_all_active_users_data() TO service_role;

REVOKE ALL ON FUNCTION public.refresh_artist_idf() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_artist_idf() TO service_role;

REVOKE ALL ON FUNCTION public.refresh_listening_summary_cache(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_listening_summary_cache(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_user_taste(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_user_taste(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_taste(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.resolve_or_create_track_by_name(p_tracks jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_or_create_track_by_name(p_tracks jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_or_create_track_by_name(p_tracks jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

REVOKE ALL ON FUNCTION public.rosso_bugun() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rosso_bugun() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rosso_bugun() TO service_role;

REVOKE ALL ON FUNCTION public.save_catalog_enrichment(p_item_type text, p_model text, p_items jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_catalog_enrichment(p_item_type text, p_model text, p_items jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.save_mood_pkg_payload(p_user_id uuid, p_mood_key text, p_track_ids uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_mood_pkg_payload(p_user_id uuid, p_mood_key text, p_track_ids uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.save_user_music_intelligence_ai(p_user_id uuid, p_model text, p_sonic_affinities text[], p_genre_core text[], p_genre_peripheral text[], p_avoided_signatures text[], p_listening_habits jsonb, p_musical_paradox text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_user_music_intelligence_ai(p_user_id uuid, p_model text, p_sonic_affinities text[], p_genre_core text[], p_genre_peripheral text[], p_avoided_signatures text[], p_listening_habits jsonb, p_musical_paradox text) TO service_role;

REVOKE ALL ON FUNCTION public.save_year_milestones(p_user_id uuid, p_year integer, p_career text[], p_love text[], p_social text[], p_vibe text[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_year_milestones(p_user_id uuid, p_year integer, p_career text[], p_love text[], p_social text[], p_vibe text[]) TO service_role;

REVOKE ALL ON FUNCTION public.saved_library_page(p_user_id uuid, p_item_type text, p_limit integer, p_offset integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.saved_library_page(p_user_id uuid, p_item_type text, p_limit integer, p_offset integer) TO service_role;

REVOKE ALL ON FUNCTION public.search_my_tracks(p_user_id uuid, p_query text, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_my_tracks(p_user_id uuid, p_query text, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_my_tracks(p_user_id uuid, p_query text, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.set_mood_hidden_tracks(p_mood_key text, p_hidden uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_mood_hidden_tracks(p_mood_key text, p_hidden uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_mood_hidden_tracks(p_mood_key text, p_hidden uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.set_mood_track_feedback(p_mood_key text, p_track_id uuid, p_etiket text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_mood_track_feedback(p_mood_key text, p_track_id uuid, p_etiket text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_mood_track_feedback(p_mood_key text, p_track_id uuid, p_etiket text) TO service_role;

REVOKE ALL ON FUNCTION public.set_mood_weekly_sync(p_mood_key text, p_enabled boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_mood_weekly_sync(p_mood_key text, p_enabled boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_mood_weekly_sync(p_mood_key text, p_enabled boolean) TO service_role;

REVOKE ALL ON FUNCTION public.shuffle_identity(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shuffle_identity(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.shuffle_similarity(a uuid, b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shuffle_similarity(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.soundcapsule_coverage(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soundcapsule_coverage(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.soundcapsule_coverage_audit() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soundcapsule_coverage_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.soundcapsule_coverage_audit() TO service_role;

REVOKE ALL ON FUNCTION public.spotify_byoc_credentials_updated_at() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.spotify_byoc_credentials_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spotify_byoc_credentials_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.strip_overlap(a uuid, b uuid, p_evergreen boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.strip_overlap(a uuid, b uuid, p_evergreen boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strip_overlap(a uuid, b uuid, p_evergreen boolean) TO service_role;

REVOKE ALL ON FUNCTION public.toggle_ritual_answer(p_user_id uuid, p_question_key text, p_year integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_ritual_answer(p_user_id uuid, p_question_key text, p_year integer) TO service_role;

REVOKE ALL ON FUNCTION public.track_genre_plays_2025(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_genre_plays_2025(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.upsert_recap_partial(p_user_id uuid, p_period_type text, p_period_label text, p_period_start date, p_period_end date, p_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_recap_partial(p_user_id uuid, p_period_type text, p_period_label text, p_period_start date, p_period_end date, p_payload jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_recap_partial(p_user_id uuid, p_period_type text, p_period_label text, p_period_start date, p_period_end date, p_payload jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.user_era_shift(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_era_shift(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_era_shift(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.user_genre_all_counts(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_genre_all_counts(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_genre_all_counts(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.user_genre_primary_counts(p_user_id uuid, p_source text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_genre_primary_counts(p_user_id uuid, p_source text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_genre_primary_counts(p_user_id uuid, p_source text) TO service_role;

REVOKE ALL ON FUNCTION public.user_hourly_play_counts(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_hourly_play_counts(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_hourly_play_counts(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.user_liked_track_ids(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_liked_track_ids(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.user_listening_stats(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_listening_stats(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_listening_stats(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.user_most_skipped(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_most_skipped(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_most_skipped(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.user_music_intelligence_needs_ai(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_music_intelligence_needs_ai(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.user_phase(p_user uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_phase(p_user uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_phase(p_user uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_streaks(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_streaks(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_streaks(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.user_weekday_pattern(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_weekday_pattern(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_weekday_pattern(p_user_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.wrapped_engine_inputs(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wrapped_engine_inputs(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.wrapped_taste_similarity(a uuid, b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wrapped_taste_similarity(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.year_has_enough_data(p_user_id uuid, p_year integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.year_has_enough_data(p_user_id uuid, p_year integer) TO service_role;

REVOKE ALL ON FUNCTION public.yearly_top_tracks(p_user_id uuid, p_year integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.yearly_top_tracks(p_user_id uuid, p_year integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.yearly_top_tracks(p_user_id uuid, p_year integer) TO service_role;

REVOKE ALL ON FUNCTION public.zodiac_sign(p_birth date) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.zodiac_sign(p_birth date) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.zodiac_sign(p_birth date) TO anon;
GRANT EXECUTE ON FUNCTION public.zodiac_sign(p_birth date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.zodiac_sign(p_birth date) TO service_role;

-- ─── Storage kovaları ───

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('catalog-images', 'catalog-images', 't', '5242880', '{image/jpeg,image/png,image/webp}') ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('profile-photos', 'profile-photos', 'f', '5242880', '{image/jpeg,image/png,image/webp}') ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('spotify-exports', 'spotify-exports', 'f', '209715200', '{application/zip,application/x-zip-compressed}') ON CONFLICT (id) DO NOTHING;

-- ─── Storage politikaları ───

CREATE POLICY "Kullanici kendi exportunu gorebilir" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'spotify-exports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Kullanici kendi exportunu silebilir" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'spotify-exports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Kullanici kendi exportunu yukleyebilir" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'spotify-exports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY ci_bucket_insert ON storage.objects AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK ((bucket_id = 'catalog-images'::text));

CREATE POLICY ci_bucket_update ON storage.objects AS PERMISSIVE FOR UPDATE TO service_role
  USING ((bucket_id = 'catalog-images'::text));

CREATE POLICY pp_bucket_delete ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY pp_bucket_insert ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY pp_bucket_select ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY pp_bucket_update ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- ─── Başlangıç verisi (yapılandırma tabloları) ───

INSERT INTO public.ai_model_pricing SELECT * FROM jsonb_populate_recordset(NULL::public.ai_model_pricing, '[{"model": "gemini-2.5-flash", "kaynak": "ai.google.dev/gemini-api/docs/pricing (standard tier, text) + onbellek: Vertex ortuk onbellek %90 indirim (context-cache-overview)", "updated_at": "2026-09-19T08:53:06.431112+00:00", "dogrulandi_at": "2026-09-19", "input_usd_per_1m": 0.300000, "output_usd_per_1m": 2.500000, "cached_input_usd_per_1m": 0.030000}, {"model": "gemini-2.5-flash-lite", "kaynak": "ai.google.dev/gemini-api/docs/pricing (standard tier, text) + onbellek: Vertex ortuk onbellek %90 indirim (context-cache-overview)", "updated_at": "2026-09-19T08:53:06.431112+00:00", "dogrulandi_at": "2026-09-19", "input_usd_per_1m": 0.100000, "output_usd_per_1m": 0.400000, "cached_input_usd_per_1m": 0.010000}, {"model": "gemini-2.5-pro", "kaynak": "ai.google.dev/gemini-api/docs/pricing (standard tier, text, <=200k prompt) + onbellek: %90 indirim", "updated_at": "2026-09-19T17:58:57.567255+00:00", "dogrulandi_at": "2026-09-19", "input_usd_per_1m": 1.250000, "output_usd_per_1m": 10.000000, "cached_input_usd_per_1m": 0.125000}]'::jsonb) ON CONFLICT DO NOTHING;

INSERT INTO public.algo_params SELECT * FROM jsonb_populate_recordset(NULL::public.algo_params, '[{"key": "affinity_min", "note": "gosterilen en dusuk yuzde", "value": 1, "measured_at": "2026-08-06T09:17:16.989145+00:00"}, {"key": "affinity_max", "note": "gosterilen en yuksek yuzde", "value": 99, "measured_at": "2026-08-06T09:17:16.989145+00:00"}, {"key": "affinity_x0", "note": "pair_raw medyani (561 cift, 2026-08-06) — TEK gosterim kaynagi", "value": 0.01333, "measured_at": "2026-08-06T09:19:26.635392+00:00"}, {"key": "affinity_k", "note": "4/IQR — pair_raw IQR=0,1244", "value": 55.61, "measured_at": "2026-08-06T09:19:26.635392+00:00"}, {"key": "match_w_music", "note": null, "value": 0.6, "measured_at": "2026-08-10T12:00:30.073867+00:00"}, {"key": "match_w_genre", "note": null, "value": 0.25, "measured_at": "2026-08-10T12:00:30.073867+00:00"}, {"key": "match_w_behavior", "note": null, "value": 0.15, "measured_at": "2026-08-10T12:00:30.073867+00:00"}, {"key": "affinity_v2_x0", "note": null, "value": 0.36, "measured_at": "2026-08-10T12:06:17.637008+00:00"}, {"key": "affinity_v2_k", "note": null, "value": 4.5, "measured_at": "2026-08-10T12:06:17.637008+00:00"}, {"key": "affinity_v2_min", "note": null, "value": 5, "measured_at": "2026-08-10T12:06:17.637008+00:00"}, {"key": "affinity_v2_max", "note": null, "value": 95, "measured_at": "2026-08-10T12:06:17.637008+00:00"}, {"key": "sugg_w_degree2", "note": null, "value": 1, "measured_at": "2026-08-10T17:27:43.055442+00:00"}, {"key": "sugg_w_degree3", "note": null, "value": 0.6, "measured_at": "2026-08-10T17:27:43.055442+00:00"}]'::jsonb) ON CONFLICT DO NOTHING;

INSERT INTO public.api_budgets SELECT * FROM jsonb_populate_recordset(NULL::public.api_budgets, '[{"used": 0, "scope": "spotify:user", "budget": 300, "updated_at": "2026-09-29T00:54:01.093376+00:00", "window_start": "2026-09-28T13:39:01.184771+00:00", "window_seconds": 86400}, {"used": 0, "scope": "spotify:search", "budget": 200, "updated_at": "2026-08-04T23:41:11.360242+00:00", "window_start": "2026-08-04T23:35:47.5577+00:00", "window_seconds": 86400}, {"used": 0, "scope": "spotify:catalog", "budget": 300, "updated_at": "2026-08-04T23:41:11.360242+00:00", "window_start": "2026-08-04T23:35:47.5577+00:00", "window_seconds": 86400}]'::jsonb) ON CONFLICT DO NOTHING;

INSERT INTO public.editorial_tag_pool SELECT * FROM jsonb_populate_recordset(NULL::public.editorial_tag_pool, '[{"slug": "hip-hop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Hip-Hop", "label_tr": "Hip-Hop", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "indie-rock", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Indie Rock", "label_tr": "Indie Rock", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "synth-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Synth-Pop", "label_tr": "Synth-Pop", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "arabesk", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Arabesk", "label_tr": "Arabesk", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "trap", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Trap", "label_tr": "Trap", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "lo-fi", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Lo-Fi", "label_tr": "Lo-Fi", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "shoegaze", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Shoegaze", "label_tr": "Shoegaze", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "dream-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Dream Pop", "label_tr": "Dream Pop", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "country", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Country", "label_tr": "Country", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "disco", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Disco", "label_tr": "Disco", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "drum-and-bass", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Drum & Bass", "label_tr": "Drum & Bass", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "r-and-b", "model": "gemini-2.5-flash", "category": "genre", "label_en": "R&B", "label_tr": "R&B", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "soul", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Soul", "label_tr": "Soul", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "jazz-fusion", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Jazz Fusion", "label_tr": "Caz Füzyon", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "psychedelic-rock", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Psychedelic Rock", "label_tr": "Psikedelik Rock", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "alternative-rock", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Alternative Rock", "label_tr": "Alternatif Rock", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "electronic-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Electronic Pop", "label_tr": "Elektronik Pop", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "techno", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Techno", "label_tr": "Tekno", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "house", "model": "gemini-2.5-flash", "category": "genre", "label_en": "House", "label_tr": "House", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "funk", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Funk", "label_tr": "Funk", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "blues", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Blues", "label_tr": "Blues", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "folk", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Folk", "label_tr": "Folk", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "metal", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Metal", "label_tr": "Metal", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "classical", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Classical", "label_tr": "Klasik", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "ambient", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Ambient", "label_tr": "Ambient", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "gospel", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Gospel", "label_tr": "Gospel", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "reggae", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Reggae", "label_tr": "Reggae", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "salsa", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Salsa", "label_tr": "Salsa", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "latin-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Latin Pop", "label_tr": "Latin Pop", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "k-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "K-Pop", "label_tr": "K-Pop", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "j-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "J-Pop", "label_tr": "J-Pop", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "punk-rock", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Punk Rock", "label_tr": "Punk Rock", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "grunge", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Grunge", "label_tr": "Grunge", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "gothic-rock", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Gothic Rock", "label_tr": "Gotik Rock", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "new-wave", "model": "gemini-2.5-flash", "category": "genre", "label_en": "New Wave", "label_tr": "New Wave", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "electro", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Electro", "label_tr": "Elektro", "created_at": "2026-09-19T17:56:58.956567+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "melancholic", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Melancholic", "label_tr": "Melankolik", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "euphoric", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Euphoric", "label_tr": "Keyifli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "restless", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Restless", "label_tr": "Huzursuz", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "tender", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Tender", "label_tr": "Şefkatli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "defiant", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Defiant", "label_tr": "Asi Ruh", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "nostalgic", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Nostalgic", "label_tr": "Özlem Dolu", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "hazy", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Hazy", "label_tr": "Bulanık", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "dreamy", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Dreamy", "label_tr": "Hayalperest", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "intense", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Intense", "label_tr": "Yoğun", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "calm", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Calm", "label_tr": "Sakin", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "energetic", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Energetic", "label_tr": "Dinamik", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "reflective", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Reflective", "label_tr": "Düşünceli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "mysterious", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Mysterious", "label_tr": "Gizemli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "joyful", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Joyful", "label_tr": "Neşeli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "angsty", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Angsty", "label_tr": "Kaygılı", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "serene", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Serene", "label_tr": "Huzurlu", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "aggressive", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Aggressive", "label_tr": "Agresif", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "uplifting", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Uplifting", "label_tr": "Moral Veren", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "contemplative", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Contemplative", "label_tr": "Derin Düşünce", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "ethereal", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Ethereal", "label_tr": "Ruhani", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "dark", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Dark", "label_tr": "Karanlık", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "playful", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Playful", "label_tr": "Oyunbaz", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "wistful", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Wistful", "label_tr": "Hasretli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "pensive", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Pensive", "label_tr": "Dalgin", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "spirited", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Spirited", "label_tr": "Coşkulu", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "solemn", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Solemn", "label_tr": "Ağırbaşlı", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "vibrant", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Vibrant", "label_tr": "Canlı", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "yearning", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Yearning", "label_tr": "Özlem Duymak", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "haunting", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Haunting", "label_tr": "Akılda Kalan", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "lush", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Lush", "label_tr": "Görkemli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "hypnotic", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Hypnotic", "label_tr": "Hipnotik", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "bittersweet", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Bittersweet", "label_tr": "Acı Tatlı", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "meditative", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Meditative", "label_tr": "Meditatif", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "wanderlust", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Wanderlust", "label_tr": "Gezi İsteği", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "hopeful", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Hopeful", "label_tr": "Umut Dolu", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "bleak", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Bleak", "label_tr": "Kasvetli", "created_at": "2026-09-19T17:57:03.909687+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "slow-burn", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Slow Burn", "label_tr": "Yavaş Akış", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "mid-tempo", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Mid-Tempo", "label_tr": "Orta Tempo", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "driving-rhythms", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Driving Rhythms", "label_tr": "Sürükleyici Ritimler", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "frantic-pace", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Frantic Pace", "label_tr": "Hızlı Tempoda", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "steady-pulse", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Steady Pulse", "label_tr": "Sabit Nabız", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "downtempo-grooves", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Downtempo Grooves", "label_tr": "Yavaş Ritimler", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "upbeat-energy", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Upbeat Energy", "label_tr": "Neşeli Enerji", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "chill-vibes", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Chill Vibes", "label_tr": "Rahatlatıcı Havası", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "mellow-flow", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Mellow Flow", "label_tr": "Sakin Akış", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "energetic-beats", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Energetic Beats", "label_tr": "Enerjik Vuruşlar", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "fast-lane", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Fast Lane", "label_tr": "Hızlı Şerit", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "relaxed-rhythm", "model": "gemini-2.5-flash", "category": "tempo", "label_en": "Relaxed Rhythm", "label_tr": "Rahat Ritim", "created_at": "2026-09-19T17:57:06.18249+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "night-owl", "model": "gemini-2.5-flash", "category": "character", "label_en": "Night Owl", "label_tr": "Gece Kuşu", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "early-bird", "model": "gemini-2.5-flash", "category": "character", "label_en": "Early Bird", "label_tr": "Sabah İnsanı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "loyalist", "model": "gemini-2.5-flash", "category": "character", "label_en": "Loyalist", "label_tr": "Sadık Dinleyici", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "wanderer", "model": "gemini-2.5-flash", "category": "character", "label_en": "Wanderer", "label_tr": "Müzik Gezgini", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "completionist", "model": "gemini-2.5-flash", "category": "character", "label_en": "Completionist", "label_tr": "Tamamlayıcı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "obsessive", "model": "gemini-2.5-flash", "category": "character", "label_en": "Obsessive", "label_tr": "Takıntılı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "explorer", "model": "gemini-2.5-flash", "category": "character", "label_en": "Explorer", "label_tr": "Kaşif Ruhlu", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "creature-of-habit", "model": "gemini-2.5-flash", "category": "character", "label_en": "Creature Of Habit", "label_tr": "Alışkanlık Kölesi", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "genre-bender", "model": "gemini-2.5-flash", "category": "character", "label_en": "Genre Bender", "label_tr": "Tür Bükücü", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "nostalgic-soul", "model": "gemini-2.5-flash", "category": "character", "label_en": "Nostalgic Soul", "label_tr": "Nostaljik Ruh", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "trendsetter", "model": "gemini-2.5-flash", "category": "character", "label_en": "Trendsetter", "label_tr": "Trend Belirleyici", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "relaxed-listener", "model": "gemini-2.5-flash", "category": "character", "label_en": "Relaxed Listener", "label_tr": "Rahat Dinleyici", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "high-energy", "model": "gemini-2.5-flash", "category": "character", "label_en": "High Energy", "label_tr": "Yüksek Enerji", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "chill-seeker", "model": "gemini-2.5-flash", "category": "character", "label_en": "Chill Seeker", "label_tr": "Sakinlik Arayan", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "deep-diver", "model": "gemini-2.5-flash", "category": "character", "label_en": "Deep Diver", "label_tr": "Derinlere Dalış", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "mood-swinger", "model": "gemini-2.5-flash", "category": "character", "label_en": "Mood Swinger", "label_tr": "Ruh Hali Değişken", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "storyteller", "model": "gemini-2.5-flash", "category": "character", "label_en": "Storyteller", "label_tr": "Hikaye Anlatıcısı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "beat-chaser", "model": "gemini-2.5-flash", "category": "character", "label_en": "Beat Chaser", "label_tr": "Ritim Avcısı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "lyric-lover", "model": "gemini-2.5-flash", "category": "character", "label_en": "Lyric Lover", "label_tr": "Şarkı Sözü Aşığı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "instrumentalist", "model": "gemini-2.5-flash", "category": "character", "label_en": "Instrumentalist", "label_tr": "Enstrüman Odaklı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "eclectic-ear", "model": "gemini-2.5-flash", "category": "character", "label_en": "Eclectic Ear", "label_tr": "Eklektik Kulak", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "underground-fan", "model": "gemini-2.5-flash", "category": "character", "label_en": "Underground Fan", "label_tr": "Yeraltı Hayranı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "mainstreamer", "model": "gemini-2.5-flash", "category": "character", "label_en": "Mainstreamer", "label_tr": "Popüler Takipçi", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "discoverer", "model": "gemini-2.5-flash", "category": "character", "label_en": "Discoverer", "label_tr": "Yeni Keşifçi", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "replayer", "model": "gemini-2.5-flash", "category": "character", "label_en": "Replayer", "label_tr": "Tekrar Tekrar", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "mix-master", "model": "gemini-2.5-flash", "category": "character", "label_en": "Mix Master", "label_tr": "Karışım Ustası", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "groove-finder", "model": "gemini-2.5-flash", "category": "character", "label_en": "Groove Finder", "label_tr": "Groove Avcısı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "melody-maker", "model": "gemini-2.5-flash", "category": "character", "label_en": "Melody Maker", "label_tr": "Melodi Yaratıcısı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "sound-scaper", "model": "gemini-2.5-flash", "category": "character", "label_en": "Sound Scaper", "label_tr": "Ses Manzaracı", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "vibe-curator", "model": "gemini-2.5-flash", "category": "character", "label_en": "Vibe Curator", "label_tr": "Vibe Küratörü", "created_at": "2026-09-19T17:57:21.894809+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "new-beginnings", "model": "gemini-2.5-flash", "category": "period", "label_en": "New Beginnings", "label_tr": "Yeni Başlangıçlar", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "quiet-reflection", "model": "gemini-2.5-flash", "category": "period", "label_en": "Quiet Reflection", "label_tr": "Sakin Düşünceler", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "growth-spurt", "model": "gemini-2.5-flash", "category": "period", "label_en": "Growth Spurt", "label_tr": "Büyüme Sancısı", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "steady-pace", "model": "gemini-2.5-flash", "category": "period", "label_en": "Steady Pace", "label_tr": "Dengeli Tempo", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "wild-ride", "model": "gemini-2.5-flash", "category": "period", "label_en": "Wild Ride", "label_tr": "Vahşi Yolculuk", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "calm-waters", "model": "gemini-2.5-flash", "category": "period", "label_en": "Calm Waters", "label_tr": "Sakin Sular", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "shifting-sands", "model": "gemini-2.5-flash", "category": "period", "label_en": "Shifting Sands", "label_tr": "Değişen Kumlar", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "finding-focus", "model": "gemini-2.5-flash", "category": "period", "label_en": "Finding Focus", "label_tr": "Odaklanma Zamanı", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "uncharted-territory", "model": "gemini-2.5-flash", "category": "period", "label_en": "Uncharted Territory", "label_tr": "Bilinmeyen Topraklar", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "deep-dive-era", "model": "gemini-2.5-flash", "category": "period", "label_en": "Deep Dive Era", "label_tr": "Derin Dalış Dönemi", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "comeback-season", "model": "gemini-2.5-flash", "category": "period", "label_en": "Comeback Season", "label_tr": "Geri Dönüş Sezonu", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "reset-button", "model": "gemini-2.5-flash", "category": "period", "label_en": "Reset Button", "label_tr": "Sıfırlama Tuşu", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "creative-bloom", "model": "gemini-2.5-flash", "category": "period", "label_en": "Creative Bloom", "label_tr": "Yaratıcı Patlama", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "healing-journey", "model": "gemini-2.5-flash", "category": "period", "label_en": "Healing Journey", "label_tr": "İyileşme Yolculuğu", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "bold-moves", "model": "gemini-2.5-flash", "category": "period", "label_en": "Bold Moves", "label_tr": "Cesur Adımlar", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "learning-curve", "model": "gemini-2.5-flash", "category": "period", "label_en": "Learning Curve", "label_tr": "Öğrenme Eğrisi", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "comfort-zone", "model": "gemini-2.5-flash", "category": "period", "label_en": "Comfort Zone", "label_tr": "Konfor Alanı", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "building-blocks", "model": "gemini-2.5-flash", "category": "period", "label_en": "Building Blocks", "label_tr": "Yapı Taşları", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "dream-chasing", "model": "gemini-2.5-flash", "category": "period", "label_en": "Dream Chasing", "label_tr": "Hayal Peşinde", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "inner-peace", "model": "gemini-2.5-flash", "category": "period", "label_en": "Inner Peace", "label_tr": "İç Huzur", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "exploration-mode", "model": "gemini-2.5-flash", "category": "period", "label_en": "Exploration Mode", "label_tr": "Keşif Modu", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "sweet-surrender", "model": "gemini-2.5-flash", "category": "period", "label_en": "Sweet Surrender", "label_tr": "Tatlı Teslimiyet", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "rising-tide", "model": "gemini-2.5-flash", "category": "period", "label_en": "Rising Tide", "label_tr": "Yükselen Dalga", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "steady-ascent", "model": "gemini-2.5-flash", "category": "period", "label_en": "Steady Ascent", "label_tr": "İstikrarlı Yükseliş", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "momentum-shift", "model": "gemini-2.5-flash", "category": "period", "label_en": "Momentum Shift", "label_tr": "İvme Değişimi", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "reinvention-period", "model": "gemini-2.5-flash", "category": "period", "label_en": "Reinvention Period", "label_tr": "Yeniden Keşif", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "reflection-point", "model": "gemini-2.5-flash", "category": "period", "label_en": "Reflection Point", "label_tr": "Dönüm Noktası", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "open-road", "model": "gemini-2.5-flash", "category": "period", "label_en": "Open Road", "label_tr": "Açık Yol", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "bright-horizon", "model": "gemini-2.5-flash", "category": "period", "label_en": "Bright Horizon", "label_tr": "Parlak Ufuk", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "soul-searching", "model": "gemini-2.5-flash", "category": "period", "label_en": "Soul Searching", "label_tr": "Kendini Arama", "created_at": "2026-09-19T17:57:27.648012+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "indie-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Indie Pop", "label_tr": "Indie Pop", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "electronic", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Electronic", "label_tr": "Elektronik", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "rock", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Rock", "label_tr": "Rock", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Pop", "label_tr": "Pop", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "jazz", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Jazz", "label_tr": "Jazz", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "punk", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Punk", "label_tr": "Punk", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "boom-bap", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Boom Bap", "label_tr": "Boom Bap", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "dubstep", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Dubstep", "label_tr": "Dubstep", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "blues-rock", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Blues Rock", "label_tr": "Blues Rock", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "art-pop", "model": "gemini-2.5-flash", "category": "genre", "label_en": "Art Pop", "label_tr": "Art Pop", "created_at": "2026-09-22T02:34:02.237575+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "moody", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Moody", "label_tr": "Ruh Hali", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "empowering", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Empowering", "label_tr": "Güç Veren", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "soothing", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Soothing", "label_tr": "Dinlendirici", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "brooding", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Brooding", "label_tr": "Kederli", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "enigmatic", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Enigmatic", "label_tr": "Anlaşılmaz", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "passionate", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Passionate", "label_tr": "Tutkulu", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "upbeat", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Upbeat", "label_tr": "Pozitif", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "whimsical", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Whimsical", "label_tr": "Değişken", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "mellow", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Mellow", "label_tr": "Yatıştırıcı", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "epic", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Epic", "label_tr": "Destansı", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "gentle", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Gentle", "label_tr": "Nazik", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "deep", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Deep", "label_tr": "Derin Hisler", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "awakening", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Awakening", "label_tr": "Uyanış", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "shadowy", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Shadowy", "label_tr": "Gölgeli", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}, {"slug": "triumphant", "model": "gemini-2.5-flash", "category": "mood", "label_en": "Triumphant", "label_tr": "Muzaffer", "created_at": "2026-09-22T02:34:07.653623+00:00", "prompt_version": "etiket-havuzu-v2"}]'::jsonb) ON CONFLICT DO NOTHING;

INSERT INTO public.mood_definitions SELECT * FROM jsonb_populate_recordset(NULL::public.mood_definitions, E'[{"kimlik": "Pure adrenaline. Volume, distortion, speed. The sound of something about to break.", "olmali": "Relentless, loud, physically forceful from the first bar.", "mood_key": "full_throttle", "olmamali": "Mid-tempo, moody, romantic, introspective or ambient. A slow-building song does not belong here even if the artist is heavy.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["high", "explosive"], "energy_ideal": ["explosive", "high"], "enstrumantal": "none", "negatif_tags": ["sakin", "romantik", "ruya", "melankoli", "atmosferik"], "pozitif_tags": ["agresif", "enerjik", "sert", "ozguven"], "negatif_genres": [], "pozitif_genres": ["rock", "metal", "metalcore", "hard rock", "punk", "pop punk", "trap", "drill", "rap", "hip-hop", "industrial metal"]}, {"kimlik": "The window seat and the road that keeps unfolding. Motion without urgency; the landscape doing the work.", "olmali": "Wide, spacious, forward-moving. Long builds, horizon-shaped. Melancholy is welcome; restlessness is not.", "mood_key": "miles_away", "olmamali": "Club, party, street-boastful or aggressive. Short punchy tracks that reset every two minutes.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium", "high"], "energy_ideal": ["low", "medium"], "enstrumantal": "none", "negatif_tags": ["parti", "agresif", "sert", "ozguven"], "pozitif_tags": ["atmosferik", "ruya", "melankoli", "icedonuk", "nostalji"], "negatif_genres": [], "pozitif_genres": ["cinematic", "atmospheric", "post-rock", "synthwave", "indie rock", "alternative rock", "downtempo", "ambient"]}, {"kimlik": "The exact hour when sleep will not come and the world has gone quiet. Not \\"night music\\" in general, but the narrow, sleepless, slightly unwell version of it.", "olmali": "Hushed, unresolved, close to silence. Something that keeps you company without waking you further.", "mood_key": "gece_217", "olmamali": "Grand, orchestral, ritual, triumphant, folk-ceremonial or metal. A majestic symphony and a viking chant are both NIGHT-COLOURED and both completely wrong here: they fill the room instead of thinning it.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium"], "energy_ideal": ["low"], "enstrumantal": "none", "negatif_tags": ["parti", "enerjik", "agresif", "epik", "ozguven", "umutlu"], "pozitif_tags": ["sakin", "melankoli", "icedonuk", "ruya", "karanlik", "gece", "atmosferik"], "negatif_genres": [], "pozitif_genres": ["ambient", "post-rock", "downtempo", "instrumental", "singer-songwriter", "folk"]}, {"kimlik": "The active hours, when the day is moving with you. Daytime momentum, not a workout.", "olmali": "Bright, moving, sociable. Music that fits a day with things in it.", "mood_key": "daylight", "olmamali": "Heavy melancholy, ambient drift or 3 a.m. darkness.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["medium", "high"], "energy_ideal": ["medium", "high"], "enstrumantal": "none", "negatif_tags": ["melankoli", "karanlik", "atmosferik"], "pozitif_tags": ["enerjik", "umutlu", "parti", "ozguven", "sert"], "negatif_genres": [], "pozitif_genres": ["pop", "indie pop", "dance", "funk", "disco", "r&b", "indie rock"]}, {"kimlik": "What Rosso would put on for this listener today: their centre of gravity, plus a little of what they have been circling lately.", "olmali": "Recognisably theirs. A mix of what they keep returning to and a few things they only recently found.", "mood_key": "your_day", "olmamali": "Nothing is structurally excluded here: this playlist is defined by the listener, not by a mood.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": [], "energy_ideal": [], "enstrumantal": "none", "negatif_tags": [], "pozitif_tags": ["sakin", "melankoli", "icedonuk", "enerjik", "umutlu", "nostalji", "romantik", "ruya", "atmosferik", "ozguven", "parti", "sert", "karanlik", "gece"], "negatif_genres": [], "pozitif_genres": []}, {"kimlik": "The hour when the day starts letting go. The light is going but the night has not begun.", "olmali": "Golden, slowing, slightly nostalgic. A transition, not a destination.", "mood_key": "dusk", "olmamali": "Aggressive or club-facing, which belongs to the NIGHT; and not fully hushed either, which belongs to 2:17 AM.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium"], "energy_ideal": ["low", "medium"], "enstrumantal": "none", "negatif_tags": ["agresif", "parti", "epik", "enerjik"], "pozitif_tags": ["atmosferik", "melankoli", "nostalji", "ruya", "sakin", "romantik"], "negatif_genres": [], "pozitif_genres": ["synthwave", "indie rock", "r&b", "melodic", "downtempo", "soul"]}, {"kimlik": "The wider sound of this listener''s nights: the whole night, not only the sleepless hour.", "olmali": "Night-coloured in any register: dark, dreamy, slow-burning, occasionally driving. Broader and more awake than 2:17 AM.", "mood_key": "nocturne", "olmamali": "Bright morning optimism, party euphoria or ceremonial grandeur.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium", "high"], "energy_ideal": ["low", "medium"], "enstrumantal": "none", "negatif_tags": ["parti", "umutlu", "epik"], "pozitif_tags": ["gece", "karanlik", "ruya", "atmosferik", "melankoli", "icedonuk"], "negatif_genres": [], "pozitif_genres": ["ambient", "synthwave", "indie rock", "r&b", "dream pop", "downtempo", "electronic", "alternative"]}, {"kimlik": "The private, inward playlist for the moments when something tightens inside. Sadness that is sat with, not performed.", "olmali": "Quiet, unhurried, emotionally honest — but SUNG. Rock, alternative, indie or hip-hop that happens to be sad. Turkish alternative and rap belong here as much as English indie.", "mood_key": "quiet_side", "olmamali": "Classical, instrumental, lo-fi beats, film score or ambient drift — this is sadness with a VOICE, not background music. Also not heavy metal or reggae. A beautiful piano piece is the most common mistake here: it is quiet and sad and still completely wrong.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium"], "energy_ideal": ["low"], "enstrumantal": "none", "negatif_tags": ["parti", "agresif", "ozguven", "epik", "enerjik"], "pozitif_tags": ["sakin", "melankoli", "icedonuk", "atmosferik", "ruya"], "negatif_genres": ["reggae", "metal", "metalcore", "hard rock", "death metal", "black metal", "industrial metal", "punk", "pop punk"], "pozitif_genres": ["rock", "alternatif", "indie rock", "alternative rock", "pop", "indie pop", "art pop", "hip-hop", "r&b", "soul", "t-pop"]}, {"kimlik": "The space between two people. Warm, close, unhurried.", "olmali": "Romantic, flirtatious, sensual. Warm and close. Turkish pop, R&B, hip-hop and alternative all belong.", "mood_key": "closer", "olmamali": "MELANCHOLIC above all — a sad love song is not a close one. Also not aggressive, boastful or crowd-facing.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium", "high"], "energy_ideal": ["low", "medium"], "enstrumantal": "none", "negatif_tags": ["melankoli", "agresif", "parti", "sert", "epik"], "pozitif_tags": ["romantik", "sakin", "ruya", "atmosferik"], "negatif_genres": [], "pozitif_genres": ["pop", "r&b", "soul", "indie pop", "art pop", "funk", "alternatif", "hip-hop", "t-pop", "indie rock"]}, {"kimlik": "Beside the first coffee. A soft entry into a day that has not started yet.", "olmali": "Gentle, clear, slightly hopeful. Nothing that demands a decision.", "mood_key": "first_light", "olmamali": "Dark, aggressive, club-facing or heavy. Nothing left over from last night.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium"], "energy_ideal": ["low", "medium"], "enstrumantal": "none", "negatif_tags": ["agresif", "parti", "karanlik", "epik"], "pozitif_tags": ["sakin", "umutlu", "ruya", "atmosferik", "nostalji"], "negatif_genres": [], "pozitif_genres": ["indie pop", "synthwave", "r&b", "soul", "indie folk", "reggae"]}, {"kimlik": "Physical effort. The set you are already failing, one more rep. The base of this playlist is METAL; hip-hop is the second pillar.", "olmali": "Hard hitting, high tempo, aggressive or boastful. Metalcore, hard rock and aggressive rap all belong. A track that raises heart rate on its own.", "mood_key": "no_limit", "olmamali": "Melancholic, romantic, chill, lo-fi or reflective — EVEN IF the genre is hip-hop or trap. A sad rap song is the single most common mistake in this playlist: the genre is right and the function is completely wrong.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["high", "explosive"], "energy_ideal": ["explosive", "high"], "enstrumantal": "none", "negatif_tags": ["sakin", "melankoli", "romantik", "ruya", "icedonuk", "atmosferik"], "pozitif_tags": ["enerjik", "agresif", "ozguven", "sert"], "negatif_genres": [], "pozitif_genres": ["metal", "metalcore", "hard rock", "death metal", "black metal", "industrial metal", "punk", "pop punk", "rock", "alternative rock", "trap", "drill", "hip-hop", "rap", "pop rap", "hardstyle", "dubstep"]}, {"kimlik": "Deep-work background. Music that occupies the room without occupying attention. Ideally wordless.", "olmali": "Instrumental. Film score, cinematic, classical, some lo-fi. Repetitive, steady, low-contrast. Grandeur is fine when it is a soundtrack; it is the room, not the event.", "mood_key": "locked_in", "olmamali": "Vocal hooks, sing-along choruses, aggression, drops. Also ritual, ethnic or battle-chant music: it is cinematic but you cannot study through it.", "updated_at": "2026-09-20T06:04:14.534803+00:00", "energy_allow": ["low", "medium"], "energy_ideal": ["low", "medium"], "enstrumantal": "require", "negatif_tags": ["agresif", "parti", "ozguven", "enerjik", "sert"], "pozitif_tags": ["atmosferik", "sakin", "ruya", "icedonuk"], "negatif_genres": [], "pozitif_genres": ["instrumental", "klasik", "film müzikleri", "cinematic", "ambient", "post-rock", "downtempo", "lo-fi hip-hop"]}]'::jsonb) ON CONFLICT DO NOTHING;

INSERT INTO public.mood_tag_sozlugu SELECT * FROM jsonb_populate_recordset(NULL::public.mood_tag_sozlugu, '[{"ham": "calm", "kanonik": "sakin"}, {"ham": "peaceful", "kanonik": "sakin"}, {"ham": "serene", "kanonik": "sakin"}, {"ham": "relaxed", "kanonik": "sakin"}, {"ham": "relaxing", "kanonik": "sakin"}, {"ham": "laid-back", "kanonik": "sakin"}, {"ham": "laidback", "kanonik": "sakin"}, {"ham": "mellow", "kanonik": "sakin"}, {"ham": "chill", "kanonik": "sakin"}, {"ham": "soothing", "kanonik": "sakin"}, {"ham": "gentle", "kanonik": "sakin"}, {"ham": "tranquil", "kanonik": "sakin"}, {"ham": "soft", "kanonik": "sakin"}, {"ham": "quiet", "kanonik": "sakin"}, {"ham": "warm", "kanonik": "sakin"}, {"ham": "smooth", "kanonik": "sakin"}, {"ham": "melancholy", "kanonik": "melankoli"}, {"ham": "melancholic", "kanonik": "melankoli"}, {"ham": "sad", "kanonik": "melankoli"}, {"ham": "somber", "kanonik": "melankoli"}, {"ham": "wistful", "kanonik": "melankoli"}, {"ham": "yearning", "kanonik": "melankoli"}, {"ham": "sorrowful", "kanonik": "melankoli"}, {"ham": "bittersweet", "kanonik": "melankoli"}, {"ham": "heartbroken", "kanonik": "melankoli"}, {"ham": "longing", "kanonik": "melankoli"}, {"ham": "emotional", "kanonik": "melankoli"}, {"ham": "sentimental", "kanonik": "melankoli"}, {"ham": "heartfelt", "kanonik": "melankoli"}, {"ham": "cathartic", "kanonik": "melankoli"}, {"ham": "dreamy", "kanonik": "ruya"}, {"ham": "ethereal", "kanonik": "ruya"}, {"ham": "hypnotic", "kanonik": "ruya"}, {"ham": "trippy", "kanonik": "ruya"}, {"ham": "hazy", "kanonik": "ruya"}, {"ham": "psychedelic", "kanonik": "ruya"}, {"ham": "floaty", "kanonik": "ruya"}, {"ham": "shimmering", "kanonik": "ruya"}, {"ham": "introspective", "kanonik": "icedonuk"}, {"ham": "reflective", "kanonik": "icedonuk"}, {"ham": "contemplative", "kanonik": "icedonuk"}, {"ham": "thoughtful", "kanonik": "icedonuk"}, {"ham": "thought-provoking", "kanonik": "icedonuk"}, {"ham": "brooding", "kanonik": "icedonuk"}, {"ham": "pensive", "kanonik": "icedonuk"}, {"ham": "philosophical", "kanonik": "icedonuk"}, {"ham": "storytelling", "kanonik": "icedonuk"}, {"ham": "serious", "kanonik": "icedonuk"}, {"ham": "atmospheric", "kanonik": "atmosferik"}, {"ham": "cinematic", "kanonik": "atmosferik"}, {"ham": "expansive", "kanonik": "atmosferik"}, {"ham": "ambient", "kanonik": "atmosferik"}, {"ham": "spacious", "kanonik": "atmosferik"}, {"ham": "immersive", "kanonik": "atmosferik"}, {"ham": "meditative", "kanonik": "atmosferik"}, {"ham": "minimal", "kanonik": "atmosferik"}, {"ham": "textural", "kanonik": "atmosferik"}, {"ham": "romantic", "kanonik": "romantik"}, {"ham": "sensual", "kanonik": "romantik"}, {"ham": "sultry", "kanonik": "romantik"}, {"ham": "seductive", "kanonik": "romantik"}, {"ham": "intimate", "kanonik": "romantik"}, {"ham": "flirty", "kanonik": "romantik"}, {"ham": "tender", "kanonik": "romantik"}, {"ham": "loving", "kanonik": "romantik"}, {"ham": "affectionate", "kanonik": "romantik"}, {"ham": "dark", "kanonik": "karanlik"}, {"ham": "menacing", "kanonik": "karanlik"}, {"ham": "ominous", "kanonik": "karanlik"}, {"ham": "sinister", "kanonik": "karanlik"}, {"ham": "eerie", "kanonik": "karanlik"}, {"ham": "mysterious", "kanonik": "karanlik"}, {"ham": "enigmatic", "kanonik": "karanlik"}, {"ham": "haunting", "kanonik": "karanlik"}, {"ham": "moody", "kanonik": "karanlik"}, {"ham": "aggressive", "kanonik": "agresif"}, {"ham": "angry", "kanonik": "agresif"}, {"ham": "furious", "kanonik": "agresif"}, {"ham": "violent", "kanonik": "agresif"}, {"ham": "raw", "kanonik": "agresif"}, {"ham": "intense", "kanonik": "agresif"}, {"ham": "heavy", "kanonik": "agresif"}, {"ham": "ferocious", "kanonik": "agresif"}, {"ham": "brutal", "kanonik": "agresif"}, {"ham": "angsty", "kanonik": "agresif"}, {"ham": "harsh", "kanonik": "agresif"}, {"ham": "energetic", "kanonik": "enerjik"}, {"ham": "upbeat", "kanonik": "enerjik"}, {"ham": "hype", "kanonik": "enerjik"}, {"ham": "driving", "kanonik": "enerjik"}, {"ham": "anthemic", "kanonik": "enerjik"}, {"ham": "powerful", "kanonik": "enerjik"}, {"ham": "explosive", "kanonik": "enerjik"}, {"ham": "euphoric", "kanonik": "enerjik"}, {"ham": "relentless", "kanonik": "enerjik"}, {"ham": "pumping", "kanonik": "enerjik"}, {"ham": "fast", "kanonik": "enerjik"}, {"ham": "confident", "kanonik": "ozguven"}, {"ham": "boastful", "kanonik": "ozguven"}, {"ham": "braggadocious", "kanonik": "ozguven"}, {"ham": "swagger", "kanonik": "ozguven"}, {"ham": "assertive", "kanonik": "ozguven"}, {"ham": "cocky", "kanonik": "ozguven"}, {"ham": "empowering", "kanonik": "ozguven"}, {"ham": "defiant", "kanonik": "ozguven"}, {"ham": "rebellious", "kanonik": "ozguven"}, {"ham": "bold", "kanonik": "ozguven"}, {"ham": "triumphant", "kanonik": "ozguven"}, {"ham": "party", "kanonik": "parti"}, {"ham": "club", "kanonik": "parti"}, {"ham": "danceable", "kanonik": "parti"}, {"ham": "dance", "kanonik": "parti"}, {"ham": "festival", "kanonik": "parti"}, {"ham": "nightlife", "kanonik": "parti"}, {"ham": "groovy", "kanonik": "parti"}, {"ham": "summery", "kanonik": "parti"}, {"ham": "summer", "kanonik": "parti"}, {"ham": "feel-good", "kanonik": "parti"}, {"ham": "playful", "kanonik": "parti"}, {"ham": "catchy", "kanonik": "parti"}, {"ham": "fun", "kanonik": "parti"}, {"ham": "celebratory", "kanonik": "parti"}, {"ham": "glamorous", "kanonik": "parti"}, {"ham": "nostalgic", "kanonik": "nostalji"}, {"ham": "retro", "kanonik": "nostalji"}, {"ham": "timeless", "kanonik": "nostalji"}, {"ham": "vintage", "kanonik": "nostalji"}, {"ham": "classic", "kanonik": "nostalji"}, {"ham": "epic", "kanonik": "epik"}, {"ham": "grand", "kanonik": "epik"}, {"ham": "majestic", "kanonik": "epik"}, {"ham": "solemn", "kanonik": "epik"}, {"ham": "dramatic", "kanonik": "epik"}, {"ham": "theatrical", "kanonik": "epik"}, {"ham": "heroic", "kanonik": "epik"}, {"ham": "orchestral", "kanonik": "epik"}, {"ham": "ritualistic", "kanonik": "epik"}, {"ham": "pagan", "kanonik": "epik"}, {"ham": "monumental", "kanonik": "epik"}, {"ham": "gritty", "kanonik": "sert"}, {"ham": "street", "kanonik": "sert"}, {"ham": "urban", "kanonik": "sert"}, {"ham": "rough", "kanonik": "sert"}, {"ham": "hard", "kanonik": "sert"}, {"ham": "edgy", "kanonik": "sert"}, {"ham": "underground", "kanonik": "sert"}, {"ham": "authentic", "kanonik": "sert"}, {"ham": "nocturnal", "kanonik": "gece"}, {"ham": "night-time", "kanonik": "gece"}, {"ham": "late-night", "kanonik": "gece"}, {"ham": "nighttime", "kanonik": "gece"}, {"ham": "midnight", "kanonik": "gece"}, {"ham": "hopeful", "kanonik": "umutlu"}, {"ham": "optimistic", "kanonik": "umutlu"}, {"ham": "uplifting", "kanonik": "umutlu"}, {"ham": "joyful", "kanonik": "umutlu"}, {"ham": "bright", "kanonik": "umutlu"}, {"ham": "cheerful", "kanonik": "umutlu"}, {"ham": "inspiring", "kanonik": "umutlu"}, {"ham": "sunny", "kanonik": "umutlu"}, {"ham": "late night", "kanonik": "gece"}, {"ham": "late night drive", "kanonik": "gece"}, {"ham": "late night thoughts", "kanonik": "gece"}, {"ham": "urban night", "kanonik": "gece"}, {"ham": "noir", "kanonik": "gece"}, {"ham": "after hours", "kanonik": "gece"}, {"ham": "3am", "kanonik": "gece"}, {"ham": "rave", "kanonik": "parti"}, {"ham": "clubby", "kanonik": "parti"}, {"ham": "club banger", "kanonik": "parti"}, {"ham": "underground club", "kanonik": "parti"}, {"ham": "summer party", "kanonik": "parti"}, {"ham": "poolside", "kanonik": "parti"}, {"ham": "dancefloor", "kanonik": "parti"}, {"ham": "mosh pit", "kanonik": "enerjik"}, {"ham": "stadium rock", "kanonik": "enerjik"}, {"ham": "dynamic", "kanonik": "enerjik"}, {"ham": "workout", "kanonik": "enerjik"}, {"ham": "adrenaline", "kanonik": "enerjik"}, {"ham": "banger", "kanonik": "enerjik"}, {"ham": "chaotic", "kanonik": "agresif"}, {"ham": "tough", "kanonik": "agresif"}, {"ham": "abrasive", "kanonik": "agresif"}, {"ham": "confrontational", "kanonik": "agresif"}, {"ham": "mournful", "kanonik": "melankoli"}, {"ham": "depressive", "kanonik": "melankoli"}, {"ham": "vulnerable", "kanonik": "melankoli"}, {"ham": "regretful", "kanonik": "melankoli"}, {"ham": "lonely", "kanonik": "melankoli"}, {"ham": "lovelorn", "kanonik": "melankoli"}, {"ham": "road trip", "kanonik": "atmosferik"}, {"ham": "driving at night", "kanonik": "atmosferik"}, {"ham": "widescreen", "kanonik": "atmosferik"}, {"ham": "soundtrack", "kanonik": "atmosferik"}, {"ham": "panoramic", "kanonik": "atmosferik"}, {"ham": "rainy day", "kanonik": "sakin"}, {"ham": "coffee shop", "kanonik": "sakin"}, {"ham": "rainy-window", "kanonik": "sakin"}, {"ham": "study", "kanonik": "sakin"}, {"ham": "background", "kanonik": "sakin"}, {"ham": "unhurried", "kanonik": "sakin"}, {"ham": "fantasy", "kanonik": "karanlik"}, {"ham": "dark academia", "kanonik": "karanlik"}, {"ham": "gothic", "kanonik": "karanlik"}, {"ham": "occult", "kanonik": "karanlik"}, {"ham": "expressive", "kanonik": "icedonuk"}, {"ham": "confessional", "kanonik": "icedonuk"}, {"ham": "narrative", "kanonik": "icedonuk"}, {"ham": "positive", "kanonik": "umutlu"}, {"ham": "triumph", "kanonik": "umutlu"}, {"ham": "warm-hearted", "kanonik": "umutlu"}]'::jsonb) ON CONFLICT DO NOTHING;

-- ─── Kayıt kapısı (auth.users) ───
DROP TRIGGER IF EXISTS davet_listeli_kayit_kapisi ON auth.users;
CREATE TRIGGER davet_listeli_kayit_kapisi
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.davet_listeli_kayit_kapisi();
