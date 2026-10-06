import { useRef, useState } from 'react'
import { Check, MessagesSquare, Pencil, Star, X } from 'lucide-react'
import { Button, Dialog, IconButton, SearchField, TextInput } from '@loom-studio/ui'
import type { AgentPreset, AgentSession } from '../../entities/index.js'
import type { Translator } from '../../shared/i18n/index.js'
import { normalizeSearchText } from '../../shared/lib/text.js'
import styles from './agent-session-picker.module.scss'

type RenameSession = (id: string, title: string) => Promise<AgentSession | undefined>

function SessionTitleInput(props: {
  session: AgentSession
  disabled: boolean
  autoFocus?: boolean
  onRename: RenameSession
  onSaved?(): void
  onCancel?(): void
  onBusyChange(busy: boolean): void
  t: Translator
}) {
  const [draft, setDraft] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)

  async function save() {
    if (draft === undefined || saving.current || props.disabled) return
    const title = draft.trim()
    if (title === (props.session.title ?? '')) {
      setDraft(undefined)
      props.onSaved?.()
      return
    }
    saving.current = true
    setBusy(true)
    props.onBusyChange(true)
    setError('')
    try {
      const updated = await props.onRename(props.session.id, title)
      if (!updated) {
        setError('会话名称未保存')
        return
      }
      setDraft(undefined)
      props.onSaved?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      saving.current = false
      setBusy(false)
      props.onBusyChange(false)
    }
  }

  return <div className={styles.nameEditor}>
    <TextInput className={styles.nameInput} aria-label="会话名称"
      placeholder={props.t('sessions.untitledAgentSession')}
      value={draft ?? props.session.title ?? ''} autoFocus={props.autoFocus}
      disabled={props.disabled || busy} onChange={event => setDraft(event.target.value)}
      onBlur={() => void save()} onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); void save() }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          setDraft(undefined)
          setError('')
          props.onCancel?.()
        }
      }} />
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </div>
}

export function AgentSessionPicker(props: {
  session?: AgentSession
  sessions: AgentSession[]
  presets: AgentPreset[]
  primarySessionId?: string
  timelineId?: string
  disabled: boolean
  sessionReady?: boolean
  onSelect?(id: string): void
  onRename?: RenameSession
  onSetPrimary?(session: AgentSession): Promise<void>
  t: Translator
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string>()
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string>()
  const [error, setError] = useState('')
  const [renaming, setRenaming] = useState(false)
  const presetName = (session: AgentSession) =>
    props.presets.find(preset => preset.id === session.agentPresetId)?.rootNode.label ?? session.agentPresetId
  const title = (session: AgentSession) => session.title ?? props.t('sessions.untitledAgentSession')
  const search = normalizeSearchText(query)
  const sessions = props.sessions.filter(session =>
    normalizeSearchText(`${title(session)} ${presetName(session)}`).includes(search))
  const locked = props.disabled || Boolean(pendingPrimaryId) || renaming

  async function makePrimary(session: AgentSession) {
    if (locked || !props.onSetPrimary) return
    setPendingPrimaryId(session.id)
    setError('')
    try { await props.onSetPrimary(session) }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setPendingPrimaryId(undefined) }
  }

  return <>
    <div className={styles.selector}>
      {props.session?.id === props.primarySessionId && props.session
        ? <Star className={styles.primaryIcon} aria-label="主写作对话" size={14} /> : null}
      {props.session && props.onRename
        ? <SessionTitleInput key={props.session.id} session={props.session} t={props.t}
          disabled={locked || props.sessionReady === false} onRename={props.onRename} onBusyChange={setRenaming} />
        : <TextInput className={styles.nameInput} readOnly aria-label={props.t('agent.session')}
          value={props.session ? title(props.session) : ''}
          placeholder={props.t('agent.sessionPending')} />}
      <IconButton size="small" aria-label="选择会话" title="选择会话" disabled={locked}
        onClick={() => { setQuery(''); setError(''); setEditingId(undefined); setOpen(true) }}>
        <MessagesSquare size={16} aria-hidden="true" />
      </IconButton>
    </div>
    {open ? <Dialog open title="Agent 会话" className={styles.dialog} dismissible={!locked}
      onClose={() => setOpen(false)}
      headerActions={<IconButton aria-label="关闭会话选择" title="关闭" disabled={locked}
        onClick={() => setOpen(false)}><X size={16} aria-hidden="true" /></IconButton>}
      actions={<Button disabled={locked} onClick={() => setOpen(false)}>关闭</Button>}>
      <div className={styles.pickerBody}>
        <SearchField aria-label="搜索会话" placeholder="搜索名称或预设" value={query}
          onChange={event => setQuery(event.target.value)} clearLabel="清除搜索" onClear={() => setQuery('')} />
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.pickerList} role="list" aria-label="会话列表">
          {sessions.map(session => {
            const primary = session.id === props.primarySessionId
            const selected = session.id === props.session?.id
            return <div key={session.id} className={styles.sessionRow} role="listitem"
              data-selected={selected}>
              {editingId === session.id && props.onRename
                ? <SessionTitleInput session={session} disabled={locked} autoFocus t={props.t}
                  onRename={props.onRename} onSaved={() => setEditingId(undefined)}
                  onCancel={() => setEditingId(undefined)} onBusyChange={setRenaming} />
                : <button type="button" className={styles.sessionChoice} disabled={locked || !props.onSelect}
                  aria-label={`打开会话：${title(session)}`} aria-current={selected ? 'true' : undefined}
                  onClick={() => { props.onSelect?.(session.id); setOpen(false) }}>
                  <MessagesSquare size={16} aria-hidden="true" />
                  <span className={styles.choiceText}>
                    <strong>{title(session)}</strong>
                    <span>{presetName(session)} · {new Date(session.updatedAt).toLocaleString()}</span>
                  </span>
                  {selected ? <Check size={15} aria-hidden="true" /> : null}
                </button>}
              <div className={styles.rowActions}>
                {props.onRename ? <IconButton size="small" aria-label={`重命名会话：${title(session)}`}
                  title="重命名会话" disabled={locked || editingId === session.id}
                  onClick={() => setEditingId(session.id)}><Pencil size={14} aria-hidden="true" /></IconButton> : null}
                <IconButton size="small" aria-label={primary ? `主写作对话：${title(session)}` : `设为主写作对话：${title(session)}`}
                  title={primary ? '当前主写作对话' : '设为主写作对话'}
                  className={primary ? styles.primaryIcon : undefined} aria-pressed={primary}
                  disabled={locked || primary || !props.onSetPrimary || !props.timelineId || session.timelineId !== props.timelineId}
                  onClick={() => void makePrimary(session)}>
                  <Star size={15} fill={primary ? 'currentColor' : 'none'} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          })}
          {!sessions.length ? <p className={styles.empty}>{query ? '没有匹配的会话' : '暂无会话'}</p> : null}
        </div>
      </div>
    </Dialog> : null}
  </>
}
