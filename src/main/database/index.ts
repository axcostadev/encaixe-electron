import { initDatabase, closeDatabase, ROLE_PERMISSIONS } from "./db"
import type { UserRole, UserPermissions } from "./db"
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

export type { Modelo, ModeloCor }
export type { LoginResult, UserListResult }
export type { Material, SentidoType }
export type { Componente }
export type { ComponenteDados }
export type { CadastroInfo }
export type { Setor }
export type { UserRole, UserPermissions }
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
}
