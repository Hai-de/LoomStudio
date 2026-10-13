import type {
  ApplicationRuntime,
  PortableExtensionPayloadDraft
} from '@loom-studio/application-runtime'
import type { JsonValue } from '@loom-studio/shared'
import {
  readNumber,
  readObject,
  readOptionalString,
  readString,
  readStringArray,
} from '../../rpc-params.js'
import { jsonInput, procedure } from '../context.js'

export const portablePayloadsProcedures = {
  'listPortableExtensionPayloads': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['listPortableExtensionPayloads']>[0] => {
    return {
      packageId: readOptionalString(params, 'packageId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.listPortableExtensionPayloads(input)),
  'getPortableExtensionPayload': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['getPortableExtensionPayload']>[0] => {
    return {
      payloadId: readString(params, 'payloadId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.getPortableExtensionPayload(input)),
  'createPortableExtensionPayload': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['createPortableExtensionPayload']>[0] => {
    return {
      artifactPayloadId: readOptionalString(params, 'artifactPayloadId'),
      payload: readObject(params, 'payload') as unknown as PortableExtensionPayloadDraft,
    }
  })).mutation(({ ctx, input }) => ctx.runtime.createPortableExtensionPayload(input, ctx.request)),
  'updatePortableExtensionPayload': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['updatePortableExtensionPayload']>[0] => {
    return {
      payloadId: readString(params, 'payloadId'),
      expectedVersion: readNumber(params, 'expectedVersion'),
      payload: readObject(params, 'payload') as unknown as PortableExtensionPayloadDraft,
    }
  })).mutation(({ ctx, input }) => ctx.runtime.updatePortableExtensionPayload(input, ctx.request)),
  'deletePortableExtensionPayload': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['deletePortableExtensionPayload']>[0] => {
    return {
      payloadId: readString(params, 'payloadId'),
      expectedVersion: readNumber(params, 'expectedVersion'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.deletePortableExtensionPayload(input, ctx.request)),
  'replaceCardPortableExtensionPayloads': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['replaceCardPortableExtensionPayloads']>[0] => {
    return {
      cardId: readString(params, 'cardId'),
      expectedVersion: readNumber(params, 'expectedVersion'),
      payloadIds: readStringArray(params, 'payloadIds'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.replaceCardPortableExtensionPayloads(input, ctx.request)),
}
