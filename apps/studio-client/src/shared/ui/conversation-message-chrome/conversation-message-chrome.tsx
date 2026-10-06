import type { ReactNode } from 'react'
import { IconButton } from '@loom-studio/ui'
import styles from './conversation-message-chrome.module.scss'

export function ConversationMessageChrome(props: { actions: ReactNode; createdAt: string; index: number; metadata?: ReactNode }) {
  return (
    <footer className={styles.footer} data-conversation-message-footer>
      <span className={styles.timestamp} data-conversation-message-timestamp title={formatFullTimestamp(props.createdAt)}>
        #{props.index + 1} · {formatConversationTimestamp(props.createdAt)}
        {props.metadata}
      </span>
      <div className={styles.actions} data-conversation-message-actions>{props.actions}</div>
    </footer>
  )
}

export function ConversationMessageAction(props: { children: ReactNode; disabled?: boolean; label: string; onClick?: () => void }) {
  return (
    <IconButton aria-label={props.label} className={styles.action} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </IconButton>
  )
}

export function formatConversationTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatFullTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
