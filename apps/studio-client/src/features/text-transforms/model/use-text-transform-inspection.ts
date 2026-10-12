import { useEffect, useRef, useState } from 'react'
import type { HistorySource, TextPipelineInspection, TextTransformPhase } from '../../../entities/index.js'
import type { StudioApi } from '../../../shared/api/studio-api.js'

export function useTextTransformInspection({ api, scope: inspectionScope, source, phase, consumerAgentSessionId, onRuntimeChanged, setError }: {
  api: StudioApi['textTransforms']
  scope: object
  source?: HistorySource
  phase: TextTransformPhase
  consumerAgentSessionId?: string
  onRuntimeChanged?: () => void
  setError(message: string): void
}) {
  const mountedRef = useRef(true)
  const inspectionScopeRef = useRef(inspectionScope)
  inspectionScopeRef.current = inspectionScope
  const [inspectionResult, setInspection] = useState<TextPipelineInspection>()
  const [storedOverrideVersion, setOverrideVersion] = useState<number>()
  const [storedDisabledRuleIds, setDisabledRuleIds] = useState<string[]>([])
  const [storedOrderedRuleIds, setOrderedRuleIds] = useState<string[]>([])
  const [traceEntryId, setTraceEntryId] = useState('')
  const inspectionRequest = useRef(0)
  const [resultScope, setResultScope] = useState<typeof inspectionScope>()
  const [inspectionTask, setInspectionTask] = useState<typeof inspectionScope>()
  const overrideSaveRef = useRef<typeof inspectionScope | undefined>(undefined)
  const inspection = resultScope === inspectionScope ? inspectionResult : undefined
  const overrideVersion = resultScope === inspectionScope ? storedOverrideVersion : undefined
  const disabledRuleIds = resultScope === inspectionScope ? storedDisabledRuleIds : []
  const orderedRuleIds = resultScope === inspectionScope ? storedOrderedRuleIds : []
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; inspectionRequest.current++ }
  }, [])
  function isCurrentInspection(requestId: number) {
    return mountedRef.current && inspectionScopeRef.current === inspectionScope && inspectionRequest.current === requestId
  }

  useEffect(() => {
    setInspection(undefined)
    setResultScope(undefined)
    setInspectionTask(undefined)
    setTraceEntryId('')
    setError('')
    inspectionRequest.current += 1
  }, [inspectionScope])

  async function inspect(requestedTraceEntryId = resultScope === inspectionScope ? traceEntryId : '') {
    if (!source || !mountedRef.current || inspectionScopeRef.current !== inspectionScope || overrideSaveRef.current === inspectionScope) return
    const requestId = inspectionRequest.current + 1
    inspectionRequest.current = requestId
    setInspection(undefined)
    setResultScope(undefined)
    try {
      setInspectionTask(inspectionScope)
      let result = await api.inspectTextPipeline({ source, phase, ...(consumerAgentSessionId ? { consumerAgentSessionId } : {}), ...(requestedTraceEntryId ? { traceEntryId: requestedTraceEntryId } : {}) })
      if (!isCurrentInspection(requestId)) return
      if (!requestedTraceEntryId) {
        const defaultTraceEntryId = result.snapshot.entries.at(-1)?.id
        if (defaultTraceEntryId) {
          result = await api.inspectTextPipeline({ source, phase, ...(consumerAgentSessionId ? { consumerAgentSessionId } : {}), traceEntryId: defaultTraceEntryId })
          if (!isCurrentInspection(requestId)) return
          requestedTraceEntryId = defaultTraceEntryId
        }
      }
      if (isCurrentInspection(requestId)) {
        const overrideResult = await api.getOverride({ source, phase, ...(consumerAgentSessionId ? { consumerAgentSessionId } : {}) })
        if (!isCurrentInspection(requestId)) return
        setInspection(result)
        setTraceEntryId(requestedTraceEntryId)
        setOverrideVersion(overrideResult.override?.version)
        setDisabledRuleIds(overrideResult.override?.disabledRuleIds ?? [])
        setOrderedRuleIds(overrideResult.override?.orderedRuleIds ?? result.rules.map(rule => rule.id))
        setResultScope(inspectionScope)
        setError('')
      }
    } catch (cause) {
      if (isCurrentInspection(requestId)) setError(readError(cause))
    } finally {
      if (isCurrentInspection(requestId)) setInspectionTask(undefined)
    }
  }

  async function saveOverride(nextDisabled = disabledRuleIds, nextOrder = orderedRuleIds) {
    if (!source || !inspection || !mountedRef.current || inspectionScopeRef.current !== inspectionScope || overrideSaveRef.current === inspectionScope) return
    overrideSaveRef.current = inspectionScope
    const requestId = ++inspectionRequest.current
    try {
      setInspectionTask(inspectionScope)
      const result = await api.upsertOverride({ source, phase, ...(consumerAgentSessionId ? { consumerAgentSessionId } : {}), ...(overrideVersion !== undefined ? { expectedVersion: overrideVersion } : {}), disabledRuleIds: nextDisabled, orderedRuleIds: nextOrder })
      onRuntimeChanged?.()
      if (!isCurrentInspection(requestId)) return
      setOverrideVersion(result.override.version)
      setDisabledRuleIds(result.override.disabledRuleIds)
      setOrderedRuleIds(result.override.orderedRuleIds)
      overrideSaveRef.current = undefined
      await inspect()
    } catch (cause) {
      if (isCurrentInspection(requestId)) setError(readError(cause))
    } finally {
      if (overrideSaveRef.current === inspectionScope) overrideSaveRef.current = undefined
      if (isCurrentInspection(requestId)) setInspectionTask(undefined)
    }
  }

  function selectTraceEntry(id: string) {
    setTraceEntryId(id)
    void inspect(id)
  }

  return { inspection, disabledRuleIds, orderedRuleIds,
    traceEntryId: resultScope === inspectionScope ? traceEntryId : '',
    inspect, saveOverride, selectTraceEntry, busy: inspectionTask === inspectionScope,
  }
}
function readError(value: unknown): string { return value instanceof Error ? value.message : String(value) }
