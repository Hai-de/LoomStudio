import type { ApplicationRuntime, LoomScriptOwner } from '@loom-studio/application-runtime'
import type { JsonValue } from '@loom-studio/shared'
import { createLoomScriptMountInputSchema, listLoomScriptMountsInputSchema, loomScriptOwnerSchema, updateLoomScriptMountInputSchema } from '@loom-studio/shared/loom-scripts'
import {
  isRecord,
  readNumber,
  readOptionalString,
  readString,
} from '../../rpc-params.js'
import { jsonInput, procedure } from '../context.js'

export const loomScriptsProcedures = {
  'importLoomScript': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['importLoomScript']>[0] => {
    return { owner: readOwner(params, 'owner'), fileName: readString(params, 'fileName'), source: readString(params, 'source') }
  })).mutation(({ ctx, input }) => ctx.runtime.importLoomScript(input, ctx.request)),
  'updateLoomScript': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['updateLoomScript']>[0] => {
    return { scriptDocumentId: readString(params, 'scriptDocumentId'), expectedVersion: readNumber(params, 'expectedVersion'), fileName: readString(params, 'fileName'), source: readString(params, 'source') }
  })).mutation(({ ctx, input }) => ctx.runtime.updateLoomScript(input, ctx.request)),
  'getLoomScript': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['getLoomScript']>[0] => {
    return { scriptDocumentId: readString(params, 'scriptDocumentId') }
  })).query(({ ctx, input }) => ctx.runtime.getLoomScript(input)),
  'listLoomScripts': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['listLoomScripts']>[0] => {
    return { owner: readOptionalOwner(params, 'owner') }
  })).query(({ ctx, input }) => ctx.runtime.listLoomScripts(input)),
  'exportLoomScript': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['exportLoomScript']>[0] => {
    return { scriptDocumentId: readString(params, 'scriptDocumentId') }
  })).query(({ ctx, input }) => ctx.runtime.exportLoomScript(input)),
  'createLoomScriptMount': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['createLoomScriptMount']>[0] => {
    return createLoomScriptMountInputSchema.parse(params)
  })).mutation(({ ctx, input }) => ctx.runtime.createLoomScriptMount(input, ctx.request)),
  'updateLoomScriptMount': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['updateLoomScriptMount']>[0] => {
    return updateLoomScriptMountInputSchema.parse(params)
  })).mutation(({ ctx, input }) => ctx.runtime.updateLoomScriptMount(input, ctx.request)),
  'listLoomScriptMounts': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['listLoomScriptMounts']>[0] => {
    return listLoomScriptMountsInputSchema.parse(params ?? {})
  })).query(({ ctx, input }) => ctx.runtime.listLoomScriptMounts(input)),
  'resolveLoomScriptRendererMounts': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['resolveLoomScriptRendererMounts']>[0] => {
    return {
      workspaceId: readOptionalString(params, 'workspaceId'),
      timelineId: readOptionalString(params, 'timelineId'),
      presetId: readOptionalString(params, 'presetId'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.resolveLoomScriptRendererMounts(input)),
}

function readOwner(value: JsonValue | undefined, key: string): LoomScriptOwner {
  return loomScriptOwnerSchema.parse(isRecord(value) ? value[key] : undefined)
}

function readOptionalOwner(value: JsonValue | undefined, key: string): LoomScriptOwner | undefined {
  return isRecord(value) && value[key] !== undefined ? readOwner(value, key) : undefined
}
