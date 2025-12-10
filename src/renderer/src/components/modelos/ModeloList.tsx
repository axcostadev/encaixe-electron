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
import { Modelo } from "@renderer/types"
import { Box, Package, Palette, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

interface ModeloListProps {
	modelos: Modelo[]
	onEdit: (modelo: Modelo) => void
	onDelete: (id: number) => void
}

export function ModeloList({ modelos, onEdit, onDelete }: ModeloListProps) {
	const [deleteId, setDeleteId] = useState<number | null>(null)
	const navigate = useNavigate()

	function handleConfirmDelete() {
		if (deleteId) {
			onDelete(deleteId)
			setDeleteId(null)
		}
	}

	if (modelos.length === 0) {
		return (
			<EmptyState
				icon={Box}
				title="Nenhum modelo cadastrado"
				description="Comece criando um novo modelo para gerenciar cores e componentes."
			/>
		)
	}

	return (
		<>
			<div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
				<Table>
					<TableHeader>
						<TableRow className="table-header">
							<TableHead className="w-[150px]">Artigo</TableHead>
							<TableHead>Nome</TableHead>
							<TableHead className="w-[120px] text-center">Cores</TableHead>
							<TableHead className="w-[120px] text-center">
								Componentes
							</TableHead>
							<TableHead className="w-[120px] text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{modelos.map((modelo) => (
							<TableRow key={modelo.id} className="table-row-hover">
								<TableCell className="font-medium">{modelo.artigo}</TableCell>
								<TableCell>{modelo.nome}</TableCell>
								<TableCell className="text-center">
									<Badge
										variant="secondary"
										className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
										onClick={() => navigate(`/cores?modelo=${modelo.id}`)}
									>
										<Palette className="h-3 w-3 mr-1" />
										{modelo.cores.length}
									</Badge>
								</TableCell>
								<TableCell className="text-center">
									<Badge
										variant="secondary"
										className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
										onClick={() => navigate(`/componentes?modelo=${modelo.id}`)}
									>
										<Package className="h-3 w-3 mr-1" />
										{modelo.componentes.length}
									</Badge>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => onEdit(modelo)}
											className="h-8 w-8 text-muted-foreground hover:text-foreground"
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setDeleteId(modelo.id)}
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

			<DeleteConfirmDialog
				open={!!deleteId}
				onOpenChange={() => setDeleteId(null)}
				onConfirm={handleConfirmDelete}
				title="Excluir Modelo"
				description="Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita e todas as cores e componentes vinculados serão removidos."
			/>
		</>
	)
}
