// db.js
// Serviço para manipulação do banco SQLite

import Database from "better-sqlite3"
import { app } from "electron"
import path from "path"

// Caminho do banco na pasta de dados do usuário
const dbPath = path.join(app.getPath("userData"), "database.sqlite")
const db = new Database(dbPath)

// Cria tabela se não existir
// Cada registro: data, turno, maquina, periodo, porcentagem
const createTable = `CREATE TABLE IF NOT EXISTS turno_report (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  turno INTEGER NOT NULL,
  maquina TEXT NOT NULL,
  periodo TEXT NOT NULL,
  porcentagem REAL NOT NULL
);`
db.exec(createTable)

export function saveTurnoReport({
	date,
	turno,
	maquina,
	periodo,
	porcentagem,
}) {
	const stmt = db.prepare(
		`INSERT INTO turno_report (date, turno, maquina, periodo, porcentagem) VALUES (?, ?, ?, ?, ?)`,
	)
	stmt.run(date, turno, maquina, periodo, porcentagem)
}

export function getTurnoReports({ date, turno, maquinas }) {
	let query = `SELECT * FROM turno_report WHERE date = ? AND turno = ?`
	let params = [date, turno]
	if (Array.isArray(maquinas) && maquinas.length > 0) {
		query += ` AND maquina IN (${maquinas.map(() => "?").join(",")})`
		params = [date, turno, ...maquinas]
	}
	const stmt = db.prepare(query)
	return stmt.all(...params)
}

export default db
