// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { syncMobileViewport } from '../../../apps/studio-client/src/shared/browser/mobile-viewport.js'

describe('syncMobileViewport', () => {
  let root: HTMLElement
  let listeners: Record<string, EventListenerOrEventListenerObject[]>
  let vvListeners: Record<string, EventListenerOrEventListenerObject[]>
  let mockVisualViewport: {
    height: number
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void
  }

  beforeEach(() => {
    root = document.createElement('div')
    listeners = {}
    vvListeners = {}

    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      listeners[type] ??= []
      listeners[type].push(listener)
    })
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener) => {
      listeners[type] = (listeners[type] ?? []).filter(item => item !== listener)
    })

    mockVisualViewport = {
      height: 800,
      addEventListener: (type, listener) => {
        vvListeners[type] ??= []
        vvListeners[type].push(listener)
      },
      removeEventListener: (type, listener) => {
        vvListeners[type] = (vvListeners[type] ?? []).filter(item => item !== listener)
      },
    }
    vi.stubGlobal('visualViewport', mockVisualViewport)
    vi.stubGlobal('innerHeight', 800)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sets initial viewport height and keyboard inset without keyboard open', () => {
    const cleanup = syncMobileViewport(root)
    expect(root.style.getPropertyValue('--loom-viewport-height')).toBe('800px')
    expect(root.style.getPropertyValue('--loom-keyboard-inset')).toBe('0px')
    expect(root.dataset.keyboardOpen).toBeUndefined()
    cleanup()
  })

  it('updates CSS properties and sets keyboardOpen when virtual keyboard expands', () => {
    const cleanup = syncMobileViewport(root)
    expect(root.dataset.keyboardOpen).toBeUndefined()

    // Virtual keyboard opens taking 300px
    mockVisualViewport.height = 500
    vvListeners.resize?.forEach(listener => {
      if (typeof listener === 'function') listener(new Event('resize'))
    })

    expect(root.style.getPropertyValue('--loom-viewport-height')).toBe('500px')
    expect(root.style.getPropertyValue('--loom-keyboard-inset')).toBe('300px')
    expect(root.dataset.keyboardOpen).toBe('true')

    // Keyboard closes
    mockVisualViewport.height = 800
    vvListeners.resize?.forEach(listener => {
      if (typeof listener === 'function') listener(new Event('resize'))
    })

    expect(root.style.getPropertyValue('--loom-viewport-height')).toBe('800px')
    expect(root.style.getPropertyValue('--loom-keyboard-inset')).toBe('0px')
    expect(root.dataset.keyboardOpen).toBeUndefined()

    cleanup()
  })

  it('cleans up properties and event listeners on teardown', () => {
    const cleanup = syncMobileViewport(root)
    expect(root.style.getPropertyValue('--loom-viewport-height')).toBe('800px')

    cleanup()

    expect(root.style.getPropertyValue('--loom-viewport-height')).toBe('')
    expect(root.style.getPropertyValue('--loom-keyboard-inset')).toBe('')
    expect(root.dataset.keyboardOpen).toBeUndefined()
    expect(vvListeners.resize).toHaveLength(0)
  })
})
