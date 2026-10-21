# Application Extension Contribution

本分类收录 Extension 向第一方 AIRP Application 贡献领域能力的稳定协议。

平台级加载、Manifest、生命周期和 SDK 位于 [`../../extensions/`](../../extensions/)。这里不重复定义 Extension Host。

当前已实现的数据与 Card 分发协议见 [`data-and-portable-payload.md`](data-and-portable-payload.md)。Client Extension Host、Renderer Surface、消息内 Render Mount 与 Workbench 位于平台 Extension 架构的 [`../../extensions/client-renderer-host.md`](../../extensions/client-renderer-host.md)。Prompt source 和其他 contribution point 的旧候选保留在 [`历史讨论归档`](../../../archive/discussion/application/extension/README.md)，不进入正式架构；后续范围以 [Plan](../../../workbench/plans/README.md) 为准。

默认剧情记忆的专用接收与交接合同见 [`narrative-context.md`](narrative-context.md)：扩展发布 Memory / 固定 Raw 范围，Runtime 在 Session 工作交接后通知采用，不是任意 Prompt source 注册引擎。

平台持有的故事采用、受管任务、提交校验、Prompt 恢复与资源诊断见 [`timeline-participation.md`](timeline-participation.md)。采用归 Timeline，业务 Entity 不保存扩展 metadata。

- [剧情任务、只读 VFS 与记录归档](./narrative-work.md)
