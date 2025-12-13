import path from "path"
import os from "os"
import fs from "fs"
import sqlite3 from "sqlite3"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_FILE = path.join(__dirname, "encaixe.db")
let db
console.log("[DB] using encaixe DB file at:", DB_FILE)

export function initDB() {
	return new Promise((resolve, reject) => {
		const exists = fs.existsSync(DB_FILE)
		db = new sqlite3.Database(DB_FILE, (err) => {
			if (err) return reject(err)
			db.serialize(() => {
				db.run(
					`CREATE TABLE IF NOT EXISTS linhas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT,
          of_number TEXT,
          artigo TEXT,
          modelo TEXT,
          codigo_cor TEXT,
          grade TEXT,
          pares INTEGER,
          especificacao TEXT,
          prioridade TEXT
        )`,
					(err2) => {
						if (err2) return reject(err2)
						// create cadastros table as well
						db.run(
							`CREATE TABLE IF NOT EXISTS cadastros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                artigo TEXT,
                artigo_digits TEXT,
                modelo TEXT,
                componente TEXT,
                material TEXT,
                cor TEXT,
                largura TEXT,
                tipo_tecido TEXT,
                pares_criac TEXT,
                conjug_navalha TEXT,
                placa_por_par TEXT,
                camada TEXT,
                espacamento TEXT,
                comprimento_max TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )`,
							(err3) => {
								if (err3) return reject(err3)
								// Ensure artigo_digits column exists and index is created for faster searches
								db.all("PRAGMA table_info(cadastros)", (pragmaErr, cols) => {
									if (pragmaErr) {
										console.log("[DB] PRAGMA table_info error:", pragmaErr)
										return resolve()
									}
									const hasDigits = (cols || []).some(
										(c) => c && c.name === "artigo_digits",
									)
									if (!hasDigits) {
										db.run(
											"ALTER TABLE cadastros ADD COLUMN artigo_digits TEXT",
											(alterErr) => {
												if (alterErr)
													console.log(
														"[DB] error adding artigo_digits column:",
														alterErr,
													)
												// attempt to create index regardless
												db.run(
													"CREATE INDEX IF NOT EXISTS idx_cadastros_artigo_digits ON cadastros(artigo_digits)",
													(idxErr) => {
														if (idxErr)
															console.log(
																"[DB] error creating index idx_cadastros_artigo_digits:",
																idxErr,
															)
														return resolve()
													},
												)
											},
										)
									} else {
										db.run(
											"CREATE INDEX IF NOT EXISTS idx_cadastros_artigo_digits ON cadastros(artigo_digits)",
											(idxErr) => {
												if (idxErr)
													console.log(
														"[DB] error creating index idx_cadastros_artigo_digits:",
														idxErr,
													)
												// Ensure users table exists for legacy DBs
												createUsersTable().then(resolve).catch(resolve)
											},
										)
									}
								})
							},
						)
					},
				)
			})
		})
	})
}

// Helper function to create users table if not exists
function createUsersTable() {
	return new Promise((resolve) => {
		db.run(`
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT UNIQUE NOT NULL,
				password TEXT NOT NULL,
				email TEXT,
				role TEXT DEFAULT 'viewer',
				active INTEGER DEFAULT 1,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`, (usersErr) => {
			if (usersErr) {
				console.log('[DB] error ensuring users table:', usersErr)
			}
			// Try to insert default admin if not exists
			db.run(
				"INSERT INTO users (username, password, email, role, active) VALUES (?, ?, ?, ?, ?)",
				["admin", "123456", "admin@example.com", "admin", 1],
				(errInsert) => {
					if (errInsert && !errInsert.message.includes("UNIQUE constraint failed")) {
						console.error('[DB] Erro ao criar usuário padrão no encaixe.db:', errInsert)
					}
					resolve()
				},
			)
		})
	})
}

export function saveCadastro(cadastro) {
	return new Promise((resolve, reject) => {
		const stmt = db.prepare(
			`INSERT INTO cadastros (artigo, artigo_digits, modelo, componente, material, cor, largura, tipo_tecido, pares_criac, conjug_navalha, placa_por_par, camada, espacamento, comprimento_max) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		)
		const artigoDigits = cadastro.artigo
			? String(cadastro.artigo).replace(/\D/g, "")
			: null
		stmt.run(
			cadastro.artigo || null,
			artigoDigits || null,
			cadastro.modelo || null,
			cadastro.componente || null,
			cadastro.material || null,
			cadastro.cor || null,
			cadastro.largura || null,
			cadastro.tipoTecido || null,
			cadastro.paresCriac || null,
			cadastro.conjugNavalha || null,
			cadastro.placaPorPar || null,
			cadastro.camada || null,
			cadastro.espacamento || null,
			cadastro.comprimentoMax || null,
			function (err) {
				if (err) return reject(err)
				resolve({ id: this.lastID })
			},
		)
		stmt.finalize()
	})
}

export function getCadastroByArtigo(artigo) {
	return new Promise((resolve, reject) => {
		console.log("[DB] getCadastroByArtigo called with:", artigo)
		if (!artigo) {
			console.log("[DB] getCadastroByArtigo: empty artigo")
			return resolve(null)
		}

		// Try several variants to improve match robustness:
		// 1) exact given string
		// 2) strip non-digits (useful when UI sends "COR101066066")
		// 3) if variant not found, try a LIKE match containing the digits
		const variants = [artigo]
		const digits = String(artigo).replace(/\D/g, "")
		// First try matching by normalized digits column for speed
		if (digits) {
			db.get(
				"SELECT * FROM cadastros WHERE artigo_digits = ? ORDER BY id DESC LIMIT 1",
				[digits],
				(digitErr, digitRow) => {
					if (digitErr) {
						console.log("[DB] artigo_digits query error:", digitErr)
					} else if (digitRow) {
						console.log("[DB] artigo_digits exact match found:", {
							id: digitRow.id,
							artigo: digitRow.artigo,
						})
						return resolve(digitRow)
					}
					// continue with other strategies below
				},
			)
		}
		if (digits && variants.indexOf(digits) === -1) variants.push(digits)

		let idx = 0

		const tryNext = () => {
			console.log(
				"[DB] trying variant index",
				idx,
				"of",
				variants.length,
				"current variants:",
				variants,
			)
			if (idx >= variants.length) {
				// final fallback: try LIKE on digits if any
				if (digits) {
					db.get(
						"SELECT * FROM cadastros WHERE artigo LIKE ? ORDER BY id DESC LIMIT 1",
						[`%${digits}%`],
						(err2, row2) => {
							if (err2) {
								console.log("[DB] LIKE query error:", err2)
								return reject(err2)
							}
							console.log(
								"[DB] LIKE query result:",
								!!row2,
								row2 && { id: row2.id, artigo: row2.artigo },
							)
							return resolve(row2 || null)
						},
					)
					return
				}
				// If still not found, dump a few cadastros to help debugging
				db.all(
					"SELECT id, artigo FROM cadastros ORDER BY id DESC LIMIT 20",
					(dumpErr, rows) => {
						if (dumpErr) {
							console.log("[DB] error listing cadastros for debug:", dumpErr)
						} else {
							console.log("[DB] cadastros sample (latest 20):", rows)
						}
						return resolve(null)
					},
				)
			}

			const v = variants[idx++]
			db.get(
				"SELECT * FROM cadastros WHERE artigo = ? ORDER BY id DESC LIMIT 1",
				[v],
				(err, row) => {
					if (err) {
						console.log("[DB] exact query error for", v, err)
						return reject(err)
					}
					console.log("[DB] exact query for", v, "found:", !!row)
					if (row) {
						console.log(
							"[DB] exact query result row id:",
							row.id,
							"artigo:",
							row.artigo,
						)
						return resolve(row)
					}
					tryNext()
				},
			)
		}

		tryNext()
	})
}

export function findCadastro(artigo, componente) {
	return new Promise((resolve, reject) => {
		db.get(
			"SELECT * FROM cadastros WHERE artigo = ? AND LOWER(componente) = LOWER(?) ORDER BY id DESC LIMIT 1",
			[artigo, componente],
			(err, row) => {
				if (err) return reject(err)
				resolve(row || null)
			},
		)
	})
}

export function listCadastros(limit = 100) {
	return new Promise((resolve, reject) => {
		db.all(
			"SELECT * FROM cadastros ORDER BY id DESC LIMIT ?",
			[limit],
			(err, rows) => {
				if (err) return reject(err)
				resolve(rows || [])
			},
		)
	})
}

export function deleteCadastroById(id) {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM cadastros WHERE id = ?", [id], function (err) {
			if (err) return reject(err)
			resolve({ deleted: this.changes || 0 })
		})
	})
}

function runInsert(source, linha) {
	return new Promise((resolve, reject) => {
		const stmt = db.prepare(
			`INSERT INTO linhas (source, of_number, artigo, modelo, codigo_cor, grade, pares, especificacao, prioridade) VALUES (?,?,?,?,?,?,?,?,?)`,
		)
		stmt.run(
			source,
			linha.of,
			linha.artigo || null,
			linha.modelo || null,
			linha.codigoCor || null,
			linha.grade || null,
			linha.pares || null,
			linha.especificacaoTecnica || null,
			linha.prioridade || null,
			function (err) {
				if (err) return reject(err)
				resolve(this.lastID)
			},
		)
		stmt.finalize()
	})
}

export async function saveCTFLines(results) {
	// results: array of { of, linhas: [...] }
	const inserted = []
	for (const bloco of results) {
		for (const linha of bloco.linhas) {
			const id = await runInsert("ctf", linha)
			inserted.push(id)
		}
	}
	return inserted
}

export async function saveCTCLines(results) {
	const inserted = []
	for (const bloco of results) {
		for (const linha of bloco.linhas) {
			const id = await runInsert("ctc", linha)
			inserted.push(id)
		}
	}
	return inserted
}

export function getAllLines() {
	return new Promise((resolve, reject) => {
		db.all("SELECT * FROM linhas ORDER BY id DESC", (err, rows) => {
			if (err) return reject(err)
			resolve(rows)
		})
	})
}

export function getLinesByOf(ofNumber) {
	return new Promise((resolve, reject) => {
		db.all(
			"SELECT * FROM linhas WHERE of_number = ? ORDER BY id DESC",
			[ofNumber],
			(err, rows) => {
				if (err) return reject(err)
				resolve(rows)
			},
		)
	})
}

export function clearLines() {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM linhas", function (err) {
			if (err) return reject(err)
			resolve({ deleted: this.changes || 0 })
		})
	})
}
