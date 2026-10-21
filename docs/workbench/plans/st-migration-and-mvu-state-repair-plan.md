# ST 整体迁移与 MVU State 修复

状态：已实施，待用户界面验收；2026-10-19 用户授权修复已确认问题、简化 MVU 嵌套。

## 修复前事实

- 官方扩展的 migration.commit 调用 application.*，违反 ctx.rpc 的保留命名空间限制；不得通过放宽通用 RPC 权限修复。
- 当前聊天导入和开场白转换已使用新合同，不恢复 openingNodes / entries。
- MVU 目前注册为实体组件；State 已有任意路径 binding，不需要另建实体类型。
- 输入 reader 忽略未知参数，Card artifact 的布尔校验丢失细节，领域分页与版本错误没有正确映射 HTTP 状态。

## 已授权修复

- createNarrativeTimeline 严格拒绝未知字段，历史导入继续走 importNarrativeHistory。
- Card artifact 暴露原始校验原因；明确分页范围与版本冲突状态。
- 递归扫描 characters，保留完整相对路径并明确聊天关联失败，聊天标题使用文件名兜底。
- 清理正则 flags 尾部空白；迁移保留头像；MVU 初始化只传入实际需要的 initvar，保留 worker 资源边界。
- 验证优先使用现有扩展与服务集成测试，增加必要的真实宿主迁移回归，不使用替换核心逻辑的 Mock 证明迁移成功。

## 已确认的职责与兼容边界

- 已确认由宿主负责正式导入，扩展只负责扫描、转换；不新增扩展直写宿主权限。客户端 imports.commit 固定当前包与安装目标，宿主通过安装隔离的 migration.prepare 逐项读取原生数据，调用现有 Runtime 与 Asset 写入 API。完成或失败后消耗 staging session，返回跳过原因；失败明确报告已经写入的项数。
- 已确认：新时间线使用 /mvu binding，旧时间线保留原数据与历史地址并继续读写，不自动重写历史。

## 完成标准

真实 Extension Host 下可完成含嵌套角色卡、头像和聊天的整体迁移；跳过项可见，误传字段返回 400、版本冲突返回 409；MVU 初始化、EJS 读取、命令更新与原生回滚遵循同一路径。

## 实施结果

- 宿主新增原生数据批次导入服务；SDK 客户端 imports.commit 固定安装身份，ST migration.prepare 不再调用 application.*。角色卡保留头像、外部 Lore 引用及全部历史正文。
- 已修复嵌套角色目录扫描、聊天唯一文件名匹配、无法关联/歧义的跳过提示、聊天标题文件名兜底和正则 flags 空白；扫描不跟随目录内符号链接，避免递归环。
- 时间线创建使用 strict input；非法字段返回 400。Artifact RPC 使用抛错断言保留原因，分页范围与 Prompt Resource 版本冲突分别返回 400 / 409。
- 新 Timeline 使用 /mvu binding。SDK 内容处理器允许显式声明 legacyPaths，仅当前地址不存在时读取旧地址，并在原地址提交更新；EJS 同步读取新旧位置，不后台迁移历史。
- MVU Worker 初始化保留所有资源身份与主世界书标记，仅携带 [initvar] 条目正文；2 MB 操作输入/输出边界仍保留。

## 验证与限制

- Server / Client / STBridge 定向 TypeScript build 与扩展测试目录 typecheck 通过，本地扩展完整 dist 已重建。
- 真实 Server + Extension Host 的批次导入验证通过：嵌套目录、PNG 头像、资源、完整历史、跳过项与部分失败后禁止直接重提。
- MVU Runtime 集成 7 项通过：新 binding、原生回滚、旧地址重载后 EJS/更新/回滚、2.1 MB 无关世界书正文及已有恢复链。
- Client Host / Runtime、State content registry 与 tRPC wire 合同共 52 项通过；ST 扩展 Server 合同 10 项通过。
- ST regression 中 8 项通过；已有 Markdown 单换行必须形成独立段落的断言失败。该用例和 Markdown 实现未被本轮改动，未扩大到正文排版修复。
- 测试目录类型检查仍有 72 项契约/夹具错误；未发现本轮新增 imports / legacyPaths / batch importer 类型错误。包括原有暂停恢复 checkpoint 的可选字段与现有必需合同不匹配，未越界修补。
- 不包含远端发布、用户完整 ST 数据集迁移或浏览器主观视觉验收。宿主与本地 STBridge 新 API 应一起更新/重载。STBridge 源码与 dist 位于主仓库忽略的 extensions/st-data-compat/ 本地开发目录，本轮未推送独立扩展仓库。
