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
