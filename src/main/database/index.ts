import { initDatabase, closeDatabase } from "./db"
import { LoginResult, authenticateUser, createUser } from "./users"
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
export type { LoginResult }
export type { Material, SentidoType }
export type { Componente }
export type { ComponenteDados }
export type { CadastroInfo }
export type { Setor }
export {
	initDatabase,
	closeDatabase,
	authenticateUser,
	createUser,
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
}
