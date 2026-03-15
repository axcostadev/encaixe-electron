import fs from "fs"
import path from "path"

const dataPath = path.join(process.cwd(), "data", "turno_report.json")
if (!fs.existsSync(dataPath)) {
	console.error("Arquivo não encontrado:", dataPath)
	process.exit(1)
}

const backupsDir = path.join(path.dirname(dataPath), "backups")
fs.mkdirSync(backupsDir, { recursive: true })
const now = new Date()
const y = now.getFullYear()
const m = String(now.getMonth() + 1).padStart(2, "0")
const d = String(now.getDate()).padStart(2, "0")
const backupName = `turno_report-${y}${m}${d}.json`
const dest = path.join(backupsDir, backupName)

if (fs.existsSync(dest)) {
	console.log("Backup já existe:", dest)
	process.exit(0)
}

fs.copyFileSync(dataPath, dest)
console.log("Backup criado em:", dest)
