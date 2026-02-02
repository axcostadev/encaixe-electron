import fs from "fs"
import path from "path"
import { app } from "electron"

const CONFIG_FILE = path.join(app.getPath("userData"), "config.json")

const DEFAULTS = {
  // Caminho completo para o arquivo .db. Pode ser alterado pelo usuário na UI.
  dbFile: path.join("C:", "Aincrad", "CuttingRoom", "app.db"),
  // Se true, permite que o usuário altere o caminho do DB de economia na UI.
  allowEconomiaDbChange: false,
  // Base onde ficam os modelos COMELZ na rede/local
  comelzModelBasePath: path.join("O:", "Lectra", "Calcado", "Modelos", "COMELZ"),
  // Base onde ficam os modelos EMMA na rede/local
  emmaModelBasePath: path.join("O:", "Lectra", "Calcado", "Modelos", "EMMA"),
  // Caminho padrão do arquivo CGC.txt para busca de dados (primário)
  cgcFilePath: path.join("O:", "Lectra", "Calcado", "Modelos", "SL-ECX", "CGC.txt"),
  // Caminho padrão do arquivo OFCC.txt para busca de dados (fallback/secundário)
  ofccFilePath: path.join("O:", "Lectra", "Calcado", "Modelos", "SL-ECX", "OFCC.txt"),
  // Diretório padrão para importação de arquivos CTF
  ctfImportDir: path.join("O:", "Lectra", "Calcado", "Modelos"),
  // Diretório padrão para importação de arquivos CTC
  ctcImportDir: path.join("O:", "Lectra", "Calcado", "Modelos"),
  // Arquivo CTC.txt para busca de OF (relatório GCI)
  ctcReportFile: path.join("O:", "CORTE", "Alyson", "relatorioGCITXT", "CTC.txt"),
  // Arquivo CTF.txt para busca de OF (relatório GCI)
  ctfReportFile: path.join("O:", "CORTE", "Alyson", "relatorioGCITXT", "CTF.txt"),
  // Nome do cliente padrão usado nos arquivos gerados
  defaultCustomerName: "VULCABRAS",
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
      const merged = { ...DEFAULTS, ...(parsed || {}) }
      // Salvar arquivo atualizado com novos campos (se houver)
      if (Object.keys(DEFAULTS).some(k => !(k in (parsed || {})))) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), { encoding: "utf8" })
      }
      return merged
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

export function getAllowEconomiaDbChange(): boolean {
  const s = loadSettingsSync()
  return !!s.allowEconomiaDbChange
}

export function getComelzModelBasePath(): string {
  const s = loadSettingsSync()
  if (s.comelzModelBasePath && typeof s.comelzModelBasePath === "string") return s.comelzModelBasePath
  return DEFAULTS.comelzModelBasePath
}

export function getEmmaModelBasePath(): string {
  const s = loadSettingsSync()
  if (s.emmaModelBasePath && typeof s.emmaModelBasePath === "string") return s.emmaModelBasePath
  return DEFAULTS.emmaModelBasePath
}

export function getCgcFilePath(): string {
  const s = loadSettingsSync()
  if (s.cgcFilePath && typeof s.cgcFilePath === "string") return s.cgcFilePath
  return DEFAULTS.cgcFilePath
}

export function getOfccFilePath(): string {
  const s = loadSettingsSync()
  if (s.ofccFilePath && typeof s.ofccFilePath === "string") return s.ofccFilePath
  return DEFAULTS.ofccFilePath
}

export function getCtfImportDir(): string {
  const s = loadSettingsSync()
  if (s.ctfImportDir && typeof s.ctfImportDir === "string") return s.ctfImportDir
  return DEFAULTS.ctfImportDir
}

export function getCtcImportDir(): string {
  const s = loadSettingsSync()
  if (s.ctcImportDir && typeof s.ctcImportDir === "string") return s.ctcImportDir
  return DEFAULTS.ctcImportDir
}

export function getCtcReportFile(): string {
  const s = loadSettingsSync()
  if (s.ctcReportFile && typeof s.ctcReportFile === "string") return s.ctcReportFile
  return DEFAULTS.ctcReportFile
}

export function getCtfReportFile(): string {
  const s = loadSettingsSync()
  if (s.ctfReportFile && typeof s.ctfReportFile === "string") return s.ctfReportFile
  return DEFAULTS.ctfReportFile
}

export function getDefaultCustomerName(): string {
  const s = loadSettingsSync()
  if (s.defaultCustomerName && typeof s.defaultCustomerName === "string") return s.defaultCustomerName
  return DEFAULTS.defaultCustomerName
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
