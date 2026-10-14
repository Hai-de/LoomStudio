import { Dialog } from '@loom-studio/ui'
import type { Translator } from '../../../shared/i18n/index.js'
import styles from './card-delete-confirmation.module.scss'

export function CardDeleteConfirmation(props: {
  busy: boolean
  count: number
  name?: string
  includePlayData: boolean
  includePromptResources: boolean
  onCancel(): void
  onConfirm(): void
  onIncludePlayDataChange(value: boolean): void
  onIncludePromptResourcesChange(value: boolean): void
  open: boolean
  timelineCount: number
  previewReady: boolean
  previewError?: string
  operationError?: string
  onRetryPreview(): void
  t: Translator
}) {
  return (
    <Dialog
      actions={(
        <>
          <button disabled={props.busy} type="button" onClick={props.onCancel}>{props.t('character.cancel')}</button>
          <button className={styles.deleteButton} disabled={props.busy || props.count === 0 || !props.previewReady} type="button" onClick={props.onConfirm}>{props.t('character.confirmDelete')}</button>
        </>
      )}
      closeOnBackdrop
      description={props.t('character.deleteConfirmBody', { count: props.count })}
      dismissible={!props.busy}
      open={props.open}
      role="alertdialog"
      title={props.name ? `${props.t('character.deleteConfirmTitle')} · ${props.name}` : props.t('character.deleteConfirmTitle')}
      onClose={props.onCancel}
    >
      {props.operationError ? <p role="alert">{props.operationError}</p> : null}
      {!props.previewReady ? props.previewError ? (
        <div role="alert">
          <p>{props.t('character.deletePreviewFailed')}: {props.previewError}</p>
          <button disabled={props.busy} type="button" onClick={props.onRetryPreview}>{props.t('character.deletePreviewRetry')}</button>
        </div>
      ) : <p role="status">{props.t('character.deletePreviewLoading')}</p> : null}
      {props.previewReady && props.timelineCount > 0 ? (
        <label className={styles.deletePlayDataOption}>
          <input checked={props.includePlayData} disabled={props.busy} type="checkbox" onChange={event => props.onIncludePlayDataChange(event.target.checked)} />
          <span>{props.t('character.deletePlayData', { count: props.timelineCount })}</span>
        </label>
      ) : null}
      <label className={styles.deletePlayDataOption}>
        <input checked={props.includePromptResources} disabled={props.busy} type="checkbox" onChange={event => props.onIncludePromptResourcesChange(event.target.checked)} />
        <span>{props.t('character.deletePromptResources')}</span>
      </label>
    </Dialog>
  )
}

