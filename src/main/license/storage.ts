import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"
import { LICENSE_ENC_PATH, LICENSE_PATH } from "./config"
import type { LicensePayload } from "./types"

export function deriveKey(fingerprint: string, nonce: string): Buffer {
	return createHash("sha256").update(`${fingerprint}|${nonce}`).digest()
}

export function encryptToken(token: string, fingerprint: string, nonce: string): void {
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

export function decryptToken(fingerprint: string, getNonce: () => string | undefined): string | null {
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
		const nonce = getNonce()
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

export function persistLicense(
	token: string,
	payload: LicensePayload,
	fingerprint: string,
): void {
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

export function loadLicenseFromDisk(): {
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

export function checkLicenseFileIntegrity(): boolean {
	try {
		const path = LICENSE_PATH()
		if (!existsSync(path)) return true
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
