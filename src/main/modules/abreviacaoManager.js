import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AB_FILE = path.join(__dirname, '..', 'config', 'abreviacoes.txt')

async function ensureDir() {
  const dir = path.dirname(AB_FILE)
  await fs.mkdir(dir, { recursive: true })
}

export async function getAllAbreviacoes() {
  try {
    const txt = await fs.readFile(AB_FILE, { encoding: 'utf8' })
    const lines = txt.split(/\r?\n/)
    const mapa = {}
    for (const linha of lines) {
      const l = linha.trim()
      if (!l || l.startsWith('#') || !l.includes('=')) continue
      const [k, v] = l.split('=', 2)
      mapa[k.trim().toLowerCase()] = v.trim()
    }
    return mapa
  } catch (err) {
    return {}
  }
}

export async function saveAbreviacao(componente, abrev) {
  if (!componente || !abrev) throw new Error('componente e abreviacao obrigatorios')
  const mapa = await getAllAbreviacoes()
  mapa[componente.trim().toLowerCase()] = abrev.trim()
  await ensureDir()
  const content = Object.entries(mapa).map(([k,v]) => `${k}=${v}`).join('\n')
  await fs.writeFile(AB_FILE, content, { encoding: 'utf8' })
  return mapa
}

export async function removeAbreviacao(componente) {
  const mapa = await getAllAbreviacoes()
  delete mapa[componente.trim().toLowerCase()]
  await ensureDir()
  const content = Object.entries(mapa).map(([k,v]) => `${k}=${v}`).join('\n')
  await fs.writeFile(AB_FILE, content, { encoding: 'utf8' })
  return mapa
}
