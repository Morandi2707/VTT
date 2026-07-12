import { parseDiceFormula } from './parse'
import type { DieRoll, RolledTerm, RollResult } from './schema'

/** Gerador de números aleatórios em [0, 1). Injetável para testes e, futuramente, para seed do servidor. */
export type Rng = () => number

function rollDie(faces: number, rng: Rng): number {
  return Math.floor(rng() * faces) + 1
}

/**
 * Rola uma fórmula de dados e devolve o registro auditável completo
 * (cada dado individual, quais foram mantidos pelo keep, subtotais e total).
 */
export function roll(formula: string, rng: Rng = Math.random): RollResult {
  const terms = parseDiceFormula(formula)

  const rolled: RolledTerm[] = terms.map((term) => {
    if (term.kind === 'modifier') {
      return { ...term, subtotal: term.sign * term.value }
    }

    const rolls: DieRoll[] = Array.from({ length: term.count }, () => ({
      value: rollDie(term.faces, rng),
      kept: true,
    }))

    const keep = term.keep
    if (keep) {
      const byValue = [...rolls].sort((a, b) =>
        keep.mode === 'highest' ? b.value - a.value : a.value - b.value,
      )
      const cutoff = new Set(byValue.slice(0, keep.count))
      for (const die of rolls) die.kept = cutoff.has(die)
    }

    const subtotal =
      term.sign * rolls.filter((die) => die.kept).reduce((sum, die) => sum + die.value, 0)
    return { ...term, rolls, subtotal }
  })

  return {
    formula: formula.replace(/\s+/g, '').toLowerCase(),
    terms: rolled,
    total: rolled.reduce((sum, term) => sum + term.subtotal, 0),
  }
}
