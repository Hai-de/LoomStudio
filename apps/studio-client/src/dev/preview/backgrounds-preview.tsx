import { useState } from 'react'
import { createTranslator } from '../../shared/i18n/index.js'
import { BackgroundMaterialsView, type MaterialValue } from '../../widgets/settings-panel/background-materials-view.js'

const backgrounds = [
  { id: 'wide', name: '横向图片', description: '横向图片与短名称', source: '预览资源', image: '/images/banner.png' },
  { id: 'long', name: 'scenery__wide_shot__architectural_interior__very_long_filename_without_spaces.png', description: '长名称与不同图片比例', source: '官方背景', image: '/images/default-card.png' },
  { id: 'square', name: '方形图像', description: '方形图像', source: '预览资源', image: '/images/logo.png' },
]

export function BackgroundsPreview() {
  const [selectedId, setSelectedId] = useState<string | null>('wide')
  const [material, setMaterial] = useState<MaterialValue>({ mode: 'glass', blur: 18, opacity: 62 })
  const [followState, setFollowState] = useState(true)
  return (
    <main style={{ padding: 20, minHeight: '100dvh', boxSizing: 'border-box', background: 'var(--loom-color-surface)' }}>
      <BackgroundMaterialsView t={createTranslator('zh-CN')} backgrounds={backgrounds} selectedId={selectedId} material={material}
        followState={followState} onSelect={setSelectedId} onMaterialChange={setMaterial} onFollowStateChange={setFollowState} />
    </main>
  )
}
