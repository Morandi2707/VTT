import { describe, expect, it } from 'vitest'
import { buildDiceFormula } from './DiceTray'

describe('buildDiceFormula', () => {
  it('dado único ignora o modo', () => {
    expect(buildDiceFormula(20, 1, 'kh', 0)).toBe('1d20')
    expect(buildDiceFormula(20, 1, 'kl', 0)).toBe('1d20')
  })

  it('somar não aplica keep', () => {
    expect(buildDiceFormula(6, 4, 'sum', 0)).toBe('4d6')
  })

  it('maior/menor aplicam kh1/kl1', () => {
    expect(buildDiceFormula(20, 3, 'kh', 0)).toBe('3d20kh1')
    expect(buildDiceFormula(20, 2, 'kl', 0)).toBe('2d20kl1')
  })

  it('bônus positivo e negativo', () => {
    expect(buildDiceFormula(20, 3, 'kh', 5)).toBe('3d20kh1+5')
    expect(buildDiceFormula(6, 4, 'sum', -2)).toBe('4d6-2')
    expect(buildDiceFormula(20, 2, 'kl', 0)).toBe('2d20kl1')
  })
})
