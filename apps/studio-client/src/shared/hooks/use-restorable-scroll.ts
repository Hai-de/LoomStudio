import { useCallback, useRef, type UIEvent } from 'react'

type ScrollPosition = {
  left: number
  top: number
}

const scrollPositions = new Map<string, ScrollPosition>()

export function useRestorableScroll<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null)

  const attach = useCallback((element: T | null) => {
    ref.current = element
    if (!element) return
    const position = scrollPositions.get(key)
    if (position) element.scrollTo(position)

    return () => {
      scrollPositions.set(key, { left: element.scrollLeft, top: element.scrollTop })
      ref.current = null
    }
  }, [key])

  const onScroll = useCallback((event: UIEvent<T>) => {
    const element = event.currentTarget
    scrollPositions.set(key, { left: element.scrollLeft, top: element.scrollTop })
  }, [key])

  return { onScroll, ref, attach }
}
