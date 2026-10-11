import { forwardRef } from 'react'
import { AlertCircle, Loader2, MessagesSquare, PanelRight, PanelRightClose, Star } from 'lucide-react'
import type { ActiveAgentRun } from '../../features/narrative-runtime/model/use-narrative-runtime.js'
import type { AgentSession, AgentTranscriptEntry } from '../../entities/index.js'
import type { Translator } from '../../shared/i18n/index.js'
import styles from './studio-page.module.scss'

export type StageAgentCapsuleProps = {
  activeRun?: ActiveAgentRun
  isPrimary?: boolean
  messages?: AgentTranscriptEntry[]
  open: boolean
  session?: AgentSession
  sessionsCount?: number
  t: Translator
  onToggle(): void
}

export type AgentRuntimePhase =
  | { kind: 'approval'; text: string }
  | { kind: 'running'; action: 'reasoning' | 'reading' | 'writing' | 'searching' | 'tool' | 'generating' | 'general'; text: string }
  | { kind: 'idle' }

export function resolveAgentRuntimePhase(
  activeRun?: ActiveAgentRun,
  messages?: AgentTranscriptEntry[],
  _t?: Translator,
): AgentRuntimePhase {
  if (activeRun?.approval || activeRun?.status === 'suspended') {
    return {
      kind: 'approval',
      text: '等待确认',
    }
  }

  if (activeRun?.status === 'running') {
    const activeEntry = messages ? findLastActiveTranscriptEntry(messages) : undefined
    if (activeEntry) {
      if (activeEntry.kind === 'reasoning') {
        return { kind: 'running', action: 'reasoning', text: '思考中...' }
      }
      if (activeEntry.kind === 'tool-invocation') {
        const toolId = String(activeEntry.toolId || '').toLowerCase()
        const exposedName = String(activeEntry.exposedName || activeEntry.toolId || '')
        if (toolId.includes('search') || exposedName.includes('搜索') || exposedName.includes('检索')) {
          return { kind: 'running', action: 'searching', text: '检索中...' }
        }
        if (toolId.includes('read') || toolId.includes('worldbook') || exposedName.includes('读取') || exposedName.includes('世界书')) {
          return { kind: 'running', action: 'reading', text: '读取中...' }
        }
        if (toolId.includes('patch') || toolId.includes('write') || toolId.includes('edit') || exposedName.includes('修改') || exposedName.includes('编辑') || toolId.includes('code')) {
          return { kind: 'running', action: 'writing', text: '写作中...' }
        }
        if (toolId.includes('web') || toolId.includes('http') || exposedName.includes('网页')) {
          return { kind: 'running', action: 'reading', text: '读取网页...' }
        }
        return { kind: 'running', action: 'tool', text: exposedName ? `${exposedName}...` : '调用工具...' }
      }
      if (activeEntry.kind === 'message' && activeEntry.state === 'partial') {
        return { kind: 'running', action: 'generating', text: '生成中...' }
      }
    }
    return { kind: 'running', action: 'general', text: '运行中...' }
  }

  return { kind: 'idle' }
}

function findLastActiveTranscriptEntry(messages: AgentTranscriptEntry[]) {
  const toolResults = new Set<string>()
  for (let i = messages.length - 1; i >= 0; i--) {
    const entry = messages[i]?.entry
    if (!entry) continue
    if (entry.kind === 'tool-result' && entry.invocationId) {
      toolResults.add(String(entry.invocationId))
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const entry = messages[i]?.entry
    if (!entry) continue
    if (
      entry.kind === 'provider-observation' ||
      entry.kind === 'request-measurement' ||
      entry.kind === 'run-state'
    ) {
      continue
    }
    if (entry.kind === 'tool-invocation') {
      const invId = String(entry.invocationId ?? '')
      if (!invId || !toolResults.has(invId)) {
        return entry
      }
      continue
    }
    if (entry.kind === 'reasoning') {
      return entry
    }
    if (entry.kind === 'message') {
      return entry
    }
  }
  return undefined
}

export const StageAgentCapsule = forwardRef<HTMLButtonElement, StageAgentCapsuleProps>(function StageAgentCapsule(props, ref) {
  const phase = resolveAgentRuntimePhase(props.activeRun, props.messages, props.t)
  const isRunning = phase.kind === 'running'
  const isApproval = phase.kind === 'approval'

  const sessionTitle = props.session?.title?.trim() || props.t('sessions.untitledAgentSession')
  const count = props.sessionsCount ?? 0

  const toggleTitle = props.open ? props.t('agent.hide') : props.t('agent.open')

  return (
    <button
      ref={ref}
      aria-expanded={props.open}
      aria-label={`${props.open ? '关闭' : '打开'} Agent 面板`}
      className={[
        styles.stageAgentCapsule,
        props.open ? styles.stageAgentCapsuleOpen : '',
        isRunning ? styles.stageAgentCapsuleRunning : '',
        isApproval ? styles.stageAgentCapsuleApproval : '',
      ].filter(Boolean).join(' ')}
      title={toggleTitle}
      type="button"
      onClick={props.onToggle}
    >
      <span className={styles.stageAgentCapsuleLeading}>
        {isRunning ? (
          <Loader2 aria-hidden="true" className={styles.stageAgentSpinner} />
        ) : isApproval ? (
          <AlertCircle aria-hidden="true" className={styles.stageAgentApprovalIcon} />
        ) : props.isPrimary ? (
          <Star aria-hidden="true" className={styles.stageAgentPrimaryStar} />
        ) : (
          <MessagesSquare aria-hidden="true" className={styles.stageAgentIcon} />
        )}
      </span>

      <span className={styles.stageAgentCapsuleBody}>
        {isRunning || isApproval ? (
          <span className={styles.stageAgentStatusText}>{phase.text}</span>
        ) : (
          <span className={styles.stageAgentTitle}>{sessionTitle}</span>
        )}

        {count > 0 && !isRunning && !isApproval ? (
          <span className={styles.stageAgentBadge}>{count}</span>
        ) : null}
      </span>

      <span className={styles.stageAgentCapsuleTrailing}>
        {props.open ? (
          <PanelRightClose aria-hidden="true" className={styles.stageAgentToggleIcon} />
        ) : (
          <PanelRight aria-hidden="true" className={styles.stageAgentToggleIcon} />
        )}
      </span>
    </button>
  )
})
