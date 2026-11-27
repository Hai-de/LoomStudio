/** Presentation inputs only; not a persistence or RPC contract. */
export type DashboardPeriod = '7' | '30' | 'all'
export type DashboardBuiltinView = 'overview' | 'usage' | 'play' | 'resources' | 'storage'
export type DashboardExtensionView = `extension:${string}`
export type DashboardView = DashboardBuiltinView | DashboardExtensionView
export type DashboardViewItem = { id: DashboardView; label: string }
export function isDashboardExtensionView(view: DashboardView): view is DashboardExtensionView {
  return view.startsWith('extension:')
}
export type DashboardTone = 'accent' | 'info' | 'success' | 'warning' | 'pink' | 'muted' | 'cyan'

export type UsageRow = {
  id: string
  provider: string
  model: string
  total?: number
  providerProfileId?: string
  totalReported?: number
  inputReported?: number
  outputReported?: number
  input: number
  output: number
  requests: number
  unreported: number
  tone: DashboardTone
}
export type UsageSlice = {
  id: string
  name: string
  provider: string
  total: number
  color: string
}
export type UsageDay = {
  total?: number
  date: string
  input: number
  output: number
  requests: number
  slices?: UsageSlice[]
  modelSlices?: UsageSlice[]
  providerSlices?: UsageSlice[]
}
export type PlayRow = {
  canOpen?: boolean
  id: string
  name: string
  subtitle: string
  tone: DashboardTone
  sends: number
  activeDays: number
  stories: Array<{ id: string; name: string; sends: number; updated: string }>
}
export type StorageGroup = {
  id: string
  name: string
  description: string
  tone: DashboardTone
  bytes: number
  action: string
  items: Array<{ name: string; description?: string; bytes: number; count?: number }>
}
export type DashboardSnapshot = {
  ready?: boolean
  rangeLabel: string
  usage: UsageRow[]
  days: UsageDay[]
  play: PlayRow[]
  storage: StorageGroup[]
  storageUpdatedAt: string
  diskFreeBytes?: number
  resources?: Array<{ id: string; label: string; count: number; unit: string; detail?: string }>
  collectionStartedAt?: string
  notices?: string[]
}
export type DashboardAction = { kind: 'calls' | 'provider' | 'story' | 'card' | 'storage' | 'resource'; id: string; label: string }
