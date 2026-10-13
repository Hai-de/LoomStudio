import { listGlobalSearchScopesInputSchema, searchResourcesInputSchema } from '@loom-studio/shared'
import { procedure } from '../context.js'

export const searchProcedures = {
  searchResources: procedure.input(searchResourcesInputSchema)
    .query(({ ctx, input }) => ctx.runtime.searchResources(input)),
  listGlobalSearchScopes: procedure.input(listGlobalSearchScopesInputSchema)
    .query(({ ctx, input }) => ctx.runtime.listGlobalSearchScopes(input)),
}
