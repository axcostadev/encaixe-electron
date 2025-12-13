import { getDatabase, updateRolesCache, clearRolesCache, getRolePermissions, SYSTEM_ROLES } from "./db"
import type { Role, UserPermissions } from "./db"

interface RoleRow {
	id: number
	name: string
	display_name: string
	description: string
	permissions: string
	is_system: number
	created_at: string
}

export interface RoleListResult {
	success: boolean
	message: string
	roles?: Role[]
}

export interface RoleSingleResult {
	success: boolean
	message: string
	role?: Role
}

// Converter row do banco para objeto Role
function rowToRole(row: RoleRow): Role {
	return {
		id: row.id,
		name: row.name,
		displayName: row.display_name,
		description: row.description || "",
		permissions: JSON.parse(row.permissions) as UserPermissions,
		isSystem: row.is_system === 1,
		created_at: row.created_at,
	}
}

// Listar todos os roles
export function listRoles(): Promise<RoleListResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT * FROM roles ORDER BY is_system DESC, display_name ASC",
				[],
				(err: Error | null, rows: RoleRow[]) => {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao listar papéis: " + err.message,
						})
						return
					}

					const roles = (rows || []).map(rowToRole)
					updateRolesCache(roles)
					resolve({
						success: true,
						message: "Papéis listados com sucesso",
						roles,
					})
				}
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao listar papéis: " + error?.toString(),
			})
		}
	})
}

// Buscar role por ID
export function getRoleById(id: number): Promise<RoleSingleResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.get(
				"SELECT * FROM roles WHERE id = ?",
				[id],
				(err: Error | null, row: RoleRow | undefined) => {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao buscar papel: " + err.message,
						})
						return
					}

					if (!row) {
						resolve({
							success: false,
							message: "Papel não encontrado",
						})
						return
					}

					resolve({
						success: true,
						message: "Papel encontrado",
						role: rowToRole(row),
					})
				}
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao buscar papel: " + error?.toString(),
			})
		}
	})
}

// Buscar role por nome
export function getRoleByName(name: string): Promise<RoleSingleResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.get(
				"SELECT * FROM roles WHERE name = ?",
				[name],
				(err: Error | null, row: RoleRow | undefined) => {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao buscar papel: " + err.message,
						})
						return
					}

					if (!row) {
						// Fallback para roles do sistema se não encontrado no banco
						const systemRole = SYSTEM_ROLES.find(r => r.name === name)
						if (systemRole) {
							resolve({
								success: true,
								message: "Papel do sistema",
								role: {
									id: 0,
									...systemRole,
								},
							})
							return
						}
						resolve({
							success: false,
							message: "Papel não encontrado",
						})
						return
					}

					resolve({
						success: true,
						message: "Papel encontrado",
						role: rowToRole(row),
					})
				}
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao buscar papel: " + error?.toString(),
			})
		}
	})
}

// Criar novo role
export function createRole(
	name: string,
	displayName: string,
	description: string,
	permissions: UserPermissions
): Promise<RoleSingleResult> {
	return new Promise((resolve) => {
		try {
			// Validar nome (slug-like)
			const slugRegex = /^[a-z0-9_-]+$/
			if (!slugRegex.test(name)) {
				resolve({
					success: false,
					message: "Nome do papel deve conter apenas letras minúsculas, números, hífens e underscores",
				})
				return
			}

			// Nomes reservados
			const reserved = ["admin", "editor", "viewer"]
			if (reserved.includes(name.toLowerCase())) {
				resolve({
					success: false,
					message: "Este nome é reservado para papéis do sistema",
				})
				return
			}

			const database = getDatabase()
			database.run(
				`INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES (?, ?, ?, ?, 0)`,
				[name, displayName, description, JSON.stringify(permissions)],
				function (this: { lastID?: number }, err: Error | null) {
					if (err) {
						if (err.message.includes("UNIQUE constraint failed")) {
							resolve({
								success: false,
								message: "Já existe um papel com este nome",
							})
						} else {
							resolve({
								success: false,
								message: "Erro ao criar papel: " + err.message,
							})
						}
						return
					}

					clearRolesCache()
					resolve({
						success: true,
						message: "Papel criado com sucesso",
						role: {
							id: this.lastID as number,
							name,
							displayName,
							description,
							permissions,
							isSystem: false,
						},
					})
				}
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao criar papel: " + error?.toString(),
			})
		}
	})
}

// Atualizar role
export function updateRole(
	id: number,
	data: {
		displayName?: string
		description?: string
		permissions?: UserPermissions
	}
): Promise<RoleSingleResult> {
	return new Promise(async (resolve) => {
		try {
			// Verificar se é role do sistema
			const existing = await getRoleById(id)
			if (!existing.success || !existing.role) {
				resolve({
					success: false,
					message: "Papel não encontrado",
				})
				return
			}

			// Não permitir alterar nome de roles do sistema
			// Mas permitir alterar permissões (exceto admin)
			if (existing.role.isSystem && existing.role.name === "admin") {
				// Admin não pode ter permissões reduzidas
				resolve({
					success: false,
					message: "O papel Administrador não pode ser modificado",
				})
				return
			}

			const database = getDatabase()
			const fields: string[] = []
			const values: (string | number)[] = []

			if (data.displayName) {
				fields.push("display_name = ?")
				values.push(data.displayName)
			}
			if (data.description !== undefined) {
				fields.push("description = ?")
				values.push(data.description)
			}
			if (data.permissions) {
				fields.push("permissions = ?")
				values.push(JSON.stringify(data.permissions))
			}

			if (fields.length === 0) {
				resolve({ success: false, message: "Nenhum campo para atualizar" })
				return
			}

			values.push(id)

			database.run(
				`UPDATE roles SET ${fields.join(", ")} WHERE id = ?`,
				values,
				function (this: { changes?: number }, err: Error | null) {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao atualizar papel: " + err.message,
						})
						return
					}

					if (this.changes && this.changes > 0) {
						clearRolesCache()
						resolve({
							success: true,
							message: "Papel atualizado com sucesso",
						})
					} else {
						resolve({
							success: false,
							message: "Papel não encontrado",
						})
					}
				}
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao atualizar papel: " + error?.toString(),
			})
		}
	})
}

// Deletar role
export function deleteRole(id: number): Promise<{ success: boolean; message: string }> {
	return new Promise(async (resolve) => {
		try {
			// Verificar se é role do sistema
			const existing = await getRoleById(id)
			if (!existing.success || !existing.role) {
				resolve({
					success: false,
					message: "Papel não encontrado",
				})
				return
			}

			if (existing.role.isSystem) {
				resolve({
					success: false,
					message: "Não é possível deletar papéis do sistema",
				})
				return
			}

			// Verificar se há usuários usando este role
			const database = getDatabase()
			database.get(
				"SELECT COUNT(*) as count FROM users WHERE role = ?",
				[existing.role.name],
				(countErr: Error | null, countRow: { count: number } | undefined) => {
					if (countErr) {
						resolve({
							success: false,
							message: "Erro ao verificar usuários: " + countErr.message,
						})
						return
					}

					if (countRow && countRow.count > 0) {
						resolve({
							success: false,
							message: `Não é possível deletar: ${countRow.count} usuário(s) ainda usam este papel`,
						})
						return
					}

					// Deletar o role
					database.run(
						"DELETE FROM roles WHERE id = ?",
						[id],
						function (this: { changes?: number }, err: Error | null) {
							if (err) {
								resolve({
									success: false,
									message: "Erro ao deletar papel: " + err.message,
								})
								return
							}

							if (this.changes && this.changes > 0) {
								clearRolesCache()
								resolve({
									success: true,
									message: "Papel deletado com sucesso",
								})
							} else {
								resolve({
									success: false,
									message: "Papel não encontrado",
								})
							}
						}
					)
				}
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao deletar papel: " + error?.toString(),
			})
		}
	})
}

// Obter permissões de um role por nome
export function getPermissionsByRoleName(roleName: string): Promise<{
	success: boolean
	message: string
	permissions?: UserPermissions
}> {
	return new Promise(async (resolve) => {
		try {
			const result = await getRoleByName(roleName)
			if (result.success && result.role) {
				resolve({
					success: true,
					message: "Permissões obtidas",
					permissions: result.role.permissions,
				})
			} else {
				// Fallback para permissões padrão
				resolve({
					success: true,
					message: "Usando permissões padrão",
					permissions: getRolePermissions(roleName),
				})
			}
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao obter permissões: " + error?.toString(),
			})
		}
	})
}

// Duplicar um role existente
export function duplicateRole(
	sourceId: number,
	newName: string,
	newDisplayName: string
): Promise<RoleSingleResult> {
	return new Promise(async (resolve) => {
		try {
			const source = await getRoleById(sourceId)
			if (!source.success || !source.role) {
				resolve({
					success: false,
					message: "Papel de origem não encontrado",
				})
				return
			}

			const result = await createRole(
				newName,
				newDisplayName,
				`Cópia de ${source.role.displayName}`,
				{ ...source.role.permissions }
			)
			resolve(result)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao duplicar papel: " + error?.toString(),
			})
		}
	})
}
