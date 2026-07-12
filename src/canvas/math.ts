// Matemática pura do viewport e do grid — sem PixiJS, 100% testável.
// Única fonte da conversão mundo ↔ tela (ARCHITECTURE.md §7).

export interface ViewportState {
  /** Translação do mundo em pixels de tela. */
  x: number
  y: number
  scale: number
}

export interface GridGeometry {
  size: number
  offsetX: number
  offsetY: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function screenToWorld(
  view: ViewportState,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return { x: (screenX - view.x) / view.scale, y: (screenY - view.y) / view.scale }
}

export function worldToScreen(
  view: ViewportState,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return { x: worldX * view.scale + view.x, y: worldY * view.scale + view.y }
}

/**
 * Zoom ancorado num ponto da tela: o ponto do MUNDO sob o cursor
 * permanece sob o cursor após a mudança de escala.
 */
export function zoomAt(
  view: ViewportState,
  anchorX: number,
  anchorY: number,
  factor: number,
  minScale: number,
  maxScale: number,
): ViewportState {
  const scale = clamp(view.scale * factor, minScale, maxScale)
  const k = scale / view.scale
  return {
    scale,
    x: anchorX - (anchorX - view.x) * k,
    y: anchorY - (anchorY - view.y) * k,
  }
}

/** Centro da célula do grid que contém o ponto (snap de token ao soltar). */
export function snapToCellCenter(
  worldX: number,
  worldY: number,
  grid: GridGeometry,
): { x: number; y: number } {
  const col = Math.floor((worldX - grid.offsetX) / grid.size)
  const row = Math.floor((worldY - grid.offsetY) / grid.size)
  return {
    x: grid.offsetX + col * grid.size + grid.size / 2,
    y: grid.offsetY + row * grid.size + grid.size / 2,
  }
}

/** Viewport inicial: cena centralizada e inteira na tela, com margem. */
export function fitSceneInView(
  sceneWidth: number,
  sceneHeight: number,
  hostWidth: number,
  hostHeight: number,
  margin = 0.9,
  minScale = 0.1,
  maxScale = 4,
): ViewportState {
  const scale = clamp(
    Math.min(hostWidth / sceneWidth, hostHeight / sceneHeight) * margin,
    minScale,
    maxScale,
  )
  return {
    scale,
    x: (hostWidth - sceneWidth * scale) / 2,
    y: (hostHeight - sceneHeight * scale) / 2,
  }
}
