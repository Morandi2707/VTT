import { Container } from 'pixi.js'

// Pilha de camadas do tabuleiro (ARCHITECTURE.md §7).
// A ordem do array É a ordem de renderização (z-index implícito por inserção).

export const LAYERS = [
  'background',
  'tiles',
  'grid',
  'templates',
  'tokens',
  'overhead',
  'lighting',
  'tools',
] as const

export type LayerId = (typeof LAYERS)[number]

export function createLayers(worldRoot: Container): Record<LayerId, Container> {
  const entries = LAYERS.map((id) => {
    const layer = new Container()
    layer.label = `layer:${id}`
    worldRoot.addChild(layer)
    return [id, layer] as const
  })
  return Object.fromEntries(entries) as Record<LayerId, Container>
}
