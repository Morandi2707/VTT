import { z } from 'zod'
import { SKILL_GRADES, SKILL_IDS, type SkillId } from './skills'

// Schema do system_data de um Actor de Ordem Paranormal (ARCHITECTURE.md §6).
// Valores derivados (Defesa, máximos de PV/PE/SAN, limite de PE por turno)
// NÃO são armazenados — ver derived.ts.

export const OP_CLASSES = ['combatente', 'especialista', 'ocultista'] as const
export type OpClass = (typeof OP_CLASSES)[number]

export const RITUAL_ELEMENTS = ['conhecimento', 'energia', 'morte', 'sangue', 'medo'] as const
export type RitualElement = (typeof RITUAL_ELEMENTS)[number]

const attributeValueSchema = z.number().int().min(0).max(10)

const skillGradeSchema = z.enum(SKILL_GRADES)
const defaultedSkillGrade = skillGradeSchema.default('destreinado')
const skillsShape = Object.fromEntries(
  SKILL_IDS.map((id) => [id, defaultedSkillGrade]),
) as Record<SkillId, typeof defaultedSkillGrade>

export const opItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['arma', 'protecao', 'equipamento', 'municao', 'geral']).default('geral'),
  /** Fórmula de dano em notação de dados (ex.: "1d12+FOR" é resolvido pelo sistema antes de rolar). */
  damageFormula: z.string().optional(),
  criticalThreshold: z.number().int().min(2).max(20).default(20),
  criticalMultiplier: z.number().int().min(2).max(10).default(2),
  /** Espaços de inventário ocupados. */
  spaces: z.number().int().min(0).default(1),
  description: z.string().default(''),
})

export const opRitualSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  element: z.enum(RITUAL_ELEMENTS),
  circle: z.number().int().min(1).max(4),
  peCost: z.number().int().min(1),
  description: z.string().default(''),
})

export const opActorDataSchema = z.object({
  class: z.enum(OP_CLASSES),
  /** Nível de Exposição Paranormal, em % (5 a 99). */
  nex: z.number().int().min(5).max(99),
  trilha: z.string().default(''),
  origem: z.string().default(''),
  attributes: z.object({
    agi: attributeValueSchema,
    for: attributeValueSchema,
    int: attributeValueSchema,
    pre: attributeValueSchema,
    vig: attributeValueSchema,
  }),
  skills: z.object(skillsShape),
  /** Valores ATUAIS dos recursos; os máximos são derivados (derived.ts). */
  resources: z
    .object({
      pv: z.number().int().min(0).default(0),
      pe: z.number().int().min(0).default(0),
      san: z.number().int().min(0).default(0),
    })
    .default({ pv: 0, pe: 0, san: 0 }),
  /** Bônus de Defesa vindo de equipamento/poderes (a base 10 + AGI é derivada). */
  defenseBonus: z.number().int().default(0),
  inventory: z.array(opItemSchema).default([]),
  rituals: z.array(opRitualSchema).default([]),
  notes: z.string().default(''),
})

export type OpItem = z.infer<typeof opItemSchema>
export type OpRitual = z.infer<typeof opRitualSchema>
export type OpActorData = z.infer<typeof opActorDataSchema>
