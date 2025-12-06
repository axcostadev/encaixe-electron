import { PageHeader } from "@renderer/components/common/PageHeader"
import { CorForm } from "@renderer/components/cores/CorForm"
import { CorList } from "@renderer/components/cores/CorList"
import { Button } from "@renderer/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@renderer/components/ui/select"
import { useApp } from "@renderer/contexts/AppContext"
import { Cor } from "@renderer/types"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

export function CoresPage() {
	const { modelos, addCor, updateCor, deleteCor, getCoresByModelo } = useApp()
	const [searchParams, setSearchParams] = useSearchParams()
	const [formOpen, setFormOpen] = useState(false)
	const [editingCor, setEditingCor] = useState<Cor | null>(null)

	const selectedModeloId = searchParams.get("modelo") || ""

	const cores = useMemo(() => {
		if (!selectedModeloId) return []
		return getCoresByModelo(selectedModeloId)
	}, [selectedModeloId, getCoresByModelo, modelos])

	const selectedModelo = modelos.find((m) => m.id === selectedModeloId)

	function handleModeloChange(value: string) {
		setSearchParams({ modelo: value })
	}

	function handleCreate(data: { abreviacao: string; nome: string }) {
		if (!selectedModeloId) return
		addCor(selectedModeloId, data)
		toast.success("Cor criada com sucesso!")
	}

	function handleEdit(cor: Cor) {
		setEditingCor(cor)
		setFormOpen(true)
	}

	function handleUpdate(data: { abreviacao: string; nome: string }) {
		if (editingCor && selectedModeloId) {
			updateCor(selectedModeloId, editingCor.id, data)
			toast.success("Cor atualizada com sucesso!")
		}
	}

	function handleDelete(id: string) {
		if (!selectedModeloId) return
		deleteCor(selectedModeloId, id)
		toast.success("Cor excluída com sucesso!")
	}

	function handleFormSubmit(data: { abreviacao: string; nome: string }) {
		if (editingCor) {
			handleUpdate(data)
		} else {
			handleCreate(data)
		}
		setEditingCor(null)
	}

	function handleFormClose(open: boolean) {
		setFormOpen(open)
		if (!open) {
			setEditingCor(null)
		}
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Cores"
				description="Gerencie as cores de cada modelo"
				action={
					<Button
						onClick={() => setFormOpen(true)}
						disabled={!selectedModeloId}
					>
						<Plus className="h-4 w-4 mr-2" />
						Nova Cor
					</Button>
				}
			/>

			<div className="flex items-center gap-4">
				<div className="w-full max-w-xs">
					<Select value={selectedModeloId} onValueChange={handleModeloChange}>
						<SelectTrigger>
							<SelectValue placeholder="Selecione um modelo" />
						</SelectTrigger>
						<SelectContent>
							{modelos.map((modelo) => (
								<SelectItem key={modelo.id} value={modelo.id}>
									{modelo.nome} ({modelo.artigo})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{selectedModelo && (
					<p className="text-sm text-muted-foreground">
						{cores.length} cor(es) cadastrada(s)
					</p>
				)}
			</div>

			{!selectedModeloId ? (
				<div className="text-center py-16 text-muted-foreground animate-fade-in">
					<p>Selecione um modelo para visualizar e gerenciar suas cores.</p>
				</div>
			) : (
				<CorList cores={cores} onEdit={handleEdit} onDelete={handleDelete} />
			)}

			<CorForm
				open={formOpen}
				onOpenChange={handleFormClose}
				onSubmit={handleFormSubmit}
				cor={editingCor}
			/>
		</div>
	)
}
