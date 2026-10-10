import { useState } from 'react'
import { Bot, Check, Package, Plus, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Button, Dialog, IconButton, SearchField } from '@loom-studio/ui'
import type { AgentPreset, AgentSession } from '../../entities/index.js'
import { normalizeSearchText } from '../../shared/lib/text.js'
import type { Translator } from '../../shared/i18n/index.js'
import styles from './agent-session-picker.module.scss'

export function AgentSessionCreateDialog(props: {
  t: Translator
  presets: AgentPreset[]
  initialPresetId?: string
  canMakePrimary: boolean
  onCreate(presetId: string, makePrimary: boolean): Promise<AgentSession | undefined>
  onCreated(session: AgentSession): void
  onClose(): void
}) {
  const [presetId, setPresetId] = useState(props.initialPresetId ?? '')
  const [makePrimary, setMakePrimary] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const source = (preset: AgentPreset) => preset.origin?.kind === 'extension-package'
    ? props.t('agent.presetExtension', { name: preset.origin.packageId }) : props.t(preset.origin?.kind === 'builtin' ? 'agent.presetOfficial' : 'agent.presetPersonal')
  const search = normalizeSearchText(query)
  const presets = props.presets.filter(preset =>
    normalizeSearchText(`${preset.rootNode.label} ${source(preset)}`).includes(search))
  const selectedPreset = props.presets.find(preset => preset.id === presetId)

  async function create() {
    if (!selectedPreset || busy) return
    setBusy(true)
    setError('')
    try {
      const session = await props.onCreate(presetId, makePrimary)
      if (!session) return
      props.onCreated(session)
      props.onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return <Dialog open title={props.t('agent.createSession')} className={styles.dialog} dismissible={!busy}
    onClose={props.onClose}
    headerActions={<IconButton aria-label={props.t('agent.closeCreateSession')} title={props.t('agent.close')} disabled={busy} onClick={props.onClose}>
      <X size={16} aria-hidden="true" />
    </IconButton>}
    actions={<>
    <Button disabled={busy} onClick={props.onClose}>{props.t('character.cancel')}</Button>
    <Button aria-label={props.t('agent.createSessionAction')} disabled={!selectedPreset || busy} onClick={() => void create()}>
      <Plus size={15} aria-hidden="true" />{props.t(busy ? 'agent.creatingSession' : 'agent.createSessionAction')}
    </Button>
  </>}>
    <div className={styles.pickerBody}>
      <SearchField aria-label={props.t('agent.searchPresets')} placeholder={props.t('agent.searchPresetPlaceholder')}
        value={query} onChange={event => setQuery(event.target.value)} clearLabel={props.t('agent.clearSearch')} onClear={() => setQuery('')} />
      <div className={styles.pickerList} role="group" aria-label={props.t('agent.presets')}>
        {presets.map(preset => <button key={preset.id} type="button"
          className={styles.presetChoice} aria-pressed={preset.id === presetId}
          aria-label={props.t('agent.selectPresetNamed', { name: preset.rootNode.label })} disabled={busy} onClick={() => setPresetId(preset.id)}>
          {preset.origin?.kind === 'extension-package' ? <Package size={18} aria-hidden="true" /> : <Bot size={18} aria-hidden="true" />}
          <span className={styles.choiceText}><strong>{preset.rootNode.label}</strong><span>{source(preset)}</span></span>
          {preset.id === presetId ? <Check size={16} aria-hidden="true" /> : null}
        </button>)}
        {!presets.length ? <p className={styles.empty}>{props.t(query ? 'agent.noMatchingPresets' : 'agent.noPresets')}</p> : null}
      </div>
      <div className={styles.primaryOption}>
        <span>{props.t('agent.makePrimary')}</span>
        <button type="button" className={styles.switch} role="switch" aria-label={props.t('agent.makePrimary')}
          aria-checked={makePrimary} disabled={busy || !props.canMakePrimary}
          onClick={() => setMakePrimary(!makePrimary)}>
          {makePrimary ? <ToggleRight size={20} aria-hidden="true" /> : <ToggleLeft size={20} aria-hidden="true" />}
        </button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  </Dialog>
}
