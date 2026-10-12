# Settings → Lore 全量命名切换

状态：实施中。2026-10-12 用户批准计划与执行；以本页记录的迁移优先决定替代此前清空数据的讨论。

## 目标与已确认决定

- 设定领域统一命名为 Lore；State 不改，应用偏好、Provider 设置、扩展配置仍叫 Settings。
- 主程序、Shared、SDK、官方内容、STBridge、The World 和对应测试、现行文档同步修改。项目未发布，不保留旧 RPC / SDK 别名。
- `settingLayer` → `lore`、`SettingLayerContent` → `LoreContent`、来源分类 `settingLayer` → `lore`。Card 内联结构保留，不借改名删除业务路径。
- `SettingMount` → `LoreMount`、`settingResourceIds` → `loreResourceIds`、`useCardSettings` → `useCardLore`、资源分类 `setting` → `lore`、标准锚点 `@setting.*` → `@lore.*`。
- 优先迁移旧数据，保留测试卡、资源身份、挂载关系、正文及其他用户内容；不清空数据。不修改凭据。

## 当前事实与入口

- 挂载公共合同：`packages/shared/src/prompt-resource-contracts.ts`。
- 数据库存储及版本迁移：`packages/application-data/src/prompt-resource/{schema,store,mounts}.ts`。
- Card 与资源导入导出：`packages/application-runtime/src/cards/`、`apps/studio-server/src/codecs/card-bundle-files.ts`。
- Prompt 来源组装：`packages/application-runtime/src/agents/agent-turn.ts`；Card 内联 lore 不因本次改名接入新的消费路径。
- 官方扩展开发源码位于被主仓忽略的 `extensions/st-data-compat/`、`extensions/the-world/`；运行副本与构建产物不能当源码直接批量替换。
- 工作区存在其他任务未提交的重构，必须保留。改名按当前文件内容处理，不重置或覆盖整文件。

## 执行顺序与职责

1. 主 Agent 保存改名前涉及文件基线，生成临时明确映射脚本，预览后执行。脚本不全局替换小写 settings；混合语义逐项处理。
2. 主 Agent 负责主程序 / SDK / 测试 / 官方内容 / 文档改名与集成；扩展可委派独立写集；数据迁移单独委派。
3. 数据迁移只转换已知结构字段和协议值。历史数据库迁移保持可升级，新增版本迁移；核查 Document、修订/撤销、checkpoint、扩展安装声明及文件型卡片入口。正文与任意业务 JSON 不作递归词语替换。
4. 完成后集中类型检查、相关现有测试与扩展构建；Luna 可只读扫描遗留领域名称，排除应用设置与历史迁移。
5. 本地数据执行前确定真实目录、进程与写入状态，制作一致备份，先在副本验证，再执行真实迁移；无法安全在线执行则明确记录待停服应用，不强停未知进程。

## 验收

- 新代码、RPC、SDK、资源文件、现行文档统一 Lore，应用设置与 State 保持原义。
- 资源创建/挂载、Card 导入导出、ST 导入、PromptBuild 选择与注入行为不变。
- 迁移保留 Card/资源/条目 ID、正文和关系；旧修订恢复不能重新引入失效分类；重复启动不重复变换或破坏数据。
- 官方扩展源码和产物可使用新合同；实际本地数据迁移、构建、测试、人工验收分别记录，不互相替代。

## 验证范围

- 跨包类型检查；现有 Lore 相关资源、挂载、导入导出、PromptBuild 测试。
- 数据迁移增加必要的真实 SQLite 测试，覆盖保留正文/身份、历史修订和再次打开；真实数据副本验证数量与引用完整性。
- 不做 UI 重设计、浏览器视觉巡检、测试体系建设、远端发布或推送。

## 结果

2026-10-12：源码与官方内容切换已完成，文件型测试卡真实目录的写入仍待停服确认。

- Shared、数据层、Runtime、SDK/Host、RPC、Client、官方 Starter/助手、STBridge、The World 已统一 Lore；`settingLayer` 改为 `lore`，保留内联结构。旧 raw `setting` 输入仅在迁移历史数据时转换，不保留旧 RPC/SDK 别名。
- 新增 Prompt Resource v6 和独立 Document 迁移，保留历史 v1–v5。迁移涵盖资源/挂载、元数据、节点修订、Card Document 修订及 Agent Prompt 恢复快照；State、正文和资源身份不变。
- Architecture、Guide 与相关 Workspace README 更新；归档文档不变，外部项目参考资料保持原术语。
- 主应用 `tsc -b` 通过；12 文件回归先有 72 项通过、2 项失败；修复最后两项后，这两文件与默认预设、迁移合计 4 文件/30 项通过；应用设置/扩展配置/清单边界另 5 文件/33 项通过。不同检查覆盖有交集，不相加作为总数。
- STBridge 与 The World 构建通过；扩展测试 9 文件/53 项通过，ST opening Markdown 分段断言仍失败，该渲染路径本轮未修改。官方 Starter ZIP 已重新打包。
- 首轮 78 文件测试中的 Character/State 相关 12 项失败和 default-preset-lifecycle 取消套件错误，已在改名前隔离源码副本复现；未修无关问题。测试类型检查仍有 44 条错误，不能宣称全仓验证通过；隔离基线因缺依赖源不能作完整类型差异证明。
- **实际迁移顺序偏差**：开发服务的 tsx watch 在构建后自动重启，先于计划备份触发了数据库升级。发现后已创建一致 SQLite 快照，路径 `/Users/macbookair/Desktop/LoomStudio-lore-backup-20261012/`；这是升级后的数据库快照，不能冒称升级前备份。后续旧数据库启动升级已补充自动 `VACUUM INTO` 备份。
- 当前数据完整性与外键检查通过；保留 4 个 Card Document、13 个 Prompt Resource、780 个节点。未清空数据或重新导入卡片。
- 两个文件型 Card 在 `/tmp/loom-lore-data-validation/` 完成转换，624 个文件经过读取核对，正文文件字节不变、原干净基线仍匹配；再次预览零改动。真实 `data/characters` 与 `.loom/card-directories` 尚未应用，等待暂停开发服务的确认。
- 当前真实安装只有 global The World，没有 Card 内嵌扩展归档；直接更新并构建开发包，未调用会覆盖用户树/宏/挂载的资源 update。官方助手安装镜像的三个文件先确认与原官方源码一致，再同步新版本，保留身份。
- 用户随后授权把已有职责重构与本轮 Lore 改动一起提交推送。独立扩展源码已同步到各自仓库：STBridge `d93e4c9`、The World `0adfefa`；主仓忽略目录不作为扩展发布记录。人工 UI 验收未执行。

### 剩余步骤

1. 得到停服确认后暂停已确认的本项目开发服务，更新文件型卡片结构与基线，再恢复服务；迁移命令见 Data Architecture。
主应用 `pnpm build:app` 已通过（Packages、Server、Client），仅有 Vite 大 chunk 提示；不代表人工视觉验收。

2026-10-12 UI 文案补齐：工作区原 Resource 面板使用独立 `rail.lore` 标签，中文“设定”、英文“Lore”；导航与面板标题共用该标签。通用资源分类仍保留 `rail.resource`，中文设定相关翻译同步去除残留英文 Lore。

提交前验证：最新 i18n/面板名称补齐后，`pnpm exec tsc -b` 通过；三个仓库的暂存差异通过 whitespace 检查。
