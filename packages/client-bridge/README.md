# `@loom-studio/client-bridge`

> **状态**：Active Package Guide / Current Source Is Authority

本包提供浏览器会话恢复的 `createSessionFetch`，以及面向字符串方法消费者的 tRPC 适配器 `createClientBridge`。主应用使用 `apps/studio-client/src/shared/api/trpc-client.ts`，从服务端 `AppRouter` 推导输入输出；不使用 `bridge.call<T>` 声明业务结果。

## 传输与边界

- endpoint 为 `/trpc`；使用官方 tRPC HTTP Link，查询与写入都发 POST，不启用 batching。
- `createSessionFetch` 仅在浏览器收到 401 时启动一次 `/auth/session` 握手，成功后重发原请求；网络错误、非 401 和已执行的业务失败不自动重试。AbortSignal 贯穿请求、握手等待与重发。
- `bridge.call<T>(method, params, { signal })` 供无法静态描述方法的 SDK 消费者使用。平台命名空间调用对应 procedure，其余方法发送到 `kernel.invoke`。泛型仅是消费者的声明，不能作为动态扩展结果已验证的证据。
- 不提供 JSON-RPC 2.0 网络传输，不生成 `client-N` 请求 ID。关联 ID 与调用 ID 由服务端响应头提供。
- 本包不持有 UI、业务 DTO 或领域状态。运行时扩展生命周期与授权仍由 Kernel/Extension Host 处理。

## 入口与验证

入口：[src/index.ts](./src/index.ts)、[src/session-fetch.ts](./src/session-fetch.ts)。

```bash
pnpm --filter @loom-studio/client-bridge build
pnpm exec vitest run tests/contract/client-bridge tests/integration/client-bridge
```

参见 [Kernel](../../docs/architecture/kernel/README.md) 与 [Client](../../apps/studio-client/README.md)。
