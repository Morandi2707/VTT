import { z } from 'zod'
import { rollResultSchema } from '../dice/schema'

// Mensagens de chat: registro append-only no Yjs doc da campanha.
// Rolagens embarcam o RollResult completo — trilha de auditoria imutável.

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  createdAt: z.number().int(),
  content: z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), text: z.string().min(1) }),
    z.object({
      type: z.literal('roll'),
      /** Ex.: "Percepção (treinado)" — contexto exibido acima do resultado. */
      label: z.string().optional(),
      roll: rollResultSchema,
    }),
  ]),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>
