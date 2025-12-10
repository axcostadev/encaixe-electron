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
}
