import { z } from 'zod'

// Registro imutável de rolagem (ARCHITECTURE.md §4.5): este formato vai para o chat
// e NÃO pode mudar quando a rolagem migrar para server-authoritative.

export const dieRollSchema = z.object({
  value: z.number().int().min(1),
  kept: z.boolean(),
})

const signSchema = z.union([z.literal(1), z.literal(-1)])

export const keepSchema = z.object({
  mode: z.enum(['highest', 'lowest']),
  count: z.number().int().min(1),
})

export const rolledDiceTermSchema = z.object({
  kind: z.literal('dice'),
  sign: signSchema,
  count: z.number().int().min(1),
  faces: z.number().int().min(2),
  keep: keepSchema.optional(),
  rolls: z.array(dieRollSchema),
  subtotal: z.number().int(),
})

export const rolledModifierTermSchema = z.object({
  kind: z.literal('modifier'),
  sign: signSchema,
  value: z.number().int().min(0),
  subtotal: z.number().int(),
})

export const rollResultSchema = z.object({
  formula: z.string(),
  terms: z.array(z.discriminatedUnion('kind', [rolledDiceTermSchema, rolledModifierTermSchema])),
  total: z.number().int(),
})

export type DieRoll = z.infer<typeof dieRollSchema>
export type Keep = z.infer<typeof keepSchema>
export type RolledDiceTerm = z.infer<typeof rolledDiceTermSchema>
export type RolledModifierTerm = z.infer<typeof rolledModifierTermSchema>
export type RolledTerm = RolledDiceTerm | RolledModifierTerm
export type RollResult = z.infer<typeof rollResultSchema>
