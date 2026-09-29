export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Rosso saf Spotify platformudur (CLAUDE.md §4). Bu satır ELLE korunur:
 * tip üretimi her çalıştığında siliniyor, `scripts/db-tipleri-yaz.mjs` geri ekler.
 */
export type Platform = 'spotify'

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletions: {
        Row: {
          deleted_at: string
          deleted_by: string
          deleted_reason: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by: string
          deleted_reason?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string
          deleted_reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_generation_logs: {
        Row: {
          attempts: number
          cached_tokens: number
          created_at: string
          error_code: string | null
          error_message: string | null
          estimated_cost: number | null
          feature: string
          generation_id: string
          input_hash: string
          latency_ms: number
          model: string
          model_version: string | null
          output_payload: Json | null
          output_tokens: number
          prompt_tokens: number
          prompt_version: string
          status: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          attempts?: number
          cached_tokens?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          feature: string
          generation_id?: string
          input_hash: string
          latency_ms?: number
          model: string
          model_version?: string | null
          output_payload?: Json | null
          output_tokens?: number
          prompt_tokens?: number
          prompt_version: string
          status: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          attempts?: number
          cached_tokens?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          feature?: string
          generation_id?: string
          input_hash?: string
          latency_ms?: number
          model?: string
          model_version?: string | null
          output_payload?: Json | null
          output_tokens?: number
          prompt_tokens?: number
          prompt_version?: string
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      ai_model_pricing: {
        Row: {
          cached_input_usd_per_1m: number | null
          dogrulandi_at: string
          input_usd_per_1m: number
          kaynak: string
          model: string
          output_usd_per_1m: number
          updated_at: string
        }
        Insert: {
          cached_input_usd_per_1m?: number | null
          dogrulandi_at: string
          input_usd_per_1m: number
          kaynak: string
          model: string
          output_usd_per_1m: number
          updated_at?: string
        }
        Update: {
          cached_input_usd_per_1m?: number | null
          dogrulandi_at?: string
          input_usd_per_1m?: number
          kaynak?: string
          model?: string
          output_usd_per_1m?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_counter: {
        Row: {
          cagri_sayisi: number
          gun: string
          hata_sayisi: number
          operation: string
          updated_at: string
        }
        Insert: {
          cagri_sayisi?: number
          gun: string
          hata_sayisi?: number
          operation: string
          updated_at?: string
        }
        Update: {
          cagri_sayisi?: number
          gun?: string
          hata_sayisi?: number
          operation?: string
          updated_at?: string
        }
        Relationships: []
      }
      algo_params: {
        Row: {
          key: string
          measured_at: string
          note: string | null
          value: number
        }
        Insert: {
          key: string
          measured_at?: string
          note?: string | null
          value: number
        }
        Update: {
          key?: string
          measured_at?: string
          note?: string | null
          value?: number
        }
        Relationships: []
      }
      api_budgets: {
        Row: {
          budget: number
          scope: string
          updated_at: string
          used: number
          window_seconds: number
          window_start: string
        }
        Insert: {
          budget: number
          scope: string
          updated_at?: string
          used?: number
          window_seconds?: number
          window_start?: string
        }
        Update: {
          budget?: number
          scope?: string
          updated_at?: string
          used?: number
          window_seconds?: number
          window_start?: string
        }
        Relationships: []
      }
      api_cooldowns: {
        Row: {
          blocked_until: string | null
          hit_count: number
          provider: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          blocked_until?: string | null
          hit_count?: number
          provider: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          blocked_until?: string | null
          hit_count?: number
          provider?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cron_kullanici_sirasi: {
        Row: {
          ardisik_hata: number
          guncellendi: string
          is_adi: string
          kilit_bitis: string | null
          son_hata: string | null
          son_tamamlanma: string | null
          user_id: string
        }
        Insert: {
          ardisik_hata?: number
          guncellendi?: string
          is_adi: string
          kilit_bitis?: string | null
          son_hata?: string | null
          son_tamamlanma?: string | null
          user_id: string
        }
        Update: {
          ardisik_hata?: number
          guncellendi?: string
          is_adi?: string
          kilit_bitis?: string | null
          son_hata?: string | null
          son_tamamlanma?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kullanici_animasyonlari: {
        Row: {
          anahtar: string
          gorulme_at: string
          user_id: string
        }
        Insert: {
          anahtar: string
          gorulme_at?: string
          user_id: string
        }
        Update: {
          anahtar?: string
          gorulme_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          created_at: string | null
          genre_data: Json | null
          genre_lookup_failed_at: string | null
          genre_source: string | null
          genres: string[] | null
          id: string
          deezer_image_url: string | null
          deezer_kapak_denendi_at: string | null
          image_kaynagi: string | null
          image_url: string | null
          name: string
          name_normalized: string
          refreshed_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          genre_data?: Json | null
          genre_lookup_failed_at?: string | null
          genre_source?: string | null
          genres?: string[] | null
          id?: string
          deezer_image_url?: string | null
          deezer_kapak_denendi_at?: string | null
          image_kaynagi?: string | null
          image_url?: string | null
          name: string
          name_normalized: string
          refreshed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          genre_data?: Json | null
          genre_lookup_failed_at?: string | null
          genre_source?: string | null
          genres?: string[] | null
          id?: string
          deezer_image_url?: string | null
          deezer_kapak_denendi_at?: string | null
          image_kaynagi?: string | null
          image_url?: string | null
          name?: string
          name_normalized?: string
          refreshed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auto_playlist_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name_format: string
          rule_type: string
          sort_by: string
          target_platforms: string[]
          track_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name_format?: string
          rule_type: string
          sort_by?: string
          target_platforms?: string[]
          track_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name_format?: string
          rule_type?: string
          sort_by?: string
          target_platforms?: string[]
          track_count?: number
          user_id?: string
        }
        Relationships: []
      }
      auto_playlist_runs: {
        Row: {
          error_message: string | null
          generated_playlist_id: string | null
          id: string
          platform: string
          ran_at: string
          rule_id: string
          status: string
          track_count: number
        }
        Insert: {
          error_message?: string | null
          generated_playlist_id?: string | null
          id?: string
          platform: string
          ran_at?: string
          rule_id: string
          status?: string
          track_count?: number
        }
        Update: {
          error_message?: string | null
          generated_playlist_id?: string | null
          id?: string
          platform?: string
          ran_at?: string
          rule_id?: string
          status?: string
          track_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "auto_playlist_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "auto_playlist_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      car_sessions: {
        Row: {
          connected_at: string
          disconnected_at: string | null
          duration_seconds: number | null
          id: string
          import_job_id: string | null
          user_id: string
        }
        Insert: {
          connected_at: string
          disconnected_at?: string | null
          duration_seconds?: number | null
          id?: string
          import_job_id?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string
          disconnected_at?: string | null
          duration_seconds?: number | null
          id?: string
          import_job_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_sessions_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "export_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_ai_enrichment: {
        Row: {
          confidence_score: number
          created_at: string
          energy_character: string | null
          enrichment_version: number
          era_context: string | null
          id: string
          item_id: string
          item_type: string
          language: string | null
          model_used: string
          moods: string[]
          primary_genre: string
          sonic_character: string[]
          subgenres: string[]
          tempo_character: string | null
          updated_at: string
          vibe: string[]
        }
        Insert: {
          confidence_score: number
          created_at?: string
          energy_character?: string | null
          enrichment_version?: number
          era_context?: string | null
          id?: string
          item_id: string
          item_type: string
          language?: string | null
          model_used: string
          moods?: string[]
          primary_genre: string
          sonic_character?: string[]
          subgenres?: string[]
          tempo_character?: string | null
          updated_at?: string
          vibe?: string[]
        }
        Update: {
          confidence_score?: number
          created_at?: string
          energy_character?: string | null
          enrichment_version?: number
          era_context?: string | null
          id?: string
          item_id?: string
          item_type?: string
          language?: string | null
          model_used?: string
          moods?: string[]
          primary_genre?: string
          sonic_character?: string[]
          subgenres?: string[]
          tempo_character?: string | null
          updated_at?: string
          vibe?: string[]
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          receiver_id: string
          resolved_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          receiver_id: string
          resolved_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          receiver_id?: string
          resolved_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          opened_via: string
          status: string
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_via: string
          status?: string
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_via?: string
          status?: string
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      discover_contrast_slots: {
        Row: {
          batch_date: string
          behavior_sim: number
          candidate_id: string
          created_at: string
          from_social: boolean
          genre_contrast: number
          position: number
          relax_level: number
          user_id: string
        }
        Insert: {
          batch_date?: string
          behavior_sim?: number
          candidate_id: string
          created_at?: string
          from_social?: boolean
          genre_contrast?: number
          position?: number
          relax_level?: number
          user_id: string
        }
        Update: {
          batch_date?: string
          behavior_sim?: number
          candidate_id?: string
          created_at?: string
          from_social?: boolean
          genre_contrast?: number
          position?: number
          relax_level?: number
          user_id?: string
        }
        Relationships: []
      }
      editorial_notes: {
        Row: {
          body: Json
          generated_at: string
          input_hash: string
          kind: string
          model: string
          prompt_version: string
          scope: string
          user_id: string
        }
        Insert: {
          body: Json
          generated_at?: string
          input_hash: string
          kind: string
          model: string
          prompt_version: string
          scope: string
          user_id: string
        }
        Update: {
          body?: Json
          generated_at?: string
          input_hash?: string
          kind?: string
          model?: string
          prompt_version?: string
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      editorial_tag_pool: {
        Row: {
          category: string
          created_at: string
          label_en: string
          label_tr: string
          model: string
          prompt_version: string
          slug: string
        }
        Insert: {
          category: string
          created_at?: string
          label_en: string
          label_tr: string
          model: string
          prompt_version: string
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          label_en?: string
          label_tr?: string
          model?: string
          prompt_version?: string
          slug?: string
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_count: number | null
          error_message: string | null
          export_type: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          genre_pending: boolean
          id: string
          matched_events: number | null
          period_end: string | null
          period_start: string | null
          pipeline_step: string | null
          processed_events: number | null
          recovery_queued_at: string | null
          skipped_events: number | null
          started_at: string | null
          status: string
          total_events: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          error_message?: string | null
          export_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          genre_pending?: boolean
          id?: string
          matched_events?: number | null
          period_end?: string | null
          period_start?: string | null
          pipeline_step?: string | null
          processed_events?: number | null
          recovery_queued_at?: string | null
          skipped_events?: number | null
          started_at?: string | null
          status?: string
          total_events?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          error_message?: string | null
          export_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          genre_pending?: boolean
          id?: string
          matched_events?: number | null
          period_end?: string | null
          period_start?: string | null
          pipeline_step?: string | null
          processed_events?: number | null
          recovery_queued_at?: string | null
          skipped_events?: number | null
          started_at?: string | null
          status?: string
          total_events?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      izinli_eposta: {
        Row: {
          created_at: string
          ekleyen: string | null
          email: string
          sahip: boolean
        }
        Insert: {
          created_at?: string
          ekleyen?: string | null
          email: string
          sahip?: boolean
        }
        Update: {
          created_at?: string
          ekleyen?: string | null
          email?: string
          sahip?: boolean
        }
        Relationships: []
      }
      journey_arc: {
        Row: {
          generated_at: string
          payload: Json
          user_id: string
        }
        Insert: {
          generated_at?: string
          payload: Json
          user_id: string
        }
        Update: {
          generated_at?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      journey_ritual_answers: {
        Row: {
          answered_at: string
          question_key: string
          user_id: string
          year: number
        }
        Insert: {
          answered_at?: string
          question_key: string
          user_id: string
          year: number
        }
        Update: {
          answered_at?: string
          question_key?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      journey_year_milestones: {
        Row: {
          answered_at: string
          career: string[]
          love: string[]
          social: string[]
          updated_at: string
          user_id: string
          vibe: string[]
          year: number
        }
        Insert: {
          answered_at?: string
          career: string[]
          love: string[]
          social: string[]
          updated_at?: string
          user_id: string
          vibe: string[]
          year: number
        }
        Update: {
          answered_at?: string
          career?: string[]
          love?: string[]
          social?: string[]
          updated_at?: string
          user_id?: string
          vibe?: string[]
          year?: number
        }
        Relationships: []
      }
      journey_year_pkg: {
        Row: {
          generated_at: string
          is_closed: boolean
          payload: Json
          tz: string
          user_id: string
          year: number
        }
        Insert: {
          generated_at?: string
          is_closed?: boolean
          payload: Json
          tz?: string
          user_id: string
          year: number
        }
        Update: {
          generated_at?: string
          is_closed?: boolean
          payload?: Json
          tz?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      liked_songs_events: {
        Row: {
          event_type: string
          external_id: string | null
          id: string
          import_job_id: string | null
          occurred_at: string
          platform: string
          spotify_uri: string | null
          user_id: string
        }
        Insert: {
          event_type: string
          external_id?: string | null
          id?: string
          import_job_id?: string | null
          occurred_at: string
          platform?: string
          spotify_uri?: string | null
          user_id: string
        }
        Update: {
          event_type?: string
          external_id?: string | null
          id?: string
          import_job_id?: string | null
          occurred_at?: string
          platform?: string
          spotify_uri?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liked_songs_events_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "export_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_watermark: {
        Row: {
          job_key: string
          last_scan_at: string
          updated_at: string
        }
        Insert: {
          job_key: string
          last_scan_at?: string
          updated_at?: string
        }
        Update: {
          job_key?: string
          last_scan_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_daily_slots: {
        Row: {
          batch_date: string
          candidate_id: string
          created_at: string
          ever_pool_max: number
          evergreen_overlap: number | null
          evergreen_raw: number
          id: string
          match_type: string
          now_overlap: number | null
          now_pool_max: number
          now_raw: number
          pool_size: number
          rare_pool_max: number
          rare_raw: number
          rare_score: number
          raw_score: number
          shared_rare: Json | null
          state: string
          user_id: string
        }
        Insert: {
          batch_date: string
          candidate_id: string
          created_at?: string
          ever_pool_max?: number
          evergreen_overlap?: number | null
          evergreen_raw?: number
          id?: string
          match_type?: string
          now_overlap?: number | null
          now_pool_max?: number
          now_raw?: number
          pool_size?: number
          rare_pool_max?: number
          rare_raw?: number
          rare_score?: number
          raw_score: number
          shared_rare?: Json | null
          state?: string
          user_id: string
        }
        Update: {
          batch_date?: string
          candidate_id?: string
          created_at?: string
          ever_pool_max?: number
          evergreen_overlap?: number | null
          evergreen_raw?: number
          id?: string
          match_type?: string
          now_overlap?: number | null
          now_pool_max?: number
          now_raw?: number
          pool_size?: number
          rare_pool_max?: number
          rare_raw?: number
          rare_score?: number
          raw_score?: number
          shared_rare?: Json | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      match_passes: {
        Row: {
          created_at: string
          passed_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          passed_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          passed_id?: string
          user_id?: string
        }
        Relationships: []
      }
      match_requests: {
        Row: {
          created_at: string
          id: string
          raw_score: number | null
          receiver_id: string
          resolved_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_score?: number | null
          receiver_id: string
          resolved_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_score?: number | null
          receiver_id?: string
          resolved_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          debug_log: Json | null
          error_message: string | null
          id: string
          matched: number
          playlist_id: string | null
          source: string
          started_at: string | null
          status: string
          target: string
          total: number
          unmatched: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          debug_log?: Json | null
          error_message?: string | null
          id?: string
          matched?: number
          playlist_id?: string | null
          source: string
          started_at?: string | null
          status?: string
          target: string
          total?: number
          unmatched?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          debug_log?: Json | null
          error_message?: string | null
          id?: string
          matched?: number
          playlist_id?: string | null
          source?: string
          started_at?: string | null
          status?: string
          target?: string
          total?: number
          unmatched?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_jobs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_queue: {
        Row: {
          auto_sync: boolean
          completed_at: string | null
          created_at: string
          done_tracks: number
          error_message: string | null
          failed_tracks: number
          id: string
          last_batch_at: string | null
          playlist_id: string
          playlist_name: string
          position: number
          source: string
          started_at: string | null
          status: string
          target: string
          target_playlist_id: string | null
          total_tracks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync?: boolean
          completed_at?: string | null
          created_at?: string
          done_tracks?: number
          error_message?: string | null
          failed_tracks?: number
          id?: string
          last_batch_at?: string | null
          playlist_id: string
          playlist_name: string
          position?: number
          source: string
          started_at?: string | null
          status?: string
          target: string
          target_playlist_id?: string | null
          total_tracks?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync?: boolean
          completed_at?: string | null
          created_at?: string
          done_tracks?: number
          error_message?: string | null
          failed_tracks?: number
          id?: string
          last_batch_at?: string | null
          playlist_id?: string
          playlist_name?: string
          position?: number
          source?: string
          started_at?: string | null
          status?: string
          target?: string
          target_playlist_id?: string | null
          total_tracks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_queue_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_queue_items: {
        Row: {
          queue_id: string
          reason: string | null
          status: string
          target_id: string | null
          track_id: string
          updated_at: string
        }
        Insert: {
          queue_id: string
          reason?: string | null
          status?: string
          target_id?: string | null
          track_id: string
          updated_at?: string
        }
        Update: {
          queue_id?: string
          reason?: string | null
          status?: string
          target_id?: string | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_queue_items_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "migration_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_queue_items_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_pkg: {
        Row: {
          generated_at: string
          mood_key: string
          payload: Json
          tz: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          mood_key: string
          payload: Json
          tz?: string
          user_id: string
        }
        Update: {
          generated_at?: string
          mood_key?: string
          payload?: Json
          tz?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_track_feedback: {
        Row: {
          created_at: string
          etiket: string
          mood_key: string
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          etiket: string
          mood_key: string
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          etiket?: string
          mood_key?: string
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_track_feedback_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_workspace: {
        Row: {
          approved_track_ids: string[]
          exported_at: string | null
          exported_playlist_id: string | null
          hidden_track_ids: string[]
          mood_key: string
          updated_at: string
          user_id: string
          weekly_sync_enabled: boolean
        }
        Insert: {
          approved_track_ids?: string[]
          exported_at?: string | null
          exported_playlist_id?: string | null
          hidden_track_ids?: string[]
          mood_key: string
          updated_at?: string
          user_id: string
          weekly_sync_enabled?: boolean
        }
        Update: {
          approved_track_ids?: string[]
          exported_at?: string | null
          exported_playlist_id?: string | null
          hidden_track_ids?: string[]
          mood_key?: string
          updated_at?: string
          user_id?: string
          weekly_sync_enabled?: boolean
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          job_id: string | null
          outcome: string
          run_type: string
          stats: Json | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          outcome: string
          run_type: string
          stats?: Json | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          outcome?: string
          run_type?: string
          stats?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "export_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token: string | null
          apple_reauth_required: boolean
          connected_at: string | null
          export_covers_from: string | null
          export_covers_until: string | null
          export_imported: boolean | null
          export_imported_at: string | null
          id: string
          is_active: boolean | null
          last_recently_played_sync_at: string | null
          last_synced_at: string | null
          music_user_token: string | null
          oauth_client_id: string | null
          platform: string
          refresh_token: string | null
          spotify_email: string | null
          spotify_user_id: string | null
          storefront: string | null
          subscription_active: boolean | null
          token_expires: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          apple_reauth_required?: boolean
          connected_at?: string | null
          export_covers_from?: string | null
          export_covers_until?: string | null
          export_imported?: boolean | null
          export_imported_at?: string | null
          id?: string
          is_active?: boolean | null
          last_recently_played_sync_at?: string | null
          last_synced_at?: string | null
          music_user_token?: string | null
          oauth_client_id?: string | null
          platform: string
          refresh_token?: string | null
          spotify_email?: string | null
          spotify_user_id?: string | null
          storefront?: string | null
          subscription_active?: boolean | null
          token_expires?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          apple_reauth_required?: boolean
          connected_at?: string | null
          export_covers_from?: string | null
          export_covers_until?: string | null
          export_imported?: boolean | null
          export_imported_at?: string | null
          id?: string
          is_active?: boolean | null
          last_recently_played_sync_at?: string | null
          last_synced_at?: string | null
          music_user_token?: string | null
          oauth_client_id?: string | null
          platform?: string
          refresh_token?: string | null
          spotify_email?: string | null
          spotify_user_id?: string | null
          storefront?: string | null
          subscription_active?: boolean | null
          token_expires?: string | null
          user_id?: string
        }
        Relationships: []
      }
      play_events: {
        Row: {
          conn_country: string | null
          id: string
          incognito_mode: boolean | null
          ms_played: number
          offline: boolean | null
          platform: string
          played_at: string
          reason_end: string | null
          reason_start: string | null
          shuffle: boolean | null
          skipped: boolean | null
          source: string
          track_id: string
          user_id: string
        }
        Insert: {
          conn_country?: string | null
          id?: string
          incognito_mode?: boolean | null
          ms_played: number
          offline?: boolean | null
          platform?: string
          played_at: string
          reason_end?: string | null
          reason_start?: string | null
          shuffle?: boolean | null
          skipped?: boolean | null
          source?: string
          track_id: string
          user_id: string
        }
        Update: {
          conn_country?: string | null
          id?: string
          incognito_mode?: boolean | null
          ms_played?: number
          offline?: boolean | null
          platform?: string
          played_at?: string
          reason_end?: string | null
          reason_start?: string | null
          shuffle?: boolean | null
          skipped?: boolean | null
          source?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_track_events: {
        Row: {
          added_at: string
          id: string
          import_job_id: string | null
          platform: string | null
          playlist_uri: string
          track_uri: string
          user_id: string
        }
        Insert: {
          added_at: string
          id?: string
          import_job_id?: string | null
          platform?: string | null
          playlist_uri: string
          track_uri: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          import_job_id?: string | null
          platform?: string | null
          playlist_uri?: string
          track_uri?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_track_events_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "export_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_tracks: {
        Row: {
          added_at: string | null
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_at?: string | null
          playlist_id: string
          position: number
          track_id: string
        }
        Update: {
          added_at?: string | null
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_public: boolean | null
          name: string
          platform: string
          platform_id: string | null
          snapshot_id: string | null
          synced_at: string | null
          track_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          name: string
          platform: string
          platform_id?: string | null
          snapshot_id?: string | null
          synced_at?: string | null
          track_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          name?: string
          platform?: string
          platform_id?: string | null
          snapshot_id?: string | null
          synced_at?: string | null
          track_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      podcast_events: {
        Row: {
          audiobook_title: string | null
          audiobook_uri: string | null
          content_type: string
          episode_name: string | null
          episode_show_name: string | null
          id: string
          ms_played: number
          offline: boolean | null
          platform: string
          played_at: string
          skipped: boolean | null
          source: string
          spotify_episode_uri: string | null
          user_id: string
        }
        Insert: {
          audiobook_title?: string | null
          audiobook_uri?: string | null
          content_type?: string
          episode_name?: string | null
          episode_show_name?: string | null
          id?: string
          ms_played: number
          offline?: boolean | null
          platform?: string
          played_at: string
          skipped?: boolean | null
          source?: string
          spotify_episode_uri?: string | null
          user_id: string
        }
        Update: {
          audiobook_title?: string | null
          audiobook_uri?: string | null
          content_type?: string
          episode_name?: string | null
          episode_show_name?: string | null
          id?: string
          ms_played?: number
          offline?: boolean | null
          platform?: string
          played_at?: string
          skipped?: boolean | null
          source?: string
          spotify_episode_uri?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_hidden_items: {
        Row: {
          created_at: string
          item_key: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_key: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_key?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_interests: {
        Row: {
          interest_key: string
          user_id: string
        }
        Insert: {
          interest_key: string
          user_id: string
        }
        Update: {
          interest_key?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          created_at: string
          id: string
          is_main: boolean
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_main?: boolean
          position?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_main?: boolean
          position?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_prompts: {
        Row: {
          answer: string
          position: number
          prompt_key: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          answer: string
          position?: number
          prompt_key: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          position?: number
          prompt_key?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_prompts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      recaps: {
        Row: {
          generated_at: string
          id: string
          payload: Json
          period_end: string
          period_label: string
          period_start: string
          period_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          payload?: Json
          period_end: string
          period_label: string
          period_start: string
          period_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          payload?: Json
          period_end?: string
          period_label?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string
          created_at: string
          detail: string | null
          id: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          category: string
          created_at?: string
          detail?: string | null
          id?: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      social_profiles: {
        Row: {
          bio: string | null
          birth_date: string
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          display_name: string | null
          featured_playlist_id: string | null
          gender: string
          gender_pref: string[]
          is_discoverable: boolean
          lat: number | null
          lon: number | null
          occupation: string | null
          onboarded_at: string | null
          university: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          bio?: string | null
          birth_date: string
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          display_name?: string | null
          featured_playlist_id?: string | null
          gender: string
          gender_pref?: string[]
          is_discoverable?: boolean
          lat?: number | null
          lon?: number | null
          occupation?: string | null
          onboarded_at?: string | null
          university?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          bio?: string | null
          birth_date?: string
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          display_name?: string | null
          featured_playlist_id?: string | null
          gender?: string
          gender_pref?: string[]
          is_discoverable?: boolean
          lat?: number | null
          lon?: number | null
          occupation?: string | null
          onboarded_at?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_featured_playlist_id_fkey"
            columns: ["featured_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      spotify_allowlist_requests: {
        Row: {
          activated_at: string | null
          approved_at: string | null
          id: string
          note: string | null
          requested_at: string
          spotify_email: string | null
          spotify_user_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          approved_at?: string | null
          id?: string
          note?: string | null
          requested_at?: string
          spotify_email?: string | null
          spotify_user_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          approved_at?: string | null
          id?: string
          note?: string | null
          requested_at?: string
          spotify_email?: string | null
          spotify_user_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_byoc_credentials: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      suggestion_daily_pkg: {
        Row: {
          batch_date: string
          candidate_id: string
          created_at: string
          id: string
          score: number
          source: string
          state: string
          user_id: string
        }
        Insert: {
          batch_date: string
          candidate_id: string
          created_at?: string
          id?: string
          score: number
          source: string
          state?: string
          user_id: string
        }
        Update: {
          batch_date?: string
          candidate_id?: string
          created_at?: string
          id?: string
          score?: number
          source?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestion_passes: {
        Row: {
          created_at: string
          passed_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          passed_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          passed_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_rules: {
        Row: {
          conflict_policy: string
          created_at: string
          enabled: boolean
          id: string
          last_synced_at: string | null
          playlist_id: string
          target_platforms: string[]
          user_id: string
        }
        Insert: {
          conflict_policy?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_synced_at?: string | null
          playlist_id: string
          target_platforms?: string[]
          user_id: string
        }
        Update: {
          conflict_policy?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_synced_at?: string | null
          playlist_id?: string
          target_platforms?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_rules_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          added: number
          errors: number
          id: string
          ran_at: string
          removed: number
          rule_id: string
          skipped_removals: number
          status: string
        }
        Insert: {
          added?: number
          errors?: number
          id?: string
          ran_at?: string
          removed?: number
          rule_id: string
          skipped_removals?: number
          status?: string
        }
        Update: {
          added?: number
          errors?: number
          id?: string
          ran_at?: string
          removed?: number
          rule_id?: string
          skipped_removals?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "sync_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          operation: string
          platform: string | null
          related_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation: string
          platform?: string | null
          related_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          platform?: string | null
          related_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      track_spotify_alias: {
        Row: {
          created_at: string
          kaynak: string
          spotify_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          kaynak?: string
          spotify_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          kaynak?: string
          spotify_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_spotify_alias_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          album: string | null
          apple_id: string | null
          artists: string[]
          catalog_backfill_at: string | null
          created_at: string | null
          duration_ms: number | null
          genre_data: Json | null
          genre_lookup_failed_at: string | null
          genre_pending_reason: string | null
          genre_source: string | null
          genres: string[] | null
          id: string
          deezer_image_url: string | null
          deezer_kapak_denendi_at: string | null
          image_kaynagi: string | null
          image_url: string | null
          isrc: string | null
          release_year: number | null
          spotify_artist_ids: string[] | null
          spotify_id: string | null
          title: string
          updated_at: string | null
          yt_video_id: string | null
        }
        Insert: {
          album?: string | null
          apple_id?: string | null
          artists: string[]
          catalog_backfill_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          genre_data?: Json | null
          genre_lookup_failed_at?: string | null
          genre_pending_reason?: string | null
          genre_source?: string | null
          genres?: string[] | null
          id?: string
          deezer_image_url?: string | null
          deezer_kapak_denendi_at?: string | null
          image_kaynagi?: string | null
          image_url?: string | null
          isrc?: string | null
          release_year?: number | null
          spotify_artist_ids?: string[] | null
          spotify_id?: string | null
          title: string
          updated_at?: string | null
          yt_video_id?: string | null
        }
        Update: {
          album?: string | null
          apple_id?: string | null
          artists?: string[]
          catalog_backfill_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          genre_data?: Json | null
          genre_lookup_failed_at?: string | null
          genre_pending_reason?: string | null
          genre_source?: string | null
          genres?: string[] | null
          id?: string
          deezer_image_url?: string | null
          deezer_kapak_denendi_at?: string | null
          image_kaynagi?: string | null
          image_url?: string | null
          isrc?: string | null
          release_year?: number | null
          spotify_artist_ids?: string[] | null
          spotify_id?: string | null
          title?: string
          updated_at?: string | null
          yt_video_id?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          granted: boolean
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          consent_type: string
          granted: boolean
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          consent_type?: string
          granted?: boolean
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_export_signals: {
        Row: {
          export_job_id: string | null
          id: string
          imported_at: string | null
          signal_data: Json
          signal_source: string
          user_id: string
        }
        Insert: {
          export_job_id?: string | null
          id?: string
          imported_at?: string | null
          signal_data: Json
          signal_source: string
          user_id: string
        }
        Update: {
          export_job_id?: string | null
          id?: string
          imported_at?: string | null
          signal_data?: Json
          signal_source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_export_signals_export_job_id_fkey"
            columns: ["export_job_id"]
            isOneToOne: false
            referencedRelation: "export_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_genre_vectors: {
        Row: {
          computed_at: string
          contributing_tracks: number
          dominant_genre: string | null
          updated_at: string
          user_id: string
          vector: Json
        }
        Insert: {
          computed_at?: string
          contributing_tracks?: number
          dominant_genre?: string | null
          updated_at?: string
          user_id: string
          vector?: Json
        }
        Update: {
          computed_at?: string
          contributing_tracks?: number
          dominant_genre?: string | null
          updated_at?: string
          user_id?: string
          vector?: Json
        }
        Relationships: []
      }
      user_listening_summary_cache: {
        Row: {
          refreshed_at: string
          total_artists: number
          total_ms: number
          total_tracks: number
          user_id: string
        }
        Insert: {
          refreshed_at?: string
          total_artists?: number
          total_ms?: number
          total_tracks?: number
          user_id: string
        }
        Update: {
          refreshed_at?: string
          total_artists?: number
          total_ms?: number
          total_tracks?: number
          user_id?: string
        }
        Relationships: []
      }
      user_match_filters: {
        Row: {
          age_max: number | null
          age_min: number | null
          desired_partner_interests: string[]
          interest_keys: string[]
          same_city_only: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          desired_partner_interests?: string[]
          interest_keys?: string[]
          same_city_only?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          desired_partner_interests?: string[]
          interest_keys?: string[]
          same_city_only?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_migration_quota: {
        Row: {
          quota_date: string
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          quota_date?: string
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          quota_date?: string
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_music_intelligence: {
        Row: {
          ai_generated_at: string | null
          ai_model_used: string | null
          album_orientation: number | null
          avoided_signatures: string[]
          computed_at: string
          genre_core: string[]
          genre_peripheral: string[]
          listening_habits: Json | null
          musical_paradox: string | null
          night_ratio: number | null
          repeat_intensity: number | null
          skip_rate: number | null
          sonic_affinities: string[]
          toplam_calma: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_model_used?: string | null
          album_orientation?: number | null
          avoided_signatures?: string[]
          computed_at?: string
          genre_core?: string[]
          genre_peripheral?: string[]
          listening_habits?: Json | null
          musical_paradox?: string | null
          night_ratio?: number | null
          repeat_intensity?: number | null
          skip_rate?: number | null
          sonic_affinities?: string[]
          toplam_calma?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_model_used?: string | null
          album_orientation?: number | null
          avoided_signatures?: string[]
          computed_at?: string
          genre_core?: string[]
          genre_peripheral?: string[]
          listening_habits?: Json | null
          musical_paradox?: string | null
          night_ratio?: number | null
          repeat_intensity?: number | null
          skip_rate?: number | null
          sonic_affinities?: string[]
          toplam_calma?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pattern_pkg: {
        Row: {
          generated_at: string
          payload: Json
          tz: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          payload: Json
          tz?: string
          user_id: string
        }
        Update: {
          generated_at?: string
          payload?: Json
          tz?: string
          user_id?: string
        }
        Relationships: []
      }
      user_period_pkg: {
        Row: {
          generated_at: string
          payload: Json
          user_id: string
        }
        Insert: {
          generated_at?: string
          payload: Json
          user_id: string
        }
        Update: {
          generated_at?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_phase_announcements: {
        Row: {
          content_version: number
          created_at: string
          dismissed_at: string | null
          phase: number
          seen_at: string | null
          snoozed_until: string | null
          user_id: string
        }
        Insert: {
          content_version?: number
          created_at?: string
          dismissed_at?: string | null
          phase: number
          seen_at?: string | null
          snoozed_until?: string | null
          user_id: string
        }
        Update: {
          content_version?: number
          created_at?: string
          dismissed_at?: string | null
          phase?: number
          seen_at?: string | null
          snoozed_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_phase_overrides: {
        Row: {
          created_at: string
          expires_at: string | null
          forced_phase: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          forced_phase: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          forced_phase?: number
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          is_locked: boolean
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_locked?: boolean
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_locked?: boolean
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          collaborative_sync: boolean
          include_incognito: boolean
          locale: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collaborative_sync?: boolean
          include_incognito?: boolean
          locale?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collaborative_sync?: boolean
          include_incognito?: boolean
          locale?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_saved_library: {
        Row: {
          id: string
          import_job_id: string | null
          imported_at: string
          item_type: string
          name: string | null
          platform: string
          spotify_uri: string
          user_id: string
        }
        Insert: {
          id?: string
          import_job_id?: string | null
          imported_at?: string
          item_type: string
          name?: string | null
          platform?: string
          spotify_uri: string
          user_id: string
        }
        Update: {
          id?: string
          import_job_id?: string | null
          imported_at?: string
          item_type?: string
          name?: string | null
          platform?: string
          spotify_uri?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats_pkg: {
        Row: {
          generated_at: string
          payload: Json
          user_id: string
        }
        Insert: {
          generated_at?: string
          payload: Json
          user_id: string
        }
        Update: {
          generated_at?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_taste_pkg: {
        Row: {
          generated_at: string
          payload: Json
          tz: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          payload: Json
          tz?: string
          user_id: string
        }
        Update: {
          generated_at?: string
          payload?: Json
          tz?: string
          user_id?: string
        }
        Relationships: []
      }
      user_taste_profile: {
        Row: {
          completion_loyalty: number | null
          computed_at: string
          country_diversity: number | null
          entropy: number | null
          exploration_rate: number | null
          genre_coverage_pct: number
          has_l2: boolean
          has_l3: boolean
          identity_words: string[]
          impatience: number | null
          intentionality: number | null
          is_mature: boolean
          is_night_owl: boolean | null
          mainstream_ness: number | null
          mainstream_source: string | null
          peak_hour: number | null
          shuffle_reliance: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_loyalty?: number | null
          computed_at?: string
          country_diversity?: number | null
          entropy?: number | null
          exploration_rate?: number | null
          genre_coverage_pct?: number
          has_l2?: boolean
          has_l3?: boolean
          identity_words?: string[]
          impatience?: number | null
          intentionality?: number | null
          is_mature?: boolean
          is_night_owl?: boolean | null
          mainstream_ness?: number | null
          mainstream_source?: string | null
          peak_hour?: number | null
          shuffle_reliance?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_loyalty?: number | null
          computed_at?: string
          country_diversity?: number | null
          entropy?: number | null
          exploration_rate?: number | null
          genre_coverage_pct?: number
          has_l2?: boolean
          has_l3?: boolean
          identity_words?: string[]
          impatience?: number | null
          intentionality?: number | null
          is_mature?: boolean
          is_night_owl?: boolean | null
          mainstream_ness?: number | null
          mainstream_source?: string | null
          peak_hour?: number | null
          shuffle_reliance?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_top_strips: {
        Row: {
          artist: string | null
          computed_at: string
          id: string
          is_hidden: boolean
          merge_key: string
          rank: number
          strip: string
          title: string | null
          track_id: string | null
          user_id: string
          weight: number
        }
        Insert: {
          artist?: string | null
          computed_at?: string
          id?: string
          is_hidden?: boolean
          merge_key: string
          rank: number
          strip: string
          title?: string | null
          track_id?: string | null
          user_id: string
          weight?: number
        }
        Update: {
          artist?: string | null
          computed_at?: string
          id?: string
          is_hidden?: boolean
          merge_key?: string
          rank?: number
          strip?: string
          title?: string | null
          track_id?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_top_strips_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_track_weights: {
        Row: {
          artist: string | null
          computed_at: string
          decayed_weight: number
          final_weight: number
          first_played_at: string | null
          id: string
          is_evergreen: boolean
          last_played_at: string | null
          merge_key: string
          play_count: number
          raw_weight: number
          representative_track_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          artist?: string | null
          computed_at?: string
          decayed_weight?: number
          final_weight?: number
          first_played_at?: string | null
          id?: string
          is_evergreen?: boolean
          last_played_at?: string | null
          merge_key: string
          play_count?: number
          raw_weight?: number
          representative_track_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          artist?: string | null
          computed_at?: string
          decayed_weight?: number
          final_weight?: number
          first_played_at?: string | null
          id?: string
          is_evergreen?: boolean
          last_played_at?: string | null
          merge_key?: string
          play_count?: number
          raw_weight?: number
          representative_track_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_track_weights_representative_track_id_fkey"
            columns: ["representative_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      year_pkg: {
        Row: {
          cover_url: string | null
          generated_at: string
          payload: Json
          user_id: string
          year: number
        }
        Insert: {
          cover_url?: string | null
          generated_at?: string
          payload: Json
          user_id: string
          year: number
        }
        Update: {
          cover_url?: string | null
          generated_at?: string
          payload?: Json
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      yt_search_quota: {
        Row: {
          quota_date: string
          updated_at: string
          used_count: number
        }
        Insert: {
          quota_date: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          quota_date?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      artist_idf: {
        Row: {
          artist: string | null
          idf: number | null
          listener_count: number | null
        }
        Relationships: []
      }
      discover_contrast_saglik: {
        Row: {
          gun_bayat: number | null
          kapsanan_kullanici: number | null
          son_batch: string | null
          toplam_kullanici: number | null
          toplam_slot: number | null
        }
        Relationships: []
      }
      social_profiles_public: {
        Row: {
          age: number | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          featured_playlist_id: string | null
          gender: string | null
          is_discoverable: boolean | null
          occupation: string | null
          university: string | null
          user_id: string | null
          username: string | null
          zodiac: string | null
        }
        Insert: {
          age?: never
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          featured_playlist_id?: string | null
          gender?: string | null
          is_discoverable?: boolean | null
          occupation?: string | null
          university?: string | null
          user_id?: string | null
          username?: string | null
          zodiac?: never
        }
        Update: {
          age?: never
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          featured_playlist_id?: string | null
          gender?: string | null
          is_discoverable?: boolean | null
          occupation?: string | null
          university?: string | null
          user_id?: string | null
          username?: string | null
          zodiac?: never
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_featured_playlist_id_fkey"
            columns: ["featured_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _affinity_pct: {
        Args: { p_percentile: number; p_pool_size: number; p_raw: number }
        Returns: number
      }
      _affinity_pct_v2: { Args: { p_score: number }; Returns: number }
      _is_test_profile: { Args: { p_user_id: string }; Returns: boolean }
      _ordered_pair: { Args: { x: string; y: string }; Returns: string[] }
      ai_generation_logs_temizle: { Args: { p_gun?: number }; Returns: number }
      ai_gunluk_hata_sayisi: { Args: { p_operation: string }; Returns: number }
      ai_hata_kaydet: { Args: { p_operation: string }; Returns: number }
      ai_kota_tuket: {
        Args: { p_gunluk_tavan: number; p_operation: string }
        Returns: boolean
      }
      ai_log_generation: {
        Args: {
          p_attempts?: number
          p_cached_tokens?: number
          p_error_code?: string
          p_error_message?: string
          p_feature: string
          p_input_hash: string
          p_latency_ms: number
          p_model: string
          p_model_version?: string
          p_output_payload?: Json
          p_output_tokens: number
          p_prompt_tokens: number
          p_prompt_version: string
          p_status: string
          p_user_id?: string
        }
        Returns: string
      }
      ai_maliyet_ozeti: {
        Args: { p_gun_sayisi?: number }
        Returns: {
          basarili: number
          cagri: number
          feature: string
          fiyati_bilinmeyen: number
          gun: string
          hatali: number
          model: string
          onbellek_token: number
          ort_gecikme_ms: number
          p95_gecikme_ms: number
          toplam_token: number
          toplam_usd: number
          yeniden_denenen: number
        }[]
      }
      apply_catalog_backfill: { Args: { p_rows: Json }; Returns: number }
      apply_liked_songs_weight: {
        Args: { p_user_id: string }
        Returns: {
          inserted_count: number
          skipped_existing: number
        }[]
      }
      are_blocked: { Args: { a: string; b: string }; Returns: boolean }
      artist_image_backfill_candidates: {
        Args: { p_limit?: number }
        Returns: {
          bridge_track_spotify_id: string
          id: string
          name: string
        }[]
      }
      audit_recap_coverage: {
        Args: { p_user_id: string }
        Returns: {
          expected_periods: number
          missing_labels: string[]
          stored_periods: number
        }[]
      }
      audit_secdef_anon_exec: {
        Args: never
        Returns: {
          function_args: string
          function_name: string
        }[]
      }
      behavior_affinity: { Args: { a: string; b: string }; Returns: number }
      behavior_similarity: { Args: { a: string; b: string }; Returns: number }
      block_user: { Args: { p_target: string }; Returns: undefined }
      budget_check_and_consume: {
        Args: { p_count?: number; p_scope: string }
        Returns: {
          allowed: boolean
          budget: number
          remaining: number
          used: number
        }[]
      }
      budget_reset: { Args: { p_scope?: string }; Returns: number }
      budget_status: {
        Args: never
        Returns: {
          blocked_until: string
          budget: number
          remaining: number
          scope: string
          used: number
          window_resets_in_seconds: number
          window_start: string
        }[]
      }
      build_discover_contrast_batch: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          behavior_sim: number
          candidate_id: string
          from_social: boolean
          genre_contrast: number
          relax_level: number
        }[]
      }
      build_journey_arc: { Args: { p_user_id: string }; Returns: Json }
      build_journey_year_pkg: {
        Args: { p_covers?: number; p_user_id: string }
        Returns: number
      }
      build_match_batch: {
        Args: { p_date?: string; p_user_id: string }
        Returns: number
      }
      build_mood_pkg: {
        Args: { p_mood_key: string; p_user_id: string }
        Returns: boolean
      }
      build_suggestion_batch: {
        Args: { p_date?: string; p_limit?: number; p_user_id: string }
        Returns: number
      }
      build_user_pattern_pkg: { Args: { p_user_id: string }; Returns: boolean }
      build_user_period_pkg: { Args: { p_user_id: string }; Returns: boolean }
      build_user_stats_pkg: { Args: { p_user_id: string }; Returns: boolean }
      build_user_taste_pkg: { Args: { p_user_id: string }; Returns: boolean }
      build_year_pkg: {
        Args: { p_user_id: string; p_year: number }
        Returns: boolean
      }
      car_listening_summary: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          first_session: string
          last_session: string
          session_count: number
          total_hours: number
        }[]
      }
      catalog_enrichment_artist_adaylari: {
        Args: { p_havuz_tavani?: number; p_limit?: number }
        Returns: {
          artist_name: string
          bilinen_tur: string
          item_id: string
          oncelik: number
          ornek_parcalar: string
        }[]
      }
      catalog_enrichment_durumu: {
        Args: never
        Returns: {
          havuz_tavani: number
          kalan: number
          tur: string
          zenginlesen: number
        }[]
      }
      catalog_enrichment_for_tracks: {
        Args: { p_track_ids: string[] }
        Returns: {
          // migration 0325 — elle genisletildi (supabase CLI tip uretemiyor).
          confidence: number
          energy_character: string
          kanonik: string[]
          kaynak: string
          language: string
          moods: string[]
          primary_genre: string
          tempo_character: string
          track_id: string
          vibe: string[]
        }[]
      }
      mood_definition_for_key: {
        Args: { p_mood_key: string }
        Returns: {
          energy_allow: string[]
          energy_ideal: string[]
          enstrumantal: string
          kimlik: string
          mood_key: string
          negatif_tags: string[]
          olmali: string
          olmamali: string
          pozitif_tags: string[]
          pozitif_genres: string[]
          negatif_genres: string[]
        }[]
      }
      mood_approved_tracks: {
        Args: { p_mood_key: string; p_user_id: string }
        Returns: string[]
      }
      mood_kanonik_etiketler: {
        Args: { p_etiketler: string[] }
        Returns: string[]
      }
      catalog_enrichment_track_adaylari: {
        Args: { p_havuz_tavani?: number; p_limit?: number }
        Returns: {
          album: string
          artist_name: string
          bilinen_tur: string
          item_id: string
          oncelik: number
          release_year: number
          title: string
          track_id: string
        }[]
      }
      catalog_item_id: {
        Args: { p_item_type: string; p_key: string }
        Returns: string
      }
      check_username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
      cleanup_old_logs: { Args: { p_days_to_keep?: number }; Returns: Json }
      completed_years_for_user: {
        Args: { p_user_id: string }
        Returns: number[]
      }
      compute_user_behavioral_signals: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      compute_user_genre_vector: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      compute_user_identity: { Args: { p_user_id: string }; Returns: string[] }
      compute_user_mainstream: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      compute_user_music_metrics: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      compute_user_track_weights: {
        Args: { p_user_id: string }
        Returns: number
      }
      cooldown_get: {
        Args: { p_provider: string }
        Returns: {
          blocked_until: string
          hit_count: number
          reason: string
        }[]
      }
      cooldown_set: {
        Args: { p_blocked_until: string; p_provider: string; p_reason: string }
        Returns: undefined
      }
      cron_sira_al: {
        Args: {
          p_aralik: string
          p_is: string
          p_kilit?: string
          p_limit?: number
          p_tur_baslangici?: string
        }
        Returns: string[]
      }
      cron_sira_birak: {
        Args: { p_is: string; p_user_id: string }
        Returns: undefined
      }
      cron_sira_durumu: {
        Args: { p_aralik: string; p_is: string }
        Returns: {
          en_eski_tamamlanma: string | null
          hatali: number
          toplam: number
          vadesi_gecmis: number
        }[]
      }
      cron_sira_tamamla: {
        Args: { p_hata?: string | null; p_is: string; p_user_id: string }
        Returns: undefined
      }
      cron_uygun_kullanicilar: { Args: { p_is: string }; Returns: string[] }
      cover_backfill_candidates: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          spotify_id: string
        }[]
      }
      daylist_identity_contrast: {
        Args: { p_user_id: string }
        Returns: {
          overlap_count: number
          rosso_words: string[]
          spotify_top_words: string[]
          spotify_word_count: number
        }[]
      }
      daylist_name_pool: {
        Args: { p_min_count?: number; p_user_id: string }
        Returns: {
          occurrences: number
          share: number
          word: string
        }[]
      }
      discovery_bucket_page: {
        Args: {
          p_bucket: string
          p_limit?: number
          p_max_plays?: number
          p_min_plays?: number
          p_offset?: number
          p_stale_days?: number
          p_user_id: string
        }
        Returns: {
          artist_name: string
          image_url: string
          last_played_at: string
          liked_at: string
          play_count: number
          spotify_id: string
          title: string
          total_count: number
          track_id: string
        }[]
      }
      dismiss_suggestion: { Args: { p_candidate: string }; Returns: boolean }
      distance_between_users: {
        Args: { p_a: string; p_b: string }
        Returns: number
      }
      end_conversation: { Args: { p_conversation: string }; Returns: undefined }
      follow_user: { Args: { p_target: string }; Returns: undefined }
      genre_cosine: { Args: { a: Json; b: Json }; Returns: number }
      genre_mood_weight: {
        Args: { p_genre: string; p_mood: string }
        Returns: number
      }
      genre_play_counts_2025: {
        Args: { p_user_id: string }
        Returns: {
          genre: string
          play_count: number
          total_plays: number
        }[]
      }
      genre_to_archetype_noun: { Args: { p_genre: string }; Returns: string }
      genre_to_label: {
        Args: { p_entropy?: number; p_genre: string }
        Returns: string
      }
      get_artist_detail: {
        Args: { p_name: string; p_user_id: string }
        Returns: {
          active_months: number
          first_played: string
          genres: string[]
          last_played: string
          name: string
          play_count: number
          total_minutes: number
          track_count: number
        }[]
      }
      get_artist_top_tracks: {
        Args: { p_limit?: number; p_name: string; p_user_id: string }
        Returns: {
          minutes: number
          play_count: number
          title: string
          track_id: string
        }[]
      }
      get_discover_contrast: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          behavior_sim: number
          candidate_id: string
          from_social: boolean
          genre_contrast: number
          relax_level: number
        }[]
      }
      get_follow_state: {
        Args: { p_target: string }
        Returns: {
          follows_me: boolean
          i_follow: boolean
          mutual: boolean
        }[]
      }
      get_hidden_items: {
        Args: { p_user_id: string }
        Returns: {
          item_key: string
          item_type: string
        }[]
      }
      get_incoming_match_requests: {
        Args: { p_limit?: number }
        Returns: {
          affinity_pct: number
          age: number
          bio: string
          created_at: string
          display_name: string
          main_photo_path: string
          request_id: string
          sender_id: string
          shared_artist_count: number
          shared_rare: Json
          shared_track_count: number
          username: string
        }[]
      }
      get_journey_first_played: {
        Args: { p_user_id: string }
        Returns: {
          artist: string
          image_url: string
          played_at: string
          title: string
          track_id: string
        }[]
      }
      get_journey_last_played: {
        Args: { p_user_id: string }
        Returns: {
          artist: string
          image_url: string
          played_at: string
          title: string
          track_id: string
        }[]
      }
      get_journey_lock_status: {
        Args: { p_user_id: string }
        Returns: {
          questions_answered: number
          questions_total: number
          unlocked: boolean
        }[]
      }
      get_journey_mining_events: {
        Args: { p_user_id: string; p_year: number }
        Returns: {
          artist: string
          duration_ms: number
          image_url: string
          ms_played: number
          played_at: string
          reason_end: string
          reason_start: string
          release_year: number
          shuffle: boolean
          skipped: boolean
          title: string
          track_id: string
        }[]
      }
      get_journey_pillar_candidates: {
        Args: { p_user_id: string }
        Returns: {
          active_months: number
          artist: string
          first_played_at: string
          image_url: string
          last_played_at: string
          skip_rate: number
          title: string
          total_plays: number
          track_id: string
        }[]
      }
      get_journey_survey_state: {
        Args: { p_user_id: string }
        Returns: {
          answered: boolean
          play_count: number
          year: number
        }[]
      }
      get_journey_year_covers: {
        Args: { p_limit?: number; p_user_id: string; p_year: number }
        Returns: {
          artist: string
          image_url: string
          plays: number
          spotify_id: string
          title: string
          track_id: string
        }[]
      }
      get_journey_years: {
        Args: { p_user_id: string }
        Returns: {
          artist_count: number
          discovery_rate: number
          dominant_genre: string
          dominant_share: number
          genre_breakdown: Json
          genre_label: string
          genre_variety: number
          is_breakpoint: boolean
          loyalty: number
          new_artist_count: number
          play_count: number
          top_track_artist: string
          top_track_plays: number
          top_track_title: string
          total_minutes: number
          track_count: number
          year: number
        }[]
      }
      get_match_filters: { Args: never; Returns: Json }
      get_match_slots: {
        Args: { p_user_id?: string }
        Returns: {
          age: number
          bio: string
          candidate_id: string
          display_name: string
          evergreen_affinity_pct: number
          evergreen_overlap: number
          main_photo_path: string
          match_type: string
          now_affinity_pct: number
          now_overlap: number
          rare_affinity_pct: number
          rare_score: number
          shared_artist_count: number
          shared_rare: Json
          shared_track_count: number
          state: string
          username: string
        }[]
      }
      get_migration_queue: {
        Args: { p_user_id: string }
        Returns: {
          capacity_today: number
          created_at: string
          daily_limit: number
          done_tracks: number
          eta_days: number
          failed_tracks: number
          id: string
          playlist_id: string
          playlist_name: string
          queue_position: number
          source: string
          status: string
          target: string
          total_tracks: number
        }[]
      }
      get_mood_weekly_sync_candidates: {
        Args: never
        Returns: {
          exported_playlist_id: string
          mood_key: string
          user_id: string
        }[]
      }
      get_mood_workspace: {
        Args: { p_mood_key: string }
        Returns: {
          // migration 0326 — elle eklendi: supabase CLI hesabının tip-üretme
          // yetkisi yok (`npm run db:types` LegacyGenTypesUnexpectedStatusError
          // veriyor), bu yüzden tüm dosya yeniden üretilemedi.
          approved_track_ids: string[]
          exported_at: string
          exported_playlist_id: string
          hidden_track_ids: string[]
          weekly_sync_enabled: boolean
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
        }[]
      }
      get_outgoing_match_requests: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          display_name: string
          main_photo_path: string
          receiver_id: string
          request_id: string
          status: string
          username: string
        }[]
      }
      get_public_genre_vector: {
        Args: { p_user_id: string }
        Returns: {
          dominant_genre: string
          vector: Json
        }[]
      }
      get_public_identity_words: {
        Args: { p_user_id: string }
        Returns: {
          identity_words: string[]
        }[]
      }
      get_public_last_played: {
        Args: { p_user_id: string }
        Returns: {
          artist: string
          played_at: string
          title: string
          track_id: string
        }[]
      }
      get_public_profile_stats: {
        Args: { p_user_id: string }
        Returns: {
          genres: Json
          listening_minutes_1y: number
          unique_artists: number
          unique_tracks: number
        }[]
      }
      get_public_top_strips: {
        Args: { p_user_id: string }
        Returns: {
          artist: string
          rank: number
          title: string
          track_id: string
        }[]
      }
      get_recap_by_label: {
        Args: { p_period_label: string; p_user_id: string }
        Returns: {
          generated_at: string
          id: string
          payload: Json
          period_end: string
          period_label: string
          period_start: string
          period_type: string
        }[]
      }
      get_ritual_state: {
        Args: { p_user_id: string }
        Returns: {
          answered: boolean
          question_key: string
          years: number[]
        }[]
      }
      get_spotify_capacity: {
        Args: never
        Returns: {
          limit_total: number
          pending: number
          used: number
        }[]
      }
      get_suggestions: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          affinity_pct: number
          age: number
          bio: string
          candidate_id: string
          display_name: string
          main_photo_path: string
          shared_artist_count: number
          shared_rare: Json
          shared_track_count: number
          source: string
          username: string
        }[]
      }
      get_top_tracks_for_rule: {
        Args: {
          p_from: string
          p_hour_from?: number
          p_hour_to?: number
          p_limit?: number
          p_min_plays?: number
          p_skipped?: boolean
          p_sort_by?: string
          p_to: string
          p_user_id: string
        }
        Returns: {
          play_count: number
          raw_artist_name: string
          raw_track_name: string
          total_ms: number
          track_id: string
        }[]
      }
      get_track_detail: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          active_months: number
          artists: string[]
          first_played: string
          genres: string[]
          id: string
          isrc: string
          last_played: string
          play_count: number
          playlist_count: number
          spotify_id: string
          title: string
          total_minutes: number
        }[]
      }
      get_track_timeline: {
        Args: { p_track_id: string; p_user_id: string }
        Returns: {
          bucket_type: string
          month: string
          plays: number
        }[]
      }
      get_user_export_signals: {
        Args: { p_user_id: string }
        Returns: {
          imported_at: string
          signal_data: Json
          signal_source: string
        }[]
      }
      get_user_plan: { Args: { p_user_id: string }; Returns: string }
      get_yearly_champion_artists: {
        Args: { p_user_id: string }
        Returns: {
          artist_name: string
          play_count: number
          total_ms: number
          year: number
        }[]
      }
      history_top_albums: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_to?: string
          p_user_id: string
        }
        Returns: {
          album: string
          artist_name: string
          image_url: string
          play_count: number
          total_ms: number
        }[]
      }
      history_top_artists: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_to?: string
          p_user_id: string
        }
        Returns: {
          artist_name: string
          image_url: string
          play_count: number
          total_ms: number
        }[]
      }
      history_top_tracks: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_to?: string
          p_user_id: string
        }
        Returns: {
          album: string
          artist_name: string
          image_url: string
          play_count: number
          title: string
          total_ms: number
          track_id: string
        }[]
      }
      inference_label_to_genre: { Args: { p_label: string }; Returns: string }
      insert_tracks_batch: {
        Args: { p_tracks: Json }
        Returns: {
          spotify_id: string
          track_id: string
        }[]
      }
      invalidate_journey_years: { Args: { p_user_id: string }; Returns: number }
      invoke_account_purge_cron: { Args: never; Returns: number }
      invoke_auto_playlists_cron: { Args: never; Returns: number }
      invoke_mood_pkg_cron: { Args: never; Returns: number }
      invoke_playlist_refresh_cron: { Args: never; Returns: number }
      invoke_recap_cron: { Args: never; Returns: number }
      invoke_spotify_sync_cron: { Args: never; Returns: number }
      invoke_worker_maintenance_cron: {
        Args: { p_task: string }
        Returns: number
      }
      is_calendar_word: { Args: { p_word: string }; Returns: boolean }
      is_real_user: { Args: { p_user_id: string }; Returns: boolean }
      journey_car_top_tracks: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          artist_name: string
          image_url: string
          plays: number
          title: string
          track_id: string
        }[]
      }
      journey_year_facts: { Args: { p_user_id: string }; Returns: Json }
      kullanici_sanatcilari: {
        Args: { p_user_id: string }
        Returns: {
          artist: string
          play_count: number
        }[]
      }
      kullanici_turleri: {
        Args: { p_user_id: string }
        Returns: {
          genre: string
          play_count: number
        }[]
      }
      liked_songs_page: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_user_id: string
        }
        Returns: {
          artist_name: string
          image_url: string
          liked_at: string
          play_count: number
          spotify_id: string
          title: string
          total_count: number
          track_id: string
        }[]
      }
      liked_sync_diff: {
        Args: { p_spotify_ids: string[]; p_user_id: string }
        Returns: {
          catalog_missing: string[]
          to_add: string[]
          to_remove: string[]
        }[]
      }
      list_recaps: {
        Args: { p_period_type: string; p_user_id: string }
        Returns: {
          generated_at: string
          id: string
          period_end: string
          period_label: string
          period_start: string
          period_type: string
        }[]
      }
      mark_message_read: { Args: { p_message: string }; Returns: undefined }
      mark_mood_exported: {
        Args: { p_mood_key: string; p_playlist_id?: string }
        Returns: undefined
      }
      mark_phase_announcement: {
        Args: { p_action: string; p_phase: number; p_version?: number }
        Returns: undefined
      }
      materialize_user_top_strips: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: undefined
      }
      merge_track_into: {
        Args: { p_canonical_id: string; p_loser_id: string }
        Returns: undefined
      }
      mesaji_geri_al: { Args: { p_message_id: string }; Returns: boolean }
      mood_artist_penalty_carpan: {
        Args: { p_cikarma_sayisi: number }
        Returns: number
      }
      mood_needs_ai_recuration: {
        Args: { p_mood_key: string; p_user_id: string }
        Returns: boolean
      }
      mood_playlist: {
        Args: { p_limit?: number; p_mood_key: string; p_user_id: string }
        Returns: {
          album: string
          artist_name: string
          image_url: string
          play_count: number
          score: number
          spotify_id: string
          title: string
          track_id: string
        }[]
      }
      mood_profile: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          angry_pct: number
          love_pct: number
          party_pct: number
          sad_pct: number
          total_plays: number
          unclassified_pct: number
        }[]
      }
      open_or_get_conversation: { Args: { p_target: string }; Returns: string }
      pair_overlap_raw: {
        Args: { a: string; b: string }
        Returns: {
          shared_artists: number
          shared_tracks: number
        }[]
      }
      pair_score_v2: {
        Args: { a: string; b: string }
        Returns: {
          behavior_component: number
          genre_component: number
          music_component: number
          score: number
          shared_artists: number
          shared_tracks: number
        }[]
      }
      paket_gorsel_adaylari_sanatci: {
        Args: { p_limit?: number }
        Returns: {
          bridge_track_spotify_id: string
          id: string
          name: string
        }[]
      }
      paket_gorsel_adaylari_track: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          spotify_id: string
        }[]
      }
      parametreli_top_tracks: {
        Args: {
          p_artists?: string[]
          p_from: string
          p_genres?: string[]
          p_limit?: number
          p_sort_by?: string
          p_to: string
          p_user_id: string
        }
        Returns: {
          play_count: number
          raw_artist_name: string
          raw_track_name: string
          total_ms: number
          track_id: string
        }[]
      }
      pass_candidate: { Args: { p_candidate: string }; Returns: undefined }
      persist_discover_contrast: {
        Args: { p_date?: string; p_limit?: number; p_user_id: string }
        Returns: number
      }
      plan_daily_migration_limit: { Args: { p_plan: string }; Returns: number }
      playlist_growth_series:
        | {
            Args: { p_playlist_id: string; p_user_id: string }
            Returns: {
              added_count: number
              cumulative_count: number
              month: string
            }[]
          }
        | {
            Args: { p_playlist_uri?: string; p_user_id: string }
            Returns: {
              added_count: number
              cumulative_count: number
              month: string
            }[]
          }
      playlist_reco_candidates: {
        Args: never
        Returns: {
          playlist_id: string
          user_id: string
        }[]
      }
      playlist_track_added_dates: {
        Args: { p_playlist_id: string; p_user_id: string }
        Returns: {
          added_at: string
          track_id: string
        }[]
      }
      playlist_tracks_page: {
        Args: { p_playlist_id: string; p_user_id: string }
        Returns: {
          artist_name: string
          duration_ms: number
          image_url: string
          title: string
          track_id: string
          track_pos: number
        }[]
      }
      rare_overlap_raw: { Args: { a: string; b: string }; Returns: number }
      reactivate_small_artist_pending: { Args: never; Returns: number }
      recap_discovery_by_month: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          month_start: string
          new_artists: number
          new_tracks: number
        }[]
      }
      recap_discovery_total: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          discovery_rate: number
          new_artists: number
          new_tracks: number
          total_artists: number
          total_tracks: number
        }[]
      }
      recap_dominant_genre: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          genre_name: string
          play_count: number
        }[]
      }
      recap_genre_variety: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          genre_count: number
          top_genre: string
          top_genre_pct: number
        }[]
      }
      recap_hourly_distribution: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          hour: number
          minutes: number
          plays: number
        }[]
      }
      recap_hourly_pattern: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          hour: number
          play_count: number
          total_ms: number
        }[]
      }
      recap_listening_age: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          avg_release_year: number
          coverage_pct: number
          listening_age: number
          sample_size: number
          user_age: number
        }[]
      }
      recap_listening_summary: {
        Args: {
          p_from?: string
          p_source?: string
          p_to?: string
          p_user_id: string
        }
        Returns: {
          total_artists: number
          total_ms: number
          total_tracks: number
        }[]
      }
      recap_longest_streak: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          streak_days: number
          streak_end: string
          streak_start: string
        }[]
      }
      recap_number_one: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          artist_hours: number
          artist_image_url: string
          artist_name: string
          artist_plays: number
          track_artist: string
          track_hours: number
          track_image_url: string
          track_plays: number
          track_title: string
        }[]
      }
      recap_obsession: {
        Args: { p_from: string; p_to: string; p_user_id: string }
        Returns: {
          artist: string
          first_played: string
          hours: number
          last_played: string
          peak_window_plays: number
          peak_window_start: string
          plays: number
          share_pct: number
          span_days: number
          title: string
        }[]
      }
      recap_peak_day: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          artist: string
          day: string
          image_url: string
          play_count: number
          plays: number
          title: string
          total_ms: number
          track_id: string
        }[]
      }
      recap_periods_with_data: {
        Args: { p_user_id: string }
        Returns: {
          period_end: string
          period_label: string
          period_start: string
          period_type: string
        }[]
      }
      recap_platform_breakdown: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          percentage: number
          play_count: number
          source: string
        }[]
      }
      recap_real_user_ids: { Args: never; Returns: string[] }
      recap_top_albums: {
        Args: {
          p_from: string
          p_limit?: number
          p_to: string
          p_user_id: string
        }
        Returns: {
          album: string
          artist: string
          distinct_tracks: number
          hours: number
          plays: number
        }[]
      }
      recap_top_artists: {
        Args: {
          p_from?: string
          p_limit?: number
          p_source?: string
          p_to?: string
          p_user_id: string
        }
        Returns: {
          artist_name: string
          image_url: string
          play_count: number
          total_ms: number
        }[]
      }
      recap_top_tracks: {
        Args: {
          p_from?: string
          p_limit?: number
          p_source?: string
          p_to?: string
          p_user_id: string
        }
        Returns: {
          artist_name: string
          play_count: number
          skip_count: number
          title: string
          total_ms: number
          track_id: string
        }[]
      }
      recap_user_ids: { Args: never; Returns: string[] }
      record_run: {
        Args: {
          p_error: string
          p_job_id: string
          p_outcome: string
          p_run_type: string
          p_stats: Json
        }
        Returns: string
      }
      deezer_kapak_adaylari_sanatci: {
        Args: { p_limit?: number }
        Returns: { id: string; name: string }[]
      }
      deezer_kapak_adaylari_track: {
        Args: { p_limit?: number }
        Returns: { artists: string[]; id: string; isrc: string; title: string }[]
      }
      demo_kullanici_id: { Args: { p_kod?: string }; Returns: string }
      demo_mi: { Args: { p_user: string }; Returns: boolean }
      quick_start_durumu: {
        Args: { p_user?: string }
        Returns: {
          account: boolean
          profil: boolean
          son_zip_at: string | null
          spotify: boolean
          streaming: boolean
          technical: boolean
          yukleniyor: boolean
        }[]
      }
      refresh_active_users_batch: {
        Args: { p_butce_sn?: number }
        Returns: Json
      }
      refresh_all_active_users_data: { Args: never; Returns: Json }
      refresh_artist_idf: { Args: never; Returns: number }
      refresh_listening_summary_cache: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_user_taste: { Args: { p_user_id: string }; Returns: undefined }
      report_target: {
        Args: {
          p_category: string
          p_detail?: string
          p_target: string
          p_type: string
        }
        Returns: string
      }
      respond_comment: {
        Args: { p_accept: boolean; p_comment: string }
        Returns: string
      }
      respond_match_request: {
        Args: { p_accept: boolean; p_request: string }
        Returns: string
      }
      rosso_bugun: { Args: never; Returns: string }
      save_catalog_enrichment: {
        Args: { p_item_type: string; p_items: Json; p_model: string }
        Returns: number
      }
      save_mood_pkg_payload: {
        Args: { p_mood_key: string; p_track_ids: string[]; p_user_id: string }
        Returns: boolean
      }
      save_user_music_intelligence_ai: {
        Args: {
          p_avoided_signatures: string[]
          p_genre_core: string[]
          p_genre_peripheral: string[]
          p_listening_habits: Json
          p_model: string
          p_musical_paradox: string
          p_sonic_affinities: string[]
          p_user_id: string
        }
        Returns: boolean
      }
      save_year_milestones: {
        Args: {
          p_career: string[]
          p_love: string[]
          p_social: string[]
          p_user_id: string
          p_vibe: string[]
          p_year: number
        }
        Returns: undefined
      }
      saved_library_page: {
        Args: {
          p_item_type: string
          p_limit?: number
          p_offset?: number
          p_user_id: string
        }
        Returns: {
          imported_at: string
          name: string
          spotify_uri: string
          total_count: number
        }[]
      }
      search_my_tracks: {
        Args: { p_limit?: number; p_query: string; p_user_id: string }
        Returns: {
          artist_name: string
          play_count: number
          track_id: string
          track_title: string
        }[]
      }
      send_comment: {
        Args: { p_body: string; p_target: string }
        Returns: string
      }
      send_match_request: { Args: { p_candidate: string }; Returns: string }
      send_message: {
        Args: { p_body: string; p_conversation: string }
        Returns: string
      }
      set_match_filters: {
        Args: {
          p_age_max: number
          p_age_min: number
          p_gender_pref: string[]
          p_same_city: boolean
        }
        Returns: boolean
      }
      set_mood_hidden_tracks: {
        Args: { p_hidden: string[]; p_mood_key: string }
        Returns: undefined
      }
      set_mood_track_feedback: {
        Args: { p_etiket: string | null; p_mood_key: string; p_track_id: string }
        Returns: undefined
      }
      set_mood_weekly_sync: {
        Args: { p_enabled: boolean; p_mood_key: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      shuffle_identity: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          measurable_events: number
          shuffle_pct: number
          style: string
        }[]
      }
      shuffle_similarity: { Args: { a: string; b: string }; Returns: number }
      skor_degismez_testi: {
        Args: never
        Returns: {
          beklenen: string
          gecti: boolean
          gercek: string
          test: string
        }[]
      }
      social_circle_degrees: {
        Args: { p_user_id: string }
        Returns: {
          candidate_id: string
          degree: number
        }[]
      }
      soundcapsule_coverage: {
        Args: { p_user_id: string }
        Returns: {
          coverage_pct: number
          our_events: number
          our_seconds: number
          spotify_seconds: number
          verdict: string
          week_start: string
        }[]
      }
      soundcapsule_coverage_audit: {
        Args: never
        Returns: {
          user_id: string
          weeks_checked: number
          weeks_missing: number
          weeks_ok: number
          weeks_partial: number
          worst_pct: number
        }[]
      }
      strip_overlap: {
        Args: { a: string; b: string; p_evergreen: boolean }
        Returns: number
      }
      toggle_ritual_answer: {
        Args: { p_question_key: string; p_user_id: string; p_year: number }
        Returns: boolean
      }
      track_genre_plays_2025: {
        Args: { p_user_id: string }
        Returns: {
          genres: string[]
          play_count: number
        }[]
      }
      unblock_user: { Args: { p_target: string }; Returns: undefined }
      unfollow_user: { Args: { p_target: string }; Returns: undefined }
      upsert_recap_partial: {
        Args: {
          p_payload: Json
          p_period_end: string
          p_period_label: string
          p_period_start: string
          p_period_type: string
          p_user_id: string
        }
        Returns: number
      }
      user_era_shift: {
        Args: { p_user_id: string }
        Returns: {
          top_artist: string
          top_genre: string
          year: number
        }[]
      }
      user_genre_all_counts: {
        Args: { p_user_id: string }
        Returns: {
          genre: string
          play_count: number
        }[]
      }
      user_genre_primary_counts: {
        Args: { p_source?: string; p_user_id: string }
        Returns: {
          genre: string
          play_count: number
        }[]
      }
      user_hourly_play_counts: {
        Args: { p_user_id: string }
        Returns: {
          hour: number
          play_count: number
        }[]
      }
      user_liked_track_ids: {
        Args: { p_user_id: string }
        Returns: {
          liked_at: string
          spotify_id: string
        }[]
      }
      user_listening_stats: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          after_midnight: number
          distinct_tracks: number
          play_count: number
          total_ms: number
        }[]
      }
      user_migration_capacity_today: {
        Args: { p_user_id: string }
        Returns: number
      }
      user_migration_quota_increment: {
        Args: { p_count: number; p_user_id: string }
        Returns: number
      }
      user_most_skipped: {
        Args: {
          p_from?: string
          p_limit?: number
          p_to?: string
          p_user_id: string
        }
        Returns: {
          artist_name: string
          skip_count: number
          title: string
          total_ms: number
          track_id: string
        }[]
      }
      user_music_intelligence_needs_ai: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_phase: {
        Args: { p_user?: string }
        Returns: {
          has_account_data: boolean
          has_history: boolean
          has_spotify: boolean
          has_technical_log: boolean
          is_override: boolean
          natural_phase: number
          phase: number
          processing: boolean
        }[]
      }
      user_streaks: {
        Args: { p_user_id: string }
        Returns: {
          current_days: number
          longest_days: number
        }[]
      }
      user_weekday_pattern: {
        Args: { p_from?: string; p_to?: string; p_user_id: string }
        Returns: {
          play_count: number
          total_ms: number
          weekday: number
        }[]
      }
      wrapped_engine_inputs: {
        Args: { p_user_id: string }
        Returns: {
          avg_track_popularity: number
          chaos_score: number
          is_stale: boolean
          multilinguist_score: number
          percent_explicit: number
          percent_top_artist: number
          source_year: number
        }[]
      }
      wrapped_taste_similarity: {
        Args: { a: string; b: string }
        Returns: number
      }
      year_has_enough_data: {
        Args: { p_user_id: string; p_year: number }
        Returns: boolean
      }
      yearly_top_tracks: {
        Args: { p_user_id: string; p_year: number }
        Returns: {
          album: string
          artist_name: string
          image_url: string
          play_count: number
          spotify_id: string
          title: string
          track_id: string
        }[]
      }
      yt_pool_remaining_tracks: { Args: never; Returns: number }
      yt_search_quota_get: { Args: never; Returns: number }
      yt_search_quota_increment: { Args: never; Returns: number }
      zodiac_sign: { Args: { p_birth: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
