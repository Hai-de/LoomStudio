import { useState } from 'react'
import { Bot, Check, Package, Plus, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Button, Dialog, IconButton, SearchField } from '@loom-studio/ui'
import type { AgentPreset, AgentSession } from '../../entities/index.js'
import { normalizeSearchText } from '../../shared/lib/text.js'
import styles from './agent-session-picker.module.scss'

export function AgentSessionCreateDialog(props: {
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
    ? `扩展 · ${preset.origin.packageId}` : preset.origin?.kind === 'builtin' ? '官方资源' : '我的资源'
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

  return <Dialog open title="新建 Agent 对话" className={styles.dialog} dismissible={!busy}
    onClose={props.onClose}
    headerActions={<IconButton aria-label="关闭新建对话" title="关闭" disabled={busy} onClick={props.onClose}>
      <X size={16} aria-hidden="true" />
    </IconButton>}
    actions={<>
    <Button disabled={busy} onClick={props.onClose}>取消</Button>
    <Button aria-label="创建对话" disabled={!selectedPreset || busy} onClick={() => void create()}>
      <Plus size={15} aria-hidden="true" />{busy ? '正在创建' : '创建对话'}
    </Button>
  </>}>
    <div className={styles.pickerBody}>
      <SearchField aria-label="搜索 Agent 预设" placeholder="搜索预设名称或来源"
        value={query} onChange={event => setQuery(event.target.value)} clearLabel="清除搜索" onClear={() => setQuery('')} />
      <div className={styles.pickerList} role="group" aria-label="Agent 预设">
        {presets.map(preset => <button key={preset.id} type="button"
          className={styles.presetChoice} aria-pressed={preset.id === presetId}
          aria-label={`选择预设：${preset.rootNode.label}`} disabled={busy} onClick={() => setPresetId(preset.id)}>
          {preset.origin?.kind === 'extension-package' ? <Package size={18} aria-hidden="true" /> : <Bot size={18} aria-hidden="true" />}
          <span className={styles.choiceText}><strong>{preset.rootNode.label}</strong><span>{source(preset)}</span></span>
          {preset.id === presetId ? <Check size={16} aria-hidden="true" /> : null}
        </button>)}
        {!presets.length ? <p className={styles.empty}>{query ? '没有匹配的预设' : '暂无可用预设'}</p> : null}
      </div>
      <div className={styles.primaryOption}>
        <span>设为主写作对话</span>
        <button type="button" className={styles.switch} role="switch" aria-label="设为主写作对话"
          aria-checked={makePrimary} disabled={busy || !props.canMakePrimary}
          onClick={() => setMakePrimary(!makePrimary)}>
          {makePrimary ? <ToggleRight size={20} aria-hidden="true" /> : <ToggleLeft size={20} aria-hidden="true" />}
        </button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  </Dialog>
}
