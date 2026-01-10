import { initDatabase, closeDatabase, ROLE_PERMISSIONS, getRolePermissions, DEFAULT_PERMISSIONS, clearRolesCache, updateRolesCache } from "./db"
import type { UserRole, UserPermissions, Role } from "./db"
import {
	LoginResult,
	UserListResult,
	authenticateUser,
	createUser,
	updateUser,
	deleteUser,
	listUsers,
	resetAdminPassword,
} from "./users"
import { getUserByUsername } from "./users"
import {
	Modelo,
	ModeloCor,
	listModelos,
	createModelo,
	updateModelo,
	deleteModelo,
	listModeloCores,
	addModeloCor,
	deleteModeloCor,
} from "./models"
import {
	listComponentes,
	addComponente,
	updateComponente,
	deleteComponente,
	getCadastroByArtigo,
} from "./models"
import type { Componente, ComponenteDados, CadastroInfo } from "./models"
import {
	Material,
	SentidoType,
	listMateriais,
	createMaterial,
	updateMaterial,
	deleteMaterial,
} from "./materiais"
import {
	Setor,
	listSetores,
	createSetor,
	updateSetor,
	deleteSetor,
} from "./models"
import {
	listRoles,
	getRoleById,
	getRoleByName,
	createRole,
	updateRole,
	deleteRole,
	getPermissionsByRoleName,
	duplicateRole,
} from "./roles"
import type { RoleListResult, RoleSingleResult } from "./roles"

export type { Modelo, ModeloCor }
export type { LoginResult, UserListResult }
export type { Material, SentidoType }
export type { Componente }
export type { ComponenteDados }
export type { CadastroInfo }
export type { Setor }
export type { UserRole, UserPermissions, Role }
export type { RoleListResult, RoleSingleResult }
export {
	initDatabase,
	closeDatabase,
	authenticateUser,
	createUser,
	updateUser,
	deleteUser,
	listUsers,
	resetAdminPassword,
	ROLE_PERMISSIONS,
	getRolePermissions,
	DEFAULT_PERMISSIONS,
	clearRolesCache,
	updateRolesCache,
	listModelos,
	createModelo,
	updateModelo,
	deleteModelo,
	listModeloCores,
	addModeloCor,
	deleteModeloCor,
	listMateriais,
	createMaterial,
	updateMaterial,
	deleteMaterial,
	listComponentes,
	addComponente,
	updateComponente,
	deleteComponente,
	getCadastroByArtigo,
	listSetores,
	createSetor,
	updateSetor,
	deleteSetor,
	getUserByUsername,
	// Roles
	listRoles,
	getRoleById,
	getRoleByName,
	createRole,
	updateRole,
	deleteRole,
	getPermissionsByRoleName,
	duplicateRole,
}
