import { exportStagePresentation } from '@/lib/export/export-stage-presentation'
import type { ExportJobState } from '@/lib/export/use-export-progress'
import styles from './export-stage-progress.module.css'

type Props = {
  job: ExportJobState | null
}

/**
 * Export işleme aşaması — gerçek sayaç varsa determinate bar, yoksa indeterminate.
 * Sahte %70 animasyonu yok (loading-states §3 · Rosso felsefesi).
 */
export function ExportStageProgress({ job }: Props) {
  const stage = exportStagePresentation(job)

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stage.mode === 'determinate' ? stage.percent : undefined}
        aria-valuetext={stage.mode === 'determinate' ? `%${stage.percent}` : stage.headline}
        aria-busy={stage.mode !== 'queued'}
      >
        {stage.mode === 'determinate' ? (
          <div className={styles.fill} style={{ width: `${stage.percent}%` }} />
        ) : (
          <div className={styles.indeterminate} />
        )}
      </div>
      {stage.countLabel ? (
        <span className={styles.count}>{stage.countLabel}</span>
      ) : null}
    </div>
  )
}

export { exportStagePresentation }
