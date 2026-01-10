import { getDatabase } from "./db"
import type { UserRole, UserPermissions } from "./db"
import { ROLE_PERMISSIONS } from "./db"

interface User {
	id: number
	username: string
	email: string
	role: UserRole
	active: number
}

export interface LoginResult {
	success: boolean
	message: string
	user?: {
		id: number
		username: string
		email: string
		role: UserRole
		permissions: UserPermissions
	}
}

export interface UserListResult {
	success: boolean
	message: string
	users?: User[]
}

export function authenticateUser(
	username: string,
	password: string,
): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.get(
				"SELECT id, username, email, role, active FROM users WHERE username = ? AND password = ?",
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
						if (user.active === 0) {
							resolve({
								success: false,
								message: "Usuário desativado. Contate o administrador.",
							})
							return
						}
						
						const role = (user.role || "viewer") as UserRole
						resolve({
							success: true,
							message: "Login bem-sucedido",
							user: {
								id: user.id,
								username: user.username,
								email: user.email,
								role: role,
								permissions: ROLE_PERMISSIONS[role],
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
	role: UserRole = "viewer",
): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO users (username, password, email, role, active) VALUES (?, ?, ?, ?, ?)",
				[username, password, email, role, 1],
				function (this: { lastID?: number }, err: Error | null) {
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
							role,
							permissions: ROLE_PERMISSIONS[role],
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

export function updateUser(
	id: number,
	data: { username?: string; email?: string; password?: string; role?: UserRole; active?: number },
): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			const fields: string[] = []
			const values: (string | number)[] = []

			if (data.username) {
				fields.push("username = ?")
				values.push(data.username)
			}
			if (data.email) {
				fields.push("email = ?")
				values.push(data.email)
			}
			if (data.password) {
				fields.push("password = ?")
				values.push(data.password)
			}
			if (data.role) {
				fields.push("role = ?")
				values.push(data.role)
			}
			if (data.active !== undefined) {
				fields.push("active = ?")
				values.push(data.active)
			}

			if (fields.length === 0) {
				resolve({ success: false, message: "Nenhum campo para atualizar" })
				return
			}

			values.push(id)

			database.run(
				`UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
				values,
				function (this: { changes?: number }, err: Error | null) {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao atualizar usuário: " + err.message,
						})
						return
					}

					if (this.changes && this.changes > 0) {
						resolve({
							success: true,
							message: "Usuário atualizado com sucesso",
						})
					} else {
						resolve({
							success: false,
							message: "Usuário não encontrado",
						})
					}
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao atualizar usuário: " + String(error),
			})
		}
	})
}

export function deleteUser(id: number): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"DELETE FROM users WHERE id = ? AND username != 'admin'",
				[id],
				function (this: { changes?: number }, err: Error | null) {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao excluir usuário",
						})
						return
					}

					if (this.changes && this.changes > 0) {
						resolve({
							success: true,
							message: "Usuário excluído com sucesso",
						})
					} else {
						resolve({
							success: false,
							message: "Usuário não encontrado ou é o admin",
						})
					}
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao excluir usuário: " + String(error),
			})
		}
	})
}

export function listUsers(): Promise<UserListResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, username, email, role, active FROM users ORDER BY username",
				[],
				(err: Error | null, users: User[] | undefined) => {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao listar usuários",
						})
						return
					}

					resolve({
						success: true,
						message: "Usuários listados com sucesso",
						users: users || [],
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao listar usuários: " + String(error),
			})
		}
	})
}

export function resetAdminPassword(password: string): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"UPDATE users SET password = ? WHERE username = 'admin'",
				[password],
				function (this: { changes?: number }, err: Error | null) {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao resetar senha do admin",
						})
						return
					}

					if (this.changes && this.changes > 0) {
						resolve({
							success: true,
							message: "Senha do admin atualizada com sucesso",
						})
					} else {
						// admin não existe, criar
						database.run(
							"INSERT INTO users (username, password, email, role, active) VALUES (?, ?, ?, ?, ?)",
							["admin", password, "admin@example.com", "admin", 1],
							function (err2: Error | null) {
								if (err2) {
									resolve({
										success: false,
										message: "Erro ao criar usuário admin",
									})
									return
								}
								resolve({
									success: true,
									message: "Usuário admin criado com sucesso",
								})
							},
						)
					}
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao resetar senha do admin: " + String(error),
			})
		}
	})
}

export function getUserByUsername(username: string): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.get(
				"SELECT id, username, email, role, active FROM users WHERE username = ?",
				[username],
				(err: Error | null, user: User | undefined) => {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao conectar ao banco de dados",
						})
						return
					}

					if (user) {
						if (user.active === 0) {
							resolve({
								success: false,
								message: "Usuário desativado",
							})
							return
						}
						
						const role = (user.role || "viewer") as UserRole
						resolve({
							success: true,
							message: "Usuário encontrado",
							user: {
								id: user.id,
								username: user.username,
								email: user.email,
								role: role,
								permissions: ROLE_PERMISSIONS[role],
							},
						})
					} else {
						resolve({ success: false, message: "Usuário não encontrado" })
					}
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao buscar usuário: " + String(error),
			})
		}
	})
}
