import type { z } from 'zod'

/**
 * Contrato que todo sistema de jogo (Ordem Paranormal, D&D 5e...) implementa.
 * O core não conhece nenhum sistema específico (ARCHITECTURE.md D7).
 */
export interface GameSystem<TData = unknown, TDerived = unknown> {
  id: string
  name: string
  /** Valida o `systemData` de um Actor na fronteira (rede/storage). */
  actorDataSchema: z.ZodType<TData>
  /** Ficha nova em folha, com recursos no máximo. */
  createDefaultActorData(): TData
  /** Valores calculados (nunca armazenados) a partir da ficha. */
  computeDerived(data: TData): TDerived
}
