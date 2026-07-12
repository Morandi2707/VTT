import { z } from 'zod'

export const campaignMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['gm', 'player']),
})

export const campaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  systemId: z.string().min(1),
  gmId: z.string().min(1),
  members: z.array(campaignMemberSchema).default([]),
  activeSceneId: z.string().optional(),
  createdAt: z.number().int(),
})

export type CampaignMember = z.infer<typeof campaignMemberSchema>
export type Campaign = z.infer<typeof campaignSchema>
