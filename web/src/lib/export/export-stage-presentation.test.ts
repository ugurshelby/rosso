import { describe, expect, it } from 'vitest'
import { exportStagePresentation } from './export-stage-presentation'
import type { ExportJobState } from './use-export-progress'

function job(partial: Partial<ExportJobState>): ExportJobState {
  return {
    id: 'job-1',
    status: 'processing',
    genre_pending: false,
    export_type: 'extended_history',
    total_events: null,
    processed_events: null,
    matched_events: null,
    skipped_events: null,
    error_count: null,
    error_message: null,
    file_name: 'export.zip',
    file_size: 1000,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    period_start: null,
    period_end: null,
    pipeline_step: null,
    ...partial,
  }
}

describe('exportStagePresentation', () => {
  it('queued durumunda sahte yüzde göstermez', () => {
    const stage = exportStagePresentation(job({ status: 'queued', pipeline_step: 'queued' }))
    expect(stage.mode).toBe('queued')
    expect(stage.headline).toBe('Queued')
    expect(stage.countLabel).toBeNull()
  })

  it('pipeline_step biliniyorsa Türkçe aşama başlığı kullanır', () => {
    const stage = exportStagePresentation(
      job({ status: 'processing', pipeline_step: 'matching_events' }),
    )
    expect(stage.headline).toBe('Writing records')
    expect(stage.mode).toBe('indeterminate')
  })

  it('total_events varken gerçek yüzde ve sayaç döner', () => {
    const stage = exportStagePresentation(
      job({
        status: 'processing',
        pipeline_step: 'inserting_tracks',
        total_events: 1000,
        processed_events: 250,
      }),
    )
    expect(stage.mode).toBe('determinate')
    expect(stage.percent).toBe(25)
    expect(stage.countLabel).toBe('250 / 1,000 records')
  })

  it('total_events yokken indeterminate kalır', () => {
    const stage = exportStagePresentation(job({ status: 'processing', total_events: null }))
    expect(stage.mode).toBe('indeterminate')
    expect(stage.percent).toBe(0)
  })
})
