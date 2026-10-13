import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListExtensionInstallationsResult, PresetToolMount, PromptResource, LoreMount } from '../../../entities/index.js'
import type { StudioApi } from '../../../shared/api/studio-api.js'

type PromptResourceStateInput = {
  api: StudioApi
  endpoint: string
}

const EMPTY_PRESET_TOOL_MOUNTS: PresetToolMount[] = []
const EMPTY_PROMPT_RESOURCES: PromptResource[] = []
const EMPTY_LORE_MOUNTS: LoreMount[] = []
const EMPTY_INSTALLATIONS: ListExtensionInstallationsResult['installations'] = []

export function usePromptResourceState(input: PromptResourceStateInput) {
  const queryClient = useQueryClient()
  const resourcesKey = ['prompt-resources', input.endpoint, 'resources'] as const
  const installationsKey = ['prompt-resources', input.endpoint, 'installations'] as const
  const installationsQuery = useQuery({
    queryKey: installationsKey,
    queryFn: async () => (await input.api.extensionInstallations.list()).installations,
  })
  const loreMountsKey = ['prompt-resources', input.endpoint, 'lore-mounts'] as const
  const presetToolMountsKey = ['prompt-resources', input.endpoint, 'preset-tool-mounts'] as const
  const resourcesQuery = useQuery({
    queryKey: resourcesKey,
    retry: false,
    queryFn: async () => (await input.api.promptResources.list()).resources,
  })
  const loreMountsQuery = useQuery({
    queryKey: loreMountsKey,
    queryFn: async () => (await input.api.promptResources.listLoreMounts()).mounts,
  })
  const presetToolMountsQuery = useQuery({
    queryKey: presetToolMountsKey,
    queryFn: async () => (await input.api.promptResources.listPresetToolMounts()).mounts,
  })

  async function invalidate(areas: {
    bindings?: boolean
    presetToolMounts?: boolean
    resources?: boolean
    loreMounts?: boolean
  }): Promise<void> {
    const invalidations: Promise<unknown>[] = []
    if (areas.bindings || areas.resources || areas.loreMounts) {
      invalidations.push(queryClient.invalidateQueries({ queryKey: ['prompt-resources', input.endpoint, 'bindings'] }))
    }
    if (areas.resources) invalidations.push(
      queryClient.invalidateQueries({ exact: true, queryKey: resourcesKey }),
      queryClient.invalidateQueries({ exact: true, queryKey: installationsKey }),
    )
    if (areas.loreMounts) invalidations.push(queryClient.invalidateQueries({ exact: true, queryKey: loreMountsKey }))
    if (areas.presetToolMounts) invalidations.push(queryClient.invalidateQueries({ exact: true, queryKey: presetToolMountsKey }))
    await Promise.all(invalidations)
  }

  return {
    error: resourcesQuery.error ?? installationsQuery.error ?? loreMountsQuery.error ?? presetToolMountsQuery.error,
    loading: resourcesQuery.isPending || installationsQuery.isPending || loreMountsQuery.isPending || presetToolMountsQuery.isPending,
    resourcesReady: resourcesQuery.isSuccess,
    resourcesError: resourcesQuery.error,
    readResources: () => queryClient.getQueryData<PromptResource[]>(resourcesKey) ?? EMPTY_PROMPT_RESOURCES,
    extensionInstallations: installationsQuery.data ?? EMPTY_INSTALLATIONS,
    presetToolMounts: presetToolMountsQuery.data ?? EMPTY_PRESET_TOOL_MOUNTS,
    promptResources: resourcesQuery.data ?? EMPTY_PROMPT_RESOURCES,
    loreMounts: loreMountsQuery.data ?? EMPTY_LORE_MOUNTS,
    invalidate,
    refreshPresetToolMounts: async () => readRefetchResult(await presetToolMountsQuery.refetch()),
    refreshPromptResourceLibrary: async () => {
      const [resources, installations] = await Promise.all([resourcesQuery.refetch(), installationsQuery.refetch()])
      readRefetchResult(installations)
      await queryClient.invalidateQueries({ queryKey: ['prompt-resources', input.endpoint, 'bindings'] })
      return readRefetchResult(resources)
    },
    refreshPromptResource: async (resourceId: string) => {
      const { resource } = await input.api.promptResources.get(resourceId)
      void queryClient.cancelQueries({ exact: true, queryKey: resourcesKey })
      queryClient.setQueryData<PromptResource[]>(resourcesKey, current => (current ?? []).map(item =>
        item.id === resource.id && item.version <= resource.version ? resource : item,
      ))
      return queryClient.getQueryData<PromptResource[]>(resourcesKey)?.find(item => item.id === resourceId)
    },
    refreshLoreMounts: async () => readRefetchResult(await loreMountsQuery.refetch()),
    setPresetToolMounts: (update: (current: PresetToolMount[]) => PresetToolMount[]) => {
      void queryClient.cancelQueries({ exact: true, queryKey: presetToolMountsKey })
      queryClient.setQueryData<PresetToolMount[]>(presetToolMountsKey, current => update(current ?? []))
    },
    setPromptResources: (update: (current: PromptResource[]) => PromptResource[]) => {
      void queryClient.cancelQueries({ exact: true, queryKey: resourcesKey })
      queryClient.setQueryData<PromptResource[]>(resourcesKey, current => update(current ?? []))
    },
    setLoreMounts: (update: (current: LoreMount[]) => LoreMount[]) => {
      void queryClient.cancelQueries({ exact: true, queryKey: loreMountsKey })
      queryClient.setQueryData<LoreMount[]>(loreMountsKey, current => update(current ?? []))
    },
  }
}

function readRefetchResult<T>(result: { data?: T[]; error: Error | null }): T[] {
  if (result.error) throw result.error
  return result.data ?? []
}
