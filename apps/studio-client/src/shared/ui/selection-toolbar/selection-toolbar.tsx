import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@loom-studio/ui'
import { Copy, Quote } from 'lucide-react'
import type { Translator } from '../../i18n/index.js'
import { useCopyFeedback } from '../../hooks/use-copy-feedback.js'
import styles from './selection-toolbar.module.scss'

type SelectedText = { text: string; range: Range; message: Element }

export function appendQuote(input: string, text: string): string {
  const quote = text.trim().split(/\r?\n/).map(line => `> ${line}`).join('\n')
  return `${input}${input ? '\n\n' : ''}${quote}\n\n`
}

export function SelectionToolbar(props: {
  containerRef: RefObject<HTMLElement | null>
  inputRef: RefObject<HTMLTextAreaElement | null>
  onQuote(text: string): void
  t: Translator
}) {
  const [selection, setSelection] = useState<SelectedText>()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const { feedback, copy } = useCopyFeedback()

  useEffect(() => {
    const clear = () => setSelection(undefined)
    const read = () => {
      const selected = window.getSelection()
      const root = props.containerRef.current
      if (!root || !selected || selected.isCollapsed || !selected.rangeCount) { clear(); return }
      const range = selected.getRangeAt(0)
      const element = (node: Node) => node instanceof Element ? node : node.parentElement
      const start = element(range.startContainer)
      const end = element(range.endContainer)
      const message = start?.closest('[data-loom-message-content]')
      // Keep the selection inside one rendered message; editors and embedded controls own their selections.
      if (!message || !root.contains(message) || !message.contains(range.endContainer)
        || start?.closest('input, textarea, [contenteditable], button, [role="button"]')
        || end?.closest('input, textarea, [contenteditable], button, [role="button"]')) { clear(); return }
      const text = selected.toString()
      if (!text.trim()) { clear(); return }
      setSelection({ text, range: range.cloneRange(), message })
    }
    const pointerUp = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) read()
    }
    const pointerDown = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) clear()
    }
    const keyUp = (event: KeyboardEvent) => {
      if (event.key.startsWith('Arrow') && event.shiftKey) read()
    }
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clear()
      if (event.key === 'Tab' && !event.shiftKey && toolbarRef.current
        && toolbarRef.current.style.visibility !== 'hidden'
        && !toolbarRef.current.contains(document.activeElement)) {
        event.preventDefault()
        toolbarRef.current.querySelector('button')?.focus()
      }
    }
    const selectionChange = () => {
      if (window.getSelection()?.isCollapsed && !toolbarRef.current?.contains(document.activeElement)) clear()
    }
    document.addEventListener('pointerup', pointerUp)
    document.addEventListener('pointerdown', pointerDown)
    document.addEventListener('keyup', keyUp)
    document.addEventListener('keydown', keyDown)
    document.addEventListener('selectionchange', selectionChange)
    return () => {
      document.removeEventListener('pointerup', pointerUp)
      document.removeEventListener('pointerdown', pointerDown)
      document.removeEventListener('keyup', keyUp)
      document.removeEventListener('keydown', keyDown)
      document.removeEventListener('selectionchange', selectionChange)
    }
  }, [props.containerRef])

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar || !selection) return
    const update = () => {
      const { range, message } = selection
      if (!message.isConnected || !message.contains(range.startContainer) || !message.contains(range.endContainer)) {
        setSelection(undefined)
        return
      }
      // The message can be clipped by its conversation viewport, not just the browser window.
      let left = 0, top = 0, right = window.innerWidth, bottom = window.innerHeight
      for (let parent = message.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        const clipsX = /auto|scroll|hidden|clip/.test(style.overflowX)
        const clipsY = /auto|scroll|hidden|clip/.test(style.overflowY)
        if (!clipsX && !clipsY) continue
        const bounds = parent.getBoundingClientRect()
        if (clipsX) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right) }
        if (clipsY) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom) }
      }
      const rect = range.getBoundingClientRect()
      const visibleLeft = Math.max(left, rect.left), visibleRight = Math.min(right, rect.right)
      const visibleTop = Math.max(top, rect.top), visibleBottom = Math.min(bottom, rect.bottom)
      const hidden = visibleLeft >= visibleRight || visibleTop >= visibleBottom
      toolbar.style.visibility = hidden ? 'hidden' : 'visible'
      toolbar.inert = hidden
      if (hidden) return
      const { width, height } = toolbar.getBoundingClientRect()
      toolbar.style.left = `${Math.max(8, Math.min((visibleLeft + visibleRight) / 2 - width / 2, window.innerWidth - width - 8))}px`
      toolbar.style.top = `${Math.max(8, Math.min(visibleTop >= height + 16 ? visibleTop - height - 8 : visibleBottom + 8, window.innerHeight - height - 8))}px`
    }
    let frame: number | undefined
    const scheduleUpdate = () => {
      if (frame !== undefined) return
      frame = requestAnimationFrame(() => { frame = undefined; update() })
    }
    update()
    document.addEventListener('scroll', scheduleUpdate, true)
    window.addEventListener('resize', scheduleUpdate)
    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(selection.message)
    observer.observe(toolbar)
    if (props.containerRef.current) observer.observe(props.containerRef.current)
    return () => {
      document.removeEventListener('scroll', scheduleUpdate, true)
      window.removeEventListener('resize', scheduleUpdate)
      observer.disconnect()
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [selection, feedback, props.t, props.containerRef])

  if (!selection) return null
  const copyLabel = feedback?.id === selection.text
    ? props.t(feedback.status === 'copied' ? 'selection.copied' : 'selection.copyFailed')
    : props.t('selection.copy')
  return createPortal(<div ref={toolbarRef} className={styles.toolbar} role="group" aria-label={props.t('selection.label')}
    onPointerDown={event => event.preventDefault()}
    onBlur={event => {
      if (event.currentTarget.style.visibility !== 'hidden' && !event.currentTarget.contains(event.relatedTarget)) setSelection(undefined)
    }}>
    <Button onClick={() => void copy(selection.text, selection.text)}><Copy size={16} aria-hidden="true" /><span aria-live="polite">{copyLabel}</span></Button>
    <Button disabled={props.inputRef.current?.disabled} onClick={() => {
      props.onQuote(selection.text)
      setSelection(undefined)
      window.getSelection()?.removeAllRanges()
      const input = props.inputRef.current
      requestAnimationFrame(() => {
        if (!input?.isConnected) return
        input.focus()
        input.setSelectionRange(input.value.length, input.value.length)
      })
    }}><Quote size={16} aria-hidden="true" />{props.t('selection.quote')}</Button>
  </div>, document.body)
}
