# 前端持续审查与优化问题台账

状态：当前保留 38 项，均已有对应修复与定向证据，不等同于全部关闭条件已验收。FE-028 完整源位置映射、FE-031 不可定位的统一界面反馈及全量 i18n/浏览器验收仍保留边界。开始日期：2026-10-07。

### i18n 组织收尾（2026-10-08）

已按用户确认的方案完成：业务域拆分 → 字典完整性检查 → 开发指南同步。不引入翻译框架、运行时命名空间、异步加载或新的翻译 API。

- 两种语言分别拆为 11 个业务域，保留原聚合出口和 `t('sessions.xxx')` 调用方式。迁移时对照当前工作区，分别保留全部 1,429 个键及原始译文；没有使用旧提交覆盖其他任务新增词条。
- `tests/unit/client/i18n.test.ts` 检查双语域/键/插值参数一致性、空译文、同文件及跨域重复键、聚合出口完整性和翻译行为。英文各域继续由中文键集合约束类型。
- `docs/guide/i18n.md` 已纠正不存在的 Hook/Context 示例和允许空译文的旧建议，说明新增词条、业务域和检查方式。
- 验证：迁移前后逐键逐值对照通过；定向 Vitest 1 文件、3 测试通过；Client TypeScript 检查通过。没有执行全量测试或浏览器验收，本轮不改变 UI 布局和翻译运行逻辑。
- 切回网页触发 Failed to fetch 读取问题已由现场日志确证复现链，正式重新收录为 FE-035，并已完成正文容灾降级（回退 raw 原文/保留顶部重试）、QueryClient 关闭重连突发以及 Fetch 网络错误精准分类，定向测试通过。
- 日期与数字格式化收敛完成（统一纯函数 format.ts 覆盖全量 17 处调用），扩展端语言合同打通（extension-sdk host.locale 传递至宿主与沙箱 iframe），残余硬编码 UI 字符串已补齐字典接入。

剩余边界：复杂复数规则暂不自建解析引擎，按原业务边界保留。

## 范围与执行约定

目标：先理解全项目职责和当前合同，再检查 Studio Client 与共享 UI 的布局、交互、状态、CSS、异步正确性和可访问性。初始阶段只写台账；当前新增授权为已确认问题的定向修复及完整模块接入审查。不提交、推送或操作真实业务数据，不改页面刷新策略。

起始 HEAD：`f2f4393a367b670a4af27e38c5f223c34180effd`。工作区已有 Server、Application Runtime、Extension SDK、相关测试和 Plan、lockfile 修改，均不属于本轮。结论以读取时源码为准；实施前需重新核对。

已有全仓审查和精简审查已归档，不将历史编号重新当作当前缺陷。每项独立追踪真实入口、状态所有者、消费结果和反证。源码能证明的行为错误、待测风险、产品建议分开记账；静态分析不等于浏览器或人工视觉验收。

删除安全、配置身份、草稿版本和值类型及其余明确问题的定向修复已经落实，实施与验证见下表。没有关闭整个审查，不把源码审查等同于视觉、无障碍或生产验收。

## 已确认修复决策

2026-10-07，用户先同意以下建议并要求写入当前 Issue，随后明确要求开始其他问题修复并继续完整接入审查。下表是修复约束，不是已实现结果；实施与验证进度单独记录。

| 条目 | 已确认方向 | 范围边界 |
| --- | --- | --- |
| FE-021 删除安全 | 预览未完成或失败时禁止确认，明确错误并允许重试 | 成功预览后的默认勾选策略保持不变；不擅自调整级联删除产品语义 |
| FE-016 State 数组 | 复用现有 JSON/YAML 结构化编辑能力，解析后提交数组 | 保持数组类型，不新增复杂数组表单、不用字符串代替数组 |
| FE-019 保存中编辑 | 保存期间锁定当前表单，同时按编辑目标身份隔离晚到响应 | 不锁定其他面板；不实现允许继续编辑所需的第二套草稿合并状态 |
| FE-003 草稿版本 | 草稿绑定来源版本，冲突保留输入并明确提示，成功后推进基线 | 不自动合并、不偷偷改用最新版本强行覆盖；复用项目现有冲突处理方式 |
| FE-030 审批弹层 | 第一轮要求显式允许或拒绝；Escape 不产生审批决定、不操作后台 | 不新增“关闭但仍挂起”的收起/重开流程；结合 FE-027 保留失败理由与明确错误反馈 |
| FE-032 Markdown | 保留单换行的可见效果，表格/列表/标题交给标准解析；间距由 CSS 承担 | 不再逐行插空段落，不用更多正则补丁修每种块语法 |
| FE-028 行内 Renderer | 第一轮阻止无法可靠定位的替换并提供诊断；完整源位置到 DOM 映射单独实施 | 不是接受错位降级；不靠长度检查或某一种 Markdown 标记的字符补偿伪装修复 |
| FE-018/022/025 创建、导入与导航 | 保留提交结果身份，区分后续刷新/打开失败，修复运行态与路由衔接 | 保持已有成功后打开意图；晚到操作不得抢走用户后续导航，恢复不重放创建 |
| FE-031 旧路径定位 | 完整路径严格匹配，缺失或歧义不再按遍历顺序猜目标 | 稳定 ID 引用和原有仅名称查找保持不变；不将额外的简写兼容讨论当作修复前置条件 |
| 修复批次 | 先删除安全、配置身份/版本和值类型，再处理其余交互与反馈缺口 | 性能机会和视觉重做不混入第一批；不为这些问题重构整个前端或迁移业务数据 |

预计涉及较多链路的是 FE-003/019 的多编辑器草稿与版本一致性、FE-018/022/025 的提交结果和导航衔接；技术不确定性最高的是 FE-028 完整映射。这里是影响范围判断，不是已完成文件级设计或工期承诺。

## 项目地图

- `apps/studio-client`：React/Vite、FSD；App 组装，Pages/Shell 导航与窗口，Widgets 组合，Features 领域交互，Shared 宿主能力。
- `packages/loom-ui`：通用 UI 原语；Client 不应建立第二套基础控件体系。
- `packages/client-bridge` / Studio Server：认证 HTTP typed RPC；Client 不直接读取文件或数据库。
- `packages/application-runtime`：Card、Narrative、Agent、PromptBuild 领域编排；`application-data` 持有领域持久化。
- Kernel、Document Store、资产与凭证等平台包分开负责平台能力；Core 不是 Client 的直接依赖入口。
- 远端资源缓存归 Query；偏好布局归 Zustand；草稿归局部 Hook；Narrative/Agent 生命周期归对应 Feature。不能为了“统一状态”混合这些语义。

## 最小执行计划

### 本轮修复与接入审查

1. 优先修复 FE-021 删除预览门禁、FE-002 设置身份隔离、FE-016 数组类型、FE-019 保存期间锁定与晚到结果隔离，复用 Query、组件 key 和原生控件。
2. 按生产面板注册表、常驻 Timeline/Agent 与共享宿主能力逐项建立 Log、通知/恢复、i18n、无障碍、状态同步矩阵；新的静态确证问题追加编号，不以搜索命中代替调用链判断。
3. 定向执行最小测试与必要类型检查。既有脏工作区、页面刷新策略、产品策略未定条目、视觉重做、服务端重构、依赖升级、真实业务操作均不进入本轮写入范围。

进度：第一批 FE-002/016/019/021 已实现并完成定向验证；逐模块源码接入矩阵已建立，新增 FE-036/037/038。完整指生产模块清单没有遗漏及状态可追溯，不代表每个按钮或所有运行环境均已动态验收。

| 本轮条目 | 实施结果 | 最小验证与剩余边界 |
| --- | --- | --- |
| FE-021 | 删除预览复用独立 Query；pending/error 禁止确认，错误可见且可重试；一次删除任务的选项初始化不再依赖不稳定回调 | 实际确认处理器、确认 UI 和 Query 函数内存探针：慢读/失败不能删，批量部分失败不能放行，成功显示范围后可删；未执行真实删除 |
| FE-002 | 按 package 与 scope 重建配置表单；未加载/失败控件禁用并提供重读；卸载后不发布在途写入结果、不继续旧字段提交队列；脏字段不被外部版本推进基线 | 实际组件内存探针覆盖切包、初始加载、读取失败与旧写后返；静态渲染覆盖全部控件；未做浏览器计时/输入法验收 |
| FE-016 | 数组使用现有展开编辑区中的 JSON 文本草稿；提交前解析且必须仍为数组；错误保留输入，不发送 apply；复制数组保留 JSON | 真实组件 Hook 测试覆盖非法语法、对象冒充数组、对象数组成功提交；未写真实 State |
| FE-019 | 按 card ID 隔离编辑实例；保存时原生 fieldset 锁定当前表单，处理函数也拒绝写入新草稿；卸载后旧成功/失败不发布、不弹成功通知 | 真实组件 Hook 测试覆盖慢保存、旧事件回调、失败保留草稿与解锁、切卡 key 与卸载后的结果；同 ID 的 props.version 变化不重建草稿 |

上述状态为“已实施、定向验证通过、待真实浏览器/人工验收”，不直接把原始问题的全部关闭条件标为已完成。

### 持续修复进度

用户追加授权为持续实施直到遇到真正需要决定的问题。本次先固定草稿基线，再处理明确的异步状态、键盘、显示与公共能力接入；不引入新依赖、通用框架或服务端修改。

| 条目 | 本次实施 | 证据与未验收边界 |
| --- | --- | --- |
| FE-001 | Undo 分支明确排除 Shift，重做不可用时不反向撤销 | 实际 Hook 测试包含不可用 redo 与正常 undo 对照 |
| FE-003 | 目录规则、宏、State、内联设定、脚本以及 Text Transform 规则/提取器绑定草稿来源版本；提交成功立即推进版本，不等刷新成功；冲突保留输入 | 规则/提取器 Hook 测试、目录宏实际函数探针；其余目录编辑器源码与类型检查，尚未逐个真实交互 |
| FE-004 | 用实际元素的 callback ref 恢复位置，卸载记录位置；保留虚拟树读取的 object ref | 延迟挂载、拆卸/重挂 Hook 测试；真实高度钳制与滚动手感未验收 |
| FE-006 | Provider 连接保存成功后使旧目录请求编号失效，晚到成功/失败均不再发布 | 组件 Hook 测试覆盖旧请求成功、失败及再次加载 |
| FE-010 | 会话名、树重命名、资源标题在 composition / keyCode 229 时不消费 Enter/Escape | 会话组件测试及三处实际处理函数探针；真实 OS 输入法未验收 |
| FE-014 | 树键盘导航只接收 treeitem 自身的键盘事件，不接管内嵌控件事件 | 实际处理函数探针对照内嵌控件与 treeitem 焦点 |
| FE-015 | 树的首次展开以来源/作用域身份判断，不再把空展开集当作未初始化 | 实际 State 组件 Hook 测试确认全部折叠后继续渲染仍为空 |
| FE-029 | 使用 URL/searchParams 注入会话参数，保留原 query/hash 并替换旧参数 | Session Host 测试覆盖相对/绝对地址、query、hash 组合；真实窗口握手未验收 |
| FE-032 | 删除逐行插空段落预处理；解析器保留标准块结构，普通段落用 CSS 显示软换行 | 实际 MarkdownContent SSR 测试覆盖表格、Setext、列表、围栏及单换行；排版人工验收未做 |
| FE-037 | State 三类复制命令复用 tryWriteClipboardText，成功/失败均消费既有 Toast | 实际组件失败测试；真实系统剪贴板未使用 |
| FE-038 | App 在 locale 变化时同步 document.documentElement.lang | 简单 Effect 接线与类型核对；未执行屏幕阅读器验收 |

以上为前两批累计 15 项。Log 与用户通知仍是独立能力，不把日志错误统一自动转成 Toast。

纠正此前范围判断：FE-031 与仅名称查找共用函数，但没有必须一起决定的依赖。完整路径严格匹配可以独立修复，原有简写行为保持；此前以简写兼容为由暂停并不必要。`loom-resource:` 稳定 ID 行为不改。

### 本次继续实施

执行计划：完整路径定位 → 会话预览与审批 → 导航/缓存/导入/扩展接入 → 翻译与样式 → 定向验证及回填。当前这五步均已执行；以下 22 项已有修复，累计 37 项。这里统计“已有实施”，不是宣称 37 项已完成浏览器关闭验收。

| 条目 | 本次实施 | 验证与剩余边界 |
| --- | --- | --- |
| FE-005 | 输入区、导航尺和共享 Toggle/Skeleton/Dialog/Menu 消费应用减少动态效果设置；系统偏好仅作为未显式选择 full 时的回退 | SCSS 编译和选择器核对；未做动态效果舒适度验收 |
| FE-007/008 | 预览缓存包含更新时间、分支/Head 或 entryCount；读取状态区分 loading/ready/error，失败有原位重试，API 身份继续隔离 | 组件 Hook 测试覆盖同 ID 更新、切源、读取失败和手动恢复；未改主 Display 缓存或重试策略 |
| FE-009/013 | 38 处失效 token 引用改用现有语义 token；删除无作用的 Module 类引用，为分支列表补布局 | 18 个变更 SCSS 编译通过、旧 token 零引用；真实主题与响应式仍待人工验收 |
| FE-011 | 全量业务域双语字典组织、新建/选择会话、会话历史、外观/设置、Provider Token、Inspector 说明、引用弹层、审批、角色开场、State/Macro 树、日期/数字本地化（format.ts）、扩展语言合同（extension-sdk host.locale）及残余 UI 文本接 Translator | zh-CN/en-US 字典 AST 无重复/缺项，format 纯函数覆盖全部 17 处无受控调用，扩展宿主与沙箱同步 locale，Client/SDK 类型与单测全部通过 |
| FE-012/023 | 官方内容和开场选择补鼠标取消；Timeline 两个导入入口改为原生按钮触发隐藏文件输入 | 原生控件/组件静态检查及相关测试；未调起真实文件选择器或读屏 |
| FE-017 | 显示列表与新记录计数共同使用含 package/module/event 的既有筛选函数；变更筛选清零旧计数 | 筛选模型测试；未运行真实日志轮询 |
| FE-018 | 旧列表没有新资源时，用现有稳定 ID 目标解析打开根节点；不再静默放弃导航。回调检查导航身份，后续导航优先 | 实际装配函数测试覆盖资源/预设和失效回调；不变更创建返回 ID 合同 |
| FE-020 | 文本转换完成回调按 endpoint 失效“我的资源”规则 Query，同时保留 Display 刷新 token | 实际 App 回调与真实内存 QueryClient 探针，仅当前 endpoint 失效 |
| FE-022/026 | 最近面板使用 allAgentSessions；Agent 激活返回实际 Branch 并经 App 同步路由；导入后经既有目标解析与路由激活。晚到结果不夺取导航，取消后恢复 Session ready | Runtime、导航所有者及面板回调测试；实际 App 回调探针；未执行真实会话切换/创建 |
| FE-024 | 导航尺在空→非空时绑定测量与 ResizeObserver，默认步长与 CSS 同为 9 | 空列表后挂载的 Hook 测试；浏览器几何与命中位置未测 |
| FE-025 | 先保存导入 ID、成功反馈与扩展警告；刷新失败明确为后续失败，恢复只刷新/打开既有 ID。角色批次错误与刷新失败合并保留，成功卡片不丢失 | Archive/ST 处理函数测试确认重试没有再次导入/创建；角色混合成功/失败与后续刷新失败测试 |
| FE-027/030 | 暂停接既有操作报告；审批返回接受状态，失败保留理由且阻止重复提交；按 Run/Request 身份隔离，复用共享 Dialog，Escape 不决定审批 | Runtime 与组件 Hook 测试；真实焦点循环、inert 和读屏仍未验收 |
| FE-028 | 源文本与渲染文本前缀不一致时，在创建 Range 前明确拒绝；倒序挂载避免后方替换推动前方坐标 | 实际函数/TreeWalker/Range 替身探针通过。只完成已确认的防错第一阶段，完整 Markdown 源位置映射及真实 DOM 清理未实现/未验收 |
| FE-031 | 带完整路径的引用沿一次树遍历按真实路径唯一匹配，不重复为每个节点查祖先；缺失/歧义返回不可定位，裸名称查找保持原样 | 路径模型回归通过，含 A/B 同名、根级、缺失、歧义与原简写。没有新增统一不可定位 Toast，多个常驻工作台共同监听旧事件的归属仍需单独处理 |
| FE-033 | Undo 使用 CodeMirror 的 undoDepth，而“恢复初始内容”仍按内容差异判断 | 编辑器组件测试确认回到初始文本仍可 Undo；真实键盘未验收 |
| FE-034 | Zustand 持久化 merge 仅接收合法外观字段及范围；不恢复临时 scope、不允许覆盖 action | 损坏/部分合法持久数据的 merge 测试；未修改真实 Storage |
| FE-035 | 投影失败时时间线与聊天正文降级回退至 raw 原文（或缓存文本），维持顶部错误及重试；QueryClient 显式关闭 refetchOnReconnect 避免唤醒突发；Logging 精准识别 Fetch 网络异常 | 实际组件/函数定向测试覆盖投影失败、无缓存冷挂载与缓存命中；Logging 单元测试覆盖 Fetch TypeError 精准分类；Client 类型检查通过；未做真机长休眠/断网恢复验收 |
| FE-036 | 扩展错误接管理/活跃扩展视图 alert 与只读重同步；App 记录结构化日志并去重通知，正常恢复重置去重状态；错误提示占独立布局行 | 接线/类型/SCSS 与实际通知 Effect 探针；复用已有 SSE 重连恢复，不改其他任务的采用逻辑，不冒称真实断网验收 |

尚需保留：FE-028 的完整映射是后续独立实现；FE-031 的旧全局事件反馈尚未统一；FE-011 当前列明入口已处理，其他硬编码、日期/数字及扩展语言合同仍需进一步收敛。OPT-001/002 不作为已完成性能优化。无需为了本次明确修复新增产品审批。

### 初始只读审查流程

1. 阅读正式合同与已有审查结论，建立当前边界和去重依据。
2. 按完整用户链审查输入/快捷键、窗口/导航、资源编辑、Provider/Session、消息渲染及共享 UI。
3. 对候选找反证；必要时运行不接触真实数据的最小探针，随发现追加证据。
4. 滚动更新覆盖面、未验证项和接续入口，不把未查范围写成通过。

## 已确认问题

### FE-001 / P2：重做不可用时，重做快捷键反而执行撤销

- 分类：交互正确性；状态：已实施，定向验证通过，待真实快捷键验收。以下为修复前证据。
- 位置：`apps/studio-client/src/pages/studio/use-studio-shortcuts.ts:61-66`；消费者 `studio-page.tsx` 的 `useStudioShortcuts`；状态来源 `features/edit-history/model/use-edit-history.ts:69-76`。
- 场景：完成一次可撤销编辑，焦点在非输入元素上，`canUndo=true`、`canRedo=false`；按 `Ctrl/Cmd+Shift+Z`。
- 因果：首个分支同时要求 `shiftKey && canRedo`，不满足后第二分支只检查 `key === 'z' && canUndo`，没有排除 Shift，因此调用 `onUndo()`。不是单纯提示错误，而是反向执行编辑历史操作。
- 反证：输入区、忙碌和原生模态框有提前返回，但普通工作区焦点不受这些保护；`recordEdit()` 正常记录新编辑就会清空 redoStack，因此场景可达。
- 最小建议：先按组合键区分 undo/redo 意图，再判定该操作是否可用；不可用重做应保持无操作。
- 关闭条件：覆盖 `Shift+Z + canUndo + !canRedo` 不调用任何操作，同时保持普通撤销及可用重做；不需要完整构建。

### FE-002 / P2：扩展设置切包没有隔离表单身份，旧值可用新插件身份提交

- 分类：异步状态与持久化正确性；状态：已实施身份隔离与加载门禁，定向验证通过，待真实浏览器验收。以下因果与旧探针保留作为修复前证据。
- 位置：`features/extension-renderers/ui/extension-settings-form.tsx:28-45,62-85,115-144`（均位于 `apps/studio-client/src/`）；真实入口 `renderer-workspace-panel.tsx:451-456`，角色目录 `widgets/character-panel/card-resource-directory.tsx:338-349`。
- 场景：A、B 两个合法插件在同一 scope 下声明同名同类型字段；A 配置已加载，切 B 后 B 的读取仍未返回。
- 因果：父表单未按 package key 重建，entries 也不立即按 package 隔离；`configKey` 与 `SettingField` 的 key 只有 scope、setting ID/type。字段仍显示 A 的值和版本，但新 onCommit 闭包指向 B。B 加载失败时错误提示也不禁用这些旧值；A 的在途提交返回还可能写进复用后的 entries。
- 反证：读取 Effect 的 `disposed` 只防止旧读取发布，不清除已经发布的 A 数据，也不约束写入回调；`ExtensionRemoteControls` 有 package key，但不覆盖其兄弟 `PackageControls/ExtensionSettingsForm`。字段 ID 仅需包内唯一，不存在跨包禁止同名的合同。
- 已执行：转译实际表单/字段函数，模拟 React 槽位与 Effect、延迟 B list、使用内存 API。实际字段 key 为 `{"kind":"global"}:label:text`；B 显示 `A stored`，编辑后收到 `{packageId:"example.b", key:"label", value:"A stored edited under B", expectedVersion:1}`。这证明请求串身份，不是实际数据库覆盖或真实 DOM 验收。
- 最小建议：包与 scope 是表单身份的一部分；加载和写入结果按该身份发布，旧字段不能以新身份可编辑。不以默认值静默掩盖尚未加载。
- 关闭条件：切包慢读/失败、旧写后返均不串值；两个包版本相同也不能错误提交。无需新增通用表单框架。

### FE-003 / P2：角色目录编辑器将旧草稿与最新版本号拼接，绕过应有冲突保护

- 分类：草稿与并发写入；状态：已实施来源版本绑定，定向验证通过，待逐编辑器浏览器验收。以下为修复前证据。
- 位置：`widgets/character-panel/card-resource-directory.tsx:269-289,308-330,358-371,378-387,393-421`。
- 场景：在目录中编辑宏、规则、脚本或 State，另一页面/客户端修改同一对象；查询刷新使 props.version 更新，但当前编辑实例及旧草稿仍保留。
- 因果：局部草稿仅用 `useState` 初始化，没有携带初始编辑版本；提交却直接取 `props.card.version` / `props.rule.version` / `script.version` / `props.definition.version`。服务端 CAS 因收到最新版本号而无法识别旧草稿。宏保存会覆盖同名宏；规则、脚本、State 可覆盖更大范围。
- 可达性：这些子编辑器 key 只含 card/item 身份，不含版本；目录用活跃 Query 读取。根 Query 配置只关闭 window-focus refetch，保留网络重连刷新；本地 Query Core 的 `queryClient.ts:680-682` 与 `queryObserver.ts:110-115` 证实 reconnect 默认路径。无需假设每次切窗口都会刷新。
- 反证：正式 Context Asset 编辑使用 `draft.base.version`；宏专用面板使用 `draftVersions`，均不能保护这里的独立目录编辑器。给 key 加版本会直接丢草稿，不是合格修复。
- 已执行：实际 `CardMacroEditor` 函数保持槽位，先在 v1 编辑，后以 v2 props 重渲染，实际 onSave 为 `["greeting","local draft from v1",2]`。未调用后端；其他同根因入口由源码确认，未逐一动态执行。
- 同根因扩展：`features/text-transforms/ui/text-transform-panel.tsx:172-195,389-394,436-474,589,746`。规则/提取器选择时只保留 JSON 文本，工具栏刷新只更新 catalog，不更新草稿基线；随后保存取最新 catalog.version。规则树开关也会保存新版本并刷新 catalog，旧详情草稿再次保存可反向覆盖刚切换的 enabled。脚本编辑另有 scriptDraft.version，不在此问题范围。此处由完整源码链确认，未新增重复编号。
- 最小建议：草稿与它来源的版本绑定；成功保存再推进基线，冲突保留输入并提供显式处理。同步未编辑数据与保留已编辑草稿分开。
- 关闭条件：外部版本更新后旧草稿仍携带旧版本并明确冲突，不静默覆盖、不丢输入；正常连续保存保持可用。

### FE-004 / P3：角色资源目录在加载完成和返回列表时不会恢复已保存滚动位置

- 分类：交互状态；状态：已实施实际挂载恢复，受控 Hook 测试通过，未做真实 DOM 验证。以下为修复前证据。
- 位置：`shared/hooks/use-restorable-scroll.ts:13-23`；`widgets/character-panel/card-resource-directory.tsx:57,145-172`。
- 场景：冷打开目录时 Query 仍 pending，列表尚未挂载；加载后滚动列表，打开一个条目，再返回同一目录列表。
- 因果：滚动 Hook 的 layout effect 仅依赖 key，第一次 ref 为空会提前返回；加载完成与详情返回仅创建新 DOM，key 不变，不触发恢复。即使初次有缓存，详情切换也会替换列表节点而不触发该 Effect。
- 反证：onScroll 确实保存位置，问题不是“从未记录”，而是新节点没有消费记录。父层按 card ID key 并不覆盖同一 card 内的列表/详情往返。
- 已执行：实际 Hook、模拟空 ref 首次 effect 与后续 DOM 替换，保存 top=420 后新节点仍 top=0，初始没有安装 cleanup。仅证明该生命周期路径，没有模拟浏览器布局钳制。
- 最小建议：让恢复依赖实际滚动元素的挂载身份（如 callback ref 或独立列表组件），并核对异步内容高度就绪；不增加全局导航状态。
- 关闭条件：冷加载、缓存加载、列表/详情往返都恢复正确位置；不同 card 不串滚动位置。

### FE-005 / P3：输入区与共享弹层未统一消费应用的减少动态效果设置

- 分类：CSS / 可访问性；状态：已实施应用 motion 覆盖，样式编译通过；实际动画未测。以下为修复前证据。
- 位置：`widgets/agent-composer/agent-composer.module.scss:19-37`；`packages/loom-ui/src/styles.css:398-410`；`shared/hooks/use-motion-preference.ts:25-35`；`styles/global.css:176-179`。
- 场景：应用设置显式选择 reduce，而操作系统仍 full；或操作系统 reduce 下使用自动收起的 Composer。
- 因果：Composer 使用固定 280/220ms transform/opacity，没有 OS 或 `html[data-loom-motion='reduce']` 覆盖。共享 Dialog/Menu/Skeleton 仅识别 OS media query，不识别应用已计算的最终偏好；全局规则只将 Shell 两个 duration 置零，不能取消这些动画。
- 反证：MasterDetailWorkbench、FileTree 和 Agent 消息已有应用级覆盖，不是全站完全缺少 reduced-motion；本项只收录漏接消费者。应用主动 full 与 OS reduce 的优先级也应沿已有 `resolveEffectiveMotion`，不能两套互相覆盖。
- 追加消费者：`widgets/narrative-timeline/narrative-timeline-navigator.module.scss` 的 tickMark 固定 150ms、preview 固定 110ms，只由 OS media query 关闭，未消费应用显式 reduce。与本项同根因，不另计编号。
- 最小建议：相关宿主消费者统一遵循最终 motion 属性；保留 UI 包独立使用时的系统偏好行为。
- 关闭条件：system/full/reduce 与 OS 偏好组合一致；reduce 下输入区大幅位移动画和共享弹层入场关闭。人工舒适度不由源码验证替代。

### FE-006 / P2：Provider 连接保存后，旧模型目录请求能重新填回过期结果

- 分类：异步状态；状态：已实施目录请求失效保护，组件 Hook 测试通过。以下为修复前证据。
- 位置：`widgets/model-panel/provider-account-list.tsx:147-178`，实际请求入口 `features/provider-settings/model/use-provider-settings.ts` 的 `listProviderModels`。
- 场景：展开模型搜索触发慢目录请求 A；请求期间修改同一账号的 Base URL/凭证并保存成功，组件未卸载；A 随后返回。
- 因果：保存成功清空 fetchedModels 并设置 idle，但 `loadModelCatalog()` 只检查 mounted，不检查连接版本或请求代际。A 会重新发布旧列表并设 loaded，后续 focus 因 loaded 短路而不再读新目录。该列表可以将新端点不支持的旧 model ID 加入账号。
- 反证：账号 keyed by account.id，连接更新不重新挂载；加载目录不占用保存按钮的局部 busy。不是卸载后 setState 问题。
- 已执行：从实际组件提取 loadModelCatalog/saveConnection，延迟旧目录返回；保存成功先进入 idle，随后旧请求返回，实际状态变为 loaded 且 models 为旧端点列表。内存 API 替身，无真实网络或凭证操作。
- 最小建议：目录请求结果绑定账号连接修订/加载代际，连接成功更新时使旧结果失效；保留手工添加模型能力。
- 关闭条件：保存新连接后晚到旧列表不能发布，首次新目录读取可正常完成；API 失败仍允许重试。

### FE-007 / P2：会话历史预览缓存没有随内容或分支更新失效

- 分类：状态一致性；状态：已实施版本化缓存键，组件 Hook 回归通过。以下为修复前证据。
- 位置：`widgets/sessions-panel/sessions-panel.tsx:129-135,331-379,1040-1059`；`pages/studio/studio-panel-host.tsx:34-56`。
- 场景：先查看一个空 Session 或已有 Timeline 预览，再继续生成、编辑正文或切换分支，返回会话面板。
- 因果：预览分别按 timelineId/sessionId 缓存，仅 API 实例不同才隔离。只要数组已存在就提前返回，空数组也为真；更新后的实体重新触发 Effect 仍被该判断短路。面板访问后保活，关闭再开不会清缓存。因此元数据可能更新，预览正文仍停留在首次读取结果，空预览可能长期显示“无转录”。
- 反证：现有 `sessions-panel-source.test.ts:257-302` 验证跨 API 不串缓存、旧响应不覆盖新源；没有覆盖同一 API/ID 下内容改变。本项不是重新报告已修复的跨端点问题。
- 最小建议：给已读取预览绑定足够的内容身份/修订，或在明确的用户刷新/重新激活点失效；复用现有数据所有者，不新建事件总线。分支身份需按真实 `getPage` 合同确认。
- 关闭条件：空 Session 后追加转录、已有正文编辑、分支切换后再次查看不显示过期结果；跨 API 防护保持。

### FE-008 / P2：会话预览请求失败被呈现为“没有内容”，没有重试入口

- 分类：错误反馈；状态：已实施显式错误与原位重试，组件 Hook 回归通过。以下为修复前证据。
- 位置：`widgets/sessions-panel/sessions-panel.tsx:339-350,364-375,1046,1059`；同文件 `TimelineDetail` 与 `SessionDetail` 的空态分支。
- 场景：读取节点/转录遇到网络或 RPC 失败。
- 因果：catch 直接返回 undefined，不保存 error/loading；视图把缺少缓存转换为 `[]`，再显示 noLogs/noTranscript。加载中也复用同一空态，用户无法判断是否真的没有数据。当前选择与 props 不变时没有后续重试动作。
- 反证：列表加载和全局异步操作通知不能代替此路径，这两个 RPC 在 widget 中直接调用并吞错。与 FE-007 的过期缓存根因不同，可在一次小改中一起处理。
- 最小建议：预览明确区分 pending/error/empty/ready，失败保留重试入口；若迁移 Query，按当前应用的默认 `retry:false` 合同保留显式重试。
- 关闭条件：受控 RPC rejection 展示错误而非空内容；手工重试能恢复，不无限自动重试。

### FE-009 / P3：生产样式消费未定义颜色 token，背景与 hover 声明实际无效

- 分类：CSS / 主题一致性；状态：已替换未定义 token，编译与引用检查通过；未做 computed-style/视觉验收。以下为修复前证据。
- 位置：`shared/ui/master-detail-workbench/master-detail-workbench.module.scss:7`、`widgets/sessions-panel/sessions-panel.module.scss:7,505`、`features/state-variables/ui/state-variables-panel.module.scss:866`、`widgets/agent-chat-panel/agent-session-picker.module.scss:70,143`、`widgets/preset-workbench/preset-workbench.module.scss:403,416,473`。
- 事实：`--loom-color-surface-base`、`surface-hover`、`border-subtle`、`focus`、`accent-contrast`、`border-muted`、`primary` 没有项目默认定义，却出现在无有效 fallback 的生产 `var()` 中；例如 preset hover 的 fallback 又指向同样未定义的 primary。
- 已执行：只读扫描 Client/UI 源码及 `setProperty` 候选，再用限定 token 的 `rg` 在 Client/UI/official 验证无定义。surface-base 有 10 处直接消费、surface-hover 8 处。扫描同时命中动态布局变量，但这些有内联注入，已排除，不能把所有未发现冒号定义的变量都当缺陷。
- 影响：相关声明在默认主题无法解析，例如 background 回到透明，hover 背景变化失效；具体合成观感仍需浏览器核对，不宣称全部页面不可用。FileTree 的 focus token 也缺失，但全局 input:focus 尚有 box-shadow，因此不夸大为完全无焦点反馈。
- 最小建议：将残留名称映射到当前正式语义 token；不要为了消除警告另造第二套 palette。自定义 CSS 偶然定义这些变量不应成为默认主题的隐含前提。
- 关闭条件：默认主题下上述消费者均能解析；代表性 hover、焦点、背景在实际窗口验证，主观配色由用户验收。

### FE-010 / P2：中文输入法确认 Enter 会提前保存会话名或提交资源重命名

- 分类：输入交互 / IME；状态：三处输入已实施 composition 门禁，组件测试及实际处理函数探针通过，未做真机输入法验证。以下为修复前证据。
- 位置：`widgets/agent-chat-panel/agent-session-picker.tsx:60-61`；同类入口 `shared/ui/file-tree/file-tree.tsx:533-542`、`features/context-assets/ui/context-asset-detail-header/context-asset-detail-header.tsx:83`。
- 场景：正在用中文输入法编辑标题，按 Enter 确认候选词，事件仍处于 composing。
- 因果：原生文本框上的自定义 keydown 只判断 Enter，未排除 composition，直接 preventDefault 并 save/commit；会话名保存还会进入 busy/disabled，资源重命名成功可能关闭输入框。
- 已执行：调用实际 SessionTitleInput，先设置输入草稿，再传入 `nativeEvent.isComposing=true` 的 Enter，仍收到 `{id:"session-a",title:"zhong"}` 的重命名调用且 preventDefault=true。使用模拟事件与内存回调，不宣称已覆盖各 OS/浏览器候选事件顺序。
- 反证：Token Hook 的 composition listener 仅暂停计数，不拦截这些输入事件；CodeMirror 的自有键盘体系不在本项范围。
- 最小建议：在原生输入提交/取消快捷键入口尊重组合输入状态，复用一个足够小的项目既有模式（若无则就地处理）；不要接管原生输入法。
- 关闭条件：真实中文输入确认不提交，组合结束后的下一次 Enter 可保存；Escape 的输入法取消也不误关闭编辑。

### FE-011 / P3：新会话与外观等界面绕过翻译入口，英文模式仍整块中文

- 分类：UI / 国际化；状态：已接入当前列明的 Host 入口，字典/类型及组件检查通过；不是全项目零硬编码或全量语言验收。以下为修复前证据。
- 位置：`widgets/agent-chat-panel/agent-session-create-dialog.tsx:43-91`、`agent-session-picker.tsx:123-174`、`widgets/settings-panel/background-materials-view.tsx:44-184`；`widgets/model-panel/provider-account-list.tsx:302-312`。
- 因果：标题、按钮、搜索提示、错误与 aria-label 硬编码中文；CreateDialog/BackgroundMaterialsView 的 props 甚至不接收 Translator。它们均有正式生产调用，不只是开发预览。
- 本轮覆盖补充：排除 dev 与字典文件，对全部生产 TS/TSX 的 JSX 文本及 aria-label/title/placeholder/label/alt 做 AST 候选扫描，并核对 Lore 分类、Inspector Token 说明、资源引用弹层、Agent 审批、角色开场编辑器、State 树 meta 等实际消费。缺口不限于原列出的四个组件，继续归本条，不按字符串数量制造新问题。两份字典均为 1,245 个 key，集合一致；这仅证明字典键齐全，不能证明调用者使用了翻译。日期/数字仍有 `Intl(...undefined)` 和无 locale 的格式化，属于尚未统一的语言边界。
- 反证：用户正文、资源 ID、插件声明 label 可不翻译；本项只针对 Host 自有操作文案。当前项目支持 en-US，有明确翻译合同，不是要求新语言功能。
- 最小建议：沿当前 TypeScript 字典与 Translator 补齐这些入口，不引入新国际化库，不顺手扩展日期/复数框架。
- 关闭条件：切 en-US 后相关 Host 文案与 accessible name 一致；用户原文不变。纯文案默认只核对 Diff 与类型键，不跑全仓测试。

### FE-012 / P2：官方内容与开场选择弹窗没有鼠标或触摸取消入口

- 分类：可访问性 / 模态交互；状态：已补显式取消控件，组件/类型检查通过；未做真机焦点验收。以下为修复前证据。
- 位置：`features/official-content/ui/official-content-dialog.tsx:83-116`；`packages/loom-ui/src/component/dialog.tsx:37-44`。
- 场景：打开“官方内容”，想取消而不安装/导出，尤其在无硬件键盘的触摸设备上。
- 因果：调用者只传 open/title/onClose，没有关闭按钮、actions/headerActions，也没有 `closeOnBackdrop`；共享 Dialog 不内建关闭按钮，背景点击分支要求显式 closeOnBackdrop。唯一剩余入口是原生 cancel/Escape，底层页面被 showModal 隔离。
- 反证：`dismissible` 默认 true 只允许 cancel，不会自动生成按钮；安装/导出完成也不关闭弹窗。其他弹窗有显式 X/取消，不能保护此处。
- 同根因入口：`widgets/character-panel/character-panel.tsx:497-512` 的开场选择 Dialog 只有“开始会话”动作，无 X/取消/closeOnBackdrop。用户不想创建时，纯鼠标/触摸也无法退出；不能要求先执行创建来关闭。
- 最小建议：在该弹窗添加可访问名称明确的关闭操作，并按现有产品语义决定忙碌时是否可关闭；不全局改变所有 Dialog 的关闭行为。
- 关闭条件：纯鼠标/触摸可关闭并回到触发点，键盘 Escape 仍正常；是否允许在安装中关闭需沿已有生命周期测试而非猜测。

### FE-013 / P3：五个生产组件仍引用已经不存在的 CSS Module 类

- 分类：样式维护 / UI 优化；状态：已清除无效类引用并补分支列表布局，编译/引用核对通过；不是视觉验收。以下为修复前证据。
- 位置与清单：`context-asset-detail-header.tsx:68` 的 statusLabel；`ai-capability-lab.tsx:318,404` 的 createAccount；`play-panel.tsx:152` 的 characterStrip；`preset-workbench.tsx:340` 的 statusMessages；`sessions-panel.tsx:1269-1276` 的 branchesSection、branchList、branchItem、branchMeta。
- 事实：5 个文件、9 处静态引用、8 个类名，在所导入的样式模块编译结果中没有对应类。这些表达式得到 undefined，相关 className 不会带来预期的组件布局。分支列表的整个 section/list/row/meta 链均如此。
- 已执行：TypeScript AST/符号身份扫描 243 个非 dev TS/TSX 文件，按 Vite 的 abstracts 注入编译 58 个 SCSS Module，检查 1,318 个静态属性引用，最终编译错误 0。没有输出构建文件。
- 反证：初次探针漏了 Vite mixin 注入，并误把局部 `getComputedStyle()` 的 styles 变量识别为 CSS Module；已修正注入并用符号身份去除误报。动态 class 访问、全局 CSS、完整 CSS Module 打包映射和浏览器布局不在该扫描保证范围。
- 最小建议：若已由父层/共享样式承担布局，删除失效引用；若布局职责确实遗漏，只补该位置样式。不要为每个旧类名机械恢复空规则或建立新样式系统。
- 关闭条件：这些引用有明确所有者；分支元信息和状态提示在实际窗口可读。不要把静态引用问题夸大为应用编译失败。

### FE-014 / P2：文件树键盘导航拦截了内嵌控件的空格与方向键

- 分类：键盘交互 / 可访问性；状态：已实施嵌套事件隔离，实际处理函数探针通过，未做浏览器输入验证。以下为修复前证据。
- 位置：`shared/ui/file-tree/file-tree.tsx:139-150,473-475,561-564`；真实输入消费者 `features/state-variables/ui/state-variables-panel.tsx:184-198,253-261`。
- 场景：在运行态 State 树的字符串输入框键入空格，或按左右方向键移动光标；也影响数字框原生方向键和嵌套按钮的 Space 激活。
- 因果：trailing 容器只停止 click 冒泡，不处理 keydown。treeitem 收到任何未 defaultPrevented 的后代键盘事件，都交给树导航；处理器不检查 target/currentTarget。Space preventDefault 后调用节点选择；ArrowLeft/Right/Up/Down/Home/End preventDefault 并移动树焦点/展开节点。
- 反证：文件名重命名输入框自己 stopPropagation，已被保护；State 的 renderTrailing 文本/数字框没有这层保护。长文本抽屉是另一挂载位置，不笼统宣称所有编辑器受影响。
- 已执行：提取并执行实际 `handleTreeItemKeyDown`，给 target 为 INPUT 的 Space/ArrowLeft；两者均 preventDefault，观察到节点选择和 `focus:parent`。事件实际冒泡链由源码确认，未模拟原生浏览器光标。
- 最小建议：树级键盘导航只处理树行自身的导航意图，不接管内嵌交互控件；保持行上 roving tabindex 行为。
- 关闭条件：State 文本能输入空格、方向键能移动光标、数字框保持原生交互，树行聚焦时原导航仍正常。

### FE-015 / P3：State 树无法保持“全部折叠”

- 分类：界面状态；状态：已实施按来源初始化，全部折叠回归测试通过。以下为修复前证据。
- 位置：`features/state-variables/ui/state-variables-panel.tsx:83-87,430-438`。
- 场景：State 至少有一个根对象，用户依次折叠根节点，最后使 expandedIds 变为 `[]`。
- 因果：初始化 Effect 把 `treeExpandedIds.length === 0` 当作未初始化信号，依赖中又包含该长度；用户合法的“全部折叠”被识别为待初始化，并重新展开全部根节点。
- 反证：FileTree 正常返回空展开集合，问题在消费者；根节点为单个对象时即可触发，不依赖庞大数据或运行中刷新。
- 已执行：提取实际 Effect，给树根 `/world` 与用户请求的 `[]`，实际发布 `["/world"]`。
- 最小建议：区分一次性初始化与用户选择，按正确的快照/目标生命周期初始化，不用空集合代表未初始化。
- 关闭条件：单根、多根均能全部折叠；切换 scope 后初始展开策略明确，普通重渲染不覆盖用户选择。

### FE-016 / P2：State 数组被当作普通文本编辑，保存请求把 JSON 数组改成字符串

- 分类：值类型保真 / 状态编辑；状态：已实施 JSON 数组编辑与提交校验，定向测试通过，未进行服务端写入。以下因果与旧探针保留作为修复前证据。
- 位置：`features/state-variables/model/state-variable-editor.ts` 的 `getPropertyType` / `stateSnapshotToTreeNodes` / `createBatchSetStatePropertiesInput`；`features/state-variables/ui/state-variables-panel.tsx:171-175,249-261`。
- 场景：Snapshot 中包含数组，例如 `inventory:[{name:"item",count:2}]`，用户在 State 树里编辑它。
- 因果：数组不递归，标为 other；renderTrailing 对其落到通用文本 input，用 `String(currentValue)` 显示。对象数组显示 `[object Object]`，数字/字符串数组丢失 JSON 边界。onChange 总存字符串，batch set 不再解析，即使输入合法 JSON 数组语法，提交类型仍是 string。
- 已执行：调用实际模型函数和实际 renderTrailing，输入框显示 `[object Object]`；编辑成 `[{"name":"item","count":3}]` 后构造的 operation.value 仍是字符串。没有请求真实 API。
- 反证：ClientJsonValue 正式支持数组；服务端存在绑定 Schema 时可能拒绝类型错误，不代表 UI 可以正常编辑数组。无该类型约束的合法状态路径则可能接受类型改变，不能宣称所有数组保存都会成功或都能被后端挡住。
- 已确认修复方向：复用现有 JSON/YAML 结构化编辑/解析能力，保留数组类型，不再用普通文本框悄悄替换类型；不新增复杂数组表单。
- 关闭条件：数组展示保真，合法编辑提交数组而非字符串，解析失败保留输入并明确报错；不因此开放任意值类型转换。

### FE-017 / P3：日志的新消息计数未应用模块和事件筛选

- 分类：界面状态一致性；状态：已统一显示与计数筛选，模型测试通过；未做浏览器轮询验证。以下为修复前证据。
- 位置：`widgets/log-viewer/log-viewer.tsx:68-74,102-105`；`features/log-viewer/model/use-log-feed.ts:128-136`。
- 场景：实时日志按 moduleId 或 eventFilter 过滤，用户向上滚动停止跟随；轮询收到其他模块/事件的日志。
- 因果：可见列表在 filterLogRecords 后继续按模块和事件筛选，但 handleUnreadRecords 只消费 query/level/technical/runId。轮询批次没有模块/事件过滤，不匹配的记录也会增加未读数量并参与最高严重程度计算。
- 反证：packageId 已在 feed 查询层应用，因此不把插件范围也算成漏筛；本项不否认保留底层完整日志用于诊断的价值，只约束当前视图的未读提示。
- 最小建议：当前视图的可见性谓词由列表和计数共同消费；过滤条件变化后的累计计数语义需明确，不新建额外日志缓存。
- 关闭条件：过滤 A 时仅收到 B 日志不会出现“A 有新消息/错误”的提示；清除过滤后列表仍能读取这些记录。

### FE-018 / P2：新建、复制或导入资源后的跳转查找仍使用操作开始时的旧列表

- 分类：异步闭包 / 资源导航；状态：已复用稳定 ID 解析及导航身份门禁，装配函数回归通过；未做 React DOM 集成。以下为修复前证据。
- 位置：`features/context-assets/ui/prompt-resource-toolbar/prompt-resource-toolbar.tsx:60-68,155-177`；`app/studio-resource-panels.tsx:101-104`；`widgets/context-workbench/context-workbench.tsx:224-234,266-287`。
- 场景：资源面板已经通过 routeResourceId 打开 A，点击新建/复制/导入，后台成功产生 B；操作后预期打开 B。
- 因果：selectResult 等待 Promise 后调用的是该次 render 捕获的 props.onSelect；沿 handleSelectResource 进入 App 的旧 onSelectResource，该函数只在捕获的 state.promptResourceDrafts 中找到 ID 才导航。B 不在旧快照内，跳转被静默跳过；局部 internalSelectedResourceId 虽被设置，但当前路由 A 优先，无法替代路由跳转。
- 已执行：提取实际 selectResult 和资源面板 App 回调，给操作开始时的 `[A]`，模拟提交后新 render 数据 `[A,B]`，再让创建 Promise 返回 B；实际 navigation.openResource 调用数为 0。无真实资源写入；该探针只覆盖旧闭包查找条件，不替代界面验收。
- 反证：底层创建命令通过不可变数组发布新资源，并正确返回 ID；问题不在“创建失败”。mountedRef 仅挡卸载，不能刷新旧 callback 的数据。预设入口还会写 selectedPresetId，行为与资源面板不完全一致，不宣称两个入口都完全无法选中。
- 最小建议：提交结果与导航之间不要再依赖操作前 catalog 快照；按当前既有导航/资源结果合同完成选择，同时明确用户在等待期间主动切换后的优先级。
- 关闭条件：已有路由 A 时创建/复制/导入 B 能正确定位 B；刷新失败但创建已提交的结果不被误报为未创建；用户后续导航不被旧任务意外覆盖。

### FE-019 / P2：State 配置保存的晚到结果覆盖新草稿，且未隔离切换后的角色

- 分类：草稿丢失 / 异步身份；状态：已实施当前表单锁定、card 身份隔离与卸载保护，定向测试通过，未写真实 Card。以下因果与旧探针保留作为修复前证据。
- 位置：`features/state-variables/ui/state-authoring-panel.tsx:48-62,92-120,143-147,349-351,401-410`；挂载 `app/studio-state-panel.tsx:42`、`app/studio-panel-registry.tsx:221-233`。
- 场景一：提交 A 的配置后请求仍 pending，继续在源码或结构化字段输入新内容。保存仅禁用按钮，没有禁用 AuthoringMaster/Detail；成功回调无条件 setConfig/setSourceText 为提交返回值，新输入丢失。
- 场景二：A 保存中切到 B，当前组件没有按 card ID 重建，Effect 会初始化 B；A 返回后仍无条件发布 A 的 config、sourceText、versionRef、baselineRef。B 界面可显示 A 内容且被当作新基线。再次编辑保存会用当前 B 身份搭配错误基线，是否实际覆盖取决于 B 的 CAS 版本，不能宣称必然覆盖。
- 已执行：提取实际 save/cardToConfig/configToYaml，使用实际 parseCardStateConfig/objectToYaml 与延迟内存 onSaveCard。保存期间写入新草稿，晚到结果将 stateContributionIds 恢复为 `draft-A`；模拟 B 已初始化为版本 7 后，A 返回又把 versionRef 改为 2。
- 反证与探针限制：首次输入省略 timelineStateBindings，被真实解析器拒绝，未到达保存；补齐正式数组字段后两条交错均退出码 0。该验证没有 React DOM，切卡可达性来自无 card key 的挂载链和显式 cardIdRef 初始化 Effect。同一角色来源版本已由 versionRef 保存，不与 FE-003 的“取最新 props 版本”混淆。
- 已确认修复方向：保存期间锁定当前表单，不锁定其他面板；写入完成只发布到同一编辑身份。不要单纯每次 props.version 变化就 remount 丢草稿，也不新增保存期间继续编辑的合并状态。
- 关闭条件：慢保存时当前表单明确不可编辑，失败后解锁并保留草稿；切角色后的旧结果不改变新角色草稿/版本/错误状态；成功后的正常连续保存仍推进基线。

### FE-020 / P2：“我的资源”规则目录不响应规则新增、修改和删除

- 分类：缓存所有权 / 跨面板状态；状态：已补 endpoint 规则缓存失效，真实内存 QueryClient 探针通过；未做浏览器往返。以下为修复前证据。
- 位置：`widgets/user-resources-panel/user-resources-panel.tsx:18-21,30,47-50`；`features/text-transforms/ui/text-transform-panel.tsx:436-465`；`app/studio-panel-registry.tsx:72-83,294-300`；`pages/studio/studio-panel-host.tsx:34-56`。
- 场景：先打开“我的资源”读取全局规则，再去规则面板新建、重命名或删除 workspace 规则，返回“我的资源”。
- 因果：目录单独缓存 `['user-resources', endpoint, 'rules']`。规则保存/删除只更新局部 rules、局部 refresh 和 LoomScript refreshToken；当前前端没有对该 Query key 的 invalidate/refetch/setQueryData。面板保活，不因重新激活挂载或启用 Query；目录也没有 active 参数、刷新按钮或 refreshToken 消费。
- 可观察结果：新规则缺项，改名显示旧名，删除的规则仍可点击。staleTime 到期只改变过期状态，本身不定时刷新；根配置又关闭 window-focus refetch，因此普通面板往返不能保证恢复。
- 已执行：使用项目实际安装的 QueryClient/QueryObserver 与根查询参数，先读取 before-edit、改变内存 API catalog，再按同 key 更新 observer options；fetchCalls 仍 1，观察值仍 before-edit。没有访问真实 API；不把此探针当作整页集成。
- 反证：断网重连、真实卸载再挂载等可能触发读取，不能把“偶尔更新了”当成受支持的编辑后同步合同；PromptResource 资源条目由 props 更新，与规则这份独立 Query 不同。
- 最小建议：沿现有 Query 失效机制，让规则写入明确通知该资源目录；不再加另一份全局规则状态或轮询补丁。
- 关闭条件：从规则编辑器完成新增/重命名/删除后返回目录即可反映已提交结果；失败提交不伪装成功更新。

### FE-021 / P1：角色删除预览失败被当成无时间线，仍默认级联删除游玩数据

- 分类：数据删除范围 / 失败语义；状态：已实施预览成功门禁、错误/重试入口与选项初始化隔离，定向验证通过；没有执行真实删除。以下因果与旧探针保留作为修复前证据。
- 位置：`widgets/character-panel/character-panel.tsx:300-316,421-428,997-1016`；`features/cards/model/use-cards.ts:302-309,337-339`；`packages/application-runtime/src/runtime/cards-runtime.ts:177-205`。
- 场景：删除含已有时间线的角色卡，previewDeletion 请求失败（或首次预览尚未返回时立即确认）。
- 因果：开始预览时 setIncludePlayData(true)，失败 catch 将 deleteTimelineCount 设为 0，不保留错误/未完成状态。时间线选项仅在 count > 0 时渲染；确认按钮只检查 props.busy/count，没有检查预览成功。因此用户看不到“同时删除关联时间线”选项和数量，最终 confirmDelete 仍把 includePlayData=true 传给服务端。
- 服务端消费：deleteCards 重新查找关联 Timeline，并在 input.includePlayData=true 时执行 deleteTimeline、删除相关 Agent Session 等；这不是无效参数。预览失败后单独的删除请求可以成功，不存在要求先拿到预览 token 的保护合同。
- 已执行：提取实际 Effect、DeleteConfirmation、confirmDelete；内存 previewDeletion 拒绝，得到 timelineCount=0；实际 JSX 结果不含 character.deletePlayData；内存删除调用仍收到 `{includePlayData:true,includePromptResources:true}`。退出码 0，无数据库/网络写入。
- 反证：Dialog 的通用描述只告知删除角色卡，不提时间线；有提示的时间线 checkbox 正是被隐藏的分支。记录 changeset 并不能补回用户在确认前缺失的删除范围信息。本项不要求改变已经明确显示时的默认勾选策略。
- 相邻风险（源码确认）：Effect 依赖 props.onPreviewCardDeletion，而该回调在 use-cards.ts:337 每次 render 重新声明，经 use-studio-state.ts:427 和 studio-panel-registry.tsx:175 原样传递。活动面板遇到父层状态更新会重新预览，并重新 setIncludePlayData(true)/setIncludePromptResources(true)，可能覆盖用户刚取消的选项。选择初始化应与一次确认任务绑定，不能与重复读取绑定；未做真实后台更新时序验收。
- 最小建议：区分预览未完成、失败和成功的零数量；删除范围未确认时不能用“零”放行默认级联。失败应可见并可重试，显式保留游玩数据的路径也须按正式产品合同呈现。
- 关闭条件：慢预览和失败预览均不会提交未呈现的级联删除；成功有时间线时能明确选择保留/删除；批量预览部分失败不能隐藏其余角色的关联数据风险。

### FE-022 / P2：部分 Timeline/Agent 激活入口只改运行态，输入区因路由不一致被禁用

- 分类：路由与运行态一致性；状态：已接入统一 App 导航和导入目标解析，Runtime/回调测试通过；未做真实导入。以下为修复前证据。
- 位置：`app/studio-panel-registry.tsx:149-152`；`app/app.tsx:128-131,263-279,451`；`widgets/sessions-panel/sessions-panel.tsx:1151-1179`。
- 场景：工作区路由仍指向 A，在历史面板导入生成 B 的 Timeline 存档或 ST 会话，导入及后续请求均成功。
- 因果：onArchiveImported 刷新列表后直接 activateTimeline(B)，不使用其返回的 branchId 更新 navigation；narrativeNavigating 要求路由 timeline/branch 与当前运行态相等，否则 canSendNarrative=false。路由同步 Effect 依赖 narrativeTarget/bootstrapReady/targetUri，不因单独的运行态 B 变化执行，因此没有自动纠正。
- 已执行：实际 onArchiveImported 与实际 narrativeNavigating 表达式，内存激活从 A 改为 B 后，route 仍 A、门控为 true，退出码 0。没有请求真实 importArchive。
- 反证：同文件的“打开 Timeline”、从角色新建等入口明确调用 navigation.openNarrative，证明 activateTimeline 自身不负责导航；用户再手工进入某 Timeline 可以恢复，但导入完成链本身缺失。
- 同根因的常规入口：`app/app.tsx:322` 的 onSelectSession、`app/studio-panel-registry.tsx:138-140` 的历史会话侧栏打开，都直接 activateAgentSession，不同步路由。`use-narrative-runtime.ts:1302-1336` 明确在 session.timelineId 与当前叙事不同时设置 Timeline/Branch/Nodes；选择跨 Timeline 会话或独立会话因此也能形成相同失配。最近面板 `studio-panel-registry.tsx:109-112` 同样缺导航；当前 FE-026 的局部数据源限制了其跨 Timeline 触发，修复全局最近集合时尤其需一并核对本项。该追加链由源码确认，未新增重复编号。
- 同根因的新建入口：`use-narrative-runtime.ts:1115-1149` 的 createAgentSession 在 makeMain=true 且无 Timeline 时直接创建并发布 Timeline；App 的 onCreateSession 直接传 state.createAgentSession，之后 onCreated 走 activateAgentSession，均不导航。此时 route.timelineId 仍为空而 runtime 有新 ID，同样命中门控。需要覆盖首次建立主写作对话，不应只修存档导入按钮。
- 最小建议：导入成功后若要激活 B，应沿既有激活+导航合同完成；若设计只导入不打开，则不应暗中切运行态。需保持用户等待期间后续导航的优先级。
- 关闭条件：两种导入成功后路由与运行态一致，关闭历史面板可以正常发送；浏览器刷新/回退不会意外还原到与界面不同的 Timeline。

### FE-023 / P2：Timeline 两个导入操作没有键盘可达的触发控件

- 分类：可访问性 / 文件导入；状态：已改为原生按钮触发，控件语义与处理函数已核对；未做辅助技术实测。以下为修复前证据。
- 位置：`widgets/sessions-panel/sessions-panel.tsx:1227-1235`。
- 因果：两个可点击图标均放在普通 label 内，label 没有 tabindex/键盘处理，其文件 input 使用 hidden 属性。隐藏 input 不进入 Tab 顺序，label 自身不是键盘按钮，因此纯键盘无法定位并激活 Timeline/ST 导入。
- 反证：aria-label 和 title 只提供名称，不让 label 获得按钮的聚焦与激活行为；旁边的导出是真实 button，不能代替导入。
- 最小建议：复用现有文件选择入口的真实按钮 + input ref 模式，或保留原生可聚焦文件输入；不要只加 role 而遗漏键盘行为。
- 关闭条件：Tab 可到达两个入口，Enter/Space 可打开系统文件选择器，busy 时不可重复导入，取消文件选择后焦点合理恢复。

### FE-024 / P2：空时间线后出现消息时，导航尺未初始化尺寸，计算步长与 CSS 不一致

- 分类：条件挂载 / 布局和命中位置；状态：已修复延迟挂载测量与步长，组件 Hook 回归通过；未做浏览器几何测量。以下为修复前证据。
- 位置：`widgets/narrative-timeline/narrative-timeline-navigator.tsx:30-31,43-61,95`；同名 SCSS `--narrative-timeline-tick-step: 9px`；调用 `narrative-timeline.tsx:406-412`。
- 场景：合法的空 Timeline 打开后新增第一条及后续消息，Timeline/Branch 身份不变。
- 因果：组件一直挂载，但 items 为空时返回 null；首次 useLayoutEffect([]) 因 navigatorRef=null 返回。items 后续非空不会重新执行 Effect，没有 ResizeObserver，也不读取 CSS 步长。JS 仍按初值 11px、容量 60 计算偏移和 hover，实际 button 高度却是 9px，消息越多偏差越明显；以后改变容器高度也不会更新容量。
- 可达性：服务端 createNarrativeTimeline 支持 openingNodes=[]，已有集成测试采用它；App 的 Narrative key 只有 endpoint/Timeline/Branch，不含节点数量，因此正常从空到非空不会重建导航尺。
- 已执行：转译实际组件与模型，模拟 React 槽位及 layout Effect 依赖。空→20 条得到 `{observed:0,tickStep:11,capacity:60}`；同样 500px 容器初始有消息的对照得到 `{observed:1,tickStep:9,capacity:43}`。只模拟 ref 生命周期与样式读值，不宣称已测真实屏幕坐标。
- 反证：组件初次就非空时测量可正常工作；问题不是 ResizeObserver 普遍失效。对初始缓存会话的现有模型测试不能覆盖这条空列表挂载路径。
- 最小建议：把观察生命周期绑定到真实导航元素挂载，不依赖只执行一次的空 ref Effect；计算和 CSS 应使用同一实际步长。
- 关闭条件：空→非空、后续容器缩放均正确安装/更新观察；hover 预览与实际刻度对应；普通已有消息的初始加载不回归。

### FE-025 / P2：导入后的刷新失败遮蔽提交结果、扩展警告或批次错误

- 分类：部分成功 / 失败恢复与操作反馈；状态：已保留提交结果、警告及批次失败，恢复不重放写入的测试通过；未进行真实导入。以下为修复前证据。
- 位置：`widgets/sessions-panel/sessions-panel.tsx:1151-1182`；`app/studio-panel-registry.tsx:149-152`；`features/narrative-runtime/model/use-narrative-runtime.ts:374-389`。
- 场景：Timeline 存档或 ST 会话创建请求成功，随后 onArchiveImported 中的列表请求失败；激活失败也处在相同的提交后阶段。
- 因果：创建、列表刷新/激活、成功提示共用一个 try/catch，成功返回的 ID 未单独保留。onArchiveImported 抛错后只显示原始错误，存档的 unknownParticipantNamespaces / participantFailures 不再呈现，ST 的导入数量提示也不执行。界面没有区分“未创建”和“已创建、刷新失败”，也没有针对已有结果的恢复入口。
- 已执行：提取实际 importArchive/importSillyTavernChat，内存 API 每次确认一次创建，完成回调模拟列表失败。两条路径均得到 `{busy:false,error:"list unavailable"}`，notice 为空；对照回调成功时分别显示扩展警告和 ST 消息数量。退出码 0，没有网络、文件导入或持久化写入。
- 反证与边界：本项不称创建请求本身失败，也不声称必然重复创建。`packages/application-runtime/src/runtime/narrative-runtime.ts:104-112` 的存档导入每次生成新 ID，故用户用重新导入恢复时存在重复风险；实际重复导入未执行。角色卡批量导入已有本地列表发布，不能称其丢失成功卡片；它的独立问题仅限下述反馈丢失。
- 同根因扩展（第十七轮）：`features/cards/model/use-cards.ts:395-442` 先逐文件导入并积累 importedNames/failures，随后 await refreshCards/onCardsImported，最后才展示成功与抛出逐文件错误。任一刷新失败会越过后两步。`app/use-studio-state.ts:70-77` 的完成回调确实刷新资源库，操作边界会将原异常报告到 App；没有另外保存或呈现 failures。在线 URL 导入的局部弹窗也只收到该异常。
- 扩展验证：提取实际 importCards，输入一个成功和一个返回 `invalid PNG` 的文件。正常刷新得到保留卡片 created-1、一次成功提示、`bad.png: invalid PNG`；列表失败或关联资源刷新失败时仍保留同一卡片，但成功提示为 0，最终只有 `list unavailable` 或 `related unavailable`，文件错误丢失。三组均执行两次内存 fetch 替身，退出码 0，没有上传或导入真实文件。
- 该扩展的反证与最小建议：已有 `card-operation-failures.test.ts` 明确覆盖提交后仍保留卡片及可继续编辑，不能把反馈缺口夸大成数据回滚。应分别保留逐项导入结果和后续刷新故障，恢复时只重读目录/资源库；相邻 DirectoryDiscoveryNotice 已用 committed 标记区分“已导入、刷新失败”，可参考现有表达，不需通用事务框架。
- 最小建议：创建成功即保留结果身份及 participant 警告，后续刷新/打开失败以独立状态呈现；恢复针对现有 timelineId，不重放创建。不需要通用事务框架，也不能把已提交结果回报成完全成功。
- 关闭条件：创建失败、创建成功但刷新失败、创建成功但激活失败能分别辨识；后两者始终保留导入 ID 和扩展警告，可重新刷新/打开而不新增 Timeline。

### FE-026 / P2：“最近会话”接入局部会话集合，遗漏其他 Timeline 和独立会话

- 分类：列表数据范围 / 导航发现性；状态：已接入全局会话集合，装配与类型检查通过；未做浏览器验收。以下为修复前证据。
- 位置：`app/studio-panel-registry.tsx:91-98`；`app/use-studio-state.ts:340-341`；`features/narrative-runtime/model/use-narrative-runtime.ts:1231-1260,1278-1299,1328`；`widgets/play-panel/play-panel.tsx:82-103`。
- 场景：全局已有 Timeline A、B 的 Agent 会话及独立会话；打开最近面板。切换当前 Timeline 后再查看最近面板，或使用其日期筛选。
- 因果：最近面板的 timelines 接 allTimelines，agentSessions 却接 agentChatSessions；后者是 narrativeRuntime.agentSessions，来自当前 timelineId 的过滤列表，无 Timeline 时仅 standalone。真正的 allAgentSessions 已单独读取并暴露，但没有接到最近面板。子组件只能对收到的局部数据排序、分日、生成日期标记，遗漏的会话无法由筛选找回。
- 已执行：提取实际 listAgentSessions/listAllAgentSessions 和 registry.recent 渲染函数，内存列表含 A 会话、B 会话、独立会话。三种当前范围下全局数组均为 3 条，最近面板分别只收到 standalone、A 或 B 的 1 条，而 Timeline 始终包含 A/B。退出码 0；没有网络或真实会话切换。
- 反证：这不是读取未完成的瞬时状态；即使全局集合已经完整，接线仍选择局部集合。全局历史面板已经使用 allAgentSessions，不能把本项扩大成服务端从未提供全局会话。最近页面没有呈现当前 Timeline 范围限定，并展示跨 Timeline 摘要和全局日期筛选。
- 现有验证缺口：`tests/unit/client/recent-play-panel.test.ts` 直接传入单条会话，只验证 Timeline/Agent 分区，不经过 registry，不能发现数据源误接。
- 最小建议：最近面板沿全局会话集合取数，与全局 Timeline 保持一致；局部集合继续用于当前 Timeline 的会话选择器，不修改其查询语义。
- 关闭条件：多个 Timeline 与独立会话均进入最近会话排序/日期筛选；切换当前 Timeline 不改变这个全局范围；现有局部会话选择器不回归。

### FE-027 / P2：暂停和审批请求失败没有操作提示，拒绝理由提前清空

- 分类：运行控制 / 异步失败反馈；状态：已接入暂停报告与审批失败保留，Runtime/组件测试通过；未操作真实 Run。以下为修复前证据。
- 位置：`features/narrative-runtime/model/use-narrative-runtime.ts:695-700,911-924`；`app/app.tsx:333-335`；`widgets/agent-chat-panel/agent-chat-panel.tsx:397-404,444-459,482`；`main.tsx:40-48`。
- 场景：Run 正在执行时点击暂停，或面对资源修改/历史读取审批时提交允许或拒绝；该控制 RPC 失败，但已有事件流可以仍然正常。
- 因果：pauseAgentRun/approveAgentMutation 直接 await RPC，没有进入 runAgentAction/runAction 或局部错误状态；App 将其 Promise 以 void 丢弃，没有 catch。全局 unhandledrejection 仅记录事件和异常类型，不触发操作 Toast。拒绝按钮另外在调用回调后立即清空 approvalReason，失败后审批仍保留，用户刚输入的理由却已丢失。
- 已执行：提取实际 pauseAgentRun/approveAgentMutation 及实际拒绝按钮箭头函数，内存 RPC 拒绝；两项操作均向调用方拒绝，reporterCalls=0、statePublications=0、审批仍在，reason 已为空。成功对照正常发布两次状态并清除审批。最终探针退出码 0，无真实网络和审批。第一次探针因 VM 的顶层 const 不是 context 对象属性而退出 1，修正调用方式后运行；该脚手架错误不是产品证据。
- 反证：resumeAgentRun 已使用 runAgentAction，不能笼统说所有运行控制都没有错误报告。SSE 的 runRecovery 不等于单个控制 RPC 的失败反馈；本项没有把一次网络失败解释为后端 Run 已暂停。cancelAgentRun 有相似写法，但当前 onCancelRun 未被界面控件消费，不纳入确认触发范围。
- 最小建议：控制操作沿已有错误报告通道或审批局部状态呈现失败，避免未处理 Promise；拒绝理由绑定审批身份，并在确认已接受后才清理。重试应由用户明确触发，不因本项加入自动重放审批。
- 关闭条件：暂停、允许、拒绝的 RPC 失败均可见且不虚报成功；拒绝失败保留理由，成功后清理；迟到结果不影响后续另一项审批。

### FE-028 / P2：行内 Renderer 将 Markdown 源偏移当作渲染文本偏移，可能静默替换错误内容

- 分类：消息渲染 / 扩展挂载坐标；状态：已实施拒绝不可靠坐标的第一阶段，实际函数探针通过；完整源映射未实现，未执行浏览器 Range 替换。以下为修复前证据。
- 位置：`features/extension-renderers/ui/renderer-node-mount-host.tsx:98-104,171-180,201-249`；`features/extension-renderers/model/node-render-mount.ts` 的 resolveSelector；生产入口 `widgets/narrative-timeline/narrative-timeline.tsx:432-451` 与 Agent 消息中的 RendererNodeMountHost。
- 场景：正文先有粗体、链接等 Markdown，再有扩展或 Loom Script 要替换的唯一文本锚点，后方文本足够长。
- 因果：resolveNodeRenderMounts 按 displayText 字符串的 UTF-16 偏移解析锚点，但 displayText 仍是 Markdown 源文。locateTextBoundaries 把同一偏移直接套到渲染 DOM 的连续 Text 节点，没有源位置映射或内容一致性校验。语法标记被移除后偏移已经改变；只要错误位置仍在总文本长度内，就会返回有效边界，后续 replace 分支会对错误范围执行 extractContents，而不触发 anchor_unresolved。
- 已执行：实际 MarkdownContent、react-markdown/GFM/对话插件做 SSR，parse5 解析实际输出的 Text 节点，再交给实际 resolveNodeRenderMounts 和 locateTextBoundaries。`bold TARGET tail` 正确定位 `TARGET`；`**bold** TARGET tail` 的源范围 `[9,15]` 错选 `ET tai`；带链接语法的样本错选 `ng tex`。三个样本 resolver diagnostics 均为空，定位函数均返回边界，退出码 0。
- 证据边界：Text 节点遍历用 parse5 结果和最小 TreeWalker 替身；样式、未使用的代码高亮/安全 HTML 模块为替身，未使用的资源链接解析设为显式抛错。没有真实扩展安装、浏览器 Range/React 回收验证或持久正文修改。确认的是选区映射错误，不声称数据库正文已被改写。
- 反证：Host 已主动拒绝 HTML preview / safe-html / pending 节点，但普通 Markdown 不在该拒绝范围。正式文档 `docs/architecture/extensions/client-renderer-host.md:170` 要求无法映射时明确失败，不允许以任意同长度范围替代。当前 node-render-mount 单测仅验证源字符串中的区间，不经过渲染结果，不能覆盖此问题。
- 可达性补充：`features/loom-scripts/runtime/loom-script-renderer-runtime.ts:93-108` 正式把 Text Pipeline displayRange 转成 match-ref replace mount，不只依赖自定义测试扩展。该路径同样消费源偏移，未单独执行真实 Script。
- 最小建议：明确源范围到渲染范围的可靠映射；在没有映射依据的场景按已有合同诊断失败，不对错误文本动手。不能仅增加长度检查，也不能仅针对某一种 Markdown 标记做字符数补偿。
- 关闭条件：粗体、链接、段落分隔及代码块前后的锚点正确映射或明确拒绝，绝不静默替换别处；纯文本挂载保持可用；后续补真实 DOM 替换/清理验证。

### FE-029 / P2：Standalone 页面带 hash 时，会话参数被拼进 fragment

- 分类：扩展页面导航 / URL 构造；状态：已实施原生 URL 构造，Session Host 测试通过，未打开真实扩展页面。以下为修复前证据。
- 位置：`features/extension-renderers/model/renderer-session.ts:59-63`；注册入口 `client-extension-host.ts:631-651`；生产打开入口同文件 openStandalone、`renderer-workspace-panel.tsx` 的 sessionHost.open。
- 场景：合法 standalone.page Renderer 的 frame.src 包含 hash 路由或片段，例如 `/page.html#settings` 或 `/page.html?theme=dark#settings`。
- 因果：仅用 src.includes('?') 决定分隔符，随后向整条字符串末尾拼接 loomRendererSession。片段之后的 `?`/`&` 仍属于 fragment，不会成为 URL.searchParams；既没向页面提供正确查询参数，又改变了扩展自身的 hash 路由。
- 已执行：转译实际 createRendererSessionHost，使用内存 window.open/BroadcastChannel、固定合成 session ID，捕获打开地址并由原生 URL 解析。普通 `/page.html` 得到正确会话参数；两个 hash 样本的 sessionParameter 均为 null，fragment 分别变为 `#settings?loomRendererSession=session-probe` 与 `#settings&loomRendererSession=session-probe`，会话状态仍 opening。退出码 0，无网络、真实窗口或业务数据。
- 反证与边界：Renderer 注册路径原样传递 frame.src，没有拒绝 hash 的合同；同源扩展使用 hash 不需任何新增能力。本项不声称全部 Standalone 页面失效，也不把缺参数必然解释为固定超时行为：具体扩展可自定义错误呈现，但 Host 构造的会话参数确实缺失。
- 最小建议：使用原生 URL/URLSearchParams 设置会话参数，按当前页面基准解析相对地址并保留原 query/hash；已有同名会话参数应替换而不是重复附加。无需手写更多字符串兼容分支。
- 关闭条件：相对/绝对地址、已有 query、hash、query+hash 均保留原导航语义且只有当前会话参数；补有效页面的握手验证，不以地址字符串测试代替连接成功。

### FE-030 / P2：审批层声明模态却未接入模态隔离，全局快捷键仍操作后台

- 分类：键盘 / 模态交互与焦点；状态：已复用共享不可隐式关闭的 Dialog，组件测试通过；未做浏览器 Tab 循环或辅助技术验收。以下为修复前证据。
- 位置：`widgets/agent-chat-panel/agent-chat-panel.tsx:389-463`；同名 SCSS `mutationApprovalBackdrop`；`pages/studio/use-studio-shortcuts.ts:39-65`；`app/app.tsx:296`。
- 场景：Agent 正在等待资源修改或历史读取审批，焦点位于允许/拒绝按钮；后台有可撤销的编辑，或另有打开的工作区面板。
- 因果：审批 UI 是 absolute 遮罩内的 `<section role="dialog" aria-modal="true">`，没有原生 dialog、焦点进入/恢复、键盘处理或背景 inert。全局快捷键仅对 `document.querySelector('dialog:modal')` 和 defaultPrevented 避让；按钮不是 editable target，因此 Ctrl/Cmd+Z 可继续调用全局 onUndo，Escape 可关闭后台 panel。审批中的 Agent busy 不等于传给 Shell 的 mutationBusy。
- 已执行：AST 检查实际审批根节点仅有 aria-label/className/role/aria-modal；运行实际 useStudioShortcuts，模拟非输入按钮目标和当前 section 模态结构，得到 undo=1、后台 panel close=1。native dialog:modal 对照下两者新增调用均为 0。退出码 0，没有真正撤销或操作业务状态。
- 证据边界：探针模拟 document 的原生 modal 查询和按钮类型，证明现有处理函数的动作分支；不声称实测了 Tab 顺序、焦点可见性或屏幕阅读器。审批根没有焦点逻辑和背景隔离属于源码确认，浏览器具体焦点轨迹留待验收。
- 反证：代码中的 inert 出现在 ToolCollapse，不包围审批背景；CSS 遮罩只覆盖布局，不参与该键盘分支。共享 Dialog 已使用 showModal，全局快捷键也已有对应保护，不需要重新发明全站快捷键框架。正式 `docs/architecture/ui/localization-and-accessibility.md` 已要求模态确认使用原生 dialog，ARIA 不能替代键盘行为。
- 最小建议：沿共享 Dialog 的模态能力实现审批层，保留运行请求身份、失败反馈和理由草稿；明确关闭、拒绝、暂留的产品语义，不能把 Escape 暗中解释为允许或重放请求。必要时补该层独立的快捷键隔离，而非扩大所有页面的全局禁用。
- 关闭条件：审批层内按撤销不会修改后台资源，Escape 按明确的审批关闭合同处理、不操作后台面板；补 Tab 焦点约束、打开时焦点进入、关闭后恢复，以及异步出现/失败重试的真实浏览器验收。

### FE-031 / P2：完整资源路径按末段名称回退，点击后可能打开其他目录的同名条目

- 分类：资源定位 / 编辑导航正确性；状态：已实施完整路径唯一匹配并保留裸名称语义，模型回归通过；统一不可定位反馈和真实点击尚未验收。以下为修复前证据。
- 位置：`features/context-assets/model/context-asset-tree.ts:89-131`；复制入口 `features/context-assets/ui/context-asset-detail-header/context-asset-detail-header.tsx:35-45`；分发入口 `shared/ui/markdown-content/markdown-content.tsx:37-47`；消费 `widgets/context-workbench/context-workbench.tsx:171-196`、`widgets/preset-workbench/preset-workbench.tsx:209-235`。
- 场景：同一资源树的 A、B 两个文件夹都有名为 Common 的 entry。复制 B 条目的 URI，粘到可预览的 Markdown 中再点击。
- 因果：resolveContextAssetUri 生成 `@/B/Common.md`，但 findContextAssetByVirtualPath 的第一轮只比节点自身名字，第二轮直接按 `endsWith('/Common.md')` 返回扁平遍历中的第一个节点，不核对 B。父路径不仅不能消歧，不存在的父路径也会成功“定位”。消费者随即 openAssetDetail，没有检查目标完整路径。
- 可达性与反证：作者树按 ID 定位和更新，addContextAssetNode/Folder 的默认标签也没有全树唯一约束，跨目录同名不是非法数据；完整路径来自现有复制按钮而非人为猜测的 URI。稳定身份的 `loom-resource:` 使用 parseResourceLink / `loom:open-reference`，不经过该函数，不应将本项泛化为所有资源引用都不可靠。
- 已执行：转译实际模型，依次运行 findContextAssetPath、resolveContextAssetUri、prepareLoomMarkdown、readLoomToken、findContextAssetByVirtualPath。A/Common 回到 A；B/Common 错回 A；B/Unique 正确回到 B 的唯一条目；`@/Missing/Common.md` 仍返回 A。四组断言通过，退出码 0，没有剪贴板、页面事件或持久化写入。
- 最小建议：带父路径的引用必须按实际完整路径匹配；不存在或歧义应显示不可定位，不按遍历顺序猜测。原简写保持，不与本次修复捆绑；复制入口统一到稳定 ID 或旧事件的反馈归属是独立后续，不另建全局路径注册表。
- 关闭条件：复制 B 路径后确实打开 B；同名、缺失父路径、根级条目均不误开其他节点；保留现有稳定身份资源引用行为，并补真实点击与编辑目标验收。

### FE-032 / P2：Markdown 预处理插入空行，破坏 GFM 表格和 Setext 标题

- 分类：正文呈现 / Markdown 语义；状态：已删除插空行预处理，实际 MarkdownContent SSR 测试通过，未做浏览器视觉验收。以下为修复前证据。
- 位置：`shared/ui/markdown-content/markdown-content-model.ts:19-49`；实际调用 `shared/ui/markdown-content/markdown-content.tsx:71-79`；生产入口 `shared/ui/long-text-editor/markdown-preview.tsx` 与 `features/message-content/ui/message-content.tsx:29-36`。
- 场景：编辑器预览或普通聊天 Markdown 包含标准三行表格（表头、分隔行、数据行），或下一行 `=======` 的 Setext 一级标题。
- 因果：prepareLoomMarkdown 为连续非空行插入空行，仅排除代码围栏和相邻列表起始行；表格行因此被拆开，标题下划线与正文分离。remark-gfm 收到的已不是原始合法块，无法恢复。该转换发生在 safeHtml=false 的普通 Markdown 分支，不是 CSS 表格样式缺失。
- 已执行：实际 prepareLoomMarkdown + 项目已安装 react-markdown/remark-gfm + React renderToStaticMarkup，使用 parse5 统计输出标签。同一合法表格直送解析器得到 1 table、2 tr、2 th、2 td，经预处理后只剩 3 p；Setext 标题由 1 h1 变为 2 p。代码围栏和两项普通列表对照分别保留 pre/code、ul/li。四组断言通过，退出码 0。
- 证据边界与反证：探针运行实际预处理和渲染依赖，不是完整 MarkdownContent 组件/浏览器；该组件额外的 remarkLoomDialogue 只处理引号文本，样本不含引号，源码中也没有修复块结构的后续转换。safeHtml 分支直接使用 props.value，不经此预处理；不能称所有 HTML 表格均失效。已有 markdown-content-model 测试覆盖 token、简单围栏与语法高亮，没有覆盖这些块结构，不将其存在等同于已验收。
- 最小建议：不要以逐行插空行实现正文间距；先保持标准 Markdown 块结构，间距交给现有 CSS，确有软换行产品需求时在 AST/既有解析能力内处理。不继续为每种 Markdown 块追加正则例外，也不引入第二套 parser。
- 关闭条件：普通消息和长文本预览的表格、Setext 标题语义恢复；围栏、列表和现有 Loom token 不回归；随后由真实浏览器核对表格布局与正文间距。

### FE-033 / P3：正文回到初始值时，撤销按钮错误禁用，即使编辑历史仍存在

- 分类：编辑器命令状态 / 交互一致性；状态：已接入实际 Undo 历史能力，组件测试通过；未做浏览器按键。以下为修复前证据。
- 位置：`shared/ui/long-text-editor/long-text-editor.tsx` 的 hasChanges 与 undoEditLabel 按钮；`shared/ui/long-text-editor/code-mirror-editor.tsx` 的 history()/historyKeymap、undo imperative handle。正文消费者如 `features/context-assets/ui/context-asset-detail/context-asset-detail.tsx:314-341`。
- 场景：初始正文 abc，输入 X 得到 abcX，稍后退格删掉 X 回到 abc。用户希望撤销刚才的删除。
- 因果：hasChanges 仅比较 props.value 与 initialValueRef.current；Undo 按钮与“恢复初始内容”按钮共用该条件。正文相等不代表 undo 栈为空，因此操作能力与按钮状态脱节。
- 已执行：使用项目安装的 EditorState/history，通过两次相隔 1 秒、分别标记 input.type/delete.backward 的事务模拟输入与删除；同时从实际 TSX AST 提取 hasChanges 和 Undo disabled 表达式。初始 depth=0/disabled=true，输入后 depth=1/disabled=false，删回初始后 depth=2/disabled=true；调用实际 undo 命令仍成功恢复 abcX。退出码 0，未创建 EditorView、执行真实按键或修改文件。
- 反证与边界：这是工具栏状态问题，不是历史本身丢失；historyKeymap 仍接线，探针只确认命令可执行，不将其输出称为浏览器快捷键验收。恢复初始按钮使用正文差异是合理的，不能把它一并改成历史深度。
- 最小建议：Undo 的可用性跟随现有编辑器历史能力；初始值恢复继续使用差异判断。避免在 React 另维护第二份撤销栈，利用 CodeMirror 当前状态及现有 handle/更新通路即可。
- 关闭条件：删回初始文本但仍有历史时按钮可用；没有历史时不可用；只读、预览和资源切换限制不回归，随后核对按钮点击与快捷键结果一致。

### FE-034 / P2：结构损坏的外观偏好可进入 Store，使 App 根外观 Effect 抛错

- 分类：持久化输入边界 / 启动恢复；状态：已在持久化 merge 校验合法字段和值，模型测试通过；未修改浏览器存储。以下为修复前证据。
- 位置：`shared/studio-shell/appearance-store.ts:23-48`；`app/app.tsx:70-83`；恢复入口 `app/app-error-boundary.tsx:28-43`。
- 场景：`loom-studio-appearance` 中存在 JSON 语法合法、结构无效的记录，例如 `{state:{material:null},version:0}`。这是损坏偏好的恢复场景，不声称正常设置表单会写入 null，也没有证据说用户当前存储已损坏。
- 因果：Appearance persist 只配置 partialize，没有 merge/migrate 结构校验；默认浅合并允许 material=null 替换完整默认对象。App 随后直接读取 appearance.material.mode/blur/opacity；启动时的 initializeAppearancePreview 只写 CSS 默认值，不能修正 Store。safeLocalStorage 只捕获 Storage 访问异常，不校验 JSON 里的对象结构。
- 已执行：转译实际 appearance-store，使用项目安装的 Zustand/createJSONStorage，唯一替身为只读内存 Storage；提取实际 App 外观 Effect 运行。缺少记录、正常 solid 材质、非法 JSON 三组均无异常；合法 JSON 中 material=null 保留为 null，Effect 抛出 `Cannot read properties of null (reading 'mode')`。四组各读取一次、写入次数均为 0，退出码 0。
- 合同与反证：`docs/architecture/ui/window-layout.md` 第 7 节要求损坏或旧版布局存储回退安全默认值；相邻 studio-layout-store 的 migrate/merge 已通过 sanitizeStudioLayout 执行此边界。Appearance 的问题不应扩展为所有偏好读取都不安全，也不需要在每个内部消费者重复空值防御。
- 恢复边界：App 被全局 AppErrorBoundary 包围，其现有动作是 reload 和 `/studio/chat` 链接，两者均不移除损坏偏好，重新加载仍会读取同一记录。探针未挂载真实 React 树，未实测错误页出现和刷新循环；它直接证明的是 hydration 后状态与根 Effect 异常，恢复入口行为由源码确认。
- 最小建议：在外观存储读取边界校验材质对象、枚举与有限数值，合法偏好保留、无效字段采用既有默认值；不要静默重置其他业务数据或要求所有内部组件都增加 fallback。恢复动作若另行提供，应明确仅重置外观偏好。
- 关闭条件：缺失、非法 JSON、结构无效、旧字段缺失及正常偏好均可启动；正常值不被无故重置；再做实际浏览器重载及设置页可达性验收。无需以完整服务端测试证明本地偏好边界。

### FE-035 / P2：切回网页触发重连 RPC 失败，Display 投影错误使时间线正文被清空且错误类型被误报

- 分类：异步恢复 / 容灾降级与日志分类；状态：已实施正文容灾降级、关闭重连突发与网络错误分类保真，定向验证通过，待真实长休眠/断网恢复验收。
- 位置：`features/message-content/model/use-display-projection.ts:102-108`；`widgets/narrative-timeline/narrative-timeline.tsx:427-431`；`widgets/agent-chat-panel/agent-chat-panel.tsx:362,654`；`main.tsx:18-26`；`packages/logging/src/failure.ts:1-38`。
- 场景：在时间线或聊天界面浏览，切换到其他标签页或休眠后返回网页；此时本地网络或 socket 处于重连瞬态，多个后台查询同时触发。
- 因果链：
  1. 触发源：QueryClient 默认未配置 `refetchOnReconnect: false`，网页唤醒/网络重连触发 `useMacroSelection` 及两个 `useDisplayProjection`（Narrative 与 Agent）同时并发发起 RPC 请求。
  2. 误报：原生 `fetch()` 在网络中断或连接重置时抛出标准 Web API 异常 `TypeError("Failed to fetch")`；`withClientBridgeLogging` 将其传入 `@loom-studio/logging` 的 `readLogFailure()`，该函数机械将所有 `TypeError` 映射为 `Invalid operation or value type`，造成误导性错误分类。
  3. 正文清空：`useDisplayProjection` 因 RPC 失败进入 error 状态；`displayText()` 在 `projection.error` 时返回 `undefined`；`NarrativeTimeline` 与 `AgentChatPanel` 在 `projected === undefined` 且 `pending === false` 时将渲染文本兜底为 `''`（空字符串）。界面正文全部变白，顶部显示 Failed to fetch 错误与重试按钮。
- 反证与架构边界：正式架构规定“Canonical Narrative Node 与 Agent Transcript 始终保留原文；Display 投影不改变权威原文”。Display 投影是展示层增强，网络故障或投影失败绝不应将已有正文抹消；应优雅降级展示权威原文（`raw`），并保留顶部错误状态与重试入口。
- 最小建议：
  1. `displayText` 与消费组件在投影出错时安全回退至权威原文 `raw`（或已缓存的 `lastDisplay`），维持顶部错误/重试提示；
  2. `main.tsx` 的 QueryClient 默认参数显式增加 `refetchOnReconnect: false`，避免切出切入页面时发起无意义的并发风暴；
  3. `packages/logging/src/failure.ts` 识别 Fetch 相关的 TypeError，精准归类为网络故障而非操作类型错误。
- 关闭条件：断网或受控 RPC 失败下时间线及聊天正文完整可见且为 raw 原文，顶部错误及重试正常；重连时不无故突发多路查询；Fetch 失败日志准确映射为网络异常。

### FE-036 / P2：扩展目录和事件连接错误只写入 Hook 状态，没有界面消费者

- 分类：通知/恢复接入；状态：已接面板错误/重同步、去重通知及结构化日志；未做真实断网验收。以下为修复前证据。
- 位置：`features/extension-renderers/model/use-client-extension-runtime.ts:65,77-109,145,163-184`；`app/app.tsx:63`；`app/studio-panel-registry.tsx` 的 extensions 装配；`features/extension-renderers/ui/renderer-workspace-panel.tsx:143-152,198-211`。
- 因果：refresh 捕获 list/diagnostics/rules/extractors/reconcile 的失败，setError 后返回 `[]`；EventSource.onerror 也只 setError。返回的 clientExtensions.error 在全部 Client 源码中没有消费，面板只接包列表及 serverDiagnostics，后者不是这份读取错误。首次失败可呈现为空目录，后续失败保留旧目录却没有过期/失败提示。
- 实际后果：启用/禁用/重载/卸载是“提交后 await refresh”；若提交成功但 refresh 失败，外层 Promise 仍成功，局部 run.catch 无法提示刷新问题，卸载还可能显示成功提示并留下旧列表。此处不应把已提交操作误报为未提交，更不能让用户靠重复卸载来恢复目录。
- Log 边界：失败的 typed RPC 仍经过 transport.rpc，Host 激活/销毁也有独立日志；SSE.onerror 不经过 RPC，不能据此声称所有错误都已记录。serverDiagnostics 不等价于本地连接/读取状态。
- 最小建议：现有扩展面板消费这份错误并给明确重读入口，保留已提交结果与“目录未刷新”的区别；全局提示应只在需要用户处理时发出并去重，不对每次瞬时 SSE 断连刷 Toast。
- 关闭条件：初始目录失败、提交成功后刷新失败、事件流异常和恢复均有可发现状态；重试只读取/协调，不重放启用、卸载等写操作。

### FE-037 / P2：State 复制操作绕过已有 Clipboard 反馈能力，失败没有用户提示

- 分类：浏览器能力/通知接入；状态：已接入共享 Clipboard 与成功/失败 Toast，组件失败回归测试通过；未使用真实系统剪贴板。以下为修复前证据。
- 位置：`features/state-variables/ui/state-variables-panel.tsx` 的 copyMacro/getActions；对照 `shared/browser/clipboard.ts`、`shared/hooks/use-copy-feedback.ts`、`features/state-variables/ui/macro-entry-detail.tsx`。
- 因果：copyMacro 只给 writeText 的成功分支发 Toast；复制 Pointer/Value 直接 void writeText，没有处理 rejection。剪贴板权限拒绝会造成未处理 Promise；缺少 Clipboard API 时还可能在点击处理器同步抛错。复制失败时既没有局部错误，也没有通知。
- 反证：main.tsx 的 error/unhandledrejection 会记录安全摘要，但没有把这些全局日志转成用户通知；项目已有 tryWriteClipboardText 与 useCopyFeedback，邻近宏详情等已消费，不需要另建封装。
- 最小建议：复用现有能力，让这三个明确复制命令返回本地化成功/失败反馈；日志不能包含被复制的正文。无需把所有本地复制操作强制上报服务端。
- 关闭条件：成功、权限拒绝和 API 不可用都有可理解结果，无未处理异常；数组复制仍为 JSON，不影响本轮 FE-016 的类型保真。

### FE-038 / P2：语言切换没有同步页面 lang，英文界面仍声明中文

- 分类：i18n/无障碍接入；状态：已接入 locale 到页面 lang 的同步，源码与类型核对；未做屏幕阅读器验收。以下为修复前证据。
- 位置：`apps/studio-client/index.html:2`；`app/use-studio-state.ts:30-31`；`widgets/settings-panel/settings-panel.tsx` 的语言选择；`shared/i18n/index.ts`。
- 因果：HTML 固定 `lang="zh-CN"`，语言设置只更新 React locale 和 Translator；扫描整个 Client 与共享 UI，没有 documentElement.lang 或 lang 属性同步路径。切 en-US 后辅助技术收到的页面主语言仍是中文。
- 最小建议：由 App 的现有 locale 所有者同步根元素语言，不新增第二份语言状态，不逐个组件补 lang；用户正文与独立 iframe 的语言属于各自边界，不能由此推断或强行修改。
- 关闭条件：初始中文、切英文、切回中文时根 lang 与 UI locale 一致；真实读屏发音仍需人工验收。

## 跨模块接入审查

用户补充要求：不能只列局部 bug，还应审查各模块与日志、通知、i18n、无障碍及共享状态/恢复机制是否接齐。此前只有 FE-005/008/010/011/012/014/017/020/023/027/030 等零散覆盖；本轮按下面的完整生产入口清单补齐源码矩阵。结论是基础设施存在、消费方接入不齐，而不是全模块无问题。

| 横向能力 | 当前依据与已有接入 | 已证实缺口或尚未覆盖 |
| --- | --- | --- |
| Log / 诊断 | 正式 logging 文档列出 Server/Runtime/Provider/Transport/Extension 的职责；当前 Client 有根 Logger、RPC 包装、未捕获错误与扩展日志 | 本轮实际追通 Display RPC 日志，不代表逐个服务端模块全审完；业务恢复上下文、错误分类与日志关联仍需逐链检查 |
| 用户通知 / 局部状态 | App 的 operationError/部分 Query → Sonner；扩展 Renderer 有校验与限流的通知入口 | FE-008/027 等路径不一致；没有覆盖所有 Query 的统一错误通知消费。不能用“日志已记录”替代通知，也不能把所有 warn/error 自动转 Toast |
| i18n | Host 有 zh-CN/en-US TS 字典及 Translator | FE-011 的硬编码；原始日志、协议字段和用户正文不强行翻译。日期/复数及扩展 locale 合同仍有文档列明的边界，未全量验收 |
| 无障碍 | 共享 Dialog、图标按钮、树及分割器已有语义和键盘基础 | FE-010/012/014/023/030 说明消费方仍可绕开；需要实际键盘、焦点恢复、错误宣告、减少动态效果和窄窗口验收，ARIA 属性存在不算完成 |
| 请求、缓存与恢复 | Query、operation reporter、局部 draft 各有现成实现 | FE-002/003/006/007/019/020/025；逐链检查身份、版本、取消、刷新失败、部分成功与恢复，不能为了统一而合并不同状态所有权 |
| 扩展宿主边界 | Renderer 通知、日志、主题及独立页面已有宿主入口 | FE-028/029/030 及 iframe 焦点/本地化/错误退出边界需分别验收；不将宿主接入能力等同于每个插件都正确消费 |

### 覆盖口径与公共链

- 范围基准：`shared/studio-shell/studio-layout-store.ts` 的 `STUDIO_PANEL_IDS` 共 16 项；逐一对照 `app/studio-panel-registry.tsx` 与 `app/studio-resource-panels.tsx`。生产目录另有 16 个 Feature、16 个 Widget，均映射到下面的面板或常驻/辅助能力，没有把独立插件源码算作 Host 已覆盖。
- 表中“RPC 日志”特指 `useStudioState → withClientBridgeLogging → createStudioApi` 的失败、安全分类及耗时记录，不代表每个 UI 点击都有业务日志，也不代表所有请求都成功。原始 fetch、浏览器本地能力、Worker 和 SSE 不自动经过该包装。
- “操作通知”指 `operations.run/runReported → operationError → App toast.error`；局部 alert、状态与重试也是正式反馈，不强制所有错误重复发 Toast。`runReported` 返回 undefined 不能作为业务成功证明。Query 不会自动接入 operationError，需要消费方自行处理。
- “已接基础”仅说明源码有真实接线；“有缺口”附 FE 编号或明确未覆盖项；“不适用”只用于无该副作用的本地展示。所有焦点、读屏、窄窗口、颜色与动画实测仍待完成；不因有 ARIA 就标记全面可访问。
- Log、Diagnostic、Trace、Audit、Event、Notification 继续分责。通知是独立能力，不要求先写日志；不新增一个包办全部错误的中间层。Server/Runtime 只追踪这些前端操作的 API 边界，未声称完成所有后端业务模块的新一轮内部审计。

### 全部面板矩阵

以下矩阵保留初始接入审查快照，历史“待修/未修”不代表当前实施状态；各 FE 的现状以本次实施表及条目状态为准。模块清单仍完整，不将静态接入升级为浏览器验收。

源码路径除特殊注明外均相对于 `apps/studio-client/src/`。每行同时覆盖操作入口、API/状态所有者、错误消费和共享 UI 依赖；“未修复”以对应 FE 当前状态为准。

| 面板 ID | 入口与状态/API 所有者 | Log 与通知/恢复 | i18n 与无障碍 | 当前结论 |
| --- | --- | --- | --- | --- |
| `model` | `widgets/model-panel/provider-account-list.tsx` → `features/provider-settings/model/use-provider-settings.ts` | RPC 日志、操作通知、actionError alert；模型目录失败有文案，可再次聚焦读取，手工添加不依赖目录成功 | Translator/原生表单/图标名称已接；Token 系数字段有硬编码（FE-011） | FE-006 已实施请求失效保护，不能因有 error state 认定全部状态完整 |
| `agent` | `app/studio-resource-panels.tsx` → `widgets/preset-workbench`、`features/agent-presets`、`features/prompt-resources` | RPC 日志、资源 Query 错误由 App 提示；保存走操作通知，Mount/Tool 局部错误 | FileTree、PanelTabs、原生表单；预设节点与面板有中文硬编码，继承 FE-014/023/031 | 有基础；创建后选择/提交后刷新仍见 FE-018/025 |
| `preset` | 同上，注册为 `resourcePanels.preset`，不是漏审的另一个实现 | 同 `agent`；不重复计一份独立日志/通知系统 | 同 `agent` | 别名入口已核对；完整资源编辑行为仍按对应 FE 追踪 |
| `resource` | `widgets/context-workbench` → `features/context-assets/model/use-context-assets.ts`、`features/prompt-resources` | RPC 日志、操作通知与本地 role=alert；草稿 failure 保留且基础编辑已有 base.version | Translator、CodeMirror、FileTree；重命名 IME/快捷键及旧路径见 FE-010/014/023/031 | 有基础；不能把 Context Asset 正确基线推广到独立角色目录编辑器 |
| `user` | `widgets/user-resources-panel/user-resources-panel.tsx`；规则独立 Query，其他资源由 props | RPC 日志；rules.isError 有 alert，但没有本地显式刷新入口 | Translator、FileTree 已接；继承树键盘限制 | 有缺口：FE-020 编辑后规则缓存不失效；错误可见不等于恢复链完整 |
| `play` | `widgets/play-panel/play-panel.tsx`；组合角色和会话入口，tab 属于布局 Store | 不新增 API/日志；业务反馈由两个子模块承担 | PanelTabs 有左右/Home/End 和 roving tabindex；子模块继承对应缺口 | 组合入口已覆盖；不能独立标绿绕过角色/会话问题 |
| `recent` | 同文件 `RecentPlayPanel`，以及 `recent-play-rail.tsx`；App 回调激活 Narrative/Agent | 激活走 Runtime 操作通知与 RPC 日志；本地日期筛选无需业务日志 | 大部分 t；最近会话折叠名硬编码，日期使用系统 locale；日历按钮可 Tab 到达，但完整日期名称/焦点返回未实测 | FE-022/026；不能把本地列表等同全局完整历史 |
| `sessions` | `widgets/sessions-panel/sessions-panel.tsx` → Narrative/Agent 回调与直接历史 API | 列表/写入有 RPC 与操作通知；预览错误被吞（FE-008）；档案导入需区分提交与刷新（FE-025） | 标题、菜单部分 t；多处 Host 文案硬编码；菜单/输入有语义，IME 与导入键盘仍有缺口 | FE-007/008/010/022/025；未把空态视为成功读取 |
| `character` | `widgets/character-panel` → `features/cards`；目录/媒体/开场由各自入口 | RPC 路径有日志；上传/导入/导出及远程图片 fetch 不经过 RPC 包装，失败由操作通知或局部错误消费；删除预览有明确门禁/重读 | 原生 Dialog/表单、t 已接；开场文案硬编码，开场选择取消入口 FE-012；附件列表恢复 FE-004 已实施 | FE-021/003 已实施；媒体请求的客户端安全诊断覆盖不等同 RPC |
| `state` | `app/studio-state-panel.tsx` → `features/state-variables` 的运行态/Authoring | RPC 日志；本地 error alert/Toast；刷新可手动执行；FE-037 已补复制失败反馈 | PanelTabs/FileTree/原生字段；树 meta 仍有中文；FE-014/015 已实施 | FE-016/019 已实施；不能据此认定 State 所有接入问题完成 |
| `macro` | `app/studio-macro-panel.tsx` 组合 `features/state-variables/ui/macro-*` 与 `features/prompt-build` | RPC 日志；检查错误传入 MacroInspector alert/刷新；选择 mutation.error 被消费；作者保存有 error/成功反馈 | Translator、搜索、radio、树状目录；无全局新通知包装需求 | 检查/选择链已接基础；角色目录里的独立宏草稿 FE-003 另计 |
| `text-transform` | `features/text-transforms/ui/text-transform-panel.tsx`；规则、提取器、脚本、运行态检查 | RPC 日志；controller.error → Detail alert，工具栏刷新可恢复；并非必须再弹一次 Toast | t、JSON/YAML/CodeMirror、树/菜单；共享路径问题仍适用，FE-014 已实施 | FE-003 已实施；FE-020 目录失效仍待修，脚本刷新Token不替代其他 Query 失效 |
| `inspector` | `widgets/inspector-panel` → `widgets/model-panel/ai-capability-lab.tsx`、`widgets/prompt-build-flow` | Trace/Transcript/JSON 是领域诊断，不是 Log 替代物；AI Lab 调用走 Provider 回调和本地错误，表单解析在本地 catch | t 为主；Token 中文说明和技术标题未统一；部分本地解析错误仅普通 p，读屏动态宣告不完整 | 接入不等于可观测性统一；本地解析反馈宣告列入 a11y 后续，不声称已读屏验证 |
| `logs` | `widgets/log-viewer` → `features/log-viewer/model/use-log-feed.ts` / `use-log-history.ts` | Client Memory + Server RPC/JSONL 分源；读取失败、取消、刷新、复制失败均有局部状态；不对轮询每次失败重复 Toast | t、图标名称、aria-live、原生筛选；日志原文与枚举不强行翻译 | 已接基础；FE-017 未读过滤仍未修；Browser 日志不持久化/不上传是合同而非漏接 |
| `extensions` | `features/extension-renderers`、`shared/extension-renderer-runtime`，含本轮读取时已有的 `timeline-extension-panel.tsx` | Host 生命周期有 Log/Diagnostic；管理操作有 Toast；Renderer通知有权限/格式/限流；目录/SSE错误 FE-036 未消费；采用面板有 alert/refresh | 管理 Host 大部分 t；SettingField 继承共享 Field；插件 label 是贡献数据，SDK/iframe locale、焦点跨边界未完整定义 | FE-002 已实施；FE-036 待修；新采用面板仅审查当前脏工作区快照，不替其他任务验收或改写 |
| `settings` | `widgets/settings-panel` 与 `background-materials-view.tsx`；网络设置走 API，本地外观走 Store | 网络保存走操作通知/RPC；本地语言/材质/布局不需要 RPC 日志；持久化异常不能靠网络日志说明 | 语言字典可用但分类与外观仍硬编码（FE-011）；背景 tabs 已有键盘与 panel 关联；lang FE-038、motion FE-005 | FE-034 非法本地持久化仍未修；有语言切换不代表所有 UI 和辅助技术已接齐 |

### 常驻与共享能力

| 能力/覆盖模块 | 源码证据与已有接入 | 缺口、边界与结论 |
| --- | --- | --- |
| Timeline / Narrative / 导航定位 | `widgets/narrative-timeline`、`features/narrative-runtime`；操作回调、编辑 error、锚点 loading/failed/unavailable、复制反馈；SSE 提交补读 | Display 重读策略本轮不改；导航 FE-022、Navigator FE-024、撤销 FE-033 未修；DOM 长列表焦点仍待浏览器 |
| Agent Chat / Session / 主写作 | `widgets/agent-chat-panel`、`features/narrative-runtime`；RPC/操作通知、sessionReady、恢复动作、独立查看与主写作身份 | FE-027 审批失败、FE-030 模态/快捷键、FE-011 硬编码；没有把 aria-modal 当成真实 focus trap |
| 输入区与模型选择 | `widgets/chat-composer`、`widgets/agent-composer`、`widgets/agent-panel/agent-model-editor.tsx`；提交复用 Runtime，模型保存有 pending/error，token 使用计数控件 | 输入区部分文案与 motion 漏接；普通 typing/展开不强制写 Log；主输入 IME 处理不能替代 FE-010 的其他输入入口 |
| 消息与 Markdown / Renderer | `features/message-content`、`shared/ui/markdown-content`、Renderer Surface Host；HTML 隔离/消毒、显示投影状态、诊断 | FE-028/029/032；源码安全处理不代表 iframe 焦点/可访问内容完整；不回退 raw 绕过 Display |
| 官方内容与资源引用 | `features/official-content`、`features/resource-references`；RPC 日志，局部 pending/alert，官方安装成功 Toast/刷新 | FE-012 取消、FE-011 引用弹层中文；引用失败没有独立重试，可关闭重开，不能算完善的原位恢复 |
| PromptBuild / Token Worker | `features/prompt-build`、`widgets/prompt-build-flow`、`shared/tokenizer/use-token-counts.ts`、`features/context-assets/ui/resource-token-summary.tsx` | 宏检查 error 已消费；Token pending/error 到 UI，Snapshot 有显式刷新；本地 Worker 不是 RPC，不声称有 transport 日志；计数输入不能写入普通诊断日志 |
| 撤销与编辑历史 | `features/edit-history`、`pages/studio/use-studio-shortcuts.ts`；草稿/已提交编辑由各自所有者管理 | FE-001 错误重做意图、FE-033 按钮可用性；无需为每次本地撤销新增事件总线 |
| 脚本 / 扩展运行时 | `features/loom-scripts/runtime/loom-script-renderer-runtime.ts`、`client-extension-host.ts`；脚本错误报告 Renderer diagnostic，解析挂载错误在 App 提示；扩展 ctx.logger、ui.notify 权限检查 | locale 并没有同等完整传入所有贡献 UI；Renderer host.prefersReducedMotion 从 OS 读取，与应用最终 motion 偏好不完全一致，扩展 FE-005 消费范围；跨 iframe 焦点、退出与主题传播需独立验收 |
| Shell / Router / 浮层 / Header | `shared/studio-shell`、`pages/studio`、`shared/ui/window-column-layout`、`master-detail-workbench` | 导航复用 Router/History，Header 图标名多数 t；失败目标有局部状态；共享 resize/键盘存在，不能据此保证所有浮层已恢复焦点；FE-001 已实施，FE-022/030 与共享中文 fallback 待修 |
| UI primitives / 树 / tabs | `packages/loom-ui/src/component/{dialog,field,icon-button,context-menu,dropdown-menu}.tsx`、`shared/ui/file-tree`、`shared/ui/panel-tabs` | 原生 showModal/cancel、Field 的 label/error 关联、Radix 菜单、树 roving 与 tabs 方向键已接；消费者可绕开（FE-012/014/023/030），不是底层“有组件就全站合格” |
| 本地浏览器 / 媒体 / 通知 | `shared/browser/{clipboard,download}.ts`、`shared/hooks/use-copy-feedback.ts`、`shared/ui/media-viewer/image-viewer.tsx`、`notification-toaster.tsx` | ImageViewer 原位加载/操作失败、键盘缩放、图片 alt 已接；State FE-037 已补齐复制成功/失败提示；Toast 本身可复制不等于所有业务失败有通知 |
| 主题 / 本地持久化 / 语言根状态 | `styles/global.css`、`shared/hooks/use-motion-preference.ts`、布局/外观 Store、`shared/i18n`、`main.tsx` | token 缺名 FE-009、失效 CSS FE-013、motion FE-005、非法 material FE-034 仍待修；lang FE-038 已接；默认主题源代码可检查不等于对比度/动画人工验收 |

### 源码完整性与未完成验收

本轮源码清单覆盖全部 16 个面板、16 个 Feature、16 个 Widget；共享能力按上述入口核对。没有把整个 repo 的每个包都写成“全面通过”，也没有检查任意第三方插件内部 UI。覆盖矩阵记录的是哪些能力已接、哪些明确无需接、哪些有可证明缺口。

仍未完成：真实浏览器网络/后台生命周期、真实 OS 输入法、屏幕阅读器、模态与 iframe 焦点、触摸/窄窗口、颜色/动画主观验收，以及真实 Provider/文件导入/删除等外部副作用验收。下一批修复依旧按数据正确性和实际阻塞排序，不因“完整审查”把所有缺口一次性改成全局框架。

## 优化机会

### OPT-001：流式显示重复格式化已提交的历史工具数据，可在有浏览器证据后收敛

- 事实：`widgets/agent-chat-panel/agent-chat-panel.tsx:97-214,260-261` 每次 messages 数组变化都完整 buildRenderItems；其中 JSON.stringify 历史工具参数/结构化结果，在工具组折叠和离屏时也执行。`use-narrative-runtime.ts:1600-1603` 的 text-delta 会返回新数组；React 可批处理同批事件，但发生的新 render 仍重建完整呈现列表。虚拟列表只减少 DOM，不减少这段转换。
- 可达规模：`use-narrative-runtime.ts:1508-1519` 会读完所有 transcript 页，而不是只保留最新 100 条，因此长会话能积累这部分成本。
- 已执行：实际 buildRenderItems、只变最后一条 partial 文本的内存样本，历史 200 个工具/451 条 entry/800KiB 结果时每次重复序列化 400 次，10 次样本中位约 0.71ms；1,000 个工具/2,251 条 entry/4,000KiB 结果时为 2,000 次、中位约 2.08ms。Node 本地合成数据，不代表用户浏览器、真实长会话或整个 React 帧耗时。
- 判断：目前证据足以说明存在可避免的重复转换，不足以证明已造成卡顿；不作为确认缺陷，不建议马上引入全局缓存或重写消息存储。
- 最小后续：若真实 trace 显示它占用显著预算，优先把大结果格式化延迟到展开/显示时，或按稳定已提交 entry 身份复用转换；验证配对、晚到结果和流式边界后再实施。

### OPT-002：最近面板同日记录分组反复复制数组，可用局部追加消除平方成本

- 事实：`widgets/play-panel/play-panel.tsx` 的 groupByDay 对每条记录执行 `groups.set(dayKey(...), [...已有分组, item])`。同日 N 条记录会复制 N×(N−1)/2 个旧元素；Timeline/Session 分别调用。下游每个日期只展示 `group.items.slice(0, 8)`，但复制发生在展示截取之前。
- 可达数据源：最近面板 Timeline 来自 allTimelines；`use-narrative-runtime.ts` 的 refreshAllTimelines 会读完分页，无“只取最近 8 条”的输入上限。Agent 当前受 FE-026 局部接线限制，不借本机会隐式修复或改变其范围。
- 已执行：提取实际 groupByDay/dayKey，以同日 500、2,000、5,000 条内存记录测量。用仅统计数组迭代次数的 Map 替身，分别确认旧元素复制 124,750、1,999,000、12,497,500 次，并断言分组记录顺序完整。另用原生 Map、不插桩版本，3 次预热/7 次采样，本机 Node 中位耗时约 1.23ms、8.71ms、22.59ms，退出码 0。
- 判断：平方复杂度与重复复制已证实，但没有真实用户同日记录分布、浏览器 trace 或完整 React 帧证据，不计入确认缺陷，也不声称当前日常使用必然卡顿。
- 最小建议：函数内部 Map 为本次计算新建，分组数组没有跨 render 共享；可直接向局部已有数组 push，并缓存每条记录的 dayKey。维持日期顺序、组内顺序和原输入不变，无需新依赖、全局缓存或状态模型。
- 验证与停止条件：实施时用跨日/同日数据核对输出一致、输入不变，再测原热点；不因此引入新的分页/截断产品语义，也不默认启动全仓性能改造。RecentPlayRail 在分组前已 slice(0, 8)，同样写法的成本受限，不应机械扩大修改范围。

## 待验证候选

- 日志/State 等面板存在 viewport media query 和最小列宽；窄窗口是否真正裁切需要尺寸证据，当前不把 media query 本身作为缺陷。
- LongTextEditor 清空撤销按钮在 disabled / preview 状态下未同步禁用；需追真实消费者是否能进入该状态及提交语义。
- Extension SettingField 的 `versionRef` 在 dirty 检查前随 props 更新，与 FE-003 类似；需继续区分外部刷新与明确失败后用户重试的不同合同，未单独升级问题。
- State 编辑草稿在相同目标的 refreshToken/revision 改变时会被清空（`state-variables-panel.tsx:41,76-81,109-118`）；父层 refreshToken 来自 `lastRun.runId`。这是已读实现行为，但要区分用户显式刷新、跨目标切换与后台运行变化，先作为草稿保留策略建议，不直接改写合同。
- 导航尺键盘 End/Home 会切换虚拟刻度窗口，但处理器只 onNavigate、不转移焦点；长会话跳到另一端后，原先聚焦的 button 可能被卸载，后续方向键失去导航目标。需针对焦点与窗口更替做最小 DOM 验证，不凭无 focus() 单独定性。

## 覆盖与接续

| 链路 | 当前状态 | 证据与后续 |
| --- | --- | --- |
| 项目地图、前端状态所有权 | 已阅读 | Guide、Client README、UI/Application UI 正式索引 |
| 快捷键与编辑历史 | 已定位并做函数探针 | FE-001；未做浏览器快捷键验收 |
| Composer、布局与缩放 | 审查中 | Hover/焦点、motion、列几何和窄窗口消费 |
| 日志实时与历史查询 | 已核对查询与 UI 消费 | FE-017；历史草稿有未提交提示，请求取消/身份和分页上限已读；未做实际浏览器滚动验收 |
| Provider 保存与模型列表 | 已定位并做交错探针 | FE-006；继续检查局部成功和表单身份 |
| 资源草稿、扩展与基础控件 | 多条入口已审查 | FE-002/003/004/010/012/014；继续查未覆盖消费者 |
| 消息预览与宏检查 | 审查中 | 身份、取消、尺寸和只读呈现 |

第二轮已覆盖角色目录各编辑器、扩展设置切包、会话历史保活/缓存/失败、主从布局、背景材质、翻译边界、官方内容弹窗、快捷键与若干原生输入。已排除：Display 旧响应替换编辑后正文、导航异步目标无守卫、Narrative overscan 无范围保护、缺失 focus token 就等于无任何焦点反馈。排除结论只针对已读链路，不表示模块全量通过。

第三轮已覆盖非 dev CSS 静态引用、State 树键盘事件与展开生命周期、State 值类型、TextTransform 保存/读取守卫。SCSS 扫描只用于发现样式归属遗漏，不替代真实窄窗口验收。FileTree 不能因为有键盘模型单测就被判定实际嵌套输入行为正确。

第四轮覆盖日志计数消费、资源创建后导航、共享 Dialog/菜单、图片预览、Markdown/HTML 尺寸、Agent 工具配对。排除：Agent tool invocation 使用 Host createId，不直接复用 Provider call ID，未发现所疑跨 Run 同 ID 配对；已删除 Preset ID 保留有明确现有测试，不擅自改为自动切换；图片预览当前正常换图先关闭重建，不因组件未实现任意 src 热切换就报错。尚未发现生产 Dialog 内嵌 Radix 菜单的具体触发链，不将 Portal/body 与原生模态的潜在冲突升级为问题。

第五轮检查共享列布局、窄屏状态、State 配置编辑与 Token Worker 调度。MasterDetailWorkbench 按实际容器测宽并设置不可见 pane 的 inert，不能因为局部样式使用 viewport media query 就判定整个工作台无容器响应；若样式选择器已无生产消费者，也不将它的 min-width 升级为实际溢出缺陷。State 配置保存已记 FE-019。

第六轮检查“我的资源”与各编辑器的缓存衔接，FE-020 记录规则目录失效缺口。PromptResource 导入会 clonePromptResourceNode 并生成新 ID，普通复制也 clone，因此未把假设的导入节点 ID 冲突记成缺陷。

第七轮检查角色删除确认的预览/失败/级联消费，FE-021 是当前最高优先级。所有删除验证均以内存 API 替身完成，没有对真实 Card、Timeline、Session 或扩展数据发起删除。

第八轮检查 Timeline 导入后的路由一致性和键盘入口，记 FE-022/023。activateTimeline 有 selection/API 代际保护，不能笼统称为所有切换都缺异步守卫；本轮问题在 App 导入完成后的导航衔接。

第九轮确认 Client/UI 源码没有相对 HEAD 的本地修改，继续导航尺、消息虚拟化与转换成本。新增 FE-024，扩展 FE-022 的跨 Timeline Agent 入口，记录 OPT-001 的合成测量及不足。没有把虚拟化本身称为已解决全部长会话成本，也没有把 2ms 本地转换夸大为生产卡顿。

第十轮沿 Timeline/ST 导入检查创建后的刷新与激活失败，候选升级为 FE-025。对两条实际处理函数分别执行失败及成功对照，确认反馈丢失，不把潜在重复创建当成已发生的数据事故。角色卡批量导入和媒体上传的相邻路径只做初读，尚未完成独立验收。

第十一轮检查应用设置、Provider/Capability 表单、编辑历史、窗口调整和最近面板。新增 FE-026，补查实际父层数据源而非只读子组件。反证：Capability 新建保留已提交 ID，表单有提交互斥、inert 和创建后选择的卸载保护；AgentModelEditor 以 preset.id key 隔离已提交状态；UI 缩放调整字体/图标 token 而非整体 CSS zoom，不能套用“物理坐标与缩放尺寸混算”的假设；setEndpoint 当前没有生产调用者，未将假设的运行时切换故障编号。以上只覆盖对应疑点，不代表这些模块全量通过。

第十二轮检查 CodeMirror 外部值/只读同步、PanelTabs 键盘行为、宏读取取消及 Agent 暂停/审批。新增 FE-027；没有把未消费的取消回调算成真实按钮故障。工作区此时出现其他任务对 Client 的 5 个文件、84 行新增，涉及 extensionAdoptions DTO/API/状态暴露；已读相关 diff，未覆盖或混入。第九轮“Client 无改动”是当时快照，不代表当前工作区。当前新增不改变 FE-021 删除逻辑，但使 use-cards.ts 后半段及 use-studio-state.ts 返回对象的旧行号顺延，实施时应按函数名定位并复核。

第十三轮沿扩展安装和行内 Renderer 继续检查，确认 FE-028 的 Markdown 源坐标与渲染坐标混用。已有 HTML 拒绝分支和源区间单测并不能证明普通 Markdown 的位置正确。扩展安装的提交后失败处理仍待结合 token 消费/分包提交合同审查，不把清空 preview 单独当作已确认缺陷。其他任务的 Client 修改继续增加，当前快照为 10 个文件、171 行新增/3 行删除；本轮 Renderer Node/Markdown 证据文件不在该 diff 中，不审判尚未完成的 extensionAdoptions 接线。

第十四轮检查 Vite/React Compiler、懒加载、Token Worker/计数身份、资源引用弹窗及最近面板分组，新增 OPT-002。编译器使用 annotation 模式，不推断所有未标注组件自动获得 memo。Token Worker 已限制输入/排队/分批并在失败后释放 Worker；资源统计明确禁止把旧计数映射到新树，Narrative token scope 包含完整 node ID 顺序，不能仅见旧 counts 保留就报串行身份错误。设置版本号也有模块级常量定义，局部截取遗漏尾部声明不是缺陷。以上均为定向反证，不表示已完成性能验收。

第十五轮补查 Renderer 实例、主题订阅、iframe 生命周期与 Standalone Session，新增 FE-029。sandboxMount 当前唯一生产实现将解析和挂载放入有 catch 的异步链，未把任意虚构的同步 throw 升级为 Shell 崩溃问题；普通 direct/shadow disposer 的同步/异步失败也已有独立保护。

本轮尝试补 FE-028 的客观 DOM 诊断：创建隐藏 about:blank 后，导航到内存合成 data: 页被浏览器安全策略明确拒绝（仅允许 http/https，并禁止为同一目的绕过）。未改用 CDP、其他浏览器或协议重放；已关闭空白页。该尝试不构成真实 Range 替换证据，FE-028 的浏览器验证仍未完成。后续只继续不依赖该被阻止行为的源码与内存函数审查。

第十六轮依据正式可访问性文档审查审批弹层，新增 FE-030。检查实际 section/遮罩结构及全局键盘避让，执行自定义 section 与原生 dialog 查询结果的对照。没有把 API 失败反馈 FE-027 与模态键盘隔离混为一项，也未通过重新打开其他诊断页面绕过上一轮浏览器策略。

第十七轮补查日志历史筛选/取消/追加页/诊断报告、角色媒体上传与批量导入。日志历史的 query/event/module/level 是显式提交草稿，UI 有 historyDirty 提示，不能把提交前仍显示旧结果单独算成筛选失效；读取有 AbortController 与当前请求比较，追加页有 5,000 条上限。角色上传已在目录刷新之前发布已提交结果；批量导入同样保留成功卡片，但刷新失败会掩盖逐文件错误，经三组实际函数探针后扩展 FE-025，没有重复编号。共享 async-operation reducer 在成功后不再保留错误 sequence 的现象仍不足以单独定性：普通 run 可能需要报告独立操作失败，runLatest 另有代际门控；selectCard 方法虽可构造交错，但当前源码搜索未找到生产调用，不能仅凭 Hook 导出和模型测试建立用户触发链。本轮未把该候选升为确认问题。

第十八轮沿资源树、路径复制、Markdown 点击与作者预览检查，新增 FE-031/032。路径问题限定旧式 loom-asset token，与按稳定 ID 读取的新资源引用分开；Markdown 问题确认到解析后的块结构，不凭截图判断。资源树的创建完成选中已有 FE-018 覆盖，不重新编号。Client 工作区仍是其他任务的 10 文件、171 行新增/3 行删除，本轮只读取相关模块，没有介入 extensionAdoptions 修改。拖拽跨资源写入和筛选交互的完整链仍待继续核对。

第十九轮追查 FileTree drop 到 useContextAssets 持久化。写入使用 scope.queue 串行调度，canMoveContextAssetNode 阻止自身/后代目标，真正提交前拒绝跨 resourceId，成功响应后才发布资源；未将 UI 允许出现拖拽反馈等同于跨资源误写。搜索结果是独立按钮列表，没有把筛选结果索引传给拖拽排序；新建完成选中和输入法问题仍归 FE-018/010。继续核对长文本状态时新增 FE-033，证明 Undo 工具栏以内容差异替代历史能力判断；没有把同一组件中“恢复初始内容”的合理差异门控误报。ResourceBindingDialog 的 pending 控制已读，关闭后重开/目标切换的异步提示仍未做完整生命周期验证。

第二十轮检查编辑器身份、诊断面板调用表单及绑定缓存，未新增确认项，具体反证如下：

- `context-asset-detail.tsx:314-341` 按 node.id key 重建 LongTextEditor；Narrative 编辑器位于 entry.id 的行内，且 `narrative-timeline.tsx:82-92` 将 editingId 传为 pinnedId，`use-conversation-viewport.ts:24,36-40` 的 rangeExtractor 显式补入该索引。因此普通虚拟滚动不会仅因离屏卸载当前编辑器，不能据虚拟化本身推断初始内容或撤销历史丢失。资源删除、主动切换/取消仍是另一类生命周期，不在此反证内。
- `AiCapabilityLab` 的 InvocationForm 按 profileId key 挂载，submitting ref 阻止重复提交，running 时表单 inert；账户/能力创建和更新组件也按身份 key 区分。没有真实跨身份串结果证据。动态 number/select 控件与默认值值得后续实测，但当前仓库的正式内建能力只声明 messages JSON 输入，尚未定位使用这些字段的实际扩展；没有借假想 Provider 宣称现有生产调用已失败，也未向真实 Provider 发请求。
- `features/prompt-resources/model/use-prompt-resource-state.ts:38-54` 统一失效 bindings 查询；`use-prompt-resource-commands.ts:132-149` 的 replaceLoreMounts 调用它，`app/use-studio-state.ts:318-320` 的角色资源绑定完成后也调用。因此不能把 FE-020 的规则目录缓存缺口扩展到这两条已有失效通路。刷新错误的反馈与弹窗目标切换仍需分别核对。
- NarrativeRangePreview 在 timelineId/branchId 改变时推进 requestId 并清除结果，load 只发布当前请求；其文案国际化缺口与 FE-011 同类，不重复编号。Inspector 的长 JSON 展示仅做源码阅读，尚无真实数据规模和浏览器性能证据，不升级为卡顿结论。

第二十一轮检查布局偏好、窗口 Resize 和 Appearance hydration，新增 FE-034。StudioLayout 的存储清洗会限制 UI scale/rail width，并过滤尺寸和资源视图的非法结构；WindowColumnLayout 通过 resolveColumnSizes 计算当前有效宽度，没有在单纯容器变窄时直接写回偏好。共享列分割器提供方向键及 Home/End，不能因窗口外框 Resize 只处理方向键就称所有列分割器都缺键盘操作。Appearance 的结构缺口在真实持久化中间件与实际根 Effect 上复现，严格限定损坏偏好场景，未写真实 localStorage。窗口小尺寸、指针取消和 CSS 几何仍不能只凭模型读取宣称已做浏览器验收。


恢复后的第一批实施（2026-10-07）：用户明确要求“先修其他内容，继续完整审查模块接入”。本轮实施 FE-002/016/019/021，保留已有其他任务的修改；新增 FE-036/037/038，并以 16 面板/16 Feature/16 Widget 清单补齐源码矩阵。未恢复无边界性能/网络根因探测。当前不是所有问题都修完，而是首批高风险修复与完整入口级接入审查完成。

## 验证账目

### 本次继续实施验证

- 主要验证批次：11 文件 / 113 用例通过，涵盖资源结果导航、导航身份、角色/存档导航、Agent Session 生命周期、角色批次失败、长文本 Undo、审批/延迟挂载控件、日志筛选、会话预览/导入、State 控件及来源隔离。见 `tests/unit/client/` 对应测试文件。
- 另有外观 merge、新建会话、会话选择、官方内容、资源引用和 State 模型的 6 文件 / 30 用例通过；较早的审批/暂停/预览批次为 3 文件 / 39 用例通过，存在重叠，不相加当作独立测试数。
- 实际 App 回调探针配真实内存 QueryClient：规则变更只失效当前 endpoint；Agent 激活晚到不跳转，当前结果同步 Timeline/Branch。
- 最后两处修订单独复验：Session 生命周期 14 用例、路径模型 3 用例通过；运行控制/恢复的 17 用例也通过。取消导航用例首版缺少 Session list 替身，未真正走到取消分支；补齐并增加错误报告未触发、ready 恢复断言后通过，不再以原来的宽松断言作为证据。
- 实际扩展通知 Effect 探针通过：相同连续错误只记录/通知一次，恢复后新的故障可以再次通知，Toast 使用稳定 ID。六个相关组件的 CSS Module 引用核对无缺失，扩展错误状态的 Grid 行定义单独编译通过。
- 实际 Renderer 函数配 TreeWalker/Range 替身：三类不可靠输入在 Range 创建前拒绝，两次倒序纯文本替换通过。不是浏览器 DOM/React 清理验证。
- 18 个变更 SCSS 按 Vite 的 abstracts 注入方式编译通过；八种原失效颜色 token 在 Client/UI 样式中零消费引用。仅证明编译/引用，不证明 computed style、对比度或视觉效果。
- Client 定向类型检查通过；zh-CN/en-US 各 1,426 key，无重复或缺项。字典检查探针首次未解包 `as const/satisfies` 而报错，改为 AST 访问后通过，不是产品缺陷。
- 首轮发现并修正此次接线错误：审批 Button 非法 variant、State 的 Translator 变量名及三个重复翻译键。旧测试按中文硬编码查找 en-US 控件导致失败，改为使用真实 Translator 后通过。没有把失败检查冒充通过。
- 没有全仓测试、生产 build、浏览器/读屏或人工视觉验收，没有真实导入、审批、删除或 Storage 写入；没有提交、推送或新依赖。其他任务的 State/扩展/服务端变更继续保留。

### 持续修复验证

- 最终定向执行 8 文件 / 61 测试，全部通过：`frontend-audit-controls.test.ts`、`text-transform-source.test.ts`、`state-panel-source.test.ts`、`agent-session-picker.test.ts`、`file-tree.test.ts`、`markdown-content-model.test.ts`、`renderer-session.test.ts`、`context-asset-explorer-actions.test.ts`（均在 `tests/unit/client/`）。
- Client 类型检查通过：`pnpm exec tsc -p apps/studio-client/tsconfig.json --noEmit --composite false --incremental false`；最后一次检查包含目录 onCommitted 回调变更。
- 两组实际源码内存探针通过：目录宏在外部刷新后继续提交原版本、保留冲突输入，提交后刷新失败仍推进基线；FileTree 嵌套键盘隔离与三处 IME Enter/Escape/keyCode 229 门禁。均未操作真实业务状态。
- 首轮新增测试失败是 fixture 缺少 Markdown 必填 codeBlockLabels、Provider 的 document 替身，以及 Sonner mock 没命中 Client 实际 ESM 入口；修正后上述用例全部通过。旧的 StateAuthoring 通知断言也改为同一个真实加载入口。目录宏探针首次还存在 VM 跨 realm Error 身份差异，注入同一 Error 后通过；未将这些脚手架失败作为产品缺陷。
- 定向 Diff 空白检查通过。未执行全仓测试、生产 build、浏览器诊断或人工视觉验收；不会把 SSR、Hook 替身、处理函数探针描述为真实 UI 交互。
- 保留全部既有工作区修改；没有提交、推送、新依赖、数据迁移、真实网络/审批/写入操作。该历史批次未改 FE-031；FE-031 已在本次继续实施中独立修复，不再记作未获确认。

### 本轮实施验证

- 定向 Vitest：`extension-settings-form.test.ts`、`character-panel.test.ts`、`state-variables-panel.test.ts` 的控件/页面静态渲染，以及 `state-panel-source.test.ts` 的真实组件 Hook 行为；最终 4 文件、15 用例通过，退出码 0。新增高价值用例覆盖数组语法/类型/提交、慢保存锁定与失败保留、卸载后的旧完成，以及实际作用域身份；Hook 替身不等于 React DOM 验收。
- 删除和扩展设置另执行实际源码内存探针：提交处理器及 UI 同时阻止未完成/失败预览，批量部分失败整体拒绝，成功范围可见；设置加载/失败禁止编辑、旧写卸载后不发布、可重读。退出码 0，无真实 API、数据库或 Storage 写入。
- Client 定向类型检查：`pnpm exec tsc -p apps/studio-client/tsconfig.json --noEmit --composite false --incremental false` 退出码 0。首次保留 composite 却关闭 incremental 的命令被 TS6379 拒绝，修正检查参数后通过，不是产品错误，也没有通过构建覆盖工作区产物。
- 字典 AST 核对：zh-CN/en-US 各 1,245 个 key，集合一致；生产 JSX 文案候选扫描与人工消费链核对扩充 FE-011，不把候选数量当缺陷数量。
- 台账结构核对：当前保留 37 项，编号不重复，删除的编号不复用；实际 STUDIO_PANEL_IDS 的 16 个 ID 均有矩阵行。定向 `git diff --check` 通过；不以这些文档/格式检查代替行为测试。
- 本轮未运行全仓测试、生产 build 或真实浏览器；没有对原始 dirty 文件执行回退、提交或推送。FE-036/037/038 是源码确认，未伪称现场动态复现。

### 初始审查验证

- 已完成十一组只读行为探针：FE-001 实际快捷键处理函数、FE-002 实际扩展表单与字段函数、FE-003 实际目录宏编辑器、FE-004 实际滚动 Hook、FE-006 实际目录读取/连接保存处理函数、FE-010 实际会话名输入处理函数、FE-014 实际树键盘处理函数、FE-015 实际树初始化 Effect、FE-016 实际 State 转换/控件/提交构造、FE-018 实际创建结果/导航回调、FE-019 实际配置保存交错。均使用内存事件/Hook 槽位或 API 替身；最终有效探针退出码 0，观察到上述反例。FE-019 首次 fixture 不合法的失败另见该项，未当成产品证据。另完成 CSS token 定向扫描和修正后的 SCSS/静态属性检查，没有添加测试文件，没有执行持久化写入。
- 这些探针不是 React DOM、浏览器、服务端 CAS 或完整集成测试；模拟前提和真实生产入口分别记录在条目中。
- 另对 FE-020 执行一次实际 QueryClient/QueryObserver 的内存缓存探针，退出码 0；它证明普通 options 更新不会替代显式失效，不证明真实页面已验收。
- FE-021 另完成一次实际预览/确认/提交链探针，退出码 0；仅记录请求参数和 JSX 内容，不执行服务端删除。
- FE-022 另完成一次实际导入完成回调与 App 门控表达式探针，退出码 0；没有真实存档导入和浏览器发送。
- FE-024 完成实际组件空→非空与初始非空对照探针，退出码 0。OPT-001 完成两组大小、各 10 次的实际转换函数合成测量；具体数字与环境限制见条目。
- FE-025 完成两种实际导入处理函数的提交后失败/成功对照，退出码 0；API 与完成回调均为内存替身，未执行真实导入或重复创建。
- FE-025 另完成实际角色批量 importCards 的混合成功/失败批次，正常刷新、列表失败、关联刷新失败三组对照；确认成功卡片保留而批次错误可丢失，退出码 0。只读取已有相关测试作为边界证据，没有将未运行的测试写成通过。
- FE-026 完成实际局部/全局列表函数与最近面板接线的三种范围探针，退出码 0；未进行真实会话查询或浏览器操作。
- FE-027 完成实际暂停/审批函数与拒绝按钮的失败/成功对照，最终退出码 0；初次 VM 调用错误及修正已在条目注明，没有真实 Run 控制。
- FE-028 完成实际 Markdown SSR + parse5 文本节点 + 实际 resolver/边界函数的三个样本，退出码 0；不是浏览器 Range 或 React DOM 集成验收。
- OPT-002 完成实际日期分组的三组复制次数和无插桩耗时测量，退出码 0；只读内存样本，未做浏览器 trace。
- FE-029 完成实际 Session Host 的普通/hash/query+hash 三个地址构造样本，退出码 0；窗口和通道均为替身，未执行真实页面握手。
- FE-030 完成审批根 JSX 结构核对、实际 Shell 键盘处理的 section/native-dialog 对照，退出码 0；仅内存回调计数，没有真实撤销、Tab 焦点或辅助技术测试。
- FE-031 完成实际路径复制模型到 token 解码、查找的四组内存断言；FE-032 完成实际预处理/解析器/React SSR 的四组块结构对照，均退出码 0。前者不含真实点击，后者不含完整组件与浏览器布局。
- FE-033 完成实际 TSX 条件与 CodeMirror history/undo 的内存对照，退出码 0；覆盖同一文档回到初始值而仍能撤销，不声称真实 EditorView、按钮点击或快捷键已验收。
- FE-034 完成实际 Appearance Store / Zustand hydration 与 App Effect 的四种存储输入对照，退出码 0；只读内存 Storage，写入次数为 0。没有挂载根组件、修改真实偏好或实测错误页刷新。
- 曾创建隔离空白浏览器页，但目标诊断页被浏览器策略拒绝，空白页已关闭；未完成客观 DOM/尺寸诊断或人工视觉验收，不能以尝试代替通过。
- 不对真实性能收益、生产内存、真实 Provider 或完整 CI 作通过声明。
