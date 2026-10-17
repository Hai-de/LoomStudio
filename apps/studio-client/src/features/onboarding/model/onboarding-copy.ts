import type { Locale } from '../../../shared/i18n/index.js'

const zh = {
  steps: ['选择语言', '连接模型', '认识助手'], titles: ['欢迎来到 LoomStudio', '选择故事的声音', '认识你的 Loom 助手'],
  descriptions: ['先选一种熟悉的语言。之后也可以随时在设置中更改。', '连接你使用的模型服务，让角色和助手能够回应你。', '她会陪你熟悉工作室，解答问题，也可以带你开启第一段故事。'],
  tagline: '让故事，从这里开始。', stepsLabel: '首次设置步骤', done: '已完成', back: '上一步', next: '继续', skip: '稍后设置', explore: '先自行探索', chat: '和她聊聊',
  language: '界面语言', account: '模型账号', newAccount: '添加 OpenAI 兼容服务', name: '账号名称', url: '服务地址', key: 'API Key（本地服务可留空）', model: '模型名称', save: '保存并继续', saving: '正在保存…',
  saved: '配置已保存，尚未发送请求验证连接。', modelNote: '选择的模型会用于内置助手；其他预设仍使用自己的配置。', quote: '你好，欢迎来到 Loom。我们可以先聊聊，你想创造什么样的故事？', builtin: '内置助手 · 无需下载',
  loading: '正在读取配置…', retry: '重新读取', unavailable: '暂未找到内置助手预设。可以先进入工作台，稍后在预设中检查。', guide: '点击 Agent 面板标题栏的“新建会话”，选择 Loom Assistant 后创建。发送消息后，助手才会开始回复。', dismiss: '知道了', missing: '请选择或填写模型名称。',
}
type Copy = { [K in keyof typeof zh]: typeof zh[K] }
export const onboardingCopy: Record<Locale, Copy> = {
  'zh-CN': zh,
  'en-US': {
    steps: ['Language', 'Model', 'Your assistant'], titles: ['Welcome to LoomStudio', 'Give your stories a voice', 'Meet your Loom assistant'],
    descriptions: ['Choose your language. You can change it later in Settings.', 'Connect a model service so characters and your assistant can respond.', 'She can help you explore the studio, answer questions, and start your first story.'],
    tagline: 'Your story starts here.', stepsLabel: 'Getting started', done: 'Completed', back: 'Back', next: 'Continue', skip: 'Set up later', explore: 'Explore on my own', chat: 'Meet the assistant',
    language: 'Interface language', account: 'Model account', newAccount: 'Add an OpenAI-compatible service', name: 'Account name', url: 'Service URL', key: 'API key (optional for local services)', model: 'Model name', save: 'Save and continue', saving: 'Saving…',
    saved: 'Configuration saved. No connection test has been sent.', modelNote: 'This model will be used by the built-in assistant. Other presets keep their own settings.', quote: 'Hello, welcome to Loom. What kind of story would you like to create?', builtin: 'Built in · No download needed',
    loading: 'Loading configuration…', retry: 'Reload', unavailable: 'The built-in assistant preset is unavailable. You can enter the workspace and check Presets later.', guide: 'Click New session in the Agent panel header, choose Loom Assistant, and create the session. The assistant responds only after you send a message.', dismiss: 'Got it', missing: 'Choose or enter a model name.',
  },
  'ja-JP': {
    steps: ['言語', 'モデル', 'アシスタント'], titles: ['LoomStudio へようこそ', '物語に声を', 'Loom アシスタントの紹介'],
    descriptions: ['使いたい言語を選んでください。設定からいつでも変更できます。', 'モデルサービスに接続して、キャラクターやアシスタントと対話しましょう。', '使い方の案内や質問への回答、最初の物語づくりをお手伝いします。'],
    tagline: 'ここから、物語が始まる。', stepsLabel: '初期設定', done: '完了', back: '戻る', next: '次へ', skip: '後で設定', explore: '自分で探索する', chat: '話してみる',
    language: '表示言語', account: 'モデルアカウント', newAccount: 'OpenAI 互換サービスを追加', name: 'アカウント名', url: 'サービス URL', key: 'API キー（ローカルでは省略可能）', model: 'モデル名', save: '保存して次へ', saving: '保存中…',
    saved: '設定を保存しました。接続テストは送信していません。', modelNote: 'このモデルを内蔵アシスタントに使用します。他のプリセットの設定は変更しません。', quote: 'こんにちは、Loom へようこそ。どんな物語を作りたいですか？', builtin: '内蔵 · ダウンロード不要',
    loading: '設定を読み込み中…', retry: '再読み込み', unavailable: '内蔵アシスタントが見つかりません。ワークスペースに入り、後でプリセットを確認できます。', guide: 'Agent パネル上部の「新しいセッション」から Loom Assistant を選んで作成してください。メッセージを送ると応答が始まります。', dismiss: '了解', missing: 'モデル名を選択または入力してください。',
  },
  'ko-KR': {
    steps: ['언어', '모델', '도우미'], titles: ['LoomStudio에 오신 것을 환영합니다', '이야기에 목소리를', 'Loom 도우미를 만나보세요'],
    descriptions: ['사용할 언어를 선택하세요. 설정에서 언제든 변경할 수 있습니다.', '모델 서비스를 연결하여 캐릭터와 도우미가 응답할 수 있게 하세요.', '작업실 사용법과 궁금한 점을 안내하고 첫 이야기를 시작하도록 도와드립니다.'],
    tagline: '이야기가 시작되는 곳.', stepsLabel: '초기 설정', done: '완료', back: '이전', next: '계속', skip: '나중에 설정', explore: '직접 둘러보기', chat: '대화하기',
    language: '표시 언어', account: '모델 계정', newAccount: 'OpenAI 호환 서비스 추가', name: '계정 이름', url: '서비스 URL', key: 'API 키 (로컬 서비스는 생략 가능)', model: '모델 이름', save: '저장 후 계속', saving: '저장 중…',
    saved: '설정이 저장되었습니다. 연결 테스트는 보내지 않았습니다.', modelNote: '이 모델은 내장 도우미에 사용됩니다. 다른 프리셋의 설정은 유지됩니다.', quote: '안녕하세요, Loom에 오신 것을 환영합니다. 어떤 이야기를 만들고 싶으세요?', builtin: '내장 도우미 · 다운로드 불필요',
    loading: '설정을 불러오는 중…', retry: '다시 불러오기', unavailable: '내장 도우미 프리셋을 찾을 수 없습니다. 작업실에서 나중에 확인할 수 있습니다.', guide: 'Agent 패널 상단의 새 세션을 누르고 Loom Assistant를 선택하여 만드세요. 메시지를 보내면 도우미가 응답합니다.', dismiss: '확인', missing: '모델 이름을 선택하거나 입력하세요.',
  },
}
