import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { activate } from '../../../extensions/the-world/src/client/index.js'
import { createWorldRoot } from '../../../extensions/the-world/src/world-state.js'
import { describeWorldWeather } from '../../../extensions/the-world/src/client/world-presentation.js'

const effects = vi.hoisted(() => ({
  weather: { update: vi.fn(), clear: vi.fn() },
  clouds: { dispose: vi.fn() },
  toggle: { update: vi.fn(), dispose: vi.fn() },
  mountPanel: vi.fn(),
}))
vi.mock('../../../extensions/the-world/src/client/weather-renderer.js', () => ({ createWeatherRenderer: () => effects.weather }))
vi.mock('../../../extensions/the-world/src/client/clouds-3d.js', () => ({ createClouds3dFX: () => effects.clouds }))
vi.mock('../../../extensions/the-world/src/client/toggle-button.js', () => ({ createToggleButtons: () => effects.toggle }))
vi.mock('../../../extensions/the-world/src/client/panel-view.tsx', () => ({ mountTheWorldPanel: effects.mountPanel }))

function example() {
  return JSON.parse(readFileSync(new URL('../../../extensions/the-world/resources/examples/world-ec.json', import.meta.url), 'utf8'))
}

function harness() {
  const properties = new Map<string, string>([['--loom-preview-wallpaper', 'original-wallpaper']])
  const attributes = new Map<string, string>([['data-loom-preview-background', 'original-owner']])
  const root = {
    style: {
      setProperty: (key: string, value: string) => properties.set(key, value),
      getPropertyValue: (key: string) => properties.get(key) ?? '',
      removeProperty: (key: string) => properties.delete(key),
    },
    getAttribute: (key: string) => attributes.get(key) ?? null,
    setAttribute: (key: string, value: string) => attributes.set(key, value),
    removeAttribute: (key: string) => attributes.delete(key),
  }
  const nodes: Array<{ dataset: Record<string, string>; style: Record<string, string>; textContent: string; remove: ReturnType<typeof vi.fn> }> = []
  vi.stubGlobal('document', {
    documentElement: root, querySelector: () => null, body: { append: vi.fn() }, head: { append: vi.fn() },
    createElement: () => {
      const node = { dataset: {}, style: {}, textContent: '', remove: vi.fn() }
      nodes.push(node)
      return node
    },
  })
  const fetchResource = vi.fn().mockResolvedValue({ ok: true, text: async () => '.particle-wrapper{}', json: async () => ({ gradients: [{ hour: 0, colors: ['#112233', '#445566'] }] }) })
  vi.stubGlobal('fetch', fetchResource)
  const controller = new AbortController()
  const target = { scope: 'timeline', timelineId: 'story', branchId: 'main' }
  let stateChanged!: (snapshot: unknown) => void
  let stateError!: (error: Error) => void
  let configChanged!: (entries: unknown[]) => void
  let renderer!: { mount(root: unknown, context: { close(): void }): unknown }
  const subscriptionDispose = vi.fn()
  const context = {
    signal: controller.signal, timeline: { target },
    files: { url: (path: string) => `/package/${path}` },
    logger: { error: vi.fn(), warn: vi.fn() },
    configs: {
      list: vi.fn(async () => [] as unknown[]),
      subscribe: (_: unknown, handler: typeof configChanged) => { configChanged = handler; return { dispose() {} } },
      upsert: vi.fn(async (entry: unknown) => entry),
    },
    state: { subscribe: vi.fn((actual: unknown, handler: typeof stateChanged, onError: typeof stateError) => {
      expect(actual).toEqual(target)
      stateChanged = handler
      stateError = onError
      return { dispose: subscriptionDispose }
    }) },
    renderers: {
      register: (_: unknown, value: typeof renderer) => { renderer = value; return { dispose() {} } },
      open: vi.fn(),
    },
    commands: { register: () => ({ dispose() {} }) },
  }
  const handle = activate(context)
  renderer.mount({}, { close() {} })
  const panel = effects.mountPanel.mock.calls.at(-1)![2]
  return {
    context, controller, handle, root, properties, nodes, fetchResource, panel, subscriptionDispose,
    state(root: unknown, revisionId = 'r1') { stateChanged({ value: root === undefined ? {} : { theWorld: root }, revisionId }) },
    error(error: Error) { stateError(error) },
    config(enabled: boolean) { configChanged([{ key: 'weather-effects-enabled', value: enabled }]) },
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('The World current Timeline client', () => {
  it('does not invent weather or time and normalizes typed weather for the ST renderer', () => {
    expect(describeWorldWeather(createWorldRoot())).toMatchObject({ kind: 'unknown', time: '--:--', sky: undefined })
    const root = example()
    root.entities.arrival.components.weather = { kind: 'rain' }
    expect(describeWorldWeather(root)).toMatchObject({ kind: 'rain', time: '00:00', weatherString: '雨', period: '夜晚' })
    delete root.entities.world.components.worldTime
    expect(describeWorldWeather(root).sky).toBeUndefined()
  })

  it('projects the subscribed State, clears missing data, and retains the user wallpaper on abort', async () => {
    const h = harness()
    try {
      await Promise.resolve()
      expect(h.properties.get('--loom-preview-wallpaper')).toBe('original-wallpaper')
      expect(effects.weather.update).not.toHaveBeenCalled()
      h.state(createWorldRoot())
      expect(effects.weather.update).not.toHaveBeenCalled()
      h.state(example())
      expect(h.panel.getSnapshot().result.revisionId).toBe('r1')
      expect(effects.weather.update).toHaveBeenCalledWith(expect.objectContaining({ weatherString: '晴', periodString: '夜晚' }))
      expect(h.properties.get('--loom-preview-wallpaper')).not.toBe('original-wallpaper')
      h.config(false)
      expect(h.properties.get('--loom-preview-wallpaper')).toBe('original-wallpaper')
      h.config(true)
      h.state(undefined)
      expect(h.panel.getSnapshot()).toMatchObject({ result: undefined, status: '当前分支尚未初始化 The World' })
      expect(h.properties.get('--loom-preview-wallpaper')).toBe('original-wallpaper')
      h.state(example(), 'r2')
      h.error(new Error('read failed'))
      expect(h.panel.getSnapshot().result).toBeUndefined()
      expect(h.properties.get('--loom-preview-wallpaper')).toBe('original-wallpaper')
      h.state(example(), 'r3')
      h.properties.set('--loom-preview-wallpaper', 'new-user-wallpaper')
      h.controller.abort()
      expect(h.properties.get('--loom-preview-wallpaper')).toBe('new-user-wallpaper')
      expect(h.subscriptionDispose).toHaveBeenCalledOnce()
      expect(effects.clouds.dispose).toHaveBeenCalledOnce()
      expect(h.nodes.every(node => node.remove.mock.calls.length === 1)).toBe(true)
      const updates = effects.weather.update.mock.calls.length
      h.state(example(), 'late')
      h.config(true)
      expect(effects.weather.update).toHaveBeenCalledTimes(updates)
      expect(h.panel.getSnapshot().result.revisionId).toBe('r3')
    } finally { h.handle.dispose() }
    expect(effects.toggle.dispose).toHaveBeenCalledOnce()
  })

  it('discards a late theme response after the Timeline instance is aborted', async () => {
    const h = harness()
    try {
      h.state(example())
      const response = Promise.withResolvers<unknown>()
      h.fetchResource.mockReturnValueOnce(response.promise)
      const changed = h.panel.setTheme('legacy')
      h.controller.abort()
      response.resolve({ ok: true, json: async () => ({ gradients: [{ hour: 0, colors: ['#123456', '#abcdef'] }] }) })
      await changed
      expect(h.panel.getSnapshot().themeId).toBe('default')
      expect(h.properties.get('--loom-preview-wallpaper')).toBe('original-wallpaper')
      await new Promise(resolve => setImmediate(resolve))
      expect(h.nodes.at(-1)!.textContent).toBe('')
    } finally { h.handle.dispose() }
  })
})
