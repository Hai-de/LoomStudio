# Session 恢复诊断

此探针使用真实 React 生命周期和内存 StudioApi，不访问真实数据库。
运行期间以临时内存对象替代页面的 localStorage，并停用 EventSource；
结束时卸载 React root 并恢复两者。只在独立诊断页运行，不嵌入工作台。

从仓库根目录启动客户端 Vite：

```sh
pnpm exec vite --config apps/studio-client/vite.config.ts --port 5198 --strictPort
```

打开 `http://127.0.0.1:5198/@fs/<仓库绝对路径>/tests/probes/client/session-recovery.html`，
点击“运行诊断”。9 项全部显示 PASS 才表示本探针通过。
结束后停止自己启动的 Vite 服务。

覆盖会话分页与预设绑定、草稿不持久化、显式主会话创建、迟到读取与创建隔离、
读取失败阻断发送、独立会话切换及迟到 Run 响应。
不覆盖真实 HTTP/SSE、浏览器刷新后的持久化、真实模型或视觉体验；
HTTP/SSE 行为由 `tests/integration/client/narrative-edit-sse.test.ts` 等测试另行验证。
