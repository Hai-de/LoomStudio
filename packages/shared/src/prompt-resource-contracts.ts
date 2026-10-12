import { z } from 'zod'

export const loreMountSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('manual'), id: z.literal('global').optional() }),
  z.object({ kind: z.literal('preset'), id: z.string() }),
])

export const loreMountSchema = z.object({
  id: z.string(),
  loreResourceId: z.string(),
  resolvedLoreResourceId: z.string().nullable().optional(),
  reference: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('package'), contributionId: z.string() }),
    z.object({ kind: z.literal('external'), resourceId: z.string(), origin: z.object({
      packageId: z.string(), contributionId: z.string(), target: z.enum(['global', 'card']),
    }).optional() }),
  ]).optional(),
  source: loreMountSourceSchema,
  orderIndex: z.number().int(),
  origin: z.record(z.string(), z.json()),
  createdAt: z.string(),
})

export const listLoreMountsInputSchema = z.object({
  source: loreMountSourceSchema.optional(),
})

export const listLoreMountsResultSchema = z.object({
  mounts: z.array(loreMountSchema),
})

export const replaceLoreMountsInputSchema = z.object({
  source: loreMountSourceSchema,
  loreResourceIds: z.array(z.string()).optional(),
  mounts: z.array(z.union([
    z.object({ id: z.string() }),
    z.object({ loreResourceId: z.string() }),
  ])).optional(),
}).refine(input => (input.loreResourceIds === undefined) !== (input.mounts === undefined), {
  message: 'Specify exactly one Lore mount list',
})

export const replaceLoreMountsResultSchema = z.object({
  mounts: z.array(loreMountSchema),
  mutation: z.object({ changesetId: z.string() }),
})

export type LoreMountSource = z.infer<typeof loreMountSourceSchema>
export type LoreMount = z.infer<typeof loreMountSchema>
export type ListLoreMountsInput = z.infer<typeof listLoreMountsInputSchema>
export type ListLoreMountsResult = z.infer<typeof listLoreMountsResultSchema>
export type ReplaceLoreMountsInput = z.infer<typeof replaceLoreMountsInputSchema>
export type ReplaceLoreMountsResult = z.infer<typeof replaceLoreMountsResultSchema>
