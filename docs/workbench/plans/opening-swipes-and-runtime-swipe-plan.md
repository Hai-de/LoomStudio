# 多开场初始化与运行时 Swipe

> **状态**：多开场初始化已实施 / 定向验证通过 / 人工 UI 验收待办；运行时 Swipe 持久化方向已记录，未实施
> **更新**：2026-10-02
> **本轮范围**：实施多开场初始化与 ST 备选开场导入；运行时 Swipe 仅记录设计。

## 1. 已确认边界

- 多开场本质上是初始化位置的 Swipe 候选：角色包可以提供多个开始，玩家也可以自编新的开始，不限于作者默认内容。
- 一个开场候选可以包含连续多段 Narrative；现有 `opening.entries` 是一套开场的内容序列，不是候选列表。
- 创建 Timeline 时只加载选定候选。创建完成后开场选择失效，不在该 Timeline 上继续切换开场；换开场需新建 Timeline。
- 开场选择只用于初始化，不要求在 Timeline 中建立开场候选切换状态。
- 运行时 Swipe 只允许针对最新一条 Narrative。历史节点不允许重新 Swipe，改走从该节点创建显式分支。
- 切换已有候选不等同于重新生成；旧候选保留，运行时 Swipe 不作为显式 Narrative 分支呈现。
- “如何产生新候选”与“如何切换已有候选”是不同操作，具体生成入口及 Session 联动尚未确认。

## 2. 当前源码事实

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
