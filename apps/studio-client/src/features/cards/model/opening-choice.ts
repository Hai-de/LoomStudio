import type { Card } from '../../../entities/card.js'

export type OpeningChoice =
  | { kind: 'card'; index: number }
  | { kind: 'custom'; content: string }
  | { kind: 'empty' }

export function openingChoiceRequest(choice: OpeningChoice) {
  if (choice.kind === 'card') return { openingIndex: choice.index }
  return { openingNodes: choice.kind === 'empty' || !choice.content.trim() ? [] : [{ content: choice.content }] }
}

export function openingChoiceText(opening: Card['opening'], choice: OpeningChoice): string {
  if (choice.kind === 'empty') return ''
  if (choice.kind === 'custom') return choice.content
  const entries = choice.index === 0 ? opening.entries : opening.alternatives?.[choice.index - 1]?.entries
  return entries?.map(entry => entry.content).join('\n\n') ?? ''
}
