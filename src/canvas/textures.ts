import { Assets, type Texture } from 'pixi.js'

/**
 * Carrega uma textura a partir de qualquer URI, incluindo object URLs (blob:).
 * O Assets.load padrão resolve o parser pela EXTENSÃO da URL — que não existe
 * em blob URLs — então declaramos o parser de imagem explicitamente.
 */
export async function loadTexture(uri: string): Promise<Texture | null> {
  try {
    return await Assets.load<Texture>({ src: uri, loadParser: 'loadTextures' })
  } catch (error) {
    console.warn(`[canvas] Falha ao carregar textura: ${uri}`, error)
    return null
  }
}
