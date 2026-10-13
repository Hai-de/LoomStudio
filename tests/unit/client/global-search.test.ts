import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query'
import type { GlobalSearchHit, SearchResourcesInput, SearchResourcesResult, SearchScopeOption } from '@loom-studio/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  findGlobalSearchNavigation, findGlobalSearchTypes, globalSearchReducer, globalSearchResourceValue,
  globalSearchScopeValue, INITIAL_GLOBAL_SEARCH_STATE,
} from '../../../apps/studio-client/src/features/global-search/model/global-search-model.js'
import {
  globalSearchResultsOptions, globalSearchScopesOptions,
} from '../../../apps/studio-client/src/features/global-search/model/global-search-queries.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'

const t = createTranslator('zh-CN')
const scope: SearchScopeOption = { kind: 'resource', id: 'lore-one', label: '同名世界书' }
const bodyHit: GlobalSearchHit = {
  id: 'lore-one/entry', kind: 'lore', title: '地理', path: ['北境', '地理'], snippet: '通向王都的道路',
  target: { type: 'resource', resourceId: 'lore-one', nodeId: 'entry', resourceKind: 'lore' },
}

describe('global search model', () => {
  it('matches translated page aliases and exposes a single canonical preset destination', () => {
    const panels = (query: string) => findGlobalSearchNavigation({ query, t }).map(item => item.panel)
    expect(panels('世界书')).toEqual(['resource'])
    expect(panels('API')).toEqual(['model'])
    expect(panels('预设')).toEqual(['agent'])
    expect(panels('macro')).toEqual(['macro'])
    expect(findGlobalSearchNavigation({ query: '', scope, t })).toEqual([])
    expect(findGlobalSearchNavigation({ query: 'API', kind: 'lore', t })).toEqual([])
    expect(findGlobalSearchTypes('世界书', t)).toEqual([{ kind: 'lore', label: 'Lore' }])
  })

  it('preserves the ordinary query while selecting and removing scope and type tokens', () => {
    let state = globalSearchReducer(INITIAL_GLOBAL_SEARCH_STATE, { type: 'input', value: '王都' })
    state = globalSearchReducer(state, { type: 'mode', mode: 'scopes' })
    state = globalSearchReducer(state, { type: 'input', value: '北境' })
    expect(state).toMatchObject({ query: '王都', candidateQuery: '北境', mode: 'scopes' })
    state = globalSearchReducer(state, { type: 'scope', scope })
    state = globalSearchReducer(state, { type: 'mode', mode: 'types' })
    state = globalSearchReducer(state, { type: 'kind', kind: 'lore' })
    expect(state).toMatchObject({ query: '王都', candidateQuery: '', mode: 'results', scope, kind: 'lore' })
    state = globalSearchReducer(state, { type: 'scope' })
    state = globalSearchReducer(state, { type: 'kind' })
    expect(state).toMatchObject({ query: '王都', scope: undefined, kind: undefined })
  })

  it('turns typed prefixes into candidate searches without sending prefix fragments as a resource query', () => {
    let state = globalSearchReducer(INITIAL_GLOBAL_SEARCH_STATE, { type: 'input', value: 'in' })
    state = globalSearchReducer(state, { type: 'input', value: 'in:北境' })
    expect(state).toMatchObject({ query: '', candidateQuery: '北境', mode: 'scopes' })
    state = globalSearchReducer(state, { type: 'input', value: 'type:Lore' })
    expect(state).toMatchObject({ query: '', candidateQuery: 'Lore', mode: 'types' })
    state = globalSearchReducer(state, { type: 'kind', kind: 'lore' })
    expect(state).toMatchObject({ query: '', candidateQuery: '', mode: 'results', kind: 'lore' })
  })

  it('keeps same-name resources and scope candidates distinct by stable identities', () => {
    const otherHit = { ...bodyHit, id: 'lore-two/entry' }
    expect(globalSearchResourceValue(bodyHit)).not.toEqual(globalSearchResourceValue(otherHit))
    expect(globalSearchScopeValue(scope)).not.toEqual(globalSearchScopeValue({ ...scope, id: 'lore-two' }))
    expect(globalSearchScopeValue(scope)).not.toEqual(globalSearchScopeValue({ ...scope, kind: 'card' }))
  })

  it('keeps body-only hits, paginates them, and starts a new result set when conditions change', async () => {
    const client = new QueryClient()
    const search = vi.fn(async (input: SearchResourcesInput): Promise<SearchResourcesResult> => input.cursor
      ? { items: [{ ...bodyHit, id: 'lore-one/second' }] }
      : { items: [bodyHit], nextCursor: 'next-page' })
    const api = { globalSearch: { search, scopes: vi.fn() } }
    const options = globalSearchResultsOptions({ api, endpoint: 'server-one', query: '王都', scope, kind: 'lore' })
    const observer = new InfiniteQueryObserver(client, { ...options, enabled: false })
    await observer.refetch()
    expect(observer.getCurrentResult().data?.pages[0].items).toEqual([bodyHit])
    await observer.fetchNextPage()
    expect(observer.getCurrentResult().data?.pages.flatMap(page => page.items)).toHaveLength(2)
    expect(search.mock.calls[1]?.[0]).toMatchObject({ query: '王都', scope, kind: 'lore', cursor: 'next-page' })

    observer.setOptions({
      ...globalSearchResultsOptions({ api, endpoint: 'server-one', query: '王都', scope: { ...scope, id: 'lore-two' }, kind: 'preset' }),
      enabled: false,
    })
    expect(observer.getCurrentResult().data).toBeUndefined()
    await observer.refetch()
    expect(search.mock.calls[2]?.[0]).toMatchObject({ query: '王都', scope: { id: 'lore-two' }, kind: 'preset', cursor: undefined })
    observer.destroy()
    client.clear()
  })

  it('refreshes unchanged result and scope queries when reopened within the application cache window', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })
    const search = vi.fn().mockResolvedValueOnce({ items: [bodyHit] }).mockResolvedValue({ items: [] })
    const scopes = vi.fn().mockResolvedValueOnce({ items: [scope] }).mockResolvedValue({ items: [] })
    const api = { globalSearch: { search, scopes } }
    const options = globalSearchResultsOptions({ api, endpoint: 'one', query: '王都' })
    const observer = new InfiniteQueryObserver(client, { ...options, enabled: false })
    const unsubscribe = observer.subscribe(() => {})
    await observer.refetch()
    observer.setOptions({ ...options, enabled: true })
    await vi.waitFor(() => expect(observer.getCurrentResult().data?.pages[0].items).toEqual([]))
    unsubscribe()
    observer.destroy()
    const scopeOptions = globalSearchScopesOptions({ api, endpoint: 'one', query: '' })
    await client.fetchInfiniteQuery(scopeOptions)
    const updatedScopes = await client.fetchInfiniteQuery(scopeOptions)
    expect(updatedScopes.pages[0].items).toEqual([])
    expect(search).toHaveBeenCalledTimes(2)
    expect(scopes).toHaveBeenCalledTimes(2)
    client.clear()
  })

  it('isolates late responses by query and endpoint', async () => {
    const client = new QueryClient()
    const delayed = Promise.withResolvers<SearchResourcesResult>()
    const api = { globalSearch: {
      search: vi.fn((input: SearchResourcesInput) => input.query === '旧词' ? delayed.promise : Promise.resolve({ items: [] })),
      scopes: vi.fn(),
    } }
    const oldOptions = globalSearchResultsOptions({ api, endpoint: 'server-one', query: '旧词' })
    const currentOptions = globalSearchResultsOptions({ api, endpoint: 'server-two', query: '新词' })
    const oldRequest = client.fetchInfiniteQuery(oldOptions)
    await client.fetchInfiniteQuery(currentOptions)
    delayed.resolve({ items: [bodyHit] })
    await oldRequest
    expect(client.getQueryData(currentOptions.queryKey)?.pages[0].items).toEqual([])
    expect(client.getQueryData(oldOptions.queryKey)?.pages[0].items).toEqual([bodyHit])
    client.clear()
  })

  it('queries the full scope directory with its own pagination and exposes errors', async () => {
    const client = new QueryClient()
    const scopes = vi.fn(async ({ cursor }: { cursor?: string }) => cursor
      ? { items: [{ ...scope, id: 'lore-two' }] }
      : { items: [scope], nextCursor: 'scope-next' })
    const api = { globalSearch: { scopes, search: vi.fn() } }
    const observer = new InfiniteQueryObserver(client, {
      ...globalSearchScopesOptions({ api, endpoint: 'server-one', query: '同名' }), enabled: false,
    })
    await observer.refetch()
    await observer.fetchNextPage()
    expect(observer.getCurrentResult().data?.pages.flatMap(page => page.items).map(item => item.id)).toEqual(['lore-one', 'lore-two'])
    scopes.mockRejectedValueOnce(new Error('范围目录不可用'))
    await observer.refetch()
    expect(observer.getCurrentResult().error?.message).toBe('范围目录不可用')
    observer.destroy()
    client.clear()
  })
})
