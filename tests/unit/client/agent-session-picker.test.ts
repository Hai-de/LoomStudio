import { isValidElement, type FunctionComponent, type ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentSessionPicker } from '../../../apps/studio-client/src/widgets/agent-chat-panel/agent-session-picker.js'
import type { AgentPreset, AgentSession } from '../../../apps/studio-client/src/entities/index.js'

const hooks = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[] }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = initial
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value
    }]
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = { current: initial }
    return hooks.values[index]
  },
}))

type Element = ReactElement<Record<string, any>>
function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements)
  if (!isValidElement(value)) return []
  const element = value as Element
  if (typeof element.type === 'function' && element.type.name === 'SessionTitleInput') {
    return elements((element.type as FunctionComponent<Record<string, unknown>>)(element.props))
  }
  return [element, ...elements(element.props.children), ...elements(element.props.actions), ...elements(element.props.headerActions)]
}

beforeEach(() => { hooks.cursor = 0; hooks.values = [] })

function fixture() {
  const session = (id: string, title: string, agentPresetId: string, timelineId = 'timeline'): AgentSession => ({
    id, title, agentPresetId, timelineId, entryCount: 0, createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
  })
  const sessions = [session('a', 'Story', 'writer'), session('b', 'Notes', 'summary'), session('c', 'Other', 'writer', 'other-timeline')]
  const props = {
    session: sessions[0], sessions, primarySessionId: 'a', timelineId: 'timeline', disabled: false,
    presets: [{ id: 'writer', rootNode: { label: 'Writing' } }, { id: 'summary', rootNode: { label: 'Memory Summary' } }] as AgentPreset[],
    t: (key: string) => key, onSelect: vi.fn(), onRename: vi.fn(async () => sessions[0]),
    onSetPrimary: vi.fn(async () => {}),
  } as Parameters<typeof AgentSessionPicker>[0]
  const render = () => { hooks.cursor = 0; return elements(AgentSessionPicker(props)) }
  const control = (label: string) => render().find(element => element.props['aria-label'] === label)!
  const open = () => control('选择会话').props.onClick()
  return { props, sessions, render, control, open }
}

describe('Agent session picker', () => {
  it('searches by preset and opens a session without changing the primary receiver', () => {
    const f = fixture()
    f.open()
    f.control('搜索会话').props.onChange({ target: { value: 'Memory' } })
    expect(f.render().filter(element => String(element.props['aria-label']).startsWith('打开会话：'))
      .map(element => element.props['aria-label'])).toEqual(['打开会话：Notes'])
    f.control('打开会话：Notes').props.onClick()
    expect(f.props.onSelect).toHaveBeenCalledWith('b')
    expect(f.props.onSetPrimary).not.toHaveBeenCalled()
    expect(f.render().some(element => element.props.title === 'Agent 会话')).toBe(false)
  })

  it('sets primary independently of viewing and keeps a failed selection visible', async () => {
    const f = fixture()
    f.open()
    expect(f.control('设为主写作对话：Other').props.disabled).toBe(true)
    f.control('设为主写作对话：Notes').props.onClick()
    await vi.waitFor(() => expect(f.props.onSetPrimary).toHaveBeenCalledWith(f.sessions[1]))
    expect(f.props.onSelect).not.toHaveBeenCalled()
    ;(f.props.onSetPrimary as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Paused run abandonment failed'))
    await vi.waitFor(() => expect(f.control('设为主写作对话：Notes').props.disabled).toBe(false))
    f.control('设为主写作对话：Notes').props.onClick()
    await vi.waitFor(() => expect(f.render().some(element => element.props.role === 'alert'
      && element.props.children === 'Paused run abandonment failed')).toBe(true))
    expect(f.render().some(element => element.props.title === 'Agent 会话')).toBe(true)
  })

  it('renames the original session and retains the input after a failed save', async () => {
    const f = fixture()
    ;(f.props.onRename as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Title save failed'))
    f.control('会话名称').props.onChange({ target: { value: 'New story name' } })
    f.control('会话名称').props.onBlur()
    await vi.waitFor(() => expect(f.render().some(element => element.props.role === 'alert'
      && element.props.children === 'Title save failed')).toBe(true))
    expect(f.props.onRename).toHaveBeenCalledWith('a', 'New story name')
    expect(f.control('会话名称').props.value).toBe('New story name')
    expect(f.props.onSelect).not.toHaveBeenCalled()
    expect(f.props.onSetPrimary).not.toHaveBeenCalled()
  })
})
