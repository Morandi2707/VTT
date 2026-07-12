import { useEffect, useRef } from 'react'
import { BoardEngine, type BoardEventHandler } from '@/canvas'
import type { Scene, Token } from '@/core'

interface BoardCanvasProps {
  scene: Scene
  tokens: Token[]
  mapUri?: string | null
  /** Seleções dos outros jogadores (tokenId + cor da pessoa). */
  remoteSelections?: Array<{ tokenId: string; color: string }>
  onEvent?: BoardEventHandler
}

/**
 * Fronteira React ↔ PixiJS. Monta a BoardEngine UMA vez por cena e repassa
 * mudanças por chamadas imperativas — nenhum estado de frame passa por aqui
 * (ARCHITECTURE.md §4.1).
 */
export function BoardCanvas({
  scene,
  tokens,
  mapUri = null,
  remoteSelections = [],
  onEvent,
}: BoardCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BoardEngine | null>(null)
  const tokensRef = useRef(tokens)
  const mapUriRef = useRef(mapUri)
  const remoteSelectionsRef = useRef(remoteSelections)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    tokensRef.current = tokens
    engineRef.current?.syncTokens(tokens)
  }, [tokens])

  useEffect(() => {
    mapUriRef.current = mapUri
    void engineRef.current?.setMapImage(mapUri)
  }, [mapUri])

  useEffect(() => {
    remoteSelectionsRef.current = remoteSelections
    engineRef.current?.setRemoteSelections(remoteSelections)
  }, [remoteSelections])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Guarda contra o double-mount do StrictMode: se o efeito já foi limpo
    // quando o init async terminar, descarta a engine recém-criada.
    let disposed = false
    void BoardEngine.create(host, {
      scene,
      onEvent: (event) => onEventRef.current?.(event),
    }).then((engine) => {
      if (disposed) {
        engine.destroy()
        return
      }
      engineRef.current = engine
      engine.syncTokens(tokensRef.current)
      engine.setRemoteSelections(remoteSelectionsRef.current)
      if (mapUriRef.current) void engine.setMapImage(mapUriRef.current)
    })

    return () => {
      disposed = true
      engineRef.current?.destroy()
      engineRef.current = null
    }
    // A engine é recriada apenas quando a cena troca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id])

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden" />
}
