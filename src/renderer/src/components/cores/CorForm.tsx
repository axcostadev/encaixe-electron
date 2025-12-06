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
import { Cor } from "@renderer/types"
import { useEffect, useState } from "react"

interface CorFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (data: { abreviacao: string; nome: string }) => void
	cor?: Cor | null
}

export function CorForm({ open, onOpenChange, onSubmit, cor }: CorFormProps) {
	const [abreviacao, setAbreviacao] = useState("")
	const [nome, setNome] = useState("")

	useEffect(() => {
		if (cor) {
			setAbreviacao(cor.abreviacao)
			setNome(cor.nome)
		} else {
			setAbreviacao("")
			setNome("")
		}
	}, [cor, open])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!abreviacao.trim() || !nome.trim()) return
		onSubmit({ abreviacao: abreviacao.trim(), nome: nome.trim() })
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md animate-scale-in">
				<DialogHeader>
					<DialogTitle>{cor ? "Editar Cor" : "Nova Cor"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="abreviacao">Abreviação</Label>
						<Input
							id="abreviacao"
							value={abreviacao}
							onChange={(e) => setAbreviacao(e.target.value)}
							placeholder="Ex: VRM, AZL, BRC"
							maxLength={10}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="nome">Nome</Label>
						<Input
							id="nome"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							placeholder="Digite o nome da cor"
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
						<Button type="submit">{cor ? "Salvar" : "Criar"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
