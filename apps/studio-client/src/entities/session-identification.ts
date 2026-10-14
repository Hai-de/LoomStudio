import type { AgentPreset, AgentSession, CardSummary, NarrativeTimeline } from './index.js'
import type { Translator } from '../shared/i18n/index.js'

export function timelineCharacterName(timeline: NarrativeTimeline, cards: readonly CardSummary[], t: Translator): string {
  if (!timeline.createdFrom) return t('sessions.freeNarrative')
  return cards.find(card => card.id === timeline.createdFrom?.cardId)?.name ?? t('sessions.characterUnavailable')
}

export function sessionPresetName(session: AgentSession, presets: readonly AgentPreset[], t: Translator): string {
  return presets.find(preset => preset.id === session.agentPresetId)?.rootNode.label ?? t('sessions.presetUnavailable')
}

export function sessionSourceLabel(session: AgentSession, timelines: readonly NarrativeTimeline[], cards: readonly CardSummary[], t: Translator): string {
  if (!session.timelineId) return t('sessions.standalone')
  const timeline = timelines.find(item => item.id === session.timelineId)
  if (!timeline) return t('sessions.timelineUnavailable')
  return `${timelineCharacterName(timeline, cards, t)} · ${timeline.title || t('sessions.untitledTimeline')}`
}
