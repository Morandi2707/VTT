import { describe, expect, it } from 'vitest'
import { computeDerived, nexToLevel } from './derived'
import { attributeTestFormula, rollSkillTest } from './rolls'
import { opActorDataSchema, type OpActorData } from './schema'
import { ordemParanormalSystem } from './index'

function makeActor(overrides: Partial<OpActorData> = {}): OpActorData {
  return opActorDataSchema.parse({
    class: 'combatente',
    nex: 5,
    attributes: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
    skills: {},
    ...overrides,
  })
}

describe('opActorDataSchema', () => {
  it('preenche padrões (perícias destreinadas, inventário vazio)', () => {
    const actor = makeActor()
    expect(actor.skills.luta).toBe('destreinado')
    expect(actor.inventory).toEqual([])
    expect(actor.rituals).toEqual([])
  })

  it('rejeita NEX fora de 5–99', () => {
    expect(() => makeActor({ nex: 4 })).toThrow()
    expect(() => makeActor({ nex: 100 })).toThrow()
  })

  it('rejeita classe desconhecida', () => {
    expect(() =>
      opActorDataSchema.parse({
        class: 'bardo',
        nex: 5,
        attributes: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
        skills: {},
      }),
    ).toThrow()
  })
})

describe('nexToLevel', () => {
  it('converte NEX% para nível', () => {
    expect(nexToLevel(5)).toBe(1)
    expect(nexToLevel(10)).toBe(2)
    expect(nexToLevel(50)).toBe(10)
    expect(nexToLevel(99)).toBe(20)
  })
})

describe('computeDerived', () => {
  it('combatente NEX 5% (VIG 2, PRE 1, AGI 1)', () => {
    const actor = makeActor({ attributes: { agi: 1, for: 2, int: 0, pre: 1, vig: 2 } })
    const d = computeDerived(actor)
    expect(d).toEqual({
      nexLevel: 1,
      pvMax: 22, // 20 + VIG
      peMax: 3, // 2 + PRE
      sanMax: 12,
      defense: 11, // 10 + AGI
      peRoundLimit: 1,
    })
  })

  it('ocultista NEX 99% (VIG 1, PRE 3)', () => {
    const actor = makeActor({
      class: 'ocultista',
      nex: 99,
      attributes: { agi: 2, for: 0, int: 3, pre: 3, vig: 1 },
    })
    const d = computeDerived(actor)
    expect(d.nexLevel).toBe(20)
    expect(d.pvMax).toBe(12 + 1 + 19 * (2 + 1)) // 70
    expect(d.peMax).toBe(4 + 3 + 19 * (4 + 3)) // 140
    expect(d.sanMax).toBe(20 + 19 * 5) // 115
    expect(d.peRoundLimit).toBe(20)
  })

  it('bônus de equipamento entra na Defesa', () => {
    const actor = makeActor({ defenseBonus: 5 })
    expect(computeDerived(actor).defense).toBe(16)
  })
})

describe('attributeTestFormula', () => {
  it('atributo 0 rola 2d20 e pega o menor', () => {
    expect(attributeTestFormula(0)).toBe('2d20kl1')
  })

  it('atributo 1 rola 1d20 simples', () => {
    expect(attributeTestFormula(1)).toBe('1d20')
  })

  it('atributo alto rola Xd20 e pega o maior, com bônus', () => {
    expect(attributeTestFormula(3, 5)).toBe('3d20kh1+5')
    expect(attributeTestFormula(2, -2)).toBe('2d20kh1-2')
  })
})

describe('rollSkillTest', () => {
  it('usa o atributo da perícia e o bônus do grau de treinamento', () => {
    const actor = makeActor({
      attributes: { agi: 1, for: 3, int: 1, pre: 1, vig: 1 },
      skills: opActorDataSchema.shape.skills.parse({ luta: 'treinado' }),
    })
    // FOR 3 → 3d20kh1; treinado → +5. Dados: 8, 15, 2 → mantém 15, total 20.
    let i = 0
    const values = [8, 15, 2]
    const rng = () => ((values[i++] ?? 1) - 0.5) / 20
    const test = rollSkillTest(actor, 'luta', rng)
    expect(test.skillName).toBe('Luta')
    expect(test.result.formula).toBe('3d20kh1+5')
    expect(test.result.total).toBe(20)
  })
})

describe('ordemParanormalSystem', () => {
  it('cria ficha padrão válida com recursos no máximo', () => {
    const data = ordemParanormalSystem.createDefaultActorData()
    expect(() => ordemParanormalSystem.actorDataSchema.parse(data)).not.toThrow()
    const d = computeDerived(data)
    expect(data.resources).toEqual({ pv: d.pvMax, pe: d.peMax, san: d.sanMax })
  })
})
