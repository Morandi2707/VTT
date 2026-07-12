import { describe, expect, it } from 'vitest'
import { parseChatInput } from './commands'

describe('parseChatInput', () => {
  it('texto simples vira mensagem de texto', () => {
    expect(parseChatInput('olá mesa!')).toEqual({ kind: 'text', text: 'olá mesa!' })
  })

  it('entrada vazia é ignorada', () => {
    expect(parseChatInput('   ')).toBeNull()
  })

  it('/r e /roll disparam rolagem', () => {
    expect(parseChatInput('/r 2d20kh1+5')).toEqual({ kind: 'roll', formula: '2d20kh1+5' })
    expect(parseChatInput('/roll 3d6')).toEqual({ kind: 'roll', formula: '3d6' })
    expect(parseChatInput('/R 1d100')).toEqual({ kind: 'roll', formula: '1d100' })
  })

  it('# adiciona descrição à rolagem', () => {
    expect(parseChatInput('/r 2d20kh1+5 # Percepção (treinado)')).toEqual({
      kind: 'roll',
      formula: '2d20kh1+5',
      label: 'Percepção (treinado)',
    })
  })

  it('# vazio não gera label', () => {
    expect(parseChatInput('/r 1d20 #')).toEqual({ kind: 'roll', formula: '1d20', label: undefined })
  })

  it('/r sem fórmula é texto comum', () => {
    expect(parseChatInput('/r')).toEqual({ kind: 'text', text: '/r' })
  })
})
