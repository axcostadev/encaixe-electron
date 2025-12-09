import { ipcMain } from "electron"
import {
	addModeloCor,
	authenticateUser,
	closeDatabase,
	createModelo,
	createUser,
	deleteModelo,
	deleteModeloCor,
	initDatabase,
	listModeloCores,
	listModelos,
	updateModelo,
} from "../database"

export function setupIPC(): void {
	// Inicializar banco de dados
	initDatabase()

	// IPC para login
	ipcMain.handle(
		"auth:login",
		async (event, username: string, password: string) => {
			return await authenticateUser(username, password)
		},
	)

	// IPC para registrar novo usuário
	ipcMain.handle(
		"auth:register",
		async (event, username: string, password: string, email: string) => {
			return await createUser(username, password, email)
		},
	)

	// IPC para fechar banco de dados
	ipcMain.handle("app:close", async () => {
		closeDatabase()
	})

	// Modelos
	ipcMain.handle("modelos:list", async () => {
		return await listModelos()
	})

	ipcMain.handle(
		"modelos:create",
		async (event, artigo: string, nome: string) => {
			return await createModelo(artigo, nome)
		},
	)

	ipcMain.handle(
		"modelos:update",
		async (event, id: number, artigo: string, nome: string) => {
			return await updateModelo(id, artigo, nome)
		},
	)

	ipcMain.handle("modelos:delete", async (event, id: number) => {
		return await deleteModelo(id)
	})

	// Cores do modelo
	ipcMain.handle("modelos:cores:list", async (event, modelo_id: number) => {
		return await listModeloCores(modelo_id)
	})

	ipcMain.handle(
		"modelos:cores:add",
		async (event, modelo_id: number, abreviada: string, completa: string) => {
			return await addModeloCor(modelo_id, abreviada, completa)
		},
	)

	ipcMain.handle("modelos:cores:delete", async (event, id: number) => {
		return await deleteModeloCor(id)
	})
}
