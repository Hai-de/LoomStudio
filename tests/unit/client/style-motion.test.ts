import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStyleMotion } from '../../../apps/studio-client/src/features/themes/model/style-motion.js'

function fixture() {
  vi.stubGlobal('document', { documentElement: { dataset: {} } })
  const element = { dataset: {}, getAnimations: vi.fn(() => []) } as unknown as HTMLElement
  return { motion: createStyleMotion(), element, signal: new AbortController().signal }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('workbench panel style motion', () => {
  it('arbitrates by adopted owner order and permits replacements with native motion disabled', async () => {
    const { motion, element, signal } = fixture()
    const first = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }))
    const cancel = vi.fn()
    const last = vi.fn(() => ({ finished: Promise.resolve(), cancel }))
    motion.register('enhancement', 'workbench.panel', last, signal)
    motion.register('theme', 'workbench.panel', first, signal)
    motion.setOwners(['theme', 'enhancement'], 'disable')
    await motion.run(element, 'enter', signal)
    expect(first).not.toHaveBeenCalled()
    expect(last).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('reduced motion skips extension handlers', async () => {
    const { motion, element, signal } = fixture()
    const handler = vi.fn()
    motion.register('theme', 'workbench.panel', handler, signal)
    motion.setOwners(['theme'], 'retain')
    document.documentElement.dataset.loomMotion = 'reduce'
    await motion.run(element, 'exit', signal)
    expect(handler).not.toHaveBeenCalled()
  })

  it('waits for actual finite native effects and cancels them after completion', async () => {
    const { motion, element, signal } = fixture()
    let complete!: () => void
    const cancel = vi.fn()
    const finished = new Promise<void>(resolve => { complete = resolve })
    vi.mocked(element.getAnimations).mockReturnValue([{ finished, cancel, effect: { getComputedTiming: () => ({ iterations: 1 }) } } as unknown as Animation])
    let settled = false
    const run = motion.run(element, 'exit', signal).then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)
    complete()
    await run
    expect(cancel).toHaveBeenCalledOnce()
    expect(element.getAnimations).toHaveBeenCalledWith()
  })

  it('cancels pending replacements on reversal, owner changes and registration disposal', async () => {
    const { motion, element, signal } = fixture()
    const cancel = vi.fn()
    const handle = motion.register('theme', 'workbench.panel', () => ({ finished: new Promise(() => {}), cancel }), signal)
    motion.setOwners(['theme'], 'retain')
    const enter = motion.run(element, 'enter', signal)
    const exit = motion.run(element, 'exit', signal)
    await enter
    expect(cancel).toHaveBeenCalledTimes(1)
    handle.dispose()
    await exit
    expect(cancel).toHaveBeenCalledTimes(2)
    await motion.run(element, 'enter', signal)
  })

  it('recovers from rejected and never-settling extension animations', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { motion, element, signal } = fixture()
    const cancel = vi.fn()
    const registration = motion.register('theme', 'workbench.panel', () => ({ finished: Promise.reject(new Error('failed')), cancel }), signal)
    motion.setOwners(['theme'], 'retain')
    await motion.run(element, 'exit', signal)
    registration.dispose()
    motion.register('theme', 'workbench.panel', () => ({ finished: new Promise(() => {}), cancel }), signal)
    const pending = motion.run(element, 'exit', signal)
    await vi.advanceTimersByTimeAsync(10_000)
    await pending
    expect(cancel).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledTimes(2)
  })
})
