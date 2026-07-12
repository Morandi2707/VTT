import {
  actorSchema,
  computeDerived,
  opActorDataSchema,
  sceneSchema,
  tokenSchema,
  type Actor,
  type OpActorData,
  type Scene,
  type Token,
} from '@/core'

// Cena de demonstração. Some quando entrarem cenas reais (Supabase, Fase 2).

const CELL = 64

function atCell(col: number, row: number): { x: number; y: number } {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 }
}

export const demoScene: Scene = sceneSchema.parse({
  id: 'demo-scene',
  campaignId: 'demo',
  name: 'Sala de Treinamento — Ordo Realitas',
  width: 30 * CELL,
  height: 20 * CELL,
  grid: { size: CELL },
})

/** Monta o system_data OP com recursos cheios. */
function opData(partial: Record<string, unknown>): OpActorData {
  const data = opActorDataSchema.parse(partial)
  const derived = computeDerived(data)
  data.resources = { pv: derived.pvMax, pe: derived.peMax, san: derived.sanMax }
  return data
}

function makeActor(
  id: string,
  name: string,
  kind: Actor['kind'],
  systemData: OpActorData,
): Actor {
  return actorSchema.parse({
    id,
    campaignId: 'demo',
    name,
    kind,
    systemId: 'ordem-paranormal',
    systemData,
  })
}

export const demoActors: Actor[] = [
  makeActor(
    'ac-arthur',
    'Arthur Cervero',
    'character',
    opData({
      class: 'combatente',
      nex: 40,
      trilha: 'Aniquilador',
      origem: 'Militar',
      attributes: { agi: 2, for: 3, int: 1, pre: 1, vig: 3 },
      skills: { luta: 'veterano', pontaria: 'treinado', fortitude: 'treinado', percepcao: 'treinado' },
    }),
  ),
  makeActor(
    'ac-dante',
    'Dante',
    'character',
    opData({
      class: 'especialista',
      nex: 40,
      trilha: 'Técnico',
      origem: 'Universitário',
      attributes: { agi: 2, for: 1, int: 3, pre: 2, vig: 1 },
      skills: { tecnologia: 'veterano', investigacao: 'treinado', crime: 'treinado', reflexos: 'treinado' },
    }),
  ),
  makeActor(
    'ac-cesar',
    'César Cohen',
    'character',
    opData({
      class: 'ocultista',
      nex: 40,
      trilha: 'Conduíte',
      origem: 'Acadêmico',
      attributes: { agi: 1, for: 0, int: 3, pre: 3, vig: 1 },
      skills: { ocultismo: 'veterano', vontade: 'treinado', intuicao: 'treinado', religiao: 'treinado' },
    }),
  ),
  makeActor(
    'ac-kian',
    'Kian',
    'character',
    opData({
      class: 'especialista',
      nex: 40,
      trilha: 'Infiltrador',
      origem: 'Criminoso',
      attributes: { agi: 3, for: 1, int: 2, pre: 2, vig: 1 },
      skills: { furtividade: 'veterano', crime: 'veterano', enganacao: 'treinado', acrobacia: 'treinado' },
    }),
  ),
  makeActor(
    'ac-zumbi',
    'Zumbi de Sangue',
    'creature',
    opData({
      class: 'combatente',
      nex: 25,
      origem: 'Criatura de Sangue',
      attributes: { agi: 1, for: 4, int: 0, pre: 0, vig: 4 },
      skills: { luta: 'treinado', fortitude: 'treinado' },
    }),
  ),
]

export const demoTokens: Token[] = [
  tokenSchema.parse({ id: 'tk-arthur', actorId: 'ac-arthur', name: 'Arthur Cervero', ...atCell(8, 9) }),
  tokenSchema.parse({ id: 'tk-dante', actorId: 'ac-dante', name: 'Dante', ...atCell(10, 11) }),
  tokenSchema.parse({ id: 'tk-cesar', actorId: 'ac-cesar', name: 'César Cohen', ...atCell(12, 9) }),
  tokenSchema.parse({ id: 'tk-kian', actorId: 'ac-kian', name: 'Kian', ...atCell(10, 7) }),
  tokenSchema.parse({
    id: 'tk-zumbi',
    actorId: 'ac-zumbi',
    name: 'Zumbi de Sangue',
    size: 2,
    ...atCell(20, 10),
  }),
]
