import { DeleteConfirmDialog } from "@renderer/components/common/DeleteConfirmDialog"
import { EmptyState } from "@renderer/components/common/EmptyState"
import { Button } from "@renderer/components/ui/button"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
import { Cor } from "@renderer/types"
import { Palette, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"

interface CorListProps {
	cores: Cor[]
	onEdit: (cor: Cor) => void
	onDelete: (id: number) => void
}

export function CorList({ cores, onEdit, onDelete }: CorListProps) {
	const [deleteId, setDeleteId] = useState<number | null>(null)

	function handleConfirmDelete() {
		if (deleteId) {
			onDelete(deleteId)
			setDeleteId(null)
		}
	}

	if (cores.length === 0) {
		return (
			<EmptyState
				icon={Palette}
				title="Nenhuma cor cadastrada"
				description="Adicione cores para este modelo."
			/>
		)
	}

	return (
		<>
			<div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in">
				<Table>
					<TableHeader>
						<TableRow className="table-header">
							<TableHead className="w-[150px]">Abreviação</TableHead>
							<TableHead>Nome</TableHead>
							<TableHead className="w-[100px] text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{cores.map((cor) => (
							<TableRow key={cor.id} className="table-row-hover">
								<TableCell className="font-medium font-mono">
									{cor.abreviacao}
								</TableCell>
								<TableCell>{cor.nome}</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => onEdit(cor)}
											className="h-8 w-8 text-muted-foreground hover:text-foreground"
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setDeleteId(cor.id)}
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
				title="Excluir Cor"
				description="Tem certeza que deseja excluir esta cor? Esta ação não pode ser desfeita."
			/>
		</>
	)
}
