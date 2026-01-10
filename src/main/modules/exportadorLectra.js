import fs from 'fs/promises'
import path from 'path'
import { gerarMKX } from './conversorLectra.js'

/**
 * Exporta dados para arquivo MKX Lectra
 * @param {Object|Array} pedidoOrModelos - Pode ser array de modelos ou objeto com dados completos
 * @param {string} caminho - Caminho do arquivo a salvar
 * @param {string} markerName - Nome do marker (OF + apelido)
 * @param {Object} options - Opções adicionais (espacamento, sentidoMaterial, largura, etc.)
 */
export async function exportarMkx(pedidoOrModelos, caminho, markerName, options = {}) {
  // Garantir que o caminho tenha extensão .mkx
  let finalPath = caminho
  if (!finalPath.toLowerCase().endsWith('.mkx')) {
    finalPath = finalPath.replace(/\.[^.]+$/, '') + '.mkx'
  }
  
  const dir = path.dirname(finalPath)
  await fs.mkdir(dir, { recursive: true })

  // Extrair modelos do input
  const modelos = Array.isArray(pedidoOrModelos)
    ? pedidoOrModelos
    : (pedidoOrModelos && (pedidoOrModelos.modelos || pedidoOrModelos.model || [])) || []

  if (!modelos || modelos.length === 0) throw new Error('pedido vazio')

  // Extrair options do pedidoOrModelos se for objeto com dados extras
  const pedidoOptions = !Array.isArray(pedidoOrModelos) ? pedidoOrModelos : {}

  // Mesclar options
  const mkxOptions = {
    marker_name: markerName || pedidoOptions.markerName || 'MARKER',
    espacamento: pedidoOptions.espacamento || options.espacamento || 1.5,
    sentidoMaterial: pedidoOptions.sentidoMaterial || options.sentidoMaterial || 'S',
    width_value: pedidoOptions.largura || options.width_value || 1350,
    ...options,
  }

  // Usar a função gerarMKX do conversorLectra para gerar o conteúdo completo
  const conteudo = gerarMKX(modelos, mkxOptions)
  
  await fs.writeFile(finalPath, conteudo, { encoding: 'utf8' })
  return { path: finalPath }
}
