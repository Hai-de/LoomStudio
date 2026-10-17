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
  readonly narrativeSource?: Readonly<{
    timelineId: string
    branchId: string
    nodeId?: string
    groupId?: string
    candidateId?: string
    generation?: number
  }>
}
