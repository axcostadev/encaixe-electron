import { createHash, verify as verifySig } from "crypto"
import { app } from "electron"
import { PUBLIC_KEY } from "./config"
import { getHardwareFingerprint } from "./fingerprint"
import type { LicensePayload, LicenseStatus } from "./types"

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

export function decodeToken(token: string): {
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

export function verifyPayloadSignature(
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

export function buildStatus(
	valid: boolean,
	code: LicenseStatus["code"],
	message: string,
	payload?: LicensePayload,
	token?: string,
): LicenseStatus {
	return {
		valid,
		code,
		message,
		license: payload,
		fingerprint: getHardwareFingerprint(),
		token,
	}
}

export function validatePayload(
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
