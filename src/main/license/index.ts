import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	verify as verifySig,
} from "crypto"
import { app } from "electron"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { machineIdSync } from "node-machine-id"
import os from "os"
import { dirname, join } from "path"
import { antiDebugCheck } from "../utils/anti-debug"
import { checkCanary } from "../utils/anti-tampering"

export type LicensePayload = {
	licenseId: string
	productId: string
	customerId?: string
	issuedAt: string
	expiresAt?: string
	features: string[]
	maxActivations?: number
	hwFingerprint?: string
	allowedFingerprints?: string[]
	nonce: string
	graceDays?: number
	revocationListVersion?: number
	productPath?: string
	version: 1 | 2
}

export type LicenseStatus = {
	valid: boolean
	code:
		| "OK"
		| "NO_LICENSE"
		| "INVALID_SIGNATURE"
		| "EXPIRED"
		| "EXPIRED_GRACE"
		| "FINGERPRINT_MISMATCH"
		| "FEATURE_MISSING"
		| "MALFORMED"
		| "RATE_LIMIT"
		| "INTERNAL_ERROR"
	message?: string
	license?: LicensePayload
	retryInSeconds?: number
	attemptsLeft?: number
	fingerprint?: string
	token?: string
}

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAUJRKJDGB3BxqiSH60D2xYIXF0SaKAEPFTPQCTJVJrRs=
-----END PUBLIC KEY-----`

const LICENSE_PATH = () => join(app.getPath("userData"), "license.json")
const LICENSE_ENC_PATH = () => join(app.getPath("userData"), "license.enc")
const ATTEMPT_PATH = () =>
	join(app.getPath("userData"), "license.attempts.json")
const MAX_ATTEMPTS = 5
const BLOCK_WINDOW_MS = 30_000

let attemptState: { count: number; blockedUntil: number } = {
	count: 0,
	blockedUntil: 0,
}
let cachedStatus: LicenseStatus | null = null

// Clock skew detection - stored timestamp of last valid check
const CLOCK_PATH = () => join(app.getPath("userData"), ".clock")
let lastValidTime = 0
const MAX_CLOCK_DRIFT_MS = 24 * 60 * 60 * 1000 // 24h backwards tolerance

// Heartbeat interval ref
let heartbeatInterval: ReturnType<typeof setInterval> | null = null
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const FEATURE_MAP: Record<string, string> = {
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

function nowMs(): number {
	return Date.now()
}

// ========== CLOCK SKEW DETECTION ==========

function loadLastValidTime(): void {
	try {
		const raw = readFileSync(CLOCK_PATH(), "utf8")
		const parsed = parseInt(raw, 10)
		if (!isNaN(parsed)) lastValidTime = parsed
	} catch (_) {
		lastValidTime = 0
	}
}

function saveLastValidTime(): void {
	try {
		const dir = dirname(CLOCK_PATH())
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
		writeFileSync(CLOCK_PATH(), String(nowMs()), "utf8")
	} catch (_) {
		// Ignore write failures
	}
}

function checkClockSkew(): boolean {
	const now = nowMs()
	if (lastValidTime > 0 && now < lastValidTime - MAX_CLOCK_DRIFT_MS) {
		// Clock went backwards significantly - possible tampering
		console.error("Clock manipulation detected")
		return false
	}
	lastValidTime = now
	saveLastValidTime()
	return true
}

// ========== INTEGRITY CHECK ==========

function checkLicenseFileIntegrity(): boolean {
	try {
		const path = LICENSE_PATH()
		if (!existsSync(path)) return true // No file is OK
		const raw = readFileSync(path, "utf8")
		const parsed = JSON.parse(raw) as {
			token?: string
			fingerprint?: string
			integrity?: string
		}
		if (!parsed.integrity || !parsed.token || !parsed.fingerprint) return true
		const expected = createHash("sha256")
			.update(parsed.token + "|" + parsed.fingerprint)
			.digest("hex")
		return parsed.integrity === expected
	} catch (_) {
		return false
	}
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonicalize)
	}
	if (value && typeof value === "object") {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<Record<string, unknown>>((acc, key) => {
				acc[key] = canonicalize((value as Record<string, unknown>)[key])
				return acc
			}, {})
	}
	return value
}

function canonicalStringify(payload: LicensePayload): string {
	return JSON.stringify(canonicalize(payload))
}

function loadAttempts(): void {
	try {
		const raw = readFileSync(ATTEMPT_PATH(), "utf8")
		const parsed = JSON.parse(raw) as { count: number; blockedUntil: number }
		if (
			typeof parsed.count === "number" &&
			typeof parsed.blockedUntil === "number"
		) {
			attemptState = parsed
		}
	} catch (_) {
		attemptState = { count: 0, blockedUntil: 0 }
	}
}

function saveAttempts(): void {
	try {
		const dir = dirname(ATTEMPT_PATH())
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
		writeFileSync(ATTEMPT_PATH(), JSON.stringify(attemptState), "utf8")
	} catch (err) {
		console.error("Failed to persist attempt state", err)
	}
}

function decodeToken(token: string): {
	payload: LicensePayload
	signature: Buffer
} {
	const parts = token.split(".")
	if (parts.length !== 2) {
		throw new Error("TOKEN_FORMAT")
	}
	const [payloadB64, signatureB64] = parts
	const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8")
	const payload = JSON.parse(payloadJson) as LicensePayload
	const signature = Buffer.from(signatureB64, "base64url")
	return { payload, signature }
}

function deriveKey(fingerprint: string, nonce: string): Buffer {
	return createHash("sha256").update(`${fingerprint}|${nonce}`).digest()
}

function encryptToken(token: string, fingerprint: string, nonce: string) {
	const key = deriveKey(fingerprint, nonce)
	const iv = randomBytes(12)
	const cipher = createCipheriv("aes-256-gcm", key, iv)
	const enc = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
	const tag = cipher.getAuthTag()
	const payload = {
		iv: iv.toString("base64"),
		data: enc.toString("base64"),
		tag: tag.toString("base64"),
	}
	writeFileSync(LICENSE_ENC_PATH(), JSON.stringify(payload), "utf8")
}

function decryptToken(fingerprint: string): string | null {
	try {
		if (!existsSync(LICENSE_ENC_PATH())) return null
		const raw = JSON.parse(readFileSync(LICENSE_ENC_PATH(), "utf8")) as {
			iv: string
			data: string
			tag: string
		}
		if (!raw.iv || !raw.data || !raw.tag) return null
		const iv = Buffer.from(raw.iv, "base64")
		const data = Buffer.from(raw.data, "base64")
		const tag = Buffer.from(raw.tag, "base64")
		// We need the nonce to derive the key; attempt to parse it from plaintext cache as fallback
		const { payload } = loadLicenseFromDiskPlain() ?? {}
		const nonce = payload?.nonce
		if (!nonce) return null
		const key = deriveKey(fingerprint, nonce)
		const decipher = createDecipheriv("aes-256-gcm", key, iv)
		decipher.setAuthTag(tag)
		const dec = Buffer.concat([decipher.update(data), decipher.final()])
		return dec.toString("utf8")
	} catch (err) {
		console.error("decryptToken failed", err)
		return null
	}
}

function verifyPayloadSignature(
	payload: LicensePayload,
	signature: Buffer,
): boolean {
	try {
		const canonical = canonicalStringify(payload)
		return verifySig(null, Buffer.from(canonical), PUBLIC_KEY, signature)
	} catch (err) {
		console.error("verifyPayloadSignature error", err)
		return false
	}
}

function isExpired(payload: LicensePayload): boolean {
	if (!payload.expiresAt) return false
	return new Date(payload.expiresAt).getTime() < Date.now()
}

function getHardwareFingerprint(): string {
	const machineId = machineIdSync()
	const hostname = os.hostname()
	const platform = os.platform()
	return createHash("sha256")
		.update(`${machineId}|${hostname}|${platform}`)
		.digest("hex")
}

function persistLicense(
	token: string,
	payload: LicensePayload,
	fingerprint: string,
) {
	const path = LICENSE_PATH()
	const dir = dirname(path)
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
	const body = {
		token,
		payload,
		fingerprint,
		storedAt: new Date().toISOString(),
		integrity: createHash("sha256")
			.update(token + "|" + fingerprint)
			.digest("hex"),
	}
	writeFileSync(path, JSON.stringify(body, null, 2), "utf8")
	try {
		if (payload.nonce) encryptToken(token, fingerprint, payload.nonce)
	} catch (err) {
		console.error("Failed to encrypt license copy", err)
	}
}

function loadLicenseFromDiskPlain(): {
	token?: string
	payload?: LicensePayload
} | null {
	try {
		const path = LICENSE_PATH()
		if (!existsSync(path)) return null
		const raw = readFileSync(path, "utf8")
		const parsed = JSON.parse(raw) as {
			token?: string
			payload?: LicensePayload
		}
		return { token: parsed.token, payload: parsed.payload }
	} catch (err) {
		console.error("loadLicenseFromDisk", err)
		return null
	}
}

function buildStatus(
	valid: boolean,
	code: LicenseStatus["code"],
	message: string,
	payload?: LicensePayload,
	token?: string,
): LicenseStatus {
	const fingerprint = getHardwareFingerprint()
	const base: LicenseStatus = {
		valid,
		code,
		message,
		license: payload,
		fingerprint,
		token,
	}
	return base
}

function validatePayload(
	payload: LicensePayload,
	fingerprint: string,
): LicenseStatus {
	if (!payload || (payload.version !== 1 && payload.version !== 2)) {
		return buildStatus(false, "MALFORMED", "Licença malformada")
	}

	const fingerprintAllowed = Boolean(
		(payload.allowedFingerprints || []).includes(fingerprint) ||
			!payload.allowedFingerprints ||
			payload.allowedFingerprints.length === 0,
	)

	if (
		payload.hwFingerprint &&
		payload.hwFingerprint !== fingerprint &&
		!fingerprintAllowed
	) {
		return buildStatus(
			false,
			"FINGERPRINT_MISMATCH",
			"Licença não corresponde a este dispositivo",
		)
	}

	if (
		!fingerprintAllowed &&
		payload.allowedFingerprints &&
		payload.allowedFingerprints.length > 0
	) {
		return buildStatus(
			false,
			"FINGERPRINT_MISMATCH",
			"Fingerprint não autorizado para esta licença",
		)
	}

	if (payload.productPath) {
		try {
			const appPath = app.getAppPath()
			if (!appPath.includes(payload.productPath)) {
				return buildStatus(
					false,
					"MALFORMED",
					"Licença não corresponde a esta instalação",
				)
			}
		} catch (_) {
			// ignore path check failures
		}
	}

	if (isExpired(payload)) {
		const graceDays = payload.graceDays ?? 0
		if (graceDays > 0) {
			const diffDays = Math.ceil(
				(Date.now() - new Date(payload.expiresAt ?? 0).getTime()) /
					(1000 * 60 * 60 * 24),
			)
			if (diffDays <= graceDays) {
				return buildStatus(
					true,
					"EXPIRED_GRACE",
					"Licença em período de carência",
					payload,
				)
			}
		}
		return buildStatus(false, "EXPIRED", "Licença expirada", payload)
	}

	return buildStatus(true, "OK", "Licença válida", payload)
}

function resetAttempts() {
	attemptState = { count: 0, blockedUntil: 0 }
	saveAttempts()
}

function registerFailure(): LicenseStatus {
	const now = nowMs()
	if (attemptState.blockedUntil && now < attemptState.blockedUntil) {
		const retryInSeconds = Math.ceil((attemptState.blockedUntil - now) / 1000)
		return {
			valid: false,
			code: "RATE_LIMIT",
			message: "Muitas tentativas. Aguarde e tente novamente.",
			retryInSeconds,
			attemptsLeft: 0,
			fingerprint: getHardwareFingerprint(),
		}
	}

	attemptState.count += 1
	const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attemptState.count)
	saveAttempts()

	if (attemptState.count >= MAX_ATTEMPTS) {
		attemptState.blockedUntil = now + BLOCK_WINDOW_MS
		saveAttempts()
		return {
			valid: false,
			code: "RATE_LIMIT",
			message: `Limite de tentativas atingido. Aguarde ${BLOCK_WINDOW_MS / 1000}s para tentar de novo.`,
			retryInSeconds: Math.ceil(BLOCK_WINDOW_MS / 1000),
			attemptsLeft: 0,
			fingerprint: getHardwareFingerprint(),
		}
	}

	return {
		valid: false,
		code: "INVALID_SIGNATURE",
		message: "Licença inválida",
		attemptsLeft,
		fingerprint: getHardwareFingerprint(),
	}
}

export function getLicenseStatus(): LicenseStatus {
	const fingerprint = getHardwareFingerprint()
	try {
		const plain = loadLicenseFromDiskPlain()
		let token = plain?.token
		let payload = plain?.payload

		if (!token || !payload) {
			const decrypted = decryptToken(fingerprint)
			if (decrypted) {
				const decoded = decodeToken(decrypted)
				token = decrypted
				payload = decoded.payload
			}
		}

		if (!token || !payload) {
			cachedStatus = buildStatus(
				false,
				"NO_LICENSE",
				"Nenhuma licença encontrada",
			)
			return cachedStatus
		}

		const { signature, payload: decodedPayload } = decodeToken(token)
		if (JSON.stringify(decodedPayload) !== JSON.stringify(payload)) {
			cachedStatus = buildStatus(false, "MALFORMED", "Licença corrompida")
			return cachedStatus
		}

		if (!verifyPayloadSignature(payload, signature)) {
			cachedStatus = buildStatus(
				false,
				"INVALID_SIGNATURE",
				"Assinatura inválida",
			)
			return cachedStatus
		}

		cachedStatus = validatePayload(payload, fingerprint)
		cachedStatus.token = token
		return cachedStatus
	} catch (err) {
		console.error("getLicenseStatus error", err)
		cachedStatus = buildStatus(false, "INTERNAL_ERROR", "Erro ao ler licença")
		return cachedStatus
	}
}

export function activateLicense(token: string): LicenseStatus {
	const fingerprint = getHardwareFingerprint()
	const now = nowMs()
	if (attemptState.blockedUntil && now < attemptState.blockedUntil) {
		const retryInSeconds = Math.ceil((attemptState.blockedUntil - now) / 1000)
		return {
			valid: false,
			code: "RATE_LIMIT",
			message: "Muitas tentativas. Aguarde para tentar novamente.",
			retryInSeconds,
			attemptsLeft: 0,
			fingerprint,
		}
	}

	try {
		const { payload, signature } = decodeToken(token)
		const signatureOk = verifyPayloadSignature(payload, signature)
		if (!signatureOk) {
			return registerFailure()
		}

		const status = validatePayload(payload, fingerprint)
		if (!status.valid) {
			return status
		}

		persistLicense(token, payload, fingerprint)
		resetAttempts()
		cachedStatus = status
		cachedStatus.token = token
		return status
	} catch (err) {
		console.error("activateLicense error", err)
		return buildStatus(false, "MALFORMED", "Licença inválida ou malformada")
	}
}

export function requireLicense(feature?: string): LicenseStatus {
	// Security pre-checks at every call
	if (!checkCanary()) {
		return buildStatus(false, "INTERNAL_ERROR", "Falha de integridade")
	}

	// Periodic anti-debug (not every call to avoid perf hit)
	if (Math.random() < 0.1) {
		if (!antiDebugCheck()) {
			return buildStatus(false, "INTERNAL_ERROR", "Ambiente comprometido")
		}
	}

	const status = cachedStatus ?? getLicenseStatus()
	if (!status.valid) {
		return {
			...status,
			message: feature
				? `Licença requerida para acessar ${feature}`
				: status.message || "Licença requerida",
		}
	}

	if (feature && status.license) {
		const requiredFeature = FEATURE_MAP[feature]
		const features = status.license.features || []
		const hasFull = features.includes("full")
		const hasRequired = requiredFeature
			? features.includes(requiredFeature)
			: true
		if (!hasFull && !hasRequired) {
			return {
				valid: false,
				code: "FEATURE_MISSING",
				message: `Licença sem permissão para ${feature}`,
				license: status.license,
				fingerprint: status.fingerprint,
			}
		}
	}

	return status
}

export function getFingerprint(): { fingerprint: string } {
	return { fingerprint: getHardwareFingerprint() }
}

// ========== HEARTBEAT ==========

function heartbeat(): void {
	// Periodic re-validation
	if (!antiDebugCheck()) {
		cachedStatus = buildStatus(false, "INTERNAL_ERROR", "Ambiente comprometido")
		return
	}
	if (!checkCanary()) {
		cachedStatus = buildStatus(false, "INTERNAL_ERROR", "Falha de integridade")
		return
	}
	if (!checkClockSkew()) {
		cachedStatus = buildStatus(
			false,
			"INTERNAL_ERROR",
			"Manipulação de relógio detectada",
		)
		return
	}
	// Re-validate license
	const newStatus = getLicenseStatus()
	if (!newStatus.valid && cachedStatus?.valid) {
		// License became invalid
		cachedStatus = newStatus
	}
}

function startHeartbeat(): void {
	if (heartbeatInterval) return
	heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
	// Run once immediately
	setTimeout(heartbeat, 10_000)
}

function stopHeartbeat(): void {
	if (heartbeatInterval) {
		clearInterval(heartbeatInterval)
		heartbeatInterval = null
	}
}

export function initLicense() {
	loadAttempts()
	loadLastValidTime()

	// Pre-flight security checks
	if (!checkLicenseFileIntegrity()) {
		cachedStatus = buildStatus(
			false,
			"MALFORMED",
			"Arquivo de licença corrompido",
		)
		return
	}

	if (!checkClockSkew()) {
		cachedStatus = buildStatus(
			false,
			"INTERNAL_ERROR",
			"Erro de sincronização de tempo",
		)
		return
	}

	cachedStatus = getLicenseStatus()

	// Start background monitoring
	if (cachedStatus.valid) {
		startHeartbeat()
	}
}

export function shutdownLicense(): void {
	stopHeartbeat()
}
