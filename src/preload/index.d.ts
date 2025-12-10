import { ElectronAPI } from "@electron-toolkit/preload"

interface User {
	id: number
	username: string
	email: string
}

interface AuthResponse {
	success: boolean
	message: string
	user?: User
}

interface AuthAPI {
	login: (username: string, password: string) => Promise<AuthResponse>
	register: (
		username: string,
		password: string,
		email: string,
	) => Promise<AuthResponse>
}

interface Modelo {
	id: number
	artigo: string
	nome: string
}

interface ModeloCor {
	id: number
	modelo_id: number
	cor_abreviada: string
	cor_completa: string
}

interface ModeloCreateResponse {
	success: boolean
	message: string
	modelo?: Modelo
}

interface ModeloCorAddResponse {
	success: boolean
	message: string
	cor?: ModeloCor
}

interface OperationResponse {
	success: boolean
	message: string
}

interface Material {
	id: number
	artigo: string
	largura: number
	obs?: string
	sentido: "S" | "N" | "U"
}

interface MaterialCreateResponse {
	success: boolean
	message: string
	id?: number
}

interface ComponenteBackend {
	id: number
	modelo_id: number
	numero_tecido: string
	nome: string
	dados?: Record<string, unknown> | null
	tamanhos?: Array<{ tamanhoInicial: number; tamanhoFinal: number }>
}

interface ComponenteCreateResponse {
	success: boolean
	message: string
	componenteId?: number
}

interface ComponentesAPI {
	list: (modelo_id: number) => Promise<ComponenteBackend[]>
	create: (
		modelo_id: number,
		nome: string,
		dados: Record<string, unknown> | null,
		tamanhos: Array<{ tamanhoInicial: number; tamanhoFinal: number }>,
	) => Promise<ComponenteCreateResponse>
	update: (
		modelo_id: number,
		componente_id: number,
		nome: string,
		dados: Record<string, unknown> | null,
		tamanhos: Array<{ tamanhoInicial: number; tamanhoFinal: number }>,
	) => Promise<OperationResponse>
	delete: (modelo_id: number, componente_id: number) => Promise<OperationResponse>
}

interface ModelosCoresAPI {
	list: (modelo_id: number) => Promise<ModeloCor[]>
	add: (
		modelo_id: number,
		abreviada: string,
		completa: string,
	) => Promise<ModeloCorAddResponse>
	delete: (id: number) => Promise<OperationResponse>
}

interface ModelosAPI {
	list: () => Promise<Modelo[]>
	create: (artigo: string, nome: string) => Promise<ModeloCreateResponse>
	update: (
		id: number,
		artigo: string,
		nome: string,
	) => Promise<OperationResponse>
	delete: (id: number) => Promise<OperationResponse>
	cores: ModelosCoresAPI
}

interface MateriaisAPI {
	list: () => Promise<Material[]>
	create: (
		artigo: string,
		largura: number,
		obs?: string,
		sentido?: "S" | "N" | "U",
	) => Promise<MaterialCreateResponse>
	update: (
		id: number,
		artigo: string,
		largura: number,
		obs?: string,
		sentido?: "S" | "N" | "U",
	) => Promise<OperationResponse>
	delete: (id: number) => Promise<OperationResponse>
}

declare global {
	interface Window {
		electron: ElectronAPI
		api: {
			auth: AuthAPI
			modelos: ModelosAPI
			materiais: MateriaisAPI
			componentes: ComponentesAPI
			electronAPI: {
				selectFile: () => Promise<string | null>
				parseCTF: (filePath: string) => Promise<any>
				parseCTC: (filePath: string) => Promise<any>
				saveCTF: (lines: any) => Promise<any>
				saveCTC: (lines: any) => Promise<any>
				buscarOF: (of: string) => Promise<any[]>
			}
			dbAPI: {
				getAllLines: () => Promise<any[]>
				getLinesByOf: (of: string) => Promise<any[]>
				clearLines: () => Promise<{ deleted: number }>
			}
			apelidosAPI: {
				getAll: () => Promise<Record<string, string>>
				get: (comp: string) => Promise<string | null>
				save: (comp: string, ap: string) => Promise<boolean>
				remove: (comp: string) => Promise<boolean>
			}
			abreviacoesAPI: {
				getAll: () => Promise<Record<string, string>>
				save: (comp: string, ab: string) => Promise<boolean>
				remove: (comp: string) => Promise<boolean>
			}
			exportAPI: {
				showSaveDialog: (opts: any) => Promise<string | null>
				exportComelz: (
					pedidoObj: any,
					caminho: string,
				) => Promise<{ path: string }>
			}
			exportAPI2: {
				exportEmma: (
					pedidoObj: any,
					caminho: string,
				) => Promise<{ path: string }>
				exportLectra: (
					modelos: any,
					caminho: string,
					markerName: string,
				) => Promise<{ path: string }>
			}
			conversorAPI: {
				toComelz: (parsedCTF: any, parsedCTC: any, options: any) => Promise<any>
				toEmma: (parsedCTF: any, parsedCTC: any, options: any) => Promise<any>
				toLectra: (parsedCTF: any, parsedCTC: any, options: any) => Promise<any>
			}
			cadastroAPI: {
				openFile: () => Promise<string | null>
				save: (cadastroObj: any) => Promise<{ id: number; error?: string }>
				getByArtigo: (artigo: string) => Promise<any>
				find: (artigo: string, componente: string) => Promise<any>
				list: (limit: number) => Promise<any[]>
				delete: (id: number) => Promise<boolean>
			}
			cadastroImportAPI: {
				importAll: () => Promise<{ imported: number; error?: string }>
			}
		}
	}
}

export {}
