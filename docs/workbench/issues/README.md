# Workbench Issues 索引

本目录用于跟踪**当前开放或周期性滚动审查的质量发现**。


- [`frontend-continuous-audit-2026-10-07.md`](./frontend-continuous-audit-2026-10-07.md) — **前端持续审查与修复**（当前保留 38 项，FE-035 确证复现并建账待实施；FE-028 完整 Renderer 映射、FE-031 旧路径统一反馈及全量语言/浏览器验收仍见台账）。
- [`audit-playbook.md`](./audit-playbook.md) — **审查工作指南**（历史发现与实际修复经验、常见偏移、精简反证、最小验证及关闭/归档流程；新审查先读此文，不是新增施工清单）。
- [持续代码审查](../../archive/issues/continuous-code-review-2026-10-02.md)已于 2026-10-06 归档：CR-001～013 与 QA/DOC 本机修复完成，F-06 经用户确认延期，见[延期验收](./audit-follow-ups.md#continuous-review-acceptance-2026-10-06)；不再作为进行中的审查。
- [`audit-follow-ups.md`](./audit-follow-ups.md) — **审查归档后续**（延期的远端 CI、旧计划接续及代码精简后的用户 UI 验收/独立测试维护；已完成的修复账目不再留在 Workbench）。
- [`state-subscription-for-extensions.md`](./state-subscription-for-extensions.md) — **扩展 State 变更订阅**（正式写入、回滚、默认值的通知及订阅过滤/清理已修复；The World 接入独立安排）。
- [`extension-dev-hot-reload-enhancement.md`](./extension-dev-hot-reload-enhancement.md) — **插件开发态热重载机制增强**（待排期的低优先级开发体验改进）。
- [`state-resource-and-reference-follow-ups.md`](./state-resource-and-reference-follow-ups.md) — **State 资源与引用检查后续**（独立 State Artifact 资源链、运行态软引用诊断）。
- [`periodic-code-review.md`](./periodic-code-review.md) — **周期代码审查台账**（滚动记录最近 12 次重大审查与核心链路发现）。

> [!NOTE]
> 历史审计快照统一位于 [`docs/archive/issues/`](../../archive/issues/)。归档只表示原审计基线已经冻结；当前仍需推进的问题必须在本索引或活跃 Plan 中重新登记。

2026-10-02：代码精简的[数据链路](../../archive/issues/code-simplification-data-flow-audit-2026-10-02.md)、[UI / 双流](../../archive/issues/code-simplification-ui-audit-2026-10-02.md)、[Client Runtime](../../archive/issues/code-simplification-client-runtime-audit-2026-10-02.md)及[实施 Plan](../../archive/plans/code-simplification-2026-10-02-plan.md)已收口并实际归档：Diff 复核后为 27 项实施、5 项按反证或决定保留。用户负责的 UI 验收及 4 个未改路径上的测试失败见[独立后续](./audit-follow-ups.md#simplification-acceptance-2026-10-02)，均未冒称通过。

2026-10-02：[Display / Token / 导航补充精简](../../archive/issues/code-simplification-client-projection-token-navigation-audit-2026-10-02.md)的 SIDE-001～003 已实施并实际归档，Display 保持现有合同；4 文件/43 用例、Client 类型检查及 543 路径新旧差分通过，未执行浏览器或全仓验收。

2026-10-02：[全仓](../../archive/issues/full-repo-code-review-2026-10-02.md)、[API/IPC](../../archive/issues/client-server-api-audit-2026-10-02.md)、[内存](../../archive/issues/memory-retention-audit-2026-10-02.md)、[UI 复用](../../archive/issues/ui-component-reuse-audit-2026-10-02.md)四份审查及配套探针已归档，代码修复和定向验证见[修复记录](../../archive/plans/audit-remediation-2026-10-02-plan.md)。人工视觉、真实 Provider 与生产 heap 收益未验证；前端固定内存基线按用户决定不扩大追查，不因归档宣称这些验收已通过。

2026-09-24 本轮审查报告已归档：[前端16项](../../archive/issues/frontend-rendering-and-state-retention-audit-2026-09-21.md)全部关闭；[全仓19项](../../archive/issues/full-repo-code-review-2026-08-27.md)中18项收口，FR-006远端CI按用户决定延期，验收去向见[后续计划](./audit-follow-ups.md#deferred-ci-acceptance)。FR-007为用户接受当前UI、细节与读屏验证后续安排，不宣称读屏通过。归档沿用仓库现有本地留存政策。

[审查修复口径](../../archive/issues/audit-remediation-decisions-and-order.md)已实际移入归档，保留为决策参考，不是开放任务。上方独立功能Backlog和周期审查台账不属于本轮待修漏项。

本轮已解决的 State JSON/Delta、Prompt Resource JSON、Extension 生命周期、Document 分页及输入、Prompt Resource 分页、Card 文件往返、后端生命周期独立 Issue 已删除，交付证据见[修复实施计划](../../archive/plans/audit-issue-remediation-plan.md)。FR-012 已按确认后的软引用合同关闭，证据保留在已归档全仓审查中。

文档方向与生命周期复核的 DOC-FOLLOW-001/002 已完成，原 Issue 已删除：五份活跃设计稿的旧基线已修正，三份归档 Plan 的后续去向见[当前 successor](./audit-follow-ups.md#archive-successor-follow-up)。其中未验收的 UI 能力仍保留在 successor，不因治理问题关闭而视为完成。

仓库治理 GOV-001～008 已收口，原 Issue 已删除，证据保留在[修复实施计划](../../archive/plans/audit-issue-remediation-plan.md)。Knip 仍报告独立 ST Data Compat 的 activate/default 重复导出并退出 1，这是明确保留的发布形式，不冒称全仓 Knip 绿灯；主库测试类型检查和根 lint 已通过。

2026-09-12 全仓审查 SEP-001～009 已收口并删除原 Issue。部分删除、规则顺序/空文本投影、分支编辑隔离与依赖/查询职责裁定的证据见[修复实施计划](../../archive/plans/audit-issue-remediation-plan.md)；其他审查及浏览器验收不随之关闭。

2026-09-14 架构审计已移至[历史审查](../../archive/issues/frontend-backend-architecture-and-client-duplication-audit-2026-09-14.md)，不再列为开放施工清单。后续状态、门禁、软引用与浏览器验证的实际交付及限制由修复计划承接，未因归档虚称所有验收通过。

2026-10-14：[浏览器运行时诊断](../../archive/issues/browser-runtime-audit-2026-10-14.md)与[Prompt / 跨层原子故障隔离](../../archive/issues/prompt-resource-fault-isolation.md)已归档，已确认缺陷完成修复及定向验证；权限错误码、旧 Opening 样本、性能候选和真实环境 / 人工 UI 验收见[独立后续](./audit-follow-ups.md#fault-isolation-browser-follow-ups-2026-10-14)。
