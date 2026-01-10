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
	SelectSearch,
} from "@renderer/components/ui/select"
import { Componente, ComponentePayload, Cor, Material } from "@renderer/types"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { SetoresPage } from "@renderer/pages/SetoresPage"
import { useContext } from "react"
import { SetoresContext } from "@renderer/contexts/SetoresContext"

interface ComponenteFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (data: ComponentePayload) => void
	componente?: Componente | null
	materiais: Material[]
	coresModelo: Cor[]
	setores?: { id: number; nome: string }[]
}

export function ComponenteForm({
	open,
	onOpenChange,
	onSubmit,
	componente,
	materiais,
	coresModelo,
	setores,
}: ComponenteFormProps) {
	const [openSetorDialog, setOpenSetorDialog] = useState<boolean>(false)
	const setoresContext = useContext(SetoresContext)
	const setoresList = setores ?? setoresContext?.setores ?? []
	const [formData, setFormData] = useState({
		modeloCorId: "",
		setorId: "",
		numeroTecido: "",
		nome: "",
		materialId: "",
		tipoTecido: "",
		conjugacaoNavalha: 0,
		placaPar: 0,
		camadas: "1",
		espacamento: "",
		compMaximo: "",
		percPerda: "",
		coresDisponiveis: [] as string[],
		tamanhos: [] as { tamanhoInicial: number; tamanhoFinal: number }[],
	})

	const [novoTamanhoInicial, setNovoTamanhoInicial] = useState("")
	const [novoTamanhoFinal, setNovoTamanhoFinal] = useState("")

	const inicialRef = useRef<HTMLInputElement | null>(null)
	const finalRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (componente) {
			setFormData({
				modeloCorId: componente.modeloCorId?.toString() || "",
				setorId: componente.setorId?.toString() || "",
				numeroTecido: componente.numeroTecido || "",
				nome: componente.nome,
				materialId: componente.materialId.toString(),
				tipoTecido: componente.tipoTecido?.toString() || "",
				conjugacaoNavalha: parseInt(componente.conjugacaoNavalha) || 0,
				placaPar: parseInt(componente.placaPar) || 0,
				camadas: componente.camadas.toString(),
				espacamento: componente.espacamento.toString(),
				compMaximo: componente.compMaximo.toString(),
				percPerda: componente.percPerda.toString(),
				coresDisponiveis: componente.coresDisponiveis,
				tamanhos: componente.tamanhos || [],
			})
		} else {
			setFormData({
				modeloCorId: "",
				setorId: "",
				numeroTecido: "",
				nome: "",
				materialId: "",
				tipoTecido: "",
				conjugacaoNavalha: 0,
				placaPar: 0,
				camadas: "",
				espacamento: "",
				compMaximo: "",
				percPerda: "",
				coresDisponiveis: [],
				tamanhos: [],
			})
		}
		// only reset when `componente` changes; `open` toggles are handled by parent
	}, [componente])

	function handleChange(field: string, value: string) {
		if (field === "conjugacaoNavalha" || field === "placaPar") {
			setFormData((prev) => ({ ...prev, [field]: parseInt(value) || 0 }))
		} else {
			setFormData((prev) => ({ ...prev, [field]: value }))
		}
	}

	function handleCorToggle(corId: string, checked: boolean) {
		setFormData((prev) => ({
			...prev,
			coresDisponiveis: checked
				? [...prev.coresDisponiveis, corId]
				: prev.coresDisponiveis.filter((id) => id !== corId),
		}))
	}

	function handleToggleSelectAll() {
		if (coresModelo.length === 0) return
		const allIds = coresModelo.map((c) => c.id.toString())
		const allSelected = allIds.every((id) => formData.coresDisponiveis.includes(id))
		setFormData((prev) => ({
			...prev,
			coresDisponiveis: allSelected ? [] : allIds,
		}))
	}

	function handleAddTamanho() {
		const inicial = parseInt(novoTamanhoInicial)
		const final = parseInt(novoTamanhoFinal)
		if (isNaN(inicial) || isNaN(final) || inicial > final) return
		setFormData((prev) => ({
			...prev,
			tamanhos: [
				...prev.tamanhos,
				{ tamanhoInicial: inicial, tamanhoFinal: final },
			],
		}))
		setNovoTamanhoInicial("")
		setNovoTamanhoFinal("")
		// keep focus on initial for rapid entry
		setTimeout(() => inicialRef.current?.focus(), 0)
	}

	function handleRemoveTamanho(index: number) {
		setFormData((prev) => ({
			...prev,
			tamanhos: prev.tamanhos.filter((_, i) => i !== index),
		}))
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!formData.nome.trim() || !formData.materialId) return

		onSubmit({
			modeloCorId: parseInt(formData.modeloCorId) || 0,
			setorId: parseInt(formData.setorId) || 0,
			numeroTecido: formData.numeroTecido.trim(),
			nome: formData.nome.trim(),
			materialId: parseInt(formData.materialId) || 0,
			tipoTecido: parseInt(formData.tipoTecido) || 0,
			conjugacaoNavalha: formData.conjugacaoNavalha.toString(),
			placaPar: formData.placaPar.toString(),
			camadas: parseInt(formData.camadas) || 0,
			espacamento: parseFloat(formData.espacamento) || 0,
			compMaximo: parseFloat(formData.compMaximo) || 0,
			percPerda: parseFloat(formData.percPerda) || 0,
			coresDisponiveis: formData.coresDisponiveis,
			tamanhos: formData.tamanhos,
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
					<form
						id="componente-form"
						onSubmit={handleSubmit}
						className="space-y-6"
					>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div className="md:col-span-3 col-span-1 space-y-4">
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

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="material">Material *</Label>
										<SelectSearch
											value={formData.materialId}
											onValueChange={(v) => handleChange("materialId", v)}
											placeholder="Selecione um material"
											options={materiais.map((material) => ({
												value: material.id.toString(),
												label: `${material.artigo} (${material.largura}cm)`,
											}))}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="numeroTecido">Número Tecido</Label>
										<Input
											id="numeroTecido"
											value={formData.numeroTecido}
											onChange={(e) =>
												handleChange("numeroTecido", e.target.value)
											}
											placeholder="Número do tecido"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 gap-4">
									<div className="space-y-2">
										<Label htmlFor="setor">Setor</Label>
										<div className="flex items-center gap-2">
											<div className="flex-1">
												<Select
													value={formData.setorId}
													onValueChange={(v) => handleChange("setorId", v)}
												>
													<SelectTrigger>
														<SelectValue placeholder="Selecione um setor" />
													</SelectTrigger>
													<SelectContent className="bg-background text-foreground">
														{setoresList.map((s) => (
															<SelectItem key={s.id} value={s.id.toString()}>
																{s.nome}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setOpenSetorDialog(true)}
												aria-label="Adicionar setor"
											>
												<Plus className="h-3 w-3" />
											</Button>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="conjugacaoNavalha">
											Conjugação Navalha
										</Label>
										<Input
											id="conjugacaoNavalha"
											value={formData.conjugacaoNavalha.toString()}
											type="number"
											step="1"
											min={1}
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
											value={formData.placaPar.toString()}
											type="number"
											step="1"
											min={1}
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
											min="1"
											value={formData.camadas}
											onChange={(e) => {
												const v = e.target.value
												if (v === "") {
													handleChange("camadas", "")
													return
												}
												const n = Math.max(1, parseInt(v) || 1)
												handleChange("camadas", n.toString())
											}}
											placeholder="1"
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
											onChange={(e) =>
												handleChange("espacamento", e.target.value)
											}
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
											onChange={(e) =>
												handleChange("compMaximo", e.target.value)
											}
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
											onChange={(e) =>
												handleChange("percPerda", e.target.value)
											}
											placeholder="0.00"
										/>
									</div>
								</div>

								{coresModelo.length > 0 && (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<Label>Cores Disponíveis</Label>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleToggleSelectAll}
											>
												{formData.coresDisponiveis.length === coresModelo.length
													? "Desmarcar todas"
													: "Marcar todas"}
											</Button>
										</div>
										<p className="text-sm text-muted-foreground">
											{formData.coresDisponiveis.length} de{" "}
											{coresModelo.length} selecionada(s)
										</p>
										<div className="max-h-[200px] overflow-y-auto rounded-lg border bg-muted/30">
											<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
												{coresModelo.map((cor) => (
													<div
														key={cor.id}
														className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
															formData.coresDisponiveis.includes(cor.id.toString())
																? "bg-primary/10 border border-primary/30"
																: "bg-background border border-transparent"
														}`}
													>
														<Checkbox
															id={`cor-${cor.id}`}
															checked={formData.coresDisponiveis.includes(cor.id.toString())}
															onCheckedChange={(checked) =>
																handleCorToggle(cor.id.toString(), checked === true)
															}
															className="border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
														/>
														<label
															htmlFor={`cor-${cor.id}`}
															className="text-sm leading-none cursor-pointer flex-1 truncate"
														>
															<span className="font-mono text-xs text-muted-foreground mr-1">
																[{cor.abreviacao}]
															</span>
															<span className="font-medium">{cor.nome}</span>
														</label>
													</div>
													))}
											</div>
										</div>
									</div>
								)}
							</div>

							<div className="md:col-span-1 col-span-1 space-y-3 md:sticky md:top-6 md:self-start md:max-h-[60vh] md:overflow-auto">
								<Label>Tamanhos</Label>
								<div className="space-y-2">
									{formData.tamanhos.map((tamanho, index) => (
										<div
											key={index}
											className="flex items-center gap-2 p-2 bg-muted/50 rounded border"
										>
											<span className="text-sm">
												{tamanho.tamanhoInicial} ao {tamanho.tamanhoFinal}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveTamanho(index)}
												className="ml-auto h-6 w-6 p-0"
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>
									))}
									<div className="flex items-center gap-2 flex-wrap">
										<Input
											ref={inicialRef}
											type="number"
											placeholder="Inicial"
											value={novoTamanhoInicial}
											onChange={(e) => setNovoTamanhoInicial(e.target.value)}
											className="w-full md:w-20"
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault()
													finalRef.current?.focus()
												}
											}}
										/>
										<span className="text-sm text-muted-foreground">ao</span>
										<Input
											ref={finalRef}
											type="number"
											placeholder="Final"
											value={novoTamanhoFinal}
											onChange={(e) => setNovoTamanhoFinal(e.target.value)}
											className="w-full md:w-20"
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault()
													handleAddTamanho()
												}
											}}
										/>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												handleAddTamanho()
											}}
											disabled={!novoTamanhoInicial || !novoTamanhoFinal}
										>
											<Plus className="h-3 w-3 mr-1" />
											Adicionar
										</Button>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4"></div>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								className="mb-2"
							>
								Cancelar
							</Button>
							<Button type="submit">{componente ? "Salvar" : "Criar"}</Button>
						</DialogFooter>
					</form>
				</ScrollArea>
			</DialogContent>

			{openSetorDialog && (
				<Dialog open={openSetorDialog} onOpenChange={setOpenSetorDialog}>
					<DialogContent className="sm:max-w-lg max-h-[90vh]">
						<SetoresPage onBack={() => setOpenSetorDialog(false)} asDialog />
					</DialogContent>
				</Dialog>
			)}
		</Dialog>
	)
}
