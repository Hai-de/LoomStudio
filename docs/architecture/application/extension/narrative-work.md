# 扩展剧情任务与读取视图

Timeline 扩展可组合公开接口准备剧情材料、运行独立 Session 并提供探索视图。宿主不依赖具体记忆扩展；默认剧情注入仍使用 [Narrative Context](./narrative-context.md)。

## 执行与来源

模块声明 `narrative.read`，在 `ctx.timeline.run(target, work)` 中调用 `ctx.narrative.read({selection,maxNodes?,maxCharacters?})`。选择支持固定楼号、节点范围和末尾数量，沿用宿主采样预算。结果包含原文节点、完整性、缺号与来源凭据；不完整采样不能当作完整摘要输入。

来源含 Timeline、Branch、起止边界、顺序 nodeIds 和正文/楼号 digest。`ctx.narrative.validate(source)` 重新验证当前路径与内容；后续新增节点不会使旧范围失效，范围内替换、编辑或退出路径会失效。归档时映射 ID，内容 digest 不随 ID 迁移变化。方法在异步读取前后检查执行 lease，不能通过参数替换当前 target。

`ctx.narrative.subscribe(handler)` 通知正式正文输入持久化后的 `input`，以及正式叙事 Run 成功完成后的 `run-completed`。通知在当前采用且可运行的 Timeline 作用域内执行，不等待扩展模型任务；异常记入扩展诊断。独立 Agent 任务不发叙事完成通知。扩展负责按固定来源去重、持久化准备状态和重启恢复，事件不是持久消息队列。

## 独立 Agent 任务

声明 `agent.tasks` 后，在 Timeline 执行内使用 `ctx.agentTasks.create({presetId,title?})`（或用 `presetContributionId` 解析本安装的预设）、`invoke({sessionId,input,activationFacts?})`、`read(sessionId)`、`cancel(sessionId)`。任务创建真实 Agent Session，绑定独立 Preset，关闭任务 Session 的自动交接总结；复用现有 Run 服务、审批和取消。

宿主私有记录绑定 installation、Timeline、Branch 与 Session；扩展不能通过自己的 records 伪造任务归属。invoke 不接受 narrativeTarget，不会直接把结果追加成剧情楼层。每次调用的 activationFacts 复用现有条件激活，可让同一个 Preset 按任务级别启用不同条目；条件不写入 Timeline State，修订 Run 由调用方重新传入。模型和工具权限继续由 Preset/宿主管理，不为总结硬编码直连模型路径。中断或 suspended 不能被当作成功产物。

## 只读 VFS

声明 `vfs.provide`，通过 `ctx.vfs.register({id,root,resolve})` 返回文本文件/目录。id 使用包命名空间，root 是独立单层绝对根；禁止遮蔽内置根。宿主按 Card、Timeline 采用与实例生命周期筛选，校验路径并剥离写入绑定；文件进入 Agent VFS，不因此自动注入 Prompt。每次准备 Agent turn 时读取一份视图。

## 记录归档

`ctx.archives.registerRecords({id,version,remap})` 让宿主导出该 installation 的 Timeline records。remap 只转换 JSON 数据，获得原 recordId、所有 recordIds 映射和 Timeline/Branch/Node/StateRevision 映射，不获得临时存储权限。宿主重建 scope、owner 和可映射 bindings；全部转换成功后单事务写入新记录。包含没有迁移合同的 asset/agent-message binding 时明确失败，不能带入悬空引用。

扩展不存在、版本不兼容或转换失败时，归档 block 与映射保留 pending。再次导出保留原始映射，再次导入组合到新目标；所有映射目标必须属于归档图。当前没有自动重放 pending 的后台任务，可在扩展可用后重新导入存档。原始记录与 pending 同 namespace 冲突时明确报错，不覆盖任一侧。

## 文件化 Preset

独立资源 ZIP v2 为 `manifest.json`、`index.json`、`entries/0.md` 与嵌套条目 Markdown。索引 schema 为 `loom.promptResource.files.v1`，artifact 保存资源配置，rootNode 保存节点 metadata、body 相对路径和 children 顺序。正文为空也有独立文件；没有正文的节点不伪造空文件。

扩展 `contributes.promptResources[].source` 可指向该 index，Markdown 相对索引目录读取；安装收集全部引用，拒绝目录逃逸、symlink、缺文件与超限。旧 monolithic Artifact JSON 和 ZIP v1 继续可读。编辑后走既有导入/更新入口，不提供自动双向同步，也不要求 CLI。

同一总结 Preset 的条件条目示例：

```json
{
  "activation": {
    "kind": "condition",
    "conditions": [{ "fact": "summary.level", "equals": 2 }]
  }
}
```

该字段位于节点的 `capabilities` 中。任务调用传入 `activationFacts: {summary: {level: 2}}`，PromptBuild 在发给模型前选择条目。公共条目不设条件。级别不是两份预设，也不要求共享同一个任务 Session；每批仍可创建独立 Session，再在其中修订。
