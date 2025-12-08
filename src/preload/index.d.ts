import { ElectronAPI } from "@electron-toolkit/preload"

interface AuthAPI {
	login: (
		username: string,
		password: string,
	) => Promise<{
		success: boolean
		message: string
		user?: {
			id: number
			username: string
			email: string
		}
	}>
	register: (
		username: string,
		password: string,
		email: string,
	) => Promise<{
		success: boolean
		message: string
		user?: {
			id: number
			username: string
			email: string
		}
	}>
}

declare global {
	interface Window {
		electron: ElectronAPI
		api: {
			auth: AuthAPI
			modelos: any
			electronAPI: {
				selectFile: () => Promise<string | null>
				parseCTF: (filePath: string) => Promise<any>
				parseCTC: (filePath: string) => Promise<any>
				saveCTF: (lines: any) => Promise<any>
				saveCTC: (lines: any) => Promise<any>
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
				exportComelz: (pedidoObj: any, caminho: string) => Promise<{ path: string }>
			}
			exportAPI2: {
				exportEmma: (pedidoObj: any, caminho: string) => Promise<{ path: string }>
				exportLectra: (modelos: any, caminho: string, markerName: string) => Promise<{ path: string }>
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
