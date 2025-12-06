interface MaterialProps {
	onBack: () => void
}

export function Material({ onBack }: MaterialProps): React.JSX.Element {
	return (
		<div className="min-h-screen bg-gray-100 p-8">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-4xl font-bold text-gray-800">Cadastro de Materiais</h1>
					<button
						onClick={onBack}
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					>
						Voltar
					</button>
				</div>

				<div className="bg-white rounded-lg shadow-lg p-6">
					<div className="grid grid-cols-3 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Artigo do Material *
							</label>
							<input
								type="text"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: MAT001"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Cor *
							</label>
							<input
								type="text"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: Branco"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Espessura (mm)
							</label>
							<input
								type="number"
								step="0.1"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: 2.5"
							/>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Largura do Material (cm)
							</label>
							<input
								type="number"
								step="0.1"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: 150"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Sentido de Corte *
							</label>
							<select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
								<option value="">Selecione</option>
								<option value="N">N - Normal</option>
								<option value="S">S - Sem direção</option>
								<option value="U">U - Unidirecional</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Conjugação Navalha
							</label>
							<input
								type="number"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: 1"
							/>
						</div>
					</div>

					<div className="grid grid-cols-4 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Placa Par
							</label>
							<input
								type="number"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: 1"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Camadas
							</label>
							<input
								type="number"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: 1"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Espaçamento (mm)
							</label>
							<input
								type="number"
								step="0.1"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
								placeholder="Ex: 0"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Setor *
							</label>
							<select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
								<option>Selecione um setor</option>
								<option>Ponte</option>
								<option>Lectra</option>
								<option>Comelz</option>
								<option>EMMA</option>
								<option>Laser</option>
							</select>
						</div>
					</div>

					<div className="mt-8 flex gap-4">
						<button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
							Salvar Material
						</button>
						<button className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors">
							Cancelar
						</button>
					</div>
				</div>

				<div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-gray-200">
							<tr>
								<th className="px-4 py-3 text-left font-semibold text-gray-800">Artigo</th>
								<th className="px-4 py-3 text-left font-semibold text-gray-800">Cor</th>
								<th className="px-4 py-3 text-left font-semibold text-gray-800">Espessura</th>
								<th className="px-4 py-3 text-left font-semibold text-gray-800">Largura</th>
								<th className="px-4 py-3 text-left font-semibold text-gray-800">Corte</th>
								<th className="px-4 py-3 text-left font-semibold text-gray-800">Setor</th>
								<th className="px-4 py-3 text-left font-semibold text-gray-800">Ações</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-4 py-3 text-gray-700">MAT001</td>
								<td className="px-4 py-3 text-gray-700">Branco</td>
								<td className="px-4 py-3 text-gray-700">2.5mm</td>
								<td className="px-4 py-3 text-gray-700">150cm</td>
								<td className="px-4 py-3 text-gray-700">N</td>
								<td className="px-4 py-3 text-gray-700">Ponte</td>
								<td className="px-4 py-3">
									<button className="text-blue-600 hover:text-blue-800 mr-2">Editar</button>
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
