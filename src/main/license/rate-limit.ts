import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"
import { ATTEMPT_PATH, BLOCK_WINDOW_MS, MAX_ATTEMPTS } from "./config"
import { getHardwareFingerprint } from "./fingerprint"
import type { LicenseStatus } from "./types"

let attemptState: { count: number; blockedUntil: number } = {
	count: 0,
	blockedUntil: 0,
}

export function loadAttempts(): void {
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

export function resetAttempts(): void {
	attemptState = { count: 0, blockedUntil: 0 }
	saveAttempts()
}

export function isBlocked(): { blocked: boolean; retryInSeconds?: number } {
	const now = Date.now()
	if (attemptState.blockedUntil && now < attemptState.blockedUntil) {
		const retryInSeconds = Math.ceil((attemptState.blockedUntil - now) / 1000)
		return { blocked: true, retryInSeconds }
	}
	return { blocked: false }
}

export function registerFailure(): LicenseStatus {
	const now = Date.now()
	const blockCheck = isBlocked()
	if (blockCheck.blocked) {
		return {
			valid: false,
			code: "RATE_LIMIT",
			message: "Muitas tentativas. Aguarde e tente novamente.",
			retryInSeconds: blockCheck.retryInSeconds,
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
