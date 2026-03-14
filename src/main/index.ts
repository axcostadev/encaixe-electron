import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, ipcMain, shell, nativeImage } from "electron"
import { join } from "path"
import { pathToFileURL } from "url"
import icon from "../../resources/icon.png?asset"
// existsSync is used in multiple places; import it once
import { existsSync } from "fs"
import * as mainIpc from "./ipc"
import { setupMenu } from "./menu"
import { closeDatabase } from "./database"
import { join as joinPath } from "path"

async function tryStartViewCuttingMachineIpc() {
	const candidates = [
		// Dev mode: src files
		joinPath(process.cwd(), "src/renderer/view-cutting-machine/src/main/service/server.js"),
		joinPath(__dirname, "../renderer/view-cutting-machine/src/main/service/server.js"),
		// Production: extraResources
		joinPath(process.resourcesPath || "", "view-cutting-machine-service/server.js"),
		joinPath(process.resourcesPath || "", "app.asar.unpacked/src/renderer/view-cutting-machine/src/main/service/server.js"),
	]

	for (const p of candidates) {
		if (!p || !existsSync(p)) continue
		try {
			await import(pathToFileURL(p).href)
			console.log(`View Cutting Machine IPC carregado de: ${p}`)
			return
		} catch (err) {
			console.error(`Erro ao carregar View Cutting Machine IPC em ${p}:`, err)
		}
	}

	console.log("View Cutting Machine IPC não encontrado em paths conhecidos; ignorando.")
}

function createWindow(): void {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		title: "cutting room",
		width: 1920,
		height: 768,
		minWidth: 1600,
		show: false,
		// mostrar menu por padrão (não esconder com Alt)
		autoHideMenuBar: false,
		// set the window icon for Windows and Linux
		...(function () {
			if (process.platform === "win32") {
				const icoPath = join(
					__dirname,
					"../../resources/view-cutting-machine.ico",
				)
				if (existsSync(icoPath)) return { icon: icoPath }
				// fallback to packaged PNG/nativeImage if .ico not found
				try {
					return { icon: nativeImage.createFromDataURL(icon) }
				} catch (_) {
					return {}
				}
			}

			if (process.platform === "linux") {
				return { icon }
			}

			return {}
		})(),
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
	})

	let didShowWindow = false
	const showMainWindow = (reason: string) => {
		if (didShowWindow || mainWindow.isDestroyed()) return
		didShowWindow = true
		try {
			mainWindow.show()
			mainWindow.focus()
			console.log(`[WINDOW] main window shown via ${reason}`)
		} catch (err) {
			console.error(`[WINDOW] failed to show main window via ${reason}`, err)
		}
	}

	mainWindow.on("ready-to-show", () => {
		// abrir a janela maximizada antes de mostrá-la
		try {
			mainWindow.maximize()
		} catch (_) {
			console.log("Failed to maximize window on ready-to-show")
		}
		showMainWindow("ready-to-show")
	})

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url)
		return { action: "deny" }
	})

	// Diagnostics: forward renderer console messages and log load failures/crashes
	mainWindow.webContents.on(
		"console-message",
		(_event, level, message, line, sourceId) => {
			console.log(
				`Renderer console (${level}) ${sourceId}:${line} - ${message}`,
			)
		},
	)

	mainWindow.webContents.on(
		"did-fail-load",
		(_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
			console.error("did-fail-load", {
				errorCode,
				errorDescription,
				validatedURL,
				isMainFrame,
			})
			if (isMainFrame) showMainWindow("did-fail-load")
		},
	)

	mainWindow.webContents.on("render-process-gone", (_event, details) => {
		console.error("Renderer process gone", details)
	})

	mainWindow.webContents.on("did-finish-load", () => {
		console.log("Renderer finished load")
		showMainWindow("did-finish-load")
	})

	// Safety net: in dev, some renderer/network startup races can skip ready-to-show.
	setTimeout(() => {
		if (!didShowWindow) showMainWindow("timeout-fallback")
	}, 5000)

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
		mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
	}
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
	// Set app user model id for windows and app name
	electronApp.setAppUserModelId("com.aincrad.cuttingroom")
	try {
		// set the app name (useful on macOS/Linux)
		app.setName("cutting room")
	} catch (_) {
		console.log("Failed to set app name")
	}

	// Setup IPC handlers (safe call to avoid interop/circular issues)
	try {
		if (mainIpc && typeof (mainIpc as any).setupIPC === "function") {
			(mainIpc as any).setupIPC()
		} else {
			console.warn('setupIPC not available or not a function; skipping IPC setup')
		}
	} catch (err) {
		console.error('Erro ao inicializar IPC:', err)
	}

	// Integra handlers IPC do View Cutting Machine (projeto embutido)
	await tryStartViewCuttingMachineIpc();

	// Integrar opcionalmente o Machine Work State server
	// TEMPORARIAMENTE DESABILITADO devido a incompatibilidade sqlite3/Electron
	// Para reativar: reconstruir sqlite3 com electron-rebuild
	console.log('Machine Work State temporariamente desabilitado (sqlite3 incompatível com Electron)')
	/*
	;(function tryStartMachineWorkState() {
		try {
			const { fork } = require("child_process")
			const child = fork(p, [], {
				stdio: ["pipe", "inherit", "inherit", "ipc"],
				env: { ...process.env },
			})
			child.on("error", (err: Error) => {
				console.error("Machine Work State child process error:", err.message)
			})
			child.on("exit", (code: number | null) => {
				if (code !== 0) {
					console.warn(`Machine Work State process exited with code ${code}`)
				}
			})
			console.log(`Machine Work State server iniciado em processo filho`)
		} catch (err) {
			console.error('Erro ao iniciar Machine Work State server:', err)
		}
	})()
	*/

	// Setup Menu
	setupMenu()

	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window)
	})

	// IPC test
	ipcMain.on("ping", () => console.log("pong"))

	createWindow()

	app.on("activate", function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})

app.on("before-quit", () => {
	closeDatabase()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
