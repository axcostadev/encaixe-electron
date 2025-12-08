import fs from 'fs/promises'
import path from 'path'

function safeString(s) {
  return (s == null) ? '' : String(s)
}

/**
 * Gera um conteúdo MKX simples baseado em um array de modelos
 * Cada modelo deve ter: codigo, tamanho, a,b,c,d (quantidades)
 */
function buildMkx(modelos, markerName = 'MARKER_NAME') {
  const sb = []
  sb.push('begin of marker')
  sb.push('unit number in meter=1000')
  sb.push('markname=' + markerName)
  sb.push('marker begin')
  modelos.forEach((m, idx) => {
    sb.push(`model ${idx+1}`)
    sb.push('code=' + safeString(m.codigo))
    sb.push('size=' + safeString(m.tamanho))
    sb.push('a=' + (m.a || 0))
    sb.push('b=' + (m.b || 0))
    sb.push('c=' + (m.c || 0))
    sb.push('d=' + (m.d || 0))
    sb.push('end model')
  })
  sb.push('marker end')
  sb.push('end of marker')
  return sb.join('\n')
}

export async function exportarMkx(modelos, caminho, markerName) {
  if (!Array.isArray(modelos)) throw new Error('modelos deve ser um array')
  const dir = path.dirname(caminho)
  await fs.mkdir(dir, { recursive: true })
  const conteudo = buildMkx(modelos, markerName || 'MARKER')
  await fs.writeFile(caminho, conteudo, { encoding: 'utf8' })
  return { path: caminho }
}
