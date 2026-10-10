# 扩展的故事级采用与运行隔离

> 状态：实施中 / Timeline 采用与受管执行基础已落地，尚未完成端到端隔离。
> 日期：2026-10-07
> 本轮授权：按本计划实施基础能力；采用关系归 Timeline，不建设配置分支化。不操作现有角色卡或运行数据，不推送发布。
> 来源：[The World 世界状态与 AI 接入](./the-world-state-and-agent-plan.md)。平台问题在本计划收束，不作为 The World 的私有开关实现。

## 目标

全局安装扩展后，各故事可以独立决定是否采用它。暂停某个故事中的扩展时，其维护提示、工具、监听、定时总结、生成任务和写回统一停止参与，但保留资源内容和持久运行数据。恢复兼容扩展时沿用数据，不重复初始化。

覆盖 The World、记忆/总结、自动生图/配音等故事相关扩展。Provider、导入器及工作区管理等共享服务不强制变成每故事一份进程。

## 实施前基线

- Package、Module、Instance 已有分发、运行入口及激活生命周期边界，但不能据此声称已经支持故事级隔离。入口：`docs/architecture/extensions/README.md`、`packages/extension-sdk/extension-host/src/instance.ts`。
- 静态资源由包携带，安装时导入数据库并保留来源；模块停用释放执行器，不删除资源或挂载。当前 `extension-resource-access.ts` 按安装身份和角色范围判断资源可用性，没有统一故事级采用约束。
- Timeline 创建读取 Card 的 `stateContributionIds`，拒绝其他角色私有安装的贡献。当前创建链还会执行贡献初始化器，再组合、物化 State；未来采用链必须覆盖这个入口，不能只过滤最终 JSON。入口：`packages/application-runtime/src/runtime/narrative-runtime.ts`。
- The World 当前仍通过原始根 Binding 提供世界 JSON，正式贡献的 entities / componentMounts 为空。正式 EC 作者链收口属于原 The World 计划，不把业务 JSON 内的 components 当成已完成宿主 EC 声明。
- 以上为本轮源码核对；此前测试账目不构成本计划的实现或验收证据。

## 已确认原则

1. **平台是采用关系的唯一权威。** 用户是否允许某安装来源的扩展参与某个故事，由平台持久化。扩展读取有效上下文、接收变化并报告运行状态，不另存一份独立启用表作为第二权威。
2. **安装、代码加载和故事参与分离。** 全局安装只提供可用能力，不代表对所有故事运行；切换角色不要求用户反复操作全局 disable / enable。
3. **资源仍属于扩展。** “携带”描述归属，“导入”描述存储，“注册”描述运行能力。入库不使资源自动成为独立用户资源。扩展整体在目标故事中停用时，仍由该扩展拥有的资源一起停止参与；内容、挂载配置及来源记录保留。
4. **State 是运行数据，不是启用标记。** 不根据某个 world 路径存在与否、实体名称或同名脚本推断采用关系。暂停或卸载不自动删除 State；兼容恢复不重置已有数据。数据清理是单独的显式操作。
5. **约束不只针对 Prompt。** 工具、事件投递、后台任务及结果写回都要受同一目标的有效采用关系约束。扩展自己忽略事件，不替代宿主入口和提交时的检查。
6. **平台管资格，扩展管内部运行。** 暂停一个故事不要求销毁共享服务或整个 OS 进程。逻辑实例、上下文和任务必须隔离；物理进程拓扑不作为本轮产品决策。
7. **停止参与不等于立即完成清理。** 平台先阻止新的目标工作和失效任务后续写回，再取消并清理内部工作。区分用户请求状态与实际运行/清理状态；迟到结果不可写回，已经成功提交的变化不自动回滚。无法撤回的外部请求及费用如实报告。
8. **采用不能扩大权限。** 原有模块授权、安装范围和 Preset 工具限制仍有效。暂停是统一限制，恢复不是重新授权或强制打开用户关闭的能力。
9. **UI 焦点不是采用状态。** 任务持有明确目标，不因当前选中角色变化而重定向。是否后台继续运行需有明确策略，不能把切换面板当作暂停。
10. **采用关系归 Timeline。** 2026-10-07 用户修订此前 Branch metadata 方案：首版由平台持有 Timeline 级配置，同一 Timeline 的所有 Branch 共用采用关系，不塞进扩展业务 State。Fork、切换分支和恢复 checkpoint 不复制或回滚扩展启停配置；State 本身仍遵循现有分支修订规则。配置分支化是否存在真实需求尚未确定，本轮不实现，也不预建配置历史系统。
11. **首版不承担历史兼容。** 项目未发布，不建设旧扩展适配层、旧采用表迁移或双轨兼容模式。扩展可按新合同调整；不因此绕过身份、权限和并发检查，也不擅自删除开发数据。未来扩展数据版本变化的恢复检查与历史兼容层是两回事。
12. **恢复先核对身份与数据版本。** 使用作者稳定声明的命名空间 packageId 匹配重装身份，保留安装范围、已接受来源和数据版本约束；显式恢复，不因重装自动启动所有故事。首版不建设签名系统，自声明 ID 不代表发布者认证，同 ID 换源不能自动接管数据或授权。

## 建议的最小合同（待定稿）

- 首版以整个扩展在故事中的采用关系为主要开关，不提供任意模块/资源组合的条件配置语言。内部天气、总结频率等偏好仍归扩展配置。
- Manifest 声明故事参与能力及工作区服务/故事工作入口的边界；具体字段和生命周期 API 在运行入口核对后确定，不预先固化 Schema。
- 采用身份必须区分安装来源与运行目标。全局安装、角色私有安装以及版本恢复的映射不能仅凭 packageId 或显示名称决定。
- 角色卡声明新故事默认采用；新 Timeline 明确采用并执行初始化。中途添加必须预览贡献、权限、初始化及冲突，并通过受控提交完成，不能通过切换布尔值覆盖已有世界。
- 未加入、已采用、暂停、依赖缺失需要可区分；这些语义不要求创建多份相互覆盖的 enabled 状态。
- 每轮 Prompt/任务启动使用一致的采用上下文；提交时检查当前资格，防止暂停、恢复之后旧任务重新取得写入资格。
- 静态资源目录允许查看停用来源及诊断，但不得因为“仍可查看”就继续注入、执行。检查范围包括间接引用、工具返回的上下文和宿主自动行为，不仅顶层 Setting 挂载。
- 显式复制为独立用户资源后可脱离原扩展；普通编辑、导入或挂载不得隐式改变来源。

### 已落地的基础合同

- Manifest 的 `participation: "timeline"` 声明整个包需要故事采用；未声明的共享服务不强制故事化。声明随资源安装记录保存，变更声明要求显式包更新。无静态资源的 Timeline 扩展也建立安装记录。
- Card `extensionAdoptions` 使用 `{ packageId, target: "global" | "card" }` 引用，随 Card Bundle 导入导出，不持久化另一工作区的本地 cardId。该配置仅影响新 Timeline。
- `airp.timelineExtensionParticipation` 是平台持有的 Timeline 配置。每个条目记录安装身份、接受的安装版本、包版本、请求启用状态及执行代次；文档版本用于并发配置检查，执行代次阻断暂停前的旧工作。
- 新 Timeline 创建组合默认采用扩展的已注册 State 贡献，初始化、运行上下文、采用记录和 State 一起提交；提交前重查 Card、安装版本及贡献实例。未采用的 Timeline 扩展不能仅通过 `stateContributionIds` 注入。
- `ctx.timeline.list()` 返回当前可参与的明确目标；`ctx.timeline.run(target, work)` 创建受管工作。工具处理器由宿主自动进入该上下文；同一工作的嵌套调用不得改目标。State 提交在实际事务内再次验证执行代次。
- 暂停/恢复只改配置，不初始化 State。安装消失或版本变化后旧资格失效；同一声明包版本的重装已支持显式恢复预览/提交。接受来源记录独立保留，换源必须确认；跨包版本恢复仍明确要求数据兼容核对或迁移，不默认视为兼容。
- 中途加入已有 Timeline 已支持预览/提交。预览不执行初始化器；提交核对配置、安装、State、运行上下文及贡献实例版本后初始化，在同一事务写入目标 Branch State、运行上下文和 Timeline 采用记录。拒绝覆盖已有数据或绑定；失败不留下半采用状态。
- 新增绑定记录安装来源；缺少新增数据的旧 checkpoint 保留原样，其他 State 仍可修改，已存在的受约束组件仍禁止删除。已提供为已采用扩展显式补齐旧 checkpoint 数据的预览/提交与面板入口，只补缺失实体或组件、不覆盖已有值。
- 卸载只撤销安装记录，保留包携带资源、挂载和 State；显式“删除资源”仍是独立操作。
- 已接入扩展管理页的“故事采用”：角色卡的新故事默认配置与当前 Timeline 实际采用分开操作；加入先预览再提交，暂停不改卡默认，重装恢复换源需确认。已卸载来源保留记录并显示缺失。尚未完成浏览器操作与人工视觉验收。
- 新建和中途采用保存 State 原始声明快照及安装来源。重装恢复要求声明与当时接受的 JSON 完全一致；声明缺失或同版本修改均拒绝，不执行初始化器。该保守规则不尝试自动推导 Schema 兼容性。

模型调用、显式 Prompt 构建、State 事件、宏、Narrative provider、State content 和 Prompt processor 已接入受管执行。已接受 Prompt 及工具间接读取的来源凭据会进入后续 Step/恢复，通用存储和资产写回由同一 Data Engine 事务守卫复核。Client Module 按当前目标与有效采用建立实例。`ctx.timeline.subscribe` 提供目标集合失效通知；首版通用事件订阅只投递明确目标的 `state.changed` 和系统启停事件，不猜测 `data.changed` 的故事语义。其他领域事件和独立 Package 总开关不是首版自动扩展项。正式合同见 [Timeline 扩展采用](../../architecture/application/extension/timeline-participation.md)；自动化通过不代表人工或发行验收完成。

## 身份决定

2026-10-07 用户批准以下方向；不再把签名系统作为实施前置条件。

| 决策 | 已确认方向 | 边界 |
| --- | --- | --- |
| 扩展重装匹配 | 作者声明稳定的命名空间 ID，例如 `author.extension`；分开逻辑身份、安装范围、来源与内容版本 | ID 不是认证；来源变化须显式确认，签名暂缓 |
| 角色卡公共身份 | 沿用 Card Bundle 的 `artifactId`，与本地 `cardId` 分离；同一作品更新保留身份，独立派生作品另建身份并记录来源 | 不新增重复的 publicId，不建设身份注册中心；公共 ID 同样不证明作者真实性 |

### 身份现状与实施约束（2026-10-07）

已核对源码：

- packageId 来自作者提交的 `manifest.json.id`，不是每个用户下载时生成；相同包通常在不同用户处保持相同 ID。The World 当前为 `official.the-world`；名称中的 official 不构成认证。
- installationId 由 `packages/extension-sdk/src/installation.ts` 确定性派生。全局为 `extension-installation:["global",packageId]`；角色安装为 `extension-installation:["card",cardId,packageId]`。它表达安装范围，不验证作者；全局安装的同包在不同工作区可有相同字符串，角色安装受本地 cardId 影响。
- 下载链记录 Git/ZIP source URL，Git 记录 commit；已有包的远程替换检查来源冲突。角色内嵌包另校验 archiveDigest。入口为 `apps/studio-server/src/extensions/extension-download.ts` 和 `extension-manager.ts`。这些是来源/版本/内容约束，不是发布者签名验证。
- 运行 instanceId 用于一次激活的生命周期，不应用作重装后识别旧数据的持久身份。

实施约束：保留作者稳定声明的包身份，不用随机本地安装 ID 或 URL 替代跨用户包引用；单独保存用户接受的来源绑定和版本/内容标识。UUID、名称和内容摘要都不应冒充发布者认证。首版不建设签名、PKI 或扩展市场；未来确有发布者认证需求时再单独设计初次信任、换钥与派生包规则。

后台工作推荐遵循故事的有效采用关系，不跟随前台焦点。若需要“只在前台运行”，作为独立后台策略讨论，不混入采用表。

## 实施边界与工作包

用户已授权实施。先沿现有所有者收束 Manifest/SDK 与 Timeline 存储合同，再逐项实现；不为未来配置分支化新增存储、快照或迁移体系。

| 工作包 | 主要入口/预计写集 | 可观察交付 |
| --- | --- | --- |
| P0 合同收束 | 本 Plan；SDK、Host、Narrative、Prompt/工具及 Job 路径只读核对 | 落实 Timeline 配置归属，定下身份、声明与调用合同；不设计历史兼容层或配置分支化 |
| P1 采用关系与并发控制 | `packages/application-runtime/src/runtime/`、`packages/application-data/`，实际涉及的数据 Schema 待 P0 定位 | Card 默认与 Timeline 实际关系分离；中途变更有冲突检查，所有 Branch 共用采用关系；暂停后旧任务失效 |
| P2 执行隔离 | `packages/extension-sdk/src/`、`packages/extension-sdk/extension-host/src/`、`apps/studio-server/src/extensions/` 及具体 capability 入口 | 开始、暂停、恢复和清理有目标归属；旧任务与晚结果不可越过暂停边界 |
| P3 资源消费约束 | `packages/application-runtime/src/runtime/extension-resource-access.ts`、Prompt/工具准备链及 Client Renderer Host | 携带资源随统一采用关系参与，无需改写资源本身 enabled |
| P4 作者与故事 UI | `apps/studio-client/src/features/extension-renderers/`、`features/state-variables/` 和实际装配入口 | 展示来源、当前卡采用及故事有效状态；可预览加入、暂停、恢复和依赖问题 |
| P5 首个消费者 | `extensions/the-world/` 与原 The World Plan | 使用正式采用与生命周期合同，不保留独立启用表；EC 和面板缺口按原计划收口 |

不顺手改成每故事一个 OS 进程，不创建任意功能组合框架，不自动删除用户数据、不自动转换全部扩展、不按名称排斥多个记忆系统。纯 JS 取消不能强制终止任意第三方代码；未受管定时器/子进程的约束需在 SDK 支持范围中明确，不把生命周期 API 冒充安全沙箱。

采用资格按 Timeline 判断，State 读写仍必须携带准确的 Branch target，不把所有分支的数据合并。恢复到尚未包含扩展数据的 checkpoint 时，不因 Timeline 仍采用扩展就静默重建 State；应暴露缺失状态并走显式初始化流程。用于阻断旧任务的并发版本不等于可回滚的配置历史。

## 验收与验证

### State 来源诊断工作包（已实现）

- Runtime 在 `state/state-source-inspection.ts` 聚合现有 Card、工作区定义、贡献注册表、安装记录、Timeline 采用记录及 Runtime Context；通过 `application.inspectStateSources` 只读返回。没有新存储、第二份启用表或初始化调用。
- Client 在 State 面板增加“来源”页签，复用 FileTree / MasterDetailWorkbench。当前角色声明、工作区定义、扩展当前注册声明与 Timeline 已接受声明分开显示；采用资格和当前 Branch 数据存在性分别展示。暂停或卸载不隐藏已接受来源。
- 不在诊断页重复建设加入/暂停/恢复操作，不把当前 Card 配置冒充 Timeline 创建时的原始配置，不调整全局模块启停语义。
- 主要证据：真实 Runtime 的暂停/卸载保留、旧 checkpoint 缺失、安装范围过滤及查询无写入；Client 的目标/API 切换迟到响应与失败重试。公共 RPC/DTO 变化追加 Runtime、Server、Client 定向类型检查。人工视觉验收仍由用户完成。
- 定向测试发现创建链未保存绑定的安装来源，中途采用链则已保存。本轮补齐新 Timeline 的原始 Binding 与精确/批量 Component Mount 来源；归属以挂载声明为准，不以模板作者推断。不迁移旧开发数据。
- 来源核对另复现通配符展开后覆盖精确组件路径的问题；组合物化在返回快照前检查具体路径唯一性，遵守本计划已有的冲突拒绝合同，不记录任意覆盖后的伪来源。

### 整体验收

- A 故事采用扩展、B 不采用：B 不注入关联提示，不暴露关联工具，不触发扩展自动任务或写回；A 不受影响。
- 角色自己的世界/记忆扩展与同名全局扩展按来源区分；不暗中合并或切换所有者。
- 暂停期间禁止新任务与迟到写回，另一故事继续运行；恢复后旧任务不能复活，已有 State 不被初始化覆盖。
- 关闭/卸载保留运行数据；兼容重装后显式恢复原数据；不兼容版本明确要求迁移。
- 中途添加初始化失败或权限不足时，不留下“已采用但数据半初始化”的状态；不可撤销外部副作用单独报告。
- 同一 Timeline 下的 Fork、切换分支和 checkpoint 恢复不改变采用关系；不同 Timeline 相互隔离。State 按原规则恢复，缺失数据不静默补建；并发启停与旧任务写回仍受检查。
- 目录能区分携带资源、独立副本、当前采用和依赖缺失；多个代码模块中单个停用不被误解为整个 Package 的故事级停用。

主要验证使用确定性扩展夹具与真实 Runtime/State/Host 路径，覆盖双故事、在途任务及并发修订。类型/公共接口变化时追加相关包定向类型检查。只写本文不运行应用测试；不消耗真实模型或生成接口额度，人工视觉验收单独记录。

## 记录

### 最后收口执行边界

- 通用写回复用 Data Engine 的异步任务事务守卫：受管 Timeline 工作携带原始 lease，所有同引擎写入在事务内开始及提交前复核；覆盖 documents、storage、assets、portable payload，不为各 API 新建平行状态。任务结束、暂停或安装变化后，派生异步任务也不能迟到提交。非受管的全局配置编辑保持原语义。
- Prompt 准备收集实际读取的扩展资源和受管回调依赖；后续 Provider Step、工具执行和恢复沿用原始凭据，不重新授予暂停前 Prompt 新代次资格。没有参与本次准备的扩展不作为取消依赖。
- 不增加 Package 全局总开关、不迁移开发数据库、不引入签名、不替代人工视觉或真实 Provider 验收。

- [x] 汇总已确认原则，区分当前事实、建议和未决项。
- [x] 建立独立平台 Plan，并关联 The World 与计划索引。
- [x] 确认 Timeline 配置归属，替代此前 Branch metadata 方案；首版不做配置分支化或历史兼容。
- [x] 确认稳定命名空间 ID、签名暂缓、角色卡沿用 artifactId，以及核对身份后显式恢复的原则。
- [x] 落实 Timeline 配置存储、Manifest 声明、Card 默认采用和受管工作基础合同。
- [x] 新 Timeline 默认采用与 State 初始化原子提交；暂停/恢复不重置 State。
- [x] 安装版本/执行代次检查、受管任务取消和 State 写回事务内校验。
- [x] Prompt/工具资源可用列表与文本规则消费接入 Timeline 过滤；卸载保留资源。
- [x] 中途添加基础：只读预览、版本/路径冲突检查、初始化及原子提交。
- [x] 同版本重装恢复：接受来源快照、换源确认、预览过期检查；保留 State，不自动重新初始化。
- [x] 恢复时核对接受的完整 State 声明；同版本修改或声明缺失均明确拒绝。
- [x] 已采用扩展在旧 checkpoint 缺失数据时的显式初始化；浏览器验收待做。
- [x] 当前支持的回调、显式后台工作、间接资源消费及同引擎写回接入；保留模块启停语义，不推断全局 Package 开关。
- [x] Client 实例采用校验、固定 Timeline/Branch、取消与 State 订阅；浏览器交互验收待做。
- [x] 角色默认/Timeline 采用操作入口、安装来源与缺失状态展示；组件行为验证通过，浏览器验收待做。
- [x] State 来源诊断、当前声明/已接受声明区分、Branch 数据存在性与对应正式文档；人工视觉验收待做。
- [x] Settings、工具、文本规则与脚本的来源资格诊断，以及 SDK / 正式架构合同。
- [x] 角色卡公共 artifactId 持久化、显式派生身份与来源往返；浏览器验收待做。
- [x] The World 原生 EC 声明与无实体 metadata 数据合同；真实 Runtime 定向验证通过。
- [x] The World 客户端当前目标与 State 自动刷新、缺失数据和表现清理；人工视觉验收待做。
- [x] 首版实施及定向自动化验收；人工、外部模型、公网安装未验收项单独保留，不宣称全量通过。

不纳入首版施工：旧安装跨声明迁移、签名、独立 Package 全局总开关、未定义的其他领域事件。声明不匹配明确拒绝，不自动改写开发数据；其中 Package 总开关若要增加仍需用户确认。

### 2026-10-07 基础实施账目

- 修改 Runtime、SDK/Host、Server 装配及 Card Bundle 编解码；未操作用户数据库、现有角色配置或实际扩展启停状态，未推送发布。
- 新增 `timeline-extension-participation.test.ts`（Runtime 集成）与同名 Host 合同测试。使用真实内存 SQLite、Timeline/Branch/State 和真实 Host 夹具，覆盖默认采用、不同故事隔离、暂停/恢复旧任务失效、任务取消、State 保留、配置并发、初始化失败以及同 ID 重装失效。
- `tests/unit/application-runtime/extension-resource-import.test.ts`：17 项通过，新增卸载保留与同版本重装复用测试。
- `pnpm exec tsc -b packages/application-runtime packages/extension-sdk/extension-host apps/studio-server` 通过；这是相关跨包类型/产物验证，不是全项目验收。
- 最近六个定向文件联合运行：48/49 通过；唯一失败为 Prompt Host 新增可选 lease 参数后旧 mock 的精确参数断言。更新断言后单独重跑该文件，5/5 通过；其余五个文件未因该测试断言修改而重复运行。
- 尚未运行真实 Provider、浏览器交互或人工视觉验收；部分采用/资源/执行入口仍未接通，不宣称端到端隔离已完成。

### 2026-10-07 中途引入与恢复

- 新增 `extensions/timeline-adoption.ts`、`timeline-recovery.ts`、`installation-source.ts`；Server RPC 提供采用/恢复预览与确认提交。客户端后续接入情况见下方账目。
- 安装管理器保存 Git/ZIP URL、本地目录或 Card 来源；Timeline 接受时保存来源快照。来源属于用户接受的绑定，不是发布者认证。缺少来源快照的恢复明确拒绝，不为开发期数据建设迁移猜测。
- 恢复首版接受同一声明包版本；版本变化返回“需要兼容核对或迁移”。同版本 State 声明比较已在后续补齐；跨版本迁移及权限变化预览仍未实现，不能由绿色基础测试替代。
- Host 受管执行带上实际运行包版本；代码更新但安装记录尚未更新时，拒绝使用旧采用资格执行新版本。
- 主要验证：Runtime 采用集成、Host Timeline 合同、Server 远程安装和卸载共 4 文件 / 34 用例通过；包括预览无初始化、路径冲突、预览过期、初始化失败不落部分数据、旧 checkpoint 不补写，以及换源确认。
- `pnpm exec tsc -b packages/application-runtime packages/extension-sdk/extension-host apps/studio-server` 通过。未启动浏览器或真实模型调用，未更改用户的安装状态与数据。

### 2026-10-07 操作入口、首个消费者与恢复检查

- 客户端增加 Timeline 采用 API，并在现有扩展管理页接入独立操作视图。Card 默认保存有版本检查；当前 Timeline 的加入、暂停及恢复走各自 RPC，不调用全局模块启停。面板以 Timeline/Branch/Card 为挂载身份，目标变化时不保留旧操作弹窗。
- `tests/unit/client/timeline-extension-panel.test.ts`：4/4 通过，覆盖预览不提交与确认防重复、换源确认、Timeline 与 Card 默认写入分离、卸载记录保留。使用项目既有组件 hook 测试模式，不是浏览器交互验收。
- The World Manifest 增加 `participation: "timeline"`，读写及旧数据升级 RPC 显式调用 `context.timeline.run`；工具入口沿用 Host 绑定目标。不宣称正式 EC 或 Client 表现隔离已完成。扩展源码仍位于主仓库忽略的 `extensions/the-world/`，未强制纳入主仓库、未发布。
- The World 的 `state-runtime`、`resources`、`server` 三个文件共 18/18 通过；使用真实 Runtime/State 和模拟 Host 装配验证未采用、暂停、其他故事不受影响及 State 保留，不能替代完整真实 Host/浏览器端到端验证。
- 新建/中途采用在 Runtime Context 保存原始 State 贡献声明和 installationId；恢复预览与提交均比较注册声明的持久化 JSON 语义。版本相同但声明改变、声明未注册时拒绝恢复；同声明的新实例及可选 undefined 属性不误报。初始默认值变化也按声明变化拒绝，首版不实现兼容性推断。
- Runtime 采用集成文件 14/14 通过。首次新增反例的初始值不符合其新 Schema，先被注册层拒绝；修正为合法的新声明后，反例实际进入恢复路径并通过。相关事务接口类型过宽的问题已修正。
- `pnpm exec tsc -b packages/application-runtime apps/studio-server apps/studio-client` 通过。未运行全量 CI、真实 Provider、浏览器交互或人工视觉验收，未修改用户数据库和安装配置。

### 2026-10-07 宏与 Narrative 回调

- 宿主在宏及 Narrative 注册所有者上提供资格检查，注册表在构造候选前过滤未采用来源；不通过执行第三方回调后返回空值来模拟停用。
- 已采用的宏、Narrative resolve 与 Session handoff 进入 `runTimeline`，允许授权能力在准确目标的受管范围内工作；资格检查与执行间的竞态由执行入口重查。未声明 Timeline 参与的原有共享来源保持原逻辑，角色私有来源仍遵守 Card 范围。
- 宏上下文新增 `timelineTarget`。应用层的 Prompt Preview、Invoke 及独立宏检查均从实际 Narrative page 传入 Timeline/Branch；Card 或独立资源检查不伪造故事目标。
- Host 的 Timeline、macros、narrative-context 三个文件 12/12 通过，覆盖无目标/未采用/暂停时不调用来源、候选不冲突、真实 Host 的回调 State 访问绑定目标及 handoff；真实 Runtime 的 macro-provider 文件 2/2 通过，补充核对 Preview/Invoke/Inspect 的目标传递。
- `pnpm exec tsc -b packages/application-runtime packages/extension-sdk/extension-host apps/studio-server` 通过。未做浏览器、真实模型调用或全量 CI。
- 下一执行风险：State content 将结果存为可恢复的 State 操作，必须保存当次采用凭据并在最终提交复核，不能只在处理器入口过滤。Prompt processor 会话也不能在工厂返回时就结束其受管生命周期。

### 2026-10-07 正文处理与可恢复写回

- State content 使用只读 Timeline/Branch 目标；Runtime 过滤已知采用来源，Host 进一步按有效采用判断并为回调建立受管上下文。不存在目标、未采用或已暂停时不执行声明为 Timeline 的处理器。
- 注册表返回实际产生 State 修改的 contributionId；Runtime 保存这些采用来源在处理前取得的 lease，不把未修改数据的处理器作为提交依赖。
- `RuntimeRequestContext` 统一为 `extensionLeases` 数组，单扩展调用也使用同一形式。State 入口在幂等检查前以及实际事务内逐项复核；任一来源失效，整批操作不落库。
- Agent content checkpoint 保存 `extensionLeases`，恢复解析验证其目标、安装版本与代次字段。恢复提交沿用原始凭据，不以当前启用代次替换，不重新执行脚本或 Provider。旧开发期 content checkpoint 缺少该字段时明确拒绝，不建设兼容降级。
- 新增 `timeline-state-content.test.ts`：真实 Runtime/Agent/SQLite 覆盖暂停不处理、重新启用的新操作正常，以及已接受操作在暂停再恢复后不能提交；恢复保留原始 lease，Provider/处理器各只执行一次。
- 正文采用集成、State content registry、现有 ST 数据完整链 3 文件 / 9 用例通过；包括 State 已提交但 Transcript 失败后的幂等恢复。Host/Runtime Timeline 两个文件 16/16 通过，补充真实 Host 正文回调绑定及多凭据逐项检查。
- `pnpm exec tsc -b packages/application-runtime packages/extension-sdk/extension-host apps/studio-server` 通过。未运行真实模型接口、浏览器或全量 CI。Prompt processor 会话生命周期、模块全局停用及其他写回边界仍未完成。

### 2026-10-07 Prompt 会话生命周期

- 从原受管运行实现提取内部 `beginTimelineExtensionWork`；普通 `run` 复用它，Prompt 会话持有范围直至 dispose。取消或释放立即撤销采用变更监听；重复 dispose 幂等。
- 工厂、prepare、render 使用同一 lease 和 AsyncLocalStorage 目标，每次回调前后复核；不为后续回调重新捕获当前代次。工厂完成后不提前取消，暂停后的迟到结果被拒绝，工厂取消仍释放已返回的 guest session。
- Runtime/Host 定向文件首次 20/20 通过；随后补充创建中取消和显式范围生命周期，定向运行新增/扩展的两个用例 2/2 通过，19 个无关用例跳过，未把跳过计为通过。
- `pnpm exec tsc -b packages/application-runtime packages/extension-sdk/extension-host apps/studio-server` 通过。没有浏览器或真实模型验收。已接受 Prompt 快照在后续 Agent Step/恢复中的消费约束仍需收口，会话级测试不能证明这一点。
- 全局停用语义待确认：现有 Manager 只有 `enableModule` / `disableModule`，持久化状态也是逐模块；没有现成的 Package 总停用开关。不能将关闭一个模块偷换为停用整个包携带资源，也不能通过“所有模块均关闭”推断停用，因为无模块资源包本来就是受支持的形式。建议保留模块语义，若要求全局停用整个包，单独增加 Package 级总开关；在确认前不改变现有模块启停行为。

### 2026-10-07 角色卡作品身份

- Card Source 与列表结果持久化并返回公共 `artifactId`，新建时与本地 Card ID 分别生成。普通编辑及导出保留身份；重复导入产生不同本地 Card，但保留同一作品身份。没有增加第二套 publicId 或签名系统。
- 增加 `application.forkCard` 和角色面板“派生为新作品”入口。检查源 Card 版本并复用现有导出/导入事务，生成新作品 ID、保存 `derivedFrom.artifactId`；原 Card 和 Timeline 不变。资源仍采用既有导入规则，不承诺所有关联资源身份独立。
- 来源随目录、ZIP、PNG 元数据保留，拒绝指向自身；目录 Apply 不允许悄悄改变身份和来源。派生沿用导入的界面行为，暂不接入撤销历史。客户端在刷新失败时保留已提交结果，异步完成不覆盖用户随后选择的角色。
- 开发数据库中此前未保存源 `artifactId` 的记录不做迁移；导出时明确报错，不以本地 Card ID 静默填充。未修改实际用户数据库。
- Runtime 作品身份、Artifact 边界与目录同步 3 文件 / 35 用例通过；随后客户端操作失败与 ZIP 文件往返 2 文件 / 61 用例通过，覆盖派生期间切换角色、已提交后刷新失败和文件/ZIP/PNG 来源保留。
- `pnpm exec tsc -b packages/application-runtime apps/studio-server apps/studio-client` 通过。正式文件化角色包文档已更新。未做浏览器交互、人工视觉或全量 CI；平台隔离与 The World 的其他待办仍未完成。

### 2026-10-07 旧 checkpoint 显式初始化

- 新增 `timeline-state-initialization.ts` 及对应 Runtime/Server API，在既有 Timeline 采用面板增加“补齐缺失 State”的预览与确认。只向当前目标 Branch 提交 State 修订，不写采用配置或 Runtime Context，不影响其他分支。
- 预览不执行初始化器。提交核对采用配置、安装版本、原始声明、贡献实例、State 修订和 Runtime Context 版本；初始化使用可取消受管范围，事务内再次核对资格。暂停、失败或过期预览不落部分数据。
- 已有实体和组件值保持不变，只填入缺失的声明实体或组件；不对组件内部任意缺字段做合并或迁移。预览没有缺失路径时禁用确认，API 同样拒绝无事可做的提交。暂停或待重装恢复的扩展不能直接执行补齐。
- Runtime Timeline 集成与客户端面板两文件联合运行 24/25 通过；唯一失败为新增 EC 用例对路径输出顺序的多余假设。改为比较路径集合后，该用例定向重跑 1/1 通过、18 项跳过，未重复计算跳过项。覆盖旧分支初始化、另一分支/采用记录不变、重复初始化拒绝、已有组件保留、暂停取消、初始化失败、预览过期和面板确认防重复。
- 验证期间修复只读文档核验事务的 `allowEmpty` 接入，未为规避空事务而改写采用记录。`pnpm exec tsc -b packages/application-runtime apps/studio-server apps/studio-client` 通过；没有浏览器、真实模型调用或全量 CI 验收。

### Client 实例采用与 State 订阅

- Server Catalog 传递 `participation`；Client 用现有采用查询与安装目录核对安装身份、版本、包版本及 Card 范围。没有有效采用时不加载故事模块，Header/Composer Action 隐藏；工作区共享模块维持原生命周期。
- Client Scope 增加 Branch。导航尚未完成、Branch 不属于当前 Timeline 时不提供故事目标。`ctx.timeline.target` 固定为实例创建时的 Timeline/Branch，采用代次或目标变化先取消，再清理旧实例并重建；不改写全局模块 enabled。
- 增加 Client `state.subscribe`，初次读取后复用现有 SSE 按 revision 刷新。订阅释放、暂停、目标切换时取消投递，防止迟到响应覆盖；同 revision 去重，失败恢复允许重读同一 revision。数据事件只重查采用/安装和现有订阅，不重新拉取完整 Catalog。
- 断线使故事实例失效，重连重新核对资格。Renderer 注册、活动占用与 Action 可用性跟随模块信号；正式异步清理仍由 Host 汇总异常。Config 订阅同步随 abort 解除。已经进入的第三方 JS 回调仍须配合信号，不宣称主页面模块成为安全沙箱。
- The World 使用上述目标和订阅，删除手填 ID、默认黄昏多云、预览时间/天气及没有实现的控制项。State 缺失或读取失败时清空表现，不自动初始化。天气配置、主题异步响应、DOM 图层、云动画及所有天气定时器跟随本实例清理。
- 最终定向验证：Client Host / Hook / Renderer Host / Action 4 文件 53 项通过；The World Client / weather renderer / cloud assets 3 文件 6 项通过。真实临时 Server 安装测试确认 Catalog 声明、PNG 和构建入口可读。最初取消事件直接调用异步 disposer 的实现被既有异常清理测试检出，已改为立即隐藏、由 Host 统一清理；修复后无未处理异常。
- `pnpm exec tsc -b packages/extension-sdk apps/studio-client apps/studio-server`、The World `typecheck` / `build` 通过，已重建 `dist/client.js`。SDK README 和 Client Host 架构文档已同步。
- 未运行浏览器交互/人工视觉、外部 Provider、公网 Git 安装或全量 CI；未修改用户运行数据、提交或发布。原生 EC 与当前 Client 仍不能替代 State 来源/采用诊断面板；旧安装跨声明迁移、Prompt 快照后续消费、通用写回及全局 Package 开关仍未完成或待决。

### State 来源与初始化归属

- 新增只读 `application.inspectStateSources`，以及 State 默认“来源”页签；当前 Card 配置、工作区定义、全局/当前 Card 安装来源、实时注册与 Timeline 接受声明分开显示。数据在不在当前 Branch，与扩展是否采用分开判断；已卸载或暂停来源仍可查看，不执行初始化或持久写入。
- 新 Timeline 的 Runtime Context 原先遗漏 Binding 安装来源，诊断回归用例实际检出。本轮修复原始路径、通配符 Binding、精确及批量 Component Mount 的来源归属；共享模板不改变挂载所有者。不修改旧 Timeline、用户数据库或实体业务数据。
- Runtime/Timeline/Client 两类共 4 个定向文件联合运行 52/53 通过；唯一失败是新增归属用例尝试让 Card 编辑阶段引用扩展模板，该阶段不支持此引用。改为扩展引用 Card 模板的受支持方向后，此用例定向重跑 1/1 通过、22 项跳过，没有为测试放开 Card 校验或重复计入跳过项。
- 通过证据覆盖查询零提交、初始化器不执行、当前与接受声明不同、暂停/卸载/源 Card 不可用、旧 checkpoint 缺失实体/组件、角色安装隔离、错误 Card/Branch/RPC target，以及 Client 的迟到响应、失败重试与采用刷新。
- Runtime、Server 定向 `tsc -b` 通过；State 面板、Client API 与 UI state 的定向 TypeScript 检查通过。Client 整包首次检查被并行工作区的聊天面板翻译键和 App 调用类型错误阻塞；这些并行修改完成后再次检查通过，未代为修改无关文件。自定义定向检查首次误带项目引用导致 TS6306，去除多余引用、使用现有依赖产物后通过。
- 来源的 SSE 失效信号与可编辑运行态的刷新信号分开，避免采用变化清掉未保存草稿；新增接线用例定向 1/1 通过、12 项跳过。
- 通配符与精确组件挂载重叠的反例先复现为未抛错，再补齐展开后的路径唯一性检查。最终 State Definition 与 Timeline 采用两个文件 29/29 通过；之前未受该校验影响的 Client 用例不机械重跑。本轮共 5 个相关文件、60 个不同用例获得分批通过证据，不是全量 CI。
- 最终 Runtime / Server `tsc -b`、Client 整包 `tsc -b` 均通过；现有本地预览端口为 `127.0.0.1:5173`，没有重启或改写用户运行数据。
- State 正式架构与 SDK 说明已同步；未启动浏览器、执行真实 Provider 或全量 CI，也未提交、推送或发布。该工作包不代表其他静态资源目录诊断或所有执行/写回入口已完成。

### 首版执行与写回收口

- Data Engine 增加任务级事务守卫，在事务执行前和提交前检查；Runtime `begin/runTimelineExtensionWork` 将原始 lease 与取消信号绑定到守卫。Prompt session 每次回调复用同一范围。documents、storage、portable payload、assets 及派生异步任务共用此边界；事件订阅者启动的独立工作不继承写入者守卫。
- Host 限制故事 Storage Scope 和 Record binding：必须进入准确 Timeline 的受管范围；Agent Session 归属由 Server 查询；列表必须显式提供 Scope。全局配置仍可编辑。列表先按请求 Scope 过滤，避免同 Card 的其他故事记录误使当前列表失败。
- Prompt 准备记录实际读取资源和受管回调的原始凭据；Provider、工具和成功输出提交保持资格，恢复前先复核旧凭据。工具每次刷新来源资格，CodeAct 脚本附件也按采用过滤；间接读取产生的新依赖加入后续 Step 和恢复检查点。取消不能撤回已发出的外部请求。
- 新增 `ctx.timeline.subscribe` 目标集合失效通知；只通知需要重新 `list()` 对账，不投递业务数据，不为任意领域事件猜测目标。
- 新增只读 `application.inspectTimelineExtensionResources` 和 Timeline 扩展行“携带资源”入口；列出 Settings、Preset、工具、文本规则/提取器和脚本的来源资格。暂停/卸载保留资源可诊断，来源可用与挂载/权限明确分开。
- 真实 Server 测试发现暂停扩展后，保留的工具挂载会令新一轮生成报错。现已过滤当前安装来源不可用的工具并在 Trace 记录原因；其他 Card 私有工具引用仍拒绝，没有扩大资源权限。
- 最终 9 文件 / 91 用例通过，覆盖 Data Engine、Host Storage/Timeline/Prompt session、Runtime 采用/State content/恢复/资源导入、Client 资源诊断；另有 CodeAct/VFS 2 文件 / 37 用例和 The World 2 文件 / 7 用例通过。本轮共 13 个相关文件、135 个不同用例获得通过证据，不计重复运行，不是完整 CI。
- Runtime / Extension Host / Studio Server / Studio Client 定向 `tsc -b` 通过；相关 Diff 空白检查通过。新增间接读取测试最初误用 Narrative 模式不开放的 Workspace 资源工具，改为真实支持的 CodeAct 脚本附件路径后通过，没有为了测试放宽权限。
- 正式合同落在 `docs/architecture/application/extension/timeline-participation.md`，SDK、数据与 Agent 恢复文档同步。本地既有预览 `127.0.0.1:5173` 仍在监听，未重启服务、未修改用户数据库、未安装到用户环境、未提交或发布。
- 尚未验收：人工界面与交互、真实外部模型、公网 Git 安装及完整发行。跨声明迁移、签名、Package 总开关及新领域事件不属于首版施工，不用“全量完成”覆盖这些边界。
