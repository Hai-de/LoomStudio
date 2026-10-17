import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  createAsyncOperationState,
  readLatestOperationError,
  reduceAsyncOperationState,
  type AsyncOperationScope,
} from './async-operation-model.js'

export type LatestOperationContext = {
  isCurrent(): boolean
}

export function useAsyncOperations() {
  const [pending, dispatch] = useReducer(reduceAsyncOperationState, undefined, createAsyncOperationState)
  const lifecycle = useRef({ active: true })
  useEffect(() => {
    if (!lifecycle.current.active) lifecycle.current = { active: true }
    const generation = lifecycle.current
    return () => { generation.active = false }
  }, [])
  const sequenceRef = useRef(0)
  const latestByScopeRef = useRef(new Map<AsyncOperationScope, number>())

  const run = useCallback(async <T,>(scope: AsyncOperationScope, action: () => Promise<T>): Promise<T> => {
    const sequence = ++sequenceRef.current
    const generation = lifecycle.current
    dispatch({ scope, type: 'start' })
    try {
      const result = await action()
      dispatch({ scope, sequence, type: 'finish', recordError: generation.active })
      return result
    } catch (caught) {
      dispatch({ scope, sequence, type: 'finish', recordError: generation.active, error: readErrorMessage(caught) })
      throw caught
    }
  }, [])

  // ponytail: Callers still using completion flags must migrate before removing this reporting-only boundary.
  const runReported = useCallback(async <T,>(scope: AsyncOperationScope, action: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await run(scope, action)
    } catch {
      return undefined
    }
  }, [run])

  const runLatest = useCallback(async <T,>(scope: AsyncOperationScope, action: (context: LatestOperationContext) => Promise<T>): Promise<T | undefined> => {
    const sequence = ++sequenceRef.current
    latestByScopeRef.current.set(scope, sequence)
    const generation = lifecycle.current
    const context = { isCurrent: () => generation.active && latestByScopeRef.current.get(scope) === sequence }
    dispatch({ scope, type: 'start' })
    try {
      const result = await action(context)
      dispatch({ scope, sequence, type: 'finish', recordError: context.isCurrent() })
      return context.isCurrent() ? result : undefined
    } catch (caught) {
      dispatch({ scope, sequence, type: 'finish', recordError: context.isCurrent(), error: readErrorMessage(caught) })
      return undefined
    }
  }, [])

  return {
    error: readLatestOperationError(pending),
    isPending: (...scopes: AsyncOperationScope[]) => scopes.some(scope => pending[scope].pendingCount > 0),
    pending,
    run,
    runReported,
    runLatest,
  }
}

function readErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught)
}
