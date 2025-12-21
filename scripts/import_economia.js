#!/usr/bin/env node
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import the DB helpers from the app
import { initDB, clearEconomia, saveEconomiaRows, getEconomiaSummary } from '../src/main/modules/db.js'

async function main(){
  try{
    console.log('[import_economia] Inicializando DB...')
    await initDB()

    const jsonPath = path.join(__dirname, 'economia_all.json')
    if(!fs.existsSync(jsonPath)){
      console.error('[import_economia] arquivo não encontrado:', jsonPath)
      process.exit(1)
    }

    const raw = fs.readFileSync(jsonPath,'utf8')
    const data = JSON.parse(raw)

    console.log('[import_economia] Registros no JSON:', Array.isArray(data) ? data.length : 0)

    console.log('[import_economia] Limpando tabela `economia`...')
    const cleared = await clearEconomia()
    console.log('[import_economia] Linhas apagadas:', cleared.deleted)

    console.log('[import_economia] Inserindo registros...')
    const res = await saveEconomiaRows(data)
    console.log('[import_economia] Inserção concluída, inseridos:', res.inserted)

    const summary = await getEconomiaSummary()
    console.log('[import_economia] Sumário pós-import:', summary)

    console.log('[import_economia] Concluído com sucesso.')
    process.exit(0)
  }catch(e){
    console.error('[import_economia] Erro:', e)
    process.exit(2)
  }
}

main()
