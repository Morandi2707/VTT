// Interpretação de comandos digitados no chat (padrão Foundry):
//   /r 2d20kh1+5 # Percepção   → rolagem com descrição
//   /roll 3d6                  → rolagem simples
//   qualquer outra coisa       → mensagem de texto

export type ChatCommand =
  | { kind: 'text'; text: string }
  | { kind: 'roll'; formula: string; label?: string }

const ROLL_RE = /^\/r(?:oll)?\s+(.+)$/i

export function parseChatInput(raw: string): ChatCommand | null {
  const input = raw.trim()
  if (!input) return null

  const rollMatch = ROLL_RE.exec(input)
  if (rollMatch) {
    const body = rollMatch[1]!
    const hashIndex = body.indexOf('#')
    if (hashIndex >= 0) {
      const label = body.slice(hashIndex + 1).trim()
      return {
        kind: 'roll',
        formula: body.slice(0, hashIndex).trim(),
        label: label.length > 0 ? label : undefined,
      }
    }
    return { kind: 'roll', formula: body }
  }

  return { kind: 'text', text: input }
}
