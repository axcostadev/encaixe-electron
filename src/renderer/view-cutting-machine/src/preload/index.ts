import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, IpcRendererEvent, ipcRenderer, webFrame } from "electron"

// API personalizada para o renderer
const api = {
	ipcRenderer: {
		invoke: (channel: string, ...args: any[]) => {
			console.log(`[Preload] Invoking ${channel} with args:`, args)
			return ipcRenderer.invoke(channel, ...args)
		},
		on: (channel: string, cb: (...args: unknown[]) => void): (() => void) => {
			console.log(`[Preload] Registering listener for ${channel}`)
			const listener = (_event: IpcRendererEvent, ...args: unknown[]) => cb(...args)
			ipcRenderer.on(channel, listener)
			return () => ipcRenderer.removeListener(channel, listener)
		},
		removeAllListeners: (channel: string): void => {
			console.log(`[Preload] Removing all listeners for ${channel}`)
			ipcRenderer.removeAllListeners(channel)
		},
		send: (channel: string, ...args: any[]) => {
			console.log(`[Preload] Sending ${channel} with args:`, args)
			ipcRenderer.send(channel, ...args)
		},
	},
}

// Criar o objeto electron completo
const electronObject = {
	...electronAPI,
	ipcRenderer: api.ipcRenderer,
}

// API de zoom direta via webFrame
const zoomAPI = {
	set: (factor: number) => {
		try {
			// Sanitiza fator
			const clamped = Math.max(0.5, Math.min(2, Number(factor) || 1))
			webFrame.setZoomFactor(clamped)
			console.log(`[Preload] webFrame.setZoomFactor(${clamped})`)
		} catch (err) {
			console.error("[Preload] Erro ao definir zoomFactor:", err)
		}
	},
}

console.log("[Preload] Starting preload script...")
console.log("[Preload] Context isolated:", process.contextIsolated)

if (process.contextIsolated) {
	try {
		console.log("[Preload] Context isolated - using contextBridge")
		contextBridge.exposeInMainWorld("electron", electronObject)
		console.log("[Preload] Successfully exposed electron API via contextBridge")
		contextBridge.exposeInMainWorld("zoom", zoomAPI)
		
		// Verificar se foi exposto corretamente
		contextBridge.exposeInMainWorld("electronTest", {
			test: () => console.log("Electron API is working!")
		})
	} catch (error) {
		console.error("[Preload] Error exposing electron API:", error)
		// Fallback: tentar expor diretamente
		try {
			// @ts-ignore
			window.electron = electronObject
			// @ts-ignore
			window.zoom = zoomAPI
			console.log("[Preload] Fallback: set window.electron directly")
		} catch (fallbackError) {
			console.error("[Preload] Fallback failed:", fallbackError)
		}
	}
} else {
	console.log("[Preload] Context not isolated - setting window properties")
	// @ts-ignore
	window.electron = electronObject
	// @ts-ignore
	window.zoom = zoomAPI
	console.log("[Preload] Successfully set window.electron")
}

// Verificação adicional no DOM ready
document.addEventListener("DOMContentLoaded", () => {
	console.log("[Preload] DOM loaded, checking electron API...")
	// @ts-ignore
	if (typeof window.electron !== "undefined") {
		console.log("[Preload] ✅ window.electron is available")
		// @ts-ignore
		if (window.electron.ipcRenderer) {
			console.log("[Preload] ✅ window.electron.ipcRenderer is available")
		} else {
			console.error("[Preload] ❌ window.electron.ipcRenderer is undefined")
		}
	} else {
		console.error("[Preload] ❌ window.electron is undefined")
	}
})
