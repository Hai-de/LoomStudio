import { lazy, Suspense, useRef, useState } from 'react'
import { Button, Dialog, LoadingText } from '@loom-studio/ui'
import type { AgentMutationApproval } from '../../shared/api/studio-api.js'
import type { Translator } from '../../shared/i18n/index.js'
import styles from './agent-chat-panel.module.scss'

const LazyReadOnlyDiff = lazy(async () => ({ default: (await import('../../shared/ui/read-only-diff/read-only-diff.js')).ReadOnlyDiff }))

export function AgentMutationApprovalDialog(props: {
  approval: AgentMutationApproval
  onClose?(): void
  onApprove?(allow: boolean, reason?: string): Promise<boolean>
  t: Translator
}) {
  const { approval, t } = props
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  async function submit(allow: boolean) {
    if (submitting.current || !props.onApprove) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const accepted = await props.onApprove(allow, allow ? undefined : reason.trim() || undefined)
      if (accepted) setReason('')
      else setError(t('agent.approvalNotAccepted'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return <Dialog open dismissible={Boolean(props.onClose) && !busy} onClose={() => props.onClose?.()} className={styles.mutationApproval}
    title={t(approval.action ? 'agent.approvalReadTitle' : approval.preview.action === 'author-mode' ? 'agent.approvalAuthorTitle' : 'agent.approvalMutationTitle')}
    description={approval.action ? t('agent.approvalReadDescription') : `${approval.preview.action} · ${approval.preview.path}`}
    actions={<>
      <Button disabled={busy || !props.onApprove} onClick={() => void submit(false)}>{t('agent.approvalDeny')}</Button>
      <Button disabled={busy || !props.onApprove} onClick={() => void submit(true)}>{t('agent.approvalAllow')}</Button>
    </>}>
    <div className={styles.mutationApprovalDiff}>
      {approval.action ? <div>
        <span>{t('agent.approvalReadScope')}</span>
        <pre>{[
          `Timeline: ${approval.action.timelineId}`,
          `Branch: ${approval.action.branchId}`,
          approval.action.selection.kind === 'tail'
            ? t('agent.approvalTail', { count: approval.action.selection.count })
            : approval.action.selection.kind === 'floors' ? `#${approval.action.selection.from}–#${approval.action.selection.through}`
            : t('agent.approvalAfter', { id: approval.action.selection.afterNodeId ?? t('agent.approvalBranchStart') }),
          t('agent.approvalThrough', { id: approval.action.selection.throughNodeId ?? t('agent.approvalPinnedHead') }),
          t('agent.approvalLimits', { nodes: approval.action.maxNodes, characters: approval.action.maxCharacters }),
        ].join('\n')}</pre>
      </div> : approval.preview.action === 'author-mode' ? <>
        <div><span>{t('agent.approvalCurrentScope')}</span><pre>{approval.preview.before}</pre></div>
        <div><span>{t('agent.approvalRequestedScope')}</span><pre>{approval.preview.after}</pre></div>
      </> : <Suspense fallback={<LoadingText />}>
        <LazyReadOnlyDiff before={approval.preview.before} after={approval.preview.after} t={t} />
      </Suspense>}
    </div>
    {approval.preview?.kind === 'state' && approval.preview.pointer
      ? <code className={styles.mutationApprovalPointer}>{approval.preview.pointer}</code> : null}
    <input aria-label={t('agent.approvalReason')} placeholder={t('agent.approvalReason')}
      className={styles.mutationApprovalReason} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} />
    {error ? <p role="alert">{error}</p> : null}
  </Dialog>
}
