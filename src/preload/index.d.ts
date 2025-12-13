import { ElectronAPI } from "@electron-toolkit/preload"

// Define types locally
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
	tipoTecido?: number
	conjugacaoNavalha?: string
	placaPar?: string
	camadas?: number
	espacamento?: number
	compMaximo?: number
	percPerda?: number
	coresDisponiveis?: string[]
	modeloCorId?: number
	setorId?: number
	numeroTecido?: string
}

interface CadastroInfo {
	artigo: string
	modelo: string
	componente: string
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
}

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

interface WhoamiResponse {
	success: boolean
	username?: string
	message?: string
}

interface AuthAPI {
	login: (username: string, password: string) => Promise<AuthResponse>
	register: (
		username: string,
		password: string,
		email: string,
	) => Promise<AuthResponse>
	getWindowsUsername?: () => Promise<WhoamiResponse>
	findUser?: (username: string) => Promise<AuthResponse>
	loginAsWindowsUser?: (username: string) => Promise<AuthResponse>
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
		dados: ComponenteDados | null,
		tamanhos: Array<{ tamanhoInicial: number; tamanhoFinal: number }>,
	) => Promise<ComponenteCreateResponse>
	update: (
		modelo_id: number,
		componente_id: number,
		nome: string,
		dados: ComponenteDados | null,
		tamanhos: Array<{ tamanhoInicial: number; tamanhoFinal: number }>,
	) => Promise<OperationResponse>
	delete: (
		modelo_id: number,
		componente_id: number,
	) => Promise<OperationResponse>
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

interface Setor {
	id: number
	nome: string
}

interface SetorCreateResponse {
	success: boolean
	message: string
	setor?: Setor
}

interface SetoresAPI {
	list: () => Promise<Setor[]>
	create: (nome: string) => Promise<SetorCreateResponse>
	update: (id: number, nome: string) => Promise<OperationResponse>
	delete: (id: number) => Promise<OperationResponse>
}

declare global {
	interface Window {
		electron: ElectronAPI
		api: {
			auth: AuthAPI
			modelos: ModelosAPI
			materiais: MateriaisAPI
			setores: SetoresAPI
			componentes: ComponentesAPI
			electronAPI: {
				selectFile: () => Promise<string | null>
				parseCTF: (filePath: string) => Promise<unknown>
				parseCTC: (filePath: string) => Promise<unknown>
				saveCTF: (lines: string[]) => Promise<unknown>
				saveCTC: (lines: string[]) => Promise<unknown>
				buscarOF: (of: string) => Promise<unknown[]>
			}
			dbAPI: {
				getAllLines: () => Promise<unknown[]>
				getLinesByOf: (of: string) => Promise<unknown[]>
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
				showSaveDialog: (opts: unknown) => Promise<string | null>
				exportComelz: (
					pedidoObj: PedidoComelz,
					caminho: string,
				) => Promise<{ path: string }>
			}
			exportAPI2: {
				exportEmma: (
					pedidoObj: PedidoEmma,
					caminho: string,
				) => Promise<{ path: string }>
				exportLectra: (
					modelos: unknown,
					caminho: string,
					markerName: string,
				) => Promise<{ path: string }>
			}
			conversorAPI: {
				toComelz: (
					parsedCTF: unknown,
					parsedCTC: unknown,
					options: unknown,
				) => Promise<unknown>
				toEmma: (
					parsedCTF: unknown,
					parsedCTC: unknown,
					options: unknown,
				) => Promise<unknown>
				toLectra: (
					parsedCTF: unknown,
					parsedCTC: unknown,
					options: unknown,
				) => Promise<unknown>
			}
			cadastroAPI: {
				openFile: () => Promise<string | null>
				save: (
					cadastroObj: CadastroInfo[],
				) => Promise<{ id: number; error?: string }>
				getByArtigo: (artigo: string) => Promise<CadastroInfo[]>
				find: (
					artigo: string,
					componente: string,
				) => Promise<CadastroInfo | null>
				list: (limit: number) => Promise<CadastroInfo[]>
				delete: (id: number) => Promise<boolean>
			}
			cadastroImportAPI: {
				importAll: () => Promise<{ imported: number; error?: string }>
			}
		}
	}
}

export {}
