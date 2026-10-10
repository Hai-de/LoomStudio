import type { ReactNode } from 'react'

export type LoadingTextProps = {
  className?: string
  children?: ReactNode
  label?: string
}

export function LoadingText(props: LoadingTextProps) {
  const content = props.children ?? props.label ?? '读取中…'
  return (
    <span
      aria-live="polite"
      className={props.className}
      data-loom-ui-loading-text=""
      role="status"
    >
      {content}
    </span>
  )
}
