import { describe, expect, it, vi } from 'vitest'
import { createWeatherRenderer } from '../../../extensions/the-world/src/client/weather-renderer.js'

describe('The World weather lifetime', () => {
  it('cancels particle removal and wind callbacks as well as repeating effects', () => {
    vi.useFakeTimers()
    function node() {
      return Object.assign(new EventTarget(), {
        className: '', style: { cssText: '', setProperty: vi.fn(), removeProperty: vi.fn() },
        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        append: vi.fn(), remove: vi.fn(), replaceChildren: vi.fn(), querySelectorAll: () => [], querySelector: () => null,
      })
    }
    vi.stubGlobal('document', { createElement: node })
    vi.stubGlobal('window', globalThis)
    try {
      const foreground = node()
      const clouds = { activate: vi.fn(), deactivate: vi.fn(), setColor: vi.fn() }
      const renderer = createWeatherRenderer({ backgroundLayer: node(), foregroundLayer: foreground, clouds })
      renderer.update({ weatherString: '中雨 大风', periodString: '白天' })
      expect(vi.getTimerCount()).toBeGreaterThan(2)
      vi.advanceTimersByTime(1000)
      renderer.clear()
      expect(vi.getTimerCount()).toBe(0)
      const writes = foreground.style.setProperty.mock.calls.length
      vi.advanceTimersByTime(30_000)
      expect(foreground.style.setProperty).toHaveBeenCalledTimes(writes)
      expect(foreground.replaceChildren).toHaveBeenCalledOnce()
      expect(clouds.deactivate).toHaveBeenCalledOnce()
    } finally { vi.useRealTimers(); vi.unstubAllGlobals() }
  })
})
