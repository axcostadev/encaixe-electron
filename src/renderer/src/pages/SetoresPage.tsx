import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { Plus } from "lucide-react"
import { useSetores } from "@renderer/contexts/SetoresContext"
import { useState } from "react"

interface SetoresPageProps {
	onBack?: () => void
	asDialog?: boolean
}

export function SetoresPage({
	onBack,
	asDialog = false,
}: SetoresPageProps): React.JSX.Element {
	const [nome, setNome] = useState<string>("")
	const { setores, addSetor, removeSetor, updateSetor, loading } = useSetores()

	async function handleAdicionar() {
		const trimmed = nome.trim()
		if (!trimmed) return
		try {
			await addSetor(trimmed)
			setNome("")
		} catch (error) {
			alert("Erro ao adicionar setor: " + (error as Error).message)
		}
	}

	async function handleRemover(id: number) {
		if (!confirm("Tem certeza que deseja remover este setor?")) return
		try {
			await removeSetor(id)
		} catch (error) {
			alert("Erro ao remover setor: " + (error as Error).message)
		}
	}

	async function handleEditar(id: number) {
		const atual = setores.find((s) => s.id === id)
		if (!atual) return
		const novoNome = prompt("Nome do setor:", atual.nome)
		if (novoNome === null) return
		const trimmed = novoNome.trim()
		if (!trimmed) return
		try {
			await updateSetor(id, trimmed)
		} catch (error) {
			alert("Erro ao atualizar setor: " + (error as Error).message)
		}
	}

	const wrapperClass = asDialog ? "w-full" : "min-h-screen bg-gray-100 p-8"
	const cardClass = asDialog
		? "bg-white rounded-lg shadow-sm p-4 max-h-[70vh] overflow-auto"
		: "bg-white rounded-lg shadow-lg p-6"

	if (loading) {
		return (
			<div className={wrapperClass}>
				<div className={asDialog ? "mx-auto" : "max-w-4xl mx-auto"}>
					<div className="text-center py-8">Carregando setores...</div>
				</div>
			</div>
		)
	}

	return (
		<div className={wrapperClass}>
			<div className={asDialog ? "mx-auto" : "max-w-4xl mx-auto"}>
				<div
					className={`flex items-center justify-between mb-4 ${asDialog ? "" : "mb-8"}`}
				>
					<h1 className="text-2xl md:text-4xl font-bold text-gray-800">
						Cadastro de Setores
					</h1>
					{onBack && (
						<Button variant="ghost" onClick={onBack}>
							Voltar
						</Button>
					)}
				</div>

				<div className={cardClass}>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
						<div className="md:col-span-3 col-span-1">
							<Label htmlFor="nome">Nome do Setor *</Label>
							<Input
								id="nome"
								value={nome}
								onChange={(e) => setNome(e.target.value)}
								placeholder="Ex: Ponte, Lectra, Comelz..."
							/>
						</div>
						<div className="flex items-end gap-2">
							<Button variant="outline" onClick={() => setNome("")}>
								Cancelar
							</Button>
							<Button onClick={handleAdicionar}>
								<Plus className="h-4 w-4 mr-2" />
								Salvar Setor
							</Button>
						</div>
					</div>

					<div className="mt-2">
						<table className="w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left font-semibold text-gray-800">
										Nome do Setor
									</th>
									<th className="px-4 py-3 text-left font-semibold text-gray-800">
										Ações
									</th>
								</tr>
							</thead>
							<tbody>
								{setores.map((s) => (
									<tr
										key={s.id}
										className="border-t border-gray-200 hover:bg-gray-50"
									>
										<td className="px-4 py-3 text-gray-700">{s.nome}</td>
										<td className="px-4 py-3">
											<button
												className="text-blue-600 hover:text-blue-800 mr-4"
												onClick={() => handleEditar(s.id)}
											>
												Editar
											</button>
											<button
												className="text-red-600 hover:text-red-800"
												onClick={() => handleRemover(s.id)}
											>
												Deletar
											</button>
										</td>
									</tr>
								))}
								{setores.length === 0 && (
									<tr>
										<td
											colSpan={2}
											className="px-4 py-6 text-center text-muted-foreground"
										>
											Nenhum setor cadastrado.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	)
}
