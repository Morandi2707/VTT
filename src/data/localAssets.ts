// Persistência local de binários (mapas, imagens) via IndexedDB.
// Ponte até a Fase 2, quando os assets vão para o Supabase Storage —
// a interface (chave → blob) foi pensada para essa migração ser trivial.

const DB_NAME = 'vtt-local-assets'
const STORE = 'assets'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB'))
  })
}

export async function saveLocalAsset(key: string, blob: Blob): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Falha ao salvar asset'))
  })
}

export async function loadLocalAsset(key: string): Promise<Blob | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null)
    request.onerror = () => reject(request.error ?? new Error('Falha ao carregar asset'))
  })
}

export async function deleteLocalAsset(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Falha ao remover asset'))
  })
}

export const sceneMapKey = (sceneId: string) => `map:${sceneId}`
