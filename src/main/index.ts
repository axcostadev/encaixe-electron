import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, ipcMain, shell, nativeImage } from "electron"
import { join } from "path"
import icon from "../../resources/icon.png?asset"
import { existsSync } from "fs"
import { setupIPC } from "./ipc"
import { setupMenu } from "./menu"
import { closeDatabase } from "./database"

function createWindow(): void {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		title: "cutting room",
		width: 900,
		height: 670,
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

	mainWindow.on("ready-to-show", () => {
		// abrir a janela maximizada antes de mostrá-la
		try {
			mainWindow.maximize()
		} catch (_) {
			console.log("Failed to maximize window on ready-to-show")
		}
		mainWindow.show()
	})

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url)
		return { action: "deny" }
	})

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
app.whenReady().then(() => {
	// Set app user model id for windows and app name
	electronApp.setAppUserModelId("com.aincrad.cuttingroom")
	try {
		// set the app name (useful on macOS/Linux)
		app.setName("cutting room")
	} catch (_) {
		console.log("Failed to set app name")
	}

	// Setup IPC handlers
	setupIPC()

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
