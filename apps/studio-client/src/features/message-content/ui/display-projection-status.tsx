import { RefreshCw } from 'lucide-react'
import { IconButton } from '@loom-studio/ui'

export function DisplayProjectionStatus(props: {
  projection?: { warning?: string; error?: string; refreshing?: boolean; retry?: () => void }
  retryLabel: string
}) {
  const projection = props.projection
  return <>
    {projection?.warning ? <p role="status">Display: {projection.warning}</p> : null}
    {projection?.error ? <div role="alert">
      <span>Display: {projection.error}</span>
      <IconButton disabled={projection.refreshing} onClick={projection.retry} aria-label={props.retryLabel}>
        <RefreshCw size={16} aria-hidden="true" />
      </IconButton>
    </div> : null}
  </>
}
