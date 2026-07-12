import { describe, expect, it } from 'vitest'
import { DiceSyntaxError, parseDiceFormula } from './parse'
import { roll, type Rng } from './roll'

/** RNG determinístico que produz exatamente os valores de dado pedidos. */
function rngFor(dieValues: number[], faces: number): Rng {
  let i = 0
  return () => {
    const value = dieValues[i]
    if (value === undefined) throw new Error('rngFor: mais rolagens do que valores fornecidos')
    i += 1
    // Centro do intervalo que produz `value` em Math.floor(x * faces) + 1 — imune a erro de float.
    return (value - 0.5) / faces
  }
}

describe('parseDiceFormula', () => {
  it('interpreta um termo simples', () => {
    expect(parseDiceFormula('3d6')).toEqual([{ kind: 'dice', sign: 1, count: 3, faces: 6, keep: undefined }])
  })

  it('assume 1 dado quando a contagem é omitida', () => {
    expect(parseDiceFormula('d20')).toEqual([{ kind: 'dice', sign: 1, count: 1, faces: 20, keep: undefined }])
  })

  it('interpreta keep highest/lowest com contagem padrão 1', () => {
    expect(parseDiceFormula('2d20kh')).toEqual([
      { kind: 'dice', sign: 1, count: 2, faces: 20, keep: { mode: 'highest', count: 1 } },
    ])
    expect(parseDiceFormula('4d6kl2')).toEqual([
      { kind: 'dice', sign: 1, count: 4, faces: 6, keep: { mode: 'lowest', count: 2 } },
    ])
  })

  it('interpreta múltiplos termos com sinais e espaços', () => {
    expect(parseDiceFormula('2d8 + 1d6 - 3')).toEqual([
      { kind: 'dice', sign: 1, count: 2, faces: 8, keep: undefined },
      { kind: 'dice', sign: 1, count: 1, faces: 6, keep: undefined },
      { kind: 'modifier', sign: -1, value: 3 },
    ])
  })

  it('rejeita fórmulas inválidas', () => {
    expect(() => parseDiceFormula('')).toThrow(DiceSyntaxError)
    expect(() => parseDiceFormula('abc')).toThrow(DiceSyntaxError)
    expect(() => parseDiceFormula('2d20kh3')).toThrow(DiceSyntaxError) // keep > count
    expect(() => parseDiceFormula('0d6')).toThrow(DiceSyntaxError)
    expect(() => parseDiceFormula('2d1')).toThrow(DiceSyntaxError)
    expect(() => parseDiceFormula('999d6')).toThrow(DiceSyntaxError)
  })
})

describe('roll', () => {
  it('soma dados e modificadores', () => {
    const result = roll('3d6+2', rngFor([4, 5, 6], 6))
    expect(result.total).toBe(17)
    expect(result.terms[0]?.subtotal).toBe(15)
    expect(result.terms[1]?.subtotal).toBe(2)
  })

  it('keep highest mantém só o maior dado', () => {
    const result = roll('2d20kh1', rngFor([7, 18], 20))
    const dice = result.terms[0]
    if (dice?.kind !== 'dice') throw new Error('esperava termo de dados')
    expect(dice.rolls).toEqual([
      { value: 7, kept: false },
      { value: 18, kept: true },
    ])
    expect(result.total).toBe(18)
  })

  it('keep lowest mantém só o menor dado (atributo 0 em OP)', () => {
    const result = roll('2d20kl1', rngFor([15, 3], 20))
    expect(result.total).toBe(3)
  })

  it('modificador negativo subtrai', () => {
    const result = roll('1d20-3', rngFor([10], 20))
    expect(result.total).toBe(7)
  })

  it('normaliza a fórmula no registro', () => {
    const result = roll('2D20 KH1 + 5'.toLowerCase(), rngFor([1, 2], 20))
    expect(result.formula).toBe('2d20kh1+5')
  })

  it('produz valores dentro das faces com RNG real', () => {
    for (let i = 0; i < 200; i += 1) {
      const result = roll('1d6')
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(6)
    }
  })
})
