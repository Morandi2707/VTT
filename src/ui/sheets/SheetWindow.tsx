import { useCallback, useRef, useState, type ReactNode } from 'react'

// Janela flutuante arrastável (pela barra de título) usada pelas fichas.

interface SheetWindowProps {
  title: string
  onClose(): void
  children: ReactNode
}

export function SheetWindow({ title, onClose, children }: SheetWindowProps) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(16, window.innerWidth - 500 - 340),
    y: 72,
  }))
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag) return
        setPos({
          x: Math.min(Math.max(ev.clientX - drag.dx, -400), window.innerWidth - 80),
          y: Math.min(Math.max(ev.clientY - drag.dy, 0), window.innerHeight - 40),
        })
      }
      const onUp = () => {
        dragRef.current = null
        window.removeEventListener('pointermove', onMove)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp, { once: true })
    },
    [pos.x, pos.y],
  )

  return (
    <div
      className="fixed z-40 flex max-h-[85vh] w-[500px] max-w-[95vw] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/95 shadow-2xl backdrop-blur"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label={title}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        className="flex cursor-grab items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-2 active:cursor-grabbing"
      >
        <h2 className="select-none text-sm font-bold tracking-wide text-zinc-100">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar ficha"
          className="rounded-md px-2 py-0.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </div>
  )
}
