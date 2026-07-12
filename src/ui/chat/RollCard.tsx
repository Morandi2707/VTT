import type { RolledDiceTerm, RollResult } from '@/core'

// Card de resultado de rolagem: breakdown completo no padrão Foundry —
// cada dado visível, mantidos vs. descartados, crítico/desastre destacados.

interface RollCardProps {
  label?: string
  roll: RollResult
}

function DieChip({ value, faces, kept }: { value: number; faces: number; kept: boolean }) {
  const isMax = value === faces
  const isMin = value === 1
  const tone = !kept
    ? 'bg-zinc-800 text-zinc-600 line-through'
    : isMax
      ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40'
      : isMin
        ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/40'
        : 'bg-zinc-800 text-zinc-200'
  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1 font-mono text-sm font-semibold ${tone}`}
      title={kept ? `d${faces}: ${value}` : `d${faces}: ${value} (descartado)`}
    >
      {value}
    </span>
  )
}

function DiceTermRow({ term }: { term: RolledDiceTerm }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 font-mono text-xs text-zinc-500">
        {term.sign < 0 && '−'}
        {term.count}d{term.faces}
        {term.keep && (term.keep.mode === 'highest' ? `kh${term.keep.count}` : `kl${term.keep.count}`)}
      </span>
      {term.rolls.map((die, i) => (
        <DieChip key={i} value={die.value} faces={term.faces} kept={die.kept} />
      ))}
    </div>
  )
}

/** Rolagem com d20 mantido em 20 natural (crítico em OP) ou 1 natural. */
function d20Outcome(roll: RollResult): 'crit' | 'fumble' | null {
  for (const term of roll.terms) {
    if (term.kind !== 'dice' || term.faces !== 20) continue
    for (const die of term.rolls) {
      if (!die.kept) continue
      if (die.value === 20) return 'crit'
      if (die.value === 1) return 'fumble'
    }
  }
  return null
}

export function RollCard({ label, roll }: RollCardProps) {
  const outcome = d20Outcome(roll)
  const totalTone =
    outcome === 'crit' ? 'text-emerald-400' : outcome === 'fumble' ? 'text-red-400' : 'text-zinc-100'

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
      {label && <p className="mb-1 text-sm font-medium text-zinc-200">{label}</p>}
      <div className="flex flex-col gap-1.5">
        {roll.terms.map((term, i) =>
          term.kind === 'dice' ? (
            <DiceTermRow key={i} term={term} />
          ) : (
            <span key={i} className="font-mono text-xs text-zinc-500">
              {term.sign < 0 ? '−' : '+'}
              {term.value}
            </span>
          ),
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-zinc-800 pt-1.5">
        <span className="font-mono text-xs text-zinc-500">{roll.formula}</span>
        <span className={`text-xl font-bold tabular-nums ${totalTone}`}>
          {roll.total}
          {outcome === 'crit' && <span className="ml-1.5 text-xs font-semibold">CRÍTICO!</span>}
          {outcome === 'fumble' && <span className="ml-1.5 text-xs font-semibold">DESASTRE</span>}
        </span>
      </div>
    </div>
  )
}
