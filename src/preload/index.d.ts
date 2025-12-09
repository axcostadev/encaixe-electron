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

declare global {
	interface Window {
		electron: ElectronAPI
		api: {
			auth: AuthAPI
			modelos: ModelosAPI
		}
	}
}

export {}
