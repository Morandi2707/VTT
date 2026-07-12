import { Container, Graphics, Sprite, Text, Ticker } from 'pixi.js'
import type { Token } from '../core/schemas'
import { loadTexture } from './textures'

/** Duração da interpolação de movimento remoto (ms). */
const MOVE_TWEEN_MS = 150

// Representação visual de um token.
// Com imagem (token.imageUri): arte de corpo inteiro "em pé" na célula, com
// sombra elíptica na base — o visual clássico das mesas de Ordem Paranormal.
// Sem imagem: disco colorido com iniciais (fallback).

const PALETTE = [0xe11d48, 0x2563eb, 0x16a34a, 0xd97706, 0x9333ea, 0x0891b2, 0xdb2777, 0x65a30d]
const SELECTION_COLOR = 0x22d3ee

function colorFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0]!
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/)
  const first = words[0]?.[0] ?? '?'
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return (first + second).toUpperCase()
}

export class TokenView extends Container {
  readonly tokenId: string
  private readonly baseShadow = new Graphics()
  private readonly body = new Graphics()
  private readonly ring = new Graphics()
  private readonly remoteRing = new Graphics()
  private remoteColors: number[] = []
  private readonly initials: Text
  private readonly nameLabel: Text
  private sprite: Sprite | null = null
  private imageUri: string | undefined
  private cellSpan = 0
  private radius = 0
  private selected = false
  private initialized = false
  private tween: { fromX: number; fromY: number; toX: number; toY: number; elapsed: number } | null =
    null

  constructor(token: Token, cellSize: number) {
    super()
    this.tokenId = token.id
    this.eventMode = 'static'
    this.cursor = 'pointer'

    this.initials = new Text({
      text: '',
      style: { fill: 0xffffff, fontSize: 16, fontFamily: 'system-ui', fontWeight: '700' },
    })
    this.initials.anchor.set(0.5)
    this.nameLabel = new Text({
      text: '',
      style: { fill: 0xd4d4d8, fontSize: 12, fontFamily: 'system-ui', fontWeight: '500' },
    })
    this.nameLabel.anchor.set(0.5, 0)

    this.addChild(this.baseShadow, this.body, this.initials, this.remoteRing, this.ring, this.nameLabel)
    this.update(token, cellSize)
  }

  update(token: Token, cellSize: number): void {
    this.moveTo(token.x, token.y)
    this.visible = token.visible
    this.cellSpan = cellSize * token.size
    this.radius = this.cellSpan / 2 - 4

    if (token.imageUri !== this.imageUri) {
      this.imageUri = token.imageUri
      void this.loadImage(token.imageUri)
    }

    this.initials.text = initialsOf(token.name)
    this.initials.style.fontSize = Math.max(12, this.radius * 0.7)
    this.nameLabel.text = token.name

    this.layoutSprite()
    this.redraw()
  }

  setSelected(selected: boolean): void {
    this.selected = selected
    this.redrawRing()
  }

  /** Seleções de OUTROS jogadores neste token (uma cor por pessoa). */
  setRemoteSelections(colors: number[]): void {
    this.remoteColors = colors
    this.redrawRing()
  }

  override destroy(...args: Parameters<Container['destroy']>): void {
    Ticker.shared.remove(this.tweenTick)
    super.destroy(...args)
  }

  /**
   * Move o token. Movimentos remotos (token já inicializado, destino distante)
   * deslizam com easing; o primeiro posicionamento e ajustes locais são diretos.
   */
  private moveTo(x: number, y: number): void {
    const target = this.tween ? { x: this.tween.toX, y: this.tween.toY } : this.position
    const distance = Math.hypot(x - target.x, y - target.y)
    if (distance < 1) return

    if (!this.initialized) {
      this.initialized = true
      this.position.set(x, y)
      return
    }

    if (!this.tween) Ticker.shared.add(this.tweenTick)
    this.tween = { fromX: this.position.x, fromY: this.position.y, toX: x, toY: y, elapsed: 0 }
  }

  private readonly tweenTick = (ticker: Ticker): void => {
    const tween = this.tween
    if (!tween) {
      Ticker.shared.remove(this.tweenTick)
      return
    }
    tween.elapsed += ticker.deltaMS
    const t = Math.min(1, tween.elapsed / MOVE_TWEEN_MS)
    const ease = 1 - (1 - t) ** 3 // ease-out cúbico
    this.position.set(
      tween.fromX + (tween.toX - tween.fromX) * ease,
      tween.fromY + (tween.toY - tween.fromY) * ease,
    )
    if (t >= 1) {
      this.tween = null
      Ticker.shared.remove(this.tweenTick)
    }
  }

  private get hasImage(): boolean {
    return this.sprite !== null
  }

  private async loadImage(uri: string | undefined): Promise<void> {
    if (!uri) {
      this.sprite?.destroy()
      this.sprite = null
      this.redraw()
      return
    }
    const texture = await loadTexture(uri)
    // Descarta se o token foi destruído ou a imagem trocou durante o load.
    if (!texture || this.destroyed || uri !== this.imageUri) return

    if (!this.sprite) {
      this.sprite = new Sprite()
      // Acima da sombra, abaixo do anel de seleção e do nome.
      this.addChildAt(this.sprite, this.getChildIndex(this.baseShadow) + 1)
    }
    this.sprite.texture = texture
    this.layoutSprite()
    this.redraw()
  }

  /** Arte "em pé": largura ≈ célula, proporção preservada, pés na base da célula. */
  private layoutSprite(): void {
    const sprite = this.sprite
    if (!sprite || !sprite.texture) return
    const width = this.cellSpan * 0.95
    sprite.anchor.set(0.5, 1)
    sprite.width = width
    sprite.height = width * (sprite.texture.height / sprite.texture.width)
    sprite.position.set(0, this.cellSpan / 2)
  }

  private redraw(): void {
    const hasImage = this.hasImage
    this.body.clear()
    this.baseShadow.clear()
    this.initials.visible = !hasImage

    if (hasImage) {
      this.baseShadow
        .ellipse(0, this.cellSpan / 2 - this.cellSpan * 0.05, this.cellSpan * 0.34, this.cellSpan * 0.11)
        .fill({ color: 0x000000, alpha: 0.4 })
      this.nameLabel.position.set(0, this.cellSpan / 2 + 4)
    } else {
      this.body.circle(0, 0, this.radius).fill(colorFor(this.tokenId))
      this.body.circle(0, 0, this.radius).stroke({ width: 2, color: 0x09090b, alpha: 0.6 })
      this.nameLabel.position.set(0, this.radius + 6)
    }
    this.redrawRing()
  }

  private redrawRing(): void {
    this.ring.clear()
    this.remoteRing.clear()

    if (this.selected) this.strokeRing(this.ring, 0, 3, SELECTION_COLOR)
    this.remoteColors.forEach((color, i) => {
      // Anéis remotos ficam por fora, um por pessoa, mais finos.
      this.strokeRing(this.remoteRing, 5 + i * 4, 2, color)
    })
  }

  private strokeRing(g: Graphics, offset: number, width: number, color: number): void {
    if (this.hasImage) {
      g.ellipse(
        0,
        this.cellSpan / 2 - this.cellSpan * 0.05,
        this.cellSpan * 0.38 + offset,
        this.cellSpan * 0.14 + offset * 0.4,
      ).stroke({ width, color })
    } else {
      g.circle(0, 0, this.radius + 4 + offset).stroke({ width, color })
    }
  }
}
