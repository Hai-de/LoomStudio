export type ExtensionTimelineLease = {
  timelineId: string
  installationId: string
  installationVersion: number
  generation: string
}

export type ExtensionTimelineTarget = {
  scope: 'timeline'
  timelineId: string
  branchId: string
}

export type ExtensionTimelineExecution = {
  target: Readonly<ExtensionTimelineTarget>
  signal: AbortSignal
}
