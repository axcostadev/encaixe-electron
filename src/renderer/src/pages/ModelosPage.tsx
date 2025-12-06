import { PageHeader } from "@renderer/components/common/PageHeader"
import { ModeloForm } from "@renderer/components/modelos/ModeloForm"
import { ModeloList } from "@renderer/components/modelos/ModeloList"
import { Button } from "@renderer/components/ui/button"
import { useApp } from "@renderer/contexts/AppContext"
import { Modelo } from "@renderer/types"
import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ModelosPage() {
	const { modelos, addModelo, updateModelo, deleteModelo } = useApp()
	const [formOpen, setFormOpen] = useState(false)
	const [editingModelo, setEditingModelo] = useState<Modelo | null>(null)

	function handleCreate(data: { artigo: string; nome: string }) {
		addModelo(data)
		toast.success("Modelo criado com sucesso!")
	}

	function handleEdit(modelo: Modelo) {
		setEditingModelo(modelo)
		setFormOpen(true)
	}

	function handleUpdate(data: { artigo: string; nome: string }) {
		if (editingModelo) {
			updateModelo(editingModelo.id, data)
			toast.success("Modelo atualizado com sucesso!")
		}
	}

	function handleDelete(id: string) {
		deleteModelo(id)
		toast.success("Modelo excluído com sucesso!")
	}

	function handleFormSubmit(data: { artigo: string; nome: string }) {
		if (editingModelo) {
			handleUpdate(data)
		} else {
			handleCreate(data)
		}
		setEditingModelo(null)
	}

	function handleFormClose(open: boolean) {
		setFormOpen(open)
		if (!open) {
			setEditingModelo(null)
		}
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Modelos"
				description="Gerencie os modelos e seus vínculos com cores e componentes"
				action={
					<Button onClick={() => setFormOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Novo Modelo
					</Button>
				}
			/>

			<ModeloList
				modelos={modelos}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

			<ModeloForm
				open={formOpen}
				onOpenChange={handleFormClose}
				onSubmit={handleFormSubmit}
				modelo={editingModelo}
			/>
		</div>
	)
}
