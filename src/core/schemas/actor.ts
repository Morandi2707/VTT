import { z } from 'zod'

// Envelope agnóstico de sistema. O conteúdo de `systemData` é validado
// pelo schema do GameSystem correspondente (systems/registry).

export const actorSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['character', 'npc', 'creature']).default('character'),
  systemId: z.string().min(1),
  systemData: z.unknown(),
  /** Dono da ficha (jogador). GM sempre tem acesso via RLS. */
  ownerId: z.string().optional(),
  avatarUri: z.string().optional(),
  tokenImageUri: z.string().optional(),
})

export type Actor = z.infer<typeof actorSchema>
