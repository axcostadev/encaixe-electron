import fs from "fs"
import path from "path"
import sqlite3 from "sqlite3"

const DB_PATH = "C:\\Aincrad\\CuttingRoom"
const DB_FILE = path.join(DB_PATH, "app.db")

// Criar diretório se não existir
if (!fs.existsSync(DB_PATH)) {
	fs.mkdirSync(DB_PATH, { recursive: true })
}

let db: sqlite3.Database | undefined

interface User {
	id: number
	username: string
	email: string
}

export function initDatabase(): void {
	db = new sqlite3.Database(DB_FILE, (err) => {
		if (err) {
			console.error("Erro ao conectar ao banco de dados:", err)
		}
	})

	// Criar tabela de usuários
	db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			email TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Criar tabela de Modelos
	db.run(`
		CREATE TABLE IF NOT EXISTS modelos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			artigo TEXT UNIQUE NOT NULL,
			nome TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Criar tabela de Cores de Modelos
	db.run(`
		CREATE TABLE IF NOT EXISTS modelo_cores (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			modelo_id INTEGER NOT NULL,
			cor_abreviada TEXT NOT NULL,
			cor_completa TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (modelo_id) REFERENCES modelos(id)
		)
	`)

	// Criar tabela de Componentes
	db.run(`
		CREATE TABLE IF NOT EXISTS componentes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			modelo_id INTEGER NOT NULL,
			modelo_cor_id INTEGER NOT NULL,
			numero_tecido TEXT NOT NULL,
			nome TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (modelo_id) REFERENCES modelos(id),
			FOREIGN KEY (modelo_cor_id) REFERENCES modelo_cores(id)
		)
	`)

	// Criar tabela de Setores
	db.run(`
		CREATE TABLE IF NOT EXISTS setores (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nome TEXT UNIQUE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Criar tabela de Materiais
	db.run(`
		CREATE TABLE IF NOT EXISTS materiais (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			artigo TEXT NOT NULL,
			cor TEXT NOT NULL,
			espessura REAL,
			largura REAL,
			sentido_corte TEXT,
			conjugacao_navalha INTEGER,
			placa_par INTEGER,
			camadas INTEGER,
			espacamento REAL,
			setor_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (setor_id) REFERENCES setores(id)
		)
	`)

	// Criar tabela de Componente-Material
	db.run(`
		CREATE TABLE IF NOT EXISTS componente_materiais (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			componente_id INTEGER NOT NULL,
			material_id INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (componente_id) REFERENCES componentes(id),
			FOREIGN KEY (material_id) REFERENCES materiais(id)
		)
	`)

	// Criar tabela de Tamanhos
	db.run(`
		CREATE TABLE IF NOT EXISTS tamanhos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			componente_id INTEGER NOT NULL,
			tamanho TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (componente_id) REFERENCES componentes(id)
		)
	`)

	// Criar usuário padrão se não existir
	db.run(
		"INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
		["admin", "123456", "admin@example.com"],
		(err) => {
			if (err && !err.message.includes("UNIQUE constraint failed")) {
				console.error("Erro ao criar usuário padrão:", err)
			}
		},
	)
}

export function getDatabase(): sqlite3.Database {
	if (!db) {
		initDatabase()
	}
	return db!
}
 
// Tipos para modelos
export interface Modelo {
	id: number
	artigo: string
	nome: string
}

export interface ModeloCor {
	id: number
	modelo_id: number
	cor_abreviada: string
	cor_completa: string
}

// Funções CRUD para modelos e cores
export function listModelos(): Promise<Modelo[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, artigo, nome FROM modelos ORDER BY nome",
				[],
				(err: Error | null, rows: any[]) => {
					if (err) {
						console.error("Erro listando modelos:", err)
						resolve([])
						return
					}
					resolve(rows as Modelo[])
				},
			)
		} catch (error) {
			console.error(error)
			resolve([])
		}
	})
}

export function createModelo(artigo: string, nome: string): Promise<{ success: boolean; message: string; modelo?: Modelo }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO modelos (artigo, nome) VALUES (?, ?)",
				[artigo, nome],
				function (err: Error | null) {
					if (err) {
						if (err.message.includes("UNIQUE constraint failed")) {
							resolve({ success: false, message: "Artigo já existe" })
						} else {
							resolve({ success: false, message: "Erro ao criar modelo" })
						}
						return
					}

					resolve({
						success: true,
						message: "Modelo criado",
						modelo: { id: this.lastID as number, artigo, nome },
					})
				},
			)
		} catch (error) {
			resolve({ success: false, message: "Erro ao criar modelo" + error?.toString() })
		}
	})
}

export function updateModelo(id: number, artigo: string, nome: string): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"UPDATE modelos SET artigo = ?, nome = ? WHERE id = ?",
				[artigo, nome, id],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao atualizar modelo" })
						return
					}
					resolve({ success: true, message: "Modelo atualizado" })
				},
			)
		} catch (error) {
			resolve({ success: false, message: "Erro ao atualizar modelo" + error?.toString() })
		}
	})
}

export function deleteModelo(id: number): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			// primeiro deletar cores relacionadas (integridade)
			database.run("DELETE FROM modelo_cores WHERE modelo_id = ?", [id], (err) => {
				if (err) {
					console.error(err)
				}
				database.run("DELETE FROM modelos WHERE id = ?", [id], function (err2: Error | null) {
					if (err2) {
						resolve({ success: false, message: "Erro ao deletar modelo" })
						return
					}
					resolve({ success: true, message: "Modelo deletado" })
				})
			})
		} catch (error) {
			resolve({ success: false, message: "Erro ao deletar modelo" + error?.toString() })
		}
	})
}

export function listModeloCores(modelo_id: number): Promise<ModeloCor[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, modelo_id, cor_abreviada, cor_completa FROM modelo_cores WHERE modelo_id = ? ORDER BY cor_abreviada",
				[modelo_id],
				(err: Error | null, rows: any[]) => {
					if (err) {
						console.error("Erro listando cores:", err)
						resolve([])
						return
					}
					resolve(rows as ModeloCor[])
				},
			)
		} catch (error) {
			console.error(error)
			resolve([])
		}
	})
}

export function addModeloCor(modelo_id: number, cor_abreviada: string, cor_completa: string): Promise<{ success: boolean; message: string; cor?: ModeloCor }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO modelo_cores (modelo_id, cor_abreviada, cor_completa) VALUES (?, ?, ?)",
				[modelo_id, cor_abreviada, cor_completa],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao adicionar cor" })
						return
					}
					resolve({ success: true, message: "Cor adicionada", cor: { id: this.lastID as number, modelo_id, cor_abreviada, cor_completa } })
				},
			)
		} catch (error) {
			resolve({ success: false, message: "Erro ao adicionar cor" + error?.toString() })
		}
	})
}

export function deleteModeloCor(id: number): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run("DELETE FROM modelo_cores WHERE id = ?", [id], function (err: Error | null) {
				if (err) {
					resolve({ success: false, message: "Erro ao deletar cor" })
					return
				}
				resolve({ success: true, message: "Cor deletada" })
			})
		} catch (error) {
			resolve({ success: false, message: "Erro ao deletar cor" + error?.toString() })
		}
	})
}

export interface LoginResult {
	success: boolean
	message: string
	user?: {
		id: number
		username: string
		email: string
	}
}

export function authenticateUser(
	username: string,
	password: string,
): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.get(
				"SELECT id, username, email FROM users WHERE username = ? AND password = ?",
				[username, password],
				(err: Error | null, user: User | undefined) => {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao conectar ao banco de dados",
						})
						return
					}

					if (user) {
						resolve({
							success: true,
							message: "Login bem-sucedido",
							user: {
								id: user.id,
								username: user.username,
								email: user.email,
							},
						})
					} else {
						resolve({
							success: false,
							message: "Usuário ou senha inválidos",
						})
					}
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao conectar ao banco de dados " + error?.toString(),
			})
		}
	})
}

export function createUser(
	username: string,
	password: string,
	email: string,
): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
				[username, password, email],
				function (err: Error | null) {
					if (err) {
						if (err.message.includes("UNIQUE constraint failed")) {
							resolve({
								success: false,
								message: "Usuário já existe",
							})
						} else {
							resolve({
								success: false,
								message: "Erro ao criar usuário",
							})
						}
						return
					}

					resolve({
						success: true,
						message: "Usuário criado com sucesso",
						user: {
							id: this.lastID as number,
							username,
							email,
						},
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao criar usuário" + error?.toString(),
			})
		}
	})
}

export function closeDatabase(): void {
	if (db) {
		db.close((err) => {
			if (err) {
				console.error("Erro ao fechar banco de dados:", err)
			}
		})
	}
}
