import { useRef } from 'react'

// Barra de ferramentas do tabuleiro: trocar mapa e adicionar token com imagem.

interface BoardToolbarProps {
  hasMap: boolean
  isGm?: boolean
  onPickMap(file: File): void
  onRemoveMap(): void
  onPickToken(file: File): void
  onOpenGmScreen?(): void
}

function FilePickerButton({
  label,
  title,
  onPick,
}: {
  label: string
  title: string
  onPick(file: File): void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        title={title}
        onClick={() => inputRef.current?.click()}
        className="pointer-events-auto rounded-md bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 shadow backdrop-blur transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = '' // permite escolher o mesmo arquivo de novo
        }}
      />
    </>
  )
}

export function BoardToolbar({
  hasMap,
  isGm = false,
  onPickMap,
  onRemoveMap,
  onPickToken,
  onOpenGmScreen,
}: BoardToolbarProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2">
      <FilePickerButton
        label={hasMap ? '🗺️ Trocar mapa' : '🗺️ Adicionar mapa'}
        title="Carregar imagem de mapa para a cena"
        onPick={onPickMap}
      />
      {hasMap && (
        <button
          type="button"
          title="Remover o mapa da cena"
          onClick={onRemoveMap}
          className="pointer-events-auto rounded-md bg-zinc-900/80 px-2 py-1.5 text-xs font-semibold text-zinc-500 shadow backdrop-blur transition-colors hover:bg-red-900/60 hover:text-red-200"
        >
          ✕
        </button>
      )}
      <FilePickerButton
        label="🎭 Adicionar token"
        title="Criar token a partir de uma imagem (personagem ou monstro)"
        onPick={onPickToken}
      />
      {isGm && (
        <button
          type="button"
          title="Abrir o Escudo do Mestre (bestiário secreto)"
          onClick={onOpenGmScreen}
          className="pointer-events-auto rounded-md bg-red-950/80 px-3 py-1.5 text-xs font-semibold text-red-200 shadow backdrop-blur transition-colors hover:bg-red-900/80"
        >
          🛡️ Escudo
        </button>
      )}
    </div>
  )
}
