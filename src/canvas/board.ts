import {
  Application,
  Container,
  Graphics,
  Sprite,
  type FederatedPointerEvent,
} from 'pixi.js'
import { loadTexture } from './textures'
import type { Scene, Token } from '../core/schemas'
import type { BoardEvent, BoardEventHandler } from './events'
import { drawCheckerBackground, drawGrid, type BoardDims } from './grid'
import { createLayers, type LayerId } from './layers'
import {
  fitSceneInView,
  screenToWorld,
  snapToCellCenter,
  zoomAt,
  type ViewportState,
} from './math'
import { TokenView } from './tokens'

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const ZOOM_STEP = 1.15

type DragState =
  | { mode: 'pan'; lastX: number; lastY: number }
  | { mode: 'token'; view: TokenView; grabDx: number; grabDy: number }
  | null

export interface BoardEngineInit {
  scene: Scene
  onEvent?: BoardEventHandler
}

/**
 * Engine do tabuleiro. Dona absoluta da Application PixiJS e do render loop.
 * A UI conversa com ela por métodos imperativos e recebe BoardEvents de volta —
 * nenhum estado de frame atravessa o React (ARCHITECTURE.md §4.1).
 */
export class BoardEngine {
  private readonly app: Application
  private readonly worldRoot = new Container()
  private readonly layers: Record<LayerId, Container>
  private readonly scene: Scene
  private readonly onEvent: BoardEventHandler
  private readonly tokenViews = new Map<string, TokenView>()
  private readonly backgroundG = new Graphics()
  private readonly gridG = new Graphics()
  private mapSprite: Sprite | null = null

  /** Dimensões atuais do tabuleiro (a cena, ou o mapa carregado sobre ela). */
  private dims: BoardDims
  private view: ViewportState = { x: 0, y: 0, scale: 1 }
  private drag: DragState = null
  private selectedId: string | null = null
  private remoteSelections = new Map<string, number[]>()
  private disposed = false

  static async create(host: HTMLElement, init: BoardEngineInit): Promise<BoardEngine> {
    const app = new Application()
    await app.init({
      resizeTo: host,
      background: 0x0b0b10,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    host.appendChild(app.canvas)
    // Os globals de debug (__vttEngine/__PIXI_APP__) são atribuídos apenas em
    // syncTokens — assim a instância descartada pelo StrictMode nunca os reivindica.
    return new BoardEngine(app, init)
  }

  private constructor(app: Application, init: BoardEngineInit) {
    this.app = app
    this.scene = init.scene
    this.onEvent = init.onEvent ?? (() => {})
    this.dims = { width: init.scene.width, height: init.scene.height }

    this.worldRoot.label = 'world'
    this.app.stage.addChild(this.worldRoot)
    this.layers = createLayers(this.worldRoot)
    this.layers.background.addChild(this.backgroundG)
    this.layers.grid.addChild(this.gridG)

    this.redrawScene()
    this.fitView()
    this.wireInteraction()
  }

  // ── Interação ────────────────────────────────────────────────────────────

  private wireInteraction(): void {
    const stage = this.app.stage
    stage.eventMode = 'static'
    stage.hitArea = this.app.screen

    stage.on('pointerdown', this.onStagePointerDown)
    stage.on('globalpointermove', this.onPointerMove)
    stage.on('pointerup', this.onPointerUp)
    stage.on('pointerupoutside', this.onPointerUp)

    this.app.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    this.app.canvas.addEventListener('mousedown', this.blockMiddleClickScroll)
    // Botão direito arrasta a câmera; o menu de contexto não tem vez no tabuleiro.
    this.app.canvas.addEventListener('contextmenu', this.blockContextMenu)
  }

  private readonly blockMiddleClickScroll = (e: MouseEvent): void => {
    if (e.button === 1) e.preventDefault()
  }

  private readonly blockContextMenu = (e: Event): void => {
    e.preventDefault()
  }

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const rect = this.app.canvas.getBoundingClientRect()
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
    this.view = zoomAt(
      this.view,
      e.clientX - rect.left,
      e.clientY - rect.top,
      factor,
      MIN_SCALE,
      MAX_SCALE,
    )
    this.applyView()
    this.emit({ type: 'viewport-changed', ...this.view })
  }

  private readonly onStagePointerDown = (e: FederatedPointerEvent): void => {
    // Pan: botão esquerdo em área vazia, botão do meio ou DIREITO em qualquer lugar.
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return
    if (e.button === 0) this.select(null)
    this.drag = { mode: 'pan', lastX: e.global.x, lastY: e.global.y }
  }

  private readonly onTokenPointerDown = (e: FederatedPointerEvent, view: TokenView): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    this.select(view.tokenId)
    const world = screenToWorld(this.view, e.global.x, e.global.y)
    this.drag = {
      mode: 'token',
      view,
      grabDx: world.x - view.position.x,
      grabDy: world.y - view.position.y,
    }
  }

  private readonly onPointerMove = (e: FederatedPointerEvent): void => {
    if (!this.drag) return
    if (this.drag.mode === 'pan') {
      this.view = {
        ...this.view,
        x: this.view.x + (e.global.x - this.drag.lastX),
        y: this.view.y + (e.global.y - this.drag.lastY),
      }
      this.drag.lastX = e.global.x
      this.drag.lastY = e.global.y
      this.applyView()
      return
    }
    const world = screenToWorld(this.view, e.global.x, e.global.y)
    this.drag.view.position.set(world.x - this.drag.grabDx, world.y - this.drag.grabDy)
  }

  private readonly onPointerUp = (): void => {
    if (this.drag?.mode === 'token') {
      const view = this.drag.view
      const snapped = snapToCellCenter(view.position.x, view.position.y, {
        size: this.scene.grid.size,
        offsetX: this.scene.grid.offsetX,
        offsetY: this.scene.grid.offsetY,
      })
      view.position.set(snapped.x, snapped.y)
      this.emit({ type: 'token-moved', tokenId: view.tokenId, x: snapped.x, y: snapped.y })
    }
    this.drag = null
  }

  private select(tokenId: string | null): void {
    if (this.selectedId === tokenId) return
    if (this.selectedId) this.tokenViews.get(this.selectedId)?.setSelected(false)
    this.selectedId = tokenId
    if (tokenId) this.tokenViews.get(tokenId)?.setSelected(true)
    this.emit({ type: 'token-selected', tokenId })
  }

  // ── API imperativa (UI → engine) ─────────────────────────────────────────

  /** Reconcilia os tokens do tabuleiro com o estado da aplicação. */
  syncTokens(tokens: Token[]): void {
    if (import.meta.env.DEV) {
      // A engine VIVA reafirma os globals de debug — o double-mount do
      // StrictMode pode deixá-los apontando para a instância descartada.
      Object.assign(globalThis, { __PIXI_APP__: this.app, __vttEngine: this })
    }
    const incoming = new Set(tokens.map((t) => t.id))

    for (const [id, view] of this.tokenViews) {
      if (!incoming.has(id)) {
        view.destroy()
        this.tokenViews.delete(id)
        if (this.selectedId === id) this.select(null)
      }
    }

    for (const token of tokens) {
      // Não brigar com a mão do usuário: quem está sendo arrastado é da engine.
      if (this.drag?.mode === 'token' && this.drag.view.tokenId === token.id) continue

      const existing = this.tokenViews.get(token.id)
      if (existing) {
        existing.update(token, this.scene.grid.size)
        existing.setSelected(this.selectedId === token.id)
      } else {
        const view = new TokenView(token, this.scene.grid.size)
        view.on('pointerdown', (e: FederatedPointerEvent) => this.onTokenPointerDown(e, view))
        view.on('click', (e: FederatedPointerEvent) => {
          if (e.detail === 2) this.emit({ type: 'token-activated', tokenId: view.tokenId })
        })
        view.setRemoteSelections(this.remoteSelections.get(token.id) ?? [])
        this.tokenViews.set(token.id, view)
        this.layers.tokens.addChild(view)
      }
    }
  }

  /** Seleções dos demais jogadores: anel na cor de cada pessoa. */
  setRemoteSelections(selections: Array<{ tokenId: string; color: string }>): void {
    const byToken = new Map<string, number[]>()
    for (const { tokenId, color } of selections) {
      const parsed = Number.parseInt(color.replace('#', ''), 16)
      if (Number.isNaN(parsed)) continue
      const list = byToken.get(tokenId) ?? []
      list.push(parsed)
      byToken.set(tokenId, list)
    }
    this.remoteSelections = byToken
    for (const [id, view] of this.tokenViews) {
      view.setRemoteSelections(byToken.get(id) ?? [])
    }
  }

  /** Define (ou remove, com null) a imagem de mapa da cena. */
  async setMapImage(uri: string | null): Promise<void> {
    if (!uri) {
      this.mapSprite?.destroy()
      this.mapSprite = null
      this.dims = { width: this.scene.width, height: this.scene.height }
      this.redrawScene()
      this.fitView()
      return
    }

    const texture = await loadTexture(uri)
    if (!texture || this.disposed) return

    if (!this.mapSprite) {
      this.mapSprite = new Sprite()
      this.layers.background.addChild(this.mapSprite)
    }
    this.mapSprite.texture = texture
    this.dims = { width: texture.width, height: texture.height }
    this.redrawScene()
    this.fitView()
  }

  getViewport(): ViewportState {
    return { ...this.view }
  }

  destroy(): void {
    this.disposed = true
    this.app.canvas.removeEventListener('wheel', this.onWheel)
    this.app.canvas.removeEventListener('mousedown', this.blockMiddleClickScroll)
    this.app.canvas.removeEventListener('contextmenu', this.blockContextMenu)
    this.app.destroy(true, { children: true })
  }

  // ── Internos ─────────────────────────────────────────────────────────────

  private redrawScene(): void {
    if (this.mapSprite) {
      this.backgroundG.clear()
    } else {
      drawCheckerBackground(this.backgroundG, this.dims, this.scene.grid)
    }
    drawGrid(this.gridG, this.dims, this.scene.grid)
  }

  private fitView(): void {
    this.view = fitSceneInView(
      this.dims.width,
      this.dims.height,
      this.app.screen.width,
      this.app.screen.height,
      0.9,
      MIN_SCALE,
      MAX_SCALE,
    )
    this.applyView()
    this.emit({ type: 'viewport-changed', ...this.view })
  }

  private applyView(): void {
    this.worldRoot.position.set(this.view.x, this.view.y)
    this.worldRoot.scale.set(this.view.scale)
  }

  private emit(event: BoardEvent): void {
    this.onEvent(event)
  }
}
