import { DeleteConfirmDialog } from "@renderer/components/common/DeleteConfirmDialog"
import { EmptyState } from "@renderer/components/common/EmptyState"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
import { Componente, Cor, Material } from "@renderer/types"
import { Package, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"

interface ComponenteListProps {
	componentes: Componente[]
	materiais: Material[]
	cores: Cor[]
	onEdit: (componente: Componente) => void
	onDelete: (id: string) => void
}

export function ComponenteList({
	componentes,
	materiais,
	cores,
	onEdit,
	onDelete,
}: ComponenteListProps) {
	const [deleteId, setDeleteId] = useState<string | null>(null)

	function handleConfirmDelete() {
		if (deleteId) {
			onDelete(deleteId)
			setDeleteId(null)
		}
	}

	function getMaterialNome(id: string) {
		return materiais.find((m) => m.id === id)?.artigo || "—"
	}

	function getCoresNomes(ids: string[]) {
		return ids
			.map((id) => cores.find((c) => c.id === id))
			.filter(Boolean)
			.map((c) => c!.abreviacao)
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
			<div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="table-header">
								<TableHead className="w-[60px] text-center">Seq</TableHead>
								<TableHead>Nome</TableHead>
								<TableHead>Material</TableHead>
								<TableHead className="w-[80px] text-center">Camadas</TableHead>
								<TableHead className="w-[80px] text-center">% Perda</TableHead>
								<TableHead>Cores</TableHead>
								<TableHead className="w-[100px] text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{componentes
								.sort((a, b) => a.sequencia - b.sequencia)
								.map((componente) => (
									<TableRow key={componente.id} className="table-row-hover">
										<TableCell className="text-center font-mono text-sm">
											{componente.sequencia}
										</TableCell>
										<TableCell className="font-medium">
											{componente.nome}
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{getMaterialNome(componente.materialId)}
											</Badge>
										</TableCell>
										<TableCell className="text-center">
											{componente.camadas}
										</TableCell>
										<TableCell className="text-center">
											{componente.percPerda}%
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{getCoresNomes(componente.coresDisponiveis).map(
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
												{componente.coresDisponiveis.length === 0 && (
													<span className="text-muted-foreground text-sm">
														—
													</span>
												)}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => onEdit(componente)}
													className="h-8 w-8 text-muted-foreground hover:text-foreground"
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setDeleteId(componente.id)}
													className="h-8 w-8 text-muted-foreground hover:text-destructive"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
						</TableBody>
					</Table>
				</div>
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
