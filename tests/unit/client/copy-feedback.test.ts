// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCopyFeedback } from '../../../apps/studio-client/src/shared/hooks/use-copy-feedback.js'
import { renderHook } from '../../support/client/render-hook.js'

const writeMock = vi.fn(async (_text: string) => true)
vi.mock('../../../apps/studio-client/src/shared/browser/clipboard.js', () => ({
  tryWriteClipboardText: (text: string) => writeMock(text),
}))

beforeEach(() => {
  vi.useFakeTimers()
  writeMock.mockReset().mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('clipboard feedback channel (real React 19 + happy-dom)', () => {
  it('copies the supplied text and replaces the active row feedback for another 1600ms', async () => {
    const harness = renderHook(() => useCopyFeedback())

    await act(async () => {
      await harness.current.copy('raw text', 'message')
    })

    expect(writeMock).toHaveBeenLastCalledWith('raw text')
    expect(harness.current.feedback).toEqual({ id: 'message', status: 'copied' })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await act(async () => {
      await harness.current.copy('node link', 'link')
    })

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(harness.current.feedback).toEqual({ id: 'link', status: 'copied' })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(harness.current.feedback).toBeUndefined()

    harness.unmount()
  })

  it('reports permission failure and cancels expiry when the channel unmounts', async () => {
    writeMock.mockResolvedValue(false)
    const harness = renderHook(() => useCopyFeedback())

    await act(async () => {
      await harness.current.copy('denied')
    })

    expect(harness.current.feedback).toEqual({ id: '', status: 'failed' })

    harness.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
