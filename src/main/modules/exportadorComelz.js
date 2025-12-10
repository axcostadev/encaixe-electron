import fs from 'fs/promises'
import path from 'path'

export async function exportar(pedidoObj, caminho) {
  if (!pedidoObj) throw new Error('pedido vazio')
  const dir = path.dirname(caminho)
  await fs.mkdir(dir, { recursive: true })
  const content = JSON.stringify(pedidoObj, null, 2)
  await fs.writeFile(caminho, content, { encoding: 'utf8' })
  return { path: caminho }
}
