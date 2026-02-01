import { app } from "electron"
import { join } from "path"

export const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAUJRKJDGB3BxqiSH60D2xYIXF0SaKAEPFTPQCTJVJrRs=
-----END PUBLIC KEY-----`

export const LICENSE_PATH = () => join(app.getPath("userData"), "license.json")
export const LICENSE_ENC_PATH = () => join(app.getPath("userData"), "license.enc")
export const ATTEMPT_PATH = () => join(app.getPath("userData"), "license.attempts.json")
export const CLOCK_PATH = () => join(app.getPath("userData"), ".clock")

export const MAX_ATTEMPTS = 5
export const BLOCK_WINDOW_MS = 30_000
export const MAX_CLOCK_DRIFT_MS = 24 * 60 * 60 * 1000 // 24h
export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export const FEATURE_MAP: Record<string, string> = {
	modelos: "full",
	cores: "full",
	materiais: "full",
	componentes: "full",
	setores: "full",
	arquivos: "full",
	conversor: "full",
	cadastro: "full",
	settings: "full",
	apelidos: "full",
	abreviacoes: "full",
	exportacao: "full",
	economia: "full",
	migrations: "full",
	roles: "full",
	usuarios: "full",
}
