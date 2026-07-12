// Identificação da sala via URL (?sala=abc123) — embrião do link de convite.

const ROOM_PARAM = 'sala'

export function generateRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('')
}

/** Lê a sala da URL; se não houver, gera uma e grava na URL (sem recarregar). */
export function currentRoomId(): string {
  const url = new URL(window.location.href)
  const existing = url.searchParams.get(ROOM_PARAM)
  if (existing && /^[a-z0-9-]{1,32}$/i.test(existing)) return existing

  const room = generateRoomId()
  url.searchParams.set(ROOM_PARAM, room)
  window.history.replaceState(null, '', url)
  return room
}
