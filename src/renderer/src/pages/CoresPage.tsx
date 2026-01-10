import { PageHeader } from "@renderer/components/common/PageHeader"
import { CorForm } from "@renderer/components/cores/CorForm"
import { CorList } from "@renderer/components/cores/CorList"
import { Button } from "@renderer/components/ui/button"
import { SelectSearch } from "@renderer/components/ui/select"
import { useApp } from "@renderer/contexts/AppContext"
import { Cor } from "@renderer/types"
import { Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

export function CoresPage() {
	const {
		modelos,
		loadModelos,
		addCor,
		updateCor,
		deleteCor,
		getCoresByModelo,
	} = useApp()
	const [searchParams, setSearchParams] = useSearchParams()
	const [formOpen, setFormOpen] = useState(false)
	const [editingCor, setEditingCor] = useState<Cor | null>(null)

	useEffect(() => {
		async function load() {
			try {
				await loadModelos()
			} catch {
				toast.error("Erro ao carregar modelos")
			}
		}
		load()
	}, [loadModelos])

	const selectedModeloId = searchParams.get("modelo") || ""

	const cores = useMemo(() => {
		if (!selectedModeloId) return []
		const id = parseInt(selectedModeloId)
		if (isNaN(id)) return []
		return getCoresByModelo(id)
	}, [selectedModeloId, getCoresByModelo])

	const selectedModelo = modelos.find(
		(m) => m.id === parseInt(selectedModeloId),
	)

	function handleModeloChange(value: string) {
		setSearchParams({ modelo: value })
	}

	async function handleCreate(data: { abreviacao: string; nome: string }) {
		if (!selectedModeloId) return
		const id = parseInt(selectedModeloId)
		if (isNaN(id)) return
		try {
			await addCor(id, data)
			toast.success("Cor criada com sucesso!")
		} catch (error) {
			toast.error("Erro ao criar cor: " + (error as Error).message)
		}
	}

	function handleEdit(cor: Cor) {
		setEditingCor(cor)
		setFormOpen(true)
	}

	async function handleUpdate(data: { abreviacao: string; nome: string }) {
		if (editingCor && selectedModeloId) {
			const modeloId = parseInt(selectedModeloId)
			if (isNaN(modeloId)) return
			try {
				await updateCor(modeloId, editingCor.id, data)
				toast.success("Cor atualizada com sucesso!")
			} catch (error) {
				toast.error("Erro ao atualizar cor: " + (error as Error).message)
			}
		}
	}

	async function handleDelete(id: number) {
		if (!selectedModeloId) return
		const modeloId = parseInt(selectedModeloId)
		if (isNaN(modeloId)) return
		try {
			await deleteCor(modeloId, id)
			toast.success("Cor excluída com sucesso!")
		} catch (error) {
			toast.error("Erro ao excluir cor: " + (error as Error).message)
		}
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
