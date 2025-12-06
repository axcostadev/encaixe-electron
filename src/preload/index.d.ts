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
		}
	}
}

export {}
