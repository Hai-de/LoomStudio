import { createApplicationRuntime } from '@loom-studio/application-runtime'
import { createInMemoryDocumentStore } from '@loom-studio/document-store'
import { describe, expect, it } from 'vitest'

describe('Application Runtime construction', () => {
  it('rejects construction without the shared Prompt Resource Store', () => {
    expect(() => Reflect.apply(createApplicationRuntime, undefined, [{
      documents: createInMemoryDocumentStore(),
    }])).toThrow('Prompt Resource Store is required')
  })
})
