import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"
import { antiDebugCheck } from "../utils/anti-debug"
import { checkCanary } from "../utils/anti-tampering"
import { CLOCK_PATH, MAX_CLOCK_DRIFT_MS } from "./config"

let lastValidTime = 0

export function loadLastValidTime(): void {
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
		writeFileSync(CLOCK_PATH(), String(Date.now()), "utf8")
	} catch (_) {
		// Ignore write failures
	}
}

export function checkClockSkew(): boolean {
	const now = Date.now()
	if (lastValidTime > 0 && now < lastValidTime - MAX_CLOCK_DRIFT_MS) {
		console.error("Clock manipulation detected")
		return false
	}
	lastValidTime = now
	saveLastValidTime()
	return true
}

export function runSecurityChecks(): { valid: boolean; message?: string } {
	if (!checkCanary()) {
		return { valid: false, message: "Falha de integridade" }
	}
	return { valid: true }
}

export function runPeriodicSecurityCheck(): { valid: boolean; message?: string } {
	if (Math.random() < 0.1) {
		if (!antiDebugCheck()) {
			return { valid: false, message: "Ambiente comprometido" }
		}
	}
	return { valid: true }
}

export function runAntiDebugCheck(): boolean {
	return antiDebugCheck()
}
