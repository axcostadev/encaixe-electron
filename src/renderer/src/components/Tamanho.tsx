interface TamanhoProps {
	onBack: () => void
}

export function Tamanho({ onBack }: TamanhoProps): React.JSX.Element {
	return (
		<div className="min-h-screen bg-gray-100 p-8">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-4xl font-bold text-gray-800">Cadastro de Tamanhos</h1>
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
								Componente *
							</label>
							<select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
								<option>Selecione um componente</option>
								<option>Corpo Frontal (SHIRT001 - Branca)</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Tamanho *
							</label>
							<input
								type="text"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: 33 ao 36 ou 33, 34, 35, 36"
							/>
						</div>
					</div>

					<div className="mt-8 flex gap-4">
						<button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
							Salvar Tamanho
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
									Componente
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Tamanho
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Ações
								</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">Corpo Frontal</td>
								<td className="px-6 py-4 text-gray-700">33 ao 36</td>
								<td className="px-6 py-4">
									<button className="text-blue-600 hover:text-blue-800 mr-4">
										Editar
									</button>
									<button className="text-red-600 hover:text-red-800">Deletar</button>
								</td>
							</tr>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">Corpo Frontal</td>
								<td className="px-6 py-4 text-gray-700">33, 34, 35, 36</td>
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
