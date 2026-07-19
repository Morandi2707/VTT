import { supabase } from './supabase'

// Envio de imagens (mapas, artes de token) para o Supabase Storage.
// O que sincroniza entre os jogadores é a URL pública devolvida aqui — um
// `blob:` local só existe no navegador que o criou.

const BUCKET = 'assets'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export class AssetUploadError extends Error {}

function extensionOf(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fromName && fromName.length <= 5) return fromName
  const fromType = file.type.split('/')[1]?.replace(/[^a-z0-9]/g, '')
  return fromType && fromType.length <= 5 ? fromType : 'png'
}

/** Envia a imagem e devolve a URL pública (a que todos conseguem carregar). */
export async function uploadAsset(file: File, campaignId: string): Promise<string> {
  if (!supabase) {
    throw new AssetUploadError('Armazenamento indisponível — faça login para enviar imagens.')
  }
  if (!file.type.startsWith('image/')) {
    throw new AssetUploadError('Esse arquivo não é uma imagem.')
  }
  if (file.size > MAX_BYTES) {
    throw new AssetUploadError(
      `Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite é 10 MB.`,
    )
  }

  const path = `${campaignId}/${crypto.randomUUID()}.${extensionOf(file)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000', // imutável: o nome já é único
    upsert: false,
  })
  if (error) throw new AssetUploadError(error.message)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
