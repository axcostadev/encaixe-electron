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

// Tipos de permissões do sistema
export type UserRole = "admin" | "editor" | "viewer"

export interface UserPermissions {
	canViewDashboard: boolean
	canViewModelos: boolean
	canEditModelos: boolean
	canViewCores: boolean
	canEditCores: boolean
	canViewMateriais: boolean
	canEditMateriais: boolean
	canViewComponentes: boolean
	canEditComponentes: boolean
	canViewEncaixe: boolean
	canCreateEncaixe: boolean
	canViewManual: boolean
	canEditManual: boolean
	canAccessSetup: boolean
	canManageUsers: boolean
}

// Permissões por role
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
	admin: {
		canViewDashboard: true,
		canViewModelos: true,
		canEditModelos: true,
		canViewCores: true,
		canEditCores: true,
		canViewMateriais: true,
		canEditMateriais: true,
		canViewComponentes: true,
		canEditComponentes: true,
		canViewEncaixe: true,
		canCreateEncaixe: true,
		canViewManual: true,
		canEditManual: true,
		canAccessSetup: true,
		canManageUsers: true,
	},
	editor: {
		canViewDashboard: true,
		canViewModelos: true,
		canEditModelos: true,
		canViewCores: true,
		canEditCores: true,
		canViewMateriais: true,
		canEditMateriais: true,
		canViewComponentes: true,
		canEditComponentes: true,
		canViewEncaixe: true,
		canCreateEncaixe: false,
		canViewManual: true,
		canEditManual: true,
		canAccessSetup: false,
		canManageUsers: false,
	},
	viewer: {
		canViewDashboard: false,
		canViewModelos: false,
		canEditModelos: false,
		canViewCores: false,
		canEditCores: false,
		canViewMateriais: false,
		canEditMateriais: false,
		canViewComponentes: false,
		canEditComponentes: false,
		canViewEncaixe: false,
		canCreateEncaixe: false,
		canViewManual: true,
		canEditManual: false,
		canAccessSetup: false,
		canManageUsers: false,
	},
}

export function initDatabase(): void {
	db = new sqlite3.Database(DB_FILE, (err) => {
		if (err) {
			console.error("Erro ao conectar ao banco de dados:", err)
		}
	})

	const database = db!

	// Criar tabela de usuários com role
	database.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			email TEXT,
			role TEXT DEFAULT 'viewer',
			active INTEGER DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	// Adicionar coluna role se não existir (migração)
	database.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'viewer'`, (err) => {
		if (err && !err.message.includes("duplicate column")) {
			// Ignora erro se coluna já existe
		}
	})

	// Adicionar coluna active se não existir (migração)
	database.run(`ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1`, (err) => {
		if (err && !err.message.includes("duplicate column")) {
			// Ignora erro se coluna já existe
		}
	})

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

	database.run(`
		CREATE TABLE IF NOT EXISTS componentes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			modelo_id INTEGER NOT NULL,
			modelo_cor_id INTEGER,
			setor_id INTEGER,
			numero_tecido TEXT DEFAULT '',
			nome TEXT NOT NULL,
			material_id INTEGER,
			tipo_tecido INTEGER,
			conjugacao_navalha INTERGER DEFAULT 1,
			placa_par INTEGER DEFAULT 1,
			camadas INTEGER DEFAULT 1,
			espacamento REAL,
			comp_maximo REAL,
			perc_perda REAL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (modelo_id) REFERENCES modelos(id),
			FOREIGN KEY (modelo_cor_id) REFERENCES modelo_cores(id),
			FOREIGN KEY (setor_id) REFERENCES setores(id),
			FOREIGN KEY (material_id) REFERENCES materiais(id)
		)
	`)

	// Criar tabela de cores associadas ao componente (cada cor como linha individual)
	database.run(`
		CREATE TABLE IF NOT EXISTS componente_cores (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			componente_id INTEGER NOT NULL,
			modelo_cor_id INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (componente_id) REFERENCES componentes(id),
			FOREIGN KEY (modelo_cor_id) REFERENCES modelo_cores(id)
		)
	`)

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

	// Criar tabela de Tamanhos (suporta intervalo com tamanho_inicial e tamanho_final)
	database.run(`
		CREATE TABLE IF NOT EXISTS tamanhos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			componente_id INTEGER NOT NULL,
			tamanho_inicial INTEGER,
			tamanho_final INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (componente_id) REFERENCES componentes(id)
		)
	`)

	// Criar usuário padrão se não existir (admin com todas permissões)
	database.run(
		"INSERT INTO users (username, password, email, role, active) VALUES (?, ?, ?, ?, ?)",
		["admin", "123456", "admin@example.com", "admin", 1],
		(err) => {
			if (err && !err.message.includes("UNIQUE constraint failed")) {
				console.error("Erro ao criar usuário padrão:", err)
			}
		},
	)

	// Atualizar admin existente para ter role admin
	database.run(
		"UPDATE users SET role = 'admin' WHERE username = 'admin' AND (role IS NULL OR role = '')",
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
