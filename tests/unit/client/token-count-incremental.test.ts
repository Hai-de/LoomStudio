// @vitest-environment happy-dom
import { act, useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderHook } from '../../support/client/render-hook.js'
import { useTokenCounts } from '../../../apps/studio-client/src/shared/tokenizer/use-token-counts.js'
import { countTexts } from '../../../apps/studio-client/src/shared/tokenizer/client.js'
vi.mock('../../../apps/studio-client/src/shared/tokenizer/client.js', () => ({ countTexts: vi.fn(async (texts: string[]) => texts.map(text => text.length)) }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

it('ignores composition in unrelated inputs while still counting changed text', async () => {
  vi.useFakeTimers()
  const hook = renderHook(() => {
    const [text, setText] = useState('story')
    return { ...useTokenCounts([text], 'timeline'), setText }
  })
  const input = document.createElement('textarea')
  document.body.append(input)
  try {
    await act(async () => vi.advanceTimersByTimeAsync(300))
    act(() => input.dispatchEvent(new Event('compositionstart', { bubbles: true })))
    expect(hook.current.pending).toBe(false)
    expect(hook.current.counts).toEqual([5])
    act(() => input.dispatchEvent(new Event('compositionend', { bubbles: true })))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(countTexts).toHaveBeenCalledOnce()
    act(() => hook.current.setText('changed story'))
    expect(hook.current.pending).toBe(true)
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(hook.current.counts).toEqual([13])
    expect(hook.current.pending).toBe(false)
    expect(countTexts).toHaveBeenCalledTimes(2)
  } finally { hook.unmount(); input.remove() }
})

it('submits only changed long-history texts and retains ordering across scope changes', async () => {
  vi.useFakeTimers()
  const initial = Array.from({ length: 2000 }, (_, index) => `${index}:` + 'x'.repeat(4096))
  const hook = renderHook(() => {
    const [input, setInput] = useState({ texts: initial, scope: 'first' })
    return { ...useTokenCounts(input.texts, input.scope), setInput }
  })
  try {
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(vi.mocked(countTexts).mock.calls[0]![0]).toHaveLength(2000)
    act(() => hook.current.setInput({ texts: [...initial.slice(0, -1), 'edited'], scope: 'first' }))
    expect(hook.current.currentCounts.slice(0, -1)).toEqual(initial.slice(0, -1).map(text => text.length))
    expect(hook.current.currentCounts.at(-1)).toBeUndefined()
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(vi.mocked(countTexts).mock.calls[1]![0]).toEqual(['edited'])
    act(() => hook.current.setInput({ texts: ['edited', initial[0]!, 'new'], scope: 'second' }))
    expect(hook.current.counts).toBeUndefined()
    expect(hook.current.currentCounts).toEqual([6, initial[0]!.length, undefined])
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(vi.mocked(countTexts).mock.calls[2]![0]).toEqual(['new'])
    expect(hook.current.counts).toEqual([6, initial[0]!.length, 3])
    expect(hook.current.pending).toBe(false)
  } finally { hook.unmount() }
})
