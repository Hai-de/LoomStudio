import { useEffect, useReducer } from 'react'
import { StartupReady } from '../app/startup-curtain.js'
import { NarrativeSession, type NarrativeSessionCandidate, type NarrativeSessionExecution, type NarrativeSessionRound, type NarrativeSessionStep } from '../widgets/narrative-session/narrative-session.js'
import '../styles/global.css'

const presets = ['诺姆 · 叙事写作', '诺姆 · 克制叙事', '诺姆 · 对话优先'] as const
const firstInput = '我拿起了剑，冲向那个人。'
const original = '你踏进积水，剑锋划开一道细亮的雨线。\n\n那人侧身退了半步，披风擦过钟楼斑驳的石墙。银色徽章在领口一闪——渡鸦的翅膀下，刻着与你剑柄上一模一样的缺口。\n\n“等一下。”他的手终于从披风下伸出来，掌心向你摊开，“你这把剑，是从哪里来的？”\n\n楼顶的钟声停了。你听见他呼吸里的迟疑。'
const alternate = '雨水顺着剑脊滑落。你没有给他退进阴影的机会，第一步便封住了钟楼旁狭窄的出口。\n\n他抬手格挡，袖口却露出一道尚未愈合的伤。你认得那个位置——三天前，在城门口替你挡下弩箭的人，也伤在那里。\n\n“现在才认出来？”他压低声音，目光越过你的肩膀，“先别回头。追你的不止我一个。”'
const revised = '你踏进积水，剑锋划开一道细亮的雨线。\n\n那人本已抬起手，目光却突然停在你的剑柄上。渡鸦翅膀下的缺口映入眼底，他的动作随之僵住，没有再后退。\n\n“这把剑……”他声音很轻，像是不敢确认一个早已放弃的答案。雨水沿着他的指节往下滴，他却连擦去的念头也忘了。\n\n你的剑尖停在他胸前。他看着剑，没有看你。'

type Job = { roundId: string; candidateId: string; executionId: string; frames: NarrativeSessionStep[][]; frame: number; revisedText?: string }
type Demo = { rounds: NarrativeSessionRound[]; preset: string; writingMode: 'declaration' | 'short'; job?: Job; paused: boolean; epoch: number }
type Action =
  | { type: 'send'; content: string; mode: 'roleplay' | 'discussion' }
  | { type: 'retry'; roundId: string }
  | { type: 'select'; roundId: string; index: number }
  | { type: 'preset'; value: string }
  | { type: 'mode'; value: Demo['writingMode'] }
  | { type: 'pause' | 'tick' | 'reset' | 'replay' }

function step(id: string, kind: NarrativeSessionStep['kind'], title: string, content: string, state: NarrativeSessionStep['state'] = 'completed'): NarrativeSessionStep {
  return { id, kind, title, content, state }
}

function writingFrames(text: string, mode: Demo['writingMode']): NarrativeSessionStep[][] {
  if (mode === 'short') return [
    [step('thought', 'thinking', '正在组织对话', '样例思考摘要：保持这一刻的紧张感，让对方先开口。', 'running')],
    [step('body', 'narrative', '正文', text.slice(0, 30), 'running')],
    [step('body', 'narrative', '正文', text, 'completed')],
  ]
  const thought = step('thought', 'thinking', '整理场景', '样例思考摘要：接续雨夜对峙，保留用户的主动行动。先核对渡鸦徽章和剑的关联，再让人物作出回应。')
  const read = step('read', 'tool', '读取角色资料', '/lore/渡鸦卫队.md\n已读取：徽章、钟楼与失踪的佩剑。')
  const declare = step('declare', 'tool', '声明下一条输出为正文', 'declare_narrative()\n下一条 Assistant 正文属于本轮剧情；输出后继续执行。')
  const body = step('body', 'narrative', '正文', text)
  const update = step('state', 'tool', '更新场景变量', '/state/scene/tension: 2 → 3\n/state/characters/raven/recognizesSword: true')
  return [
    [{ ...thought, state: 'running' }],
    [thought, { ...read, state: 'running' }],
    [thought, read, { ...declare, state: 'running' }],
    [thought, read, declare, { ...body, content: text.slice(0, 32), state: 'running' }],
    [thought, read, declare, { ...body, content: text.slice(0, Math.floor(text.length * .58)), state: 'running' }],
    [thought, read, declare, body, { ...update, state: 'running' }],
    [thought, read, declare, body, update, step('reply', 'reply', '执行结束', '正文已写入，场景变量已更新。')],
  ]
}

function discussionFrames(edit: boolean): NarrativeSessionStep[][] {
  const thought = step('thought', 'thinking', '理解你的指导', edit ? '样例思考摘要：只修订当前正文的反应，不添加新的剧情轮次。保留用户已经作出的行动。' : '样例思考摘要：这是创作讨论，回复不归入剧情。')
  if (!edit) return [[{ ...thought, state: 'running' }], [thought, step('reply', 'reply', '讨论回复', '这里用“认出剑”留下一个悬念，让人物的迟疑推动对话。你可以继续指导我修改，或者切回扮演推进剧情。')]]
  const patch = step('patch', 'tool', '修订本轮正文', 'edit_narrative(current, expectedVersion)\n将退让改为认出佩剑后的迟疑；保留原来的行动与场景。')
  return [[{ ...thought, state: 'running' }], [thought, { ...patch, state: 'running' }], [thought, patch, step('reply', 'reply', '修订回复', '改好了。他会停在原地，因认出这把剑而迟疑；没有新增剧情楼层。')]]
}

function bodyFor(round: number, candidate: number, input: string): string {
  if (round === 1) return candidate % 2 ? alternate : original
  return `你说完，钟楼下短暂地安静下来。\n\n${candidate % 2 ? '那人先看了看空荡的巷口，才向你走近一步。' : '那人把手从剑锋前缓缓收回，目光第一次落在你的脸上。'}\n\n“我跟着的是那把剑。”他说，“直到刚才，我都以为拿着它的会是另一个人。”\n\n雨声填满了你们之间的距离。你方才的行动——${input.replace(/[。！!？?]$/, '')}——似乎终于让他下定了决心。`
}

function makeCandidate(id: string, preset: string, text: string, mode: Demo['writingMode'], completed: boolean): NarrativeSessionCandidate {
  const frames = writingFrames(text, mode)
  return { id, execution: { id: `${id}-writing`, preset, state: completed ? 'completed' : 'running', steps: frames[completed ? frames.length - 1 : 0]! }, discussions: [], revision: 1, image: completed ? 'ready' : 'none' }
}

function initial(scene: string): Demo {
  const state: Demo = { rounds: [], preset: presets[0], writingMode: 'declaration', paused: false, epoch: 0 }
  if (scene === 'empty') return state
  const count = scene === 'long' ? 6 : 1
  for (let index = 0; index < count; index++) {
    const number = index + 1
    const input = index === 0 ? firstInput : index === 1 ? '我压低剑尖，问他为什么一直跟着我。' : `我看向钟楼更深处，继续追问第 ${number} 个线索。`
    const id = `round-${number}`
    state.rounds.push({ id, number, input, selected: 0, candidates: [makeCandidate(`${id}-candidate-1`, state.preset, bodyFor(number, 0, input), state.writingMode, true)] })
  }
  return state
}

function mapCandidate(state: Demo, roundId: string, candidateId: string, update: (candidate: NarrativeSessionCandidate) => NarrativeSessionCandidate): Demo {
  return { ...state, rounds: state.rounds.map(round => round.id !== roundId ? round : { ...round, candidates: round.candidates.map(candidate => candidate.id === candidateId ? update(candidate) : candidate) }) }
}

function reducer(state: Demo, action: Action): Demo {
  if (action.type === 'tick') {
    // A fixture's image task completes separately from writing. Only its own candidate is updated.
    let next = { ...state, rounds: state.rounds.map(round => ({ ...round, candidates: round.candidates.map(candidate => candidate.image === 'waiting' ? { ...candidate, image: 'ready' as const } : candidate) })) }
    const job = state.job
    if (!job || state.paused) return next
    const frame = job.frame + 1
    const complete = frame === job.frames.length
    const steps = job.frames[complete ? frame - 1 : frame]!
    next = mapCandidate(next, job.roundId, job.candidateId, candidate => {
      const apply = (execution: NarrativeSessionExecution): NarrativeSessionExecution => execution.id !== job.executionId ? execution : { ...execution, steps, state: complete ? 'completed' : 'running' }
      let updated = { ...candidate, execution: apply(candidate.execution), discussions: candidate.discussions.map(apply) }
      if (complete && job.revisedText) {
        updated = { ...updated, revision: candidate.revision + 1, execution: { ...updated.execution, steps: updated.execution.steps.map(item => item.kind === 'narrative' ? { ...item, content: job.revisedText! } : item) } }
      }
      return complete && (!candidate.discussions.length || job.revisedText) ? { ...updated, image: 'waiting' } : updated
    })
    return { ...next, job: complete ? undefined : { ...job, frame } }
  }
  if (action.type === 'reset') return { ...initial('empty'), epoch: state.epoch + 1 }
  if (action.type === 'replay') return reducer({ ...initial('empty'), epoch: state.epoch + 1 }, { type: 'send', content: firstInput, mode: 'roleplay' })
  if (action.type === 'pause') {
    if (!state.job) return state
    const job = state.job
    const next = mapCandidate(state, job.roundId, job.candidateId, candidate => {
      const apply = (execution: NarrativeSessionExecution): NarrativeSessionExecution => execution.id === job.executionId ? { ...execution, state: state.paused ? 'running' : 'paused' } : execution
      return { ...candidate, execution: apply(candidate.execution), discussions: candidate.discussions.map(apply) }
    })
    return { ...next, paused: !state.paused }
  }
  if (state.job) return state
  if (action.type === 'preset') return { ...state, preset: action.value }
  if (action.type === 'mode') return { ...state, writingMode: action.value }
  if (action.type === 'select') return { ...state, rounds: state.rounds.map(round => round.id === action.roundId && action.index >= 0 && action.index < round.candidates.length ? { ...round, selected: action.index } : round) }
  if (action.type === 'retry') {
    const round = state.rounds.at(-1)
    if (!round || round.id !== action.roundId) return state
    const text = bodyFor(round.number, round.candidates.length, round.input)
    const candidate = makeCandidate(`${round.id}-candidate-${round.candidates.length + 1}`, state.preset, text, state.writingMode, false)
    return { ...state, paused: false, rounds: [...state.rounds.slice(0, -1), { ...round, selected: round.candidates.length, candidates: [...round.candidates, candidate] }], job: { roundId: round.id, candidateId: candidate.id, executionId: candidate.execution.id, frames: writingFrames(text, state.writingMode), frame: 0 } }
  }
  if (action.type === 'send' && action.mode === 'roleplay') {
    const number = state.rounds.length + 1
    const id = `round-${number}`
    const text = bodyFor(number, 0, action.content)
    const candidate = makeCandidate(`${id}-candidate-1`, state.preset, text, state.writingMode, false)
    return { ...state, paused: false, rounds: [...state.rounds, { id, number, input: action.content, selected: 0, candidates: [candidate] }], job: { roundId: id, candidateId: candidate.id, executionId: candidate.execution.id, frames: writingFrames(text, state.writingMode), frame: 0 } }
  }
  if (action.type === 'send') {
    const round = state.rounds.at(-1)
    if (!round) return state
    const candidate = round.candidates[round.selected]!
    const edit = /改|修|调整|别|迟疑|认出/.test(action.content)
    const frames = discussionFrames(edit)
    const execution: NarrativeSessionExecution = { id: `${candidate.id}-discussion-${candidate.discussions.length + 1}`, preset: state.preset, input: action.content, state: 'running', steps: frames[0]! }
    const next = mapCandidate(state, round.id, candidate.id, item => ({ ...item, discussions: [...item.discussions, execution] }))
    const revisedText = edit ? round.number === 1 ? revised : `${bodyFor(round.number, round.selected, round.input)}\n\n他没有立刻回答。那一瞬的迟疑，让你意识到这件事远比想象中更重要。` : undefined
    return { ...next, paused: false, job: { roundId: round.id, candidateId: candidate.id, executionId: execution.id, frames, frame: 0, revisedText } }
  }
  return state
}

export function NarrativeSessionPreview() {
  const [state, dispatch] = useReducer(reducer, new URLSearchParams(window.location.search).get('scene') ?? '', initial)
  const hasPendingImage = state.rounds.some(round => round.candidates.some(candidate => candidate.image === 'waiting'))
  useEffect(() => {
    if ((!state.job || state.paused) && !hasPendingImage) return
    const timer = window.setTimeout(() => dispatch({ type: 'tick' }), state.job && !state.paused ? 1050 : 1500)
    return () => window.clearTimeout(timer)
  }, [state.job, state.paused, hasPendingImage])
  return <><NarrativeSession key={state.epoch} rounds={state.rounds} preset={state.preset} presets={presets} writingMode={state.writingMode} busy={!!state.job} paused={state.paused}
    onPresetChange={value => dispatch({ type: 'preset', value })} onWritingModeChange={value => dispatch({ type: 'mode', value })}
    onSend={(content, mode) => dispatch({ type: 'send', content, mode })} onRetry={roundId => dispatch({ type: 'retry', roundId })}
    onSelectCandidate={(roundId, index) => dispatch({ type: 'select', roundId, index })} onPause={() => dispatch({ type: 'pause' })}
    onReplay={() => dispatch({ type: 'replay' })} onReset={() => dispatch({ type: 'reset' })} /><StartupReady /></>
}
