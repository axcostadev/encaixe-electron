import { PageHeader } from "@renderer/components/common/PageHeader"
import { ComponenteForm } from "@renderer/components/componentes/ComponenteForm"
import { ComponenteList } from "@renderer/components/componentes/ComponenteList"
import { Button } from "@renderer/components/ui/button"
import { SelectSearch } from "@renderer/components/ui/select"
import { useApp } from "@renderer/contexts/AppContext"
import { Componente, ComponentePayload } from "@renderer/types"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

export function ComponentesPage() {
	const {
		modelos,
		materiais,
		addComponente,
		updateComponente,
		deleteComponente,
		getComponentesByModelo,
		getCoresByModelo,
	} = useApp()

	const [searchParams, setSearchParams] = useSearchParams()
	const [formOpen, setFormOpen] = useState(false)
	const [editingComponente, setEditingComponente] = useState<Componente | null>(
		null,
	)

	const selectedModeloId = searchParams.get("modelo") || ""
	const selectedModeloIdNum = selectedModeloId
		? parseInt(selectedModeloId, 10)
		: null

	const componentes = useMemo(() => {
		if (!selectedModeloIdNum) return []
		return getComponentesByModelo(selectedModeloIdNum)
	}, [selectedModeloIdNum, modelos])

	const coresModelo = useMemo(() => {
		if (!selectedModeloIdNum) return []
		return getCoresByModelo(selectedModeloIdNum)
	}, [selectedModeloIdNum, getCoresByModelo])

	const selectedModelo = modelos.find((m) => m.id === selectedModeloIdNum)

	function handleModeloChange(value: string) {
		setSearchParams({ modelo: value })
	}

	async function handleCreate(data: ComponentePayload) {
		if (!selectedModeloIdNum) return
		try {
			await addComponente(selectedModeloIdNum, data)
			toast.success("Componente criado com sucesso!")
		} catch (error) {
			toast.error("Erro ao criar componente:" + error)
		}
	}

	function handleEdit(componente: Componente) {
		setEditingComponente(componente)
		setFormOpen(true)
	}

	async function handleUpdate(data: ComponentePayload) {
		if (editingComponente && selectedModeloIdNum) {
			try {
				await updateComponente(selectedModeloIdNum, editingComponente.id, data)
				toast.success("Componente atualizado com sucesso!")
			} catch (error) {
				toast.error("Erro ao atualizar componente" + error)
			}
		}
	}

	async function handleDelete(id: string) {
		if (!selectedModeloIdNum) return
		try {
			await deleteComponente(selectedModeloIdNum, parseInt(id, 10))
			toast.success("Componente excluído com sucesso!")
		} catch (error) {
			toast.error("Erro ao excluir componente: " + error)
		}
	}

	function handleFormSubmit(data: ComponentePayload) {
		if (editingComponente) {
			handleUpdate(data)
		} else {
			handleCreate(data)
		}
		setEditingComponente(null)
	}

	function handleFormClose(open: boolean) {
		setFormOpen(open)
		if (!open) {
			setEditingComponente(null)
		}
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Componentes"
				description="Gerencie os componentes de cada modelo"
				action={
					<Button
						onClick={() => setFormOpen(true)}
						disabled={!selectedModeloIdNum}
					>
						<Plus className="h-4 w-4 mr-2" />
						Novo Componente
					</Button>
				}
			/>

			<div className="flex items-center gap-4">
				<div className="w-full max-w-xs">
					<SelectSearch
						value={selectedModeloId}
						onValueChange={handleModeloChange}
						placeholder="Selecione um modelo"
						options={modelos.map((modelo) => ({
							value: modelo.id.toString(),
							label: `${modelo.nome} (${modelo.artigo})`,
						}))}
					/>
				</div>
				{selectedModelo && (
					<p className="text-sm text-muted-foreground">
						{componentes.length} componente(s) • {coresModelo.length} cor(es)
						disponível(is)
					</p>
				)}
			</div>

			{!selectedModeloIdNum ? (
				<div className="text-center py-16 text-muted-foreground animate-fade-in">
					<p>
						Selecione um modelo para visualizar e gerenciar seus componentes.
					</p>
				</div>
			) : (
				<ComponenteList
					componentes={componentes}
					materiais={materiais}
					cores={coresModelo}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}

			<ComponenteForm
				open={formOpen}
				onOpenChange={handleFormClose}
				onSubmit={handleFormSubmit}
				componente={editingComponente}
				materiais={materiais}
				coresModelo={coresModelo}
			/>
		</div>
	)
}
