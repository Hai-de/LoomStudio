import type { AiGatewayEvent, AiGatewayResult } from './types.js'

export class GatewayEventStream<Result = AiGatewayResult> implements AsyncIterable<AiGatewayEvent<Result>> {
  // ponytail: A single Provider Step retains history for late and multiple consumers; use a bounded broadcast buffer before exposing long-lived runs.
  private readonly values: AiGatewayEvent<Result>[] = []
  private readonly waiters: Array<() => void> = []
  private closed = false

  push(event: AiGatewayEvent<Result>): void {
    if (this.closed) return
    this.values.push(event)
    this.waiters.splice(0).forEach(resolve => resolve())
  }

  close(): void {
    this.closed = true
    this.waiters.splice(0).forEach(resolve => resolve())
  }

  readEvents(cursor = 0): { events: AiGatewayEvent<Result>[]; nextCursor: number; done: boolean } {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error('Gateway event cursor must be a non-negative integer')
    return { events: this.values.slice(cursor), nextCursor: this.values.length, done: this.closed }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<AiGatewayEvent<Result>> {
    let index = 0
    while (true) {
      if (index < this.values.length) yield this.values[index++]!
      else if (this.closed) return
      else await new Promise<void>(resolve => this.waiters.push(resolve))
    }
  }
}
