interface SetorProps {
	onBack: () => void
}

export function Setor({ onBack }: SetorProps): React.JSX.Element {
	return (
		<div className="min-h-screen bg-gray-100 p-8">
			<div className="max-w-4xl mx-auto">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-4xl font-bold text-gray-800">Cadastro de Setores</h1>
					<button
						onClick={onBack}
						className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					>
						Voltar
					</button>
				</div>

				<div className="bg-white rounded-lg shadow-lg p-6">
					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Nome do Setor *
						</label>
						<input
							type="text"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
							placeholder="Ex: Ponte, Lectra, Comelz, EMMA, Laser..."
						/>
					</div>

					<div className="flex gap-4">
						<button className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
							Salvar Setor
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
									Nome do Setor
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">
									Ações
								</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">Ponte</td>
								<td className="px-6 py-4">
									<button className="text-blue-600 hover:text-blue-800 mr-4">Editar</button>
									<button className="text-red-600 hover:text-red-800">Deletar</button>
								</td>
							</tr>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">Lectra</td>
								<td className="px-6 py-4">
									<button className="text-blue-600 hover:text-blue-800 mr-4">Editar</button>
									<button className="text-red-600 hover:text-red-800">Deletar</button>
								</td>
							</tr>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">Comelz</td>
								<td className="px-6 py-4">
									<button className="text-blue-600 hover:text-blue-800 mr-4">Editar</button>
									<button className="text-red-600 hover:text-red-800">Deletar</button>
								</td>
							</tr>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">EMMA</td>
								<td className="px-6 py-4">
									<button className="text-blue-600 hover:text-blue-800 mr-4">Editar</button>
									<button className="text-red-600 hover:text-red-800">Deletar</button>
								</td>
							</tr>
							<tr className="border-t border-gray-300 hover:bg-gray-50">
								<td className="px-6 py-4 text-gray-700">Laser</td>
								<td className="px-6 py-4">
									<button className="text-blue-600 hover:text-blue-800 mr-4">Editar</button>
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
