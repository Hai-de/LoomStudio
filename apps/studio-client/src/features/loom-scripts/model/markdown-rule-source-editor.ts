import {
  joinMarkdownRuleSource,
  splitMarkdownRuleSource,
  type MarkdownRuleSourceParts,
} from '@loom-studio/shared/loom-scripts'

export const REPLACEMENT_AUTO_COLLAPSE_CHARS = 8_000
export const REPLACEMENT_AUTO_COLLAPSE_LINES = 200

/**
 * The closing `---` must remain on its own line. Hide the otherwise synthetic final
 * empty line from CodeMirror and restore that line break when joining the source again.
 */
export function editableFrontmatter(parts: MarkdownRuleSourceParts): string {
  return parts.frontmatter.replace(/\r?\n$/, '')
}

export function joinEditableFrontmatter(source: string, frontmatter: string): string {
  const parts = splitMarkdownRuleSource(source)
  if (!parts) return source
  const lineEnding = readTrailingLineEnding(parts.frontmatter)
    ?? readTrailingLineEnding(parts.openingDelimiter)
    ?? '\n'
  return joinMarkdownRuleSource({
    ...parts,
    frontmatter: frontmatter.length === 0 ? '' : `${frontmatter}${lineEnding}`,
  })
}

export function replacementStats(body: string): { characters: number; lines: number } {
  return { characters: body.length, lines: body.length === 0 ? 1 : body.split(/\r\n|\r|\n/).length }
}

export function shouldAutoCollapseReplacement(body: string): boolean {
  const stats = replacementStats(body)
  return stats.characters > REPLACEMENT_AUTO_COLLAPSE_CHARS || stats.lines > REPLACEMENT_AUTO_COLLAPSE_LINES
}

function readTrailingLineEnding(value: string): '\r\n' | '\n' | undefined {
  if (value.endsWith('\r\n')) return '\r\n'
  if (value.endsWith('\n')) return '\n'
  return undefined
}
