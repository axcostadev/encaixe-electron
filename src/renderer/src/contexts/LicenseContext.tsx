import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

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
	license?: {
		licenseId: string
		productId: string
		customerId?: string
		issuedAt: string
		expiresAt?: string
		features: string[]
		maxActivations?: number
		hwFingerprint?: string
		allowedFingerprints?: string[]
		graceDays?: number
		revocationListVersion?: number
		productPath?: string
		nonce: string
		version: 1 | 2
	}
	retryInSeconds?: number
	attemptsLeft?: number
	fingerprint?: string
	token?: string
	/** Dias restantes calculados pelo servidor (protegido) */
	daysRemaining?: number
	/** Timestamp do servidor para validação */
	serverTime?: number
}

interface LicenseContextValue {
	status: LicenseStatus | null
	loading: boolean
	activate: (token: string) => Promise<LicenseStatus>
	refresh: () => Promise<LicenseStatus>
	isValid: boolean
	fingerprint: string | undefined
}

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined)

export function LicenseProvider({ children }: { children: React.ReactNode }) {
	const [status, setStatus] = useState<LicenseStatus | null>(null)
	const [loading, setLoading] = useState(true)

	const refresh = useCallback(async () => {
		const res: LicenseStatus = await window.api.license.status()
		setStatus(res)
		setLoading(false)
		return res
	}, [])

	useEffect(() => {
		void refresh()
	}, [refresh])

	const activate = useCallback(async (token: string) => {
		setLoading(true)
		const res: LicenseStatus = await window.api.license.activate(token)
		setStatus(res)
		setLoading(false)
		return res
	}, [])

	const fingerprint = useMemo(() => status?.fingerprint, [status?.fingerprint])

	const value = useMemo<LicenseContextValue>(
		() => ({
			status,
			loading,
			activate,
			refresh,
			isValid: Boolean(status?.valid),
			fingerprint,
		}),
		[status, loading, activate, refresh, fingerprint],
	)

	return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>
}

export function useLicense() {
	const ctx = useContext(LicenseContext)
	if (!ctx) throw new Error("useLicense must be used within LicenseProvider")
	return ctx
}
