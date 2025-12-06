import React, { useEffect, useState } from "react"

interface ModeloProps {
	onBack: () => void
}

interface Modelo {
	id: number
	artigo: string
	nome: string
}

interface ModeloCor {
	id: number
	modelo_id: number
	cor_abreviada: string
	cor_completa: string
}

const api = (window as any).api

export function Modelo({ onBack }: ModeloProps): React.JSX.Element {
	const [modelos, setModelos] = useState<Modelo[]>([])
	const [loading, setLoading] = useState(false)

	const [artigo, setArtigo] = useState("")
	const [nome, setNome] = useState("")
	const [editingId, setEditingId] = useState<number | null>(null)

	const [cores, setCores] = useState<ModeloCor[]>([])
	const [corAbreviada, setCorAbreviada] = useState("")
	const [corCompleta, setCorCompleta] = useState("")

	const [message, setMessage] = useState<string | null>(null)

	useEffect(() => {
		loadModelos()
	}, [])

	async function loadModelos() {
		setLoading(true)
		try {
			const res: Modelo[] = await api.modelos.list()
			setModelos(res || [])
		} catch (err) {
			console.error(err)
			setModelos([])
		} finally {
			setLoading(false)
		}
	}

	async function loadCores(modeloId: number) {
		try {
			const res: ModeloCor[] = await api.modelos.cores.list(modeloId)
			setCores(res || [])
		} catch (err) {
			console.error(err)
			setCores([])
		}
	}

	async function onSave() {
		if (!artigo.trim() || !nome.trim()) {
			setMessage("Preencha Artigo e Nome")
			return
		}
		if (editingId) {
			const res = await api.modelos.update(editingId, artigo.trim(), nome.trim())
			setMessage(res?.message ?? "")
		} else {
			const res = await api.modelos.create(artigo.trim(), nome.trim())
			setMessage(res?.message ?? "")
		}
		clearForm()
		await loadModelos()
	}

	function clearForm() {
		setArtigo("")
		setNome("")
		setEditingId(null)
		setCores([])
		setCorAbreviada("")
		setCorCompleta("")
	}

	function onEdit(modelo: Modelo) {
		setEditingId(modelo.id)
		setArtigo(modelo.artigo)
		setNome(modelo.nome)
		loadCores(modelo.id)
	}

	async function onDelete(id: number) {
		if (!confirm("Confirma exclusão do modelo?")) return
		const res = await api.modelos.delete(id)
		setMessage(res?.message ?? "")
		if (editingId === id) clearForm()
		await loadModelos()
	}

	async function onAddCor() {
		if (!editingId) {
			setMessage("Salve ou selecione um modelo antes de adicionar cores")
			return
		}
		if (!corAbreviada.trim() || !corCompleta.trim()) {
			setMessage("Preencha a cor abreviada e completa")
			return
		}
		const res = await api.modelos.cores.add(editingId, corAbreviada.trim(), corCompleta.trim())
		setMessage(res?.message ?? "")
		setCorAbreviada("")
		setCorCompleta("")
		await loadCores(editingId)
	}

	async function onDeleteCor(id: number) {
		if (!confirm("Confirma exclusão da cor?")) return
		const res = await api.modelos.cores.delete(id)
		setMessage(res?.message ?? "")
		if (editingId) await loadCores(editingId)
	}

	return (
		<div className="min-h-screen bg-gray-100 p-8">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-4xl font-bold text-gray-800">Cadastro de Modelos</h1>
					<div className="flex gap-3">
						<button
							onClick={() => {
								clearForm()
								onBack()
							}}
							className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
						>
							Voltar
						</button>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-lg p-6">
					{message && (
						<div className="mb-4 text-sm text-gray-700">{message}</div>
					)}
					<div className="grid grid-cols-2 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Artigo *</label>
							<input
								value={artigo}
								onChange={(e) => setArtigo(e.target.value)}
								type="text"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: SHIRT001"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
							<input
								value={nome}
								onChange={(e) => setNome(e.target.value)}
								type="text"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: Camiseta Masculina"
							/>
						</div>
					</div>

					<div className="border-t pt-6">
						<h3 className="text-lg font-semibold text-gray-800 mb-4">Cores do Modelo</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Cor Abreviada</label>
									<input
										value={corAbreviada}
										onChange={(e) => setCorAbreviada(e.target.value)}
										type="text"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
										placeholder="Ex: BRT"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Cor Completa</label>
									<input
										value={corCompleta}
										onChange={(e) => setCorCompleta(e.target.value)}
										type="text"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
										placeholder="Ex: Branca"
									/>
								</div>
							</div>
							<div>
								<button
									onClick={onAddCor}
									className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
								>
									Adicionar Cor
								</button>
							</div>
							{cores.length > 0 && (
								<div className="mt-4">
									<h4 className="text-sm font-medium mb-2">Cores adicionadas</h4>
									<ul className="space-y-2">
										{cores.map((c) => (
											<li key={c.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
												<div>
													<strong className="mr-2">{c.cor_abreviada}</strong>
													<span className="text-sm text-gray-700">{c.cor_completa}</span>
												</div>
												<button
													onClick={() => onDeleteCor(c.id)}
													className="text-red-600 hover:text-red-800"
												>
													Remover
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</div>

					<div className="mt-8 flex gap-4">
						<button
							onClick={onSave}
							className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
						>
							{editingId ? "Atualizar Modelo" : "Salvar Modelo"}
						</button>
						<button
							onClick={clearForm}
							className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
						>
							Cancelar
						</button>
					</div>
				</div>

				<div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
					<table className="w-full">
						<thead className="bg-gray-200">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Artigo</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Nome</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Cores</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Ações</th>
							</tr>
						</thead>
						<tbody>
							{loading && (
								<tr>
									<td colSpan={4} className="px-6 py-4 text-center text-gray-600">Carregando...</td>
								</tr>
							)}
							{!loading && modelos.length === 0 && (
								<tr>
									<td colSpan={4} className="px-6 py-4 text-center text-gray-600">Nenhum modelo encontrado</td>
								</tr>
							)}
							{!loading && modelos.map((m) => (
								<tr key={m.id} className="border-t border-gray-300 hover:bg-gray-50">
									<td className="px-6 py-4 text-gray-700">{m.artigo}</td>
									<td className="px-6 py-4 text-gray-700">{m.nome}</td>
									<td className="px-6 py-4 text-gray-700">
										<button
											onClick={() => loadCores(m.id)}
											className="text-sm text-blue-600 hover:underline"
										>
											Ver cores
										</button>
									</td>
									<td className="px-6 py-4">
										<button
											onClick={() => onEdit(m)}
											className="text-blue-600 hover:text-blue-800 mr-4"
										>
											Editar
										</button>
										<button
											onClick={() => onDelete(m.id)}
											className="text-red-600 hover:text-red-800"
										>
											Deletar
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}
