import { describe, expect, it } from 'vitest'
import { assignColors } from './presence'

describe('assignColors', () => {
  it('nunca repete cor entre os presentes (até 8 pessoas)', () => {
    // clientIds que colidem no % 8 de propósito
    const ids = [8, 16, 24, 1, 9, 33, 41, 7]
    const colors = assignColors(ids)
    expect(new Set(colors.values()).size).toBe(ids.length)
  })

  it('é determinística independente da ordem de entrada', () => {
    const a = assignColors([30, 10, 20])
    const b = assignColors([10, 20, 30])
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort())
  })

  it('mantém a cor natural quando não há colisão', () => {
    const colors = assignColors([0, 1, 2])
    expect(new Set(colors.values()).size).toBe(3)
  })
})
