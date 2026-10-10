import { useState } from 'react'
import type { VariableView } from './studio-state-panel.js'

export function useStudioUiState() {
  const [loomScriptRefreshToken, setLoomScriptRefreshToken] = useState(0)
  const [composerHeight, setComposerHeight] = useState(0)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string>()
  const [variableView, setVariableView] = useState<VariableView>('sources')

  return {
    loomScriptRefreshToken,
    bumpLoomScriptRefreshToken: () => setLoomScriptRefreshToken(value => value + 1),
    composerHeight,
    setComposerHeight,
    agentPanelOpen,
    setAgentPanelOpen,
    selectedPresetId,
    setSelectedPresetId,
    variableView,
    setVariableView,
  }
}
