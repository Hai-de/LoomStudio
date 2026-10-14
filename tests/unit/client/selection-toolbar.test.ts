// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SelectionToolbar, appendQuote } from '../../../apps/studio-client/src/shared/ui/selection-toolbar/selection-toolbar.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'

let root: Root
let host: HTMLDivElement
let content: HTMLDivElement
let input: HTMLTextAreaElement
const quote = vi.fn()
const clipboard = vi.fn(async () => {})

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(clipboard)
  // DOM runner has no layout; only the Range geometry boundary is replaced.
  vi.spyOn(Range.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 40))
  host = document.createElement('div')
  content = document.createElement('div')
  content.innerHTML = '<div data-loom-message-content><p>First line</p><p>Second line</p></div><div data-loom-message-content>Other message</div>'
  input = document.createElement('textarea')
  document.body.append(host, content, input)
  root = createRoot(host)
  await act(async () => root.render(createElement(SelectionToolbar, {
    containerRef: { current: content }, inputRef: { current: input },
    onQuote: quote, t: createTranslator('zh-CN'),
  })))
})

afterEach(async () => {
  await act(async () => root.unmount())
  document.body.replaceChildren()
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  quote.mockClear()
  clipboard.mockClear()
})

async function select(crossMessage = false) {
  const range = document.createRange()
  range.setStart(content.querySelector('p')!.firstChild!, 0)
  range.setEnd(crossMessage ? content.lastElementChild!.firstChild! : content.querySelectorAll('p')[1].firstChild!, 6)
  await act(async () => {
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    content.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  })
  return window.getSelection()!.toString()
}

it('copies the selected text and quotes only on explicit action', async () => {
  const text = await select()
  const buttons = document.querySelectorAll('button')
  await act(async () => buttons[0].click())
  expect(clipboard).toHaveBeenCalledWith(text)
  expect(quote).not.toHaveBeenCalled()
  expect(buttons[0].textContent).toContain('已复制')
  await act(async () => buttons[1].click())
  expect(quote).toHaveBeenCalledWith(text)
  expect(document.querySelector('[role="group"]')).toBeNull()
  expect(appendQuote('已有草稿', '第一行\n第二行')).toBe('已有草稿\n\n> 第一行\n> 第二行\n\n')
})

it('rejects selections across messages and closes on Escape', async () => {
  await select(true)
  expect(document.querySelector('[role="group"]')).toBeNull()
  await select()
  expect(document.querySelector('[role="group"]')).not.toBeNull()
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
  expect(document.querySelector('[role="group"]')).toBeNull()
})

it('supports keyboard access and prevents quoting into a disabled input', async () => {
  input.disabled = true
  await select()
  const buttons = document.querySelectorAll('button')
  expect(buttons[1].disabled).toBe(true)
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })))
  expect(document.activeElement).toBe(buttons[0])
  expect(quote).not.toHaveBeenCalled()
})

it('tracks the selection on scroll and resize, and reappears when the unchanged selection returns to the viewport', async () => {
  content.style.overflowY = 'auto'
  vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 50, 600, 400))
  await select()
  const toolbar = document.querySelector<HTMLElement>('[role="group"]')!
  const initialTop = toolbar.style.top
  vi.mocked(Range.prototype.getBoundingClientRect).mockReturnValue(new DOMRect(100, 180, 200, 40))
  await act(async () => {
    content.dispatchEvent(new Event('scroll'))
    await new Promise(requestAnimationFrame)
  })
  expect(document.querySelector('[role="group"]')).toBe(toolbar)
  expect(parseFloat(toolbar.style.top) - parseFloat(initialTop)).toBe(80)
  vi.mocked(Range.prototype.getBoundingClientRect).mockReturnValue(new DOMRect(120, 180, 200, 40))
  const initialLeft = toolbar.style.left
  await act(async () => {
    window.dispatchEvent(new Event('resize'))
    await new Promise(requestAnimationFrame)
  })
  expect(parseFloat(toolbar.style.left) - parseFloat(initialLeft)).toBe(20)
  vi.mocked(Range.prototype.getBoundingClientRect).mockReturnValue(new DOMRect(100, 460, 200, 40))
  await act(async () => {
    content.dispatchEvent(new Event('scroll'))
    await new Promise(requestAnimationFrame)
  })
  expect(toolbar.style.visibility).toBe('hidden')
  expect(toolbar.inert).toBe(true)
  const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
  await act(async () => document.dispatchEvent(tab))
  expect(tab.defaultPrevented).toBe(false)
  vi.mocked(Range.prototype.getBoundingClientRect).mockReturnValue(new DOMRect(100, 100, 200, 40))
  await act(async () => {
    content.dispatchEvent(new Event('scroll'))
    await new Promise(requestAnimationFrame)
  })
  expect(document.querySelector('[role="group"]')).toBe(toolbar)
  expect(toolbar.style.visibility).toBe('visible')
  expect(toolbar.inert).toBe(false)
  await act(async () => toolbar.querySelectorAll('button')[1].click())
  expect(quote).toHaveBeenCalledWith('First lineSecond')
})

it('closes when the selected message is unmounted during scrolling', async () => {
  await select()
  await act(async () => {
    content.firstElementChild!.remove()
    content.dispatchEvent(new Event('scroll'))
    await new Promise(requestAnimationFrame)
  })
  expect(document.querySelector('[role="group"]')).toBeNull()
})
