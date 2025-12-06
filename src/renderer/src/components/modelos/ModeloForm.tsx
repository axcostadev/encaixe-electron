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
import { Modelo } from "@renderer/types"
import { useEffect, useState } from "react"

interface ModeloFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (data: { artigo: string; nome: string }) => void
	modelo?: Modelo | null
}

export function ModeloForm({
	open,
	onOpenChange,
	onSubmit,
	modelo,
}: ModeloFormProps) {
	const [artigo, setArtigo] = useState("")
	const [nome, setNome] = useState("")

	useEffect(() => {
		if (modelo) {
			setArtigo(modelo.artigo)
			setNome(modelo.nome)
		} else {
			setArtigo("")
			setNome("")
		}
	}, [modelo, open])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!artigo.trim() || !nome.trim()) return
		onSubmit({ artigo: artigo.trim(), nome: nome.trim() })
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md animate-scale-in">
				<DialogHeader>
					<DialogTitle>{modelo ? "Editar Modelo" : "Novo Modelo"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="artigo">Artigo</Label>
						<Input
							id="artigo"
							value={artigo}
							onChange={(e) => setArtigo(e.target.value)}
							placeholder="Digite o artigo"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="nome">Nome</Label>
						<Input
							id="nome"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							placeholder="Digite o nome do modelo"
							required
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
						<Button type="submit">{modelo ? "Salvar" : "Criar"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
