import { infiniteQueryOptions } from '@tanstack/react-query'
import type { GlobalSearchKind, GlobalSearchScope, ListGlobalSearchScopesResult, SearchResourcesResult } from '@loom-studio/shared'
import type { StudioApi } from '../../../shared/api/studio-api.js'

type GlobalSearchApi = Pick<StudioApi, 'globalSearch'>

export function globalSearchResultsOptions(input: {
  api: GlobalSearchApi
  endpoint: string
  query: string
  currentCardId?: string
  currentPresetId?: string
  scope?: GlobalSearchScope
  kind?: GlobalSearchKind
}) {
  const { api, endpoint, query, scope, kind, currentCardId, currentPresetId } = input
  return infiniteQueryOptions({
    queryKey: ['global-search', endpoint, 'resources', query, scope?.kind, scope?.id, kind, currentCardId, currentPresetId] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }): Promise<SearchResourcesResult> => api.globalSearch.search({
      query, scope, kind, currentCardId, currentPresetId, limit: 30, cursor: pageParam,
    }, signal),
    getNextPageParam: (page: SearchResourcesResult) => page.nextCursor,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function globalSearchScopesOptions(input: {
  api: GlobalSearchApi
  endpoint: string
  query: string
  currentCardId?: string
  currentPresetId?: string
}) {
  const { api, endpoint, query, currentCardId, currentPresetId } = input
  return infiniteQueryOptions({
    queryKey: ['global-search', endpoint, 'scopes', query, currentCardId, currentPresetId] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }): Promise<ListGlobalSearchScopesResult> => api.globalSearch.scopes({
      query, currentCardId, currentPresetId, limit: 30, cursor: pageParam,
    }, signal),
    getNextPageParam: (page: ListGlobalSearchScopesResult) => page.nextCursor,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
