import { describe, expect, it } from 'vitest'
import { fitSceneInView, screenToWorld, snapToCellCenter, worldToScreen, zoomAt } from './math'

describe('conversão mundo ↔ tela', () => {
  it('faz o roundtrip exato', () => {
    const view = { x: 120, y: -40, scale: 1.5 }
    const world = screenToWorld(view, 300, 200)
    const screen = worldToScreen(view, world.x, world.y)
    expect(screen.x).toBeCloseTo(300)
    expect(screen.y).toBeCloseTo(200)
  })
})

describe('zoomAt', () => {
  it('mantém o ponto do mundo sob o cursor', () => {
    const view = { x: 50, y: 80, scale: 1 }
    const before = screenToWorld(view, 400, 300)
    const zoomed = zoomAt(view, 400, 300, 1.5, 0.1, 4)
    const after = screenToWorld(zoomed, 400, 300)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    expect(zoomed.scale).toBeCloseTo(1.5)
  })

  it('respeita os limites de escala', () => {
    const view = { x: 0, y: 0, scale: 3.9 }
    expect(zoomAt(view, 0, 0, 2, 0.1, 4).scale).toBe(4)
    expect(zoomAt({ ...view, scale: 0.12 }, 0, 0, 0.5, 0.1, 4).scale).toBe(0.1)
  })
})

describe('snapToCellCenter', () => {
  it('encaixa no centro da célula', () => {
    const grid = { size: 64, offsetX: 0, offsetY: 0 }
    expect(snapToCellCenter(70, 10, grid)).toEqual({ x: 96, y: 32 })
    expect(snapToCellCenter(0, 0, grid)).toEqual({ x: 32, y: 32 })
  })

  it('considera o offset do grid', () => {
    const grid = { size: 64, offsetX: 16, offsetY: 16 }
    expect(snapToCellCenter(17, 17, grid)).toEqual({ x: 48, y: 48 })
  })
})

describe('fitSceneInView', () => {
  it('centraliza a cena com margem', () => {
    const view = fitSceneInView(1000, 500, 800, 600)
    // escala limitada pela largura: 800/1000 * 0.9 = 0.72
    expect(view.scale).toBeCloseTo(0.72)
    expect(view.x).toBeCloseTo((800 - 1000 * 0.72) / 2)
    expect(view.y).toBeCloseTo((600 - 500 * 0.72) / 2)
  })
})
