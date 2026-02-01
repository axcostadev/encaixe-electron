import { ShieldCheck, RefreshCw, Link as LinkIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useLicense } from "@renderer/contexts/LicenseContext"
import { Link } from "react-router-dom"

function formatDate(value?: string) {
	if (!value) return "—"
	try {
		return new Date(value).toLocaleString()
	} catch {
		return value
	}
}

function daysLeft(expiresAt?: string) {
	if (!expiresAt) return "Sem expiração"
	const diff = new Date(expiresAt).getTime() - Date.now()
	const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
	return days >= 0 ? `${days} dia(s)` : "Expirada"
}

export function LicenseStatusPage() {
	const { status, refresh } = useLicense()
	const [busy, setBusy] = useState(false)

	const info = useMemo(() => {
		return {
			licenseId: status?.license?.licenseId || "—",
			productId: status?.license?.productId || "—",
			customerId: status?.license?.customerId || "—",
			issuedAt: formatDate(status?.license?.issuedAt),
			expiresAt: formatDate(status?.license?.expiresAt),
			daysLeft: daysLeft(status?.license?.expiresAt),
			features: status?.license?.features?.join(", ") || "—",
			fingerprint: status?.fingerprint || "—",
			maxActivations: status?.license?.maxActivations ?? "—",
			tokenPreview: status?.token
				? `${status.token.slice(0, 16)}…${status.token.slice(-8)}`
				: "—",
			valid: status?.valid || false,
			message: status?.message || (status?.valid ? "Licença válida" : "Licença não encontrada"),
		}
	}, [status])

	const handleRefresh = async () => {
		setBusy(true)
		await refresh()
		setBusy(false)
	}

	return (
		<div className="space-y-6">
			<header className="flex items-center gap-3">
				<div className="h-11 w-11 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
					<ShieldCheck className="h-6 w-6" />
				</div>
				<div>
					<p className="text-sm text-muted-foreground">Licenciamento</p>
					<h1 className="text-xl font-semibold">Status da Licença</h1>
				</div>
				<div className="ml-auto flex items-center gap-3">
					<Link
						to="/license"
						className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
						title="Tela de ativação"
					>
						<LinkIcon className="h-4 w-4" />
						Ativar / Trocar licença
					</Link>
					<button
						onClick={handleRefresh}
						disabled={busy}
						className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-600 disabled:opacity-60"
					>
						<RefreshCw className="h-4 w-4" />
						{busy ? "Atualizando..." : "Atualizar status"}
					</button>
				</div>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<p className="text-xs uppercase text-muted-foreground">Situação</p>
					<p className="text-lg font-semibold">
						{info.valid ? "Licença válida" : "Licença inválida"}
					</p>
					<p className="text-sm text-muted-foreground">{info.message}</p>
				</div>
				<div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
					<p className="text-xs uppercase text-muted-foreground">Expiração</p>
					<p className="text-lg font-semibold">{info.daysLeft}</p>
					<p className="text-sm text-muted-foreground">Expira em: {info.expiresAt}</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card label="Licença" value={info.licenseId} />
				<Card label="Produto" value={info.productId} />
				<Card label="Cliente" value={info.customerId} />
				<Card label="Emitida em" value={info.issuedAt} />
				<Card label="Features" value={info.features} />
				<Card label="Máx. ativações" value={String(info.maxActivations)} />
				<Card label="Fingerprint" value={info.fingerprint} mono />
				<Card label="Token" value={info.tokenPreview} mono />
			</div>
		</div>
	)
}

function Card({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
	return (
		<div className="rounded-xl border border-border bg-muted/30 p-4">
			<p className="text-xs uppercase text-muted-foreground">{label}</p>
			<p className={`text-sm font-medium ${mono ? "font-mono break-all" : ""}`}>
				{value || "—"}
			</p>
		</div>
	)
}

export default LicenseStatusPage
