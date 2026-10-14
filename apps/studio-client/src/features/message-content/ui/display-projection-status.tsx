import { RefreshCw } from 'lucide-react'
import { IconButton } from '@loom-studio/ui'

export function DisplayProjectionStatus(props: {
  projection?: { warning?: string; error?: string; refreshing?: boolean; retry?: () => void }
  retryLabel: string
}) {
  const projection = props.projection
  return <>
    {projection?.error || projection?.warning ? <div role={projection.error ? "alert" : "status"}>
      <span>Display: {projection.error ?? projection.warning}</span>
      <IconButton disabled={projection.refreshing} onClick={projection.retry} aria-label={props.retryLabel}>
        <RefreshCw size={16} aria-hidden="true" />
      </IconButton>
    </div> : null}
  </>
}
