# Session 总结实施

状态：2026-10-20 后端与记忆面板、Workspace 文件交互已接通；定向验证完成，调整后的视觉由用户验收。剧情总结扩展继续延期。

## 既定合同与实现

Session 保留一个当前有效 Markdown 摘要及不可变历史版本，固定贡献至 `@memory.session`；不建通用 Session KV、不提供摘要 VFS。Timeline 共同安排仍在 `/workspace/MEMORY.md`，通过 `@memory.workspace` 消费；默认 Preset 已增加该锚点，既有自定义 Preset 不强制改写。

`work-summary.boundary` 分开保存源记录截止位置、历史压缩位置、Narrative 来源及 State/Workspace 恢复依据。消费前选择来源相容的摘要，再载入未压缩的完整工作段；不按摘要自身 sequence 清理缓冲。退回来源之前、切到不同分支或撤销依赖的 MEMORY 写入时，排除新摘要并恢复旧摘要/历史。保留 Run 的正文不重复进入 Narrative Raw。

当前 Agent 的固定上下文快照执行宿主整理任务，沿用原 Preset、模型、来源 State；不新建独立总结 Session。提示明确标注压缩段和保留段。仅此任务提供 `submit_session_summary`，支持替换与精确 unified diff；普通写作不开放该工具，模型参数不能指定进度。原生工具不可用时采用已有 Content 协议。

工具结果先通过文本与完整 Token 容量校验，再准备采用。摘要与 MEMORY 在共享 Data Engine 事务中同时写入；采用前检查来源、Session 新摘要、完整 Run/工具协议及 MEMORY 原内容。其他文件可继续变化，但不能覆盖其他 Agent 已更新的 MEMORY。失败/取消不隐藏旧历史、不留下半份交接。

## 触发、配置与边界

- 用户确认默认摘要上限 5000 Token、缓冲 0 楼、同步整理。计量沿用项目 `o200k_base` 字面文本计数，不截断结果。
- Session 持久化 `summaryPolicy`；自动触发的初始调度值为 40 楼或上一完成工作段的最近请求估算达到 32000 Token，可通过 `updateAgentSession` 配置。32000 是调度阈值，不是 Provider 上下文容量声明；`enabled` 控制后续自动整理，不撤销既有摘要。
- 正常游玩在 Run 已结束后，于下一条正式 Narrative 输入持久化并交付写作时检查已完成来源。新输入不进入总结源。楼层增量从上次摘要源位置计数；非正文 Session 输入只走 Token 条件，没有楼层缓冲。
- 同步在下一次写作前采用并建立 Swipe 基线；异步在固定源上下文整理，前台继续写，Run 完成时采用已就绪结果。迟到结果在下一次安全输入边界采用，不承诺仅多保留两楼。
- 待处理任务仅在进程内保留，重启丢弃未采用草稿并保留全部原历史。已采用摘要和策略持久化；未实现后台任务跨进程续传。
- 旧摘要不重写。独立 Session 兼容其旧切段规则；绑定 Timeline 的无来源旧摘要不作为恢复凭据，回到可追溯历史。

## 文件与接口

- `application-data/src/agent/{types,store}.ts`：摘要元数据、策略迁移、完整 Run/工具边界校验。
- `application-runtime/src/agents/session-summary.ts`：来源计划、临时提交工具、容量/patch、异步准备与事务采用。
- `agents/session-history.ts`、`agent-turn.ts`、`runtime/agents-runtime.ts`：摘要选择、尾段保留、快照、触发、共享记忆注入与正文去重。
- `runtime/swipe-runtime.ts`：按实际退休边界判断 Session 是否可继续，保留原有候选隔离。
- Runtime/RPC：`summarizeAgentSession`、`getAgentSessionSummaryStatus`、`cancelAgentSessionSummary`；`updateAgentSession.summaryPolicy`。统一设置、状态展示、取消和手动整理 UI 留待下一轮。

## 验证与限制

7 个定向文件累计 48 项测试通过：包含旧数据库迁移、四种缓冲/异步组合、迟到采用、来源回退、共享写入冲突、独立 Session、patch、容量限制与取消。Application Data、Runtime、Server、Client TypeScript 构建通过。未执行真实 Provider 或浏览器验收；Content 传输复用既有解析器，本次模型模拟主要覆盖原生工具路径。

扩展执行 `agent-session.test.ts` 时 37 项通过、1 项失败：旧测试向另一 Session 重复提交同一正式输入，与现有 Swipe 的 `retry_required` 契约冲突；该拒绝分支在本轮前的 HEAD 已存在，未为迁就测试放宽契约。未修改该测试或扩展其修复范围。

默认 MEMORY 的消费已接通；任意 Workspace 文件的被动注入配置、文件管理 UI、剧情总结扩展及其存储仍未实施。


## 统一交互（2026-10-20）

入口：侧栏「记忆」与「状态」同级；Session 顶部「会话记忆」定位自己的摘要；Timeline 操作区「打开工作区」定位当前分支。独立 Session 不借用其他 Timeline 的 Workspace。UI 不创建第三份记忆数据。

记忆面板的「会话摘要」展示运行时同一来源校验逻辑选出的生效版本，提供手动总结、取消、状态刷新和当前 Session 的总结设置。设置位于右上角弹窗，不新增全局默认策略层。`getAgentSessionMemory` 返回生效摘要、有效策略与整理状态；已保存最新版本不必等于回滚后可消费版本。

「共享工作区」复用 Lore/预设使用的 `AssetWorkbenchLayout`、`FileTree` 和 `LongTextEditor`：左侧可折叠搜索树，右侧目录/文本编辑/安全图片预览，窄屏下钻。新建、改名、移动、复制、删除使用应用弹窗；上传下载通过 Workspace RPC，内容更新沿用 revision CAS，不接受客户端直接引用 Blob ID。图片仅预览安全位图，不执行 HTML/JS。默认选择 MEMORY.md；任意文件名不自动注入。

未保存文本按 API 实例、Timeline、branch、entry 保存在当前页面进程内；切换面板可恢复，关闭页面提示。外部版本冲突保留旧草稿，用户复制/刷新合并；自身成功 CAS 仅在文本基线未变时推进其他草稿的版本。已删除文件的草稿仍提供可复制入口。草稿不是已持久化工作区版本。

实现集中于 `apps/studio-client/src/widgets/memory-panel/`，通过现有面板注册、导航、Session 顶栏与 Timeline 操作接入。剧情总结尚未提供页面，不显示无功能占位标签。

### 交接可观测性修复（2026-10-20）

通用记忆入口优先选择右侧当前聊天 Session，并将首次选择固定到导航参数；手动总结明确展示所属会话。Session 聊天区展示交接状态、持久化任务记录和实际 `submit_session_summary` 参数，正式 `work-summary` 在历史中有可展开的交接提示。总结使用所属 Session 的上下文与模型，但仍是宿主交接任务，不伪造 CodeAct 或普通写作 Run。

任务审计使用 Session 所属的 `agent_summary_tasks` 表，与 Transcript 计数隔离，避免干扰异步写作的 CAS。采用状态与正式摘要同事务写入；取消和失败保留记录。重启后保留审计，但不恢复未完成任务。界面只轮询小型状态，状态变化时才刷新摘要或历史，不再定时重建整个 Session 记忆。

相关 Data/Runtime/Server/Client 类型检查通过，交接、历史和 HTTP RPC 三组集成测试共 18 项通过。额外运行的聊天组件旧单测中 4 项因直接调用已被 `memo` 包装的组件失败；该包装在 HEAD 已存在，此次未扩展修复测试体系。未重新触发用户的真实模型任务。原整机卡顿根因尚未确认；仅在手动总结期间收集浏览器 longtask 的次数与最长耗时，结束时出现阻塞才输出诊断，不记录会话正文。

验证：Data/Runtime/Server/Client 相关 TypeScript 构建通过；Session 生命周期、Workspace 基础与真实 HTTP RPC 共 15 项测试通过，新增覆盖生效摘要回滚选择、二进制字节往返、过期版本和伪造 Blob 写入拒绝。未进行真实 Provider 总结调用或浏览器视觉验收。

交接任务 UI 复用聊天的 `AgentToolActionItem`，进行中在折叠标题中显示旋转图标（遵循减少动画偏好）。输入框右下角在交接运行期间提供终止，中断后提供继续；继续重新发起总结请求，不恢复已取消的 Provider 流。异步正文 Run 存在时保留其按钮控制权，总结条目另有终止入口。Client TypeScript 构建通过；未触发真实模型请求，视觉及实际取消由用户后续测试验收。

### 人工修订与上下文范围（2026-10-20）

会话摘要支持显式编辑、放弃和保存，输入草稿不改变当前 Prompt；界面提示保存可能降低缓存命中。保存追加一个 `work-summary` 修订，保留源摘要的 retirement/source 边界及旧记录，不顺带退休新工作。保存校验有效摘要 ID、Session 记录计数、容量和分支快照；运行中或待采用的总结阻止人工保存，冲突保留编辑草稿。

记忆面板采用现有 MasterDetailWorkbench：左侧仅列所属 Timeline 的 Session（独立会话单列），标记当前聊天与主写作，支持最近更新、创建时间和名称排序。右侧左对齐显示摘要及三段范围：摘要替代、原文缓冲、交接后新增。范围使用会话消息编号，明确区别于 Narrative 楼层；数据库聚合消息计数，不向浏览器加载全部正文。聊天内分界以运行时当前有效摘要为准，回滚后重新计算，任务审计仍停留在自己的来源位置。人工修订不会被旧任务的去重显示逻辑吞掉。

验证：相关 TypeScript 构建及三组 20 项集成测试通过，覆盖人工保存后保留新工作、拒绝过期保存、HTTP 修订、回滚后取消摘要替代范围。未执行真实 Provider 请求或浏览器视觉验收。

导航与组件统一修复：删除记忆页通过 Effect 自动发布 `openMemory` 的逻辑，避免离开页面清空路由参数时重新抢占导航。默认 Session 在面板内部固定，用户选中列表项才发布导航。会话列表改用 Lore 同款 `AssetWorkbenchLayout` / `FileTree` / `SearchField`，排序使用公共菜单，摘要正文直接使用 `LongTextEditor` 预览及显式编辑入口。定向 DOM 测试覆盖切换时列表保持挂载，以及路由清空选择时不发起自动导航；Client 类型检查通过。

### 会话摘要入口调整（2026-10-20，替代上文记忆面板中的会话列表方案）

Session 摘要移入「游玩 → 历史」的 Session 详情，通过公共 PanelTabs 的「对话记录／摘要」切换。编辑、保存、容量设置及范围说明复用同一 SessionMemory 组件，组件归属 sessions-panel。聊天中的查看入口统一调用 openSessionSummary，直接定位目标会话的摘要 Tab；记忆 Dock 保留剧情记忆扩展入口和现有共享工作区。

游玩历史默认仅显示当前角色创建的 Timeline 及其关联 Session；「显示全部」展开其他角色及独立会话。直接定位跨角色或独立 Session 的摘要时，为显示目标自动展开全部范围，不更改当前游玩的角色。显式定位只应用一次，不随目录刷新抢回用户后续选择。测试已覆盖当前角色过滤及显示全部、记忆 Dock 不发布自动导航；类型检查通过。历史面板完整定向测试中，旧 ST 聊天导入用例的 RPC mock 与现有导入路径不匹配，未扩展修改导入流程。
