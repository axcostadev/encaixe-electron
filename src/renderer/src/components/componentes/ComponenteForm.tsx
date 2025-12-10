import { Button } from "@renderer/components/ui/button"
import { Checkbox } from "@renderer/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@renderer/components/ui/select"
import { Componente, Cor, Material } from "@renderer/types"
import { useEffect, useState } from "react"

interface ComponenteFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (data: Omit<Componente, "id" | "modeloId">) => void
	componente?: Componente | null
	materiais: Material[]
	coresModelo: Cor[]
}

export function ComponenteForm({
	open,
	onOpenChange,
	onSubmit,
	componente,
	materiais,
	coresModelo,
}: ComponenteFormProps) {
	const [formData, setFormData] = useState({
		sequencia: "",
		nome: "",
		materialId: "",
		tipoTecido: "",
		conjugacaoNavalha: "",
		placaPar: "",
		camadas: "",
		espacamento: "",
		compMaximo: "",
		percPerda: "",
		coresDisponiveis: [] as string[],
	})

	useEffect(() => {
		if (componente) {
			setFormData({
				sequencia: componente.sequencia.toString(),
				nome: componente.nome,
				materialId: componente.materialId.toString(),
				tipoTecido: componente.tipoTecido,
				conjugacaoNavalha: componente.conjugacaoNavalha,
				placaPar: componente.placaPar,
				camadas: componente.camadas.toString(),
				espacamento: componente.espacamento.toString(),
				compMaximo: componente.compMaximo.toString(),
				percPerda: componente.percPerda.toString(),
				coresDisponiveis: componente.coresDisponiveis,
			})
		} else {
			setFormData({
				sequencia: "",
				nome: "",
				materialId: "",
				tipoTecido: "",
				conjugacaoNavalha: "",
				placaPar: "",
				camadas: "",
				espacamento: "",
				compMaximo: "",
				percPerda: "",
				coresDisponiveis: [],
			})
		}
	}, [componente, open])

	function handleChange(field: string, value: string) {
		setFormData((prev) => ({ ...prev, [field]: value }))
	}

	function handleCorToggle(corId: string, checked: boolean) {
		setFormData((prev) => ({
			...prev,
			coresDisponiveis: checked
				? [...prev.coresDisponiveis, corId]
				: prev.coresDisponiveis.filter((id) => id !== corId),
		}))
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!formData.nome.trim() || !formData.materialId) return

		onSubmit({
			sequencia: parseInt(formData.sequencia) || 0,
			nome: formData.nome.trim(),
			materialId: parseInt(formData.materialId) || 0,
			tipoTecido: formData.tipoTecido.trim(),
			conjugacaoNavalha: formData.conjugacaoNavalha.trim(),
			placaPar: formData.placaPar.trim(),
			camadas: parseInt(formData.camadas) || 0,
			espacamento: parseFloat(formData.espacamento) || 0,
			compMaximo: parseFloat(formData.compMaximo) || 0,
			percPerda: parseFloat(formData.percPerda) || 0,
			coresDisponiveis: formData.coresDisponiveis,
		})
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] animate-scale-in">
				<DialogHeader>
					<DialogTitle>
						{componente ? "Editar Componente" : "Novo Componente"}
					</DialogTitle>
				</DialogHeader>
				<ScrollArea className="max-h-[60vh] pr-4">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="sequencia">Sequência</Label>
								<Input
									id="sequencia"
									type="number"
									min="0"
									value={formData.sequencia}
									onChange={(e) => handleChange("sequencia", e.target.value)}
									placeholder="0"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="nome">Nome do Componente *</Label>
								<Input
									id="nome"
									value={formData.nome}
									onChange={(e) => handleChange("nome", e.target.value)}
									placeholder="Digite o nome"
									required
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="material">Material *</Label>
								<Select
									value={formData.materialId}
									onValueChange={(v) => handleChange("materialId", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione um material" />
									</SelectTrigger>
									<SelectContent>
										{materiais.map((material) => (
											<SelectItem
												key={material.id}
												value={material.id.toString()}
											>
												{material.artigo} ({material.largura}cm)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="tipoTecido">Tipo Tecido</Label>
								<Input
									id="tipoTecido"
									value={formData.tipoTecido}
									onChange={(e) => handleChange("tipoTecido", e.target.value)}
									placeholder="Digite o tipo"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="conjugacaoNavalha">Conjugação Navalha</Label>
								<Input
									id="conjugacaoNavalha"
									value={formData.conjugacaoNavalha}
									onChange={(e) =>
										handleChange("conjugacaoNavalha", e.target.value)
									}
									placeholder="Digite a conjugação"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="placaPar">Placa Par</Label>
								<Input
									id="placaPar"
									value={formData.placaPar}
									onChange={(e) => handleChange("placaPar", e.target.value)}
									placeholder="Digite a placa"
								/>
							</div>
						</div>

						<div className="grid grid-cols-4 gap-4">
							<div className="space-y-2">
								<Label htmlFor="camadas">Camadas</Label>
								<Input
									id="camadas"
									type="number"
									min="0"
									value={formData.camadas}
									onChange={(e) => handleChange("camadas", e.target.value)}
									placeholder="0"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="espacamento">Espaçamento</Label>
								<Input
									id="espacamento"
									type="number"
									step="0.01"
									min="0"
									value={formData.espacamento}
									onChange={(e) => handleChange("espacamento", e.target.value)}
									placeholder="0.00"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="compMaximo">Comp. Máximo</Label>
								<Input
									id="compMaximo"
									type="number"
									step="0.01"
									min="0"
									value={formData.compMaximo}
									onChange={(e) => handleChange("compMaximo", e.target.value)}
									placeholder="0.00"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="percPerda">% Perda</Label>
								<Input
									id="percPerda"
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={formData.percPerda}
									onChange={(e) => handleChange("percPerda", e.target.value)}
									placeholder="0.00"
								/>
							</div>
						</div>

						{coresModelo.length > 0 && (
							<div className="space-y-3">
								<Label>Cores Disponíveis</Label>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg border">
									{coresModelo.map((cor) => (
										<div key={cor.id} className="flex items-center space-x-2">
											<Checkbox
												id={`cor-${cor.id}`}
												checked={formData.coresDisponiveis.includes(
													cor.id.toString(),
												)}
												onCheckedChange={(checked) =>
													handleCorToggle(cor.id.toString(), checked as boolean)
												}
											/>
											<label
												htmlFor={`cor-${cor.id}`}
												className="text-sm font-medium leading-none cursor-pointer"
											>
												<span className="font-mono text-xs text-muted-foreground mr-1">
													[{cor.abreviacao}]
												</span>
												{cor.nome}
											</label>
										</div>
									))}
								</div>
							</div>
						)}

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancelar
							</Button>
							<Button type="submit">{componente ? "Salvar" : "Criar"}</Button>
						</DialogFooter>
					</form>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}
