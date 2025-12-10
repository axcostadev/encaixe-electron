import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AP_FILE = path.join(__dirname, '..', 'config', 'apelidos.txt')

async function ensureDir() {
  const dir = path.dirname(AP_FILE)
  await fs.mkdir(dir, { recursive: true })
}

function abreviarPadrao(componente) {
  if (!componente) return ''
  const padroes = {
    'enchimento': 'EC',
    'gola avesso': 'GVA',
    'forro': 'FR',
    'sola': 'SL',
    'cabedal': 'CB'
  }
  const low = componente.toLowerCase()
  if (padroes[low]) return padroes[low]
  return componente.length <= 5 ? componente.toUpperCase() : componente.substring(0,3).toUpperCase()
}

export async function getAllApelidos() {
  try {
    const txt = await fs.readFile(AP_FILE, { encoding: 'utf8' })
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
    // file may not exist
    return {}
  }
}

export async function saveApelido(componente, apelido) {
  if (!componente || !apelido) throw new Error('componente e apelido obrigatorios')
  const mapa = await getAllApelidos()
  mapa[componente.trim().toLowerCase()] = apelido.trim()
  await ensureDir()
  const content = Object.entries(mapa).map(([k,v]) => `${k}=${v}`).join('\n')
  await fs.writeFile(AP_FILE, content, { encoding: 'utf8' })
  return mapa
}

export async function removeApelido(componente) {
  const mapa = await getAllApelidos()
  delete mapa[componente.trim().toLowerCase()]
  await ensureDir()
  const content = Object.entries(mapa).map(([k,v]) => `${k}=${v}`).join('\n')
  await fs.writeFile(AP_FILE, content, { encoding: 'utf8' })
  return mapa
}

export async function getApelido(componente) {
  const mapa = await getAllApelidos()
  const key = componente ? componente.trim().toLowerCase() : ''
  return mapa[key] || abreviarPadrao(componente)
}
