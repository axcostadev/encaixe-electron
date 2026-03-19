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

// No-license branch: desativa validação de licença por padrão (pode ser desativado explicitamente)
const NO_LICENSE = process.env.NO_LICENSE !== "false"

export function LicenseProvider({ children }: { children: React.ReactNode }) {
	// NO-LICENSE BRANCH: licença sempre válida para testes na fábrica
	const bypassStatus: LicenseStatus = {
		valid: true,
		code: "OK",
		message: "Licença desativada (modo teste)",
	}

	const [status, setStatus] = useState<LicenseStatus | null>(NO_LICENSE ? bypassStatus : null)
	const [loading, setLoading] = useState(NO_LICENSE ? false : true)

	const refresh = useCallback(async () => {
		if (NO_LICENSE) {
			setStatus(bypassStatus)
			setLoading(false)
			return bypassStatus
		}

		try {
			const res: LicenseStatus = await window.api.license.status()
			setStatus(res)
			return res
		} catch (error) {
			console.error("Falha ao consultar status da licenca:", error)
			const fallback: LicenseStatus = {
				valid: false,
				code: "INTERNAL_ERROR",
				message: "Nao foi possivel validar a licenca",
			}
			setStatus(fallback)
			return fallback
		} finally {
			setLoading(false)
		}
	}, [])

	const activate = useCallback(async (token: string) => {
		if (NO_LICENSE) {
			return bypassStatus
		}
		try {
			const res: LicenseStatus = await window.api.license.activate(token)
			setStatus(res)
			return res
		} catch (error) {
			console.error("Falha ao ativar licença:", error)
			const fallback: LicenseStatus = {
				valid: false,
				code: "INTERNAL_ERROR",
				message: "Erro ao ativar a licença",
			}
			setStatus(fallback)
			return fallback
		}
	}, [])

	useEffect(() => {
		if (!NO_LICENSE) {
			void refresh()
		}
	}, [refresh])

	const fingerprint = useMemo(() => (NO_LICENSE ? undefined : status?.fingerprint), [status])

	const value = useMemo<LicenseContextValue>(
		() => ({
			status,
			loading,
			activate,
			refresh,
			isValid: NO_LICENSE ? true : Boolean(status?.valid),
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
