import { roll, type Rng, type RollResult } from '../../dice'
import type { OpActorData } from './schema'
import { SKILL_GRADE_BONUS, SKILLS, type SkillId } from './skills'

// Mecânica de teste de Ordem Paranormal: rola Xd20 (X = atributo) e mantém o MAIOR.
// Atributo 0: rola 2d20 e mantém o MENOR.

export function attributeTestFormula(attribute: number, bonus = 0): string {
  let base: string
  if (attribute <= 0) base = '2d20kl1'
  else if (attribute === 1) base = '1d20'
  else base = `${attribute}d20kh1`

  if (bonus > 0) return `${base}+${bonus}`
  if (bonus < 0) return `${base}${bonus}`
  return base
}

export interface OpTestResult {
  skill: SkillId
  skillName: string
  result: RollResult
}

/** Rola um teste de perícia usando o atributo-base e o bônus de grau de treinamento. */
export function rollSkillTest(data: OpActorData, skill: SkillId, rng?: Rng): OpTestResult {
  const def = SKILLS[skill]
  const attributeValue = data.attributes[def.attribute]
  const bonus = SKILL_GRADE_BONUS[data.skills[skill]]
  return {
    skill,
    skillName: def.name,
    result: roll(attributeTestFormula(attributeValue, bonus), rng),
  }
}
