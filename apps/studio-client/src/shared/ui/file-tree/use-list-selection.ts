import { useEffect, useRef, useState } from 'react'

/** Selection follows the visible order, independently of the item opened in an editor. */
export function useListSelection(ids: readonly string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)
  const anchor = useRef<string | undefined>(undefined)
  const stroke = useRef<{ last: string; add: boolean } | undefined>(undefined)
  const suppressClick = useRef(false)
  const clickExpiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const orderKey = JSON.stringify(ids)
  useEffect(() => {
    setSelected(current => {
      const next = new Set([...current].filter(id => ids.includes(id)))
      return next.size === current.size ? current : next
    })
  }, [orderKey])
  useEffect(() => {
    const stop = () => {
      stroke.current = undefined
      setSelecting(false)
      // A cross-row release clicks the common tree container. Keep suppression
      // through that browser click, then expire it if no click is generated.
      clearTimeout(clickExpiry.current)
      clickExpiry.current = setTimeout(() => { suppressClick.current = false }, 0)
    }
    window.addEventListener('pointerup', stop, true)
    window.addEventListener('pointercancel', stop, true)
    window.addEventListener('blur', stop)
    return () => {
      window.removeEventListener('pointerup', stop, true)
      window.removeEventListener('pointercancel', stop, true)
      window.removeEventListener('blur', stop)
      clearTimeout(clickExpiry.current)
    }
  }, [])
  function range(from: string, to: string) {
    const start = ids.indexOf(from)
    const end = ids.indexOf(to)
    return start < 0 || end < 0 ? [to] : ids.slice(Math.min(start, end), Math.max(start, end) + 1)
  }
  function begin(id: string, extend: boolean, additive: boolean, fallbackAnchor?: string) {
    clearTimeout(clickExpiry.current)
    const add = extend || !selectedRef.current.has(id)
    if (extend && !anchor.current) anchor.current = fallbackAnchor ?? id
    const values = extend ? range(anchor.current ?? id, id) : [id]
    setSelected(current => {
      const next = new Set(extend && !additive ? [] : current)
      for (const value of values) { if (add) next.add(value); else next.delete(value) }
      return next
    })
    if (!extend) anchor.current = id
    stroke.current = { last: id, add }
    suppressClick.current = true
    setSelecting(true)
  }
  function enter(id: string) {
    const active = stroke.current
    if (!active || active.last === id) return
    const values = range(active.last, id)
    active.last = id
    setSelected(current => {
      const next = new Set(current)
      for (const value of values) { if (active.add) next.add(value); else next.delete(value) }
      return next
    })
  }
  return {
    selected, selecting, begin, enter, setSelected,
    finishKeyboard: () => { stroke.current = undefined; suppressClick.current = false; setSelecting(false) },
    clear: () => { setSelected(new Set()); anchor.current = undefined },
    selectRange: (id: string, additive: boolean, fallbackAnchor?: string) => {
      const from = anchor.current ?? fallbackAnchor ?? id
      anchor.current = from
      setSelected(current => new Set([...(additive ? current : []), ...range(from, id)]))
    },
    consumeClick: () => { const suppressed = suppressClick.current; suppressClick.current = false; return suppressed },
  }
}
