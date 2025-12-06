import { Button } from "@renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@renderer/components/ui/select"
import { Textarea } from "@renderer/components/ui/textarea"
import { Material, SENTIDO_OPTIONS, SentidoType } from "@renderer/types"
import { useEffect, useState } from "react"

interface MaterialFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (data: Omit<Material, "id">) => void
	material?: Material | null
}

export function MaterialForm({
	open,
	onOpenChange,
	onSubmit,
	material,
}: MaterialFormProps) {
	const [artigo, setArtigo] = useState("")
	const [largura, setLargura] = useState("")
	const [obs, setObs] = useState("")
	const [sentido, setSentido] = useState<SentidoType>("S")

	useEffect(() => {
		if (material) {
			setArtigo(material.artigo)
			setLargura(material.largura.toString())
			setObs(material.obs || "")
			setSentido(material.sentido)
		} else {
			setArtigo("")
			setLargura("")
			setObs("")
			setSentido("S")
		}
	}, [material, open])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!artigo.trim() || !largura) return
		onSubmit({
			artigo: artigo.trim(),
			largura: parseFloat(largura),
			obs: obs.trim() || undefined,
			sentido,
		})
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md animate-scale-in">
				<DialogHeader>
					<DialogTitle>
						{material ? "Editar Material" : "Novo Material"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="artigo">Artigo</Label>
						<Input
							id="artigo"
							value={artigo}
							onChange={(e) => setArtigo(e.target.value)}
							placeholder="Digite o artigo do material"
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="largura">Largura (cm)</Label>
							<Input
								id="largura"
								type="number"
								step="0.01"
								min="0"
								value={largura}
								onChange={(e) => setLargura(e.target.value)}
								placeholder="0.00"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="sentido">Sentido</Label>
							<Select
								value={sentido}
								onValueChange={(v: SentidoType) => setSentido(v)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SENTIDO_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="obs">Observação (opcional)</Label>
						<Textarea
							id="obs"
							value={obs}
							onChange={(e) => setObs(e.target.value)}
							placeholder="Observações adicionais..."
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit">{material ? "Salvar" : "Criar"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
