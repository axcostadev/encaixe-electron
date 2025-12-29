import fs from 'fs/promises'
import path from 'path'

/**
 * Gera um conteúdo MKX simples baseado em um array de modelos
 */
function buildMkx(modelos = [], markerName = 'MARKER') {
  const lines = []
  lines.push(`MKX MARKER "${markerName}"`)
  modelos.forEach((m, i) => {
    if (!m) return
    const nome = typeof m === 'string' ? m : (m.nome || m.name || m.id || `modelo${i + 1}`)
    lines.push(`MODEL ${i + 1} "${nome}"`)
  })
  return lines.join('\n')
}

export async function exportar(pedidoOrModelos, caminho, markerName) {
  const dir = path.dirname(caminho)
  await fs.mkdir(dir, { recursive: true })

  const modelos = Array.isArray(pedidoOrModelos)
    ? pedidoOrModelos
    : (pedidoOrModelos && (pedidoOrModelos.modelos || pedidoOrModelos.model || [])) || []

  if (!modelos || modelos.length === 0) throw new Error('pedido vazio')

  const effectiveMarker = markerName || (pedidoOrModelos && pedidoOrModelos.markerName) || 'MARKER'
  const conteudo = buildMkx(modelos, effectiveMarker)
  await fs.writeFile(caminho, conteudo, { encoding: 'utf8' })
  return { path: caminho }
}
  