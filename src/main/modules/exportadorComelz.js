import fs from 'fs/promises'
import path from 'path'
import { getComelzModelBasePath } from '../settings.js'

function normalizeComelzModelPath(modelPath) {
  if (!modelPath || typeof modelPath !== 'string') return modelPath
  try {
    const base = getComelzModelBasePath()
    const buildTarget = (name) => path.join(base, `${name}.cmz`)

    const norm = modelPath.replace(/\//g, '\\')
    const parts = norm.split('\\').filter(Boolean)
    const idx = parts.findIndex((p) => /COMELZ/i.test(p))
    if (idx >= 0) {
      const sub = parts.slice(idx + 1)
      if (sub.length === 0) return buildTarget('esempio')
      // If there is a folder and a file (e.g. folder\component.cmz), prefer the folder name as model
      if (sub.length >= 2) {
        const folderName = sub[0].replace(/\.[^.]*$/, '')
        return buildTarget(folderName)
      }
      // Single item after COMELZ -> use its base name
      const file = sub[0]
      const fileBase = file.replace(/\.[^.]*$/, '')
      return buildTarget(fileBase)
    }
    if (/^\\\\/.test(norm) || /^[A-Za-z]:\\/.test(norm)) {
      const file = parts[parts.length - 1]
      const fileBase = file.replace(/\.[^.]*$/, '')
      const folder = parts.length >= 2 ? parts[parts.length - 2] : fileBase
      // Prefer folder name only (user expects O:\\...\\{folder}.cmz)
      const folderBase = folder.replace(/\.[^.]*$/, '')
      return buildTarget(folderBase)
    }
    return modelPath
  } catch (e) {
    return modelPath
  }
}

export async function exportar(pedidoObj, caminho) {
  if (!pedidoObj) throw new Error('pedido vazio')
  // Normalizar campo model para o padrão local (se vier path UNC/modserver, converte)
  if (pedidoObj && pedidoObj.model) {
    pedidoObj.model = normalizeComelzModelPath(pedidoObj.model)
  }

  const dir = path.dirname(caminho)
  await fs.mkdir(dir, { recursive: true })
  const content = JSON.stringify(pedidoObj, null, 2)
  await fs.writeFile(caminho, content, { encoding: 'utf8' })
  return { path: caminho }
}
