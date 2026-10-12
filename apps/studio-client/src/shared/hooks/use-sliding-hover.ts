import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useEffectiveMotion } from './use-motion-preference.js'

export type SlidingHoverOptions = {
  /**
   * 用于查找 hover 目标项的 CSS 选择器。
   * 默认查找 `[data-hover-item]`。
   */
  itemSelector?: string
  /**
   * 水平内嵌边距（像素数或 CSS 字符串）。
   * 默认使用 `var(--loom-sliding-hover-inset-x, 4px)`。
   */
  insetX?: number | string
  /**
   * 当前激活/选中的项目 ID。当鼠标移到当前选中项上时，
   * 背景胶囊可自动淡出，避免与选中态指示器双层叠合。
   */
  activeId?: string
  /**
   * 从 DOM 元素读取 ID 的方法，用于比对 activeId。
   */
  readItemId?: (element: HTMLElement) => string | undefined
}

export type SlidingHoverResult<T extends HTMLElement = HTMLDivElement> = {
  /** 挂载到容器的 ref */
  containerRef: React.RefObject<T | null>
  /** 传给背景指示器 DOM 元素的 inline style */
  indicatorStyle: CSSProperties
  /** 当前指示器是否可见 */
  visible: boolean
  /** 当前被 hover 的条目 ID（若提供 readItemId） */
  hoveredId: string | undefined
  /** 绑定到容器的 pointerover 事件处理函数 */
  onPointerOver: (event: PointerEvent<T>) => void
  /** 绑定到容器的 pointerleave 事件处理函数 */
  onPointerLeave: () => void
}

export function useSlidingHover<T extends HTMLElement = HTMLDivElement>(
  options: SlidingHoverOptions = {},
): SlidingHoverResult<T> {
  const { itemSelector = '[data-hover-item]', insetX, activeId, readItemId } = options
  const containerRef = useRef<T | null>(null)
  const effectiveMotion = useEffectiveMotion()
  const [state, setState] = useState<{
    top: number
    height: number
    visible: boolean
    hasMoved: boolean
    hoveredId: string | undefined
  }>({
    top: 0,
    height: 0,
    visible: false,
    hasMoved: false,
    hoveredId: undefined,
  })

  const onPointerOver = useCallback(
    (event: PointerEvent<T>) => {
      const container = containerRef.current
      if (!container) return

      const rawTarget = event.target as HTMLElement | null
      const item = rawTarget?.closest<HTMLElement>(itemSelector)
      if (!item || !container.contains(item)) {
        setState(prev => (prev.visible ? { ...prev, visible: false, hasMoved: false, hoveredId: undefined } : prev))
        return
      }

      const containerRect = container.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      const top = itemRect.top - containerRect.top + container.scrollTop
      const height = itemRect.height
      const currentId = readItemId ? readItemId(item) : item.dataset.hoverItem || item.dataset.fileTreeNodeId

      setState(prev => {
        if (prev.visible && prev.top === top && prev.height === height && prev.hoveredId === currentId) {
          return prev
        }
        return {
          top,
          height,
          visible: true,
          hasMoved: prev.visible,
          hoveredId: currentId,
        }
      })
    },
    [itemSelector, readItemId],
  )

  const onPointerLeave = useCallback(() => {
    setState(prev => ({
      ...prev,
      visible: false,
      hasMoved: false,
      hoveredId: undefined,
    }))
  }, [])

  const allowTransition = effectiveMotion !== 'reduce'
  const transition = allowTransition
    ? state.hasMoved
      ? 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1), height 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 120ms ease'
      : 'opacity 120ms ease'
    : 'none'

  const isOverActive = Boolean(activeId && state.hoveredId && activeId === state.hoveredId)
  const isVisible = state.visible && !isOverActive

  const insetXValue = typeof insetX === 'number'
    ? `${insetX}px`
    : (insetX ?? 'var(--loom-sliding-hover-inset-x, 4px)')

  const indicatorStyle: CSSProperties = {
    position: 'absolute',
    left: insetXValue,
    right: insetXValue,
    top: 0,
    transform: `translateY(${state.top}px)`,
    height: `${state.height}px`,
    opacity: isVisible ? 1 : 0,
    pointerEvents: 'none',
    zIndex: 0,
    willChange: 'transform, opacity',
    transition,
  }

  return {
    containerRef,
    indicatorStyle,
    visible: isVisible,
    hoveredId: state.hoveredId,
    onPointerOver,
    onPointerLeave,
  }
}
