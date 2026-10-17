// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { loadStyleSheet } from '../../../apps/studio-client/src/features/themes/model/style-loader.js'

afterEach(() => { document.head.replaceChildren(); vi.useRealTimers() })

function completeLoad(css: string): HTMLStyleElement {
  const element = document.head.querySelector('style')!
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  Object.defineProperty(element, 'sheet', { value: { cssRules: [{ styleSheet: sheet }] } })
  element.dispatchEvent(new Event('load'))
  return element
}

it('prepares without applying styles and preserves original URL resolution through import', async () => {
  const url = new URL('/extensions/pkg/assets/theme.css', location.href).href
  const pending = loadStyleSheet(url, new AbortController().signal, 'loom-theme')
  const element = completeLoad('.a { background: url(./image.png) }')
  const prepared = await pending
  expect(element.textContent).toBe(`@import url(${JSON.stringify(url)}) layer(loom-theme);`)
  expect(element.media).toBe('not all')
  prepared.activate()
  expect(element.media).toBe('all')
  prepared.deactivate()
  expect(element.media).toBe('not all')
  prepared.activate()
  prepared.dispose()
  expect(element.isConnected).toBe(false)
  expect(() => prepared.activate()).toThrow('disposed')
})

it('rejects important declarations in nested rules and removes the candidate', async () => {
  const pending = loadStyleSheet('/theme.css', new AbortController().signal, 'loom-enhancements.e0')
  completeLoad('@media (min-width: 0px) { .a { color: red !important } }')
  await expect(pending).rejects.toThrow('!important')
  expect(document.head.querySelector('style')).toBeNull()
})

it('removes aborted and failed candidates', async () => {
  const controller = new AbortController()
  const pending = loadStyleSheet('/theme.css', controller.signal, 'loom-theme')
  controller.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(document.head.querySelector('style')).toBeNull()
  const failed = loadStyleSheet('/theme.css', new AbortController().signal, 'loom-theme')
  document.head.querySelector('style')!.dispatchEvent(new Event('error'))
  await expect(failed).rejects.toThrow('Unable to load')
  expect(document.head.querySelector('style')).toBeNull()
})

it('bounds a stalled CSS request and removes its candidate', async () => {
  vi.useFakeTimers()
  const pending = loadStyleSheet('/stalled.css', new AbortController().signal, 'loom-theme')
  const rejected = expect(pending).rejects.toThrow('timed out after 15 seconds')
  await vi.advanceTimersByTimeAsync(15_000)
  await rejected
  expect(document.head.querySelector('style')).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})
