import { useBoardStore } from '@/app/store'

// Aviso honesto quando o servidor de tempo real não responde: sem ele, nada
// do que acontece na mesa chega aos outros jogadores.

export function SyncWarning() {
  const stalled = useBoardStore((s) => s.syncStalled)
  if (!stalled) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-3">
      <div className="pointer-events-auto max-w-md rounded-lg border border-red-800/60 bg-red-950/90 px-4 py-2.5 text-center shadow-lg backdrop-blur">
        <p className="text-xs font-bold text-red-200">
          ⚠️ Sem conexão com o servidor da mesa
        </p>
        <p className="mt-1 text-[11px] leading-4 text-red-300/80">
          O que você fizer agora não chega aos outros jogadores. Estamos tentando reconectar
          sozinhos — se não voltar, recarregue a página.
        </p>
      </div>
    </div>
  )
}
