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
		| "CLOCK_TAMPER"
		| "INTERNAL_ERROR"
	message?: string
	license?: LicensePayload
	retryInSeconds?: number
	attemptsLeft?: number
	fingerprint?: string
	token?: string
	/** Dias restantes calculados pelo servidor (protegido) */
	daysRemaining?: number
	/** Timestamp do servidor para validação */
	serverTime?: number
}
