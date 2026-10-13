# `@loom-studio/transport`

> **状态**：Active Package Guide / Current Source Is Authority

本包只定义事件总线与 SSE 共享的 `StudioEvent` 和 `EventMeta`。包含事件名、JSON payload、来源、版本、事件 ID、关联 ID 与调用 ID。

请求/响应由 Studio Server 的 tRPC router 与官方 adapter 处理；旧 JSON-RPC 请求、响应构造器和解析器已随 `/rpc` 退役删除。业务错误码通过 tRPC `error.data.domainCode` 传递，追踪字段通过响应头与错误 data 提供。

本包不引入 HTTP、Fetch、UI 或业务路由依赖。入口：[src/index.ts](./src/index.ts)。

```bash
pnpm --filter @loom-studio/transport build
pnpm exec vitest run tests/contract/rpc/trpc-envelope.test.ts
```

参见 [Kernel](../../docs/architecture/kernel/README.md)。
