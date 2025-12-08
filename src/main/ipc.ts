import { dialog, ipcMain } from "electron"
import {
	authenticateUser,
	closeDatabase,
	createUser,
	initDatabase,
	listModelos,
	createModelo,
	updateModelo,
	deleteModelo,
	listModeloCores,
	addModeloCor,
	deleteModeloCor,
} from "./database"
import * as parser from './modules/arquivoParser'
import * as db from './modules/db'
import * as gerenciadorApelidos from './modules/gerenciadorApelidos'
import * as abreviacaoManager from './modules/abreviacaoManager'
import * as exportadorComelz from './modules/exportadorComelz'
import * as exportadorEmma from './modules/exportadorEmma'
import * as exportadorLectra from './modules/exportadorLectra'
import * as conversorComelz from './modules/conversorComelz'
import * as conversorEmma from './modules/conversorEmma'
import * as conversorLectra from './modules/conversorLectra'

export function setupIPC(): void {
	// Inicializar banco de dados
	initDatabase()
	
	// Inicializar banco de dados do electron-app
	db.initDB()

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

	ipcMain.handle("modelos:create", async (event, artigo: string, nome: string) => {
		return await createModelo(artigo, nome)
	})

	ipcMain.handle("modelos:update", async (event, id: number, artigo: string, nome: string) => {
		return await updateModelo(id, artigo, nome)
	})

	ipcMain.handle("modelos:delete", async (event, id: number) => {
		return await deleteModelo(id)
	})

	// Cores do modelo
	ipcMain.handle("modelos:cores:list", async (event, modelo_id: number) => {
		return await listModeloCores(modelo_id)
	})

	ipcMain.handle("modelos:cores:add", async (event, modelo_id: number, abreviada: string, completa: string) => {
		return await addModeloCor(modelo_id, abreviada, completa)
	})

	ipcMain.handle("modelos:cores:delete", async (event, id: number) => {
		return await deleteModeloCor(id)
	})

	// ==================== HANDLERS DO ELECTRON-APP ====================
	
	// File selection
	ipcMain.handle('select-file', async () => {
		const result = await dialog.showOpenDialog({ 
			properties: ['openFile'], 
			filters: [
				{ name: 'Text', extensions: ['txt', 'ctf', 'ctc', 'log'] }, 
				{ name: 'All', extensions: ['*'] }
			] 
		})
		if (result.canceled) return null
		return result.filePaths[0]
	})

	// Parse handlers
	ipcMain.handle('parse-ctf', async (_event, filePath: string) => {
		return await parser.parseCTF(filePath)
	})

	ipcMain.handle('parse-ctc', async (_event, filePath: string) => {
		return await parser.parseCTC(filePath)
	})

	// Database handlers
	ipcMain.handle('save-ctf', async (_event, lines: any) => {
		return await db.saveCTFLines(lines)
	})

	ipcMain.handle('save-ctc', async (_event, lines: any) => {
		return await db.saveCTCLines(lines)
	})

	ipcMain.handle('query-lines', async () => {
		return await db.getAllLines()
	})

	ipcMain.handle('query-lines-by-of', async (_event, of: string) => {
		return await db.getLinesByOf(of)
	})

	ipcMain.handle('clear-lines', async () => {
		return await db.clearLines()
	})

	// Apelidos handlers
	ipcMain.handle('apelidos-get-all', async () => {
		return await gerenciadorApelidos.getAllApelidos()
	})

	ipcMain.handle('apelidos-get', async (_event, componente: string) => {
		return await gerenciadorApelidos.getApelido(componente)
	})

	ipcMain.handle('apelidos-save', async (_event, componente: string, apelido: string) => {
		return await gerenciadorApelidos.saveApelido(componente, apelido)
	})

	ipcMain.handle('apelidos-remove', async (_event, componente: string) => {
		return await gerenciadorApelidos.removeApelido(componente)
	})

	// Abreviacoes handlers
	ipcMain.handle('abreviacoes-get-all', async () => {
		return await abreviacaoManager.getAllAbreviacoes()
	})

	ipcMain.handle('abreviacoes-save', async (_event, componente: string, abrev: string) => {
		return await abreviacaoManager.saveAbreviacao(componente, abrev)
	})

	ipcMain.handle('abreviacoes-remove', async (_event, componente: string) => {
		return await abreviacaoManager.removeAbreviacao(componente)
	})

	// Export handlers
	ipcMain.handle('show-save-dialog', async (_event, opts: any) => {
		const res = await dialog.showSaveDialog({
			title: opts?.title || 'Salvar arquivo',
			defaultPath: opts?.defaultPath || undefined,
			filters: opts?.filters || []
		})
		if (res.canceled) return null
		return res.filePath
	})

	ipcMain.handle('export-comelz', async (_event, pedidoObj: any, caminho: string) => {
		return await exportadorComelz.exportar(pedidoObj, caminho)
	})

	ipcMain.handle('export-emma', async (_event, pedidoObj: any, caminho: string) => {
		return await exportadorEmma.exportar(pedidoObj, caminho)
	})

	ipcMain.handle('export-lectra', async (_event, modelos: any, caminho: string, markerName: string) => {
		return await exportadorLectra.exportarMkx(modelos, caminho, markerName)
	})

	// Conversor handlers
	ipcMain.handle('conversor-comelz', async (_event, parsedCTF: any, parsedCTC: any, options: any) => {
		let cadastro = null
		try {
			if (options && options.artigo) {
				cadastro = options.componente ? await db.findCadastro(options.artigo, options.componente) : await db.getCadastroByArtigo(options.artigo)
			}
		} catch (err) {
			console.error('Erro buscando cadastro para conversor Comelz:', err)
		}
		return conversorComelz.converterParaQtyRules(parsedCTF, parsedCTC, cadastro || options)
	})

	ipcMain.handle('conversor-emma', async (_event, parsedCTF: any, parsedCTC: any, options: any) => {
		let cadastro = null
		try {
			if (options && options.artigo) {
				cadastro = options.componente ? await db.findCadastro(options.artigo, options.componente) : await db.getCadastroByArtigo(options.artigo)
			}
		} catch (err) {
			console.error('Erro buscando cadastro para conversor Emma:', err)
		}
		return conversorEmma.converterParaQtyEmma(parsedCTF, parsedCTC, cadastro || options)
	})

	ipcMain.handle('conversor-lectra', async (_event, parsedCTF: any, parsedCTC: any, options: any) => {
		let cadastro = null
		try {
			if (options && options.artigo) {
				cadastro = options.componente ? await db.findCadastro(options.artigo, options.componente) : await db.getCadastroByArtigo(options.artigo)
			}
		} catch (err) {
			console.error('Erro buscando cadastro para conversor Lectra:', err)
		}
		return conversorLectra.converterParaModelData(parsedCTF, parsedCTC, cadastro || options)
	})

	// Cadastro handlers
	ipcMain.handle('cadastro-open-file', async () => {
		const res = await dialog.showOpenDialog({ 
			title: 'Carregar Cadastro', 
			properties: ['openFile'], 
			filters: [{ name: 'Text', extensions: ['txt'] }] 
		})
		if (res.canceled) return null
		return res.filePaths[0]
	})

	ipcMain.handle('cadastro-save', async (_event, cadastroObj: any) => {
		return await db.saveCadastro(cadastroObj)
	})

	ipcMain.handle('cadastro-get-by-artigo', async (_event, artigo: string) => {
		return await db.getCadastroByArtigo(artigo)
	})

	ipcMain.handle('cadastro-find', async (_event, artigo: string, componente: string) => {
		return await db.findCadastro(artigo, componente)
	})

	ipcMain.handle('cadastro-list', async (_event, limit: number) => {
		return await db.listCadastros(limit || 100)
	})

	ipcMain.handle('cadastro-delete', async (_event, id: number) => {
		return await db.deleteCadastroById(id)
	})

	ipcMain.handle('cadastro-import-folder', async () => {
		// Implementar importação em lote se necessário
		return { imported: 0 }
	})
}
