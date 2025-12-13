import { DeleteConfirmDialog } from "@renderer/components/common/DeleteConfirmDialog"
import { EmptyState } from "@renderer/components/common/EmptyState"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
import { Componente, Material, SENTIDO_OPTIONS } from "@renderer/types"
import { Layers, Pencil, Trash2, Unlink } from "lucide-react"
import { useApp } from "@renderer/contexts/AppContext"
import { useMemo, useState } from "react"

interface MaterialListProps {
	materiais: Material[]
	onEdit: (material: Material) => void
	onDelete: (id: number) => void
	getComponentesCountByMaterial: (materialId: number) => number
	getComponentesByMaterial: (materialId: number) => Componente[]
	onUnlinkMaterial: (componenteId: number, modeloId: number) => void
}

export function MaterialList({
	materiais,
	onEdit,
	onDelete,
	getComponentesCountByMaterial,
	getComponentesByMaterial,
	onUnlinkMaterial,
}: MaterialListProps) {
	const { modelos } = useApp()
	const [deleteId, setDeleteId] = useState<number | null>(null)
	const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(
		null,
	)
	const [query, setQuery] = useState("")

	const filteredMateriais = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return materiais
		return materiais.filter(
			(m) =>
				m.artigo.toLowerCase().includes(q) ||
				(m.obs || "").toLowerCase().includes(q),
		)
	}, [materiais, query])

	function handleConfirmDelete() {
		if (deleteId !== null) {
			onDelete(deleteId)
			setDeleteId(null)
		}
	}

	function getSentidoLabel(sentido: string) {
		return SENTIDO_OPTIONS.find((o) => o.value === sentido)?.label || sentido
	}

	if (materiais.length === 0) {
		return (
			<EmptyState
				icon={Layers}
				title="Nenhum material cadastrado"
				description="Cadastre materiais para usar nos componentes dos modelos."
			/>
		)
	}

	return (
		<>
			<div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
				<div className="p-4 flex items-center gap-4">
					<div className="w-full max-w-sm">
						<Label className="text-sm">Pesquisar</Label>
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Pesquisar por artigo ou observação"
						/>
					</div>
				</div>
				<Table>
					<TableHeader>
						<TableRow className="table-header">
							<TableHead className="w-[150px]">Artigo</TableHead>
							<TableHead className="w-[140px] text-center">Largura</TableHead>
							<TableHead className="w-[100px] text-center">Sentido</TableHead>
							<TableHead className="w-[120px] text-center">
								Componentes
							</TableHead>
							<TableHead>Observação</TableHead>
							<TableHead className="w-[100px] text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredMateriais.map((material) => {
							const componentesCount = getComponentesCountByMaterial(
								material.id,
							)
							return (
								<TableRow key={material.id} className="table-row-hover">
									<TableCell className="font-medium">
										{material.artigo}
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="outline">
											{material.largura.toFixed(2)} metros
										</Badge>
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="secondary">
											{getSentidoLabel(material.sentido)}
										</Badge>
									</TableCell>
									<TableCell className="text-center">
										<Badge
											variant={componentesCount > 0 ? "default" : "secondary"}
											className={
												componentesCount > 0
													? "cursor-pointer hover:bg-primary/80"
													: ""
											}
											onClick={() =>
												componentesCount > 0 &&
												setSelectedMaterialId(material.id)
											}
										>
											{componentesCount}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{material.obs || "—"}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onEdit(material)}
												className="h-8 w-8 text-muted-foreground hover:text-foreground"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setDeleteId(material.id)}
												disabled={componentesCount > 0}
												className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
												title={
													componentesCount > 0
														? "Não é possível excluir material em uso"
														: "Excluir material"
												}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			<Dialog
				open={selectedMaterialId !== null}
				onOpenChange={() => setSelectedMaterialId(null)}
			>
				<DialogContent className="sm:max-w-4xl max-h-[80vh]">
					<DialogHeader>
						<DialogTitle>
							Componentes usando o material{" "}
							{materiais.find((m) => m.id === selectedMaterialId)?.artigo}
						</DialogTitle>
					</DialogHeader>
					<div className="max-h-[60vh] overflow-y-auto">
						{selectedMaterialId && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Modelo</TableHead>
										<TableHead>Componente</TableHead>
										<TableHead className="w-[120px] text-center">
											Ações
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{getComponentesByMaterial(selectedMaterialId).map(
										(componente) => {
											const modelo = modelos?.find(
												(m) => m.id === componente.modeloId,
											)
											return (
												<TableRow key={componente.id}>
													<TableCell>
														{modelo
															? `${modelo.artigo} - ${modelo.nome}`
															: "Modelo não encontrado"}
													</TableCell>
													<TableCell>{componente.nome}</TableCell>
													<TableCell className="text-center">
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																onUnlinkMaterial(
																	componente.id,
																	componente.modeloId,
																)
																setSelectedMaterialId(null)
															}}
															className="h-8"
														>
															<Unlink className="h-3 w-3 mr-1" />
															Desvincular
														</Button>
													</TableCell>
												</TableRow>
											)
										},
									)}
								</TableBody>
							</Table>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<DeleteConfirmDialog
				open={deleteId !== null}
				onOpenChange={() => setDeleteId(null)}
				onConfirm={handleConfirmDelete}
				title="Excluir Material"
				description="Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita."
			/>
		</>
	)
}
