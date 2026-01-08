import fs from 'fs/promises'
import path from 'path'

/**
 * Gera um conteúdo MKX baseado em um array de modelos Lectra
 * Formato: MARKER_NAME\nCODIGO;TAMANHO;A;B;C;D\n...
 */
function buildMkx(modelos = [], markerName = 'MARKER') {
  const lines = []
  
  // Header com nome do marker
  lines.push(markerName)
  
  // Cada linha tem: codigo;tamanho;a;b;c;d
  modelos.forEach((m) => {
    if (!m) return
    const codigo = m.codigo || ''
    const tamanho = m.tamanho || ''
    const a = m.a || 0
    const b = m.b || 0
    const c = m.c || 0
    const d = m.d || 0
    lines.push(`${codigo};${tamanho};${a};${b};${c};${d}`)
  })
  
  return lines.join('\n')
}

export async function exportarMkx(pedidoOrModelos, caminho, markerName) {
  // Garantir que o caminho tenha extensão .mkx
  let finalPath = caminho
  if (!finalPath.toLowerCase().endsWith('.mkx')) {
    finalPath = finalPath.replace(/\.[^.]+$/, '') + '.mkx'
  }
  
  const dir = path.dirname(finalPath)
  await fs.mkdir(dir, { recursive: true })

  const modelos = Array.isArray(pedidoOrModelos)
    ? pedidoOrModelos
    : (pedidoOrModelos && (pedidoOrModelos.modelos || pedidoOrModelos.model || [])) || []

  if (!modelos || modelos.length === 0) throw new Error('pedido vazio')

  const effectiveMarker = markerName || (pedidoOrModelos && pedidoOrModelos.markerName) || 'MARKER'
  const conteudo = buildMkx(modelos, effectiveMarker)
  await fs.writeFile(finalPath, conteudo, { encoding: 'utf8' })
  return { path: finalPath }
}
