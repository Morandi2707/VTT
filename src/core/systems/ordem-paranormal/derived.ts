import type { OpActorData, OpClass } from './schema'

// Valores derivados de Ordem Paranormal — funções puras, nunca armazenados
// (ARCHITECTURE.md §6). Regras base do livro (OP 1.1); ajustes de mesa entram aqui.

export interface OpDerivedStats {
  /** Nível efetivo: NEX 5% = 1 … NEX 99% = 20. */
  nexLevel: number
  pvMax: number
  peMax: number
  sanMax: number
  defense: number
  /** Limite de PE gastos por turno (= nível de NEX). */
  peRoundLimit: number
}

interface ClassProgression {
  pvBase: number
  pvPerLevel: number
  peBase: number
  pePerLevel: number
  sanBase: number
  sanPerLevel: number
}

const CLASS_PROGRESSION: Record<OpClass, ClassProgression> = {
  combatente: { pvBase: 20, pvPerLevel: 4, peBase: 2, pePerLevel: 2, sanBase: 12, sanPerLevel: 3 },
  especialista: { pvBase: 16, pvPerLevel: 3, peBase: 3, pePerLevel: 3, sanBase: 16, sanPerLevel: 4 },
  ocultista: { pvBase: 12, pvPerLevel: 2, peBase: 4, pePerLevel: 4, sanBase: 20, sanPerLevel: 5 },
}

export function nexToLevel(nex: number): number {
  return Math.max(1, Math.ceil(nex / 5))
}

export function computeDerived(data: OpActorData): OpDerivedStats {
  const { vig, pre, agi } = data.attributes
  const prog = CLASS_PROGRESSION[data.class]
  const level = nexToLevel(data.nex)
  const levelsGained = level - 1

  return {
    nexLevel: level,
    pvMax: prog.pvBase + vig + levelsGained * (prog.pvPerLevel + vig),
    peMax: prog.peBase + pre + levelsGained * (prog.pePerLevel + pre),
    sanMax: prog.sanBase + levelsGained * prog.sanPerLevel,
    defense: 10 + agi + data.defenseBonus,
    peRoundLimit: level,
  }
}
