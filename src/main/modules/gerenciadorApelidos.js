import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import sqlite3 from "sqlite3"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AP_FILE = path.join(__dirname, "..", "config", "apelidos.txt")
const DB_FILE = path.join(__dirname, "encaixe.db")

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
	if (!componente || !apelido)
		throw new Error("componente e apelido obrigatorios")
	const key = componente.trim().toLowerCase()

	if (dbConn) {
		return new Promise((resolve, reject) => {
			const sql = `INSERT INTO apelidos (componente, apelido) VALUES (?, ?) ON CONFLICT(componente) DO UPDATE SET apelido=excluded.apelido`
			dbConn.run(sql, [key, apelido.trim()], function (err) {
				if (err) return reject(err)
				// return updated map
				getAllApelidos().then(resolve).catch(reject)
			})
		})
	}

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
