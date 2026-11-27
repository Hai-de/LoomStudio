import { useMemo, useSyncExternalStore } from 'react'
import { rendererContributionKey } from '../shared/extension-renderer-runtime/renderer-registry.js'
import type { ClientRendererHost } from '../shared/extension-renderer-runtime/client-renderer-host.js'
import type { DashboardExtensionView } from '../widgets/dashboard/dashboard-view.js'

export type StatisticsExtensionPage = {
  id: DashboardExtensionView
  label: string
  contributionKey: string
  packageId: string
}

const noopSubscribe = () => () => {}

export function useStatisticsExtensionPages(host?: ClientRendererHost): StatisticsExtensionPage[] {
  const revision = useSyncExternalStore(
    host?.subscribe ?? noopSubscribe,
    host?.renderRevision ?? (() => 0),
    host?.renderRevision ?? (() => 0),
  )
  return useMemo(() => {
    if (!host) return []
    return host.list('statistics.page')
      .filter(registration => registration.definition.instanceScope === 'workspace')
      .map(registration => {
        const contributionKey = rendererContributionKey(registration)
        return {
          id: `extension:${contributionKey}`,
          label: registration.definition.name,
          contributionKey,
          packageId: registration.owner.kind === 'extension' ? registration.owner.packageId : '',
        }
      })
  }, [host, revision])
}
