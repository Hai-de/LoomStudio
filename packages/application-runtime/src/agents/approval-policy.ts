import type { VfsMutationDecision, VfsMutationPreview } from '../vfs/types.js'

export type AgentApprovalMode = 'ask' | 'allow' | 'deny'
export type AgentApprovalScope = 'workspaceWrite' | 'resourceWrite' | 'stateWrite' | 'narrativeWrite' | 'historyRead' | 'authorMode'
export type AgentApprovalPolicy = Partial<Record<AgentApprovalScope, AgentApprovalMode>>
const scopes: AgentApprovalScope[] = ['workspaceWrite', 'resourceWrite', 'stateWrite', 'narrativeWrite', 'historyRead', 'authorMode']

export function parseAgentApprovalPolicy(value: unknown): AgentApprovalPolicy | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Agent approval policy')
  const policy: AgentApprovalPolicy = {}
  for (const [key, mode] of Object.entries(value)) {
    const scope = scopes.find(item => item === key)
    if (!scope || (mode !== 'ask' && mode !== 'allow' && mode !== 'deny')) throw new Error('Invalid Agent approval policy')
    policy[scope] = mode
  }
  return policy
}

export function mutationApprovalScope(preview: VfsMutationPreview): AgentApprovalScope {
  if (preview.action === 'author-mode') return 'authorMode'
  switch (preview.kind) {
    case 'workspace': return 'workspaceWrite'
    case 'prompt-resource': return 'resourceWrite'
    case 'state': return 'stateWrite'
    case 'narrative': return 'narrativeWrite'
  }
}

export async function decideAgentApproval(policy: AgentApprovalPolicy | undefined, scope: AgentApprovalScope,
  ask?: () => Promise<VfsMutationDecision>): Promise<VfsMutationDecision> {
  const mode = policy?.[scope] ?? 'ask'
  if (mode === 'allow') return { decision: 'allow' }
  if (mode === 'deny') return { decision: 'deny', reason: `The Agent Preset forbids ${scope}.` }
  if (!ask) return { decision: 'deny', reason: 'User approval is required, but no approval handler is available.' }
  return ask()
}
