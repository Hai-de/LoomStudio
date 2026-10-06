import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isConversationNearBottom, useConversationViewport } from '../../../apps/studio-client/src/shared/ui/conversation-viewport/use-conversation-viewport.js'

const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  effects: [] as (() => void | (() => void))[],
  options: undefined as Record<string, any> | undefined,
  scrollToEnd: vi.fn(),
  resize: [] as (() => void)[],
}))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useRef: (initial: unknown) => {
    const index = hooks.cursor++
    hooks.slots[index] ??= { current: initial }
    return hooks.slots[index]
  },
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    hooks.slots[index] ??= initial
    return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = value }]
  },
  useCallback: (callback: unknown) => callback,
  useLayoutEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect) },
}))
vi.mock('../../../apps/studio-client/node_modules/@tanstack/react-virtual/dist/esm/index.js', async original => ({
  ...await original<Record<string, unknown>>(),
  useVirtualizer: (options: Record<string, unknown>) => {
    hooks.options = options
    return { scrollToEnd: hooks.scrollToEnd }
  },
}))

function render(options: Parameters<typeof useConversationViewport>[0]) {
  hooks.cursor = 0
  return useConversationViewport(options)
}
beforeEach(() => {
  hooks.slots = []
  hooks.effects = []
  hooks.resize = []
  hooks.scrollToEnd.mockClear()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { hooks.resize.push(callback) }
    observe() {}
    disconnect() {}
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('shared conversation viewport contract (no browser layout)', () => {
  it('uses stable IDs and pins an edited row outside the visible range', () => {
    render({ items: Array.from({ length: 20 }, (_, i) => ({ id: `node-${i}` })), pinnedId: 'node-17', overscan: 2 })
    expect(hooks.options?.getItemKey(17)).toBe('node-17')
    expect(hooks.options?.anchorTo).toBe('end')
    expect(hooks.options?.useFlushSync).toBe(false)
    expect(hooks.options?.rangeExtractor({ startIndex: 2, endIndex: 4, overscan: 2, count: 20 })).toEqual([0, 1, 2, 3, 4, 5, 6, 17])
  })

  it('keeps manual history browsing stationary when measured content grows', () => {
    const options = { items: [{ id: 'message' }], scopeId: 'session' }
    const viewport = render(options)
    const scroll = { scrollTop: 0, scrollHeight: 1200, clientHeight: 600, clientTop: 0, getBoundingClientRect: () => ({ top: 50 }) }
    viewport.scrollRef.current = scroll as HTMLDivElement
    viewport.listRef.current = { getBoundingClientRect: () => ({ top: 70 }) } as HTMLDivElement
    viewport.onScroll()
    for (const effect of hooks.effects.splice(1)) effect()
    expect(scroll.scrollTop).toBe(0)
    scroll.scrollHeight = 1400
    for (const resize of hooks.resize) resize()
    expect(scroll.scrollTop).toBe(0)
    const updated = render(options)
    expect(updated.scrollMargin).toBe(20)
    expect(hooks.options?.followOnAppend).toBe(false)
    scroll.scrollTop = 790
    updated.onScroll()
    for (const resize of hooks.resize) resize()
    expect(scroll.scrollTop).toBe(1400)
  })

  it('shares the 48px bottom threshold and skips initial following for a Narrative anchor', () => {
    expect(isConversationNearBottom({ scrollTop: 552, scrollHeight: 1200, clientHeight: 600 })).toBe(true)
    expect(isConversationNearBottom({ scrollTop: 551, scrollHeight: 1200, clientHeight: 600 })).toBe(false)
    const viewport = render({ items: [{ id: 'anchor' }], followInitially: false })
    hooks.effects[0]()
    expect(viewport.followsBottomRef.current).toBe(false)
    expect(hooks.scrollToEnd).not.toHaveBeenCalled()
  })
})
