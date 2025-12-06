import { ipcMain, Menu } from "electron"

export function setupMenu(): void {
	const menu = Menu.buildFromTemplate([
		{
			label: "Arquivo",
			submenu: [
				{
					label: "Sair",
					accelerator: "CmdOrCtrl+Q",
					click: () => {
						process.exit()
					},
				},
			],
		},
		{
			label: "Cadastro",
			submenu: [
				{
					label: "Modelo",
					accelerator: "CmdOrCtrl+Shift+M",
					click: () => {
						ipcMain.emit("navigate", "modelo")
					},
				},
				{
					label: "Componentes",
					accelerator: "CmdOrCtrl+Shift+C",
					click: () => {
						ipcMain.emit("navigate", "componentes")
					},
				},
				{
					label: "Tamanho",
					accelerator: "CmdOrCtrl+Shift+T",
					click: () => {
						ipcMain.emit("navigate", "tamanho")
					},
				},
				{
					label: "Material",
					accelerator: "CmdOrCtrl+Shift+A",
					click: () => {
						ipcMain.emit("navigate", "material")
					},
				},
				{
					label: "Setor",
					accelerator: "CmdOrCtrl+Shift+S",
					click: () => {
						ipcMain.emit("navigate", "setor")
					},
				},
			],
		},
		{
			label: "Exibir",
			submenu: [
				{
					label: "Recarregar",
					accelerator: "CmdOrCtrl+R",
					click: (menuItem, browserWindow) => {
						if (browserWindow) browserWindow.reload()
					},
				},
				{
					label: "Ferramentas do Desenvolvedor",
					accelerator: "CmdOrCtrl+Shift+I",
					click: (menuItem, browserWindow) => {
						if (browserWindow) browserWindow.webContents.toggleDevTools()
					},
				},
			],
		},
		{
			label: "Ajuda",
			submenu: [
				{
					label: "Sobre",
					click: () => {
						ipcMain.emit("show-about")
					},
				},
			],
		},
	])

	Menu.setApplicationMenu(menu)
}
