import { z } from 'zod'

// Estado de um token no tabuleiro. Vive no Yjs doc da cena (estado quente).
// Posições em coordenadas de MUNDO (pixels do mapa), não células do grid.

export const tokenSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().optional(),
  name: z.string().min(1),
  imageUri: z.string().optional(),
  x: z.number(),
  y: z.number(),
  /** Lado do token em células do grid (1 = médio, 2 = grande...). */
  size: z.number().min(0.5).max(10).default(1),
  rotation: z.number().default(0),
  visible: z.boolean().default(true),
  conditions: z.array(z.string()).default([]),
})

export type Token = z.infer<typeof tokenSchema>
