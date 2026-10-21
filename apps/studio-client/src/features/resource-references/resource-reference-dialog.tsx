import { useEffect, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Dialog, IconButton } from '@loom-studio/ui'
import { parseResourceLink } from '@loom-studio/shared'
import { loadEntityReference, type EntityReferenceView } from './entity-reference-model.js'
import type { StudioApi } from '../../shared/api/studio-api.js'
import type { Translator } from '../../shared/i18n/index.js'
import { loadResourceReference, type ReferenceView } from './reference-model.js'
import styles from './resource-reference-dialog.module.scss'

export function ResourceReferenceDialog(props: {
  t: Translator
  api: StudioApi
  onOpenEditor(target: NonNullable<ReferenceView['editor']>): void
  uri?: string
  onClose(): void
  onNavigate(uri: string): void
}) {
  const uri = props.uri
  const selected = useRef<HTMLSpanElement>(null)
  const [result, setResult] = useState<{ uri: string; view?: ReferenceView; entity?: EntityReferenceView; error?: string }>()

  useEffect(() => {
    if (!uri) return
    let active = true
    const reference = parseResourceLink(uri)
    if (reference?.kind === 'entity') {
      void loadEntityReference(props.api, reference).then(
        entity => { if (active) setResult({ uri, entity }) },
        error => { if (active) setResult({ uri, error: error instanceof Error ? error.message : String(error) }) },
      )
    } else {
      void loadResourceReference(props.api, uri).then(
        view => { if (active) setResult({ uri, view }) },
        error => { if (active) setResult({ uri, error: error instanceof Error ? error.message : String(error) }) },
      )
    }
    return () => { active = false }
  }, [uri, props.api])

  const current = result?.uri === uri ? result : undefined
  const view = current?.view
  useEffect(() => { selected.current?.scrollIntoView({ block: 'center' }) }, [view])

  if (!uri) return null
  return (
    <Dialog showCloseButton={false} open onClose={props.onClose} className={styles.dialog} title={current?.entity?.title ?? view?.title ?? props.t('reference.title')}
      headerActions={<>
        {view?.editor ? <IconButton title={props.t('reference.openEditor')} aria-label={props.t('reference.openEditor')} onClick={() => props.onOpenEditor(view.editor!)}><ExternalLink size={16} /></IconButton> : null}
        <IconButton title={props.t('agent.close')} aria-label={props.t('agent.close')} onClick={props.onClose}><X size={18} /></IconButton>
      </>}>
      <div className={styles.content}>
          {view?.path ? <div className={styles.path} title={view.path}>{view.path}</div> : null}
          {view ? <div className={styles.status}>{!view.exact
            ? props.t('reference.versionChanged')
            : view.range ? props.t('reference.exactLines', { start: view.range.startLine, end: view.range.endLine })
              : props.t('reference.invalidRange')}</div> : null}
        {!current ? <p role="status">{props.t('reference.loading')}</p> : current.error ? <p role="alert">{current.error}</p> : null}
        {current?.entity && <div className={styles.entity}>
          {current.entity.avatarUrl && <img src={current.entity.avatarUrl} alt="" />}
          <div><strong>{current.entity.title}</strong>{current.entity.note && <p>{current.entity.note}</p>}</div>
          {current.entity.uri && <button type="button" onClick={() => props.onNavigate(current.entity!.uri!)}><ExternalLink size={16} />{props.t('reference.open')}</button>}
        </div>}
        {view ? <div className={styles.body} tabIndex={0}>
          {view.body.split('\n').map((line, index) => <span
            key={index}
            ref={view.range?.startLine === index + 1 ? selected : undefined}
            data-selected={Boolean(view.range && index + 1 >= view.range.startLine && index + 1 <= view.range.endLine)}
          ><span className={styles.number} aria-hidden="true">{index + 1}</span><code>{line || '\u00a0'}</code></span>)}
        </div> : null}
      </div>
    </Dialog>
  )
}
