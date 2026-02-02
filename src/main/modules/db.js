import path from "path"
import fs from "fs"
import sqlite3 from "sqlite3"
import { fileURLToPath } from "url"
import { app } from "electron"
import { getDatabaseFilePath } from "../settings.js"

// Evita erros de "database is locked" aguardando até 5s antes de falhar
sqlite3.configure?.("busyTimeout", 5000)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Use configurable DB path: prefer environment variable ECONOMIA_DB_FILE, otherwise fall back to settings or default
function getDbFile() {
	// Primeiro verifica se há override via ENV
	if (process.env.ECONOMIA_DB_FILE) return process.env.ECONOMIA_DB_FILE
	// Usa o caminho configurado pelo usuário
	try {
		return getDatabaseFilePath()
	} catch (e) {
		console.error('[DB] Erro ao obter caminho do DB das configurações:', e)
	}
	// Fallback para caminho padrão apenas se não conseguir ler as configurações
	return path.join('C:', 'Aincrad', 'CuttingRoom', 'app.db')
}

let db

function ensureDirExistsFor(dbPath) {
	const dir = path.dirname(dbPath)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function initDB() {
	return new Promise((resolve, reject) => {
		// Já inicializado
		if (db) return resolve()
		let DB_FILE = getDbFile()



		ensureDirExistsFor(DB_FILE)
		const exists = fs.existsSync(DB_FILE)
		console.log("[DB] using economia DB file at:", DB_FILE)
		db = new sqlite3.Database(DB_FILE, (err) => {
			if (err) return reject(err)
			// Define busy_timeout dentro do próprio DB para reforçar
			db.run("PRAGMA busy_timeout = 5000")
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
											// Ensure economia table exists for economia dashboard
											db.run(
												`CREATE TABLE IF NOT EXISTS economia (
													id INTEGER PRIMARY KEY AUTOINCREMENT,
													data DATETIME,
													artigo TEXT,
													ordem INTEGER,
													modelo TEXT,
													material TEXT,
													cor_espessura TEXT,
													preco REAL,
													previsto REAL,
													encaixe REAL,
													dif REAL,
													porcent REAL
												)`,
												(errEconomia) => {
													if (errEconomia) console.log('[DB] error creating economia table:', errEconomia)
													return resolve()
												}
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

// ==================== Economia table handlers ====================

export function saveEconomiaRows(rows) {
	return new Promise((resolve, reject) => {
		try {
			const stmt = db.prepare(
						`INSERT INTO economia (data, artigo, ordem, modelo, material, cor_espessura, preco, previsto, encaixe, dif, porcent, header_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`				)
			db.serialize(() => {
				for (const r of rows) {
					const data = r.Data ? new Date(r.Data).toISOString() : null
					const artigo = r.Artigo || r.artigo || null
					const ordem = r.Ordem || r.ordem || null
					const modelo = r.Modelo || r.modelo || null
					const material = r.Material || r.material || null
					const cor_espessura = r["Cor/Espessura"] || r.Cor || null
					const preco = r["PREÇO"] || r.PRECO || r.preco || null
					const previsto = r.Previsto || r.previsto || null
					const encaixe = r.Encaixe || r.encaixe || null
					const dif = r.Dif || r.dif || null
					const porcent = r["%"] || r.Porcent || r.porcent || null

					stmt.run([
						data,
						artigo,
						ordem,
						modelo,
						material,
						cor_espessura,
						preco,
						previsto,
						encaixe,
						dif,
						porcent,
						r.header_id || r.HeaderId || r.headerId || null,
					])
				}

				stmt.finalize((err) => {
					if (err) return reject(err)
					resolve({ inserted: rows.length })
				})
			})
		} catch (e) {
			reject(e)
		}
	})
}


// Insert a header record and return its id
export function insertEconomiaHeader(h) {
	return new Promise((resolve, reject) => {
		try {
			const sql = `INSERT INTO economia_headers (data_fase, modelo, artigo, data, periodo) VALUES (?,?,?,?,?)`
			db.run(sql, [h.dataFase || h.data_fase || null, h.modelo || null, h.artigo || h.artigo || null, h.data || null, h.periodo || null], function(err) {
				if (err) return reject(err)
				resolve({ inserted: this.lastID, id: this.lastID })
			})
		} catch (e) { reject(e) }
	})
}

/**
 * Inserir ou atualizar uma linha da tabela `economia` com o valor de encaixe.
 * Procura por combinação (ordem, material, previsto, preco) e faz UPDATE; se não
 * encontrar, faz INSERT. Retorna { id, dif, porcent, inserted?, updated? }.
 */
export function upsertEconomiaRow(r) {
	return new Promise((resolve, reject) => {
		try {
			console.log('[DB] upsertEconomiaRow called with', JSON.stringify(r))
			const ordem = r.Ordem || r.ordem || null
			const material = r.Material || r.material || null
			const preco = Number(r['PREÇO'] || r.PRECO || r.preco || 0)
			const previsto = Number(r.Previsto || r.previsto || 0)
			const encaixe = Number(r.Encaixe || r.encaixe || 0)

			const dif = isFinite(encaixe) && isFinite(previsto) ? (encaixe - previsto) : null
			const porcent = previsto && previsto !== 0 && dif != null ? (dif / previsto) : null

			db.get(
			`SELECT id FROM economia WHERE ordem = ? AND material = ? AND ABS(COALESCE(previsto,0) - ?) < 0.0001 AND ABS(COALESCE(preco,0) - ?) < 0.0001 AND COALESCE(cor_espessura,'') = ? LIMIT 1`,
			[ordem, material, previsto, preco, (r['Cor/Espessura'] || r.cor_espessura || '')],
				(err, row) => {
					if (err) {
						console.error('[DB] upsert SELECT error:', err)
						return reject(err)
					}

					if (row && row.id) {
						console.log('[DB] found existing row id', row.id, ' — updating')
						db.run(
							`UPDATE economia SET encaixe = ?, dif = ?, porcent = ? WHERE id = ?`,
							[encaixe, dif, porcent, row.id],
							function (uErr) {
								if (uErr) {
									console.error('[DB] upsert UPDATE error:', uErr)
									return reject(uErr)
								}
								console.log('[DB] updated row id', row.id)
								resolve({ updated: row.id, id: row.id, dif, porcent })
							},
						)
					} else {
						console.log('[DB] no existing row found — inserting new')
						const stmt = db.prepare(
							`INSERT INTO economia (data, artigo, ordem, modelo, material, cor_espessura, preco, previsto, encaixe, dif, porcent, header_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
						)
						const data = r.Data ? new Date(r.Data).toISOString() : null
						stmt.run(
							data,
							r.Artigo || r.artigo || null,
							ordem,
							r.Modelo || r.modelo || null,
							material,
							r['Cor/Espessura'] || r.cor_espessura || null,
							preco,
							previsto,
							encaixe,
							dif,
							porcent,
							r.header_id || r.HeaderId || r.headerId || null,

							function (iErr) {
								if (iErr) {
									console.error('[DB] upsert INSERT error:', iErr)
									return reject(iErr)
								}
								console.log('[DB] inserted new row id', this.lastID)
								resolve({ inserted: this.lastID, id: this.lastID, dif, porcent })
							},
						)
						stmt.finalize()
					}
				},
			)
		} catch (e) {
			console.error('[DB] upsert exception', e)
			reject(e)
		}
	})
}

/**
 * Atualiza uma linha `economia` pelo id — usado pela UI do Banco de Dados
 */
export function updateEconomiaRowById(id, fields) {
	return new Promise((resolve, reject) => {
		if (!id) return reject(new Error('id is required'))
		const allowed = ['encaixe', 'preco', 'previsto', 'dif', 'porcent', 'modelo', 'material', 'ordem', 'data', 'artigo', 'cor_espessura']
		const sets = []
		const vals = []
		Object.keys(fields || {}).forEach(k => {
			if (allowed.includes(k)) {
				sets.push(`${k} = ?`)
				vals.push(fields[k])
			}
		})
		if (sets.length === 0) return resolve({ updated: 0 })
		vals.push(id)
		db.run(`UPDATE economia SET ${sets.join(', ')} WHERE id = ?`, vals, function(err) {
			if (err) return reject(err)
			resolve({ updated: this.changes || 0 })
		})
	})
}

/**
 * Deleta várias linhas pelo id
 */
export function deleteEconomiaRows(ids) {
	return new Promise((resolve, reject) => {
		if (!Array.isArray(ids) || ids.length === 0) return resolve({ deleted: 0 })
		const placeholders = ids.map(()=>'?').join(',')
		db.run(`DELETE FROM economia WHERE id IN (${placeholders})`, ids, function(err) {
			if (err) return reject(err)
			resolve({ deleted: this.changes || 0 })
		})
	})
}

export function listEconomia(limit = 500) {
	return new Promise((resolve, reject) => {
		// join with headers to include header info if present
		db.all("SELECT e.*, h.data_fase as header_data_fase, h.modelo as header_modelo, h.artigo as header_artigo, h.data as header_data, h.periodo as header_periodo FROM economia e LEFT JOIN economia_headers h ON e.header_id = h.id ORDER BY e.id DESC LIMIT ?", [limit], (err, rows) => {
			if (err) return reject(err)
			resolve(rows || [])
		})
	})
}

export function clearEconomia() {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM economia", function (err) {
			if (err) return reject(err)
			resolve({ deleted: this.changes || 0 })
		})
	})
}

export function getEconomiaSummary() {
	return new Promise((resolve, reject) => {
		db.get(
			"SELECT SUM(dif) as totalDif, COUNT(DISTINCT ordem) as ordemCount, AVG(dif) as avgDif FROM economia",
			(err, row) => {
				if (err) return reject(err)
				resolve(row || { totalDif: 0, ordemCount: 0, avgDif: 0 })
			},
		)
	})
}

export function getEconomiaByModelo(limit = 10) {
	return new Promise((resolve, reject) => {
		db.all(
			"SELECT modelo as name, SUM(dif) as total FROM economia GROUP BY modelo ORDER BY total ASC LIMIT ?",
			[limit],
			(err, rows) => {
				if (err) return reject(err)
				resolve(rows || [])
			},
		)
	})
}

export function getEconomiaByMaterial(limit = 10) {
	return new Promise((resolve, reject) => {
		db.all(
			"SELECT material as name, SUM(dif) as total FROM economia GROUP BY material ORDER BY total ASC LIMIT ?",
			[limit],
			(err, rows) => {
				if (err) return reject(err)
				resolve(rows || [])
			},
		)
	})
}

// Previously this module ran header setup at load time which caused errors when `db` was not initialized.
// Now `ensureEconomiaHeaders()` is provided as an exported function and should be called after `initDB()` completes.

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

// Ensure economia_headers table exists and economia has header_id column (call after DB init)
export function ensureEconomiaHeaders() {
	return new Promise((resolve, reject) => {
		if (!db) return resolve()
		db.run(`CREATE TABLE IF NOT EXISTS economia_headers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			data_fase TEXT,
			modelo TEXT,
			artigo TEXT,
			data TEXT,
			periodo TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`, (err) => {
			if (err) {
				console.error('[DB] error creating economia_headers table:', err)
				return resolve()
			}
			db.all('PRAGMA table_info(economia)', [], (pErr, cols) => {
				// helper: ensure economia_headers has 'artigo' column (for older DBs)
				const ensureHeadersTable = () => {
					db.all('PRAGMA table_info(economia_headers)', [], (hErr, hcols) => {
						if (hErr) {
							console.error('[DB] error reading economia_headers table info:', hErr)
							return resolve()
						}
						const hasArtigo = Array.isArray(hcols) && !!hcols.find(c => c.name === 'artigo')
						if (!hasArtigo) {
							console.log('[DB] migrating: adding artigo column to economia_headers')
							db.run('ALTER TABLE economia_headers ADD COLUMN artigo TEXT', (altErr) => {
								if (altErr) console.error('[DB] error adding artigo column to economia_headers:', altErr)
								else console.log('[DB] artigo column added to economia_headers')
								return resolve()
							})
						} else {
							return resolve()
						}
					})
				}

				if (!pErr && Array.isArray(cols) && !cols.find(c => c.name === 'header_id')) {
					db.run('ALTER TABLE economia ADD COLUMN header_id INTEGER', (aErr) => {
						if (aErr) console.error('[DB] error adding header_id column to economia:', aErr)
						// after altering economia, ensure header table columns
					ensureHeadersTable()
					})
				} else {
					// header_id exists, just ensure header table columns
					ensureHeadersTable()
				}
			})
		})
	})
}

// Allow re-init and close for economia DB
export function closeDB() {
	if (db) {
		db.close((err) => {
			if (err) console.error('[DB] error closing economia DB:', err)
		})
		db = undefined
	}
}

export async function reinitDB(newPath) {
	try {
		// Se um novo caminho foi fornecido, define via ENV para que initDB use
		if (newPath) {
			process.env.ECONOMIA_DB_FILE = newPath
			console.log('[DB] reinitDB: aplicando novo caminho do DB:', newPath)
		}
		closeDB()
		// wait for new init
		await initDB()
		// ensure headers exist after init
		await ensureEconomiaHeaders()
		console.log('[DB] economia DB reinitialized')
		return { success: true }
	} catch (err) {
		console.error('[DB] error reinitializing economia DB:', err)
		return { success: false, message: String(err) }
	}
}
// Return the currently used economia DB file path
export function getCurrentDbFile() {
	try {
		return getDbFile()
	} catch (err) {
		console.error('[DB] error getting current economia DB file:', err)
		return null
	}
}