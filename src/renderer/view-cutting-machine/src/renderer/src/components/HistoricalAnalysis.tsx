import { Calendar, TrendingUp, BarChart3, Download, Upload, RefreshCw, Filter, Folder } from "lucide-react"
import { useState, useCallback, useEffect } from "react"

type PeriodType = 'day' | 'week' | 'month' | 'year' | 'custom'

type MetricData = {
	period: string
	avgOcupacao: number
	totalRecords: number
	maquinasAtivas: number
	turnosRegistrados: number
	minOcupacao: number
	maxOcupacao: number
}

type HistoricalData = {
	success: boolean
	data: MetricData[]
	summary: {
		avgOcupacao: number
		totalRecords: number
		dateRange: { start: string; end: string }
		periods: number
	}
}

export default function HistoricalAnalysis() {
	const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month')
	const [customStartDate, setCustomStartDate] = useState<string>('')
	const [customEndDate, setCustomEndDate] = useState<string>('')
	const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null)
	const [loading, setLoading] = useState(false)
	const [importStatus, setImportStatus] = useState<string>('')
	const [importing, setImporting] = useState(false)
	const [dataPath, setDataPath] = useState<string>('')

	// Calcular datas baseado no período selecionado
	const getDateRange = useCallback((): { start: string; end: string } => {
		const today = new Date()
		const end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
		
		let start: Date
		
		switch (selectedPeriod) {
			case 'week':
				start = new Date(today)
				start.setDate(today.getDate() - 7)
				break
			case 'month':
				start = new Date(today)
				start.setMonth(today.getMonth() - 1)
				break
			case 'year':
				start = new Date(today)
				start.setFullYear(today.getFullYear() - 1)
				break
			case 'custom':
				return {
					start: customStartDate || end,
					end: customEndDate || end
				}
			default: // day
				start = new Date(today)
				start.setDate(today.getDate() - 1)
		}
		
		const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
		return { start: startStr, end }
	}, [selectedPeriod, customStartDate, customEndDate])

	// Carregar dados históricos
	const loadHistoricalData = useCallback(async () => {
		setLoading(true)
		try {
			const { start, end } = getDateRange()
			
			if (!window.electron?.ipcRenderer) {
				throw new Error('IPC não disponível')
			}
			
			const groupBy = selectedPeriod === 'custom' ? 'day' : selectedPeriod
			let response = await window.electron.ipcRenderer.invoke('get-historical-metrics', {
				startDate: start,
				endDate: end,
				groupBy,
				rangeMode: 'custom'
			})

			// Se não retornar nada no intervalo selecionado, tenta intervalo completo automaticamente
			if (response && response.success && response.summary.totalRecords === 0) {
				const fullResp = await window.electron.ipcRenderer.invoke('get-historical-metrics', {
					groupBy,
					rangeMode: 'full'
				})
				if (fullResp && fullResp.success) {
					response = fullResp
				}
			}

			if (response && response.success) {
				setHistoricalData(response)
				console.log('[HISTORICAL] Dados carregados:', response)
			} else {
				console.error('[HISTORICAL] Erro na resposta:', response)
				setHistoricalData(null)
			}
		} catch (error) {
			console.error('[HISTORICAL] Erro ao carregar dados:', error)
			setHistoricalData(null)
		} finally {
			setLoading(false)
		}
	}, [selectedPeriod, getDateRange])

	// Carregar dados quando período mudar
	useEffect(() => {
		loadHistoricalData()
		// Carregar o caminho dos dados na montagem
		window.electron?.ipcRenderer.invoke('get-data-path').then(result => {
			if (result.success) {
				setDataPath(result.path)
			}
		})
	}, [loadHistoricalData])

	// Importar dados de uma pasta
	const importHistoricalData = async () => {
		if (!window.electron?.ipcRenderer) {
			setImportStatus('❌ IPC não disponível')
			return
		}
		
		try {
			setImporting(true)
			setImportStatus('📂 Selecionando pasta...')
			
			// Selecionar pasta
			const selectResult = await window.electron.ipcRenderer.invoke('select-import-folder')
			
			if (selectResult.canceled) {
				setImportStatus('Seleção cancelada')
				setImporting(false)
				return
			}
			
			if (!selectResult.success) {
				setImportStatus(`❌ Erro: ${selectResult.error}`)
				setImporting(false)
				return
			}
			
			setImportStatus(`⏳ Importando dados de: ${selectResult.path}`)
			
			// Importar dados
			const importResult = await window.electron.ipcRenderer.invoke('import-historical-data', {
				folderPath: selectResult.path
			})
			
			if (importResult.success) {
				setImportStatus(
					`✅ Importação concluída!\n` +
					`📊 ${importResult.imported} registros importados\n` +
					`⏭️ ${importResult.skipped} pulados\n` +
					`❌ ${importResult.errors} erros\n` +
					`📅 Datas: ${importResult.dates.length} períodos`
				)
				
				// Recarregar dados
				setTimeout(() => {
					loadHistoricalData()
				}, 1000)
			} else {
				setImportStatus(`❌ Erro na importação: ${importResult.error}`)
			}
		} catch (error) {
			console.error('[IMPORT] Erro:', error)
			setImportStatus(`❌ Erro: ${String(error)}`)
		} finally {
			setImporting(false)
		}
	}

	// Abrir pasta de dados
	const openDataFolder = async () => {
		if (window.electron?.ipcRenderer) {
			await window.electron.ipcRenderer.invoke('open-data-folder');
		}
	}

	// Exportar dados para CSV
	const exportToCSV = () => {
		if (!historicalData || !historicalData.data.length) {
			alert('Não há dados para exportar')
			return
		}
		
		const headers = ['Período', 'Ocupação Média (%)', 'Registros', 'Máquinas Ativas', 'Turnos', 'Mín (%)', 'Máx (%)']
		const rows = historicalData.data.map(d => [
			d.period,
			d.avgOcupacao.toFixed(1),
			d.totalRecords,
			d.maquinasAtivas,
			d.turnosRegistrados,
			d.minOcupacao.toFixed(1),
			d.maxOcupacao.toFixed(1)
		])
		
		const csv = [
			headers.join(','),
			...rows.map(r => r.join(','))
		].join('\n')
		
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `analise-historica-${new Date().toISOString().split('T')[0]}.csv`
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	return (
		<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
			{/* Header */}
			<div className="bg-white p-6 rounded-lg shadow-sm border">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
							<BarChart3 className="text-blue-600" />
							Análise Histórica de Ocupação
						</h1>
						<p className="text-gray-600 mt-1">
							Visualize tendências e métricas de performance ao longo do tempo
						</p>
						<p className="text-xs text-gray-500 mt-2">
							Use o botão "Importar Dados" para adicionar o histórico completo de uma pasta local. O sistema irá ler todos os arquivos <code>.json</code>.
						</p>
					</div>
					
					<div className="flex gap-2 flex-wrap justify-end">
						<button
							onClick={importHistoricalData}
							disabled={importing}
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
						>
							<Upload size={16} className={importing ? 'animate-pulse' : ''} />
							{importing ? 'Importando...' : 'Importar Dados'}
						</button>
						
						<button
							onClick={loadHistoricalData}
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
						>
							<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
							Atualizar
						</button>
						
						<button
							onClick={exportToCSV}
							disabled={!historicalData || !historicalData.data.length}
							className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
						>
							<Download size={16} />
							Exportar CSV
						</button>
						<button
							onClick={openDataFolder}
							title={`Abrir pasta de dados: ${dataPath}`}
							className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
						>
							<Folder size={16} />
							Abrir Pasta
						</button>
					</div>
				</div>
				
				{/* Status de Importação */}
				{importStatus && (
					<div className={`mt-4 p-3 rounded-lg ${
						importStatus.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' :
						importStatus.includes('❌') ? 'bg-red-50 border border-red-200 text-red-800' :
						'bg-blue-50 border border-blue-200 text-blue-800'
					}`}>
						<pre className="text-sm font-mono whitespace-pre-wrap">{importStatus}</pre>
					</div>
				)}
			</div>

			{/* Filtros de Período */}
			<div className="bg-white p-6 rounded-lg shadow-sm border">
				<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Filter className="text-blue-600" size={20} />
					Selecionar Período de Análise
				</h2>
				
				<div className="flex flex-wrap gap-3">
					<button
						onClick={() => setSelectedPeriod('day')}
						className={`px-4 py-2 rounded-md font-medium transition-colors ${
							selectedPeriod === 'day'
								? 'bg-blue-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						Último Dia
					</button>
					
					<button
						onClick={() => setSelectedPeriod('week')}
						className={`px-4 py-2 rounded-md font-medium transition-colors ${
							selectedPeriod === 'week'
								? 'bg-blue-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						Última Semana
					</button>
					
					<button
						onClick={() => setSelectedPeriod('month')}
						className={`px-4 py-2 rounded-md font-medium transition-colors ${
							selectedPeriod === 'month'
								? 'bg-blue-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						Último Mês
					</button>
					
					<button
						onClick={() => setSelectedPeriod('year')}
						className={`px-4 py-2 rounded-md font-medium transition-colors ${
							selectedPeriod === 'year'
								? 'bg-blue-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						Último Ano
					</button>
					
					<button
						onClick={() => setSelectedPeriod('custom')}
						className={`px-4 py-2 rounded-md font-medium transition-colors ${
							selectedPeriod === 'custom'
								? 'bg-blue-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						<Calendar size={16} className="inline mr-2" />
						Período Customizado
					</button>
				</div>
				
				{/* Seletor de Data Customizada */}
				{selectedPeriod === 'custom' && (
					<div className="mt-4 flex gap-4 items-center">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
							<input
								type="date"
								value={customStartDate}
								onChange={(e) => setCustomStartDate(e.target.value)}
								className="px-3 py-2 border rounded-md"
							/>
						</div>
						
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
							<input
								type="date"
								value={customEndDate}
								onChange={(e) => setCustomEndDate(e.target.value)}
								className="px-3 py-2 border rounded-md"
							/>
						</div>
						
						<button
							onClick={loadHistoricalData}
							className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							Aplicar
						</button>
					</div>
				)}
			</div>

			{/* Resumo de Métricas */}
			{historicalData && historicalData.summary && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-blue-100 text-sm">Ocupação Média</p>
								<p className="text-3xl font-bold mt-1">
									{historicalData.summary.avgOcupacao.toFixed(1)}%
								</p>
							</div>
							<TrendingUp size={40} className="text-blue-200" />
						</div>
					</div>
					
					<div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-green-100 text-sm">Total de Registros</p>
								<p className="text-3xl font-bold mt-1">
									{historicalData.summary.totalRecords.toLocaleString()}
								</p>
							</div>
							<BarChart3 size={40} className="text-green-200" />
						</div>
					</div>
					
					<div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-purple-100 text-sm">Períodos Analisados</p>
								<p className="text-3xl font-bold mt-1">
									{historicalData.summary.periods}
								</p>
							</div>
							<Calendar size={40} className="text-purple-200" />
						</div>
					</div>
					
					<div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-md">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-orange-100 text-sm">Intervalo</p>
								<p className="text-sm font-semibold mt-1">
									{historicalData.summary.dateRange.start}
								</p>
								<p className="text-sm font-semibold">
									→ {historicalData.summary.dateRange.end}
								</p>
							</div>
							<Calendar size={40} className="text-orange-200" />
						</div>
					</div>
				</div>
			)}

			{/* Gráfico de Linha Temporal */}
			{historicalData && historicalData.data.length > 0 && (
				<div className="bg-white p-6 rounded-lg shadow-sm border">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Evolução da Ocupação ao Longo do Tempo
					</h2>
					
					<div className="relative h-80 border-l-2 border-b-2 border-gray-300 p-4">
						{/* Eixo Y */}
						<div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 -ml-8">
							<span>100%</span>
							<span>80%</span>
							<span>60%</span>
							<span>40%</span>
							<span>20%</span>
							<span>0%</span>
						</div>
						
						{/* Linha de Meta 80% */}
						<div className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400" style={{ bottom: '80%' }}>
							<span className="text-xs text-blue-600 font-medium ml-2">Meta: 80%</span>
						</div>
						
						{/* Pontos e Linha do Gráfico */}
						<svg className="w-full h-full">
							{historicalData.data.map((point, idx) => {
								const x = (idx / (historicalData.data.length - 1)) * 100
								const y = 100 - point.avgOcupacao
								const nextPoint = historicalData.data[idx + 1]
								
								return (
									<g key={point.period}>
										{/* Linha conectando pontos */}
										{nextPoint && (
											<line
												x1={`${x}%`}
												y1={`${y}%`}
												x2={`${(idx + 1) / (historicalData.data.length - 1) * 100}%`}
												y2={`${100 - nextPoint.avgOcupacao}%`}
												stroke="#3B82F6"
												strokeWidth="2"
											/>
										)}
										
										{/* Ponto */}
										<circle
											cx={`${x}%`}
											cy={`${y}%`}
											r="4"
											fill={point.avgOcupacao >= 80 ? '#10B981' : '#EF4444'}
											className="hover:r-6 transition-all cursor-pointer"
										>
											<title>
												{point.period}: {point.avgOcupacao.toFixed(1)}%
											</title>
										</circle>
									</g>
								)
							})}
						</svg>
						
						{/* Eixo X (Períodos) */}
						<div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 mt-2">
							{historicalData.data.map((point, idx) => {
								if (idx % Math.ceil(historicalData.data.length / 8) === 0 || idx === historicalData.data.length - 1) {
									return (
										<span key={point.period} className="transform -rotate-45 origin-top-left">
											{point.period}
										</span>
									)
								}
								return null
							})}
						</div>
					</div>
				</div>
			)}

			{/* Tabela Detalhada */}
			{historicalData && historicalData.data.length > 0 && (
				<div className="bg-white rounded-lg shadow-sm border overflow-hidden">
					<div className="p-4 bg-gray-50 border-b">
						<h2 className="text-lg font-semibold text-gray-900">
							Dados Detalhados por Período
						</h2>
					</div>
					
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Período
									</th>
									<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Ocupação Média
									</th>
									<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Registros
									</th>
									<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Máquinas Ativas
									</th>
									<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Turnos
									</th>
									<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
										Mín / Máx
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{historicalData.data.map((row) => (
									<tr key={row.period} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{row.period}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-center">
											<span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
												row.avgOcupacao >= 85 ? 'bg-green-100 text-green-800' :
												row.avgOcupacao >= 70 ? 'bg-blue-100 text-blue-800' :
												row.avgOcupacao >= 50 ? 'bg-yellow-100 text-yellow-800' :
												'bg-red-100 text-red-800'
											}`}>
												{row.avgOcupacao.toFixed(1)}%
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
											{row.totalRecords.toLocaleString()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
											{row.maquinasAtivas}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
											{row.turnosRegistrados}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
											<span className="text-red-600">{row.minOcupacao.toFixed(1)}%</span>
											{' / '}
											<span className="text-green-600">{row.maxOcupacao.toFixed(1)}%</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Estado Vazio */}
			{historicalData && !historicalData.data.length && !loading && (
				<div className="bg-white p-12 rounded-lg shadow-sm border text-center">
					<BarChart3 size={64} className="mx-auto text-gray-400 mb-4" />
					<h3 className="text-xl font-semibold text-gray-700 mb-2">
						Nenhum dado encontrado
					</h3>
					<p className="text-gray-500 mb-6">
						Não há dados históricos disponíveis para o período selecionado.
						Importe dados ou ajuste o período de análise.
					</p>
					<button
						onClick={importHistoricalData}
						className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
					>
						<Upload size={20} />
						Importar Dados Históricos
					</button>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className="bg-white p-12 rounded-lg shadow-sm border text-center">
					<RefreshCw size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
					<p className="text-gray-600">Carregando dados históricos...</p>
				</div>
			)}
		</div>
	)
}
