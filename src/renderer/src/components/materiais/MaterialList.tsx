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
import { Material, SENTIDO_OPTIONS } from "@renderer/types"
import { Layers, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"

interface MaterialListProps {
	materiais: Material[]
	onEdit: (material: Material) => void
	onDelete: (id: number) => void
}

export function MaterialList({
	materiais,
	onEdit,
	onDelete,
}: MaterialListProps) {
	const [deleteId, setDeleteId] = useState<number | null>(null)

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
				<Table>
					<TableHeader>
						<TableRow className="table-header">
							<TableHead className="w-[150px]">Artigo</TableHead>
							<TableHead className="w-[100px] text-center">Largura</TableHead>
							<TableHead className="w-[100px] text-center">Sentido</TableHead>
							<TableHead>Observação</TableHead>
							<TableHead className="w-[100px] text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{materiais.map((material) => (
							<TableRow key={material.id} className="table-row-hover">
								<TableCell className="font-medium">{material.artigo}</TableCell>
								<TableCell className="text-center">
									<Badge variant="outline">{material.largura} cm</Badge>
								</TableCell>
								<TableCell className="text-center">
									<Badge variant="secondary">
										{getSentidoLabel(material.sentido)}
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
				open={deleteId !== null}
				onOpenChange={() => setDeleteId(null)}
				onConfirm={handleConfirmDelete}
				title="Excluir Material"
				description="Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita."
			/>
		</>
	)
}
