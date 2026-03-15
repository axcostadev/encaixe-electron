import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, ipcMain, shell } from "electron"
import fs from "fs/promises"
import path, { join } from "path"
import icon from "../../resources/icon.png?asset"

function createWindow(): void {
	// Create the browser window.
	// Resolve icon path for each platform and for packaged vs dev
	const resolveIcon = () => {
		// Development: build folder is at project root
		const devIconBase = path.join(__dirname, "..", "..", "build")
		// Packaged: resources are under process.resourcesPath
		const prodIconBase = path.join(process.resourcesPath, "build")

		if (process.platform === "win32") {
			// windows needs ICO
			return app.isPackaged
				? path.join(prodIconBase, "view-cutting-machine.ico")
				: path.join(devIconBase, "view-cutting-machine.ico")
		}

		if (process.platform === "darwin") {
			// macOS needs ICNS
			return app.isPackaged
				? path.join(prodIconBase, "view-cutting-machine.icns")
				: path.join(devIconBase, "view-cutting-machine.icns")
		}
		// linux works with PNG asset imported above
		return icon
	}

	const mainWindow = new BrowserWindow({
		width: 1300,
		height: 900,
		show: false,
		autoHideMenuBar: true,
		icon: resolveIcon(),
		webPreferences: {
			preload: join(__dirname, "../preload/index.cjs"),
			sandbox: false,
			contextIsolation: true,
			nodeIntegration: false,
		},
	})
	
	// Log do preload path para debug
	console.log('[Main] Preload path:', join(__dirname, "../preload/index.cjs"))

	mainWindow.on("ready-to-show", () => {
		mainWindow.show()
	})

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url)
		return { action: "deny" }
	})

	// Global shortcut-like handler: open DevTools on Ctrl+Shift+I (Cmd+Alt+I on mac)
	mainWindow.webContents.on("before-input-event", (event, input) => {
		const isCmdOrCtrl =
			process.platform === "darwin" ? input.meta : input.control
		const isAltOrShift =
			input.shift && (process.platform === "darwin" ? input.alt : true)
		const isI = input.key && input.key.toLowerCase() === "i"
		const allowDevTools =
			is.dev || process.env["ALLOW_DEVTOOLS_IN_PROD"] === "true"
		if (isCmdOrCtrl && isAltOrShift && isI && allowDevTools) {
			mainWindow.webContents.openDevTools({ mode: "right" })
			// prevent default to avoid other handlers
			event.preventDefault()
		}
	})

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
		mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
	}

	// DevTools will only open via keyboard shortcut (Ctrl+Shift+I) or
	// when ALLOW_DEVTOOLS_IN_PROD=true environment variable is set
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// Set app user model id for windows (helps with taskbar icon & notifications)
	electronApp.setAppUserModelId("com.aincrad.dev")

	// Default open or close DevTools by F12 in development
	// and ignore CommandOrControl + R in production.
	// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window)
	})

	// IPC test
	ipcMain.on("ping", () => console.log("pong"))

	// Handler IPC para controlar o zoom
	ipcMain.handle("set-zoom-level", (event, zoomLevel: number) => {
		const webContents = event.sender
		webContents.setZoomLevel(Math.log(zoomLevel) / Math.log(1.2))
	})

	// Handler para dados de trabalhando Emma
	ipcMain.handle(
		"turno-report-data-trabalhando-emma",
		async (_event, params) => {
			const { date, turno } = params

			try {
				console.log("[IPC] Buscando dados de trabalhando Emma:", {
					date,
					turno,
				})
				const { getTurnoReportDataTrabalhandoModeloB } = await import(
					"./service/getTurnoReportDataModeloB.js"
				)
				const result = getTurnoReportDataTrabalhandoModeloB(
					date,
					turno,
					["trabalhando.png"], // filtro específico para trabalhando
				)
				console.log("[IPC] Dados de trabalhando Emma retornados:", result)
				return result
			} catch (error) {
				console.error("[IPC] Erro ao buscar dados de trabalhando Emma:", error)
				return null
			}
		},
	)

	// In production, copy bundled `data` (packaged via extraResources) to userData on first run
	const isProd = !is.dev
	const bundledDataPath = isProd
		? process.platform === "win32"
			? path.join(process.resourcesPath, "data")
			: path.join(process.resourcesPath, "data")
		: null

	const copyBundledDataToUserData = async () => {
		try {
			if (!bundledDataPath) return
			const userDataDir = path.join(app.getPath("userData"), "data")
			// If userData already has data, don't overwrite
			const exists = await fs
				.stat(userDataDir)
				.then(() => true)
				.catch(() => false)
			if (exists) return

			// Copy recursively from bundledDataPath to userDataDir
			const copyRecursive = async (src, dest) => {
				await fs.mkdir(dest, { recursive: true })
				const entries = await fs.readdir(src, { withFileTypes: true })
				for (const entry of entries) {
					const srcPath = path.join(src, entry.name)
					const destPath = path.join(dest, entry.name)
					if (entry.isDirectory()) {
						await copyRecursive(srcPath, destPath)
					} else {
						try {
							const data = await fs.readFile(srcPath)
							await fs.writeFile(destPath, data)
						} catch (_err) {
							// ignore copy errors per file
						}
					}
				}
			}

			await copyRecursive(bundledDataPath, userDataDir)
			console.log("Bundled data copied to userData on first run:", userDataDir)
		} catch (err) {
			console.error("Error copying bundled data to userData:", err)
		}
	}

	// Importa e integra handlers IPC do backend (ESM dinâmico)
	// Garante que handlers sejam registrados antes da janela ser criada
	import("./service/server.js")
		.then(async (serverModule) => {
			if (isProd) await copyBundledDataToUserData()
			createWindow()
			
			// Iniciar captura automática de dados em segundo plano
			if (serverModule.startAutomaticDataCapture) {
				// Start in background after window shows to avoid blocking UI with synchronous file processing
				setTimeout(() => {
					try {
						serverModule.startAutomaticDataCapture()
						console.log('[Main] Sistema de captura automática iniciado (iniciado após delay para não bloquear UI)')
					} catch (err) {
						console.error('[Main] Falha ao iniciar captura automática:', err)
					}
				}, 500)
			}
		})
		.catch((err) => {
			console.error('[Main] ERRO CRÍTICO ao importar server.js:', err)
			console.error('[Main] Stack:', err.stack)
			// Mesmo com erro, tenta criar a janela para não travar o programa
			console.warn('[Main] Criando janela mesmo com erro no servidor...')
			try {
				if (isProd) copyBundledDataToUserData().catch(e => console.error('Erro ao copiar dados:', e))
				createWindow()
			} catch (windowErr) {
				console.error('[Main] ERRO FATAL ao criar janela:', windowErr)
			}
		})

	app.on("activate", function () {
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
