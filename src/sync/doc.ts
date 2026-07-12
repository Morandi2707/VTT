import type * as Y from 'yjs'
import type { Actor, ChatMessage, Token } from '../core'

// Estrutura do documento compartilhado da sala (ARCHITECTURE.md §6):
//   tokens — Y.Map<Token> chaveado por id (LWW por token)
//   actors — Y.Map<Actor> chaveado por id (fichas; LWW por ator)
//   chat   — Y.Array<ChatMessage> append-only (trilha de auditoria)

export function getTokensMap(doc: Y.Doc): Y.Map<Token> {
  return doc.getMap<Token>('tokens')
}

export function getActorsMap(doc: Y.Doc): Y.Map<Actor> {
  return doc.getMap<Actor>('actors')
}

export function getChatArray(doc: Y.Doc): Y.Array<ChatMessage> {
  return doc.getArray<ChatMessage>('chat')
}

/** Metadados da sessão (fase preparação/em jogo etc.). */
export function getMetaMap(doc: Y.Doc): Y.Map<string> {
  return doc.getMap<string>('meta')
}
