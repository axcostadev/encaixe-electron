import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { Card, CardContent } from "@renderer/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
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

	const wrapperClass = asDialog ? "w-full" : "min-h-screen p-8"
	const cardClass = asDialog ? "max-h-[70vh] overflow-auto" : ""

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

				<Card className={cardClass}>
					<CardContent>
						<div className="flex flex-col gap-4 mb-4">
							<div className="flex-1">
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

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nome do Setor</TableHead>
									<TableHead>Ações</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{setores.map((s) => (
									<TableRow key={s.id}>
										<TableCell>{s.nome}</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEditar(s.id)}
											>
												Editar
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive"
												onClick={() => handleRemover(s.id)}
											>
												Deletar
											</Button>
										</TableCell>
									</TableRow>
								))}
								{setores.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={2}
											className="text-center text-muted-foreground"
										>
											Nenhum setor cadastrado.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
