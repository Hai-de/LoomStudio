import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStudioStartup, startupAreas } from '../../../apps/studio-client/src/app/use-studio-startup.js'

const hooks = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as (() => void)[] }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useMemo: (factory: () => unknown) => factory(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial
    return [hooks.values[index], (update: unknown) => { hooks.values[index] = typeof update === 'function' ? update(hooks.values[index]) : update }]
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = { current: initial }
    return hooks.values[index]
  },
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
    const index = hooks.cursor++
    const previous = hooks.values[index] as { deps: unknown[]; cleanup?: () => void } | undefined
    if (previous && deps.every((dep, i) => dep === previous.deps[i])) return
    const entry = { deps, cleanup: undefined as (() => void) | undefined }
    hooks.values[index] = entry
    hooks.effects.push(() => { previous?.cleanup?.(); entry.cleanup = effect() || undefined })
  },
}))
beforeEach(() => { hooks.cursor = 0; hooks.values = []; hooks.effects = [] })

function fixture() {
  const input = { source: {}, cards: vi.fn(async () => {}), sessions: vi.fn(async () => {}), providers: vi.fn(async () => {}), tools: vi.fn(async () => {}), network: vi.fn(async () => {}) }
  const render = () => {
    hooks.cursor = 0
    const result = useStudioStartup(input)
    for (const effect of hooks.effects.splice(0)) effect()
    return result
  }
  const settle = async () => { await Promise.all(startupAreas.map(area => render().retry(area))) }
  const unmount = () => { for (const value of hooks.values) (value as { cleanup?: () => void } | undefined)?.cleanup?.() }
  return { input, render, settle, unmount }
}

describe('Studio startup readiness ownership', () => {
  it('keeps unrelated areas ready when network settings fail, and retries only the failed area', async () => {
    const f = fixture()
    f.input.network.mockRejectedValueOnce(new Error('Network unavailable'))
    await f.settle()
    expect(f.render().ready('network')).toBe(false)
    expect(f.render().ready('providers')).toBe(true)
    expect(f.render().ready('cards')).toBe(true)
    expect(f.render().failures.map(item => item.area)).toEqual(['network'])
    await f.render().retry('network')
    expect(f.render().ready('network')).toBe(true)
    expect(f.render().failures).toEqual([])
    expect(f.input.cards).toHaveBeenCalledTimes(1)
    expect(f.input.network).toHaveBeenCalledTimes(2)
  })

  it.each(['replace', 'unmount'] as const)('does not publish old API completion after %s', async mode => {
    const f = fixture()
    const old = Promise.withResolvers<void>()
    f.input.cards.mockReturnValueOnce(old.promise)
    const original = f.render()
    const pending = original.retry('cards')
    await Promise.resolve()
    if (mode === 'replace') {
      f.input.source = {}
      f.input.cards.mockRejectedValue(new Error('New source unavailable'))
      await f.settle()
    } else f.unmount()
    old.resolve()
    await pending
    expect(f.render().ready('cards')).toBe(false)
    if (mode === 'replace') expect(f.render().failures.find(item => item.area === 'cards')?.error.message).toBe('New source unavailable')
  })
})
