// db.js
// Serviço para manipulação do banco SQLite

import Database from "better-sqlite3"
import { app } from "electron"
import path from "path"
import fs from "fs"
import { getDataPath } from "./db-persistent.js"

// Determine DB path colocated with turno_report.json (supports network path)
const dataJsonPath = getDataPath()
const dbDir = path.dirname(dataJsonPath)
const dbPath = path.join(dbDir, "database.sqlite")

try {
	fs.mkdirSync(dbDir, { recursive: true })
} catch (e) {
	console.warn("[DB] Não foi possível criar diretório do DB:", e.message)
}

const db = new Database(dbPath)

// Cria tabela se não existir
const createTable = `CREATE TABLE IF NOT EXISTS turno_report (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  turno INTEGER NOT NULL,
  maquina TEXT NOT NULL,
  periodo TEXT NOT NULL,
  porcentagem REAL NOT NULL
);`
db.exec(createTable)

// Migração inicial: se DB vazio e existir JSON com registros, importa e faz backup
try {
	const row = db.prepare("SELECT COUNT(1) as c FROM turno_report").get()
	const count = row ? row.c : 0
	if (count === 0 && fs.existsSync(dataJsonPath)) {
		try {
			const raw = fs.readFileSync(dataJsonPath, "utf8")
			const j = JSON.parse(raw)
			const items = Array.isArray(j.turnoReports) ? j.turnoReports : []
			if (items.length > 0) {
				const insert = db.prepare(
					`INSERT OR IGNORE INTO turno_report (id, date, turno, maquina, periodo, porcentagem) VALUES (?, ?, ?, ?, ?, ?)`,
				)
				const insertMany = db.transaction((arr) => {
					for (const it of arr) {
						insert.run(it.id || null, it.date, it.turno, it.maquina, it.periodo, it.porcentagem)
					}
				})
				insertMany(items)
				// Move JSON to migrated backup so we don't migrate again
				const migratedName = path.join(dbDir, `turno_report.migrated.${Date.now()}.json`)
				try {
					fs.renameSync(dataJsonPath, migratedName)
					console.log("[DB] Migração concluída. JSON movido para:", migratedName)
				} catch (e) {
					console.warn("[DB] Migração feita, mas não foi possível mover JSON:", e.message)
				}
			}
		} catch (e) {
			console.error("[DB] Erro ao migrar JSON para SQLite:", e)
		}
	}
} catch (e) {
	console.warn("[DB] Falha ao verificar contagem de registros:", e.message)
}

export function saveTurnoReport({ date, turno, maquina, periodo, porcentagem }) {
	const stmt = db.prepare(`INSERT INTO turno_report (date, turno, maquina, periodo, porcentagem) VALUES (?, ?, ?, ?, ?)`)
	const info = stmt.run(date, turno, maquina, periodo, porcentagem)
	return info.lastInsertRowid
}

export function getTurnoReports({ date, turno, maquinas } = {}) {
	// Constrói query dinamicamente para permitir chamadas mais flexíveis
	const where = []
	const params = []
	if (date !== undefined && date !== null) {
		where.push("date = ?")
		params.push(date)
	}
	if (turno !== undefined && turno !== null) {
		where.push("turno = ?")
		params.push(turno)
	}
	if (Array.isArray(maquinas) && maquinas.length > 0) {
		where.push(`maquina IN (${maquinas.map(() => "?").join(",")})`)
		params.push(...maquinas)
	}
	const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""
	const query = `SELECT * FROM turno_report ${whereClause}`
	const stmt = db.prepare(query)
	return params.length > 0 ? stmt.all(...params) : stmt.all()
}

export default db
