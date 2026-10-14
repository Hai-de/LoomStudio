import { z } from 'zod'

export const globalSearchKindSchema = z.enum(['card', 'lore', 'preset', 'timeline', 'session'])
export const globalSearchScopeSchema = z.object({
  kind: z.enum(['card', 'resource', 'extension']),
  id: z.string().min(1),
})

export const searchResourcesInputSchema = z.object({
  currentCardId: z.string().min(1).optional(),
  currentPresetId: z.string().min(1).optional(),
  query: z.string().max(256),
  scope: globalSearchScopeSchema.optional(),
  kind: globalSearchKindSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().max(16000).optional(),
})

export const listGlobalSearchScopesInputSchema = z.object({
  currentCardId: z.string().min(1).optional(),
  currentPresetId: z.string().min(1).optional(),
  query: z.string().max(256),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().max(16000).optional(),
})

export type GlobalSearchKind = z.infer<typeof globalSearchKindSchema>
export type GlobalSearchScope = z.infer<typeof globalSearchScopeSchema>
export type SearchResourcesInput = z.infer<typeof searchResourcesInputSchema>
export type ListGlobalSearchScopesInput = z.infer<typeof listGlobalSearchScopesInputSchema>

export type GlobalSearchHit = {
  id: string
  kind: GlobalSearchKind
  title: string
  path: string[]
  snippet?: string
  target:
    | { type: 'card'; cardId: string }
    | { type: 'resource'; resourceId: string; nodeId: string; resourceKind: 'lore' | 'preset' }
    | { type: 'timeline'; timelineId: string }
    | { type: 'session'; sessionId: string }
  source?: { packageId: string; installationId: string; cardId?: string; cardName?: string }
}

type SearchDiagnostics = { diagnostics?: Array<{ resourceId: string; message: string }> }
export type SearchResourcesResult = SearchDiagnostics & { items: GlobalSearchHit[]; nextCursor?: string }
export type SearchScopeOption = {
  kind: 'card' | 'resource' | 'extension'
  id: string
  label: string
  description?: string
  sources?: NonNullable<GlobalSearchHit['source']>[]
}
export type ListGlobalSearchScopesResult = SearchDiagnostics & { items: SearchScopeOption[]; nextCursor?: string }
