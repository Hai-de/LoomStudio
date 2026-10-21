import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, BookOpen, Brain, Check, ChevronDown, ChevronLeft, ChevronRight, Circle, GitBranch, Image, LoaderCircle, MessageCircle, PanelRight, Pause, Play, RotateCcw, Sparkles, Swords, Terminal, X } from 'lucide-react'
import { Button, IconButton } from '@loom-studio/ui'
import { ConversationMarkdown } from '../../shared/ui/conversation-markdown/conversation-markdown.js'
import styles from './narrative-session.module.scss'

export type NarrativeSessionStep = {
  id: string
  kind: 'thinking' | 'tool' | 'narrative' | 'reply'
  title: string
  content: string
  state: 'running' | 'completed'
}
export type NarrativeSessionExecution = {
  id: string
  preset: string
  input?: string
  state: 'running' | 'paused' | 'completed'
  steps: NarrativeSessionStep[]
}
export type NarrativeSessionCandidate = {
  id: string
  execution: NarrativeSessionExecution
  discussions: NarrativeSessionExecution[]
  revision: number
  image: 'none' | 'waiting' | 'ready'
}
export type NarrativeSessionRound = {
  id: string
  number: number
  input: string
  selected: number
  candidates: NarrativeSessionCandidate[]
}
export type NarrativeSessionProps = {
  rounds: NarrativeSessionRound[]
  preset: string
  presets: readonly string[]
  writingMode: 'declaration' | 'short'
  busy: boolean
  paused: boolean
  onPresetChange(value: string): void
  onWritingModeChange(value: 'declaration' | 'short'): void
  onSend(content: string, mode: 'roleplay' | 'discussion'): void
  onRetry(roundId: string): void
  onSelectCandidate(roundId: string, index: number): void
  onPause(): void
  onReplay(): void
  onReset(): void
}

const codeLabels = { copy: '复制', copied: '已复制', copyFailed: '复制失败', enableWrap: '自动换行', disableWrap: '关闭换行' }

function Execution(props: { execution: NarrativeSessionExecution; reading: boolean }) {
  const { execution, reading } = props
  const [expanded, setExpanded] = useState(false)
  const working = execution.state !== 'completed'
  const showWork = !reading && (working || expanded)
  const toolCount = execution.steps.filter(step => step.kind === 'tool').length
  const current = execution.steps.find(step => step.state === 'running')
  const hasNarrative = execution.steps.some(step => step.kind === 'narrative')
  return <div className={styles.execution} data-execution-state={execution.state}>
    {!reading && <button type="button" className={styles.executionToggle} aria-expanded={showWork} onClick={() => setExpanded(value => !value)} disabled={working}>
      {working ? execution.state === 'paused' ? <Pause /> : <LoaderCircle className={styles.spin} /> : <Check className={styles.success} />}
      <span>{working ? execution.state === 'paused' ? '已暂停' : current?.title ?? '正在接续' : execution.input ? execution.steps.some(step => step.kind === 'tool') ? '修订完成' : '讨论完成' : '本次写作已完成'}</span>
      <span className={styles.executionMeta}>{working ? execution.preset : `${toolCount} 个工具 · ${execution.preset}`}</span>
      {!working && <ChevronDown className={showWork ? styles.rotated : ''} />}
    </button>}
    {execution.steps.map(step => {
      if (step.kind === 'narrative') return <article key={step.id} className={styles.narrative} aria-label="剧情正文" aria-busy={step.state === 'running'}>
        <div className={styles.narrativeLabel}><span>剧情</span>{step.state === 'running' && <span className={styles.live}>正在书写</span>}</div>
        <ConversationMarkdown role="assistant" value={step.content} codeBlockLabels={codeLabels} />
      </article>
      if (!showWork) return null
      if (step.kind === 'thinking') return <details key={step.id} className={styles.thinking} open={step.state === 'running'}>
        <summary><Brain /><span>思考</span><span className={styles.muted}>{step.state === 'running' ? '正在整理场景' : '查看思考摘要'}</span><ChevronDown /></summary>
        <p>{step.content}</p>
      </details>
      if (step.kind === 'reply') return <p key={step.id} className={styles.agentReply}><Sparkles />{step.content}</p>
      return <details key={step.id} className={styles.tool}>
        <summary>{step.state === 'running' ? <LoaderCircle className={styles.spin} /> : <Terminal />}<span>{step.title}</span><span className={styles.toolState}>{step.state === 'running' ? '执行中' : '完成'}</span><ChevronDown /></summary>
        <pre>{step.content}</pre>
      </details>
    })}
    {reading && working && !hasNarrative && <p className={styles.quietStatus}><LoaderCircle className={styles.spin} />{current?.title ?? '正在准备正文'}</p>}
  </div>
}

function ContextView({ rounds }: { rounds: NarrativeSessionRound[] }) {
  const [target, setTarget] = useState<'main' | 'secondary'>('main')
  const [workBuffer, setWorkBuffer] = useState(true)
  return <div className={styles.contextView}>
    <p className={styles.panelIntro}>相同会话历史，两种读取视图。以下使用本页当前候选。</p>
    <div className={styles.segmented} aria-label="上下文消费者">
      <Button aria-pressed={target === 'main'} onClick={() => setTarget('main')}>当前写作</Button>
      <Button aria-pressed={target === 'secondary'} onClick={() => setTarget('secondary')}>副 Agent</Button>
    </div>
    {target === 'main' && <label className={styles.checkOption}><input type="checkbox" checked={workBuffer} onChange={event => setWorkBuffer(event.target.checked)} />保留近期工作过程</label>}
    <section className={styles.contextSummary}><BookOpen /><div><strong>剧情总结</strong><p>先前剧情的固定范围摘要。此处为位置示意，本页未生成摘要。</p></div></section>
    <section className={styles.contextSummary}><Brain /><div><strong>{target === 'main' ? '工作总结' : '副 Agent 自己的工作上下文'}</strong><p>{target === 'main' ? '任务进度、约束与接续信息；与剧情总结分别采用。' : '主写作的工具和讨论不自动带入。'}</p></div></section>
    <h3>{target === 'main' ? '统一历史缓冲' : '正文采样'}</h3>
    {!rounds.length && <p className={styles.muted}>发送第一条扮演输入后，这里会出现记录。</p>}
    {rounds.map(round => {
      const candidate = round.candidates[round.selected]!
      const executionSteps = [candidate.execution, ...candidate.discussions]
      return <div key={round.id} className={styles.contextRound}>
        <small>第 {round.number} 轮 · 候选 {round.selected + 1}</small>
        <div className={styles.contextEntry}><span>USER · 正文</span><p>{round.input}</p></div>
        {executionSteps.map(execution => <div key={execution.id}>
          {target === 'main' && workBuffer && execution.input && <div className={styles.contextEntry}><span>USER · 讨论</span><p>{execution.input}</p></div>}
          {execution.steps.filter(step => step.kind === 'narrative' || (target === 'main' && workBuffer)).map(step => <div key={step.id} className={styles.contextEntry}>
            <span>{step.kind === 'narrative' ? 'ASSISTANT · 正文' : step.kind === 'tool' ? 'TOOL · 工作过程' : step.kind === 'thinking' ? '思考摘要 · 样例' : 'ASSISTANT · 讨论'}</span>
            <p>{step.kind === 'tool' ? `${step.title}\n${step.content}` : step.content}</p>
          </div>)}
        </div>)}
      </div>
    })}
  </div>
}

export function NarrativeSession(props: NarrativeSessionProps) {
  const [mode, setMode] = useState<'roleplay' | 'discussion'>('roleplay')
  const [drafts, setDrafts] = useState({ roleplay: '', discussion: '' })
  const [reading, setReading] = useState(false)
  const [panel, setPanel] = useState<'context' | 'sessions' | null>(null)
  const [secondaryDraft, setSecondaryDraft] = useState('')
  const [secondaryMessages, setSecondaryMessages] = useState<string[]>([])
  const textarea = useRef<HTMLTextAreaElement>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const lastRound = props.rounds.at(-1)
  useLayoutEffect(() => {
    const element = scrollArea.current
    if (element && following.current) element.scrollTop = element.scrollHeight
  }, [props.rounds])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const content = drafts[mode].trim()
    if (!content || props.busy || (mode === 'discussion' && !lastRound)) return
    following.current = true
    props.onSend(content, mode)
    setDrafts(value => ({ ...value, [mode]: '' }))
  }
  return <div className={styles.shell}>
    <div className={styles.previewBar}><span><Circle /> DEV PREVIEW <span className={styles.previewName}>/ Narrative Timeline</span></span><span>交互草稿 · 本地模拟</span><Button size="small" onClick={props.onReset} disabled={props.busy}><RotateCcw />空白开始</Button><Button size="small" onClick={props.onReplay} disabled={props.busy}><Play />重播示例</Button></div>
    <div className={styles.workspace}>
      <nav className={styles.rail} aria-label="预览视图">
        <span className={styles.brand}>L</span>
        <IconButton aria-label="故事" aria-pressed={!panel} onClick={() => setPanel(null)}><BookOpen /></IconButton>
        <IconButton aria-label="副 Session" aria-pressed={panel === 'sessions'} onClick={() => setPanel(panel === 'sessions' ? null : 'sessions')}><MessageCircle /></IconButton>
        <IconButton aria-label="上下文预览" aria-pressed={panel === 'context'} onClick={() => setPanel(panel === 'context' ? null : 'context')}><Brain /></IconButton>
        <span className={styles.railFoot}>LOOM</span>
      </nav>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.storyIdentity}><span className={styles.eyebrow}>渡鸦之城</span><h1>雨夜，旧钟楼</h1></div>
          <span className={styles.branch}><GitBranch />初始分支</span>
          <div className={styles.headerActions}>
            <Button size="small" aria-pressed={reading} onClick={() => setReading(value => !value)}><BookOpen />{reading ? '只看正文' : '正文与过程'}</Button>
            <IconButton aria-label="打开副 Session" aria-pressed={panel === 'sessions'} onClick={() => setPanel(panel === 'sessions' ? null : 'sessions')}><PanelRight /></IconButton>
          </div>
        </header>
        <div className={styles.scrollArea} ref={scrollArea} onScroll={event => { const element = event.currentTarget; following.current = element.scrollHeight - element.clientHeight - element.scrollTop < 80 }}>
          <div className={styles.readingColumn}>
            <div className={styles.opening}><span className={styles.eyebrow}>序幕</span><p>钟楼的第十三次报时落在雨里。巷口那个人停下脚步，右手始终藏在披风下面。你认得那枚银色的渡鸦徽章。</p></div>
            {!props.rounds.length && <div className={styles.empty}><Swords /><h2>接下来，由你行动。</h2><p>从下方发送扮演输入，体验一轮写作。也可以重播示例。</p></div>}
            {props.rounds.map((round, index) => {
              const candidate = round.candidates[round.selected]!
              const latest = index === props.rounds.length - 1
              return <section key={round.id} className={styles.round} aria-label={`第 ${round.number} 轮`}>
                <div className={styles.roundDivider}><span>第 {round.number} 轮</span><span className={styles.muted}>{latest ? '当前轮次' : '已接续'}</span></div>
                <div className={styles.userRow}><span>你</span><p>{round.input}</p></div>
                <Execution key={candidate.execution.id} execution={candidate.execution} reading={reading} />
                {candidate.discussions.map(execution => <div key={execution.id} className={styles.discussion}>
                  {!reading && <div className={styles.guidance}><MessageCircle /><div><span>与 Agent 讨论 · 同属第 {round.number} 轮</span><p>{execution.input}</p></div></div>}
                  <Execution execution={execution} reading={reading} />
                </div>)}
                <footer className={styles.roundFooter}>
                  {candidate.image !== 'none' && <details className={styles.imageReceipt}><summary>{candidate.image === 'waiting' ? <LoaderCircle className={styles.spin} /> : <Image />}<span>{candidate.image === 'waiting' ? '场景插图生成中' : `场景插图${candidate.revision > 1 ? '已随修订更新' : '已就绪'}`}</span><ChevronDown /></summary><p>模拟文生图任务 · 正文 v{candidate.revision}<br />雨夜、旧钟楼、银色渡鸦徽章。结果关联当前候选及正文版本。</p></details>}
                  {latest && <div className={styles.swipe}>
                    <IconButton size="small" aria-label="上一个候选" disabled={props.busy || round.selected === 0} onClick={() => props.onSelectCandidate(round.id, round.selected - 1)}><ChevronLeft /></IconButton>
                    <span>{round.selected + 1} / {round.candidates.length}</span>
                    <IconButton size="small" aria-label="下一个候选" disabled={props.busy || round.selected === round.candidates.length - 1} onClick={() => props.onSelectCandidate(round.id, round.selected + 1)}><ChevronRight /></IconButton>
                    <Button size="small" disabled={props.busy} onClick={() => props.onRetry(round.id)} title="重新尝试本轮；当前候选的指导和修订不会带入新候选"><RotateCcw />Swipe</Button>
                  </div>}
                </footer>
              </section>
            })}
          </div>
        </div>
        <div className={styles.composerDock}>
          <form className={`${styles.composer} ${mode === 'discussion' ? styles.discussionComposer : ''}`} onSubmit={submit}>
            <div className={styles.composerTop}>
              <div className={styles.segmented} aria-label="输入模式">
                <Button aria-pressed={mode === 'roleplay'} onClick={() => { setMode('roleplay'); textarea.current?.focus() }}><Swords />扮演</Button>
                <Button aria-pressed={mode === 'discussion'} disabled={!lastRound} onClick={() => { setMode('discussion'); textarea.current?.focus() }}><MessageCircle />讨论</Button>
              </div>
              <span>{mode === 'roleplay' ? '写入剧情 · 开启下一轮' : `指导与修订 · 继续第 ${lastRound?.number ?? 1} 轮`}</span>
            </div>
            <textarea ref={textarea} aria-label={mode === 'roleplay' ? '扮演输入' : '讨论输入'} placeholder={mode === 'roleplay' ? '你会怎么做？' : '告诉 Agent 你想调整哪里……'} value={drafts[mode]} onChange={event => setDrafts(value => ({ ...value, [mode]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} />
            <div className={styles.composerBottom}>
              <label className={styles.preset}><Sparkles /><select aria-label="写作预设" value={props.preset} disabled={props.busy} onChange={event => props.onPresetChange(event.target.value)}>{props.presets.map(preset => <option key={preset}>{preset}</option>)}</select></label>
              <select className={styles.writingMode} aria-label="输出模式" value={props.writingMode} disabled={props.busy} onChange={event => props.onWritingModeChange(event.target.value as NarrativeSessionProps['writingMode'])}><option value="declaration">写作模式</option><option value="short">短对话模式</option></select>
              <span className={styles.sendHint}>{props.busy ? props.paused ? '模拟已暂停' : 'Agent 工作中' : 'Enter 发送'}</span>
              {props.busy ? <IconButton aria-label={props.paused ? '继续模拟' : '暂停模拟'} onClick={props.onPause}>{props.paused ? <Play /> : <Pause />}</IconButton> : <IconButton className={styles.sendButton} aria-label={mode === 'roleplay' ? '发送扮演输入' : '发送讨论'} type="submit" disabled={!drafts[mode].trim()}><ArrowUp /></IconButton>}
            </div>
          </form>
          <div className={styles.suggestions}>{mode === 'roleplay' ? <Button size="small" disabled={props.busy} onClick={() => setDrafts(value => ({ ...value, roleplay: lastRound ? '我压低剑尖，问他为什么一直跟着我。' : '我拿起了剑，冲向那个人。' }))}>试试：{lastRound ? '我压低剑尖，问他为什么一直跟着我。' : '我拿起了剑，冲向那个人。'}</Button> : <Button size="small" disabled={props.busy} onClick={() => setDrafts(value => ({ ...value, discussion: '别让他直接后退。改成他认出了我的剑，因此迟疑了一瞬。' }))}>试试：让对方认出我的剑，修订刚才的正文。</Button>}</div>
        </div>
      </main>
      {panel && <aside className={styles.sidePanel} aria-label={panel === 'context' ? '上下文预览' : '副 Session'}>
        <header><h2>{panel === 'context' ? '上下文预览' : '副 Session'}</h2><IconButton aria-label="关闭侧栏" onClick={() => setPanel(null)}><X /></IconButton></header>
        {panel === 'context' ? <ContextView rounds={props.rounds} /> : <div className={styles.secondary}>
          <div className={styles.secondaryIdentity}><span className={styles.secondaryAvatar}><Image /></span><div><strong>场景绘师</strong><p>独立会话 · 采样当前剧情</p></div></div>
          <p className={styles.panelIntro}>主 Agent 的工作过程已经在正文中。这里留给协作的副 Agent。</p>
          <div className={styles.secondaryHistory}><p>我会在写作完成后，依据当前采用的正文准备画面。你也可以在这里单独讨论构图。</p>{secondaryMessages.map((message, index) => <p key={index} className={index % 2 ? styles.secondaryReply : styles.secondaryUser}>{message}</p>)}</div>
          <form onSubmit={event => { event.preventDefault(); if (!secondaryDraft.trim()) return; setSecondaryMessages(value => [...value, secondaryDraft.trim(), '收到。画面会突出剑身反光与对方的迟疑，保持雨夜的冷色调。（模拟回复）']); setSecondaryDraft('') }}><textarea aria-label="副 Session 输入" value={secondaryDraft} onChange={event => setSecondaryDraft(event.target.value)} placeholder="与场景绘师讨论……" /><IconButton aria-label="发送给副 Session" type="submit" disabled={!secondaryDraft.trim()}><ArrowUp /></IconButton></form>
        </div>}
      </aside>}
    </div>
  </div>
}
