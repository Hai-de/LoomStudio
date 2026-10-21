// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { MemoryPanel } from '../../../apps/studio-client/src/widgets/memory-panel/memory-panel.js'
import { createClientRendererHost } from '../../../apps/studio-client/src/shared/extension-renderer-runtime/client-renderer-host.js'
import type { StudioApi } from '../../../apps/studio-client/src/shared/api/studio-api.js'

it('offers story adoption when no renderer is active without automatically navigating', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const client = new QueryClient()
  const rootElement = document.createElement('div')
  const root = createRoot(rootElement)
  const onNavigate = vi.fn()
  const onOpenStoryExtensions = vi.fn()
  const rendererHost = createClientRendererHost()
  rendererHost.setScopeSnapshot({ workspace: 'workspace', timelineId: 'story', branchId: 'branch' })
  client.setQueryData(['memory-timeline-owner', 'test', 'story'], { timeline: { id: 'story', activeBranchId: 'branch', title: '故事' } })
  try {
    await act(async () => root.render(h(QueryClientProvider, { client }, h(MemoryPanel, {
      api: { narratives: { get: async () => ({ timeline: { id: 'story', activeBranchId: 'branch' } }) } } as unknown as StudioApi,
      endpoint: 'test', view: 'plot', timelineId: 'story', onNavigate, onOpenStoryExtensions, rendererHost,
    }))))
    expect(rootElement.textContent).toContain('选择使用记忆扩展')
    expect(onNavigate).not.toHaveBeenCalled()
    expect(onOpenStoryExtensions).not.toHaveBeenCalled()
    const button = [...rootElement.querySelectorAll('button')].find(item => item.textContent === '打开故事扩展')!
    act(() => button.click())
    expect(onOpenStoryExtensions).toHaveBeenCalledOnce()
  } finally { act(() => root.unmount()); client.clear() }
})
