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

export type { Modelo, ModeloCor }
export type { LoginResult }
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
}
