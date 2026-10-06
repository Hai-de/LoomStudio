import { useEffect, useRef, useState } from 'react'
import { tryWriteClipboardText } from '../browser/clipboard.js'

export function useCopyFeedback() {
  const [feedback, setFeedback] = useState<{ id: string; status: 'copied' | 'failed' }>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  async function copy(text: string, id = '') {
    const copied = await tryWriteClipboardText(text)
    setFeedback({ id, status: copied ? 'copied' : 'failed' })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFeedback(undefined), 1600)
  }

  return { feedback, copy }
}
