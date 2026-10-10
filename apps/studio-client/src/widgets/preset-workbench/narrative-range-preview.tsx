import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { StudioApi } from '../../shared/api/studio-api.js'
import type { Translator } from '../../shared/i18n/index.js'
import styles from './preset-workbench.module.scss'

type Preview = Awaited<ReturnType<StudioApi['narratives']['getEffectivePreview']>>

export function NarrativeRangePreview(props: {
  api: StudioApi['narratives']
  timelineId?: string
  branchId?: string
  t: Translator
}) {
  const [result, setResult] = useState<Preview>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    requestId.current++
    setResult(undefined)
    setError(undefined)
    setBusy(false)
  }, [props.timelineId, props.branchId])

  async function load() {
    if (!props.timelineId || !props.branchId) return
    const request = ++requestId.current
    setBusy(true)
    setError(undefined)
    try {
      const preview = await props.api.getEffectivePreview({ timelineId: props.timelineId, branchId: props.branchId })
      if (request === requestId.current) setResult(preview)
    } catch (cause) {
      if (request === requestId.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (request === requestId.current) setBusy(false)
    }
  }

  return <section className={styles.anchorPreview} aria-label={props.t('narrative.preview.ariaLabel')}>
    <h3>{props.t('narrative.preview.title')}</h3>
    <p>{props.t('narrative.preview.description')}</p>
    {props.timelineId && props.branchId ? <>
      <button className={styles.previewLoad} type="button" disabled={busy} onClick={() => void load()}>{busy ? props.t('narrative.preview.loading') : props.t('narrative.preview.load')}</button>
    </> : <p role="status">{props.t('narrative.preview.noTarget')}</p>}
    {error ? <p role="alert">{error}</p> : null}
    {result ? <div className={styles.previewResult}>
      <p className={styles.previewScope}>{result.sourceId === 'runtime.recent-100'
        ? props.t('narrative.preview.sampleRecent')
        : props.t('narrative.preview.summary', { memories: result.memory.length, nodes: result.nodes.length })}</p>
      {result.memory.map((entry, index) => <details className={styles.previewFragment} key={entry.id}>
        <summary><ChevronRight aria-hidden="true" />{props.t('narrative.preview.memoryIndex', { index: index + 1 })}</summary><pre>{entry.content}</pre>
      </details>)}
      {result.nodes.map((node, index) => <details className={styles.previewFragment} key={node.id}>
        <summary><ChevronRight aria-hidden="true" />{props.t('narrative.preview.nodeIndex', { index: index + 1 })}</summary><pre>{node.text}</pre>
      </details>)}
      {!result.complete ? <p role="status">{props.t('narrative.preview.tailNotice')}</p> : null}
    </div> : null}
  </section>
}
