import type { ChatMessage } from '@loom-studio/shared'
import type { GatewayChatResult } from '../types.js'
import type { ToolDefinition, ToolInvocation, ToolResult } from './tool-registry.js'
import type { CompiledToolExposure } from './tool-prompt-build.js'
import { projectHistoryEntries, type TextTransformRuleEntry } from '../transforms/history-text.js'
import { codeActToolIds } from './codeact/prompts.js'
import { createLoomContentScannerState, finishLoomContentScan, pushLoomContentChunk, renderLoomContentToolResult } from './content-transport.js'
import { renderToolResult } from './tool-result-text.js'

type ResponseTool = {
  definition: Pick<ToolDefinition, 'id' | 'name' | 'input'>
  transport: CompiledToolExposure['transport']
}

/** Decode only: execution and transcript/checkpoint ordering belong to the loop. */
export function decodeToolResponse<T extends ResponseTool>({
  providerResult, sessionId, classificationRules, byExposedName, contentTools, createInvocationId,
}: {
  providerResult: GatewayChatResult
  sessionId: string
  classificationRules: TextTransformRuleEntry[]
  byExposedName: ReadonlyMap<string, T>
  contentTools: readonly T[]
  createInvocationId(): string
}) {
  const toolCalls = providerResult.message.tool_calls ?? []
  const nativeInvocationPairs = toolCalls.map((call) => {
    const resolved = byExposedName.get(call.function.name)
    const invocation: ToolInvocation = {
      id: createInvocationId(),
      toolId: resolved?.definition.id ?? `unresolved/${call.function.name}`,
      arguments: parseToolArguments(
        call.function.arguments,
        call.function.name,
      ),
      transport: 'native-function',
      ...(providerResult.providerCallId
        ? { providerCallId: providerResult.providerCallId }
        : {}),
      providerItemId: call.id,
    }
    return { call, invocation, resolved, transport: 'native-function' as const }
  })
  const classified = classifyAssistantContent(
    providerResult.message.content ?? '',
    sessionId,
    classificationRules,
  )
  const contentScan = classified.text
    ? scanContentTools(
        classified.text,
        contentTools.map((tool) => tool.definition.name),
      )
    : { text: '', invocations: [] }
  const codeActContentNames = new Set(contentTools
    .filter(tool => codeActToolIds.has(tool.definition.id))
    .map(tool => tool.definition.name))
  const rawCodeActCalls = contentScan.invocations.some(call => codeActContentNames.has(call.name))
    ? scanContentTools(
        providerResult.message.content ?? '',
        contentTools.map(tool => tool.definition.name),
      ).invocations.filter(call => codeActContentNames.has(call.name))
    : []
  let codeActContentIndex = 0
  if (nativeInvocationPairs.length && contentScan.invocations.length)
    throw new Error(
      'Provider emitted native and content tool calls in the same Step',
    )
  const contentInvocationPairs = contentScan.invocations.map((parsed) => {
    const resolved = byExposedName.get(parsed.name)
    const invocation: ToolInvocation = {
      id: createInvocationId(),
      toolId: resolved?.definition.id ?? `unresolved/${parsed.name}`,
      // The content envelope requires metadata even when a freeform tool has no arguments.
      arguments: resolved?.definition.input.kind === 'freeform' && Object.keys(parsed.metadata).length === 0
        ? undefined
        : parsed.metadata,
      rawInput: parsed.content,
      transport: 'content',
      ...(providerResult.providerCallId
        ? { providerCallId: providerResult.providerCallId }
        : {}),
    }
    return {
      invocation,
      resolved,
      exposedName: parsed.name,
      transport: 'content' as const,
      sourceChanged: codeActContentNames.has(parsed.name)
        && rawCodeActCalls[codeActContentIndex++]?.content !== parsed.content,
    }
  })
  const invocationPairs = [
    ...nativeInvocationPairs,
    ...contentInvocationPairs,
  ]
  return { classified, contentScan, invocationPairs }
}

/** Native and content transports use the same encoding in live and recovery messages. */
export function encodeToolResultMessage(
  target: { transport: 'native-function'; call: { id: string } } | { transport: 'content'; exposedName: string },
  result: ToolResult,
): ChatMessage {
  if (target.transport === 'native-function') {
    return { role: 'tool', tool_call_id: target.call.id, content: renderToolResult(result) }
  }
  return {
    role: 'user',
    content: renderLoomContentToolResult({
      invocationId: result.invocationId,
      name: target.exposedName,
      status: result.status === 'completed' ? 'completed' : 'failed',
      content: renderToolResult(result),
    }),
  }
}

export function classifyAssistantContent(
  content: string,
  sessionId: string,
  rules: TextTransformRuleEntry[],
) {
  if (!content || rules.length === 0) return { text: content, reasoning: [] as import('../transforms/history-text.js').PromotedReasoningPart[] }
  const snapshot = projectHistoryEntries({
    source: { kind: 'agent-session', sessionId },
    phase: 'classify',
    entries: [{
      id: 'provider.current.assistant-content',
      source: { kind: 'agent-session', sessionId },
      role: 'assistant',
      text: content,
      sequence: 1,
    }],
    rules,
  })
  const entry = snapshot.entries[0]
  return { text: entry?.text ?? content, reasoning: entry?.promotedReasoning ?? [] }
}

export function scanContentTools(content: string, knownToolNames: string[]) {
  const options = { knownToolNames }
  const pushed = pushLoomContentChunk(
    createLoomContentScannerState(),
    content,
    options,
  )
  const finished = finishLoomContentScan(pushed.state, options)
  if (finished.result.status === 'failed')
    throw new Error(
      finished.result.error?.message ?? 'Content tool response is invalid',
    )
  return finished.result
}

function parseToolArguments(value: string, toolName: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      throw new Error()
    return parsed as Record<string, import('@loom-studio/shared').JsonValue>
  } catch {
    throw new Error(
      `Provider tool arguments are invalid JSON object: ${toolName}`,
    )
  }
}
