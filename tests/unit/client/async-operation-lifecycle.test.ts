// @vitest-environment happy-dom
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAsyncOperations } from '../../../apps/studio-client/src/shared/hooks/use-async-operations.js'
import { renderHook } from '../../support/client/render-hook.js'

const lifecycle = vi.hoisted(() => ({ setup: undefined as (() => (() => void) | void) | undefined, cleanup: undefined as (() => void) | undefined }))
vi.mock('react', async original => {
  const react = await original<typeof import('react')>()
  return { ...react, useEffect: (setup: () => (() => void) | void, deps: unknown[]) => react.useEffect(() => {
    lifecycle.setup = setup
    const cleanup = setup()
    lifecycle.cleanup = cleanup || undefined
    return cleanup
  }, deps) }
})
beforeEach(() => { lifecycle.setup = undefined; lifecycle.cleanup = undefined })
function refreshEffects() {
  lifecycle.cleanup?.()
  const cleanup = lifecycle.setup?.()
  lifecycle.cleanup = cleanup || undefined
}

describe('Async operation effect lifecycle', () => {
  it('does not report old request failures after effect replacement, while retaining live failures', async () => {
    const f = renderHook(useAsyncOperations)
    const response = Promise.withResolvers<void>()
    let pending!: Promise<void | undefined>
    act(() => { pending = f.current.runReported('session', () => response.promise) })
    act(refreshEffects)
    await act(async () => {
      response.reject(new SyntaxError('Unexpected end of JSON input'))
      await pending
    })
    expect(f.current.error).toBeUndefined()
    expect(f.current.isPending('session')).toBe(false)
    await act(async () => { await f.current.runReported('session', async () => { throw new Error('Live request failed') }) })
    expect(f.current.error?.message).toBe('Live request failed')
    f.unmount()
  })

  it('invalidates old latest-operation contexts and results across effect replacement', async () => {
    const f = renderHook(useAsyncOperations)
    const response = Promise.withResolvers<string>()
    let pending!: Promise<string | undefined>
    let current!: () => boolean
    act(() => { pending = f.current.runLatest('resources', context => { current = context.isCurrent; return response.promise }) })
    expect(current()).toBe(true)
    act(refreshEffects)
    expect(current()).toBe(false)
    let result: string | undefined
    await act(async () => { response.resolve('stale'); result = await pending })
    expect(result).toBeUndefined()
    expect(f.current.error).toBeUndefined()
    f.unmount()
  })
})
