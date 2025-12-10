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
} from "./models"
import type { Componente, ComponenteDados } from "./models"
import {
	Material,
	SentidoType,
	listMateriais,
	createMaterial,
	updateMaterial,
	deleteMaterial,
} from "./materiais"

export type { Modelo, ModeloCor }
export type { LoginResult }
export type { Material, SentidoType }
export type { Componente }
export type { ComponenteDados }
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
}
