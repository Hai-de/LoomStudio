import { useState } from 'react'
import type { CardDirectoryCatalog } from '@loom-studio/shared'

export function useCardDirectoryDiscovery(directoryApi: { scan(): Promise<CardDirectoryCatalog> } | undefined, onRefreshCards?: () => Promise<unknown>) {
  const [discovered, setDiscovered] = useState<CardDirectoryCatalog>()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  async function refreshGallery() {
    setRefreshing(true)
    setRefreshError('')
    try {
      await onRefreshCards?.()
      const catalog = await directoryApi!.scan()
      if (catalog.error) throw new Error(catalog.error)
      setDiscovered(catalog.entries.some(entry => !entry.registeredCardId) ? catalog : undefined)
    } catch (cause) { setRefreshError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setRefreshing(false) }
  }
  return { discovered, closeDiscovery: () => setDiscovered(undefined), refreshing, refreshError, refreshGallery }
}
