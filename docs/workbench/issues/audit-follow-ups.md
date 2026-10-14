# 审查归档后的延期事项

状态：Deferred / Backlog（更新：2026-10-14）

本轮审查修复已收尾。本文只保留归档后仍需可发现的事项，不重新启动审查或扩大实施范围。历史证据见[修复实施记录](../../archive/plans/audit-issue-remediation-plan.md)。

<a id="continuous-review-acceptance-2026-10-06"></a>

## 持续代码审查：F-06 延期验收

2026-10-06 用户明确同意延期并归档。[原审查与修复记录](../../archive/issues/continuous-code-review-2026-10-02.md)中的 CR-001～013、QA-001～003 与 DOC-001 本机修复已收尾；以下仅为未验收事项，不是待修缺陷，也不触发自动审查。

- 真实 Provider 成功、流、取消和错误：需另行明确账户、模型、允许场景与费用上限。
- 真实远程 ZIP/Git 安装更新：需指定可信来源和 ref，使用临时安装根。
- 实际浏览器身份与生命周期：需明确测试实例及临时数据；主观视觉由用户验收。
- 当前产物 build→prepare→smoke：需允许生成隔离产物及联网安装依赖，不含发布授权。
- 三平台发行与远端 CI：需对应提交的远端结果或平台实测，不以本机 macOS 测试替代。

以上全部保持延期、未验收；不自动跟进，不访问凭据或执行计费、远程安装、推送和发布。

<a id="deferred-ci-acceptance"></a>

## FR-006：远端 CI 首跑

用户确认不急，留待并行开发整合、统一提交后验收。`.github/workflows/ci.yml` 已有本地配置；届时核对同一提交在 GitHub Actions / Ubuntu 上完成依赖安装、workspace 检查、build、lint、test:typecheck 和 test，失败按日志处理。本地分批验证不替代远端结果。

没有提交、推送或远端运行授权；不安排自动跟进。流程不发布、不部署，不纳入独立扩展的发布节奏。当前状态为延期，非通过。

<a id="archive-successor-follow-up"></a>

## 旧计划后续去向

以下承接原 DOC-FOLLOW-002 的记录，不将历史设计自动变成当前需求。

| 历史事项 | 当前归属及剩余边界 |
| --- | --- |
| Chat Message 基座 Phase 3 | 当前 Narrative / Agent Store 和 canonical Transcript 已替代旧模型；完整工作树、跨进程恢复等仍以 [Agent Runtime 计划](../plans/agent-runtime-session-and-workspace-plan.md)为准，不重建旧 Message Store。 |
| Session / Narrative 数据层 Phase 6 | 导航、列表、恢复与失败传播已有分批证据；Session 与分支的完整生命周期仍归 Agent Runtime，不能将界面恢复等同 Server 重启恢复 Run。 |
| MessageBlock 第1项 Direct Preset Entry | 当前 Message 分支直接消费 Entry body；不恢复旧 EntryNode.source 模型，正式语义见 [Default 骨架](../../architecture/application/prompt-build/default-preset.md)。 |
| MessageBlock 第2项 zones 消费方 | 旧 zones/messageBlocks 已被 messages/editorProjection 取代；仍需按当前输出核对客户端投影消费者，不恢复旧 Zone 矩阵。 |
| MessageBlock 第3项 Message 预览 | Message 边界和来源展示仍待真实 UI 核对；旧 Zone 包围框不直接作为新要求，交互设计变化需另行确认。 |
| MessageBlock 第4项旧 Preset 迁移 | 旧 Zone-only 迁移已失效；资源分发按[资源计划](../plans/workspace-resource-and-distribution-plan.md)推进，不新增旧格式兼容，不按旧清单批量删除类型。 |
| MessageBlock 第5项 provenance | 已有 fragmentIds/sourceRows 不等于多来源消息可以端到端定位；仍需验证回指真实资源且正文不夹带元数据。 |

UI 细节和读屏验证按用户决定留待后续微调，不是当前阻塞项，也未记为已通过。The World State 订阅、热重载、State 资源与引用检查继续使用各自 Issue，不在本文重复排期。

<a id="simplification-acceptance-2026-10-02"></a>

## 代码精简后的独立验收与测试维护

精简的 32 项已收口：Diff 复核后为 27 项实施、5 项按反证或已确认决定保留（UI-011 低收益抽取已撤回），没有未决精简施工项，见[归档实施记录](../../archive/plans/code-simplification-2026-10-02-plan.md)。以下仅承接尚未完成的独立工作，不是归档时假装已解决。

| 事项 | 责任、触发条件与最小验收 |
| --- | --- |
| 双流真实 DOM 与交互 | 用户已明确自行验收且不急；在用户实际体验时核对长流可见行挂载、动态高度、浏览历史不强拉滚底、向前加载位置、编辑行保活、稳定 ID 展开留存及会话切换。整体观感由用户判断 |
| Renderer 离屏生命周期 | 随双流 UI 验收检查离屏销毁、返回重建、主题更新和卸载保护；此前浏览器入口因鉴权失败，mock/SSR 不能代替实测 |
| 4 个未改路径上的测试失败 | 保留为后续独立 Client 质量维护，不是精简目标；触及 State/Text/Macro 面板时先复现再修。`state-text-accessibility.test.ts` 的英文“折叠”1 例和 document ID aria-label 两语言2例、`state-variables-panel.test.ts` 的 translator fixture 1例。最终须执行这两个文件并如实归因，不因此前定向批次通过而忽略失败 |

上述事项保持未验证/未解决；没有修改前基线复现，不将 4 项失败冒称为已验证的既有失败。没有自动跟进、浏览器重启或扩大修复范围的安排。

<a id="implemented-plan-acceptance-2026-10-02"></a>

## 已交付旧 Plan 的独立验收

2026-10-02 用户要求顺路清理活跃目录；以下三份 Plan 已按既有交付记录归档，不重跑产品检查或将其余验收假装完成。

| 已归档实施记录 | 尚未验证与接续条件 |
| --- | --- |
| [Extension Prompt/模型 API](../../archive/plans/extension-prompt-and-model-api-plan.md) | 真实计费网关未验证；仅在用户明确授权端点、样本与费用后进行，核对模型选择、权限、流与取消，不自动发送用户正文 |
| [Token 计数与测量](../../archive/plans/token-counting-and-measurement-plan.md) | 用户实际使用时验收 IME、资源/角色/锚点/Narrative 页面交互及视觉。模型误差校准须另行授权，不冒称估算为实际 usage。旧记录的 Client 类型错误和提示词快照差异仅为当时结果，后续触及该路径时定向复现，不凭旧日志登记当前回归 |
| [开场白 Display/HTML 修补](../../archive/plans/card-opening-display-and-html-layout.md) | 用户实际卡片与最新规则表单/消息页面验收；先核对有效规则和最终 Display，再判断解析或样式问题。第三方 ST API/作者 iframe 循环高度不在此交付承诺内 |

State 订阅的 The World 接入、Shell 动画第二轮、记忆/CodeAct 等仍需实施或验收的路线，以及今天其他任务的新文档仍留在各自活跃入口；不借整理扩展代码修改或关闭其他任务。

<a id="trpc-migration-follow-ups-2026-10-13"></a>

## tRPC 迁移归档后的测试与验收边界

2026-10-13 用户确认归档；[迁移记录](../../archive/plans/trpc-contract-migration-plan.md)保留完整证据。传输迁移已完成，以下不构成继续迁移或自动执行的授权：

- 独立测试维护：missing-context-projection 的手工 React 渲染器，以及记录中的 31 条测试类型诊断。目录清理测试的旧 console.error 断言已在 2026-10-14 故障隔离修复中对齐 Logger 并通过定向测试。
- 尚未执行：浏览器人工验收、外部模型验证、完整 CI 和正式发布 smoke；不得视作已通过。

后续按用户另行指定的范围接续，不因归档扩大实施或发布范围。


<a id="fault-isolation-browser-follow-ups-2026-10-14"></a>

## 浏览器诊断与跨层故障隔离归档后续

[浏览器诊断](../../archive/issues/browser-runtime-audit-2026-10-14.md)与[Prompt / 跨层故障隔离](../../archive/issues/prompt-resource-fault-isolation.md)的已确认缺陷已修复，2026-10-14 归档。以下保持未完成或未验证，不因归档关闭，也不自动启动新的实施范围。

| 事项 | 当前事实与接续条件 |
| --- | --- |
| Host 权限错误码统一 | 部分 Host 仍抛普通 Error，Prompt 处理暂按现有权限消息保守识别，代码有 ponytail 标记；结构化 code/name 仍优先。触及 Host 错误契约时统一错误码并验证取消/权限仍中止，不能声称任意第三方错误文本均已覆盖。 |
| Opening 集成测试样本 | Prompt Resource 集成套件曾出现 15 通过 / 1 失败，失败在 loom-city-v0.json 旧 Opening 格式导入，先于本次修复路径。留给 Opening 样本维护，修复后定向重跑；不同于本次已修正并通过的目录单元测试夹具。 |
| 浏览器真实流程验收 | 尚未执行浏览器退出重开、真实 Timeline/Branch 切换、扩展重载和目录文件修改的完整浏览器链路。重连/媒体事件等已有定向测试，不能替代真实流程验收。 |
| 故障提示与真实生成验收 | 人工检查局部错误占位、坏资源诊断、警告定位及投影重试；真实 Provider 生成未执行。本轮仅临时数据库/文件与组件故障注入，没有改坏真实用户数据。 |
| 头像与整页性能候选 | 头像首次仍传原图，缩略图未实施；缓存不等于原约 0.8 秒 TTFB 已完全解释。按实际卡顿证据再评估缩略图、服务端 profiling 和真实长会话性能；局部微基准不代表整页收益，也未完成 heap 泄漏验证。 |

扩大故障隔离批次的 9 文件 / 71 项定向测试、Packages/Server/Client 类型检查及 Client 正式构建已通过，证据保留在归档记录。未执行全仓验收，不声称不存在其他局部错误传播链。
