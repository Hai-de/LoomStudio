import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createClientRendererHost } from '../../../apps/studio-client/src/shared/extension-renderer-runtime/client-renderer-host.js'
import { RendererSurfaceHost } from '../../../apps/studio-client/src/features/extension-renderers/ui/renderer-surface-host.js'

describe('RendererSurfaceHost', () => {
  it('projects ordered collection roots into one Host-owned surface', () => {
    const host = createClientRendererHost()
    host.register({
      owner: { kind: 'extension', packageId: 'official.b', moduleId: 'client' },
      definition: { id: 'tail', name: 'B', surface: 'narrative.timeline.tail', instanceScope: 'timeline', suggestedOrder: 10 },
      mount: vi.fn(),
    })
    host.register({
      owner: { kind: 'extension', packageId: 'official.a', moduleId: 'client' },
      definition: { id: 'tail', name: 'A', surface: 'narrative.timeline.tail', instanceScope: 'timeline', suggestedOrder: -10 },
      mount: vi.fn(),
    })
    const html = renderToStaticMarkup(createElement(RendererSurfaceHost, {
      host,
      scope: { kind: 'timeline', key: 'timeline-1' },
      surface: 'narrative.timeline.tail',
    }))
    expect(html.indexOf('extension:official.a/client/tail')).toBeLessThan(html.indexOf('extension:official.b/client/tail'))
    expect(html).toContain('data-renderer-policy="collection"')
  })

  it('renders only the active navigation contribution', () => {
    const host = createClientRendererHost()
    host.register({
      owner: { kind: 'extension', packageId: 'official.panel', moduleId: 'client' },
      definition: { id: 'panel', name: 'Panel', surface: 'shell.workspace-panel', instanceScope: 'workspace' },
      mount: vi.fn(),
    })
    host.claim('shell.workspace-panel', 'workspace', 'extension:official.panel/client/panel')
    const html = renderToStaticMarkup(createElement(RendererSurfaceHost, {
      host,
      scope: { kind: 'workspace', key: 'workspace' },
      surface: 'shell.workspace-panel',
    }))
    expect(html).toContain('extension:official.panel/client/panel')
    expect(html).toContain('data-renderer-policy="navigation"')
  })

  it('renders only the selected statistics page contribution without a claim', () => {
    const host = createClientRendererHost()
    host.register({
      owner: { kind: 'extension', packageId: 'example.statistics', moduleId: 'client' },
      definition: { id: 'statistics', name: 'Example Statistics', surface: 'statistics.page', instanceScope: 'workspace', adapter: 'shadow' },
      mount: vi.fn(),
    })
    const html = renderToStaticMarkup(createElement(RendererSurfaceHost, {
      host,
      scope: { kind: 'workspace', key: 'workspace' },
      surface: 'statistics.page',
      activeContributionKey: 'extension:example.statistics/client/statistics',
    }))
    expect(html).toContain('data-renderer-surface="statistics.page"')
    expect(html).toContain('extension:example.statistics/client/statistics')
    expect(html).toContain('data-renderer-policy="navigation"')
  })

  it('does not mount a contribution into a mismatched instance scope', () => {
    const host = createClientRendererHost()
    host.register({
      owner: { kind: 'extension', packageId: 'official.sheet', moduleId: 'client' },
      definition: { id: 'sheet', name: 'Sheet', surface: 'composer.sheet', instanceScope: 'timeline' },
      mount: vi.fn(),
    })
    host.claim('composer.sheet', 'workspace', 'extension:official.sheet/client/sheet')
    const html = renderToStaticMarkup(createElement(RendererSurfaceHost, {
      host,
      scope: { kind: 'workspace', key: 'workspace' },
      surface: 'composer.sheet',
    }))
    expect(html).toBe('')
  })
  it('renders Timeline memory contributions only while their installation is available', () => {
    const host = createClientRendererHost()
    host.setScopeSnapshot({ workspace: 'workspace', cardId: 'card-a', timelineId: 'timeline-a', branchId: 'branch-a' })
    let adoptedAndEnabled = true
    const registration = host.register({
      owner: { kind: 'extension', packageId: 'example.memory', moduleId: 'client', target: { kind: 'card', cardId: 'card-a' } },
      definition: { id: 'memory', name: 'Memory', surface: 'memory.panel', instanceScope: 'timeline', adapter: 'shadow' },
      isAvailable: () => adoptedAndEnabled,
      mount: vi.fn(),
    })
    const render = () => renderToStaticMarkup(createElement(RendererSurfaceHost, {
      host, scope: { kind: 'timeline', key: 'timeline-a' }, surface: 'memory.panel',
    }))
    expect(render()).toContain('data-renderer-surface="memory.panel"')
    adoptedAndEnabled = false
    expect(render()).toBe('')
    adoptedAndEnabled = true
    host.setScopeSnapshot({ workspace: 'workspace', cardId: 'other', timelineId: 'other', branchId: 'other' })
    expect(render()).toBe('')
    registration.dispose()
    expect(render()).toBe('')
  })

})
