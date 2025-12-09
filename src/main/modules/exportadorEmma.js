import fs from 'fs/promises'
import path from 'path'

/**
 * Exporta um PedidoEmma (ou lista) para JSON formatado em disco.
 * @param {Object|Array} pedido Emma object or array of pedidos
 * @param {string} caminho output file path
 */
export async function exportar(pedido, caminho) {
  if (!pedido) throw new Error('pedido vazio')
  const dir = path.dirname(caminho)
  await fs.mkdir(dir, { recursive: true })
  const payload = Array.isArray(pedido) ? pedido : [pedido]
  const content = JSON.stringify(payload, null, 2)
  await fs.writeFile(caminho, content, { encoding: 'utf8' })
  return { path: caminho }
}
