import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"

// Define types locally to avoid import issues
interface PedidoComelz {
	id?: string
	date?: string
	note?: string
	customer?: string
	split_materials?: boolean
	model: string
	qty: QtyRuleComelz[]
}

interface QtyRuleComelz {
	part_name?: string
	part_size?: string
	fitting?: string
	mirror?: boolean
	parts?: number
	material?: string
	items?: number
	extra?: string
}

interface PedidoEmma {
	customer: string
	date: string
	id: string
	model: string
	qty: QtyEmma[]
}

interface QtyEmma {
	part_name: string
	part_size: string
	mirror: boolean
	parts: number
	angle: number
	toler: number
	material_name: string
	material_x: number
	material_y: number
	material_unit: string
}

interface ComponenteDados {
	materialId: number
	apelido?: string
	tipoTecido?: number
	conjugacaoNavalha?: string
	placaPar?: string
	camadas?: number
	espacamento?: number
	compMaximo?: number
	percPerda?: number
	redutorLargura?: number
	coresDisponiveis?: string[]
	modeloCorId?: number
	setorId?: number
	numeroTecido?: string
} 

interface UserPermissions {
	canViewDashboard: boolean
	canViewModelos: boolean
	canEditModelos: boolean
	canViewCores: boolean
	canEditCores: boolean
	canViewMateriais: boolean
	canEditMateriais: boolean
	canViewComponentes: boolean
	canEditComponentes: boolean
	canViewEncaixe: boolean
	canCreateEncaixe: boolean
	canViewManual: boolean
	canEditManual: boolean
	canAccessSetup: boolean
	canManageUsers: boolean
	canManageRoles: boolean
}

interface CadastroInfo {
	artigo: string
	modelo: string
	componente: string
	apelido: string
	material: string
	cor: string
	largura: string
	tipoTecido: number
	paresCriac: string
	conjugNavalha: string
	placaPorPar: string
	camada: string
	espacamento: string
	comprimentoMax: string
	tamanhos?: number[]
	setorId?: number
	setorNome?: string
	tamanhosRanges?: { tamanhoInicial: number; tamanhoFinal: number }[]
	sentidoMaterial?: string
}

// Custom APIs for renderer
const api = {
	auth: {
		login: (username: string, password: string) =>
			ipcRenderer.invoke("auth:login", username, password),
		getWindowsUsername: () => ipcRenderer.invoke("auth:whoami"),
		findUser: (username: string) =>
			ipcRenderer.invoke("auth:find-user", username),
		loginAsWindowsUser: (username: string) =>
			ipcRenderer.invoke("auth:login-windows", username),
		register: (username: string, password: string, email: string) =>
			ipcRenderer.invoke("auth:register", username, password, email),
		resetAdmin: (password: string) =>
			ipcRenderer.invoke("auth:reset-admin", password),
	},
	license: {
		status: () => ipcRenderer.invoke("license:status"),
		activate: (token: string) => ipcRenderer.invoke("license:activate", token),
		fingerprint: () => ipcRenderer.invoke("license:fingerprint"),
	},
	// Gerenciamento de usuários (Setup)
	users: {
		list: () => ipcRenderer.invoke("users:list"),
		create: (username: string, password: string, email: string, role: string) =>
			ipcRenderer.invoke("users:create", username, password, email, role),
		update: (
			id: number,
			data: {
				username?: string
				email?: string
				password?: string
				role?: string
				active?: boolean
			},
		) => ipcRenderer.invoke("users:update", id, data),
		delete: (id: number) => ipcRenderer.invoke("users:delete", id),
		getPermissions: (role: string) =>
			ipcRenderer.invoke("users:get-permissions", role),
	},
	// Gerenciamento de papéis (Roles)
	roles: {
		list: () => ipcRenderer.invoke("roles:list"),
		get: (id: number) => ipcRenderer.invoke("roles:get", id),
		getByName: (name: string) => ipcRenderer.invoke("roles:get-by-name", name),
		create: (
			name: string,
			displayName: string,
			description: string,
			permissions: UserPermissions
		) => ipcRenderer.invoke("roles:create", name, displayName, description, permissions),
		update: (
			id: number,
			data: {
				displayName?: string
				description?: string
				permissions?: UserPermissions
			}
		) => ipcRenderer.invoke("roles:update", id, data),
		delete: (id: number) => ipcRenderer.invoke("roles:delete", id),
		duplicate: (sourceId: number, newName: string, newDisplayName: string) =>
			ipcRenderer.invoke("roles:duplicate", sourceId, newName, newDisplayName),
	},
	modelos: {
		list: () => ipcRenderer.invoke("modelos:list"),
		create: (artigo: string, nome: string) =>
			ipcRenderer.invoke("modelos:create", artigo, nome),
		update: (id: number, artigo: string, nome: string) =>
			ipcRenderer.invoke("modelos:update", id, artigo, nome),
		delete: (id: number) => ipcRenderer.invoke("modelos:delete", id),
		cores: {
			list: (modelo_id: number) =>
				ipcRenderer.invoke("modelos:cores:list", modelo_id),
			add: (modelo_id: number, abreviada: string, completa: string) =>
				ipcRenderer.invoke("modelos:cores:add", modelo_id, abreviada, completa),
			delete: (id: number) => ipcRenderer.invoke("modelos:cores:delete", id),
		},
	},
	materiais: {
		list: () => ipcRenderer.invoke("materiais:list"),
		create: (
			artigo: string,
			largura: number,
			obs?: string,
			sentido: "S" | "N" | "U" = "S",
		) => ipcRenderer.invoke("materiais:create", artigo, largura, obs, sentido),
		update: (
			id: number,
			artigo: string,
			largura: number,
			obs?: string,
			sentido: "S" | "N" | "U" = "S",
		) =>
			ipcRenderer.invoke("materiais:update", id, artigo, largura, obs, sentido),
		delete: (id: number) => ipcRenderer.invoke("materiais:delete", id),
	},
	setores: {
		list: () => ipcRenderer.invoke("setores:list"),
		create: (nome: string) => ipcRenderer.invoke("setores:create", nome),
		update: (id: number, nome: string) =>
			ipcRenderer.invoke("setores:update", id, nome),
		delete: (id: number) => ipcRenderer.invoke("setores:delete", id),
	},
	componentes: {
		list: (modelo_id: number) =>
			ipcRenderer.invoke("componentes:list", modelo_id),
		create: (
			modelo_id: number,
			nome: string,
			dados: ComponenteDados,
			tamanhos: Array<{ tamanhoInicial: number; tamanhoFinal: number }>,
		) =>
			ipcRenderer.invoke(
				"componentes:create",
				modelo_id,
				nome,
				dados,
				tamanhos,
			),
		update: (
			modelo_id: number,
			componente_id: number,
			nome: string,
			dados: ComponenteDados,
			tamanhos: Array<{ tamanhoInicial: number; tamanhoFinal: number }>,
		) =>
			ipcRenderer.invoke(
				"componentes:update",
				modelo_id,
				componente_id,
				nome,
				dados,
				tamanhos,
			),
		delete: (modelo_id: number, componente_id: number) =>
			ipcRenderer.invoke("componentes:delete", modelo_id, componente_id),
	},
	// APIs do electron-app
	electronAPI: {
		selectFile: () => ipcRenderer.invoke("select-file"),
		selectDirectory: () => ipcRenderer.invoke("select-directory"),
		parseCTF: (filePath: string) => ipcRenderer.invoke("parse-ctf", filePath),
		parseCTC: (filePath: string) => ipcRenderer.invoke("parse-ctc", filePath),
		saveCTF: (lines: string[]) => ipcRenderer.invoke("save-ctf", lines),
		saveCTC: (lines: string[]) => ipcRenderer.invoke("save-ctc", lines),
		buscarOF: (of: string) => ipcRenderer.invoke("buscar-of", of),
	},
	dbAPI: {
		getAllLines: () => ipcRenderer.invoke("query-lines"),
		getLinesByOf: (of: string) => ipcRenderer.invoke("query-lines-by-of", of),
		clearLines: () => ipcRenderer.invoke("clear-lines"),
	},
	apelidosAPI: {
		getAll: () => ipcRenderer.invoke("apelidos-get-all"),
		get: (comp: string) => ipcRenderer.invoke("apelidos-get", comp),
		save: (comp: string, ap: string) =>
			ipcRenderer.invoke("apelidos-save", comp, ap),
		remove: (comp: string) => ipcRenderer.invoke("apelidos-remove", comp),
	},
	abreviacoesAPI: {
		getAll: () => ipcRenderer.invoke("abreviacoes-get-all"),
		save: (comp: string, ab: string) =>
			ipcRenderer.invoke("abreviacoes-save", comp, ab),
		remove: (comp: string) => ipcRenderer.invoke("abreviacoes-remove", comp),
	},
	exportAPI: {
		showSaveDialog: (opts: unknown) =>
			ipcRenderer.invoke("show-save-dialog", opts),
		exportComelz: (pedidoObj: PedidoComelz, caminho: string) =>
			ipcRenderer.invoke("export-comelz", pedidoObj, caminho),
	},
	exportAPI2: {
		exportEmma: (pedidoObj: PedidoEmma, caminho: string) =>
			ipcRenderer.invoke("export-emma", pedidoObj, caminho),
		exportLectra: (
			modelos: unknown,
			caminho: string,
			markerName: string,
			options?: { espacamento?: number; sentidoMaterial?: string; largura?: number; fabric_type?: number },
		) => ipcRenderer.invoke("export-lectra", modelos, caminho, markerName, options),
	},
	conversorAPI: {
		toComelz: (parsedCTF: unknown, parsedCTC: unknown, options: unknown) =>
			ipcRenderer.invoke("conversor-comelz", parsedCTF, parsedCTC, options),
		toEmma: (parsedCTF: unknown, parsedCTC: unknown, options: unknown) =>
			ipcRenderer.invoke("conversor-emma", parsedCTF, parsedCTC, options),
		toLectra: (parsedCTF: unknown, parsedCTC: unknown, options: unknown) =>
			ipcRenderer.invoke("conversor-lectra", parsedCTF, parsedCTC, options),
	},
	cadastroAPI: {
		openFile: () => ipcRenderer.invoke("cadastro-open-file"),
		save: (cadastroObj: CadastroInfo[]) =>
			ipcRenderer.invoke("cadastro-save", cadastroObj),
		getByArtigo: (artigo: string) =>
			ipcRenderer.invoke("cadastro-get-by-artigo", artigo),
		find: (artigo: string, componente: string) =>
			ipcRenderer.invoke("cadastro-find", artigo, componente),
		list: (limit: number) => ipcRenderer.invoke("cadastro-list", limit),
		delete: (id: number) => ipcRenderer.invoke("cadastro-delete", id),
	},
	cadastroImportAPI: {
		importAll: () => ipcRenderer.invoke("cadastro-import-folder"),
	},
	migrations: {
		checkRedutorLargura: () => ipcRenderer.invoke("migrations:check-redutor-largura"),
		addRedutorLargura: () => ipcRenderer.invoke("migrations:add-redutor-largura"),
	},
	settings: {
		get: () => ipcRenderer.invoke("settings:get"),
		set: (updates: Record<string, any>) => ipcRenderer.invoke("settings:set", updates),
		test: (dbPath: string) => ipcRenderer.invoke("settings:test-db", dbPath),
		getStatus: () => ipcRenderer.invoke("settings:get-status"),
	},
	// Economia APIs
	economia: {
		importFile: (filePath?: string) => ipcRenderer.invoke("economia-import-file", filePath),
		importCGC: (filePath?: string) => ipcRenderer.invoke("economia-import-cgc", filePath),
		importCGCHeaders: (filePath?: string) => ipcRenderer.invoke("economia-import-cgc-headers", filePath),
		searchCGC: (filePath: string, searchTerm?: string) => ipcRenderer.invoke("economia-search-cgc", filePath, searchTerm),
		selectCGCFile: () => ipcRenderer.invoke("economia-select-cgc-file"),
		list: (limit: number = 0) => ipcRenderer.invoke("economia-list", limit),
		clear: () => ipcRenderer.invoke("economia-clear"),
		summary: () => ipcRenderer.invoke("economia-summary"),
		byModelo: (limit: number = 10) => ipcRenderer.invoke("economia-by-modelo", limit),
		byMaterial: (limit: number = 10) => ipcRenderer.invoke("economia-by-material", limit),
		byOrdem: (ordem: string) => ipcRenderer.invoke("economia-by-ordem", ordem),
		upsertEncaixe: (row: any) => ipcRenderer.invoke("economia:upsert-encaixe", row),
			insertHeader: (header: any) => ipcRenderer.invoke("economia:insert-header", header),
		updateRow: (id: number, fields: Record<string, any>) => ipcRenderer.invoke("economia:update-row", id, fields),
		deleteRows: (ids: number[]) => ipcRenderer.invoke("economia:delete-rows", ids),
		exportCSV: (filePath?: string, limit: number = 1000000) => ipcRenderer.invoke("economia-export-csv", filePath, limit),
		exportXLSX: (filePath?: string, limit: number = 1000000) => ipcRenderer.invoke("economia-export-xlsx", filePath, limit),
	},
}

// Compatibilidade para módulos embutidos (ex.: view-cutting-machine)
// que dependem de window.electron.ipcRenderer.invoke/on/removeAllListeners/send.
const electronCompat = {
	...electronAPI,
	ipcRenderer: {
		invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
		on: (channel: string, cb: (...args: unknown[]) => void): (() => void) => {
			const listener = (_event: unknown, ...args: unknown[]) => cb(...args)
			ipcRenderer.on(channel, listener as any)
			return () => ipcRenderer.removeListener(channel, listener as any)
		},
		removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
		send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
	},
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronCompat)
		contextBridge.exposeInMainWorld("api", api)
	} catch (error) {
		console.error(error)
	}
} else {
	// @ts-ignore (define in dts)
	window.electron = electronCompat
	// @ts-ignore (define in dts)
	window.api = api
}
