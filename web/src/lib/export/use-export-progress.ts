'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@rosso/shared-types'

type ExportJob = Tables<'export_jobs'>

export type ExportJobState = Pick<
  ExportJob,
  | 'id'
  | 'status'
  | 'genre_pending'
  | 'export_type'
  | 'total_events'
  | 'processed_events'
  | 'matched_events'
  | 'skipped_events'
  | 'error_count'
  | 'error_message'
  | 'file_name'
  | 'file_size'
  | 'completed_at'
  | 'created_at'
  | 'period_start'
  | 'period_end'
  | 'pipeline_step'
>

const SELECT_FIELDS =
  'id, status, genre_pending, export_type, total_events, processed_events, matched_events, skipped_events, error_count, error_message, file_name, file_size, completed_at, created_at, period_start, period_end, pipeline_step'

const POLL_INTERVAL_MS = 3000  // Realtime fallback — her 3s DB'den çek

/**
 * Export job ilerlemesini Realtime + polling hibrit yöntemiyle izler.
 * Realtime bağlantısı kesilirse polling devreye girer.
 * Job tamamlandığında veya hata aldığında polling durur.
 */
export function useExportProgress(jobId: string | null): ExportJobState | null {
  const [job, setJob] = useState<ExportJobState | null>(null)

  useEffect(() => {
    if (!jobId) return
    const supabase = createClient()
    let cancelled = false

    async function fetchJob() {
      const { data } = await supabase
        .from('export_jobs')
        .select(SELECT_FIELDS)
        .eq('id', jobId!)
        .single()
      if (!cancelled && data) setJob(data as ExportJobState)
      return data
    }

    // İlk durumu hemen çek
    void fetchJob()

    // Realtime: UPDATE eventlerini dinle (birincil)
    const channel = supabase
      .channel(`export_job_${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'export_jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          if (!cancelled) setJob(payload.new as ExportJobState)
        }
      )
      .subscribe()

    // Polling fallback: Realtime gecikirse veya bağlantı kesilirse devreye girer
    const pollTimer = setInterval(async () => {
      if (cancelled) return
      const { data } = await supabase
        .from('export_jobs')
        .select(SELECT_FIELDS)
        .eq('id', jobId!)
        .single()
      if (!cancelled && data) {
        setJob(data as ExportJobState)
        // Tamamlandı veya hata → polling'i durdur
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollTimer)
        }
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(pollTimer)
      void supabase.removeChannel(channel)
    }
  }, [jobId])

  return jobId ? job : null
}

/** İlerleme yüzdesi (0-100). total yoksa 0. */
export function progressPercent(job: ExportJobState | null): number {
  if (!job || !job.total_events) return job?.status === 'completed' ? 100 : 0
  return Math.round(((job.processed_events ?? 0) / job.total_events) * 100)
}
