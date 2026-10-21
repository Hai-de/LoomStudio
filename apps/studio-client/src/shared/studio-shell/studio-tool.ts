import type { StudioPanelId } from './studio-layout-store.js'

export const STUDIO_TOOL_IDS = ['model', 'settings', 'extensions', 'recent'] as const
export type StudioToolId = typeof STUDIO_TOOL_IDS[number]

export function isStudioTool(panel: StudioPanelId | null): panel is StudioToolId {
  return panel === 'model' || panel === 'settings' || panel === 'extensions' || panel === 'recent'
}
