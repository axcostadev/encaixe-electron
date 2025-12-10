import fs from "fs"
import path from "path"
import sqlite3 from "sqlite3"

const DB_PATH = path.join("C:", "Aincrad", "CuttingRoom")
const DB_FILE = path.join(DB_PATH, "app.db")

// Criar diretório se não existir
if (!fs.existsSync(DB_PATH)) {
	fs.mkdirSync(DB_PATH, { recursive: true })
}

let db: sqlite3.Database | undefined

export function initDatabase(): void {
	db = new sqlite3.Database(DB_FILE, (err) => {
		if (err) {
			console.error("Erro ao conectar ao banco de dados:", err)
		}
	})

	const database = db!

	// Criar tabela de usuários
	database.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			email TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Criar tabela de Modelos
	database.run(`
		CREATE TABLE IF NOT EXISTS modelos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			artigo TEXT UNIQUE NOT NULL,
			nome TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Criar tabela de Cores de Modelos
	database.run(`
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
	database.run(`
		CREATE TABLE IF NOT EXISTS componentes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			modelo_id INTEGER NOT NULL,
			modelo_cor_id INTEGER NOT NULL,
			numero_tecido TEXT NOT NULL,
			nome TEXT NOT NULL,
			-- Dados extras (json) para armazenar campos do formulário
			dados TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (modelo_id) REFERENCES modelos(id),
			FOREIGN KEY (modelo_cor_id) REFERENCES modelo_cores(id)
		)
	`)

	// Garantir que a coluna `dados` exista (em bancos antigos)
	// Usa PRAGMA table_info para checar existência da coluna antes de executar ALTER TABLE
	database.all(
		"PRAGMA table_info(componentes)",
		(err: Error | null, rows?: { name: string }[]) => {
			if (err) {
				// se houver erro ao consultar, logamos e não tentamos alterar
				console.error("Erro verificando estrutura de componentes:", err)
				return
			}

			const hasDados = (rows || []).some((r) => r.name === "dados")
			if (hasDados) return

			database.run(
				`ALTER TABLE componentes ADD COLUMN dados TEXT`,
				(alterErr: Error | null) => {
					if (alterErr) {
						// Ignorar se for coluna duplicada (concorrência) ou logar outros erros
						if (!String(alterErr.message).toLowerCase().includes("duplicate")) {
							console.error(
								"Erro ao adicionar coluna 'dados' na tabela componentes:",
								alterErr,
							)
						}
					}
				},
			)
		},
	)

	// Criar tabela de Setores
	database.run(`
		CREATE TABLE IF NOT EXISTS setores (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nome TEXT UNIQUE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Criar tabela de Materiais
	database.run(`
		CREATE TABLE IF NOT EXISTS materiais (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			artigo TEXT NOT NULL,
			largura REAL NOT NULL,
			obs TEXT,
			sentido TEXT NOT NULL DEFAULT 'S',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Criar tabela de Componente-Material
	database.run(`
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
	database.run(`
		CREATE TABLE IF NOT EXISTS tamanhos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			componente_id INTEGER NOT NULL,
			tamanho TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (componente_id) REFERENCES componentes(id)
		)
	`)

	// Criar usuário padrão se não existir
	database.run(
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

export function closeDatabase(): void {
	if (db) {
		db.close((err) => {
			if (err) {
				console.error("Erro ao fechar banco de dados:", err)
			}
		})
	}
}
