import type { JsonObject, MutationReceipt } from './common.js'

export type CardStateTemplate = {
  id: string
  templateVersion: number
  schema: JsonObject
  initial: JsonObject
  componentKey?: string
  targetEntityTypeIds?: string[]
  label?: string
}

type StateEntityType = {
  id: string
  collectionPath: string
  label?: string
}

type StateEntityId = {
  typeId: string
  entityId: string
}

type TimelineComponentMount = {
  templateId: string
  templateVersion: number
  componentKey: string
  target:
    | { kind: 'entity'; entity: StateEntityId }
    | { kind: 'entity-type'; typeId: string }
  initial?: JsonObject
}

export type Card = {
  artifactId: string
  derivedFrom?: { artifactId: string }
  macros?: Record<string, string>
  macroOptions?: import("@loom-studio/shared").MacroOptions
  id: string
  version: number
  name: string
  userName?: string
  description?: string
  importBundleId?: string
  portableExtensionPayloadIds?: string[]
  extensionPackages?: Array<{ packageId: string; version: string; blobId: string }>
  promptResourceIds?: string[]
  externalPromptResourceIds?: string[]
  stateTemplates?: CardStateTemplate[]
  stateDefinitionIds?: string[]
  stateEntityTypes?: StateEntityType[]
  timelineStateEntities?: StateEntityId[]
  timelineComponentMounts?: TimelineComponentMount[]
  stateContributionIds?: string[]
  extensionAdoptions?: Array<{ packageId: string; target: 'global' | 'card' }>
  timelineStateBindings?: Array<{ path: string; templateId: string; templateVersion: number; initial?: JsonObject }>
  media?: CardMedia
  preset?: {
    system?: string
  }
  opening: {
    id: string
    title?: string
    content: string
    alternatives?: Array<{ id: string; title?: string; content: string }>
  }
  lore: {
    entries: Array<{
      id?: string
      path?: string
      title?: string
      content: string
      enabled?: boolean
      activation?: import('./context-asset.js').PromptActivationCapability
      tags?: string[]
    }>
  }
  createdAt: string
  updatedAt: string
}

export type CardMedia = {
  avatarAssetId?: string
  coverAssetId?: string
}

export type CardSummary = Pick<Card,
  'id' | 'artifactId' | 'derivedFrom' | 'version' | 'name' | 'userName' | 'description' | 'media' | 'createdAt' | 'updatedAt'
> & { openingPreview?: string; validationError?: string }

export type CardPresetInput = {
  system?: string
}

export type OpeningChatInput = {
  id?: string
  title?: string
  content: string
  alternatives?: Array<{ id?: string; title?: string; content: string }>
}

export type LoreInput = {
  entries?: Array<{
    id?: string
    path?: string
    title?: string
    content: string
    enabled?: boolean
    activation?: import('./context-asset.js').PromptActivationCapability
    tags?: string[]
  }>
}

export type CreateCardResult = {
  card: Card
  mutation: MutationReceipt
}

export type ListCardsResult = {
  cards: CardSummary[]
  nextCursor?: string
}

export type GetCardResult = {
  card: Card
}

export type UpdateCardResult = {
  card: Card
  mutation: MutationReceipt
}

export type DeleteCardResult = {
  deleted: true
  mutation: MutationReceipt
}

export type DeleteCardsResult = DeleteCardResult & {
  cardIds: string[]
}

export type PreviewCardDeletionResult = {
  cardId: string
  timelines: Array<{ id: string; title?: string }>
  extensionData: {
    cardScoped: { configs: number; records: number }
    timelineScoped: { configs: number; records: number }
  }
  textTransformRuleIds: string[]
}
