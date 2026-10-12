# Timeline 扩展采用

安装、模块加载和故事采用是三个不同的事实。Manifest `participation: "timeline"` 声明包需要故事采用；
平台在 Timeline 保存配置，Card 的 `extensionAdoptions` 只作为新 Timeline 的默认值。
Branch 不单独保存采用开关，State 仍跟随各自的修订与 checkpoint。

## 加入与退出

新建 Timeline 原子提交默认采用、初始化 State 和 Runtime Context。中途加入必须先预览，再核对
安装、采用、State 和声明实例版本后提交；失败不留下半采用状态。

暂停或卸载保留 State、携带资源和挂载。恢复不会运行初始化器；同版本重装也须显式确认，
安装来源改变须另外确认。恢复核对接受时的完整 State 声明，不自动推断 Schema 兼容性。
旧 checkpoint 缺失实体或组件可以显式预览并补齐，不覆盖已有值，不做组件字段迁移。

稳定 packageId 是作者声明的匹配身份，不是发布者认证。安装范围区分工作区安装和 Card 携带安装；
角色卡作品身份使用 `artifactId`，不以本地 Card ID 或下载 URL 代替。
来源、声明和版本 metadata 属于平台 Runtime Context，不写进业务 Entity。

## 执行与提交

Server 使用 `ctx.timeline.list()` 获取可参与目标，再通过 `ctx.timeline.run(target, work)` 执行故事工作。
工具、宏、Narrative provider、State content 和 Prompt processor 由 Host 绑定实际目标。
同一工作不能改换 Timeline/Branch；不以当前前台页面决定后台任务目标。

`ctx.timeline.subscribe(listener)` 是目标集合失效通知，无业务数据载荷。订阅后调用 `list()` 对账；
采用、安装或 Timeline 变化可能触发通知，不保证每次通知都改变结果。通知本身不授予故事执行资格，
也不替代 Node/Message 事件。订阅随 Module 释放，后台任务仍须使用 `run`。
Timeline 扩展的通用事件订阅只支持明确目标的 `state.changed` 和系统启停事件，
不从任意 `data.changed` 载荷猜测故事目标。

每次受管工作持有原始 installation version 和 adoption generation。暂停后再启用产生新代次，
不会复活旧任务。取消信号用于及时停止；正确性还由实际提交事务中的原始凭据复核保证。

同一 Data Engine 的 `withTransactionGuard` 将校验绑定到异步工作，事务执行前和提交前都检查。
因此受管工作内的 documents、configs、records、portable payload 和 assets 共用提交边界；
任务结束后的派生异步写入也不能提交。提交订阅者不继承写入任务的事务守卫。
Asset 预备 Blob 不代表媒体记录已发布，未引用 Blob 仍由存储层回收策略处理。

Timeline 声明扩展访问故事 Storage Scope 或故事 Record binding 必须进入对应受管范围；
Agent Session 也须属于当前 Timeline。列表查询要求显式 Scope。非故事的全局配置仍可编辑，
不因某条 Timeline 暂停而锁住安装级设置。

这是可信原生扩展的宿主合同，不是 Node 沙箱。任意文件、直接网络和绕开 SDK 的副作用不能撤销；
作者负责传递 signal、释放定时器和清理直接 DOM。Client 实例在目标/采用变化时取消并重建，
不修改工作区的模块开关。

## Prompt 与恢复

Prompt 准备记录实际读取的扩展资源和执行过的受管回调凭据，而不是把所有已采用包都作为依赖。
Provider Step、工具执行和最终输出提交保持原始凭据；来源失效时取消并拒绝迟到结果。
Provider 已收到的请求不能撤回，不承诺取消不会计费。

工具执行前刷新可用安装。工具间接读取的资源或脚本附件成为后续 Step 的依赖，也进入恢复检查点；
新依赖的写回在同一事务守卫中核对。恢复先检查原始依赖，再准备执行环境，不用当前代次替换旧凭据，
不重新运行已接受的 Prompt processor。缺少必要凭据的开发期检查点明确拒绝，不静默兼容。

暂停来源的 Lore/工具从当前故事消费中排除，保留挂载配置；工具过滤原因进入 Prompt Trace。
引用其他 Card 私有工具仍明确报错。若选定的 Agent Preset 本身不可用则不能生成，不自动换预设。
采用资格不扩展 Preset 挂载、工具授权或其他既有能力边界。

## 诊断

State“来源”页区分当前 Card 声明、工作区定义、当前注册、Timeline 已接受声明和当前 Branch 数据路径。
Timeline 扩展行的“携带资源”展示来源资源及当前故事资格；来源可用不等于已挂载或已获执行权限。
两种查询都不初始化、不迁移、不导入、不修改挂载，暂停和卸载后的资源仍可诊断。

模块 `enableModule/disableModule` 继续只管理该模块；没有以“所有模块关闭”推断包停用，
无模块资源包仍受支持。独立的 Package 全局总开关、跨声明迁移和签名系统不属于本次首版。
