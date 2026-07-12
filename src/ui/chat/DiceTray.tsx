import { useState } from 'react'

// Construtor de rolagem: dado selecionável, quantidade com +/−, modo de
// resolução (somar tudo / manter maior / manter menor) e bônus.
// "Menor" cobre desvantagens e o teste de atributo 0 de Ordem Paranormal.

const DICE = [4, 6, 8, 10, 12, 20, 100] as const
const MAX_QTY = 20
const MAX_BONUS = 30

export type KeepMode = 'sum' | 'kh' | 'kl'

export function buildDiceFormula(
  faces: number,
  qty: number,
  mode: KeepMode,
  bonus: number,
): string {
  const keep = qty > 1 && mode !== 'sum' ? `${mode}1` : ''
  const mod = bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : ''
  return `${qty}d${faces}${keep}${mod}`
}

const MODES: Array<{ id: KeepMode; label: string; hint: string }> = [
  { id: 'sum', label: 'Somar', hint: 'Soma todos os dados (ex.: dano)' },
  { id: 'kh', label: 'Maior', hint: 'Mantém o maior dado (testes normais de OP)' },
  { id: 'kl', label: 'Menor', hint: 'Mantém o menor dado (desvantagem / atributo 0)' },
]

function Stepper({
  display,
  onDelta,
  decDisabled,
  incDisabled,
  decLabel,
  incLabel,
}: {
  display: string
  onDelta: (delta: number) => void
  decDisabled: boolean
  incDisabled: boolean
  decLabel: string
  incLabel: string
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onDelta(-1)}
        disabled={decDisabled}
        aria-label={decLabel}
        className="h-6 w-6 rounded bg-zinc-900 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-zinc-900"
      >
        −
      </button>
      <span className="min-w-8 text-center font-mono text-sm font-semibold text-zinc-200">
        {display}
      </span>
      <button
        type="button"
        onClick={() => onDelta(1)}
        disabled={incDisabled}
        aria-label={incLabel}
        className="h-6 w-6 rounded bg-zinc-900 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-zinc-900"
      >
        +
      </button>
    </div>
  )
}

interface DiceTrayProps {
  /** Executa a rolagem; retorna false se a fórmula foi rejeitada. */
  onRoll: (formula: string) => boolean
}

export function DiceTray({ onRoll }: DiceTrayProps) {
  const [faces, setFaces] = useState<number>(20)
  const [qty, setQty] = useState(1)
  const [mode, setMode] = useState<KeepMode>('kh')
  const [bonus, setBonus] = useState(0)

  const formula = buildDiceFormula(faces, qty, mode, bonus)
  const modeDisabled = qty === 1

  return (
    <div className="flex flex-col gap-2">
      {/* Tipo de dado */}
      <div className="flex gap-1" role="radiogroup" aria-label="Tipo de dado">
        {DICE.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={faces === d}
            onClick={() => setFaces(d)}
            className={`flex-1 rounded-md py-1 text-xs font-semibold transition-colors ${
              faces === d
                ? 'bg-cyan-600/20 text-cyan-300 ring-1 ring-cyan-500/50'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            d{d}
          </button>
        ))}
      </div>

      {/* Modo de resolução — linha inteira, três botões iguais */}
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">Modo</p>
        <div
          className={`grid grid-cols-3 rounded-md bg-zinc-900 p-0.5 ${modeDisabled ? 'opacity-40' : ''}`}
          role="radiogroup"
          aria-label="Modo de resolução"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              disabled={modeDisabled}
              title={m.hint}
              onClick={() => setMode(m.id)}
              className={`rounded py-1 text-[11px] font-semibold transition-colors ${
                mode === m.id && !modeDisabled
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quantidade e bônus lado a lado */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Dados
          </p>
          <Stepper
            display={String(qty)}
            onDelta={(d) => setQty((q) => Math.min(MAX_QTY, Math.max(1, q + d)))}
            decDisabled={qty <= 1}
            incDisabled={qty >= MAX_QTY}
            decLabel="Menos um dado"
            incLabel="Mais um dado"
          />
        </div>

        <div>
          <p className="mb-1 text-right text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            Bônus
          </p>
          <Stepper
            display={bonus > 0 ? `+${bonus}` : String(bonus)}
            onDelta={(d) => setBonus((b) => Math.min(MAX_BONUS, Math.max(-MAX_BONUS, b + d)))}
            decDisabled={bonus <= -MAX_BONUS}
            incDisabled={bonus >= MAX_BONUS}
            decLabel="Diminuir bônus"
            incLabel="Aumentar bônus"
          />
        </div>
      </div>

      {/* Prévia + rolar */}
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-xs text-zinc-500">{formula}</code>
        <button
          type="button"
          onClick={() => onRoll(formula)}
          className="rounded-md bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
        >
          Rolar
        </button>
      </div>
    </div>
  )
}
