// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useNewStoryExtensions } from '../../../apps/studio-client/src/features/extension-renderers/ui/new-story-extensions.js'
import type { StudioApi } from '../../../apps/studio-client/src/shared/api/studio-api.js'
import { useExtensionCardContext } from '../../../apps/studio-client/src/features/extension-renderers/model/use-extension-card-context.js'
import type { Card } from '../../../apps/studio-client/src/entities/index.js'

it('preselects enabled story extensions, returns the adjusted selection, and cancels without a write', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const packages = [
    { packageId: 'example.world', displayName: '世界', participation: 'timeline', available: true, modules: [{ desired: { enabled: true } }] },
    { packageId: 'example.disabled', displayName: '未启用', participation: 'timeline', available: true, modules: [{ desired: { enabled: false } }] },
    { packageId: 'example.theme', displayName: '主题', available: true, modules: [{ desired: { enabled: true } }] },
  ]
  const updateCard = vi.fn()
  const createStory = vi.fn()
  const api = {
    cards: { get: async () => ({ card: { id: 'card', name: '当前角色' } }), update: updateCard },
    narratives: { create: createStory },
    extensions: { list: async (target?: unknown) => ({ items: target ? [] : packages }) },
    extensionInstallations: { list: async () => ({ installations: packages.map(pkg => ({
      id: `extension-installation:["global","${pkg.packageId}"]`, packageId: pkg.packageId,
      participation: pkg.participation, target: { kind: 'global' },
    })) }) },
  } as unknown as StudioApi
  let current!: ReturnType<typeof useNewStoryExtensions>
  function Fixture() { current = useNewStoryExtensions(api); return current.dialog }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(Fixture)) })
    let pending!: ReturnType<typeof current.choose>
    await act(async () => { pending = current.choose('card') })
    const checkboxes = [...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')]
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]!.checked).toBe(true)
    expect(checkboxes[1]!.checked).toBe(false)
    expect(checkboxes[1]!.disabled).toBe(true)
    act(() => { checkboxes[0]!.click() })
    act(() => { [...container.querySelectorAll('button')].find(button => button.textContent === '开始叙事')!.click() })
    expect(await pending).toEqual([])
    await act(async () => { pending = current.choose('card') })
    act(() => { [...container.querySelectorAll('button')].find(button => button.textContent === '取消')!.click() })
    expect(await pending).toBeUndefined()
    expect(updateCard).not.toHaveBeenCalled()
    expect(createStory).not.toHaveBeenCalled()
  } finally { act(() => root.unmount()); container.remove() }
})

it('uses the story Card and discards a late response from the previous Card', async () => {
  const responses = new Map<string, (value: { card: Card }) => void>()
  const api = { cards: { get: (id: string) => new Promise<{ card: Card }>(resolve => { responses.set(id, resolve) }) } } as unknown as StudioApi
  const card = (id: string) => ({ id, name: id, version: 1 }) as Card
  let current!: ReturnType<typeof useExtensionCardContext>
  function Fixture({ id }: { id: string }) { current = useExtensionCardContext(api, id, card('editor')); return null }
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(Fixture, { id: 'previous' })) })
    expect(current.card).toBeUndefined()
    await act(async () => { root.render(createElement(Fixture, { id: 'current' })) })
    await act(async () => { responses.get('previous')!({ card: card('previous') }) })
    expect(current.card).toBeUndefined()
    await act(async () => { responses.get('current')!({ card: card('current') }) })
    expect(current.card?.id).toBe('current')
  } finally { act(() => root.unmount()) }
})
