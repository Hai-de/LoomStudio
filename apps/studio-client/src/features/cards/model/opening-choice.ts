import type { Card } from '../../../entities/card.js'

export type OpeningChoice =
  | { kind: 'card'; id: string }
  | { kind: 'custom'; content: string }
  | { kind: 'empty' }

export function openingChoiceRequest(choice: OpeningChoice) {
  if (choice.kind === 'card') return { openingId: choice.id }
  return { openingContent: choice.kind === 'empty' ? '' : choice.content }
}

export function openingChoiceText(opening: Card['opening'], choice: OpeningChoice): string {
  if (choice.kind === 'empty') return ''
  if (choice.kind === 'custom') return choice.content
  return (opening.id === choice.id ? opening : opening.alternatives?.find(candidate => candidate.id === choice.id))?.content ?? ''
}
