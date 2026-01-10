import { DeleteConfirmDialog } from "@renderer/components/common/DeleteConfirmDialog"
import { EmptyState } from "@renderer/components/common/EmptyState"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@renderer/components/ui/tooltip"
import { Componente, Cor, Material } from "@renderer/types"
import { Package, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

interface ComponenteListProps {
	componentes: Componente[]
	materiais: Material[]
	cores: Cor[]
	setores?: { id: number; nome: string }[]
	onEdit: (componente: Componente) => void
	onDelete: (id: string) => void
}

export function ComponenteList({
	componentes,
	materiais,
	cores,
	setores,
	onEdit,
	onDelete,
}: ComponenteListProps) {
	const [deleteId, setDeleteId] = useState<string | null>(null)
	const [expandedId, setExpandedId] = useState<string | null>(null)

	function handleConfirmDelete() {
		if (deleteId) {
			onDelete(deleteId)
			setDeleteId(null)
		}
	}

	function getMaterialNome(id: string) {
		return materiais.find((m) => m.id === parseInt(id))?.artigo || "—"
	}

	function getCoresNomes(ids: string[]) {
		return ids
			.map((id) => cores.find((c) => c.id === parseInt(id)))
			.filter(Boolean)
			.map((c) => c!.abreviacao)
	}

	function getModeloCorAbreviacao(id?: number | null) {
		if (!id) return "—"
		return cores.find((c) => c.id === Number(id))?.abreviacao || String(id)
	}

	function getSetorNome(id?: number | null) {
		if (!id) return "—"
		if (!setores) return String(id)
		return setores.find((s) => s.id === Number(id))?.nome || String(id)
	}

	if (componentes.length === 0) {
		return (
			<EmptyState
				icon={Package}
				title="Nenhum componente cadastrado"
				description="Adicione componentes para este modelo."
			/>
		)
	}

	return (
		<>
			<div className="space-y-3 animate-fade-in">
				{componentes
					.sort((a, b) => a.sequencia - b.sequencia)
					.map((componente) => {
						const coresNomes = getCoresNomes(componente.coresDisponiveis)
						const isExpanded = expandedId === componente.id.toString()
						const hasManyCores = coresNomes.length > 4
						const hasManyTamanhos = (componente.tamanhos?.length || 0) > 3

						return (
							<div
								key={componente.id}
								className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors"
							>
								{/* Header do Card */}
								<div className="flex items-center justify-between p-4 bg-muted/30">
									<div className="flex items-center gap-4 flex-1 min-w-0">
										<span className="text-sm font-mono text-muted-foreground w-8 text-center shrink-0">
											#{componente.sequencia}
										</span>
										<div className="min-w-0 flex-1">
											<h3 className="font-semibold truncate">{componente.nome}</h3>
											<div className="flex items-center gap-2 mt-1 flex-wrap">
												<Badge variant="secondary" className="text-xs">
													{getModeloCorAbreviacao(componente.modeloCorId)}
												</Badge>
												<Badge variant="outline" className="text-xs">
													{getMaterialNome(componente.materialId.toString())}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{getSetorNome(componente.setorId)}
												</span>
											</div>
										</div>
									</div>
									
									{/* Ações - Sempre visíveis */}
									<div className="flex items-center gap-1 shrink-0 ml-4">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => onEdit(componente)}
														className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
													>
														<Pencil className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Editar</TooltipContent>
											</Tooltip>
										</TooltipProvider>
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => setDeleteId(componente.id.toString())}
														className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Excluir</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
								</div>

								{/* Conteúdo do Card */}
								<div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
									<div>
										<span className="text-muted-foreground text-xs block mb-1">Camadas</span>
										<span className="font-medium">{componente.camadas}</span>
									</div>
									<div>
										<span className="text-muted-foreground text-xs block mb-1">% Perda</span>
										<span className="font-medium">{componente.percPerda}%</span>
									</div>
									<div>
										<span className="text-muted-foreground text-xs block mb-1">Espaçamento</span>
										<span className="font-medium">{componente.espacamento || "—"}</span>
									</div>
									<div>
										<span className="text-muted-foreground text-xs block mb-1">Comp. Máx</span>
										<span className="font-medium">{componente.compMaximo || "—"}</span>
									</div>
									<div>
										<span className="text-muted-foreground text-xs block mb-1">Placa Par</span>
										<span className="font-medium">{componente.placaPar || "—"}</span>
									</div>
									<div>
										<span className="text-muted-foreground text-xs block mb-1">Conj. Navalha</span>
										<span className="font-medium">{componente.conjugacaoNavalha || "—"}</span>
									</div>
								</div>

								{/* Cores e Tamanhos */}
								<div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Cores */}
									<div>
										<span className="text-muted-foreground text-xs block mb-2">
											Cores ({coresNomes.length})
										</span>
										<div className="flex flex-wrap gap-1">
											{(isExpanded || !hasManyCores ? coresNomes : coresNomes.slice(0, 4)).map(
												(cor, i) => (
													<Badge
														key={i}
														variant="secondary"
														className="text-xs"
													>
														{cor}
													</Badge>
												),
											)}
											{!isExpanded && hasManyCores && (
												<Badge variant="outline" className="text-xs">
													+{coresNomes.length - 4}
												</Badge>
											)}
											{coresNomes.length === 0 && (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</div>
									</div>

									{/* Tamanhos */}
									<div>
										<span className="text-muted-foreground text-xs block mb-2">
											Tamanhos ({componente.tamanhos?.length || 0})
										</span>
										<div className="flex flex-wrap gap-1">
											{(isExpanded || !hasManyTamanhos
												? componente.tamanhos || []
												: (componente.tamanhos || []).slice(0, 3)
											).map((tamanho, i) => (
												<Badge key={i} variant="outline" className="text-xs">
													{tamanho.tamanhoInicial}-{tamanho.tamanhoFinal}
												</Badge>
											))}
											{!isExpanded && hasManyTamanhos && (
												<Badge variant="outline" className="text-xs">
													+{(componente.tamanhos?.length || 0) - 3}
												</Badge>
											)}
											{!componente.tamanhos?.length && (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</div>
									</div>
								</div>

								{/* Botão expandir (se tiver muitas cores ou tamanhos) */}
								{(hasManyCores || hasManyTamanhos) && (
									<button
										onClick={() => setExpandedId(isExpanded ? null : componente.id.toString())}
										className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center gap-1 border-t transition-colors"
									>
										{isExpanded ? (
											<>
												<ChevronUp className="h-3 w-3" />
												Mostrar menos
											</>
										) : (
											<>
												<ChevronDown className="h-3 w-3" />
												Mostrar tudo
											</>
										)}
									</button>
								)}
							</div>
						)
					})}
			</div>

			<DeleteConfirmDialog
				open={!!deleteId}
				onOpenChange={() => setDeleteId(null)}
				onConfirm={handleConfirmDelete}
				title="Excluir Componente"
				description="Tem certeza que deseja excluir este componente? Esta ação não pode ser desfeita."
			/>
		</>
	)
}
