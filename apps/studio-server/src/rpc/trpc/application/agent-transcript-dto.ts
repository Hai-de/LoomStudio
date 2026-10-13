import type { AgentTranscriptEntry } from '@loom-studio/application-data'

// Preserve the explicit projection of measurement data at the wire boundary.
export function agentTranscriptEntryDto(value: AgentTranscriptEntry): AgentTranscriptEntry {
  const entry = value.entry
  if (entry.kind === 'request-measurement') {
    return {
      ...value,
      entry: { ...entry, count: { ...entry.count, basis: { ...entry.count.basis } } },
    }
  }
  return { ...value, entry }
}
