# 多开场初始化与运行时 Swipe

> **状态**：多开场启动、节点页脚 Swipe、稳定 ID / 标题及单节点收缩已实施；当前合同以第 11 节为准，运行时 Swipe 未实施
> **更新**：2026-10-14
> **本轮范围**：角色预览、显式开始、删除返回，以及首条故事输入前的开场切换。独立 Agent 工作区与运行时 Swipe 不在本轮范围。

## 1. 已确认边界

以下保留 10 月 2 日历史合同。“创建即锁定开场”已由第 9 节的新合同替代；当前实施结果见第 10 节。

- 多开场本质上是初始化位置的 Swipe 候选：角色包可以提供多个开始，玩家也可以自编新的开始，不限于作者默认内容。
- 一个开场候选可以包含连续多段 Narrative；现有 `opening.entries` 是一套开场的内容序列，不是候选列表。
- 创建 Timeline 时只加载选定候选。创建完成后开场选择失效，不在该 Timeline 上继续切换开场；换开场需新建 Timeline。
- 开场选择只用于初始化，不要求在 Timeline 中建立开场候选切换状态。
- 运行时 Swipe 只允许针对最新一条 Narrative。历史节点不允许重新 Swipe，改走从该节点创建显式分支。
- 切换已有候选不等同于重新生成；旧候选保留，运行时 Swipe 不作为显式 Narrative 分支呈现。
- “如何产生新候选”与“如何切换已有候选”是不同操作，具体生成入口及 Session 联动尚未确认。

## 2. 初始调研源码快照（2026-10-02，实施前）

本节保留最初的问题定位，不代表实施后现状；已完成的变化见第 8 节。

| 范围 | 当前事实 | 证据 |
| --- | --- | --- |
| Opening | `OpeningChatContent.entries` 表达连续内容；创建时整套写入 Narrative | `packages/application-runtime/src/types.ts`；`packages/application-runtime/src/runtime/narrative-runtime.ts` |
| 初始化入口 | Runtime 支持传入 `openingNodes`，客户端创建入口目前只传 `cardId` | `apps/studio-client/src/features/narrative-runtime/model/use-narrative-runtime.ts` |
| ST 卡片兼容 | 类型声明 `alternate_greetings`，转换只使用 `first_mes` | `extensions/st-data-compat/src/types.ts`；`extensions/st-data-compat/src/normalizer/card.ts` |
| ST 聊天兼容 | 只导入当前 `mes`，不转换候选和选择信息 | `extensions/st-data-compat/src/parser/chat.ts` |
| Session 重放 | 投影重放工具调用及配对结果，不根据 Narrative 当前路径排除旧调用 | `packages/application-runtime/src/agents/session-history.ts` |
| 正文所在位置 | 官方 `append_narrative` 正文在调用参数中，结果只返回节点与目标 ID；其他工具结果可能含正文 | `packages/application-runtime/src/agents/official-tools/append-narrative.ts` |
| 写入来源 | 工具追加节点记录 `agentSessionId` 和 `runId`，当前没有 Swipe 候选工作段关联 | `packages/application-runtime/src/runtime/agents-runtime.ts` |

SillyTavern 本地参考：`/Users/macbookair/SillyTavern/public/script.js` 的 `getFirstMessage` 将默认与备选开场放进第一条消息的 `swipes`；`swipe` 向右越过末尾可能生成新候选。本项目不自动继承该越界生成行为。

## 3. 开场初始化实施合同

1. 收束角色包候选结构、默认项、现有单套 Opening 的读取与包文件兼容方式，不把连续 entries 改解释为候选。
2. 讨论角色编辑和开始游玩的 UI：候选维护、选择预览、自编开始，以及是否提供空白开始。自编内容是否保存回角色包须明确，不能隐式写回作者内容。
3. 在确认的数据合同内补全 ST `first_mes` 与 `alternate_greetings` 的转换，并接入初始化选择。
4. 用定向转换与创建 Timeline 检查验证只加载所选内容、不串入其他候选；人工验收 UI。

实施合同：保留 `opening.entries` 为默认开场，增加 `opening.alternatives` 保存备选内容序列；未选择时仍使用默认项。创建请求用索引选择作者候选，或用既有 `openingNodes` 提供临时自编 / 空白开始；两者互斥。作者候选在服务端渲染宏，不在 Timeline 中保存候选切换状态。编辑页维护候选，初始化入口选择与预览；自编不写回角色包。

写集：Runtime Opening 类型 / 归一化 / 创建、RPC、角色包文件编解码、ST 转换、Client 角色编辑与初始化入口、对应定向测试。主要验证导入和包往返不丢候选，以及创建只写所选候选。

**非目标**：不新增运行时 Swipe API、Session 分支、摘要失效机制或历史 Swipe UI。ST 聊天候选恢复待运行时合同确定，不混入开场导入。

## 4. 运行时 Swipe 与上下文的真实冲突

现有已配置 Narrative Context 来源时，默认剧情区读取来源已发布的 Memory/Raw 范围，不自动跟随每次原始 Head 更新。尚未采用的正文主要通过当前 Session 工作段的工具调用 / 结果进入模型上下文。

Session 交接写入 `work-summary` 后，交接之前的整个工作段退出后续 Prompt；原始 Transcript 不删除。既有计划明确不采用逐条剜除正文写入工具的整理方式。未配置来源的旧宿主仍有最近 100 节点的被动回退，不能把新合同描述成所有宿主的当前行为。

因此只替换 Narrative Head 不足以实现 Swipe：

- 旧正文仍可能存在于调用参数、Content Tool 原始输入、结果、读取记录和后续助手消息中；只删除旧 Tool Result 不会隔离旧候选。
- 工具调用与结果必须保持协议配对；不能把未完成或已执行的调用伪装成另一候选的调用。
- 同一 Run 可能写多个节点，并修改 State 或资源；`runId` 不能直接等同于一条 Narrative 的候选边界。
- 最新节点也可能进入已发布 Raw、已准备的剧情摘要或 Session 工作摘要；“只允许最新”不自动证明它尚未总结。
- 同一 Timeline 可以有多个 Session；清理一个 Session 不代表其他 Session 已遗忘旧候选。

正式合同与既有计划：

- [默认剧情上下文来源](../../architecture/application/extension/narrative-context.md)
- [剧情记忆与统一刷新策略](./narrative-memory-and-refresh-policy-plan.md)
- [Agent 上下文骨架与 Session 生命周期](./agent-context-skeleton-and-memory-projection-plan.md)

## 5. 待讨论，不作为实施决定

不预先引入通用 Session 分支系统。先明确 Swipe 新候选究竟是在同一工作历史中“修订”，还是需要从产生旧候选之前的共同上下文重新尝试。

若要求独立尝试，候选必须拥有可识别的工作段起点与作用范围：原 Transcript 保留，但下一次模型请求不应混入未选择候选的工作段。如何实现投影选择、保留共用前缀，以及是否允许产生 State / 资源副作用，均未定；这不是已存在能力。

若采用同一 Session 中追加修订说明，旧候选继续被模型看到，虽不需要 Session 分支，但不满足候选间上下文隔离。不能将此方案称为等价的独立 Swipe。

需要收束的最小问题：

1. 新候选是否必须从旧候选生成前的上下文重新尝试，还是允许读取旧候选后修订？
2. 一个候选的工作段如何界定，特别是一次 Run 多次写 Narrative、写入后继续工具操作的情况？
3. 已总结 / 已交接的最新节点是否仍允许 Swipe；若允许，谁负责撤销或重建相关投影？
4. 候选关联的 State 和其他持久化副作用是隔离、禁止，还是有明确恢复语义？

这些边界收束前不设计通用 Session 分支、表结构或公共 API。

## 6. 前期只读调研记录

- 已记录开场初始化与最新节点 Swipe 的已确认边界。
- 已只读追踪 Opening、ST 转换、Narrative Context、Session 历史重放与官方正文工具。
- 仅新增本计划并登记索引；未修改业务代码、未运行测试 / 构建 / 模型 / 浏览器。
- 检查本次文档 Diff 与相对链接。运行时行为、候选隔离及 UI 尚未实现或验收。

## 7. 运行时持久化试行方向（2026-10-02）

用户已接受以下方向继续设计，不代表授权本轮实现运行时 Swipe：

- 替代单位是本次输入产生的整个 Run 工作结果，不只是最后一条正文。入口只出现在最新结果，历史结果改走显式分支。
- 在 Application Data 的现有 SQLite 中保存 Timeline 所有的选择组与候选尝试，不放浏览器 Storage 或扩展私有 KV，不复制整个 Session。
- 选择组关联 Timeline / Narrative Branch / 本次输入节点 / 共同 Session 历史终点 / 当前候选 / 关闭状态；候选关联 Session、Run、工作记录范围与 Narrative 范围。
- 正文和 Transcript 仍存原所有者，关联记录不复制内容。生成独立候选时只投影共同历史与本次输入；继续时只投影选中候选。未选工作段不进入后续 Prompt 或总结。
- 下一次输入被接受时关闭选择窗口；关闭不等于删除，重启不得恢复切换能力。
- 第一版不自动清理未选候选。删除 Timeline 时关联记录纳入既有软删除事务；物理清理不在此处另建系统。
- 候选选择与 Narrative 路径更新应事务提交并检查最新 Head；工作段不能仅凭一个 runId 推断。

开放边界：Run 修改 State、资源或外部系统的副作用如何隔离 / 恢复；已被摘要覆盖的最新结果；多 Session 和单独删除 Session 的关联保留。未解决前不能承诺任意 Run 可 Swipe。

## 8. 多开场实施结果（2026-10-02）

- [x] 默认 Opening 不变，新增 alternatives 内容序列；角色编辑页可新增、编辑和删除备选开场，每套支持多段内容。
- [x] 角色开始弹窗与尚未初始化的 Narrative 预览可选择候选，提供临时自编与空白开始。初始化完成后不显示开场切换控件。
- [x] 创建请求支持 openingIndex，和 openingNodes 互斥；选择作者候选在 Runtime 渲染宏，临时自编保留原文。expectedCardVersion 防止过期选择加载其他候选。
- [x] 包 ZIP 与目录编解码保留备选正文及顺序，默认文件路径不变；更新正式文件合同。
- [x] ST 导入保留 alternate_greetings；没有 first_mes 时将首个备选作为默认开场，其余继续作为备选。
- [x] 定向验证：`opening-selection.test.ts` 的 2 个测试通过，覆盖 ST 转换、ZIP / 目录加载、默认 / 多段备选 / 自编 / 空白初始化、非法索引、互斥输入、RPC 校验、过期 Card、编辑不影响既有 Timeline、导出保留候选。
- [x] Client 与 Server 定向 TypeScript 检查通过；Runtime 与 ST 导入扩展 TypeScript 编译通过。相关 tracked Diff whitespace 检查通过。
- [ ] 人工 UI 验收：角色编辑、开始选择、长文本、多段开场及自编交互；没有启动浏览器或调用真实模型。

预览运行于 `http://127.0.0.1:5174/`，复用既有 4173 后端；页面、新增组件与 SCSS 的 HTTP 加载检查均为 200，仅证明开发加载，不证明浏览器交互。

交付限制：`.gitignore` 的 `/extensions/` 忽略整个本地扩展目录。`extensions/st-data-compat/src/normalizer/card.ts` 已修改并编译，但不会出现在主仓库 Diff 中；未修改忽略规则或强制加入版本控制。

本轮不含运行时 Swipe 存储、Session 候选投影、候选副作用恢复、ST 历史聊天候选恢复或真实模型验收。未触碰无关并发改动。

## 9. 启动交互与初始化生命周期调整（2026-10-13）

### 9.1 背景与目标

开场不一定是供阅读的正文。作者可能在其中嵌入作品介绍、鸣谢、依赖检查、开场导航和初始化表单，也可能通过独立面板或全屏角色 UI 完成配置。ST 生态常通过首楼 HTML 切换其他开场，再发送初始化用户消息让 AI 写变量，或由脚本直接写变量。上述流程是兼容需求背景，不表示 Loom 已具备这些脚本 API。

因此，不能把角色详情里的文本选择弹窗作为唯一启动入口。开场需要能在主叙事画布中展示；“查看与配置开场”“创建 Timeline”“开始运行 Agent”是需要分别约定的动作，不能隐式捆绑。

### 9.2 已确认的交互决策

- 删除当前 Timeline 后，回到对应角色的开场展示；此时没有新的 Timeline，不自动补建记录，也不自动启动 Session 或 Run。
- 无 Timeline 的开场底部显示胶囊样式的“开始一个新故事”按钮。用户点击后才创建 Timeline；进入预览、切换预览开场、关闭面板或删除记录本身都不是创建动作。删除后返回的预览也必须重新点击此按钮，不能直接继续游玩。
- 预览允许 HTML 展示和不依赖故事载体的本地交互，但不挂载 Timeline，也不启动该故事的 State。依赖 Timeline / 故事 State 的读取、写入、消息发送和运行操作须在实际调用边界（API / ctx 等）明确拒绝，不能只靠禁用按钮限制，也不能隐式创建载体、借用旧 Timeline 或回退到全局 State。
- 点击开始后，只有成功创建并挂载 Timeline、准备好对应故事上下文，才开放依赖该载体的操作。创建未完成或失败时仍不能游玩，不将预览期被拒绝的调用排队到创建后自动重放。
- 角色详情提供“继续上次叙事”“开启全新叙事”“预览”三个独立入口，不再让单一“开始新叙事”及其文本弹窗承担全部启动流程。
- “继续上次叙事”指向已有 Timeline，不能在找不到记录时静默创建；“预览”进入无 Timeline 的开场展示；“开启全新叙事”立即创建新的 Timeline 并进入初始化，不增加第二次开始确认，也不悄悄复用已有存档。预览底部的“开始一个新故事”与该入口采用同一创建语义。
- 多开场与临时自编开始的已有能力继续保留。新的入口不能退化为只能加载作者默认开场，也不能把临时自编内容隐式写回角色包。
- 删除非当前 Timeline 不应打断正在查看的叙事。删除请求完成时若用户已切换目标，也不能把用户拉回被删记录的角色预览。
- 切换开场只表示选择另一个开场候选，不是清空或重新初始化整个工作区。宿主用户输入框中的未发送内容必须保留，不能因候选变化重置输入草稿；其他编辑内容也不能被顺带清空。
- 不因切换开场自动清空变量、重置世界书或回滚脚本副作用。作者负责脚本的初始化时机、重复执行安全以及自身变量 / 世界书系统的可回溯性；平台继续执行既有权限与写入边界，但不承诺撤销任意脚本行为。
- 在已创建的 Timeline 中，第一条用户故事消息成功写入后锁定开场；需要新的开始时新开 Timeline。独立 Session 中编辑世界书不属于用户故事消息，不影响开场选择。
- 不以普通输入框首次发送或作者表单提交创建 Timeline。作者表单是作者 UI，不另设宿主级“表单提交”生命周期：若它发送用户故事消息，走既有消息发送路径；若只填写或修改配置，不据此创建 Timeline 或锁定开场。
- 无 Timeline 不等于禁止 Agent 工作。玩家在预览时让 AI 修改世界书、创作者直接编辑角色资源都是有效需求，不应为此强制创建 Timeline；资源写入仍遵守其原有归属与权限。

这组决策解决的是“不因查看或删除而自动产生新存档”，不需要为此引入一套虚拟 Timeline 或自动清理系统。

### 9.3 待收束的产品与持久化边界

独立 Agent 的交互与 VFS 权限已划归另一模块，不再作为多开场实施的待定前置项。

**继续与初始化记录识别**：本轮复用现有最近更新语义，“继续上次叙事”选择该角色 `updatedAt` 最新的记录，不受列表展示排序影响。未新增已有初始化记录提示或专用入口；不能只凭“没有 Session”或“只有开场节点”推断没有用户配置，更不能据此自动删除或重置。

2026-10-14 纠正讨论范围：删除此前列出的“独立表单提交边界”和“首次发送创建 Timeline”待定项。这两项由讨论额外引入，不属于当前启动设计。创建由显式开始入口完成，开场锁定沿用第一条用户故事消息成功写入这一事实，不为作者表单另建状态、事件或协议。

Timeline 级变量仍须有明确的 Timeline 目标；独立 Session 是工作记录的载体，不是虚拟 Timeline，也不替代故事变量所有者。世界书等已有独立所有者的资源不受这一载体要求限制。不因这一需求新增预览草稿数据库，或把缺失 Timeline 的写入转到全局 / 其他故事。

用户主动新开导致的多个 Timeline 可以真实存在。本轮不规定每角色只能有一个初始化 Timeline，不新增自动回收策略，也不把删除变成原地重置或复用已删除 ID。

### 9.4 已核对的接线位置与实施范围

以下仅用于后续定位，不是已完成变更：

- `apps/studio-client/src/features/narrative-runtime/model/use-narrative-runtime.ts`：现有删除路径会在删除当前 Timeline 后清理当前叙事 / Session 展示并退回角色预览，不自动创建替代 Timeline；创建与预览重置逻辑可作为后续接线基础。
- `apps/studio-client/src/shared/studio-shell/use-studio-navigation.ts`：负责删除后的路由上下文清理。后续需要让主画布实际可见，并保留“不覆盖用户后来导航”的边界。
- `apps/studio-client/src/widgets/character-panel/character-panel.tsx` 与 `apps/studio-client/src/app/studio-panel-registry.tsx`：角色详情三个入口及旧开始弹窗的调整位置。
- `apps/studio-client/src/app/app.tsx` 与 Narrative 展示组件：无 Timeline 开场的展示、候选选择及底部“开始一个新故事”入口。

先完成产品边界确认，再确定最小写集。初始化期间的 State / 脚本能力不伪装成纯 UI 接线；运行时 Swipe 的 Session 投影与持久化设计仍独立留在第 7 节，本轮不实施。

### 9.5 后续验收要点

- 删除当前 Timeline 后显示所属角色的开场与开始按钮；没有替代 Timeline、Session 或 Run 被自动创建。
- 删除后返回预览时，原 Timeline / State 上下文不能继续被 HTML 或其桥接调用使用；本地 HTML 交互仍可进行，但直接调用依赖故事载体的 API / ctx 也会明确失败。必须再次点击“开始一个新故事”，成功创建并挂载后才可游玩。
- 进入预览和切换候选不增加 Timeline；显式开始使用当前选定内容，包括备选、自编及空白开始，且重复点击或请求失败不会造成无提示的重复记录。
- 继续入口打开正确的已有记录；无记录时不隐式新建。预览与全新入口按最终确认的时机创建或不创建。
- 普通消息发送不隐式创建 Timeline；已有 Timeline 的第一条用户故事消息成功写入后锁定开场。作者表单若发送消息，遵循同一路径；单纯配置操作不作为锁定条件。
- 异步删除或创建完成时，不能覆盖用户已切换的目标；删除非当前记录不改变当前画布。
- 富文本 / iframe 开场沿用主画布渲染路径，底部胶囊可达且不被输入区遮挡。渲染可见不等于脚本 API、变量写入或初始化表单联动已兼容，需分别验收。
- 在输入框保留未发送文字时切换开场，文字保持不变；候选切换本身不清空已有变量或世界书配置。宿主不承诺为被卸载的作者 iframe 自动保存内部表单状态，作者 UI 的生命周期合同应另行明确。
- 在无 Timeline 的角色预览中通过独立 Session 执行已授权的资源编辑，不自动创建故事、不写 Narrative 输入节点，也不因此关闭开场选择窗口。

### 9.6 与通用 Agent / 主写作计划的衔接

相关计划：[Agent 通用触发与主写作常驻配置](./agent-trigger-and-standing-resource-bindings-plan.md)。该计划已将通用 Session 投递与 Timeline 的默认写作接收关系分离，后端主写作配置仍是计划而非已实现事实。预览中的 AI 资源编辑应沿用通用执行能力，不扩展“主写作”的含义来承接所有 Agent 使用场景。

本轮定向源码核对：

- `packages/application-runtime/src/runtime/agents-runtime.ts` 的 `createAgentSession` 接受可选 `timelineId`，Run 解析也允许无 Narrative 目标；[Session 合同](../../architecture/application/agent/runtime-and-session.md) 将 Session 定义为持久化 Agent 工作上下文，而非 Timeline 的必选子对象。
- `use-narrative-runtime.ts` 已有无 Timeline 的创建、`standalone: true` 列表、Transcript 恢复及直接 Agent 发送路径；`createAgentSession(..., makeMain)` 在无 Timeline 且要求主写作时另有创建 Timeline 的路径。不能把这一主写作捷径用于独立资源编辑。
- `widgets/sessions-panel/sessions-panel.tsx` 已区分独立 Session 与 Timeline 下的 Session；现有 Agent Chat 也有创建与选择对话组件。因此不是从零新增 Session 存储，而是检查并补齐跨角色预览、资源编辑与独立对话的可发现性和导航连续性。

后续 UI 建议，尚未确认为实施合同：复用 Agent Chat 作为通用对话入口，独立会话继续在既有会话列表中展示、恢复和管理；从角色或世界书编辑处唤起时，明确展示目标资源引用。新建故事不自动把创作会话改绑成主写作 Session，也不搬移其 Transcript；用户查看故事与查看工作对话的状态应分别表达。

独立 Session 的持久化历史沿用既有 Session Store，不随关闭角色预览自动删除。主写作计划负责通用投递与写作接收合同，本计划记录初始化对这些能力的需求；不在两处重复设计第二套 Session 或 Run 服务。资源工具在无 Timeline 环境中的具体可用性、目标传递与权限，仍需按真实工具链验收，不能仅凭 Session 可创建就宣称资源编辑全链路已完成。

### 9.7 非游玩 Agent 的范围收窄：主动探索资源

用户进一步确认：这里的主要任务是资源编辑、开发与微调，不需要复制游玩时的世界书触发与被动注入方式。Agent 可以主动探索应用资源，再读取和修改任务所需的内容。

- 继续复用独立 Session、现有 Agent Preset、Prompt Build 和 Run；不创建占位 Timeline，不新增一套创作专用 Prompt Build。
- 不为编辑任务补齐“当前预览角色 -> 自动采用角色世界书 / 宏 / 故事变量”的隐式链。预设自身必要的工作指令与工具说明照常构建，编辑对象的正文不因当前页面选中它就被动注入。
- 该独立模块聚焦应用资源如何通过 VFS 向非游玩 Agent 呈现，以及发现、读取、修改的权限和既有写入保护。采用 CodeAgent 式工作区方向：从一个角色内开启时，默认可查看该角色资源；跨角色访问另行授权。目标引用可以作为主动探索的起点，不等于采用该资源参与角色扮演；默认查看不等于无条件修改或执行权限。
- VFS 可发现 / 可读取的资源集合与本次 Prompt 被动采用的资源集合需要分别表达。不能要求先把世界书注入 Prompt，才允许 Agent 找到并编辑它；也不能因此放开对整个应用资源的无条件写入。
- 编辑资源定义不等于执行其脚本、处理器或故事初始化。需要真实故事历史 / Timeline State 的运行与测试仍要求明确目标，不伪造运行环境，也不承诺任意角色脚本可在无 Timeline 下执行。

定向源码线索：`agents/agent-turn.ts` 已在无 Narrative 时传入 `workspaceResourceAccess: true`，既有 Prompt Resource 搜索 / 读取 / 更新工具也检查这一工作区访问边界；但同处的 `vfsResourceIds` 当前取自 Prompt 资源读取集合，`agents/codeact/context.ts` 将这些 IDs 交给资源 VFS。后续应优先核对 VFS 目录发现与权限是否仍受被动采用集合限制，并复用已有工作区资源能力，而不是先改造角色上下文注入。这里记录的是源码接线与核查目标，尚未验证完整资源编辑行为。

独立 Session 的 UI 唤起与恢复仍需讨论，但不再以补全游玩上下文为其前置条件。上述收窄不授权本轮修改 VFS 权限、资源访问实现或正式公共契约。

**范围归位**：用户明确将上述 CodeAgent 式工作区能力划归另一模块。本计划仅保留需求与衔接记录，不在多开场任务中继续设计或实现独立 Agent 工作区，也不要求先完成该模块才能调整开场流程。本主题回到“无 Timeline 预览 -> 显式创建 Timeline 并初始化 -> 正式故事提交后锁定开场”，以及删除返回预览、候选切换保留输入草稿的合同；运行时 Swipe 仍不混入本次开场调整。

**讨论阶段记录**：本节决策先写入计划，未据讨论直接修改业务代码。后续用户明确授权“OK 可以开始实施了”，实施结果另记于第 10 节。

## 10. 启动流程实施记录（2026-10-14）

### 10.1 模块与持久化合同

- CharacterPanel / 面板注册负责三个入口；Navigation 负责进入角色预览与删除当前故事后的路由清理，并保护请求期间发生的新导航。无已有记录时继续按钮禁用，不能隐式新建。
- NarrativeTimeline 复用主画布展示开场与候选控件，无 Timeline 时在开场底部显示“开始一个新故事”胶囊。全新入口立即创建，预览仅由胶囊显式创建。创建期间重复点击由同一 Hook 的在途保护拦截。
- `use-narrative-runtime.ts` 负责显式创建、候选替换、草稿保留与异步结果归属校验。移除消息发送及无 Timeline 的 make-primary Session 操作中的隐式创建路径；独立 Session 的既有能力不受此变更扩展或替代。
- `NarrativeTimeline.opening` 持久化 `{ index?: number; nodeIds: string[] }`，表达初始化窗口与当前开场路径，不保存运行时 Swipe 候选。SQLite v4 增加可空 `opening_json`；旧记录不依据节点形态猜测初始化状态，保持锁定，归档导入也不重新开放。
- Runtime / RPC 的 `replaceNarrativeOpening` / `replaceOpening` 校验角色版本、当前分支 Head 和 State Head；Store 事务要求唯一当前分支及完整开场路径，只替换开场节点，不重置 State、世界书或 Session。首条用户故事输入持久化即关闭窗口；追加其他正文或显式分支同样不再属于纯初始化，不允许借开场替换删除这些内容。
- 编辑初始化开场正文不关闭窗口，而是移除作者候选 index、记为自编；分支局部编辑同步映射开场 nodeIds，仅在完整初始化路径内移除被替换的旧后缀。已锁定故事的普通编辑不重开窗口，也不删除其原历史节点。
- 候选与空白开场直接应用；自编开场通过确认图标应用，未应用时不发送故事消息。临时自编不写回角色包。候选切换保留宿主故事输入与 Agent 输入草稿，不承诺保存被卸载 iframe 的内部表单。
- Client Extension 与 Loom Script 的故事 State 读取校验当前挂载 Timeline / branch，并在异步读取返回时再次校验，避免离开故事后的迟到结果继续供预览使用。缺失载体明确拒绝，不回退全局 State；原有显式全局能力不改为故事能力。

### 10.2 验证与范围

- 角色入口及导航四份测试：17 项通过。
- Timeline 选择、Client Extension 与 Loom Script 三份测试：78 项通过，覆盖预览禁止隐式创建、重复开始、替换保留草稿、迟到结果与 State 上下文拒绝。
- Narrative 编辑保存及画布两份测试：14 项通过，包含预览胶囊的显示、创建中禁用与创建后隐藏。
- Session 生命周期、提交失败、编辑顺序、Run 恢复与 Hook 五份测试：58 项通过；测试以显式 Timeline 创建为前置，不使用虚假默认 Timeline 绕开约束。
- 客户端项目引用类型构建 `tsc -b apps/studio-client --pretty false` 通过。新文案同时补齐工作区已有中、英、日、韩词典所要求的键，没有重写其他语言改动。
- Store / Runtime 初始化两份测试最终 15 项通过，覆盖开场编辑后继续切换、State 保留、冲突与正式提交后锁定；补充修改的 Application Data 定向 TypeScript 检查通过。最终 Diff 空白检查通过。

本轮开发预览：`http://127.0.0.1:18012/`，复用既有 `18010` 后端，不占用或关闭原有 `18011` 客户端。首页、App 模块及画布 SCSS 的 HTTP 加载均为 200，仅证明开发资源可加载，不替代浏览器交互验收。

尚需人工验收：角色详情三个按钮、长 HTML / iframe 开场底部胶囊的可达性、自编确认与删除返回预览。本轮不调用真实模型，不宣称 ST 的任意 HTML 脚本 API、全屏脚本、表单变量联动已经兼容；运行时 Swipe、独立 Agent 工作区及任意脚本副作用撤销均未实施。

### 10.3 尾部 Swipe 入口调整

按后续确认，将开场切换从画布顶部移到 Narrative 节点自身页脚最右侧，工具栏在其左侧，不在正文外独占一行。显示 `< 1/2 >`：左右按钮只切换已有作者开场，边界禁用，不越界生成；点击中间计数打开选择弹窗。多段开场放在最后一段页脚；空白开始也保留可切换的页脚。自编和空白开始保留在弹窗中，自编确认仍沿用既有应用操作。选中自编或空白时，以一个临时额外候选计数。

预览复用相同页脚：显示 `#1 · 预览 · Tokens`，序号只表达展示顺序，不虚构持久化节点或创建时间。Token 沿用原文统计，提示占位文案不计入正文。Swipe 常显，不跟随工具栏 hover 隐藏；需要真实节点的编辑、分支及链接操作不在预览中开放。

展示控件提取为 `shared/ui/swipe-control`，仅接收序号、数量和三个事件，未接入运行时 Swipe 或增加候选存储。当前角色开场合同只有 entries / alternatives，没有标题字段；弹窗暂用默认开场和备选序号，不将正文标题猜测成持久化名称。标题编辑与保存链路不在此次 UI 调整中新增。

## 11. 单节点开场与稳定身份（2026-10-14，已实施）

本节替代历史章节中的 entries、openingIndex、openingNodes、多节点开场及“缺少标题 / ID”的描述；此前结果保留为阶段记录，不是当前接口合同。

用户确认删除多节点开场，不实现旧 entries / openingNodes 格式兼容。每个候选为 `id / title? / content`，默认 opening 与 alternatives 外层保留；ID 在同一角色包内唯一，改标题、正文、顺序不改变 ID。新增或导入时分配并保存，包文件往返保留。标题只用于显示，缺省显示默认项或备选序号。

创建 / 替换用 `openingId` 选作者候选，或 `openingContent` 提供单段自编内容（空字符串为空白），互斥；删除 openingIndex / openingNodes API。一套开场最多创建一个 Narrative 节点。Timeline 的 opening 保存作者来源 ID、单个 nodeId、locked 状态以及必要的 custom 标记；锁定不删除身份，编辑正文可标记自编但保留来源。任意候选切换不自动执行世界书修改或回滚脚本副作用。

写集分工：主 Agent 负责 Runtime / Store / RPC / 归档与相关测试；Sol 实施者分别负责 Card 归一化、文件编解码、ST 转换，以及客户端模型、编辑器、选择控件及各自测试。SDK 初始化输入也收缩为单正文并携带可选 openingId。现有脚本桥接的完整读写入口不是本轮新增目标，不将数据身份就绪描述成任意作者脚本已经能调用。

验收：改名或排序后按原 ID 仍选中同一开场；导入导出保留 ID / 标题；一次开场只创建一个节点；初始化切换、编辑、首次输入锁定不丢作者来源身份；客户端标题编辑、ID 展示与尾部 Swipe 正常。按相关包往返、Runtime / Store 与客户端定向检查验收，不执行全仓测试。

移除旧接口时发现 ST 聊天迁移与客户端聊天导入借用 openingNodes 写入整段历史。为保留真实聊天，不将历史合并为单节点，也不保留多节点开场后门；新增专用 `importNarrativeHistory(cardId, title?, messages)`，沿用 Card State 初始化（不将历史当开场脚本重放）与同事务历史恢复，保留消息顺序、正文与时间。导入立即锁定，不创建临时故事，也不猜测作者候选 ID。

### 11.1 交付与验证

- 默认和备选均保存稳定 ID、可选标题、单段正文；角色编辑器可编辑标题并复制 ID。选择弹窗按标题显示，无标题时用默认项 / 序号。选择和持久化按 ID，数组位置只用于展示导航。
- Card / RPC / Runtime / Store / 包编解码 / ST 转换与 MVU 初始化均移除多 entry 开场路径。未实现旧结构迁移，也未重写已有 Timeline。
- Runtime / Store 等五组定向测试 60 项通过，覆盖排序改名、来源 ID、锁定、单节点、历史导入与归档；包测试 31 项、MVU 4 项、ST importer 9 项通过。ST 迁移适配器新增定向测试 1 项通过，确认完整历史和时间交给专用接口。
- 客户端编辑、导航、生命周期 41 项及开场定向 5 项通过；整体客户端项目引用类型构建通过。扩展本地构建成功，dist 已更新；扩展源码仍受既有 /extensions/ 忽略规则影响，未修改 Git 规则。
- 未通过项如实保留：客户端首次较大测试集有三项失败，分别是 EventSource Mock 缺少 removeEventListener，以及 switchBranch 返回 true/false 与旧 undefined 断言不一致。相关实现存在其他并发修改，未跑任务前基线，不断言确为既有失败。ST regression 的 Markdown 段落预期仍失败，正文原样断言通过，未修改渲染组件或段落规则。
- ST 全量迁移端到端仍在前置 application.importCardBundle 的 ExtensionHost 保留命名空间权限边界被拒绝；本轮只验证迁移适配器和历史导入 Runtime，不擅自放开权限，不宣称全量迁移已经可用。

未执行真实模型调用或浏览器视觉验收。标题字段、ID 复制及现有开场页脚样式由用户验收；任意作者脚本的开场读写桥接、运行时 Swipe 与独立 Agent 工作区仍不包含在本轮。

### 11.2 本地旧数据修复与无效卡可见性

用户随后授权对当前 SQLite 做一次性兼容转换，并指出单卡校验失败不应使角色列表消失。运行时不恢复 entries 旧读协议，改用维护脚本 `scripts/maintenance/migrate-single-opening.mjs` 显式修复已有数据；默认只读试跑，`--apply` 先通过 SQLite backup API 生成完整一致备份，再以同一 Changeset 转换。卡片通过 Document Store 写入新版本并保留旧修订，Timeline 元数据检查原值及实际 Head 后更新，不改正文节点或 State，不恢复已删除记录。超过一个 entry 的数据拒绝自动合并。

本机 `data/studio.sqlite` 已转换 3 张活动卡片、2 条活动初始化 Timeline；副本预演确认正文与 Narrative / Session 行数不变，正式转换完整性检查为 ok，再次试跑零待转换。Changeset 为 `chg-80986218-2372-4b8b-80e1-98ba1c72cdad`，完整备份为 `data/backups/before-single-opening-2026-10-13T18-24-40.402Z-f706f07e-928a-48f0-b564-bc9a20e34ab9.sqlite`。未改已删除卡片、已删除故事、历史修订或原始导入包快照。

角色列表在逐卡摘要边界返回显式校验错误，不因单张格式错误失败整页，也不将坏卡过滤掉；前端以灰色不合法项保留身份、名称和可读元数据，显示错误原因，禁止依赖合法内容的游玩和预览。详情不继续发起会失败的严格读取，删除仍可用。正常详情与写入校验继续严格，不静默修复坏数据。

无效卡摘要、角色面板和相关读取保护的四份定向测试共 19 项通过，包含一好一坏同时返回与严格详情仍拒绝坏数据。修复通过保留失败项实现，不用宽松归一化伪造合法正文。
