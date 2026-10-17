import type { StyleParameterValue } from '@loom-studio/extension-sdk'
import { useStudioLayoutStore } from '../../../shared/studio-shell/studio-layout-store.js'
import { APPEARANCE_DEFAULTS, useAppearanceStore, type AppearanceState } from '../../../shared/studio-shell/appearance-store.js'

/** Native values stay beneath theme defaults; only deliberate user choices enter the final layer. */
export function createAppearanceCss(
  appearance: Pick<AppearanceState, 'canvasWidth' | 'material' | 'explicitOverrides'>,
  uiScale: number,
  uiScaleOverridden: boolean,
): string {
  const overrides: string[] = []
  if (uiScaleOverridden) overrides.push(`--loom-ui-scale:${uiScale / 100};`)
  if (appearance.explicitOverrides.canvasWidth) overrides.push(`--loom-canvas-width:${appearance.canvasWidth}px;`)
  if (appearance.explicitOverrides.blur) overrides.push(`--loom-preview-blur:${appearance.material.blur}px;`)
  if (appearance.explicitOverrides.opacity) overrides.push(`--loom-preview-opacity:${appearance.material.opacity}%;`)
  return `@layer loom-native { :root { --loom-ui-scale:1; --loom-canvas-width:${APPEARANCE_DEFAULTS.canvasWidth}px; --loom-preview-blur:${APPEARANCE_DEFAULTS.material.blur}px; --loom-preview-opacity:${APPEARANCE_DEFAULTS.material.opacity}%; } }
@layer loom-user { :root { ${overrides.join('')} } }`
}

export function isSharedAppearanceParameter(variable: string): boolean {
  return ['--loom-ui-scale', '--loom-canvas-width', '--loom-preview-blur', '--loom-preview-opacity'].includes(variable)
}

export function readSharedAppearanceParameter(variable: string): StyleParameterValue | undefined {
  const appearance = useAppearanceStore.getState()
  const layout = useStudioLayoutStore.getState()
  switch (variable) {
    case '--loom-ui-scale': return layout.uiScaleOverridden ? layout.uiScale / 100 : undefined
    case '--loom-canvas-width': return appearance.explicitOverrides.canvasWidth ? appearance.canvasWidth : undefined
    case '--loom-preview-blur': return appearance.explicitOverrides.blur ? appearance.material.blur : undefined
    case '--loom-preview-opacity': return appearance.explicitOverrides.opacity ? appearance.material.opacity : undefined
    default: return undefined
  }
}

export function setSharedAppearanceParameter(variable: string, value: StyleParameterValue | undefined): boolean {
  if (!isSharedAppearanceParameter(variable)) return false
  if (value !== undefined && typeof value !== 'number') throw new Error(`Shared appearance parameter ${variable} requires a number`)
  const appearance = useAppearanceStore.getState()
  const layout = useStudioLayoutStore.getState()
  switch (variable) {
    case '--loom-ui-scale': value === undefined ? layout.resetUiScale() : layout.setUiScale(value * 100); break
    case '--loom-canvas-width': value === undefined ? appearance.resetCanvasWidth() : appearance.setCanvasWidth(value); break
    case '--loom-preview-blur': appearance.setMaterialParameter('blur', value); break
    case '--loom-preview-opacity': appearance.setMaterialParameter('opacity', value); break
  }
  return true
}
