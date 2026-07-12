import { Graphics } from 'pixi.js'
import type { GridConfig } from '../core/schemas'

// Desenho do fundo procedural e do grid — Graphics estáticos, redesenhados
// apenas quando a cena/mapa muda (nunca por frame).

const CHECKER_A = 0x17171c
const CHECKER_B = 0x1b1b21
const GRID_LINE = 0xffffff
const SCENE_BORDER = 0x3f3f46

export interface BoardDims {
  width: number
  height: number
}

/** Fundo xadrez usado enquanto a cena não tem mapa. */
export function drawCheckerBackground(g: Graphics, dims: BoardDims, grid: GridConfig): void {
  g.clear()
  g.rect(0, 0, dims.width, dims.height).fill(CHECKER_A)
  const size = grid.size
  for (let row = 0; row * size < dims.height; row += 1) {
    for (let col = row % 2; col * size < dims.width; col += 2) {
      const w = Math.min(size, dims.width - col * size)
      const h = Math.min(size, dims.height - row * size)
      g.rect(col * size, row * size, w, h).fill(CHECKER_B)
    }
  }
  g.rect(0, 0, dims.width, dims.height).stroke({ width: 2, color: SCENE_BORDER })
}

export function drawGrid(g: Graphics, dims: BoardDims, grid: GridConfig): void {
  g.clear()
  if (!grid.visible) return

  for (let x = grid.offsetX; x <= dims.width; x += grid.size) {
    g.moveTo(x, 0).lineTo(x, dims.height)
  }
  for (let y = grid.offsetY; y <= dims.height; y += grid.size) {
    g.moveTo(0, y).lineTo(dims.width, y)
  }
  g.stroke({ width: 1, color: GRID_LINE, alpha: 0.06, pixelLine: true })
}
