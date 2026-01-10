import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import sqlite3 from "sqlite3"
import { app } from "electron"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Persist runtime DB and config in a stable location so rebuilds don't erase them.
// Use Electron's userData directory which points to a per-user app folder.
const USER_DATA =
	app && typeof app.getPath === "function"
		? app.getPath("userData")
		: path.join(__dirname, "..", "data")
const CONFIG_DIR = path.join(USER_DATA, "config")
const AP_FILE = path.join(CONFIG_DIR, "apelidos.txt")
const DB_FILE = path.join(USER_DATA, "encaixe.db")

let dbConn = null

async function ensureDir() {
	const dir = path.dirname(AP_FILE)
	await fs.mkdir(dir, { recursive: true })
}

function abreviarPadrao(componente) {
	if (!componente) return ""
	const padroes = {
		enchimento: "EC",
		"gola avesso": "GVA",
		forro: "FR",
		sola: "SL",
		cabedal: "CB",
	}
	const low = componente.toLowerCase()
	if (padroes[low]) return padroes[low]
	return componente.length <= 5
		? componente.toUpperCase()
		: componente.substring(0, 3).toUpperCase()
}

export async function init() {
	return new Promise((resolve, reject) => {
		console.log("[AP] using encaixe DB file at:", DB_FILE)
		sqlite3.verbose()
		dbConn = new sqlite3.Database(DB_FILE, (err) => {
			if (err) return reject(err)
			dbConn.run(
				`CREATE TABLE IF NOT EXISTS apelidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          componente TEXT UNIQUE,
          apelido TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
				(e) => {
					if (e) return reject(e)
					resolve()
				},
			)
		})
	})
}

export async function getAllApelidos() {
	if (dbConn) {
		return new Promise((resolve, reject) => {
			dbConn.all(
				"SELECT componente, apelido FROM apelidos ORDER BY componente",
				[],
				(err, rows) => {
					if (err) return reject(err)
					const mapa = {}
					for (const r of rows) mapa[r.componente.toLowerCase()] = r.apelido
					resolve(mapa)
				},
			)
		})
	}

	try {
		const txt = await fs.readFile(AP_FILE, { encoding: "utf8" })
		const lines = txt.split(/\r?\n/)
		const mapa = {}
		for (const linha of lines) {
			const l = linha.trim()
			if (!l || l.startsWith("#") || !l.includes("=")) continue
			const [k, v] = l.split("=", 2)
			mapa[k.trim().toLowerCase()] = v.trim()
		}
		return mapa
	} catch {
		return {}
	}
}

export async function saveApelido(componente, apelido) {
	console.log("[AP] saveApelido called:", {
		componente,
		apelido,
		hasDbConn: !!dbConn,
	})
	if (!componente || !apelido)
		throw new Error("componente e apelido obrigatorios")
	const key = componente.trim().toLowerCase()

	if (dbConn) {
		return new Promise((resolve, reject) => {
			const sql = `INSERT INTO apelidos (componente, apelido) VALUES (?, ?) ON CONFLICT(componente) DO UPDATE SET apelido=excluded.apelido`
			console.log("[AP] Executing SQL:", sql, "with", [key, apelido.trim()])
			dbConn.run(sql, [key, apelido.trim()], function (err) {
				if (err) {
					console.error("[AP] SQL error:", err)
					return reject(err)
				}
				console.log("[AP] Insert successful, changes:", this.changes)
				// return updated map
				getAllApelidos().then(resolve).catch(reject)
			})
		})
	}
	console.log("[AP] No dbConn, falling back to file")

	const mapa = await getAllApelidos()
	mapa[key] = apelido.trim()
	await ensureDir()
	const content = Object.entries(mapa)
		.map(([k, v]) => `${k}=${v}`)
		.join("\n")
	await fs.writeFile(AP_FILE, content, { encoding: "utf8" })
	return mapa
}

export async function removeApelido(componente) {
	const key = componente.trim().toLowerCase()
	if (dbConn) {
		return new Promise((resolve, reject) => {
			dbConn.run(
				"DELETE FROM apelidos WHERE componente = ?",
				[key],
				function (err) {
					if (err) return reject(err)
					getAllApelidos().then(resolve).catch(reject)
				},
			)
		})
	}

	const mapa = await getAllApelidos()
	delete mapa[key]
	await ensureDir()
	const content = Object.entries(mapa)
		.map(([k, v]) => `${k}=${v}`)
		.join("\n")
	await fs.writeFile(AP_FILE, content, { encoding: "utf8" })
	return mapa
}

export async function getApelido(componente) {
	const key = componente ? componente.trim().toLowerCase() : ""
	if (dbConn) {
		return new Promise((resolve, reject) => {
			dbConn.get(
				"SELECT apelido FROM apelidos WHERE componente = ?",
				[key],
				(err, row) => {
					if (err) return reject(err)
					if (row && row.apelido) return resolve(row.apelido)
					// fallback to generated abbreviation
					resolve(abreviarPadrao(componente))
				},
			)
		})
	}

	const mapa = await getAllApelidos()
	return mapa[key] || abreviarPadrao(componente)
}
