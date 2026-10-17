import { describe, expect, it, vi } from 'vitest'
import { fixture, hooks, primaryFixture } from '../../support/client/narrative-runtime.js'
import type { StudioApi } from '../../../apps/studio-client/src/shared/api/studio-api.js'
import type { DataOperation } from '../../../apps/studio-client/src/shared/api/data-commit-events.js'

describe('Narrative primary Session lifecycle', () => {
  it('does not reset an active Timeline Session when mount effects replay', async () => {
    const f = await primaryFixture()
    const before = f.render()
    const list = vi.mocked(f.input.api.agentSessions.list)
    list.mockClear()
    for (const effect of hooks.mountEffects) effect()
    await Promise.resolve()
    expect(list).not.toHaveBeenCalled()
    expect(f.render().agentSession).toEqual(before.agentSession)
    expect(f.render().agentMessages).toEqual(before.agentMessages)
    expect(f.render().agentSessionReady).toBe(true)
  })

  it('keeps the selected Session through incomplete background lists but clears it on an explicit deletion', async () => {
    vi.stubGlobal('EventSource', class {})
    const f = fixture()
    await f.render().createTimelineFromCard()
    await f.render().createAgentSession('profile', true)
    const list = vi.fn(async () => ({ sessions: [f.result.agentSession] }))
    f.input.api.agentSessions.list = list
    await f.render().activateAgentSession(f.result.agentSession)
    list.mockResolvedValue({ sessions: [] })
    f.render()
    hooks.subscribingSessions = true
    const dispose = hooks.sessionEffect?.()
    hooks.connected?.()
    await vi.waitFor(() => expect(f.render().agentSessions).toEqual([]))
    expect(f.render().agentSession?.id).toBe('session')
    expect(f.render().primarySession?.id).toBe('session')
    hooks.sessionCommit?.([{
      entityType: 'agent.session', entityId: 'session', kind: 'delete',
      scope: { store: 'narrative', entityType: 'narrative.timeline', entityId: 'timeline' },
    }])
    expect(f.render().agentSession).toBeUndefined()
    expect(f.render().primarySession).toBeUndefined()
    list.mockResolvedValue({ sessions: [f.result.agentSession] })
    hooks.connected?.()
    await vi.waitFor(() => expect(f.render().agentSessions).toHaveLength(1))
    expect(f.render().agentSession).toBeUndefined()
    dispose?.()
  })

  it('keeps failed core Session restoration unavailable and completes Timeline activation after retry', async () => {
    const f = fixture()
    const failure = new Error('Session catalog unavailable')
    f.input.api.narratives.get = vi.fn(async () => ({ timeline: f.result.narrative.timeline, branches: [f.result.narrative.branch] }))
    f.input.runLatestAction = async action => { try { await action({ isCurrent: () => true }) } catch (error) { f.reportFailure(error) } }
    f.input.api.agentSessions.list = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue({ sessions: [f.result.agentSession] })
    f.getTranscript.mockResolvedValue({ session: f.result.agentSession, entries: [] })
    expect(await f.render().activateTimeline('timeline')).toBeUndefined()
    expect(f.render().agentSessionReady).toBe(false)
    expect(f.reportFailure).toHaveBeenCalledWith(failure)
    expect(await f.render().activateTimeline('timeline')).toBe('branch')
    expect(f.render().agentSessionReady).toBe(true)
    expect(f.render().agentSession?.id).toBe('session')
  })

  it.each(['saved', 'missing', 'standalone'])('restores the target primary when opening a %s Session across Timelines', async mode => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mode === 'saved' && key === 'loom.studio.primarySession:test:other-timeline' ? 'other-primary' : null,
      setItem: () => {}, removeItem: () => {},
    })
    const f = fixture()
    await f.render().createTimelineFromCard()
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
    await f.render().createTimelineFromCard()
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
    await f.render().createTimelineFromCard()
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

  it('rejects primary Session creation in preview without creating a Timeline or Session', async () => {
    const f = fixture()
    await expect(f.render().createAgentSession('profile', true)).rejects.toThrow('请先点击“开始一个新故事”')
    expect(f.createTimeline).not.toHaveBeenCalled()
    expect(f.createSession).not.toHaveBeenCalled()
    expect(f.render().timeline).toBeUndefined()
    expect(f.render().primarySession).toBeUndefined()
  })

  it('does not publish or navigate first Timeline creation after the Card changes', async () => {
    const f = fixture()
    let resolve!: (value: typeof f.result.narrative) => void
    f.createTimeline.mockImplementationOnce(() => new Promise(accept => { resolve = accept }))
    const pending = f.render().createTimelineFromCard()
    f.input.selectedCardId = 'other'
    f.render()
    resolve(f.result.narrative)
    expect(await pending).toBeUndefined()
    expect(f.createSession).not.toHaveBeenCalled()
    expect(f.render().timeline).toBeUndefined()
    expect(f.render().allAgentSessions).toEqual([])
  })

  it('isolates Session events and uses targeted reads only for scoped updates', async () => {
    vi.stubGlobal('EventSource', class {})
    const f = fixture()
    await f.render().createTimelineFromCard()
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

  it('requires an explicit Timeline but creates the primary Session on first send and reuses it', async () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
    })
    const f = fixture()
    await f.render().submitTurn(f.event)
    expect(f.reportFailure).toHaveBeenCalledWith(expect.objectContaining({ message: '请先点击“开始一个新故事”' }))
    expect(f.createTimeline).not.toHaveBeenCalled()
    expect(f.appendInput).not.toHaveBeenCalled()
    expect(f.render().input).toBe('  Draft\n')

    await f.render().createTimelineFromCard()
    await f.render().submitTurn(f.event)
    const primary = f.render().primarySession!
    expect(f.createTimeline).toHaveBeenCalledExactlyOnceWith({ cardId: 'card', openingContent: '', expectedCardVersion: undefined })
    expect(f.createSession).toHaveBeenCalledExactlyOnceWith({ agentPresetId: 'profile', timelineId: 'timeline' })
    expect(primary.timelineId).toBe('timeline')
    expect(f.render().primarySession?.id).toBe(primary.id)
    expect(storage.get('loom.studio.primarySession:test:timeline')).toBe(primary.id)
    expect(f.appendInput).toHaveBeenCalledOnce()
    expect(f.createRun).toHaveBeenCalledWith(expect.objectContaining({
      agentSessionId: primary.id,
      narrativeTarget: expect.objectContaining({ timelineId: 'timeline' }),
    }))
    f.render().setInput('Next turn')
    await f.render().submitTurn(f.event)
    expect(f.createSession).toHaveBeenCalledOnce()
    expect(f.createRun).toHaveBeenCalledTimes(2)
  })

  it.each(['profile', 'child-profile'])('keeps the primary receiver when viewing a Session of preset %s', async childPresetId => {
    vi.stubGlobal('localStorage', {
      getItem: () => null, setItem: () => {}, removeItem: () => {},
    })
    const f = fixture()
    await f.render().createTimelineFromCard()
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

  it('returns to the deleted Timeline source card and requires explicit restart before sending', async () => {
    const f = fixture()
    f.result.narrative.timeline.createdFrom = { cardId: 'source-card', cardVersion: 1 }
    f.input.selectedCardId = 'another-card'
    f.input.onSelectCard = vi.fn(id => { f.input.selectedCardId = id })
    const deletedTimeline = { ...f.result.narrative.timeline, id: 'deleted-timeline' }
    const deletedBranch = { ...f.result.narrative.branch, timelineId: deletedTimeline.id }
    f.input.api.narratives.get = vi.fn(async () => ({
      timeline: deletedTimeline, branches: [deletedBranch],
    }))
    f.getPage.mockResolvedValueOnce({ timeline: deletedTimeline, branch: deletedBranch, nodes: [] })
    f.input.api.narratives.list = vi.fn(async () => ({ timelines: [] }))
    f.input.api.narratives.delete = vi.fn(async () => ({ deleted: true as const, mutation: { changesetId: 'deleted' } }))
    const listSessions = vi.fn(async () => ({ sessions: [] }))
    f.input.api.agentSessions.list = listSessions
    await f.render().activateTimeline(deletedTimeline.id)
    listSessions.mockClear()

    await expect(f.render().deleteTimeline(deletedTimeline.id)).resolves.toBe(true)
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
    await expect(f.render().createAgentSession('profile', true)).rejects.toThrow('请先点击“开始一个新故事”')
    expect(f.createTimeline).not.toHaveBeenCalled()
    await f.render().createTimelineFromCard()
    await f.render().createAgentSession('profile', true)
    expect(f.createTimeline).toHaveBeenCalledExactlyOnceWith({ cardId: 'source-card', openingContent: '', expectedCardVersion: undefined })
    expect(f.render().input).toBe('Start again')
    expect(f.render().primarySession?.id).toBe('session')
    await f.render().submitTurn(f.event)
    expect(f.appendInput).toHaveBeenCalledWith(expect.objectContaining({ content: 'Start again' }))
    expect(f.createRun).toHaveBeenCalledOnce()
    expect(f.reportFailure).toHaveBeenCalledWith(expect.objectContaining({ message: '请先点击“开始一个新故事”' }))
  })

  it('retains the committed Timeline when primary Session creation fails and reuses it on explicit retry', async () => {
    const f = fixture()
    await f.render().createTimelineFromCard()
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
