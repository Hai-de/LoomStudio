import { describe, expect, it, vi } from 'vitest'
import { decideAgentApproval, mutationApprovalScope, parseAgentApprovalPolicy } from '../../../packages/application-runtime/src/agents/approval-policy.js'

describe('Agent approval policy', () => {
  it('keeps asking by default and rejects missing approval handlers', async () => {
    const ask = vi.fn(async () => ({ decision: 'allow' as const }))
    expect(await decideAgentApproval(undefined, 'workspaceWrite', ask)).toEqual({ decision: 'allow' })
    expect(ask).toHaveBeenCalledOnce()
    expect(await decideAgentApproval(undefined, 'workspaceWrite')).toMatchObject({ decision: 'deny' })
  })
  it.each(['workspaceWrite', 'resourceWrite', 'stateWrite', 'narrativeWrite', 'historyRead', 'authorMode'] as const)('enforces independent allow/deny for %s', async scope => {
    const ask = vi.fn(async () => ({ decision: 'allow' as const }))
    expect(await decideAgentApproval({ [scope]: 'allow' }, scope, ask)).toMatchObject({ decision: 'allow' })
    expect(await decideAgentApproval({ [scope]: 'deny' }, scope, ask)).toMatchObject({ decision: 'deny' })
    expect(ask).not.toHaveBeenCalled()
  })
  it.each([null, [], { unknown: 'allow' }, { workspaceWrite: true }, { historyRead: 'always' }])('rejects invalid policy %j', value => {
    expect(() => parseAgentApprovalPolicy(value)).toThrow('Invalid Agent approval policy')
  })
  it('distinguishes author-mode escalation from resource mutation approval', () => {
    expect(mutationApprovalScope({ action: 'author-mode', kind: 'prompt-resource', path: '/', before: '', after: '' })).toBe('authorMode')
    expect(mutationApprovalScope({ action: 'patch', kind: 'prompt-resource', path: '/', before: '', after: '' })).toBe('resourceWrite')
  })
})
