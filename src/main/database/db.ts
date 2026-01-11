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
export type UserRole = string // Agora é dinâmico

export interface UserPermissions {
	canViewDashboard: boolean
	canViewModelos: boolean
	canEditModelos: boolean
	canDeleteModelos: boolean
	canViewCores: boolean
	canEditCores: boolean
	canDeleteCores: boolean
	canViewMateriais: boolean
	canEditMateriais: boolean
	canDeleteMateriais: boolean
	canViewComponentes: boolean
	canEditComponentes: boolean
	canDeleteComponentes: boolean
	canViewSetores: boolean
	canEditSetores: boolean
	canDeleteSetores: boolean
	canViewEncaixe: boolean
	canCreateEncaixe: boolean
	canViewManual: boolean
	canEditManual: boolean
	canViewEconomia: boolean
	canAccessSetup: boolean
	canManageUsers: boolean
	canManageRoles: boolean
}

// Interface para Role armazenado no banco
export interface Role {
	id: number
	name: string
	displayName: string
	description: string
	permissions: UserPermissions
	isSystem: boolean
	created_at?: string
}

// Permissões padrão (fallback para roles do sistema)
export const DEFAULT_PERMISSIONS: UserPermissions = {
	canViewDashboard: false,
	canViewModelos: false,
	canEditModelos: false,
	canDeleteModelos: false,
	canViewCores: false,
	canEditCores: false,
	canDeleteCores: false,
	canViewMateriais: false,
	canEditMateriais: false,
	canDeleteMateriais: false,
	canViewComponentes: false,
	canEditComponentes: false,
	canDeleteComponentes: false,
	canViewSetores: false,
	canEditSetores: false,
	canDeleteSetores: false,
	canViewEncaixe: false,
	canCreateEncaixe: false,
	canViewManual: false,
	canEditManual: false,
	canViewEconomia: false,
	canAccessSetup: false,
	canManageUsers: false,
	canManageRoles: false,
}

// Roles padrão do sistema (serão inseridos no banco se não existirem)
export const SYSTEM_ROLES: Omit<Role, "id" | "created_at">[] = [
	{
		name: "admin",
		displayName: "Administrador",
		description: "Acesso total ao sistema",
		isSystem: true,
		permissions: {
			canViewDashboard: true,
			canViewModelos: true,
			canEditModelos: true,
			canDeleteModelos: true,
			canViewCores: true,
			canEditCores: true,
			canDeleteCores: true,
			canViewMateriais: true,
			canEditMateriais: true,
			canDeleteMateriais: true,
			canViewComponentes: true,
			canEditComponentes: true,
			canDeleteComponentes: true,
			canViewSetores: true,
			canEditSetores: true,
			canDeleteSetores: true,
			canViewEncaixe: true,
			canCreateEncaixe: true,
			canViewManual: true,
			canEditManual: true,
			canViewEconomia: true,
			canAccessSetup: true,
			canManageUsers: true,
			canManageRoles: true,
		},
	},
	{
		name: "editor",
		displayName: "Editor",
		description: "Pode visualizar e editar dados",
		isSystem: true,
		permissions: {
			canViewDashboard: true,
			canViewModelos: true,
			canEditModelos: true,
			canDeleteModelos: false,
			canViewCores: true,
			canEditCores: true,
			canDeleteCores: false,
			canViewMateriais: true,
			canEditMateriais: true,
			canDeleteMateriais: false,
			canViewComponentes: true,
			canEditComponentes: true,
			canDeleteComponentes: false,
			canViewSetores: true,
			canEditSetores: true,
			canDeleteSetores: false,
			canViewEncaixe: true,
			canCreateEncaixe: false,
			canViewManual: true,
			canEditManual: true,
			canViewEconomia: true,
			canAccessSetup: false,
			canManageUsers: false,
			canManageRoles: false,
		},
	},
	{
		name: "viewer",
		displayName: "Visualizador",
		description: "Apenas visualização limitada",
		isSystem: true,
		permissions: {
			canViewDashboard: false,
			canViewModelos: false,
			canEditModelos: false,
			canDeleteModelos: false,
			canViewCores: false,
			canEditCores: false,
			canDeleteCores: false,
			canViewMateriais: false,
			canEditMateriais: false,
			canDeleteMateriais: false,
			canViewComponentes: false,
			canEditComponentes: false,
			canDeleteComponentes: false,
			canViewSetores: false,
			canEditSetores: false,
			canDeleteSetores: false,
			canViewEncaixe: false,
			canCreateEncaixe: false,
			canViewManual: true,
			canEditManual: false,
			canViewEconomia: false,
			canAccessSetup: false,
			canManageUsers: false,
			canManageRoles: false,
		},
	},
]

// Cache de roles em memória para performance
let rolesCache: Role[] | null = null

// Função para buscar permissões por nome do role
export function getRolePermissions(roleName: string): UserPermissions {
	if (rolesCache) {
		const role = rolesCache.find(r => r.name === roleName)
		if (role) return role.permissions
	}
	// Fallback para roles do sistema
	const systemRole = SYSTEM_ROLES.find(r => r.name === roleName)
	if (systemRole) return systemRole.permissions
	return DEFAULT_PERMISSIONS
}

// Compatibilidade com código legado
export const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
	admin: SYSTEM_ROLES.find(r => r.name === "admin")!.permissions,
	editor: SYSTEM_ROLES.find(r => r.name === "editor")!.permissions,
	viewer: SYSTEM_ROLES.find(r => r.name === "viewer")!.permissions,
}

// Funções para atualizar o cache
export function updateRolesCache(roles: Role[]): void {
	rolesCache = roles
	// Atualiza também o ROLE_PERMISSIONS para compatibilidade
	roles.forEach(role => {
		ROLE_PERMISSIONS[role.name] = role.permissions
	})
}

export function clearRolesCache(): void {
	rolesCache = null
}

export function initDatabase(): void {
	db = new sqlite3.Database(DB_FILE, (err) => {
		if (err) {
			console.error("Erro ao conectar ao banco de dados:", err)
		}
	})

	const database = db!

	// Usar serialize para garantir que as operações executem em ordem
	database.serialize(() => {
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

		// Adicionar coluna role se não existir (migração para bancos antigos)
		database.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'viewer'`, (err) => {
			if (err && !err.message.includes("duplicate column")) {
				// Ignora erro se coluna já existe
			}
		})

		// Adicionar coluna active se não existir (migração para bancos antigos)
		database.run(`ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1`, (err) => {
			if (err && !err.message.includes("duplicate column")) {
				// Ignora erro se coluna já existe
			}
		})

		// Criar tabela de roles (papéis de permissão)
		database.run(`
			CREATE TABLE IF NOT EXISTS roles (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT UNIQUE NOT NULL,
				display_name TEXT NOT NULL,
				description TEXT,
				permissions TEXT NOT NULL,
				is_system INTEGER DEFAULT 0,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`, (err) => {
			if (err) {
				console.error("Erro ao criar tabela roles:", err)
			} else {
				// Inserir roles padrão do sistema se não existirem
				SYSTEM_ROLES.forEach(role => {
					database.run(
						`INSERT OR IGNORE INTO roles (name, display_name, description, permissions, is_system) VALUES (?, ?, ?, ?, ?)`,
						[role.name, role.displayName, role.description, JSON.stringify(role.permissions), 1],
						(insertErr) => {
							if (insertErr && !insertErr.message.includes("UNIQUE")) {
								console.error(`Erro ao inserir role ${role.name}:`, insertErr)
							}
						}
					)
				})

				// Migração: Atualizar roles do sistema existentes com novas permissões
				SYSTEM_ROLES.forEach(role => {
					database.run(
						`UPDATE roles SET permissions = ? WHERE name = ? AND is_system = 1`,
						[JSON.stringify(role.permissions), role.name],
						(updateErr) => {
							if (updateErr) {
								console.error(`Erro ao atualizar role ${role.name}:`, updateErr)
							}
						}
					)
				})
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
			apelido TEXT DEFAULT '',
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

	// Migração para adicionar a coluna 'apelido' se ela não existir.
	database.run(`ALTER TABLE componentes ADD COLUMN apelido TEXT DEFAULT ''`, (err) => {
		if (err && !err.message.includes("duplicate column")) {
			console.error("Erro ao adicionar coluna 'apelido' em 'componentes':", err)
		}
	})

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

	// Garantir que admin sempre tenha role 'admin' (corrige bancos existentes)
	database.run(
		"UPDATE users SET role = 'admin' WHERE username = 'admin'",
	)

	}) // Fim do serialize
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
