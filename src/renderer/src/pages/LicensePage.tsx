import { useEffect, useState } from "react"
import { useLicense } from "../contexts/LicenseContext"
import { useNavigate } from "react-router-dom"

export function LicensePage() {
	const { status, activate, loading, fingerprint } = useLicense()
	const navigate = useNavigate()
	const [token, setToken] = useState("")
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState<string | undefined>(undefined)

	useEffect(() => {
		if (status?.valid) {
			navigate("/", { replace: true })
		}
	}, [status?.valid, navigate])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!token.trim()) return
		setBusy(true)
		const res = await activate(token.trim())
		setMessage(res.message || (res.valid ? "Licença ativada" : "Licença inválida"))
		setBusy(false)
		if (res.valid) {
			navigate("/", { replace: true })
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
			<div className="w-full max-w-xl rounded-2xl bg-slate-900/70 border border-slate-800 shadow-2xl p-8 space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">Ative sua licença</h1>
					<p className="text-sm text-slate-300">
						Cole o código da licença. Enquanto não ativar, as funcionalidades ficam
						indisponíveis.
					</p>
				</div>

				<div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
					<p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Fingerprint do dispositivo</p>
					<code className="block break-all text-sm text-amber-200">{fingerprint || "calculando..."}</code>
					<p className="text-xs text-slate-400 mt-2">Envie este código para gerar a licença vinculada ao hardware.</p>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<label className="block text-sm font-medium text-slate-200">
						Código da licença
						<textarea
							className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-slate-50 focus:border-emerald-500 focus:outline-none"
							rows={4}
							placeholder="payload.assinatura"
							value={token}
							onChange={(e) => setToken(e.target.value)}
							disabled={busy || loading}
						/>
					</label>
					<button
						type="submit"
						disabled={busy || loading || !token.trim()}
						className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-3 transition"
					>
						{busy || loading ? "Validando..." : "Ativar"}
					</button>
				</form>

				<div className="text-sm text-slate-200 space-y-1">
					<p className="flex items-center justify-between">
						<span>Status:</span>
						<span className={status?.valid ? "text-emerald-400" : "text-amber-300"}>
							{status?.valid ? "Licença válida" : status?.message || "Não ativada"}
						</span>
					</p>
					{status?.retryInSeconds !== undefined && status.retryInSeconds > 0 && (
						<p className="text-xs text-amber-300">
							Aguarde {status.retryInSeconds}s antes de tentar novamente.
						</p>
					)}
					{status?.attemptsLeft !== undefined && status.attemptsLeft >= 0 && (
						<p className="text-xs text-slate-400">Tentativas restantes: {status.attemptsLeft}</p>
					)}
					{message && <p className="text-xs text-slate-300">{message}</p>}
				</div>

				{status?.license && (
					<div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200 space-y-1">
						<p><span className="text-slate-400">Licença:</span> {status.license.licenseId}</p>
						<p><span className="text-slate-400">Produto:</span> {status.license.productId}</p>
						{status.license.customerId && (
							<p><span className="text-slate-400">Cliente:</span> {status.license.customerId}</p>
						)}
						{status.license.expiresAt && (
							<p><span className="text-slate-400">Expira em:</span> {new Date(status.license.expiresAt).toLocaleString()}</p>
						)}
						<p className="text-slate-400">Features: {status.license.features.join(", ") || "nenhuma"}</p>
					</div>
				)}
			</div>
		</div>
	)
}

export default LicensePage
