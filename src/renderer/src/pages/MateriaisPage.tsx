import { PageHeader } from "@renderer/components/common/PageHeader"
import { MaterialForm } from "@renderer/components/materiais/MaterialForm"
import { MaterialList } from "@renderer/components/materiais/MaterialList"
import { Button } from "@renderer/components/ui/button"
import { useApp } from "@renderer/contexts/AppContext"
import { Material } from "@renderer/types"
import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function MateriaisPage() {
	const {
		materiais,
		addMaterial,
		updateMaterial,
		deleteMaterial,
		loadMateriais,
		getComponentesCountByMaterial,
		getComponentesByMaterial,
		unlinkMaterialFromComponente,
	} = useApp()
	const [formOpen, setFormOpen] = useState(false)
	const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

	useEffect(() => {
		loadMateriais()
	}, [loadMateriais])

	async function handleCreate(data: Omit<Material, "id">) {
		try {
			await addMaterial(data)
			toast.success("Material criado com sucesso!")
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Erro ao criar material",
			)
		}
	}

	function handleEdit(material: Material) {
		setEditingMaterial(material)
		setFormOpen(true)
	}

	async function handleUpdate(data: Omit<Material, "id">) {
		if (editingMaterial) {
			try {
				await updateMaterial(editingMaterial.id, data)
				toast.success("Material atualizado com sucesso!")
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Erro ao atualizar material",
				)
			}
		}
	}

	async function handleUnlinkMaterial(componenteId: number, modeloId: number) {
		try {
			await unlinkMaterialFromComponente(componenteId, modeloId)
			toast.success("Material desvinculado do componente com sucesso!")
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Erro ao desvincular material",
			)
		}
	}

	async function handleDelete(id: number) {
		const componentesCount = getComponentesCountByMaterial(id)
		if (componentesCount > 0) {
			toast.error(
				`Não é possível excluir material. Está sendo usado por ${componentesCount} componente(s).`,
			)
			return
		}
		try {
			await deleteMaterial(id)
			toast.success("Material excluído com sucesso!")
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Erro ao excluir material",
			)
		}
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
				getComponentesCountByMaterial={getComponentesCountByMaterial}
				getComponentesByMaterial={getComponentesByMaterial}
				onUnlinkMaterial={handleUnlinkMaterial}
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
