import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCopyFeedback } from '../../../apps/studio-client/src/shared/hooks/use-copy-feedback.js'

const hooks = vi.hoisted(() => ({
  state: undefined as unknown,
  timer: { current: undefined as ReturnType<typeof setTimeout> | undefined },
  cleanup: undefined as (() => void) | undefined,
  write: vi.fn(async (_text: string) => true),
}))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: () => [hooks.state, (state: unknown) => { hooks.state = state }],
  useRef: () => hooks.timer,
  useEffect: (effect: () => (() => void)) => { hooks.cleanup = effect() },
}))
vi.mock('../../../apps/studio-client/src/shared/browser/clipboard.js', () => ({
  tryWriteClipboardText: hooks.write,
}))

beforeEach(() => {
  vi.useFakeTimers()
  hooks.state = undefined
  hooks.timer.current = undefined
  hooks.write.mockReset().mockResolvedValue(true)
})
afterEach(() => {
  hooks.cleanup?.()
  vi.useRealTimers()
})

describe('clipboard feedback channel', () => {
  it('copies the supplied text and replaces the active row feedback for another 1600ms', async () => {
    await useCopyFeedback().copy('raw text', 'message')
    expect(hooks.write).toHaveBeenLastCalledWith('raw text')
    expect(useCopyFeedback().feedback).toEqual({ id: 'message', status: 'copied' })
    vi.advanceTimersByTime(1000)
    await useCopyFeedback().copy('node link', 'link')
    vi.advanceTimersByTime(600)
    expect(useCopyFeedback().feedback).toEqual({ id: 'link', status: 'copied' })
    vi.advanceTimersByTime(1000)
    expect(useCopyFeedback().feedback).toBeUndefined()
  })

  it('reports permission failure and cancels expiry when the channel unmounts', async () => {
    hooks.write.mockResolvedValue(false)
    await useCopyFeedback().copy('denied')
    expect(useCopyFeedback().feedback).toEqual({ id: '', status: 'failed' })
    hooks.cleanup?.()
    expect(vi.getTimerCount()).toBe(0)
  })
})
