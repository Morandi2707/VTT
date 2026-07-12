import { z } from 'zod'

// Metadados frios da cena (Postgres). O estado quente (tokens, desenhos)
// vive no Yjs doc identificado pelo id da cena.

export const gridConfigSchema = z.object({
  type: z.enum(['square']).default('square'),
  /** Tamanho da célula em pixels do mapa. */
  size: z.number().int().min(8).default(64),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  visible: z.boolean().default(true),
  /** Metros (ou unidade da mesa) por célula — OP usa 1,5m. */
  unitsPerCell: z.number().positive().default(1.5),
})

export const sceneSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1),
  /** URI do mapa no Storage (o banco guarda a chave, nunca o binário). */
  mapAssetUri: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  grid: gridConfigSchema.prefault({}),
})

export type GridConfig = z.infer<typeof gridConfigSchema>
export type Scene = z.infer<typeof sceneSchema>
