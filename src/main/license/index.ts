import { FEATURE_MAP, HEARTBEAT_INTERVAL_MS } from "./config"
import { getHardwareFingerprint } from "./fingerprint"
import { isBlocked, loadAttempts, registerFailure, resetAttempts } from "./rate-limit"
import {
	checkClockSkew,
	loadLastValidTime,
	runAntiDebugCheck,
	runPeriodicSecurityCheck,
	runSecurityChecks,
} from "./security"
import {
	checkLicenseFileIntegrity,
	decryptToken,
	loadLicenseFromDisk,
	persistLicense,
} from "./storage"
import type { LicenseStatus } from "./types"
import {
	buildStatus,
	decodeToken,
	validatePayload,
	verifyPayloadSignature,
} from "./validation"

export type { LicensePayload, LicenseStatus } from "./types"

let cachedStatus: LicenseStatus | null = null
let heartbeatInterval: ReturnType<typeof setInterval> | null = null

// ========== PUBLIC API ==========

export function getLicenseStatus(): LicenseStatus {
	const fingerprint = getHardwareFingerprint()
	try {
		const plain = loadLicenseFromDisk()
		let token = plain?.token
		let payload = plain?.payload

		if (!token || !payload) {
			const decrypted = decryptToken(fingerprint, () => plain?.payload?.nonce)
			if (decrypted) {
				const decoded = decodeToken(decrypted)
				token = decrypted
				payload = decoded.payload
			}
		}

		if (!token || !payload) {
			cachedStatus = buildStatus(false, "NO_LICENSE", "Nenhuma licença encontrada")
			return cachedStatus
		}

		const { signature, payload: decodedPayload } = decodeToken(token)
		if (JSON.stringify(decodedPayload) !== JSON.stringify(payload)) {
			cachedStatus = buildStatus(false, "MALFORMED", "Licença corrompida")
			return cachedStatus
		}

		if (!verifyPayloadSignature(payload, signature)) {
			cachedStatus = buildStatus(false, "INVALID_SIGNATURE", "Assinatura inválida")
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
	const blockCheck = isBlocked()
	if (blockCheck.blocked) {
		return {
			valid: false,
			code: "RATE_LIMIT",
			message: "Muitas tentativas. Aguarde para tentar novamente.",
			retryInSeconds: blockCheck.retryInSeconds,
			attemptsLeft: 0,
			fingerprint,
		}
	}

	try {
		const { payload, signature } = decodeToken(token)
		if (!verifyPayloadSignature(payload, signature)) {
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
	const securityCheck = runSecurityChecks()
	if (!securityCheck.valid) {
		return buildStatus(false, "INTERNAL_ERROR", securityCheck.message!)
	}

	const periodicCheck = runPeriodicSecurityCheck()
	if (!periodicCheck.valid) {
		return buildStatus(false, "INTERNAL_ERROR", periodicCheck.message!)
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
		const hasRequired = requiredFeature ? features.includes(requiredFeature) : true
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
	if (!runAntiDebugCheck()) {
		cachedStatus = buildStatus(false, "INTERNAL_ERROR", "Ambiente comprometido")
		return
	}
	const securityCheck = runSecurityChecks()
	if (!securityCheck.valid) {
		cachedStatus = buildStatus(false, "INTERNAL_ERROR", securityCheck.message!)
		return
	}
	if (!checkClockSkew()) {
		cachedStatus = buildStatus(false, "INTERNAL_ERROR", "Manipulação de relógio detectada")
		return
	}
	const newStatus = getLicenseStatus()
	if (!newStatus.valid && cachedStatus?.valid) {
		cachedStatus = newStatus
	}
}

function startHeartbeat(): void {
	if (heartbeatInterval) return
	heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
	setTimeout(heartbeat, 10_000)
}

function stopHeartbeat(): void {
	if (heartbeatInterval) {
		clearInterval(heartbeatInterval)
		heartbeatInterval = null
	}
}

// ========== LIFECYCLE ==========

export function initLicense(): void {
	loadAttempts()
	loadLastValidTime()

	if (!checkLicenseFileIntegrity()) {
		cachedStatus = buildStatus(false, "MALFORMED", "Arquivo de licença corrompido")
		return
	}

	if (!checkClockSkew()) {
		cachedStatus = buildStatus(false, "INTERNAL_ERROR", "Erro de sincronização de tempo")
		return
	}

	cachedStatus = getLicenseStatus()

	if (cachedStatus.valid) {
		startHeartbeat()
	}
}

export function shutdownLicense(): void {
	stopHeartbeat()
}
