// @vitest-environment happy-dom
import { act, useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderHook } from '../../support/client/render-hook.js'
import { useWallpaper } from '../../../apps/studio-client/src/pages/studio/use-wallpaper.js'

const images: Array<{ onload: null | (() => void); onerror: null | (() => void) }> = []
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); images.length = 0 })

it('restores A after an empty background and cleans rapid A/B/A transitions without stale loads', () => {
  vi.useFakeTimers()
  vi.stubGlobal('Image', class {
    onload = null
    onerror = null
    complete = false
    naturalWidth = 0
    constructor() { images.push(this) }
  })
  const hook = renderHook(() => {
    const [url, setUrl] = useState<string | undefined>('A')
    return { ...useWallpaper(url), setUrl }
  })
  try {
    act(() => hook.current.setUrl(undefined))
    expect(hook.current).toMatchObject({ currentWallpaper: undefined, previousWallpaper: 'A' })
    act(() => hook.current.setUrl('A'))
    act(() => images.at(-1)!.onload!())
    expect(hook.current).toMatchObject({ currentWallpaper: 'A', previousWallpaper: undefined })
    expect(vi.getTimerCount()).toBe(0)
    act(() => hook.current.setUrl('B'))
    act(() => images.at(-1)!.onload!())
    expect(hook.current).toMatchObject({ currentWallpaper: 'B', previousWallpaper: 'A' })
    act(() => hook.current.setUrl('A'))
    act(() => images.at(-1)!.onload!())
    expect(hook.current).toMatchObject({ currentWallpaper: 'A', previousWallpaper: 'B' })
    act(() => vi.advanceTimersByTime(1250))
    expect(hook.current.previousWallpaper).toBeUndefined()
    act(() => hook.current.setUrl('C'))
    const lateLoad = images.at(-1)!.onload!
    act(() => hook.current.setUrl('D'))
    act(() => lateLoad())
    expect(hook.current.currentWallpaper).toBe('A')
    act(() => images.at(-1)!.onload!())
    expect(hook.current.currentWallpaper).toBe('D')
  } finally { hook.unmount() }
  expect(vi.getTimerCount()).toBe(0)
})
