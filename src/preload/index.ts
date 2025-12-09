import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"

// Custom APIs for renderer
const api = {
	auth: {
		login: (username: string, password: string) =>
			ipcRenderer.invoke("auth:login", username, password),
		register: (username: string, password: string, email: string) =>
			ipcRenderer.invoke("auth:register", username, password, email),
	},
	modelos: {
		list: () => ipcRenderer.invoke("modelos:list"),
		create: (artigo: string, nome: string) => ipcRenderer.invoke("modelos:create", artigo, nome),
		update: (id: number, artigo: string, nome: string) => ipcRenderer.invoke("modelos:update", id, artigo, nome),
		delete: (id: number) => ipcRenderer.invoke("modelos:delete", id),
		cores: {
			list: (modelo_id: number) => ipcRenderer.invoke("modelos:cores:list", modelo_id),
			add: (modelo_id: number, abreviada: string, completa: string) =>
				ipcRenderer.invoke("modelos:cores:add", modelo_id, abreviada, completa),
			delete: (id: number) => ipcRenderer.invoke("modelos:cores:delete", id),
		},
	},
	// APIs do electron-app
	electronAPI: {
		selectFile: () => ipcRenderer.invoke('select-file'),
		parseCTF: (filePath: string) => ipcRenderer.invoke('parse-ctf', filePath),
		parseCTC: (filePath: string) => ipcRenderer.invoke('parse-ctc', filePath),
		saveCTF: (lines: any) => ipcRenderer.invoke('save-ctf', lines),
		saveCTC: (lines: any) => ipcRenderer.invoke('save-ctc', lines),
		buscarOF: (of: string) => ipcRenderer.invoke('buscar-of', of)
	},
	dbAPI: {
		getAllLines: () => ipcRenderer.invoke('query-lines'),
		getLinesByOf: (of: string) => ipcRenderer.invoke('query-lines-by-of', of),
		clearLines: () => ipcRenderer.invoke('clear-lines')
	},
	apelidosAPI: {
		getAll: () => ipcRenderer.invoke('apelidos-get-all'),
		get: (comp: string) => ipcRenderer.invoke('apelidos-get', comp),
		save: (comp: string, ap: string) => ipcRenderer.invoke('apelidos-save', comp, ap),
		remove: (comp: string) => ipcRenderer.invoke('apelidos-remove', comp)
	},
	abreviacoesAPI: {
		getAll: () => ipcRenderer.invoke('abreviacoes-get-all'),
		save: (comp: string, ab: string) => ipcRenderer.invoke('abreviacoes-save', comp, ab),
		remove: (comp: string) => ipcRenderer.invoke('abreviacoes-remove', comp)
	},
	exportAPI: {
		showSaveDialog: (opts: any) => ipcRenderer.invoke('show-save-dialog', opts),
		exportComelz: (pedidoObj: any, caminho: string) =>
			ipcRenderer.invoke('export-comelz', pedidoObj, caminho)
	},
	exportAPI2: {
		exportEmma: (pedidoObj: any, caminho: string) =>
			ipcRenderer.invoke('export-emma', pedidoObj, caminho),
		exportLectra: (modelos: any, caminho: string, markerName: string) =>
			ipcRenderer.invoke('export-lectra', modelos, caminho, markerName)
	},
	conversorAPI: {
		toComelz: (parsedCTF: any, parsedCTC: any, options: any) =>
			ipcRenderer.invoke('conversor-comelz', parsedCTF, parsedCTC, options),
		toEmma: (parsedCTF: any, parsedCTC: any, options: any) =>
			ipcRenderer.invoke('conversor-emma', parsedCTF, parsedCTC, options),
		toLectra: (parsedCTF: any, parsedCTC: any, options: any) =>
			ipcRenderer.invoke('conversor-lectra', parsedCTF, parsedCTC, options)
	},
	cadastroAPI: {
		openFile: () => ipcRenderer.invoke('cadastro-open-file'),
		save: (cadastroObj: any) => ipcRenderer.invoke('cadastro-save', cadastroObj),
		getByArtigo: (artigo: string) => ipcRenderer.invoke('cadastro-get-by-artigo', artigo),
		find: (artigo: string, componente: string) =>
			ipcRenderer.invoke('cadastro-find', artigo, componente),
		list: (limit: number) => ipcRenderer.invoke('cadastro-list', limit),
		delete: (id: number) => ipcRenderer.invoke('cadastro-delete', id)
	},
	cadastroImportAPI: {
		importAll: () => ipcRenderer.invoke('cadastro-import-folder')
	}
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronAPI)
		contextBridge.exposeInMainWorld("api", api)
	} catch (error) {
		console.error(error)
	}
} else {
	// @ts-ignore (define in dts)
	window.electron = electronAPI
	// @ts-ignore (define in dts)
	window.api = api
}
