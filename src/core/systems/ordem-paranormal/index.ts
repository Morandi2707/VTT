import type { GameSystem } from '../types'
import { computeDerived, type OpDerivedStats } from './derived'
import { opActorDataSchema, type OpActorData } from './schema'

export const ordemParanormalSystem: GameSystem<OpActorData, OpDerivedStats> = {
  id: 'ordem-paranormal',
  name: 'Ordem Paranormal',
  actorDataSchema: opActorDataSchema,
  createDefaultActorData() {
    const data = opActorDataSchema.parse({
      class: 'combatente',
      nex: 5,
      attributes: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
      skills: {},
    })
    const derived = computeDerived(data)
    data.resources = { pv: derived.pvMax, pe: derived.peMax, san: derived.sanMax }
    return data
  },
  computeDerived,
}

export * from './skills'
export * from './schema'
export * from './derived'
export * from './rolls'
