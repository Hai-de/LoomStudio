# 官方扩展目录

本目录只保存由 Loom Studio 主仓库维护的官方内容。这里的文件是对应内容的开发基准，根目录 `extensions/` 中的安装副本不作为第二份源码维护。

“官方”表示维护方，不表示随程序内置。当前发行包携带 `loom-assistant` 与 `story-memory`；`loom-theme-paper`、`loom-theme-tide` 是主仓库维护的主题示例，尚未列入发行包。实际随包内容以 `scripts/release/prepare-release.mjs` 和服务端的 `bundledDirectories` 为准。

`story-memory` 提供剧情总结扩展与一个可编辑的总结 Preset，LV1/LV2 规则由任务条件选择。默认开发入口和发行入口首次启动时将它复制到根目录 `extensions/` 并导入 Preset；显式指定扩展源码目录或安装目录的入口沿用自定义来源，不自动加入内置包。模型由用户在总结 Preset 中配置。

剧情总结首次随包安装时默认启用 server/client 模块，但不会授予额外事件、资源或通知权限；已有模块选择优先，之后继续使用扩展中心的持久启用状态。安装和启用不等于采用，老 Timeline 不会被自动采用，也不会因此自动触发模型。启动不会重新开启用户已关闭的模块；首次随包安装标记也会保留，已卸载的包不会在下次启动被静默重装。

## 独立发行的可选扩展

以下扩展由各自的独立仓库维护，本目录不保留源码或构建副本：

- STBridge：[LS_STBridge](https://github.com/The-LoomStudio/LS_STBridge)，安装后位于应用根目录 `extensions/`。
- The World：[LS_The_World](https://github.com/The-LoomStudio/LS_The_World)，安装后位于应用根目录 `extensions/`。

用户在官方扩展选择或扩展中心确认后下载，安装、授权与启用分别执行。推荐地址由 `apps/studio-server/src/extensions/extension-manager.ts` 维护。

独立扩展以自己的仓库源码为基准。Git 安装不运行构建，因此扩展仓库需同时交付 Manifest、资源与对应源码构建出的完整 `dist/`；源码变更后重新构建，不单独手改 `dist/`。本地开发可放在根目录 `extensions/`，修改应提交到对应独立仓库，不能复制回本目录形成另一份实现。
