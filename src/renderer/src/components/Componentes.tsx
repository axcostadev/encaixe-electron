import { useState } from "react"

interface ComponentesProps {
	onBack: () => void
}

interface CorSelecionada {
	id: number
	abreviada: string
	completa: string
}

export function Componentes({ onBack }: ComponentesProps): React.JSX.Element {
	const [coresSelecionadas, setCoresSelecionadas] = useState<CorSelecionada[]>([])

	const coresDisponiveis: CorSelecionada[] = [
		{ id: 1, abreviada: "BRT", completa: "Branca" },
		{ id: 2, abreviada: "PRD", completa: "Preta" },
		{ id: 3, abreviada: "VRM", completa: "Vermelha" },
		{ id: 4, abreviada: "AZL", completa: "Azul" },
		{ id: 5, abreviada: "VRD", completa: "Verde" },
	]

	const toggleCorSelecionada = (cor: CorSelecionada) => {
		setCoresSelecionadas((prev) => {
			const jaExiste = prev.find((c) => c.id === cor.id)
			if (jaExiste) {
				return prev.filter((c) => c.id !== cor.id)
			} else {
				return [...prev, cor]
			}
		})
	}

	const removerCorSelecionada = (corId: number) => {
		setCoresSelecionadas((prev) => prev.filter((c) => c.id !== corId))
	}

	return (
		<div className="min-h-screen bg-gray-100 p-8">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-4xl font-bold text-gray-800">Cadastro de Componentes</h1>
					<button
						onClick={onBack}
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					>
						Voltar
					</button>
				</div>

				<div className="bg-white rounded-lg shadow-lg p-6">
					<div className="grid grid-cols-2 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Modelo *
							</label>
							<select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
								<option>Selecione um modelo</option>
								<option>SHIRT001 - Camiseta Masculina</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Número do Tecido *
							</label>
							<input
								type="text"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: TEC001"
							/>
						</div>
					</div>

					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Nome do Componente *
						</label>
						<input
							type="text"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
							placeholder="Ex: Corpo Frontal"
						/>
					</div>

					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-4">
							Cores do Componente * (Selecione múltiplas cores)
						</label>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
							{coresDisponiveis.map((cor) => (
								<div key={cor.id} className="flex items-center">
									<input
										type="checkbox"
										id={`cor-${cor.id}`}
										checked={coresSelecionadas.some((c) => c.id === cor.id)}
										onChange={() => toggleCorSelecionada(cor)}
										className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
									/>
									<label
										htmlFor={`cor-${cor.id}`}
										className="ml-2 text-sm text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
									>
										{cor.abreviada} - {cor.completa}
									</label>
								</div>
							))}
						</div>

						{coresSelecionadas.length > 0 && (
							<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
								<p className="text-sm font-medium text-gray-700 mb-3">
									Cores selecionadas ({coresSelecionadas.length}):
								</p>
								<div className="flex flex-wrap gap-2">
									{coresSelecionadas.map((cor) => (
										<div
											key={cor.id}
											className="flex items-center gap-2 bg-blue-200 text-blue-900 px-3 py-1 rounded-full text-sm"
										>
											<span>
												{cor.abreviada} - {cor.completa}
											</span>
											<button
												onClick={() => removerCorSelecionada(cor.id)}
												className="text-blue-900 hover:text-red-600 font-bold ml-1"
											>
												✕
											</button>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Material *
						</label>
						<select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
							<option>Selecione um material</option>
							<option>MAT001 - Algodão Branco</option>
						</select>
					</div>

					<div className="mt-8 flex gap-4">
						<button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={coresSelecionadas.length === 0}>
							Salvar Componente
						</button>
						<button className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors">
							Cancelar
						</button>
					</div>
				</div>

				<div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
					<table className="w-full">
						<thead className="bg-gray-200">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Modelo
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Componente
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Cores
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Número Tecido
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Ações
								</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">SHIRT001</td>
								<td className="px-6 py-4 text-gray-700">Corpo Frontal</td>
								<td className="px-6 py-4">
									<div className="flex flex-wrap gap-1">
										<span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
											BRT
										</span>
										<span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
											PRD
										</span>
										<span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
											VRM
										</span>
									</div>
								</td>
								<td className="px-6 py-4 text-gray-700">TEC001</td>
								<td className="px-6 py-4">
									<button className="text-blue-600 hover:text-blue-800 mr-4">
										Editar
									</button>
									<button className="text-red-600 hover:text-red-800">Deletar</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

