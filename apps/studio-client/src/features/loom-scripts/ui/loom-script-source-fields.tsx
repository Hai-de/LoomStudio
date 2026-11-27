import { Button, IconButton } from '@loom-studio/ui'
import {
  joinMarkdownRuleSource,
  parseLoomScriptSource,
  resolveLoomScriptSettings,
  resolveTextExtractorContribution,
  resolveTextTransformContributionRule,
  splitMarkdownRuleSource,
} from '@loom-studio/shared/loom-scripts'
import { ArrowDownToLine, ArrowUpToLine, Maximize2, Minimize2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useCopyFeedback } from '../../../shared/hooks/use-copy-feedback.js'
import { LongTextEditor, type LongTextEditorHandle } from '../../../shared/ui/long-text-editor/long-text-editor.js'
import type { Translator } from '../../../shared/i18n/index.js'
import {
  editableFrontmatter,
  joinEditableFrontmatter,
  replacementStats,
  shouldAutoCollapseReplacement,
} from '../model/markdown-rule-source-editor.js'
import { defaultScriptPreviewSource, type ScriptPreviewSource } from '../model/script-preview-source.js'
import styles from './loom-script-source-fields.module.scss'

export type ScriptPreviewInput = { source: string; text: string; phase: 'display' | 'prompt' | 'classify'; previewSource: ScriptPreviewSource; streaming?: boolean }
export type ScriptPreviewResult = {
  output: string
  matches: Array<{ ruleId: string; match: string }>
  diagnostics: Array<{ message: string }>
  extractions?: Array<{ extractorId: string; values: unknown[]; diagnostics: Array<{ message: string }> }>
}

const DECLARATION_EDITOR_HEIGHT = 'clamp(180px, 28dvh, 300px)'
const SOURCE_EDITOR_HEIGHT = 'clamp(300px, 44dvh, 520px)'
const SOURCE_EDITOR_EXPANDED_HEIGHT = 'clamp(420px, 72dvh, 840px)'

function localizedPhases(phases: readonly ('classify' | 'prompt' | 'display')[], t: Translator): string {
  return phases.map(phase => t(phase === 'classify'
    ? 'textTransform.phase.classify'
    : phase === 'prompt' ? 'textTransform.phase.prompt' : 'textTransform.phase.display')).join(' / ')
}

export function LoomScriptSourceFields(props: {
  fileName: string
  source: string
  disabled?: boolean
  previewContext?: ScriptPreviewSource
  onFileNameChange(value: string): void
  onSourceChange(value: string): void
  onPreview?(input: ScriptPreviewInput): Promise<ScriptPreviewResult>
  t: Translator
}) {
  const editorRef = useRef<LongTextEditorHandle>(null)
  const bodyEditorRef = useRef<LongTextEditorHandle>(null)
  const sourceRef = useRef(props.source)
  sourceRef.current = props.source
  const requestRef = useRef(0)
  const [sample, setSample] = useState('')
  const [phase, setPhase] = useState<ScriptPreviewInput['phase']>('display')
  const [selectedSource, setSelectedSource] = useState<ScriptPreviewSource>()
  const [replacementCollapsed, setReplacementCollapsed] = useState(() => {
    const parts = splitMarkdownRuleSource(props.source)
    return Boolean(parts && shouldAutoCollapseReplacement(parts.body))
  })
  const [editorExpanded, setEditorExpanded] = useState(false)
  const { feedback: fullCopyFeedback, copy: copyFullSource } = useCopyFeedback()
  const defaultSource = useMemo(() => defaultScriptPreviewSource(props.source, props.previewContext), [props.source, props.previewContext])
  const previewSource = selectedSource ?? defaultSource
  const [streaming, setStreaming] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ source: string; text: string; phase: string; previewSource: ScriptPreviewSource; streaming?: boolean; value?: ScriptPreviewResult; error?: string }>()
  const parsed = useMemo(() => {
    try { return { metadata: parseLoomScriptSource(props.source) } }
    catch (cause) { return { error: cause instanceof Error ? cause.message : String(cause) } }
  }, [props.source])
  const rules = parsed.metadata?.contributions.filter(contribution => contribution.kind !== 'renderer') ?? []
  const markdownParts = useMemo(() => props.fileName.toLowerCase().endsWith('.md')
    ? splitMarkdownRuleSource(props.source)
    : undefined, [props.fileName, props.source])
  const currentResult = result?.source === props.source && result.text === sample && result.phase === phase && result.previewSource === previewSource && result.streaming === streaming ? result : undefined
  const primaryContribution = rules[0]
  const primaryDefinition = primaryContribution
    ? primaryContribution.kind === 'text-transform'
      ? resolveTextTransformContributionRule(primaryContribution, resolveLoomScriptSettings(parsed.metadata?.settings))
      : resolveTextExtractorContribution(primaryContribution, resolveLoomScriptSettings(parsed.metadata?.settings))
    : undefined
  const primaryIsReplacement = primaryDefinition && 'phases' in primaryDefinition && primaryDefinition.effect.kind === 'replace'
  const bodyStats = markdownParts ? replacementStats(markdownParts.body) : undefined
  const bodyStatsLabel = bodyStats
    ? props.t('textTransform.replacementStats', { characters: bodyStats.characters.toLocaleString(), lines: bodyStats.lines.toLocaleString() })
    : ''
  const fullCopyLabel = fullCopyFeedback?.status === 'copied'
    ? props.t('textTransform.copyFullSourceDone')
    : fullCopyFeedback?.status === 'failed'
      ? props.t('textTransform.copyFullSourceFailed')
      : props.t('textTransform.copyFullSource')

  function commitSource(source: string) {
    sourceRef.current = source
    props.onSourceChange(source)
  }

  function changeFrontmatter(frontmatter: string) {
    commitSource(joinEditableFrontmatter(sourceRef.current, frontmatter))
  }

  function changeBody(body: string) {
    const parts = splitMarkdownRuleSource(sourceRef.current)
    if (!parts) return
    commitSource(joinMarkdownRuleSource({ ...parts, body }))
  }

  function toggleExpanded(editor: LongTextEditorHandle | null) {
    setEditorExpanded(value => !value)
    window.requestAnimationFrame(() => editor?.requestMeasure())
  }

  async function testRules() {
    if (!props.onPreview || testing) return
    const request = ++requestRef.current
    const input = { source: props.source, text: sample, phase, streaming, previewSource }
    setTesting(true)
    try {
      const value = await props.onPreview(input)
      if (request === requestRef.current) setResult({ ...input, value })
    } catch (cause) {
      if (request === requestRef.current) setResult({ ...input, error: cause instanceof Error ? cause.message : String(cause) })
    } finally { if (request === requestRef.current) setTesting(false) }
  }

  const sourceControls = (editorRef: typeof bodyEditorRef, label = props.t('textTransform.source')) => {
    const scrollToTopLabel = props.t('textTransform.scrollToTopOf', { target: label })
    const scrollToBottomLabel = props.t('textTransform.scrollToBottomOf', { target: label })
    const sizeLabel = editorExpanded ? props.t('textTransform.collapseSourceEditor') : props.t('textTransform.expandSourceEditor')
    return <div className={styles.editorControls}>
      <IconButton size="small" aria-label={scrollToTopLabel} title={scrollToTopLabel} onClick={() => editorRef.current?.scrollToTop()}><ArrowUpToLine size={15} aria-hidden="true" /></IconButton>
      <IconButton size="small" aria-label={scrollToBottomLabel} title={scrollToBottomLabel} onClick={() => editorRef.current?.scrollToBottom()}><ArrowDownToLine size={15} aria-hidden="true" /></IconButton>
      <IconButton size="small" aria-label={sizeLabel} aria-pressed={editorExpanded} title={sizeLabel} onClick={() => toggleExpanded(editorRef.current)}>
        {editorExpanded ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
      </IconButton>
    </div>
  }

  return <section className={styles.inspectionSection}>
    <h4>{props.t('textTransform.source')}</h4>
    <input aria-label={props.t('textTransform.scriptFileName')} className={styles.inlineInput}
      disabled={props.disabled} value={props.fileName} onChange={event => props.onFileNameChange(event.target.value)} />
    {parsed.error ? <p role="status" className={styles.error}>{parsed.error}</p> : null}
    {markdownParts ? <>
      <div className={styles.sourceMeta}>
        <span>{props.t('textTransform.markdownRuleSplitHint')}</span>
        <Button size="small" variant="ghost" disabled={!props.source} onClick={() => void copyFullSource(props.source, 'full-source')}>{fullCopyLabel}</Button>
      </div>
      <section className={styles.declaration} aria-label={props.t('textTransform.ruleSummary')}>
        <div className={styles.declarationHeading}>
          <span className={styles.declarationTitle}>{props.t('textTransform.ruleDeclaration')}</span>
          {primaryDefinition ? <>
            <strong>{primaryDefinition.name}</strong>
            <small>{'phases' in primaryDefinition ? `${props.t('textTransform.textRule')} · ${localizedPhases(primaryDefinition.phases, props.t)}` : props.t('textTransform.textExtractor')} · {primaryDefinition.enabled ? props.t('textTransform.ruleEnabled') : props.t('textTransform.ruleDisabled')}{primaryContribution?.requiresCode ? ` · ${props.t('textTransform.requiresCode')}` : ''}</small>
            <code>/{primaryDefinition.matcher.pattern}/{primaryDefinition.matcher.flags}</code>
          </> : <small>{props.t('textTransform.yamlFrontmatter')}</small>}
        </div>
        <div className={styles.declarationEditor}>
          <LongTextEditor sourceOnly mode="source" language="yaml" label={props.t('textTransform.ruleDeclarationYaml')} hideLabel
            disabled={props.disabled} spellCheck={false} height={DECLARATION_EDITOR_HEIGHT} value={editableFrontmatter(markdownParts)}
            onChange={changeFrontmatter} onCommit={() => {}}
            clearLabel={props.t('textTransform.clearDeclaration')} clearedLabel={props.t('textTransform.declarationCleared')} copyLabel={props.t('textTransform.copyDeclaration')} copiedLabel={props.t('textTransform.declarationCopied')} copyFailedLabel={props.t('textTransform.declarationCopyFailed')}
            restoreInitialLabel={props.t('textTransform.restoreDeclaration')} undoEditLabel={props.t('textTransform.undoDeclarationEdit')} undoLabel={props.t('textTransform.undoDeclarationClear')} />
        </div>
      </section>
      <section className={styles.replacement} aria-label={props.t('textTransform.replacementContent')}>
        <div className={styles.replacementHeading}>
          <div className={styles.replacementTitle}>
            <h4>{props.t('textTransform.replacementContent')}</h4>
            <small>{primaryIsReplacement === false ? `${bodyStatsLabel} · ${props.t('textTransform.replacementNotUsed')}` : bodyStatsLabel}</small>
          </div>
          <div className={styles.editorControls}>
            <Button size="small" variant="ghost" aria-expanded={!replacementCollapsed} onClick={() => setReplacementCollapsed(value => !value)}>
              {replacementCollapsed ? props.t('textTransform.expandReplacement') : props.t('textTransform.collapseReplacement')}
            </Button>
            {!replacementCollapsed ? sourceControls(bodyEditorRef, props.t('textTransform.replacementContent')) : null}
          </div>
        </div>
        {replacementCollapsed
          ? <div className={styles.collapsedReplacement}>{props.t('textTransform.replacementCollapsed')}</div>
          : <LongTextEditor ref={bodyEditorRef} sourceOnly mode="source" language="markdown" label={props.t('textTransform.ruleReplacement')} hideLabel
            disabled={props.disabled} spellCheck={false} height={editorExpanded ? SOURCE_EDITOR_EXPANDED_HEIGHT : SOURCE_EDITOR_HEIGHT} value={markdownParts.body}
            onChange={changeBody} onCommit={() => {}}
            clearLabel={props.t('textTransform.clearReplacement')} clearedLabel={props.t('textTransform.replacementCleared')} copyLabel={props.t('textTransform.copyReplacement')} copiedLabel={props.t('textTransform.replacementCopied')} copyFailedLabel={props.t('textTransform.replacementCopyFailed')}
            restoreInitialLabel={props.t('textTransform.restoreReplacement')} undoEditLabel={props.t('textTransform.undoReplacementEdit')} undoLabel={props.t('textTransform.undoReplacementClear')} />}
      </section>
    </> : <>
      {rules.length > 0 && <div className={styles.summary} aria-label={props.t('textTransform.ruleSummary')}>
        <h4>{props.t('textTransform.ruleSummaryCount', { count: rules.length })}</h4>
        {rules.map(contribution => {
          const settings = resolveLoomScriptSettings(parsed.metadata?.settings)
          const definition = contribution.kind === 'text-transform' ? resolveTextTransformContributionRule(contribution, settings) : resolveTextExtractorContribution(contribution, settings)
          return <article className={styles.ruleCard} key={contribution.id}>
            <div className={styles.ruleHeading}><strong>{definition.name}</strong><Button size="small" variant="ghost" onClick={() => editorRef.current?.revealLine(contributionLine(props.source, contribution.id))}>{props.t('textTransform.locateDeclaration')}</Button></div>
            <small>{'phases' in definition ? `${props.t('textTransform.textRule')} · ${localizedPhases(definition.phases, props.t)}` : props.t('textTransform.textExtractor')} · {definition.enabled ? props.t('textTransform.ruleEnabled') : props.t('textTransform.ruleDisabled')}{contribution.requiresCode ? ` · ${props.t('textTransform.requiresCode')}` : ''}</small>
            <code>/{definition.matcher.pattern}/{definition.matcher.flags}</code>
          </article>
        })}
      </div>}
      <div className={styles.replacementHeading}>
        <div className={styles.replacementTitle}><h4>{props.t('textTransform.fullSource')}</h4></div>
        {sourceControls(editorRef, props.t('textTransform.fullSource'))}
      </div>
      <div className={styles.editor}>
        <LongTextEditor ref={editorRef} sourceOnly mode="source" language={props.fileName.toLowerCase().endsWith('.md') ? 'loom-rule' : 'loom-script'} label={props.t('textTransform.source')}
          disabled={props.disabled} spellCheck={false} height={editorExpanded ? SOURCE_EDITOR_EXPANDED_HEIGHT : SOURCE_EDITOR_HEIGHT} value={props.source}
          onChange={props.onSourceChange} onCommit={() => {}}
          clearLabel={props.t('textTransform.clearSource')} clearedLabel={props.t('textTransform.sourceCleared')} copyLabel={props.t('textTransform.copyFullScript')} copiedLabel={props.t('textTransform.copied')} copyFailedLabel={props.t('textTransform.copyFailed')}
          restoreInitialLabel={props.t('textTransform.restoreSource')} undoEditLabel={props.t('textTransform.undoEdit')} undoLabel={props.t('textTransform.undoClear')} />
      </div>
    </>}
    {rules.length > 0 && props.onPreview && <details className={styles.testing}>
      <summary>{props.t('textTransform.ruleTestTitle')}</summary>
      <p className={styles.metaLine}>{props.t('textTransform.ruleTestLiveHint')}</p>
      <label>{props.t('textTransform.sampleSource')}<select aria-label={props.t('textTransform.sampleSource')} value={previewSource} onChange={event => { requestRef.current++; setTesting(false); setResult(undefined); setSelectedSource(event.target.value as ScriptPreviewSource) }}><option value="narrative">{props.t('textTransform.sampleNarrative')}</option><option value="agent-session">{props.t('textTransform.sampleAgentSession')}</option></select></label>
      <label>{props.t('textTransform.testPhase')}<select value={phase} onChange={event => { setPhase(event.target.value as ScriptPreviewInput['phase']); setStreaming(false) }}>
        <option value="display">{props.t('textTransform.phase.display')}</option><option value="prompt">{props.t('textTransform.phase.prompt')}</option><option value="classify">{props.t('textTransform.phase.classify')}</option>
      </select></label>
      <label><input type="checkbox" checked={streaming} disabled={phase !== 'display'} onChange={event => setStreaming(event.target.checked)} />{props.t('textTransform.streamingSnapshot')}</label>
      <label>{props.t('textTransform.sampleText')}<textarea aria-label={props.t('textTransform.ruleTestSampleText')} className={styles.rawJsonTextarea} value={sample} onChange={event => setSample(event.target.value)} /></label>
      <Button size="small" disabled={testing || props.disabled || Boolean(parsed.error)} onClick={() => void testRules()}>{testing ? props.t('textTransform.testingRules') : props.t('textTransform.testRule')}</Button>
      {currentResult?.error && <p role="alert" className={styles.error}>{currentResult.error}</p>}
      {currentResult?.value && <div aria-live="polite">{rules.some(contribution => contribution.kind === 'text-transform') && <><p className={styles.metaLine}>{props.t('textTransform.matchCount', { count: currentResult.value.matches.length })}</p><pre className={styles.output}>{currentResult.value.output}</pre></>}
        {currentResult.value.diagnostics.map((diagnostic, index) => <p className={styles.error} key={index}>{diagnostic.message}</p>)}
        {currentResult.value.extractions?.map(extraction => <section key={extraction.extractorId}>
          <h4>{props.t('textTransform.extractionResult', { id: extraction.extractorId })}</h4><pre className={styles.output}>{JSON.stringify(extraction.values, null, 2)}</pre>
          {extraction.diagnostics.map((diagnostic, index) => <p className={styles.error} key={index}>{diagnostic.message}</p>)}
        </section>)}
      </div>}
    </details>}
  </section>
}

function contributionLine(source: string, id: string): number {
  const lines = source.split('\n')
  let declarationLine = 1
  let inContribution = false
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (/^\/\/\s*@/.test(line)) {
      inContribution = /^\/\/\s*@contribution\s/.test(line)
      if (inContribution) declarationLine = index + 1
    }
    if (inContribution && line.includes('"id"') && line.includes(JSON.stringify(id))) return declarationLine
  }
  return declarationLine
}
