import fs from "fs"
import path from "path"
import { app } from "electron"

const CONFIG_FILE = path.join(app.getPath("userData"), "config.json")

const DEFAULTS = {
  // Caminho completo para o arquivo .db. Pode ser alterado pelo usuário na UI.
  dbFile: path.join("C:", "Aincrad", "CuttingRoom", "app.db"),
}

function loadSettingsSync(): Record<string, any> {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      // salva defaults
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2), { encoding: "utf8" })
      return { ...DEFAULTS }
    }

    const raw = fs.readFileSync(CONFIG_FILE, { encoding: "utf8" })
    try {
      const parsed = JSON.parse(raw)
      return { ...DEFAULTS, ...(parsed || {}) }
    } catch (err) {
      console.error("Erro parseando config.json, regravando defaults:", err)
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2), { encoding: "utf8" })
      return { ...DEFAULTS }
    }
  } catch (err) {
    console.error("Erro lendo configurações:", err)
    return { ...DEFAULTS }
  }
}

function saveSettingsSync(data: Record<string, any>): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), { encoding: "utf8" })
  } catch (err) {
    console.error("Erro salvando configurações:", err)
    throw err
  }
}

export function getSettings(): Record<string, any> {
  return loadSettingsSync()
}

export function setSettings(updates: Record<string, any>): Record<string, any> {
  const current = loadSettingsSync()
  const merged = { ...current, ...updates }

  // Se o caminho do DB mudou, faça backup do arquivo atual (se existir)
  if (current.dbFile && updates.dbFile && current.dbFile !== updates.dbFile) {
    try {
      const backupDir = path.join(app.getPath("userData"), "backups")
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const baseName = path.basename(current.dbFile)
      const backupPath = path.join(backupDir, `${baseName}.${timestamp}.bak`)
      if (fs.existsSync(current.dbFile)) {
        fs.copyFileSync(current.dbFile, backupPath)
        console.log(`Backed up DB ${current.dbFile} -> ${backupPath}`)
      }
    } catch (err) {
      console.error("Erro fazendo backup do DB:", err)
      // Não impedimos a gravação das novas settings por causa do backup
    }
  }

  saveSettingsSync(merged)
  return merged
}

export function getDatabaseFilePath(): string {
  const s = loadSettingsSync()
  if (s.dbFile && typeof s.dbFile === "string") return s.dbFile
  return DEFAULTS.dbFile
}
