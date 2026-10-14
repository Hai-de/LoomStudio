import { useState } from 'react'
import { Button, Checkbox, Dialog, TextInput } from '@loom-studio/ui'
import { TimelineQuickActions } from '../../widgets/timeline-quick-actions/timeline-quick-actions.js'

const initialBranches = [{ id: 'main', title: '主线 · 留在港口' }, { id: 'forest', title: '另一种选择 · 走入森林' }]
const labels = {
  expand: '展开故事快捷操作', collapse: '收起故事快捷操作', openCharacter: '打开角色面板',
  selectStory: '切换故事', opening: '尚未开始故事', story: '当前故事', branch: '切换分支', rename: '重命名故事',
  newStory: '新开故事', fork: '从当前进度分支', deleteStory: '删除当前故事', deleteCharacter: '删除角色',
}

export function TimelineQuickActionsPreview() {
  const [scenario, setScenario] = useState('story')
  const [title, setTitle] = useState('雾港来信')
  const [branches, setBranches] = useState(initialBranches)
  const [branchId, setBranchId] = useState('main')
  const [notice, setNotice] = useState('选中角色名打开资料；右侧箭头展开快捷操作。')
  const [dialog, setDialog] = useState<'character' | 'delete-story' | 'delete-character' | 'rename'>()
  const [draft, setDraft] = useState('')
  const [includePlay, setIncludePlay] = useState(false)
  const [includeResources, setIncludeResources] = useState(false)
  const name = scenario === 'long' ? '诺姆 · 来自遥远北境、负责记录每一次分岔的旅人' : '诺姆'
  const hasStory = scenario !== 'opening'
  return <main style={{ minHeight: '100dvh', background: 'var(--loom-color-background)', color: 'var(--loom-color-text)' }}>
    <header style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ color: 'var(--loom-color-text-muted)' }}>Timeline 胶囊 · 交互草稿</span>
      {(['story', 'opening', 'long', 'busy'] as const).map((value, index) => <Button key={value} aria-pressed={scenario === value} onClick={() => {
        setScenario(value); setTitle(value === 'long' ? '在漫长的雨季结束以前，我们还没有说完的那个故事' : '雾港来信')
        setBranches(value === 'long' ? Array.from({ length: 18 }, (_, i) => ({ id: String(i), title: `第 ${i + 1} 条路线 · 在北境的岔路口做出不同的选择` })) : initialBranches)
        setBranchId(value === 'long' ? '0' : 'main')
      }}>{['已有故事', '只有开场白', '长名称 / 多分支', '生成中'][index]}</Button>)}
    </header>
    <div style={{ position: 'relative', minHeight: 580, paddingTop: 90 }}>
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
        <TimelineQuickActions character={{ name }} busy={scenario === 'busy'} labels={labels}
          timelines={[{ id: 'current', title }, { id: 'other', title: '森林里的另一封信' }]} selectedTimelineId="current"
          onSelectTimeline={id => { if (id === 'other') { setTitle('森林里的另一封信'); setScenario('story') } }}
          timeline={hasStory ? { title, branchId, branches } : undefined}
          onOpenCharacter={() => setDialog('character')}
          onSelectBranch={id => { setBranchId(id); setNotice('已切换分支（内存样例）。') }}
          onNewStory={() => { setScenario('story'); setTitle('新的故事'); setBranches(initialBranches); setBranchId('main'); setNotice('已为当前角色新开故事，旧故事保留（内存样例）。') }}
          onRenameStory={() => { setDraft(title); setDialog('rename') }}
          onFork={() => { const id = `fork-${branches.length}`; setBranches([...branches, { id, title: `新分支 ${branches.length}` }]); setBranchId(id); setNotice('已从当前进度创建并切换分支（内存样例）。') }}
          onDeleteStory={() => setDialog('delete-story')}
          onDeleteCharacter={() => { setIncludePlay(false); setIncludeResources(false); setDialog('delete-character') }} />
      </div>
      <article style={{ maxWidth: 680, margin: '0 auto', padding: '36px 24px', lineHeight: 1.9 }}>
        <p style={{ color: 'var(--loom-color-text-muted)' }}>开场白</p>
        <p>雨停在黄昏以前。港口的灯一盏接一盏亮起，潮湿的石板路映着那些细小的光。</p>
        <p>诺姆坐在窗边，手里握着一封还没有拆开的信。听见脚步声，她抬起头，把对面的椅子往外推了推。</p>
        <p>“你来了。我们是从这里继续，还是换一种开始？”</p>
      </article>
      <p role="status" style={{ maxWidth: 680, margin: '40px auto', padding: '0 24px', color: 'var(--loom-color-text-muted)' }}>{notice}</p>
    </div>
    <Dialog open={Boolean(dialog)} onClose={() => setDialog(undefined)} closeOnBackdrop
      title={dialog === 'character' ? name : dialog === 'rename' ? '重命名故事' : dialog === 'delete-story' ? `删除故事「${title}」？` : `删除角色「${name}」？`}
      description={dialog?.startsWith('delete') ? '此处为交互预览，所有操作仅修改样例，不删除真实数据。' : undefined}
      actions={<><Button onClick={() => setDialog(undefined)}>取消</Button>{dialog !== 'character' ? <Button variant={dialog?.startsWith('delete') ? 'danger' : 'default'} onClick={() => {
        if (dialog === 'rename') setTitle(draft.trim() || title)
        if (dialog === 'delete-story') setScenario('opening')
        setNotice(dialog === 'delete-character' ? `模拟删除角色${includePlay ? '及游玩记录' : ''}${includeResources ? '、提示词资源' : ''}；保留样例以便继续体验。` : '样例操作完成。')
        setDialog(undefined)
      }}>{dialog === 'rename' ? '保存' : '确认删除'}</Button> : null}</>}
    >
      {dialog === 'character' ? <p>这里将打开当前角色的资料面板。右侧展开按钮独立控制故事快捷操作。</p> : null}
      {dialog === 'rename' ? <TextInput aria-label="故事名称" value={draft} onChange={event => setDraft(event.target.value)} /> : null}
      {dialog === 'delete-character' ? <div style={{ display: 'grid', gap: 12 }}>
        <label><Checkbox checked={includePlay} onChange={event => setIncludePlay(event.target.checked)} /> 同时删除该角色的游玩记录</label>
        <label><Checkbox checked={includeResources} onChange={event => setIncludeResources(event.target.checked)} /> 同时删除该角色的提示词资源</label>
      </div> : null}
    </Dialog>
  </main>
}
