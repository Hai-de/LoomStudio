// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { buildInspectorJsonPreview } from '../../../apps/studio-client/src/widgets/inspector-panel/inspector-json-preview.js'
import { InspectorPanel } from '../../../apps/studio-client/src/widgets/inspector-panel/inspector-panel.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('bounded inspector previews', () => {
  it('preserves ordinary JSON without reporting truncation', () => {
    const value = { title: 'Card', enabled: true, values: [1, null, 'text'] }
    expect(buildInspectorJsonPreview(value)).toEqual({ text: JSON.stringify(value, null, 2), truncated: false })
  })

  it('bounds long text, wide arrays and deeply nested data before serialization', () => {
    const longText = buildInspectorJsonPreview({ text: 'x'.repeat(1_000_000) })
    expect(longText.truncated).toBe(true)
    expect(longText.text.length).toBeLessThan(3000)

    const values = Array.from({ length: 10000 }, (_, index) => index)
    Object.defineProperty(values, 40, { get() { throw new Error('Must not visit omitted entries') } })
    expect(buildInspectorJsonPreview(values).truncated).toBe(true)

    const cyclic: { child?: unknown } = {}
    cyclic.child = cyclic
    const deep = buildInspectorJsonPreview(cyclic)
    expect(deep.truncated).toBe(true)
    expect(deep.text.length).toBeLessThan(1000)
  })

  it('applies a shared budget across nested collections', () => {
    let reads = 0
    const item = { get value() { reads += 1; return '\u0000'.repeat(2000) } }
    const value = Array.from({ length: 40 }, () => Array.from({ length: 40 }, () => item))
    const result = buildInspectorJsonPreview(value)
    expect(result.truncated).toBe(true)
    expect(reads).toBeLessThan(300)
    expect(result.text.length).toBeLessThanOrEqual(24001)
  })

  it('does not read collapsed data and releases its preview when closed', () => {
    let reads = 0
    const card = { get title() { reads += 1; return 'Card preview' } }
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      act(() => root.render(createElement(InspectorPanel, {
        cardSnapshot: card, agentTranscript: [], promptBuildSteps: [], promptBuildTrace: null,
        promptMessages: null, providerPayloadPreview: null, runDetails: null,
        t: createTranslator('zh-CN'),
      })))
      expect(reads).toBe(0)
      expect(container.querySelector('pre')).toBeNull()
      const section = container.querySelector('details')!
      act(() => {
        section.open = true
        section.dispatchEvent(new Event('toggle'))
      })
      expect(reads).toBe(1)
      expect(container.querySelector('pre')?.textContent).toContain('Card preview')
      act(() => {
        section.open = false
        section.dispatchEvent(new Event('toggle'))
      })
      expect(container.querySelector('pre')).toBeNull()
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})
