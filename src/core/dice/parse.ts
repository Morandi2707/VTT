import type { Keep } from './schema'

// Termos ainda não rolados, saída do parser.
export interface DiceTerm {
  kind: 'dice'
  sign: 1 | -1
  count: number
  faces: number
  keep?: Keep
}

export interface ModifierTerm {
  kind: 'modifier'
  sign: 1 | -1
  value: number
}

export type RollTerm = DiceTerm | ModifierTerm

export class DiceSyntaxError extends Error {
  constructor(formula: string, reason: string) {
    super(`Fórmula de dados inválida "${formula}": ${reason}`)
    this.name = 'DiceSyntaxError'
  }
}

// Limites de sanidade: fórmulas vêm do chat (entrada de usuário).
const MAX_DICE_PER_TERM = 100
const MAX_FACES = 1000

const DICE_RE = /^(\d*)d(\d+)(?:(kh|kl)(\d*))?$/

/**
 * Interpreta notação de dados: `2d20kh1+5`, `d20`, `3d6+1d4-2`, `2d20kl1`.
 * `kh`/`kl` = keep highest/lowest (padrão: 1 dado mantido).
 */
export function parseDiceFormula(formula: string): RollTerm[] {
  const normalized = formula.replace(/\s+/g, '').toLowerCase()
  if (normalized.length === 0) throw new DiceSyntaxError(formula, 'fórmula vazia')

  const tokens = normalized.match(/[+-]?[^+-]+/g)
  if (!tokens || tokens.join('') !== normalized) {
    throw new DiceSyntaxError(formula, 'sintaxe não reconhecida')
  }

  return tokens.map((token) => {
    const sign: 1 | -1 = token.startsWith('-') ? -1 : 1
    const body = token.replace(/^[+-]/, '')

    if (/^\d+$/.test(body)) {
      return { kind: 'modifier', sign, value: Number(body) } satisfies ModifierTerm
    }

    const match = DICE_RE.exec(body)
    if (!match) throw new DiceSyntaxError(formula, `termo não reconhecido "${token}"`)

    const count = match[1] === '' ? 1 : Number(match[1])
    const faces = Number(match[2])
    if (count < 1 || count > MAX_DICE_PER_TERM) {
      throw new DiceSyntaxError(formula, `quantidade de dados fora do limite (1–${MAX_DICE_PER_TERM})`)
    }
    if (faces < 2 || faces > MAX_FACES) {
      throw new DiceSyntaxError(formula, `número de faces fora do limite (2–${MAX_FACES})`)
    }

    let keep: Keep | undefined
    if (match[3]) {
      const keepCount = match[4] === '' || match[4] === undefined ? 1 : Number(match[4])
      if (keepCount < 1 || keepCount > count) {
        throw new DiceSyntaxError(formula, `keep (${keepCount}) precisa estar entre 1 e ${count}`)
      }
      keep = { mode: match[3] === 'kh' ? 'highest' : 'lowest', count: keepCount }
    }

    return { kind: 'dice', sign, count, faces, keep } satisfies DiceTerm
  })
}
