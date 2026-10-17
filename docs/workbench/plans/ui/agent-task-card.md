# 输入框后层任务卡

2026-10-15 用户授权直接接入。

- 当前 Timeline 的跨 Session / Run 总状态由 AgentTaskMenu 承载；Header 胶囊保留 Session 身份和切换入口。
- 将任务区从 composer.sheet 移到独立后层卡片，浅一级表面色、两侧内收；向上展开，输入框自身高度与底边不变。
- 收起展示聚合状态，展开保留现有暂停、继续、放弃、查看会话及全部任务入口；长列表内部滚动。
- 现有当前 Run 的细分运行阶段迁到任务区，仅在 runId 匹配时展示，不推测其他 Session 的内部阶段。
- 保留查询和运行操作契约；不新增后端 API，不恢复 Dev 演示入口。
- 动画 300ms 展开、240ms 收起，遵循减少动态效果设置。待用户视觉验收。

## 实现与验证

已接入正式输入框后层，Header 运行阶段逻辑移至 narrative-runtime/model/agent-runtime-phase.ts，匹配 runId 才显示细分阶段。相关检查中 10 项通过；两项 AgentChatPanel 旧测试直接调用 memo 组件而失败（HEAD 同样已使用 memo），未修改无关测试。依赖构建另报 swipe-runtime.ts 第 159、345 行 string | undefined 类型问题，该文件不在本次修改范围。任务卡样式开发编译 HTTP 200；视觉及动画待用户验收。
