import { useMemo } from 'react'
import {
  ATTRIBUTE_NAMES,
  ATTRIBUTES,
  attributeTestFormula,
  computeDerived,
  OP_CLASSES,
  opActorDataSchema,
  roll,
  rollSkillTest,
  SKILL_GRADE_BONUS,
  SKILL_GRADES,
  SKILL_IDS,
  SKILLS,
  type Actor,
  type AttributeId,
  type OpActorData,
  type SkillGrade,
  type SkillId,
} from '@/core'
import { useBoardStore } from '@/app/store'
import { SheetWindow } from '../SheetWindow'

// Ficha de Ordem Paranormal. Toda edição vai para o Yjs (a mesa inteira vê);
// todo clique em perícia/atributo rola no chat com os bônus corretos.

const CLASS_NAMES: Record<(typeof OP_CLASSES)[number], string> = {
  combatente: 'Combatente',
  especialista: 'Especialista',
  ocultista: 'Ocultista',
}

const GRADE_LABEL: Record<SkillGrade, string> = {
  destreinado: '—',
  treinado: 'T',
  veterano: 'V',
  expert: 'E',
}

const GRADE_TONE: Record<SkillGrade, string> = {
  destreinado: 'bg-zinc-800 text-zinc-500',
  treinado: 'bg-cyan-600/20 text-cyan-300',
  veterano: 'bg-violet-600/20 text-violet-300',
  expert: 'bg-amber-600/20 text-amber-300',
}

function ResourceBar({
  label,
  current,
  max,
  tone,
  onDelta,
}: {
  label: string
  current: number
  max: number
  tone: string
  onDelta(delta: number): void
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-zinc-300">
          {current}/{max}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => onDelta(e.shiftKey ? -5 : -1)}
          title="−1 (Shift: −5)"
          className="h-6 w-6 shrink-0 rounded bg-zinc-900 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          −
        </button>
        <div className="relative h-4 flex-1 overflow-hidden rounded bg-zinc-900">
          <div className={`h-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
        </div>
        <button
          type="button"
          onClick={(e) => onDelta(e.shiftKey ? 5 : 1)}
          title="+1 (Shift: +5)"
          className="h-6 w-6 shrink-0 rounded bg-zinc-900 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          +
        </button>
      </div>
    </div>
  )
}

interface OpSheetBodyProps {
  actor: Actor
  data: OpActorData
  tokenId: string | null
  onChangeTokenImage(tokenId: string): void
}

function OpSheetBody({ actor, data, tokenId, onChangeTokenImage }: OpSheetBodyProps) {
  const setActorSystemData = useBoardStore((s) => s.setActorSystemData)
  const setActorName = useBoardStore((s) => s.setActorName)
  const sendMessage = useBoardStore((s) => s.sendMessage)
  const derived = useMemo(() => computeDerived(data), [data])

  const patch = (fn: (d: OpActorData) => void) => {
    const next = structuredClone(data)
    fn(next)
    setActorSystemData(actor.id, next)
  }

  const clampResource = (value: number, max: number) => Math.max(0, Math.min(max, value))

  function rollSkill(skill: SkillId) {
    const test = rollSkillTest(data, skill)
    sendMessage({
      type: 'roll',
      label: `${test.skillName} (${data.skills[skill]}) — ${actor.name}`,
      roll: test.result,
    })
  }

  function rollAttribute(attr: AttributeId) {
    sendMessage({
      type: 'roll',
      label: `${ATTRIBUTE_NAMES[attr]} — ${actor.name}`,
      roll: roll(attributeTestFormula(data.attributes[attr])),
    })
  }

  function cycleGrade(skill: SkillId) {
    const next = SKILL_GRADES[
      (SKILL_GRADES.indexOf(data.skills[skill]) + 1) % SKILL_GRADES.length
    ] as SkillGrade
    patch((d) => {
      d.skills[skill] = next
    })
  }

  const nexUp = () => patch((d) => (d.nex = d.nex >= 95 ? 99 : d.nex + 5))
  const nexDown = () => patch((d) => (d.nex = d.nex === 99 ? 95 : Math.max(5, d.nex - 5)))

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Identidade */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Nome
          </label>
          <input
            defaultValue={actor.name}
            key={actor.name}
            onBlur={(e) => setActorName(actor.id, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-full border-b border-zinc-800 bg-transparent text-base font-semibold text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Classe
          </label>
          <select
            value={data.class}
            onChange={(e) => patch((d) => (d.class = e.target.value as OpActorData['class']))}
            className="block rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 focus:outline-none"
          >
            {OP_CLASSES.map((c) => (
              <option key={c} value={c}>
                {CLASS_NAMES[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">NEX</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={nexDown}
              aria-label="Diminuir NEX"
              className="h-6 w-6 rounded bg-zinc-900 text-sm font-bold text-zinc-400 hover:bg-zinc-800"
            >
              −
            </button>
            <span className="min-w-12 text-center font-mono text-sm font-bold text-zinc-100">
              {data.nex}%
            </span>
            <button
              type="button"
              onClick={nexUp}
              aria-label="Aumentar NEX"
              className="h-6 w-6 rounded bg-zinc-900 text-sm font-bold text-zinc-400 hover:bg-zinc-800"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Recursos */}
      <div className="grid grid-cols-1 gap-2.5">
        <ResourceBar
          label="Pontos de Vida"
          current={data.resources.pv}
          max={derived.pvMax}
          tone="bg-red-600"
          onDelta={(d) =>
            patch((dd) => (dd.resources.pv = clampResource(dd.resources.pv + d, derived.pvMax)))
          }
        />
        <ResourceBar
          label="Sanidade"
          current={data.resources.san}
          max={derived.sanMax}
          tone="bg-indigo-500"
          onDelta={(d) =>
            patch((dd) => (dd.resources.san = clampResource(dd.resources.san + d, derived.sanMax)))
          }
        />
        <ResourceBar
          label="Pontos de Esforço"
          current={data.resources.pe}
          max={derived.peMax}
          tone="bg-amber-500"
          onDelta={(d) =>
            patch((dd) => (dd.resources.pe = clampResource(dd.resources.pe + d, derived.peMax)))
          }
        />
      </div>

      {/* Derivados */}
      <div className="flex gap-3 text-center">
        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2">
          <p className="text-2xl font-bold text-zinc-100">{derived.defense}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Defesa</p>
        </div>
        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2">
          <p className="text-2xl font-bold text-zinc-100">{derived.peRoundLimit}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            PE / rodada
          </p>
        </div>
        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2">
          <p className="text-2xl font-bold text-zinc-100">{derived.nexLevel}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nível</p>
        </div>
      </div>

      {/* Atributos — clique no nome rola o teste puro */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Atributos <span className="font-normal normal-case">(clique no nome para rolar)</span>
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ATTRIBUTES.map((attr) => (
            <div
              key={attr}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-1.5 text-center"
            >
              <button
                type="button"
                onClick={() => rollAttribute(attr)}
                title={`Rolar ${ATTRIBUTE_NAMES[attr]} (${attributeTestFormula(data.attributes[attr])})`}
                className="w-full text-[11px] font-bold uppercase text-zinc-300 hover:text-cyan-300"
              >
                {attr.toUpperCase()}
              </button>
              <div className="mt-1 flex items-center justify-center gap-1">
                <button
                  type="button"
                  aria-label={`Diminuir ${ATTRIBUTE_NAMES[attr]}`}
                  onClick={() =>
                    patch((d) => (d.attributes[attr] = Math.max(0, d.attributes[attr] - 1)))
                  }
                  className="h-5 w-5 rounded bg-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-200"
                >
                  −
                </button>
                <span className="w-5 text-center text-lg font-bold text-zinc-100">
                  {data.attributes[attr]}
                </span>
                <button
                  type="button"
                  aria-label={`Aumentar ${ATTRIBUTE_NAMES[attr]}`}
                  onClick={() =>
                    patch((d) => (d.attributes[attr] = Math.min(10, d.attributes[attr] + 1)))
                  }
                  className="h-5 w-5 rounded bg-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-200"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Perícias — nome rola, badge cicla o grau */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Perícias{' '}
          <span className="font-normal normal-case">
            (clique no nome para rolar · no grau para treinar)
          </span>
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {SKILL_IDS.map((skill) => {
            const grade = data.skills[skill]
            const bonus = SKILL_GRADE_BONUS[grade]
            return (
              <div
                key={skill}
                className="flex items-center justify-between gap-1 rounded px-1 py-0.5 hover:bg-zinc-900/70"
              >
                <button
                  type="button"
                  onClick={() => rollSkill(skill)}
                  title={`Rolar ${SKILLS[skill].name}`}
                  className="flex-1 truncate text-left text-xs text-zinc-300 hover:text-cyan-300"
                >
                  {SKILLS[skill].name}
                  <span className="ml-1 text-[9px] uppercase text-zinc-600">
                    {SKILLS[skill].attribute}
                  </span>
                </button>
                {bonus > 0 && <span className="font-mono text-[10px] text-zinc-500">+{bonus}</span>}
                <button
                  type="button"
                  onClick={() => cycleGrade(skill)}
                  title={`Grau: ${grade} (clique para mudar)`}
                  className={`h-5 w-5 shrink-0 rounded text-[10px] font-bold ${GRADE_TONE[grade]}`}
                >
                  {GRADE_LABEL[grade]}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex flex-wrap gap-2">
        {tokenId && (
          <button
            type="button"
            onClick={() => onChangeTokenImage(tokenId)}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            🖼️ Trocar imagem do token
          </button>
        )}
        <button
          type="button"
          title="Baixa a ficha em JSON — guarde para importar em outra mesa"
          onClick={() => {
            const blob = new Blob([JSON.stringify(actor, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${actor.name.replace(/[^\p{L}\p{N} _-]/gu, '')}.ficha.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          ⬇️ Baixar ficha
        </button>
      </div>
    </div>
  )
}

interface OpSheetWindowProps {
  onChangeTokenImage(tokenId: string): void
}

export function OpSheetWindow({ onChangeTokenImage }: OpSheetWindowProps) {
  const sheet = useBoardStore((s) => s.sheet)
  // A ficha pode estar na mesa (pública) ou atrás do escudo do mestre.
  const actor = useBoardStore((s) =>
    s.sheet ? (s.actors[s.sheet.actorId] ?? s.gmActors[s.sheet.actorId]) : undefined,
  )
  const closeSheet = useBoardStore((s) => s.closeSheet)

  if (!sheet || !actor) return null

  const parsed = opActorDataSchema.safeParse(actor.systemData)
  if (!parsed.success) {
    return (
      <SheetWindow title={actor.name} onClose={closeSheet}>
        <p className="p-4 text-sm text-red-400">
          Esta ficha está corrompida ou usa um schema incompatível.
        </p>
      </SheetWindow>
    )
  }

  return (
    <SheetWindow title={`${actor.name} — Ficha`} onClose={closeSheet}>
      <OpSheetBody
        actor={actor}
        data={parsed.data}
        tokenId={sheet.tokenId}
        onChangeTokenImage={onChangeTokenImage}
      />
    </SheetWindow>
  )
}
