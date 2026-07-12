import type { Awareness } from 'y-protocols/awareness'

// Presença via Yjs Awareness: estado efêmero por cliente (apelido, cor,
// token selecionado). Some sozinho quando o cliente desconecta.

export interface PeerPresence {
  clientId: number
  name: string
  /** Cor CSS (#rrggbb) atribuída pelo clientId — estável durante a sessão. */
  color: string
  selectedTokenId: string | null
  isLocal: boolean
}

const PRESENCE_COLORS = [
  '#22d3ee', // ciano
  '#f472b6', // rosa
  '#a3e635', // lima
  '#fb923c', // laranja
  '#c084fc', // roxo
  '#f87171', // vermelho
  '#34d399', // esmeralda
  '#facc15', // amarelo
] as const

/**
 * Cores atribuídas deterministicamente SEM colisão entre os presentes:
 * cada cliente parte de `clientId % N` e sonda a próxima cor livre, em ordem
 * de clientId — todos os peers calculam a mesma atribuição localmente.
 */
export function assignColors(clientIds: number[]): Map<number, string> {
  const sorted = [...clientIds].sort((a, b) => a - b)
  const taken = new Set<number>()
  const result = new Map<number, string>()
  for (const id of sorted) {
    let slot = id % PRESENCE_COLORS.length
    while (taken.has(slot) && taken.size < PRESENCE_COLORS.length) {
      slot = (slot + 1) % PRESENCE_COLORS.length
    }
    taken.add(slot)
    result.set(id, PRESENCE_COLORS[slot] ?? PRESENCE_COLORS[0])
  }
  return result
}

export function setLocalPresence(
  awareness: Awareness,
  state: { name: string; selectedTokenId: string | null },
): void {
  awareness.setLocalState({
    name: state.name,
    selectedTokenId: state.selectedTokenId,
  })
}

export function readPresence(awareness: Awareness): PeerPresence[] {
  const entries: Array<{ clientId: number; state: Record<string, unknown> }> = []
  for (const [clientId, raw] of awareness.getStates()) {
    if (!raw || typeof raw !== 'object') continue
    const state = raw as Record<string, unknown>
    if (typeof state.name !== 'string' || state.name.length === 0) continue
    entries.push({ clientId, state })
  }

  const colors = assignColors(entries.map((e) => e.clientId))
  return entries
    .map(({ clientId, state }) => ({
      clientId,
      name: state.name as string,
      color: colors.get(clientId) ?? PRESENCE_COLORS[0],
      selectedTokenId:
        typeof state.selectedTokenId === 'string' ? state.selectedTokenId : null,
      isLocal: clientId === awareness.clientID,
    }))
    .sort((a, b) => a.clientId - b.clientId)
}
