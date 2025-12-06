import { PageHeader } from "@renderer/components/common/PageHeader"
import { MaterialForm } from "@renderer/components/materiais/MaterialForm"
import { MaterialList } from "@renderer/components/materiais/MaterialList"
import { Button } from "@renderer/components/ui/button"
import { useApp } from "@renderer/contexts/AppContext"
import { Material } from "@renderer/types"
import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function MateriaisPage() {
	const { materiais, addMaterial, updateMaterial, deleteMaterial } = useApp()
	const [formOpen, setFormOpen] = useState(false)
	const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

	function handleCreate(data: Omit<Material, "id">) {
		addMaterial(data)
		toast.success("Material criado com sucesso!")
	}

	function handleEdit(material: Material) {
		setEditingMaterial(material)
		setFormOpen(true)
	}

	function handleUpdate(data: Omit<Material, "id">) {
		if (editingMaterial) {
			updateMaterial(editingMaterial.id, data)
			toast.success("Material atualizado com sucesso!")
		}
	}

	function handleDelete(id: string) {
		deleteMaterial(id)
		toast.success("Material excluído com sucesso!")
	}

	function handleFormSubmit(data: Omit<Material, "id">) {
		if (editingMaterial) {
			handleUpdate(data)
		} else {
			handleCreate(data)
		}
		setEditingMaterial(null)
	}

	function handleFormClose(open: boolean) {
		setFormOpen(open)
		if (!open) {
			setEditingMaterial(null)
		}
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Materiais"
				description="Gerencie os materiais disponíveis para os componentes"
				action={
					<Button onClick={() => setFormOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Novo Material
					</Button>
				}
			/>

			<MaterialList
				materiais={materiais}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

			<MaterialForm
				open={formOpen}
				onOpenChange={handleFormClose}
				onSubmit={handleFormSubmit}
				material={editingMaterial}
			/>
		</div>
	)
}
