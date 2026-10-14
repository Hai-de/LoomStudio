import { afterEach, describe, expect, it, vi } from 'vitest'
import { subscribeDataCommits } from '../../../apps/studio-client/src/shared/api/data-commit-events.js'

class TestEventSource extends EventTarget {
  static OPEN = 1
  static instances: TestEventSource[] = []
  readyState = 0
  closed = false
  constructor(readonly url: string) { super(); TestEventSource.instances.push(this) }
  emit(name: string, data = '') {
    if (name === 'open') this.readyState = 1
    this.dispatchEvent(new MessageEvent(name, { data }))
  }
  close() { this.closed = true; this.readyState = 2 }
}

afterEach(() => {
  vi.unstubAllGlobals()
  TestEventSource.instances = []
})

describe('data commit subscription', () => {
  it('uses the authenticated event stream, parses operation identities and refreshes on reconnect', () => {
    vi.stubGlobal('EventSource', TestEventSource)
    const onCommit = vi.fn()
    const onConnected = vi.fn()
    const unsubscribe = subscribeDataCommits(onCommit, onConnected)
    const stream = TestEventSource.instances[0]!
    expect(stream.url).toBe('/extensions/events')
    stream.emit('open')
    stream.emit('data.changed', JSON.stringify({ payload: { operations: [
      { entityType: 'narrative.branch', entityId: 'branch-1', store: 'narrative', kind: 'update',
        scope: { store: 'narrative', entityType: 'narrative.timeline', entityId: 'timeline-1' } },
      { entityType: 2, entityId: 'invalid' },
    ] } }))
    stream.emit('data.changed', '{')
    stream.emit('open')
    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith([{ entityType: 'narrative.branch', entityId: 'branch-1', kind: 'update',
      scope: { store: 'narrative', entityType: 'narrative.timeline', entityId: 'timeline-1' } }])
    expect(onConnected).toHaveBeenCalledTimes(2)
    unsubscribe()
    expect(stream.closed).toBe(true)
  })
})

it('shares transport, synchronizes late subscribers and retires only the last subscription', async () => {
  vi.stubGlobal('EventSource', TestEventSource)
  const first = vi.fn()
  const second = vi.fn()
  const connected = vi.fn()
  const stopFirst = subscribeDataCommits(first, vi.fn())
  const stream = TestEventSource.instances[0]!
  stream.emit('open')
  const stopSecond = subscribeDataCommits(second, connected)
  await Promise.resolve()
  expect(connected).toHaveBeenCalledOnce()
  expect(TestEventSource.instances).toHaveLength(1)
  stopFirst()
  stopFirst()
  expect(stream.closed).toBe(false)
  stream.emit('data.changed', JSON.stringify({ payload: { operations: [{ entityType: 'agent.session', entityId: 'a' }] } }))
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledOnce()
  stream.emit('open')
  expect(connected).toHaveBeenCalledTimes(2)
  stopSecond()
  expect(stream.closed).toBe(true)
  const late = vi.fn()
  const stop = subscribeDataCommits(vi.fn(), late)
  expect(TestEventSource.instances).toHaveLength(2)
  TestEventSource.instances[1]!.emit('open')
  late.mockClear()
  const stopBeforeSync = subscribeDataCommits(vi.fn(), late)
  stopBeforeSync()
  await Promise.resolve()
  expect(late).not.toHaveBeenCalled()
  stop()
})
