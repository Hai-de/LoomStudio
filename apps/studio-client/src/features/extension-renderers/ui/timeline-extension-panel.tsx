import { useEffect, useRef, useState } from 'react'
import { Database, Library, Plus, RefreshCw, RotateCcw } from 'lucide-react'
import { Button, Dialog } from '@loom-studio/ui'
import { extensionInstallationId } from '@loom-studio/extension-sdk'
import type { Card, ListExtensionInstallationsResult } from '../../../entities/index.js'
import type { ExtensionInstallationSource, TimelineExtensionAdoptionPreview, TimelineExtensionParticipation, TimelineExtensionRecoveryPreview, TimelineExtensionResourceInspection } from '../../../entities/extension.js'
import type { StudioApi } from '../../../shared/api/studio-api.js'
import type { Translator } from '../../../shared/i18n/index.js'
import { PanelTabs } from '../../../shared/ui/panel-tabs/index.js'
import styles from './timeline-extension-panel.module.scss'

export type TimelineExtensionPanelProps = {
  api: StudioApi['timelineExtensions']
  installations: ListExtensionInstallationsResult['installations']
  card?: Pick<Card, 'id' | 'version' | 'name' | 'extensionAdoptions'>
  timeline?: { id: string; branchId: string; title?: string; cardId?: string }
  refreshToken?: number
  t: Translator
  onSaveDefaults(input: { cardId: string; expectedVersion: number; extensionAdoptions: NonNullable<Card['extensionAdoptions']> }): Promise<unknown>
  onChanged(): void | Promise<unknown>
}

type Preview = { kind: 'adopt'; value: TimelineExtensionAdoptionPreview }
  | { kind: 'initialize'; value: TimelineExtensionAdoptionPreview }
  | { kind: 'recover'; value: TimelineExtensionRecoveryPreview }

export function TimelineExtensionPanel(props: TimelineExtensionPanelProps) {
  const [mode, setMode] = useState<'timeline' | 'card'>(props.timeline ? 'timeline' : 'card')
  const [config, setConfig] = useState<TimelineExtensionParticipation>()
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Preview>()
  const [resources, setResources] = useState<TimelineExtensionResourceInspection>()
  const [acceptSource, setAcceptSource] = useState(false)
  const mounted = useRef(false)
  const pending = useRef(false)
  const request = useRef(0)
  const installationRevision = JSON.stringify(props.installations.map(item => [item.id, item.version]))

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; request.current += 1 }
  }, [])

  async function refresh() {
    const id = ++request.current
    if (!props.timeline) { setConfig(undefined); return }
    setLoading(true)
    try {
      const result = await props.api.get({ timelineId: props.timeline.id })
      if (mounted.current && id === request.current) { setConfig(result); setError('') }
    } catch (cause) {
      if (mounted.current && id === request.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (mounted.current && id === request.current) setLoading(false)
    }
  }

  useEffect(() => {
    setConfig(undefined)
    setPreview(undefined)
    setResources(undefined)
    void refresh()
    return () => { request.current += 1 }
  }, [props.api, props.timeline?.id, props.timeline?.branchId, props.refreshToken, installationRevision])

  async function run(action: () => Promise<unknown>, mutation = false) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await action()
      if (!mounted.current) return
      if (mutation) {
        setPreview(undefined)
        await refresh()
        if (mounted.current) await props.onChanged()
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const cardId = mode === 'card' ? props.card?.id : props.timeline?.cardId
  const rows = new Map<string, {
    id: string; packageId: string; target: 'global' | 'card'
    installation?: ListExtensionInstallationsResult['installations'][number]
  }>(props.installations.filter(item => item.participation === 'timeline'
    && (item.target.kind === 'global' || item.target.cardId === cardId))
    .map(item => [item.id, { id: item.id, packageId: item.packageId, target: item.target.kind, installation: item }]))
  if (mode === 'timeline') {
    for (const entry of config?.entries ?? []) {
      if (!rows.has(entry.installationId)) rows.set(entry.installationId, {
        id: entry.installationId, packageId: entry.packageId, target: entry.source?.kind === 'card' ? 'card' : 'global',
      })
    }
  } else if (props.card) {
    for (const reference of props.card.extensionAdoptions ?? []) {
      const id = extensionInstallationId(reference.packageId,
        reference.target === 'card' ? { kind: 'card', cardId: props.card.id } : { kind: 'global' })
      if (!rows.has(id)) rows.set(id, { id, packageId: reference.packageId, target: reference.target })
    }
  }
  const hasContext = mode === 'card' ? Boolean(props.card) : Boolean(props.timeline)
  const isSourceChange = preview?.kind === 'recover' && preview.value.sourceChanged

  return <section className={styles.panel} aria-busy={busy || loading}>
    <header className={styles.header}>
      <PanelTabs activeId={mode} onChange={setMode} ariaLabel={props.t('participation.title')} items={[
        { id: 'timeline', label: props.t('participation.timeline'), disabled: busy },
        { id: 'card', label: props.t('participation.cardDefaults'), disabled: busy },
      ]} />
      <button type="button" className={styles.iconButton} title={props.t('participation.refresh')}
        aria-label={props.t('participation.refresh')} disabled={busy || loading} onClick={() => void refresh()}>
        <RefreshCw size={16} aria-hidden="true" />
      </button>
    </header>
    <h3>{mode === 'card' ? props.card?.name : props.timeline?.title ?? props.timeline?.id}</h3>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {!hasContext ? <p>{props.t(mode === 'card' ? 'participation.noCard' : 'participation.noTimeline')}</p>
      : loading && mode === 'timeline' ? <p role="status">{props.t('participation.loading')}</p>
        : <ul className={styles.list}>
          {[...rows.values()].map(row => {
            const entry = mode === 'timeline' ? config?.entries.find(item => item.installationId === row.id) : undefined
            const changed = Boolean(entry && row.installation && entry.installationVersion !== row.installation.version)
            const checked = mode === 'card'
              ? props.card?.extensionAdoptions?.some(item => item.packageId === row.packageId && item.target === row.target) === true
              : entry?.enabled === true
            const status = !row.installation ? 'missing' : changed ? 'recoveryRequired' : checked ? 'adopted' : entry ? 'paused' : 'notAdopted'
            return <li key={row.id} className={styles.row}>
              <div className={styles.identity}>
                <strong>{row.packageId}</strong>
                <small>{props.t(row.target === 'card'
                  ? 'participation.cardSource' : 'participation.globalSource')} · {row.installation?.packageVersion ?? entry?.packageVersion}</small>
                <small>{sourceLabel(row.installation?.source ?? entry?.source, props.t)}</small>
              </div>
              <span className={styles.status}>{props.t(`participation.${status}`)}</span>
              <div className={styles.actions}>
              {mode === 'timeline' ? <button type="button" className={styles.iconButton} disabled={busy}
                title={props.t('participation.resources')} aria-label={`${props.t('participation.resources')}: ${row.packageId}`}
                onClick={() => void run(async () => {
                  const revision = request.current
                  const result = await props.api.inspectResources({ timelineId: props.timeline!.id, installationId: row.id })
                  if (mounted.current && revision === request.current) setResources(result)
                })}><Library size={16} aria-hidden="true" /></button> : null}
              {mode === 'timeline' && checked && row.installation && !changed ? <button type="button"
                className={styles.iconButton} disabled={busy}
                title={props.t('participation.initializeState')} aria-label={`${props.t('participation.initializeState')}: ${row.packageId}`}
                onClick={() => void run(async () => {
                  const value = await props.api.previewStateInitialization({
                    timelineId: props.timeline!.id, branchId: props.timeline!.branchId, installationId: row.id,
                  })
                  if (mounted.current) setPreview({ kind: 'initialize', value })
                })}><Database size={16} aria-hidden="true" /></button> : null}
              {mode === 'card' ? <input type="checkbox" checked={checked} disabled={busy}
                aria-label={`${props.t('participation.cardDefaults')}: ${row.packageId}`}
                onChange={event => {
                  const card = props.card!
                  const references = (card.extensionAdoptions ?? []).filter(item => item.packageId !== row.packageId || item.target !== row.target)
                  if (event.target.checked) references.push({ packageId: row.packageId, target: row.target })
                  void run(() => props.onSaveDefaults({ cardId: card.id, expectedVersion: card.version, extensionAdoptions: references }))
                }} />
                : !entry ? <Button size="small" disabled={busy || !config || !row.installation} onClick={() => void run(async () => {
                  const value = await props.api.previewAdoption({
                    timelineId: props.timeline!.id, branchId: props.timeline!.branchId, installationId: row.id,
                  })
                  if (mounted.current) { setAcceptSource(false); setPreview({ kind: 'adopt', value }) }
                })}><Plus size={15} aria-hidden="true" />{props.t('participation.add')}</Button>
                  : changed ? <Button size="small" disabled={busy} onClick={() => void run(async () => {
                    const value = await props.api.previewRecovery({ timelineId: props.timeline!.id, installationId: row.id })
                    if (mounted.current) { setAcceptSource(false); setPreview({ kind: 'recover', value }) }
                  })}><RotateCcw size={15} aria-hidden="true" />{props.t('participation.recover')}</Button>
                    : <input type="checkbox" checked={checked} disabled={busy || !row.installation}
                      aria-label={`${props.t('participation.timeline')}: ${row.packageId}`}
                      onChange={event => { void run(() => props.api.update({
                        timelineId: props.timeline!.id, installationId: row.id, expectedVersion: config!.version, enabled: event.target.checked,
                      }), true) }} />}
              </div>
            </li>
          })}
          {rows.size === 0 ? <li>{props.t('participation.empty')}</li> : null}
        </ul>}
    {resources ? <Dialog open onClose={() => setResources(undefined)} title={props.t('participation.resources')}>
      <ul className={styles.resourceList}>{resources.resources.map(resource => <li key={`${resource.kind}:${resource.id}`}>
        <strong>{resource.label}</strong>
        <span>{resource.kind} · {props.t(resource.eligible ? 'participation.resourceEligible' : 'participation.resourceUnavailable')}</span>
        <code>{resource.contributionId}</code>
      </li>)}</ul>
      {!resources.resources.length ? <p>{props.t('participation.none')}</p> : null}
    </Dialog> : null}
    {preview ? <Dialog open dismissible={!busy} onClose={() => setPreview(undefined)}
      title={props.t(preview.kind === 'adopt' ? 'participation.confirmAdd'
        : preview.kind === 'initialize' ? 'participation.initializeState' : 'participation.confirmRecovery')}
      actions={<>
        <Button disabled={busy} onClick={() => setPreview(undefined)}>{props.t('participation.cancel')}</Button>
        <Button disabled={busy || Boolean(isSourceChange && !acceptSource) || (preview.kind === 'initialize' && !preview.value.paths.length)} onClick={() => void run(
          () => preview.kind === 'adopt' ? props.api.adopt(preview.value)
            : preview.kind === 'initialize' ? props.api.initializeState(preview.value)
              : props.api.recover({ ...preview.value, acceptSourceChange: acceptSource }), true,
        )}>{props.t('participation.confirm')}</Button>
      </>}>
      <p>{preview.value.packageId} · {preview.value.packageVersion}</p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <dl className={styles.preview}>
        {preview.kind === 'recover' ? <><dt>{props.t('participation.previousSource')}</dt><dd>{sourceLabel(preview.value.previousSource, props.t)}</dd></> : null}
        <dt>{props.t('participation.source')}</dt><dd>{sourceLabel(preview.value.source, props.t)}</dd>
        {preview.kind !== 'recover' ? <><dt>{props.t('participation.statePaths')}</dt><dd>{preview.value.paths.length
          ? preview.value.paths.join('\n') : props.t(preview.kind === 'initialize' ? 'participation.stateComplete' : 'participation.none')}</dd></> : null}
      </dl>
      {isSourceChange ? <label><input type="checkbox" checked={acceptSource} disabled={busy} onChange={event => setAcceptSource(event.target.checked)} />{props.t('participation.acceptSource')}</label> : null}
    </Dialog> : null}
  </section>
}

function sourceLabel(source: ExtensionInstallationSource | undefined, t: Translator): string {
  if (!source) return t('participation.unknownSource')
  if (source.kind === 'card') return t('participation.cardSource')
  return source.kind === 'local' ? source.directory : source.url
}
