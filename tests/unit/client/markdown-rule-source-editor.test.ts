import { describe, expect, it } from 'vitest'
import { splitMarkdownRuleSource } from '@loom-studio/shared/loom-scripts'
import {
  REPLACEMENT_AUTO_COLLAPSE_CHARS,
  editableFrontmatter,
  joinEditableFrontmatter,
  replacementStats,
  shouldAutoCollapseReplacement,
} from '../../../apps/studio-client/src/features/loom-scripts/model/markdown-rule-source-editor.js'

const source = "---\nid: example.rule\nname: 示例\nregex: 'x'\n---\n<body>替换正文</body>\n"

describe('Markdown rule source editor model', () => {
  it('hides the synthetic trailing frontmatter newline while preserving an exact round trip', () => {
    const parts = splitMarkdownRuleSource(source)!
    const editable = editableFrontmatter(parts)
    expect(editable.endsWith('\n')).toBe(false)
    expect(joinEditableFrontmatter(source, editable)).toBe(source)
  })

  it('restores the required newline after edits so the closing delimiter cannot attach to the last field', () => {
    const edited = joinEditableFrontmatter(source, "id: example.rule\nname: 改名\nregex: 'x'")
    expect(edited).toContain("regex: 'x'\n---\n")
    expect(edited).not.toContain("regex: 'x'---")
    expect(splitMarkdownRuleSource(edited)?.body).toBe('<body>替换正文</body>\n')
  })

  it('preserves intentional blank lines and an empty frontmatter', () => {
    const blankSource = source.replace("regex: 'x'\n---", "regex: 'x'\n\n---")
    const parts = splitMarkdownRuleSource(blankSource)!
    const editable = editableFrontmatter(parts)
    expect(editable.endsWith('\n')).toBe(true)
    expect(joinEditableFrontmatter(blankSource, editable)).toBe(blankSource)
    const empty = '---\n---\nbody'
    expect(joinEditableFrontmatter(empty, '')).toBe(empty)
  })

  it('collapses only replacement bodies above the size thresholds', () => {
    expect(shouldAutoCollapseReplacement('short')).toBe(false)
    expect(shouldAutoCollapseReplacement('x'.repeat(REPLACEMENT_AUTO_COLLAPSE_CHARS + 1))).toBe(true)
    expect(shouldAutoCollapseReplacement(Array.from({ length: 201 }, () => 'x').join('\n'))).toBe(true)
    expect(replacementStats('a\nb\n')).toEqual({ characters: 4, lines: 3 })
  })
})
