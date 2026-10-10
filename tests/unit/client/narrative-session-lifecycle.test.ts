import { describe, expect, it, vi } from 'vitest'
import { fixture, hooks } from '../../support/client/narrative-runtime.js'
import type { StudioApi } from '../../../apps/studio-client/src/shared/api/studio-api.js'
import type { DataOperation } from '../../../apps/studio-client/src/shared/api/data-commit-events.js'

describe('Narrative primary Session lifecycle', () => {
  it.each(['saved', 'missing', 'standalone'])('restores the target primary when opening a %s Session across Timelines', async mode => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mode === 'saved' && key === 'loom.studio.primarySession:test:other-timeline' ? 'other-primary' : null,
      setItem: () => {}, removeItem: () => {},
    })
    const f = fixture()
    await f.render().createAgentSession('profile', true)
    const targetTimelineId = mode === 'standalone' ? undefined : 'other-timeline'
    const inspected = { ...f.result.agentSession, id: 'inspected', timelineId: targetTimelineId }
    const primary = { ...inspected, id: 'other-primary' }
    const timeline = { ...f.result.narrative.timeline, id: 'other-timeline' }
    const branch = { ...f.result.narrative.branch, timelineId: timeline.id }
    f.input.api.narratives.get = vi.fn(async () => ({ timeline, branches: [branch] }))
    f.getPage.mockResolvedValue({ timeline, branch, nodes: [] })
    f.input.api.agentSessions.list = vi.fn(async () => ({ sessions: [inspected, primary] }))
    f.getTranscript.mockResolvedValue({ session: inspected, entries: [] })

    const activated = await f.render().activateAgentSession(inspected)
    expect(activated).toEqual({ session: inspected, branchId: mode === 'standalone' ? undefined : branch.id })
    expect(f.render().agentSession?.id).toBe('inspected')
    expect(f.render().timeline?.id).toBe(targetTimelineId)
    expect(f.render().primarySession?.id).toBe(mode === 'saved' ? primary.id : undefined)
    expect(f.reportFailure).not.toHaveBeenCalled()
  })

  it('does not publish a Session when navigation changes while its transcript loads', async () => {
    const f = fixture()
    await f.render().createAgentSession('profile', true)
    const before = f.render().agentSession
    f.input.api.agentSessions.list = vi.fn(async () => ({ sessions: [f.result.agentSession] }))
    const read = Promise.withResolvers<Awaited<ReturnType<StudioApi['agentSessions']['getTranscript']>>>()
    f.getTranscript.mockReturnValueOnce(read.promise)
    let current = true
    const pending = f.render().activateAgentSession('late', () => current)
    current = false
    read.resolve({ session: { ...f.result.agentSession, id: 'late' }, entries: [] })
    expect(await pending).toBeUndefined()
    expect(f.render().agentSession).toEqual(before)
    expect(f.render().agentSessionReady).toBe(true)
    expect(f.reportFailure).not.toHaveBeenCalled()
  })

  it.each(['timeline', 'card', 'api'])('does not publish or navigate a late Session after %s changes', async change => {
    const f = fixture()
    await f.render().createAgentSession('profile', true)
    let resolve!: (value: Awaited<ReturnType<StudioApi['agentSessions']['create']>>) => void
    f.createSession.mockImplementationOnce(() => new Promise(accept => { resolve = accept }))
    const pending = f.render().createAgentSession('profile', true)
    if (change === 'timeline') f.render().resetToDraftTimeline()
    if (change === 'card') f.input.selectedCardId = 'other'
    if (change === 'api') f.input.api = { ...f.input.api }
    f.render()
    resolve({ session: { ...f.result.agentSession, id: 'late' }, mutation: { changesetId: 'late-session' } })
    expect(await pending).toBeUndefined()
    expect(f.render().agentSessions.some(item => item.id === 'late')).toBe(false)
    expect(f.render().primarySession?.id).not.toBe('late')
    if (change !== 'api') expect(f.render().allAgentSessions.some(item => item.id === 'late')).toBe(true)
  })

  it('keeps a committed Session without publishing when Card changes during first Timeline creation', async () => {
    const f = fixture()
    let resolve!: (value: typeof f.result.narrative) => void
    f.createTimeline.mockImplementationOnce(() => new Promise(accept => { resolve = accept }))
    const pending = f.render().createAgentSession('profile', true)
    f.input.selectedCardId = 'other'
    f.render()
    resolve(f.result.narrative)
    expect(await pending).toBeUndefined()
    expect(f.createSession).toHaveBeenCalledOnce()
    expect(f.render().timeline).toBeUndefined()
    expect(f.render().allAgentSessions.map(item => item.id)).toContain('session')
  })

  it('isolates Session events and uses targeted reads only for scoped updates', async () => {
    vi.stubGlobal('EventSource', class {})
    const f = fixture()
    await f.render().createAgentSession('profile', true)
    const list = vi.fn(async () => ({ sessions: [f.result.agentSession] }))
    const get = vi.fn(async () => ({ session: { ...f.result.agentSession, title: 'updated' } }))
    f.input.api.agentSessions.list = list
    f.input.api.agentSessions.get = get
    f.render()
    hooks.subscribingSessions = true
    const dispose = hooks.sessionEffect?.()
    const operation = (kind: string, timelineId = 'timeline'): DataOperation => ({
      entityType: 'agent.session', entityId: 'session', kind,
      scope: { store: 'narrative', entityType: 'narrative.timeline', entityId: timelineId },
    })
    hooks.sessionCommit?.([operation('update', 'other')])
    expect(list).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
    hooks.sessionCommit?.([operation('update')])
    await vi.waitFor(() => expect(f.render().agentSessions[0]?.title).toBe('updated'))
    expect(get).toHaveBeenCalledWith('session')
    expect(list).not.toHaveBeenCalled()
    for (const kind of ['create', 'delete']) {
      hooks.sessionCommit?.([operation(kind)])
      await Promise.resolve()
      await Promise.resolve()
    }
    hooks.connected?.()
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(3))
    hooks.sessionCommit?.([{ entityType: 'agent.session', entityId: 'session', kind: 'update' }])
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(4))
    dispose?.()
  })

  it('requires explicit primary creation before the first write, then binds it to the new Timeline', async () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
    })
    const f = fixture()
    await f.render().submitTurn(f.event)
    expect(f.reportFailure).toHaveBeenCalledWith(expect.objectContaining({ message: '请先新建并设置主写作对话' }))
    expect(f.createTimeline).not.toHaveBeenCalled()
    expect(f.appendInput).not.toHaveBeenCalled()
    expect(f.render().input).toBe('  Draft\n')

    const primary = (await f.render().createAgentSession('profile', true))!
    expect(f.createTimeline).toHaveBeenCalledExactlyOnceWith({ cardId: 'card' })
    expect(f.createSession).toHaveBeenCalledExactlyOnceWith({ agentPresetId: 'profile', timelineId: 'timeline' })
    expect(primary.timelineId).toBe('timeline')
    expect(f.render().primarySession?.id).toBe(primary.id)
    expect(storage.get('loom.studio.primarySession:test:timeline')).toBe(primary.id)
    expect(f.render().input).toBe('  Draft\n')

    await f.render().submitTurn(f.event)
    expect(f.appendInput).toHaveBeenCalledOnce()
    expect(f.createRun).toHaveBeenCalledWith(expect.objectContaining({
      agentSessionId: primary.id,
      narrativeTarget: expect.objectContaining({ timelineId: 'timeline' }),
    }))
  })

  it.each(['profile', 'child-profile'])('keeps the primary receiver when viewing a Session of preset %s', async childPresetId => {
    vi.stubGlobal('localStorage', {
      getItem: () => null, setItem: () => {}, removeItem: () => {},
    })
    const f = fixture()
    const primary = (await f.render().createAgentSession('profile', true))!
    const child = { ...primary, id: 'child', agentPresetId: childPresetId }
    f.input.api.agentSessions.list = vi.fn(async () => ({ sessions: [primary, child] }))
    f.getTranscript.mockImplementation(async ({ agentSessionId }) => ({
      session: agentSessionId === child.id ? child : primary, entries: [],
    }))
    await f.render().activateAgentSession(child)
    expect(f.render().agentSession?.id).toBe(child.id)
    expect(f.render().primarySession?.id).toBe(primary.id)
    expect(f.input.onSelectAgentPreset).not.toHaveBeenCalled()

    await f.render().submitTurn(f.event)
    expect(f.createRun).toHaveBeenCalledOnce()
    expect(f.createRun).toHaveBeenCalledWith(expect.objectContaining({
      agentSessionId: primary.id,
      narrativeTarget: expect.objectContaining({ timelineId: 'timeline' }),
    }))
    expect(f.render().agentSession?.id).toBe(child.id)
  })

  it('returns to the deleted Timeline source card and requires explicit primary creation before sending', async () => {
    const f = fixture()
    f.result.narrative.timeline.createdFrom = { cardId: 'source-card', cardVersion: 1 }
    f.input.selectedCardId = 'another-card'
    f.input.onSelectCard = vi.fn(id => { f.input.selectedCardId = id })
    f.input.api.narratives.get = vi.fn(async () => ({
      timeline: f.result.narrative.timeline, branches: [f.result.narrative.branch],
    }))
    f.input.api.narratives.list = vi.fn(async () => ({ timelines: [] }))
    f.input.api.narratives.delete = vi.fn(async () => ({ deleted: true as const, mutation: { changesetId: 'deleted' } }))
    const listSessions = vi.fn(async () => ({ sessions: [] }))
    f.input.api.agentSessions.list = listSessions
    await f.render().activateTimeline('timeline')
    listSessions.mockClear()

    await expect(f.render().deleteTimeline('timeline')).resolves.toBe(true)
    const preview = f.render()
    expect(f.input.onSelectCard).toHaveBeenCalledWith('source-card')
    expect(preview.timeline).toBeUndefined()
    expect(preview.branch).toBeUndefined()
    expect(preview.nodes).toEqual([])
    expect(preview.agentSessionReady).toBe(true)
    expect(preview.agentSession).toBeUndefined()
    expect(listSessions).not.toHaveBeenCalled()
    expect(f.input.api.narratives.list).toHaveBeenLastCalledWith({
      createdFromCardId: 'source-card', cursor: undefined, limit: 100,
    })

    preview.setInput('Start again')
    await expect(f.render().submitTurn(f.event)).resolves.toBeUndefined()
    expect(f.createTimeline).not.toHaveBeenCalled()
    expect(f.appendInput).not.toHaveBeenCalled()
    await f.render().createAgentSession('profile', true)
    expect(f.createTimeline).toHaveBeenCalledExactlyOnceWith({ cardId: 'source-card' })
    expect(f.render().input).toBe('Start again')
    expect(f.render().primarySession?.id).toBe('session')
    await f.render().submitTurn(f.event)
    expect(f.appendInput).toHaveBeenCalledWith(expect.objectContaining({ content: 'Start again' }))
    expect(f.createRun).toHaveBeenCalledOnce()
    expect(f.reportFailure).toHaveBeenCalledWith(expect.objectContaining({ message: '请先新建并设置主写作对话' }))
  })

  it('retains the committed Timeline when primary Session creation fails and reuses it on explicit retry', async () => {
    const f = fixture()
    const failure = new Error('Session creation failed')
    f.createSession.mockRejectedValueOnce(failure)
    await expect(f.render().createAgentSession('profile', true)).rejects.toBe(failure)
    expect(f.createRun).not.toHaveBeenCalled()
    expect(f.appendInput).not.toHaveBeenCalled()
    const state = f.render()
    expect(state.composerInput).toBe('  Draft\n')
    expect(state.timeline?.id).toBe('timeline')
    expect(state.branch?.id).toBe('branch')
    expect(state.nodes).toEqual([])
    expect(state.agentMessages).toEqual([])
    expect(state.lastRun).toBeUndefined()
    const primary = await state.createAgentSession('profile', true)
    expect(primary?.timelineId).toBe('timeline')
    expect(f.render().primarySession?.id).toBe(primary?.id)
    await f.render().submitTurn(f.event)
    expect(f.createTimeline).toHaveBeenCalledOnce()
    expect(f.createSession).toHaveBeenCalledTimes(2)
    expect(f.createRun).toHaveBeenCalledOnce()
    expect(f.render().composerInput).toBe('')
    expect(f.render().lastRun).toBeDefined()
  })
})
