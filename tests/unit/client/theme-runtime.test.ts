// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClientStyleFactory } from '@loom-studio/extension-sdk'
import { createThemeRuntime } from '../../../apps/studio-client/src/features/themes/model/theme-runtime.js'
import { styleRegistry } from '../../../apps/studio-client/src/features/themes/model/style-registry.js'
import { loadStyleSheet, type PreparedStyle } from '../../../apps/studio-client/src/features/themes/model/style-loader.js'
import type { ThemeEntry } from '../../../apps/studio-client/src/features/themes/model/theme-catalog.js'
import type { ThemeSelection } from '../../../apps/studio-client/src/features/themes/model/theme-store.js'

vi.mock('../../../apps/studio-client/src/features/themes/model/style-loader.js', () => ({ loadStyleSheet: vi.fn() }))

function entry(id: string, js = true): ThemeEntry {
  return {
    key: `test/${id}`, kind: 'theme', packageId: 'test', packageLabel: 'Test', version: '1', available: true,
    url: `/extensions/test/1/files/${id}.css`,
    definition: { id, label: id, css: `${id}.css`, ...(js ? { moduleId: id } : {}),
      parameters: [{ id: 'size', label: 'Size', type: 'number', default: 12, min: 8, max: 30, unit: 'px', variable: '--extension-size' }] },
    ...(js ? { module: { packageId: 'test', moduleId: id, runtimeKind: 'client', desired: { enabled: true }, contributions: {} } as const } : {}),
  }
}
function selection(theme: ThemeEntry, enhancements: ThemeEntry[] = [], cssOnly: string[] = []): ThemeSelection {
  return { theme: theme.key, enhancements: enhancements.map(item => item.key), cssOnly }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
function sheet(url: string): PreparedStyle {
  const element = document.createElement('style')
  element.dataset.testSheet = url
  element.media = 'not all'
  document.head.append(element)
  return {
    activate: () => { element.media = 'all' },
    deactivate: () => { element.media = 'not all' },
    dispose: () => { element.remove() },
  }
}
const owners: AbortController[] = []
let runtime: ReturnType<typeof createThemeRuntime>
function register(item: ThemeEntry, factory: ClientStyleFactory) {
  const controller = new AbortController()
  owners.push(controller)
  styleRegistry.register(item.key, factory, controller.signal)
  return controller
}
const activeSheets = () => Array.from(document.head.querySelectorAll<HTMLStyleElement>('style[data-test-sheet]')).filter(element => element.media === 'all').map(element => element.dataset.testSheet)
const parameterSheets = () => Array.from(document.head.querySelectorAll<HTMLStyleElement>('style:not([data-test-sheet])')).filter(element => element.textContent?.includes('--extension-size'))

beforeEach(() => {
  vi.mocked(loadStyleSheet).mockReset().mockImplementation(async url => sheet(url))
  runtime = createThemeRuntime(vi.fn())
})
afterEach(() => {
  runtime.dispose()
  for (const owner of owners.splice(0)) owner.abort()
  document.head.replaceChildren()
})

describe('theme adoption transaction', () => {
  it('keeps the old factory, CSS and parameter sheet running when CSS preparation fails', async () => {
    const old = entry('old')
    const next = entry('next', false)
    const dispose = vi.fn()
    const factory = vi.fn(() => ({ dispose }))
    register(old, factory)
    await runtime.apply([old], selection(old), { [old.key]: { size: 20 } })
    const signature = runtime.signature()
    const parameters = parameterSheets()[0]
    vi.mocked(loadStyleSheet).mockRejectedValueOnce(new Error('CSS fetch failed'))
    await expect(runtime.apply([old, next], selection(next), {})).rejects.toThrow('CSS fetch failed')
    expect(runtime.signature()).toBe(signature)
    expect(dispose).not.toHaveBeenCalled()
    expect(factory).toHaveBeenCalledTimes(1)
    expect(activeSheets()).toEqual([old.url])
    expect(parameterSheets()).toEqual([parameters])
    expect(parameters.media).toBe('all')
    expect(parameters.textContent).toContain('--extension-size:20px')
  })

  it('rolls back CSS, parameters and old JS while cleaning a partially activated candidate', async () => {
    const old = entry('old')
    const next = entry('next')
    const bad = { ...entry('bad'), kind: 'enhancement' as const }
    const oldDisposers: ReturnType<typeof vi.fn>[] = []
    const oldFactory = vi.fn(() => { const dispose = vi.fn(); oldDisposers.push(dispose); return { dispose } })
    const candidateDispose = vi.fn()
    let candidateSignal: AbortSignal | undefined
    register(old, oldFactory)
    register(next, context => { candidateSignal = context.signal; return { dispose: candidateDispose } })
    register(bad, () => { throw new Error('JS failed') })
    await runtime.apply([old], selection(old), { [old.key]: { size: 20 } })
    const signature = runtime.signature()
    const parameters = parameterSheets()[0]
    await expect(runtime.apply([old, next, bad], selection(next, [bad]), { [next.key]: { size: 25 } })).rejects.toThrow('JS failed')
    expect(oldFactory).toHaveBeenCalledTimes(2)
    expect(oldDisposers[0]).toHaveBeenCalledTimes(1)
    expect(oldDisposers[1]).not.toHaveBeenCalled()
    expect(candidateDispose).toHaveBeenCalledTimes(1)
    expect(candidateSignal?.aborted).toBe(true)
    expect(runtime.signature()).toBe(signature)
    expect(activeSheets()).toEqual([old.url])
    expect(parameterSheets()).toEqual([parameters])
    expect(parameters.media).toBe('all')
    expect(parameters.textContent).toContain('--extension-size:20px')
  })

  it('aborts the adoption signal and invokes its cleanup once on replacement and reset', async () => {
    const old = entry('old')
    const next = entry('next', false)
    const dispose = vi.fn()
    let signal: AbortSignal | undefined
    register(old, context => { signal = context.signal; return { dispose } })
    await runtime.apply([old], selection(old), {})
    await runtime.apply([old, next], selection(next), {})
    runtime.reset()
    expect(signal?.aborted).toBe(true)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(activeSheets()).toEqual([])
    expect(parameterSheets()).toEqual([])
  })

  it('does not invoke registered code when its module is not authorized', async () => {
    const item = entry('untrusted')
    item.module!.desired.enabled = false
    const factory = vi.fn()
    register(item, factory)
    await expect(runtime.apply([item], selection(item), {})).rejects.toThrow('Authorize')
    expect(factory).not.toHaveBeenCalled()
    expect(loadStyleSheet).not.toHaveBeenCalled()
  })

  it('allows a JS contribution to run without JS only with the explicit CSS-only declaration', async () => {
    const item = entry('optional')
    item.module!.desired.enabled = false
    const factory = vi.fn()
    register(item, factory)
    const desired = selection(item, [], [item.key])
    await expect(runtime.apply([item], desired, {})).rejects.toThrow('requires JavaScript')
    item.definition.supportsCssOnly = true
    await expect(runtime.apply([item], desired, {})).resolves.toBe(true)
    expect(factory).not.toHaveBeenCalled()
    expect(activeSheets()).toEqual([item.url])
  })

  it('does not revive the old adoption when reset interrupts a later stylesheet preparation', async () => {
    const old = entry('old')
    const next = entry('next', false)
    const enhancement = { ...entry('extra', false), kind: 'enhancement' as const }
    const dispose = vi.fn()
    const oldFactory = vi.fn(() => ({ dispose }))
    register(old, oldFactory)
    await runtime.apply([old], selection(old), {})
    const started = deferred<void>()
    const loaded = deferred<PreparedStyle>()
    vi.mocked(loadStyleSheet).mockImplementation(async url => {
      if (url !== enhancement.url) return sheet(url)
      started.resolve()
      return loaded.promise
    })
    const applying = runtime.apply([old, next, enhancement], selection(next, [enhancement]), {})
    const rejected = expect(applying).rejects.toBeDefined()
    await started.promise
    runtime.reset()
    loaded.resolve(sheet(enhancement.url))
    await rejected
    expect(runtime.signature()).toBeUndefined()
    expect(oldFactory).toHaveBeenCalledTimes(1)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(activeSheets()).toEqual([])
    expect(parameterSheets()).toEqual([])
    expect(document.head.querySelectorAll('[data-test-sheet]')).toHaveLength(0)
  })

  it('reset cancels pending JS activation without resurrecting old JS and disposes its late handle', async () => {
    const old = entry('old')
    const next = entry('slow')
    const oldDispose = vi.fn()
    const oldFactory = vi.fn(() => ({ dispose: oldDispose }))
    const started = deferred<void>()
    const activation = deferred<{ dispose(): void }>()
    const cleaned = deferred<void>()
    const lateDispose = vi.fn(() => cleaned.resolve())
    let signal: AbortSignal | undefined
    register(old, oldFactory)
    register(next, context => { signal = context.signal; started.resolve(); return activation.promise })
    await runtime.apply([old], selection(old), {})
    const applying = runtime.apply([old, next], selection(next), {})
    const rejected = expect(applying).rejects.toThrow('cancelled')
    await started.promise
    runtime.reset()
    await rejected
    expect(signal?.aborted).toBe(true)
    expect(runtime.signature()).toBeUndefined()
    expect(oldFactory).toHaveBeenCalledTimes(1)
    expect(oldDispose).toHaveBeenCalledTimes(1)
    expect(activeSheets()).toEqual([])
    expect(parameterSheets()).toEqual([])
    activation.resolve({ dispose: lateDispose })
    await cleaned.promise
    expect(lateDispose).toHaveBeenCalledTimes(1)
  })

  it('cleans the active factory and aborts its signal when the host module is revoked', async () => {
    const item = entry('revoked')
    const cleaned = deferred<void>()
    const dispose = vi.fn(() => cleaned.resolve())
    let signal: AbortSignal | undefined
    const owner = register(item, context => { signal = context.signal; return { dispose } })
    await runtime.apply([item], selection(item), {})
    owner.abort()
    await cleaned.promise
    expect(signal?.aborted).toBe(true)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(styleRegistry.get(item.key)).toBeUndefined()
    runtime.reset()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
