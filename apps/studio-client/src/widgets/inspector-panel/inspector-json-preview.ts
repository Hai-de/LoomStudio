const MAX_NODES = 300
const MAX_DEPTH = 6
const MAX_ITEMS = 40
const MAX_STRING_LENGTH = 2000
const MAX_TEXT_LENGTH = 24000

/** Bound traversal before serialization: slicing a full JSON.stringify result is too late. */
export function buildInspectorJsonPreview(value: unknown): { text: string; truncated: boolean } {
  let nodes = 0
  let textBudget = 12000
  let truncated = false

  function shorten(text: string): string {
    const length = Math.min(MAX_STRING_LENGTH, textBudget)
    textBudget -= Math.min(text.length, length)
    if (text.length <= length) return text
    truncated = true
    return `${text.slice(0, length)}…`
  }

  function visit(input: unknown, depth: number): unknown {
    nodes += 1
    if (typeof input === 'string') return shorten(input)
    if (input === null || typeof input !== 'object') return input
    if (depth >= MAX_DEPTH) {
      truncated = true
      return '…'
    }
    if (Array.isArray(input)) {
      const result: unknown[] = []
      for (let index = 0; index < input.length; index += 1) {
        if (index >= MAX_ITEMS || nodes >= MAX_NODES || textBudget <= 0) {
          truncated = true
          result.push('…')
          break
        }
        result.push(visit(input[index], depth + 1))
      }
      return result
    }
    const result: Record<string, unknown> = Object.create(null)
    let count = 0
    for (const key in input) {
      if (!Object.hasOwn(input, key)) continue
      if (count >= MAX_ITEMS || nodes >= MAX_NODES || textBudget <= 0) {
        truncated = true
        break
      }
      count += 1
      result[shorten(key)] = visit((input as Record<string, unknown>)[key], depth + 1)
    }
    return result
  }

  const text = JSON.stringify(visit(value ?? null, 0), null, 2) ?? 'null'
  if (text.length > MAX_TEXT_LENGTH) return { text: `${text.slice(0, MAX_TEXT_LENGTH)}…`, truncated: true }
  return { text, truncated }
}
