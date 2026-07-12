import { useCallback, useEffect, useRef, useState } from 'react'
import { DiceSyntaxError, parseChatInput, roll, type ChatMessage } from '@/core'
import { useBoardStore } from '@/app/store'
import { DiceTray } from './DiceTray'
import { RollCard } from './RollCard'

// Largura ajustável (arrastando a borda esquerda) e recolhível; ambas persistidas.
const MIN_WIDTH = 280
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 320
const WIDTH_KEY = 'vtt:chat:width'
const COLLAPSED_KEY = 'vtt:chat:collapsed'

function loadWidth(): number {
  const stored = Number(localStorage.getItem(WIDTH_KEY))
  if (Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH) return stored
  return DEFAULT_WIDTH
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function MessageRow({ message }: { message: ChatMessage }) {
  return (
    <div>
      <div className="mb-0.5 flex items-baseline gap-2">
        <span className="text-xs font-semibold text-zinc-300">{message.authorName}</span>
        <span className="text-[10px] text-zinc-600">{timeFormat.format(message.createdAt)}</span>
      </div>
      {message.content.type === 'text' ? (
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-300">
          {message.content.text}
        </p>
      ) : (
        <RollCard label={message.content.label} roll={message.content.roll} />
      )}
    </div>
  )
}

export function ChatPanel() {
  const messages = useBoardStore((s) => s.messages)
  const sendMessage = useBoardStore((s) => s.sendMessage)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [width, setWidth] = useState(loadWidth)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, collapsed])

  useEffect(() => {
    localStorage.setItem(WIDTH_KEY, String(width))
  }, [width])

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const previousCursor = document.body.style.cursor
    const previousSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: PointerEvent) => {
      // Painel ancorado à direita: a largura é a distância do cursor à borda direita.
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousSelect
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }, [])

  function executeRoll(formula: string, label?: string) {
    try {
      sendMessage({ type: 'roll', label, roll: roll(formula) })
      setError(null)
      return true
    } catch (e) {
      setError(e instanceof DiceSyntaxError ? e.message : 'Não foi possível rolar essa fórmula.')
      return false
    }
  }

  function submit() {
    const command = parseChatInput(input)
    if (!command) return
    if (command.kind === 'text') {
      sendMessage({ type: 'text', text: command.text })
      setError(null)
      setInput('')
      return
    }
    if (executeRoll(command.formula, command.label)) setInput('')
  }

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-l border-zinc-800 bg-zinc-950 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Abrir chat"
          aria-label="Abrir chat"
          className="rounded-md px-2 py-1 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
        >
          «
        </button>
        <span
          className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
          style={{ writingMode: 'vertical-rl' }}
        >
          Chat da sessão
        </span>
      </aside>
    )
  }

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-l border-zinc-800 bg-zinc-950"
    >
      {/* Alça de redimensionamento (borda esquerda) */}
      <div
        onPointerDown={startResize}
        title="Arraste para ajustar a largura"
        className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize transition-colors hover:bg-cyan-600/40 active:bg-cyan-600/60"
      />

      <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-zinc-200">Chat da sessão</h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Recolher chat"
          aria-label="Recolher chat"
          className="rounded-md px-2 py-0.5 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          »
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-xs leading-5 text-zinc-600">
            <p>Nenhuma mensagem ainda.</p>
            <p className="mt-2">
              Role dados com{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-zinc-400">/r 2d20kh1+5</code>
            </p>
            <p>
              e descreva com{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-zinc-400"># Percepção</code>
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </div>

      <div className="border-t border-zinc-800 p-2">
        <div className="mb-2">
          <DiceTray onRoll={(formula) => executeRoll(formula)} />
        </div>
        {error && <p className="mb-1.5 px-1 text-xs text-red-400">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Mensagem ou /r 2d20kh1+5 # Percepção"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            aria-label="Mensagem do chat"
          />
        </form>
      </div>
    </aside>
  )
}
