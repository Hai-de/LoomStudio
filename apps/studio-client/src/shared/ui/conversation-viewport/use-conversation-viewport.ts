import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'

export function isConversationNearBottom(element: Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 48
}

export function useConversationViewport(options: {
  items: readonly { id: string }[]
  scopeId?: string
  pinnedId?: string
  overscan?: number
  composerHeight?: number
  composerExpanded?: boolean
  followInitially?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const followsBottomRef = useRef(options.followInitially !== false)
  const motionActiveRef = useRef(false)
  const [scrollMargin, setScrollMargin] = useState(0)
  const pinnedIndex = options.items.findIndex(item => item.id === options.pinnedId)
  const virtualizer = useVirtualizer({
    count: options.items.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: useCallback((index: number) => options.items[index].id, [options.items]),
    estimateSize: () => 280,
    overscan: options.overscan ?? 5,
    scrollMargin,
    anchorTo: 'end',
    followOnAppend: followsBottomRef.current,
    scrollEndThreshold: 48,
    useFlushSync: false,
    rangeExtractor: useCallback(range => {
      const indices = defaultRangeExtractor(range)
      if (pinnedIndex >= 0 && !indices.includes(pinnedIndex)) indices.push(pinnedIndex)
      return indices.sort((a, b) => a - b)
    }, [pinnedIndex]),
  })

  useLayoutEffect(() => {
    followsBottomRef.current = options.followInitially !== false
    if (followsBottomRef.current) virtualizer.scrollToEnd()
  }, [options.scopeId])

  useLayoutEffect(() => {
    const update = () => {
      const list = listRef.current
      const scroll = scrollRef.current
      if (list && scroll) setScrollMargin(list.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop - scroll.clientTop)
    }
    update()
    const observer = new ResizeObserver(update)
    if (headerRef.current) observer.observe(headerRef.current)
    if (scrollRef.current) observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [options.items.length > 0])

  useLayoutEffect(() => {
    const follow = () => {
      const element = scrollRef.current
      if (element && followsBottomRef.current) element.scrollTop = element.scrollHeight
    }
    follow()
    const observer = new ResizeObserver(follow)
    if (listRef.current) observer.observe(listRef.current)
    if (contentRef.current) observer.observe(contentRef.current)
    if (scrollRef.current) observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [options.items, options.composerHeight])

  useLayoutEffect(() => {
    if (options.composerExpanded === undefined || !followsBottomRef.current) return
    const element = scrollRef.current
    if (!element) return
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      element.scrollTop = element.scrollHeight
      return
    }
    let frame: number
    motionActiveRef.current = true
    const startedAt = performance.now()
    const follow = (timestamp: number) => {
      if (followsBottomRef.current) element.scrollTop = element.scrollHeight
      if (timestamp - startedAt < 200) frame = requestAnimationFrame(follow)
      else motionActiveRef.current = false
    }
    frame = requestAnimationFrame(follow)
    return () => {
      cancelAnimationFrame(frame)
      motionActiveRef.current = false
    }
  }, [options.composerExpanded])

  function onScroll() {
    if (!motionActiveRef.current && scrollRef.current) {
      followsBottomRef.current = isConversationNearBottom(scrollRef.current)
    }
  }

  return { scrollRef, listRef, headerRef, contentRef, virtualizer, scrollMargin, followsBottomRef, motionActiveRef, onScroll }
}
