import type { GameSystem } from './types'

const systems = new Map<string, GameSystem>()

export function registerSystem(system: GameSystem<never, unknown> | GameSystem): void {
  if (systems.has(system.id)) {
    throw new Error(`Sistema de jogo já registrado: "${system.id}"`)
  }
  systems.set(system.id, system as GameSystem)
}

export function getSystem(id: string): GameSystem {
  const system = systems.get(id)
  if (!system) throw new Error(`Sistema de jogo não registrado: "${id}"`)
  return system
}

export function listSystems(): GameSystem[] {
  return [...systems.values()]
}
