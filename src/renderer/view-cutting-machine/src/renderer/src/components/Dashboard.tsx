import { Clock, TrendingUp, Users, Calendar, Filter, Download, RefreshCw, AlertCircle, CheckCircle2, XCircle, Activity, BarChart3 } from "lucide-react"
import React, { useCallback, useEffect, useState } from "react"
import HistoricalAnalysis from "./HistoricalAnalysis"
import { usePeriodosConfig } from "../hooks/usePeriodosConfig"

// Tipos para métricas do dashboard
type TurnoMetrics = {
	turno: number
	ocupacaoMedia: number
	totalHoras: number
	maquinasAtivas: number
	grupo?: string
}

type GrupoMetrics = {
	grupo: string
	turnos: TurnoMetrics[]
	resumo: {
		ocupacaoMedia: number
		maquinasAtivas: number
		totalHoras: number
	}
}

type DashboardData = {
	data: string
	metricas: {
		geral: TurnoMetrics[]
		porGrupo: GrupoMetrics[]
	}
	comparacao: {
		semanaAnterior: number
		mesAnterior: number
	}
	ranking: {
		maquina: string
		ocupacao: number
		grupo: string
	}[]
}

type MetricCard = {
	title: string
	value: string
	subtitle: string
	icon: React.ComponentType<{ size?: number; className?: string }>
	trend?: {
		value: number
		isPositive: boolean
	}
}

export default function Dashboard() {
	const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

	// Períodos carregados localmente via IPC (nunca da rede)
	const periodosConfig = usePeriodosConfig()

	// Função helper para calcular total de horas do turno baseado no baseCalculo
	const calcularHorasTurno = (turno: number): number => {
		let periodos = periodosConfig.turno1
		if (turno === 2) periodos = periodosConfig.turno2
		else if (turno === 3) periodos = periodosConfig.turno3
		const totalMinutos = periodos.reduce((sum, periodo) => sum + periodo.baseCalculo, 0)
		return Number((totalMinutos / 60).toFixed(2))
	}

	// Use local date string (YYYY-MM-DD) to avoid UTC toISOString() shifting the date
	const getLocalDateString = () => {
		const d = new Date()
		const y = d.getFullYear()
		const m = String(d.getMonth() + 1).padStart(2, '0')
		const day = String(d.getDate()).padStart(2, '0')
		return `${y}-${m}-${day}`
	}

	const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString())
	const [selectedTurno, setSelectedTurno] = useState<number | 'todos'>("todos")
	const [selectedGrupo, setSelectedGrupo] = useState<string | 'todos'>("todos")
	const [loading, setLoading] = useState(false)
	const [viewMode, setViewMode] = useState<'cards' | 'table' | 'charts' | 'historical'>('cards')
	const [showExportMenu, setShowExportMenu] = useState(false)
	const [autoRefresh, setAutoRefresh] = useState(false)
	const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

	// Dados de exemplo como fallback com nova estrutura
	const getExampleData = (): DashboardData => {
		const grupos = ["Laser", "Lectra", "Emma", "Comelz", "ComelzMontagem", "ComelzSolas"]
		
	const generateTurnoMetrics = (turno: number, grupo: string): TurnoMetrics => {
		const baseOcupacao = 85 - (turno - 1) * 7 // 1º turno melhor que outros
		const variation = Math.random() * 10 - 5 // -5% a +5%
		const maquinasAtivas = 6 + Math.floor(Math.random() * 4) // 6-10 máquinas por grupo
		
		// Calcula horas totais baseado no baseCalculo dos períodos * número de máquinas
		const horasPorTurno = calcularHorasTurno(turno)
		const totalHoras = Number((horasPorTurno * maquinasAtivas).toFixed(2))
		
		return {
			turno,
			ocupacaoMedia: Math.max(0, Math.min(100, baseOcupacao + variation)),
			totalHoras,
			maquinasAtivas,
			grupo
		}
	}
	
	const gerarGrupoMetrics = (grupo: string): GrupoMetrics => {
			const turnos = [1, 2, 3].map(turno => generateTurnoMetrics(turno, grupo))
			const resumo = {
				ocupacaoMedia: turnos.reduce((sum, t) => sum + t.ocupacaoMedia, 0) / turnos.length,
				maquinasAtivas: turnos.reduce((sum, t) => sum + t.maquinasAtivas, 0),
				totalHoras: turnos.reduce((sum, t) => sum + t.totalHoras, 0)
			}
			
			return { grupo, turnos, resumo }
		}

		const porGrupo = grupos.map(gerarGrupoMetrics)
		const geral = [1, 2, 3].map(turno => {
			const turnoData = porGrupo.flatMap(g => g.turnos.filter(t => t.turno === turno))
			return {
				turno,
				ocupacaoMedia: turnoData.reduce((sum, t) => sum + t.ocupacaoMedia, 0) / turnoData.length,
				totalHoras: turnoData.reduce((sum, t) => sum + t.totalHoras, 0),
				maquinasAtivas: turnoData.reduce((sum, t) => sum + t.maquinasAtivas, 0)
			}
		})

		return {
			data: selectedDate,
			metricas: { geral, porGrupo },
			comparacao: {
				semanaAnterior: Math.round((Math.random() - 0.5) * 20 * 100) / 100,
				mesAnterior: Math.round((Math.random() - 0.5) * 30 * 100) / 100
			},
			ranking: [
				{ maquina: "02-2010", ocupacao: 95.2, grupo: "Laser" },
				{ maquina: "02-1435", ocupacao: 92.8, grupo: "Lectra" },
				{ maquina: "02-2774", ocupacao: 89.5, grupo: "Emma" },
				{ maquina: "02-1555", ocupacao: 87.1, grupo: "Comelz" },
				{ maquina: "02-2416", ocupacao: 85.9, grupo: "Laser" },
				{ maquina: "02-2615", ocupacao: 84.3, grupo: "Lectra" },
				{ maquina: "02-2672", ocupacao: 82.7, grupo: "Emma" },
				{ maquina: "02-1556", ocupacao: 81.4, grupo: "Comelz" },
				{ maquina: "02-1765", ocupacao: 79.8, grupo: "Laser" },
				{ maquina: "02-1681", ocupacao: 78.2, grupo: "Lectra" }
			]
		}
	}

	// Carregar dados dinâmicos do banco de dados
	const loadDashboardData = useCallback(async () => {
		setLoading(true)
		try {
			console.log(`[Dashboard] Carregando dados para data: ${selectedDate}`)
			
			// Verificar se o IPC está disponível
			if (!window.electron || !window.electron.ipcRenderer) {
				console.error("[Dashboard] IPC Renderer não está disponível")
				throw new Error("IPC Renderer não está disponível")
			}
			
			// Buscar dados reais do backend por data específica
			const response = await (await import('../services/turnoService')).getDashboardByDate({
				date: selectedDate,
				turno: selectedTurno,
				grupo: selectedGrupo,
			})
			
			if (response && response.metricas) {
				setDashboardData(response)
				console.log(`[Dashboard] Dados carregados com sucesso:`, response)
			} else {
				console.warn("[Dashboard] Resposta inválida do backend:", response)
				// Fallback para dados de exemplo se houver erro
				setDashboardData(getExampleData())
			}
		} catch (error) {
			console.error("[Dashboard] Erro ao carregar dados:", error)
			// Fallback para dados de exemplo em caso de erro
			setDashboardData(getExampleData())
		} finally {
			setLoading(false)
		}
	}, [selectedDate, selectedTurno, selectedGrupo])

	// Carregar dados quando o componente monta ou filtros mudam
	useEffect(() => {
		loadDashboardData()
	}, [loadDashboardData])

	// Auto-refresh funcionalidade
	useEffect(() => {
		if (autoRefresh) {
			const interval = setInterval(() => {
				loadDashboardData()
			}, 30000) // 30 segundos
			setRefreshInterval(interval)
			return () => clearInterval(interval)
		} else {
			if (refreshInterval) {
				clearInterval(refreshInterval)
				setRefreshInterval(null)
			}
			return () => {} // Adicionar retorno vazio para o else
		}
	}, [autoRefresh, loadDashboardData])

	// Função para exportar dados
	const exportData = async (format: 'csv' | 'json' | 'pdf') => {
		try {
			if (!dashboardData) return
			
			const exportData = {
				data: selectedDate,
				turno: selectedTurno,
				grupo: selectedGrupo,
				metricas: dashboardData.metricas,
				ranking: dashboardData.ranking
			}

			if (format === 'csv') {
				// Converter para CSV
				const csv = convertToCSV(exportData)
				downloadFile(csv, `dashboard-${selectedDate}.csv`, 'text/csv')
			} else if (format === 'json') {
				// Exportar JSON
				const json = JSON.stringify(exportData, null, 2)
				downloadFile(json, `dashboard-${selectedDate}.json`, 'application/json')
			} else if (format === 'pdf') {
				// Chamar backend para gerar PDF
				await (await import('../services/turnoService')).exportDashboardPdf(exportData)
			}
			
			setShowExportMenu(false)
		} catch (error) {
			console.error('[Dashboard] Erro ao exportar:', error)
		}
	}

	// Helpers para CSV
	const safeNumber = (value: unknown, decimals = 2): string => {
		const n = Number(value)
		return Number.isFinite(n) ? n.toFixed(decimals) : (0).toFixed(decimals)
	}
	const escapeCSV = (value: string): string => {
		if (/[,"\n]/.test(value)) {
			return `"${value.replace(/"/g, '""')}"`
		}
		return value
	}

	const convertToCSV = (data: any): string => {
		// Implementação robusta de conversão para CSV
		const rows: string[][] = []
		rows.push(["Data", "Turno", "Grupo", "Ocupação Média", "Eficiência", "Máquinas Ativas"])

		// Verificar estrutura antes de iterar
		if (data && data.metricas && Array.isArray(data.metricas.geral)) {
			data.metricas.geral.forEach((m: any) => {
				rows.push([
					String(data.data ?? ""),
					String(m?.turno ?? ""),
					String(data.grupo ?? "Todos"),
					safeNumber(m?.ocupacaoMedia, 2),
					safeNumber(m?.eficiencia, 2),
					String(m?.maquinasAtivas ?? 0),
				])
			})
		}

		// Escapar campos e montar CSV final
		return rows.map((row) => row.map(escapeCSV).join(",")).join("\n")
	}

	const downloadFile = (content: string, filename: string, mimeType: string) => {
		const blob = new Blob([content], { type: mimeType })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="flex flex-col items-center space-y-4">
					<div className="relative">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
							<Activity size={20} className="text-blue-600 animate-pulse" />
						</div>
					</div>
					<div className="text-center">
						<p className="text-gray-600 font-medium">Carregando métricas...</p>
						<p className="text-sm text-gray-400 mt-1">Processando dados em tempo real</p>
					</div>
				</div>
			</div>
		)
	}

	if (!dashboardData) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<p className="text-gray-500 mb-4">Erro ao carregar dados do dashboard</p>
					<button 
						onClick={loadDashboardData}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Tentar Novamente
					</button>
				</div>
			</div>
		)
	}

	// Filtrar dados baseado nos filtros selecionados (SOMENTE SE dashboardData existir)
	const getFilteredData = () => {
		if (!dashboardData) return { metricas: [], grupos: [] }
		
		let metricas = dashboardData.metricas.geral
		let grupos = dashboardData.metricas.porGrupo

		// Filtrar por turno se selecionado
		if (selectedTurno !== "todos") {
			metricas = metricas.filter(m => m.turno === selectedTurno)
			grupos = grupos.map(g => ({
				...g,
				turnos: g.turnos.filter(t => t.turno === selectedTurno)
			}))
		}

		// Filtrar por grupo se selecionado
		if (selectedGrupo !== "todos") {
			grupos = grupos.filter(g => g.grupo === selectedGrupo)
		}

		return { metricas, grupos }
	}

	const { metricas: currentMetrics, grupos: currentGrupos } = getFilteredData()

	const ocupacaoGeral = currentMetrics.length > 0 
		? currentMetrics.reduce((sum, t) => sum + t.ocupacaoMedia, 0) / currentMetrics.length 
		: 0

	// Calcular status geral (MOVER PARA DEPOIS das variáveis acima)
	const getStatusGeral = () => {
		if (ocupacaoGeral >= 85) return { label: 'Excelente', color: 'green', icon: CheckCircle2 }
		if (ocupacaoGeral >= 70) return { label: 'Bom', color: 'blue', icon: Activity }
		if (ocupacaoGeral >= 50) return { label: 'Atenção', color: 'yellow', icon: AlertCircle }
		return { label: 'Crítico', color: 'red', icon: XCircle }
	}

	const status = getStatusGeral()

	const metricCards: MetricCard[] = [
		{
			title: "Ocupação Média",
			value: `${ocupacaoGeral.toFixed(1)}%`,
			subtitle: `vs semana anterior`,
			icon: TrendingUp,
			trend: dashboardData ? {
				value: dashboardData.comparacao.semanaAnterior,
				isPositive: dashboardData.comparacao.semanaAnterior > 0
			} : undefined
		},
		{
			title: "Máquinas Ativas",
			value: currentMetrics.length > 0 ? currentMetrics[0].maquinasAtivas.toString() : "0",
			subtitle: `de ${currentMetrics.reduce((sum, t) => sum + t.maquinasAtivas, 0)} total`,
			icon: Users
		},
		{
			title: "Horas Totais",
			value: currentMetrics.reduce((sum, t) => sum + t.totalHoras, 0).toFixed(1),
			subtitle: `no período`,
			icon: Clock
		}
	]

	return (
		<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
			{/* Header melhorado com mais opções */}
			<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold text-gray-900">Dashboard de Métricas</h1>
						{/* Badge de Status Geral */}
						<div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
							${status.color === 'green' ? 'bg-green-100 text-green-700' : ''}
							${status.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
							${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
							${status.color === 'red' ? 'bg-red-100 text-red-700' : ''}
						`}>
							<status.icon size={14} />
							<span>{status.label}</span>
						</div>
					</div>
					<p className="text-gray-600 mt-1">Visão geral da performance das máquinas por turno e setor</p>
				</div>
				
				{/* Controles e Filtros */}
				<div className="flex flex-wrap gap-2">
					{/* Auto-refresh toggle */}
					<button
						onClick={() => setAutoRefresh(!autoRefresh)}
						className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
							${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
						`}
						title={autoRefresh ? 'Auto-atualização ativa' : 'Ativar auto-atualização'}
					>
						<RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
						<span className="hidden sm:inline">Auto-refresh</span>
					</button>

					{/* Seletor de Data */}
					<div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-md">
						<Calendar size={16} className="text-gray-600" />
						<input
							type="date"
							value={selectedDate}
							onChange={(e) => setSelectedDate(e.target.value)}
							className="bg-transparent text-sm focus:outline-none"
						/>
					</div>

					{/* Seletor de Turno */}
					<div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-md">
						<Filter size={16} className="text-gray-600" />
						<select
							value={selectedTurno}
							onChange={(e) => setSelectedTurno(e.target.value === "todos" ? "todos" : Number(e.target.value))}
							className="bg-transparent text-sm focus:outline-none"
						>
							<option value="todos">Todos os Turnos</option>
							<option value={1}>1º Turno</option>
							<option value={2}>2º Turno</option>
							<option value={3}>3º Turno</option>
						</select>
					</div>

					{/* Seletor de Grupo */}
					<select
						value={selectedGrupo}
						onChange={(e) => setSelectedGrupo(e.target.value)}
						className="bg-gray-50 px-3 py-2 rounded-md text-sm focus:outline-none hover:bg-gray-100"
					>
						<option value="todos">Todos os Grupos</option>
						<option value="Laser">Laser</option>
						<option value="Lectra">Lectra</option>
						<option value="Emma">Emma</option>
						<option value="Comelz">Comelz</option>
						<option value="ComelzMontagem">Comelz Montagem</option>
						<option value="ComelzSolas">Comelz Solas</option>
					</select>

					{/* Botões de View Mode */}
					<div className="flex bg-gray-100 rounded-md p-1">
						<button
							onClick={() => setViewMode('cards')}
							className={`px-3 py-1 text-sm rounded transition-colors ${
								viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Cards
						</button>
						<button
							onClick={() => setViewMode('table')}
							className={`px-3 py-1 text-sm rounded transition-colors ${
								viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Tabela
						</button>
						<button
							onClick={() => setViewMode('charts')}
							className={`px-3 py-1 text-sm rounded transition-colors ${
								viewMode === 'charts' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Gráficos
						</button>
						<button
							onClick={() => setViewMode('historical')}
							className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-1 ${
								viewMode === 'historical' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
							}`}
						>
							<BarChart3 size={14} />
							Histórico
						</button>
					</div>

					{/* Menu de Exportação */}
					<div className="relative">
						<button
							onClick={() => setShowExportMenu(!showExportMenu)}
							className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
						>
							<Download size={16} />
							<span className="hidden sm:inline">Exportar</span>
						</button>
						
						{showExportMenu && (
							<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
								<button
									onClick={() => exportData('csv')}
									className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
								>
									<Download size={14} />
									Exportar CSV
								</button>
								<button
									onClick={() => exportData('json')}
									className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
								>
									<Download size={14} />
									Exportar JSON
								</button>
								<button
									onClick={() => exportData('pdf')}
									className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-t"
								>
									<Download size={14} />
									Exportar PDF
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Loading state melhorado */}
			{loading && (
				<div className="flex items-center justify-center py-12">
					<div className="flex flex-col items-center space-y-4">
						<div className="relative">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
							<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
								<Activity size={20} className="text-blue-600 animate-pulse" />
							</div>
						</div>
						<div className="text-center">
							<p className="text-gray-600 font-medium">Carregando métricas...</p>
							<p className="text-sm text-gray-400 mt-1">Processando dados em tempo real</p>
						</div>
					</div>
				</div>
			)}

			{/* Histórico: componente separado para análise avançada */}
			{viewMode === 'historical' && (
				<div className="">
					<HistoricalAnalysis />
				</div>
			)}

			{!loading && dashboardData && (
				<>
					{/* Cards de métricas gerais - melhorados */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{metricCards.map((card, index) => (
							<div key={index} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-6">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<p className="text-sm font-medium text-gray-600">{card.title}</p>
										<p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
										<div className="flex items-center mt-3">
											<p className="text-sm text-gray-500">{card.subtitle}</p>
											{card.trend && (
												<span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
													card.trend.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
												}`}>
													{card.trend.isPositive ? "↑" : "↓"} {Math.abs(card.trend.value).toFixed(1)}%
												</span>
											)}
										</div>
									</div>
									<div className={`p-3 rounded-lg ${
										card.trend?.isPositive ? "bg-green-50" : 
										card.trend?.isPositive === false ? "bg-red-50" : "bg-blue-50"
									}`}>
										<card.icon size={24} className={`${
											card.trend?.isPositive ? "text-green-600" : 
											card.trend?.isPositive === false ? "text-red-600" : "text-blue-600"
										}`} />
									</div>
								</div>
								
								{/* Mini gráfico de progresso */}
								<div className="mt-4">
									<div className="w-full bg-gray-200 rounded-full h-1.5">
										<div 
											className={`h-1.5 rounded-full transition-all duration-500 ${
												card.trend?.isPositive ? "bg-green-500" : 
												card.trend?.isPositive === false ? "bg-red-500" : "bg-blue-500"
											}`}
											style={{ 
												width: `${Math.min(100, parseFloat(card.value))}%` 
											}}
										></div>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Conteúdo baseado no View Mode */}
					{viewMode === 'cards' && (
						<></>
					)}

					{viewMode === 'table' && (
						<div className="bg-white rounded-lg shadow-sm border overflow-hidden">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turno</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ocupação</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquinas</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{currentGrupos.flatMap(grupo => 
											grupo.turnos.map((turno, idx) => (
												<tr key={`${grupo.grupo}-${idx}`} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grupo.grupo}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{turno.turno}º Turno</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span className="text-sm font-bold text-blue-600">{turno.ocupacaoMedia.toFixed(1)}%</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{turno.maquinasAtivas}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{turno.totalHoras}h</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{viewMode === 'charts' && (
						<div className="space-y-6">
							{/* Gráficos de Ocupação por Turno com Meta */}
							<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
								{/* Gráfico Turno 1 */}
								<div className="bg-white rounded-lg shadow-sm border p-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">1º Turno</h3>
									<div className="relative h-64">
										{/* Linha de Meta 80% */}
										<div className="absolute w-full" style={{ bottom: '80%' }}>
											<div className="border-t-2 border-dashed border-blue-400"></div>
											<span className="text-xs text-blue-600 font-medium">Meta: 80%</span>
										</div>
										
										{/* Eixo Y com marcações */}
										<div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-8">
											<span>100%</span>
											<span>75%</span>
											<span>50%</span>
											<span>25%</span>
											<span>0%</span>
										</div>
										
										{/* Barras dos Grupos */}
										<div className="h-full flex items-end justify-around gap-2 pt-6">
											{currentGrupos.map((grupo, idx) => {
												const turno1 = grupo.turnos.find(t => t.turno === 1)
												const ocupacao = turno1?.ocupacaoMedia || 0
												const atingiuMeta = ocupacao >= 80
												
												return (
													<div key={idx} className="flex-1 flex flex-col items-center">
														<div className="w-full relative h-full">
																<div 
																	className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${
																		atingiuMeta ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-red-500 to-red-400'
																	}`}
																	style={{ height: `${ocupacao}%` }}
																>
																<span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
																	{ocupacao.toFixed(1)}%
																</span>
															</div>
														</div>
														<span className="text-xs mt-2 text-gray-600 font-medium">{grupo.grupo}</span>
													</div>
												)
											})}
										</div>
									</div>
								</div>

								{/* Gráfico Turno 2 */}
								<div className="bg-white rounded-lg shadow-sm border p-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">2º Turno</h3>
									<div className="relative h-64">
										{/* Linha de Meta 80% */}
										<div className="absolute w-full" style={{ bottom: '80%' }}>
											<div className="border-t-2 border-dashed border-blue-400"></div>
											<span className="text-xs text-blue-600 font-medium">Meta: 80%</span>
										</div>
										
										{/* Eixo Y com marcações */}
										<div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-8">
											<span>100%</span>
											<span>75%</span>
											<span>50%</span>
											<span>25%</span>
											<span>0%</span>
										</div>
										
										{/* Barras dos Grupos */}
										<div className="h-full flex items-end justify-around gap-2 pt-6">
											{currentGrupos.map((grupo, idx) => {
												const turno2 = grupo.turnos.find(t => t.turno === 2)
												const ocupacao = turno2?.ocupacaoMedia || 0
												const atingiuMeta = ocupacao >= 80
												
												return (
													<div key={idx} className="flex-1 flex flex-col items-center">
														<div className="w-full relative h-full">
															<div 
																className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${
																	atingiuMeta ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-red-500 to-red-400'
																}`}
																style={{ height: `${ocupacao}%` }}
															>
																<span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
																	{ocupacao.toFixed(1)}%
																</span>
															</div>
														</div>
														<span className="text-xs mt-2 text-gray-600 font-medium">{grupo.grupo}</span>
													</div>
												)
											})}
										</div>
									</div>
								</div>

								{/* Gráfico Turno 3 */}
								<div className="bg-white rounded-lg shadow-sm border p-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">3º Turno</h3>
									<div className="relative h-64">
										{/* Linha de Meta 80% */}
										<div className="absolute w-full" style={{ bottom: '80%' }}>
											<div className="border-t-2 border-dashed border-blue-400"></div>
											<span className="text-xs text-blue-600 font-medium">Meta: 80%</span>
										</div>
										
										{/* Eixo Y com marcações */}
										<div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-8">
											<span>100%</span>
											<span>75%</span>
											<span>50%</span>
											<span>25%</span>
											<span>0%</span>
										</div>
										
										{/* Barras dos Grupos */}
										<div className="h-full flex items-end justify-around gap-2 pt-6">
											{currentGrupos.map((grupo, idx) => {
												const turno3 = grupo.turnos.find(t => t.turno === 3)
												const ocupacao = turno3?.ocupacaoMedia || 0
												const atingiuMeta = ocupacao >= 80
												
												return (
													<div key={idx} className="flex-1 flex flex-col items-center">
														<div className="w-full relative h-full">
															<div 
																className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${
																	atingiuMeta ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-red-500 to-red-400'
																}`}
																style={{ height: `${ocupacao}%` }}
															>
																<span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
																	{ocupacao.toFixed(1)}%
																</span>
															</div>
														</div>
														<span className="text-xs mt-2 text-gray-600 font-medium">{grupo.grupo}</span>
													</div>
												)
											})}
										</div>
									</div>
								</div>

								{/* Gráfico Geral (Todos os Turnos) */}
								<div className="bg-white rounded-lg shadow-sm border p-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Geral (Todos)</h3>
									<div className="relative h-64">
										{/* Linha de Meta 80% */}
										<div className="absolute w-full" style={{ bottom: '80%' }}>
											<div className="border-t-2 border-dashed border-blue-400"></div>
											<span className="text-xs text-blue-600 font-medium">Meta: 80%</span>
										</div>
										
										{/* Eixo Y com marcações */}
										<div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-8">
											<span>100%</span>
											<span>75%</span>
											<span>50%</span>
											<span>25%</span>
											<span>0%</span>
										</div>
										
										{/* Barras dos Grupos (Média dos 3 turnos) */}
										<div className="h-full flex items-end justify-around gap-2 pt-6">
											{currentGrupos.map((grupo, idx) => {
												const ocupacao = grupo.resumo.ocupacaoMedia
												const atingiuMeta = ocupacao >= 80
												
												return (
													<div key={idx} className="flex-1 flex flex-col items-center">
														<div className="w-full relative h-full">
															<div 
																className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${
																	atingiuMeta ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-red-500 to-red-400'
																}`}
																style={{ height: `${ocupacao}%` }}
															>
																<span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
																	{ocupacao.toFixed(1)}%
																</span>
															</div>
														</div>
														<span className="text-xs mt-2 text-gray-600 font-medium">{grupo.grupo}</span>
													</div>
												)
											})}
										</div>
									</div>
								</div>
							</div>

							{/* Legenda */}
							<div className="bg-white rounded-lg shadow-sm border p-4">
								<div className="flex items-center justify-center gap-8 text-sm">
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 rounded bg-gradient-to-t from-green-500 to-green-400"></div>
										<span className="text-gray-700">Atingiu Meta (≥80%)</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 rounded bg-gradient-to-t from-red-500 to-red-400"></div>
										<span className="text-gray-700">Abaixo da Meta (&lt;80%)</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-12 h-0.5 border-t-2 border-dashed border-blue-400"></div>
										<span className="text-gray-700">Linha de Meta (80%)</span>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Seções por Grupo de Máquinas */}
					{selectedGrupo === "todos" ? (
						<div className="space-y-6">
							{currentGrupos.map((grupo) => (
								<div key={grupo.grupo} className="bg-white rounded-lg shadow-sm border p-6">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-xl font-semibold text-gray-900">{grupo.grupo}</h3>
										<div className="flex space-x-4 text-sm">
											<span className="text-gray-600">
												Ocupação: <span className="font-bold text-blue-600">{grupo.resumo.ocupacaoMedia.toFixed(1)}%</span>
											</span>
											<span className="text-gray-600">
												Horas: <span className="font-bold text-purple-600">{grupo.resumo.totalHoras.toFixed(1)}h</span>
											</span>
										</div>
									</div>
									
									{/* Turnos do grupo */}
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										{grupo.turnos.map((turno) => (
											<div key={turno.turno} className="p-4 bg-gray-50 rounded-lg">
												<h4 className="font-medium text-gray-900 mb-2">{turno.turno}º Turno</h4>
												<div className="space-y-2 text-sm">
													<div className="flex justify-between">
														<span className="text-gray-600">Ocupação:</span>
														<span className="font-bold text-blue-600">{turno.ocupacaoMedia.toFixed(1)}%</span>
													</div>
													<div className="flex justify-between">
														<span className="text-gray-600">Máquinas:</span>
														<span className="font-medium">{turno.maquinasAtivas}</span>
													</div>
													<div className="flex justify-between">
														<span className="text-gray-600">Horas:</span>
														<span className="font-medium">{turno.totalHoras}h</span>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					) : (
						// Visão detalhada de grupo específico
						currentGrupos.length > 0 && (
							<div className="bg-white rounded-lg shadow-sm border p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-6">
									Análise Detalhada - {currentGrupos[0].grupo}
								</h3>
								
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
									{/* Métricas por turno - detalhado */}
									<div>
										<h4 className="font-medium text-gray-900 mb-4">Performance por Turno</h4>
										<div className="space-y-4">
											{currentGrupos[0].turnos.map((turno) => (
												<div key={turno.turno} className="p-4 border rounded-lg">
													<div className="flex justify-between items-center mb-3">
														<h5 className="font-medium text-gray-900">{turno.turno}º Turno</h5>
														<span className="text-sm text-gray-500">{turno.maquinasAtivas} máquinas</span>
													</div>
													
													{/* Barra de progresso */}
													<div>
														<div className="flex justify-between text-sm mb-1">
															<span>Ocupação</span>
															<span className="font-bold text-blue-600">{turno.ocupacaoMedia.toFixed(1)}%</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-2">
															<div 
																className="bg-blue-600 h-2 rounded-full" 
																style={{ width: `${turno.ocupacaoMedia}%` }}
															></div>
														</div>
													</div>
												</div>
											))}
										</div>
									</div>
									
									{/* Resumo do grupo */}
									<div>
										<h4 className="font-medium text-gray-900 mb-4">Resumo do Grupo</h4>
										<div className="space-y-4">
											<div className="p-4 bg-blue-50 rounded-lg">
												<div className="text-center">
													<p className="text-2xl font-bold text-blue-600">
														{currentGrupos[0].resumo.ocupacaoMedia.toFixed(1)}%
													</p>
													<p className="text-sm text-gray-600">Ocupação Média</p>
												</div>
											</div>
											
											<div className="grid grid-cols-2 gap-4">
												<div className="p-3 bg-gray-50 rounded-lg text-center">
													<p className="text-lg font-bold text-gray-900">
														{currentGrupos[0].resumo.maquinasAtivas}
													</p>
													<p className="text-xs text-gray-600">Máquinas Ativas</p>
												</div>
												<div className="p-3 bg-gray-50 rounded-lg text-center">
													<p className="text-lg font-bold text-gray-900">
														{currentGrupos[0].resumo.totalHoras.toFixed(1)}h
													</p>
													<p className="text-xs text-gray-600">Total de Horas</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						)
					)}

					{/* Footer com informações adicionais */}
					<div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
						<div className="text-sm text-gray-600">
							Última atualização: {new Date().toLocaleString('pt-BR')}
						</div>
						<button
							onClick={loadDashboardData}
							disabled={loading}
							className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
						>
							<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
							<span>Atualizar Dados</span>
						</button>
					</div>
				</>
			)}
		</div>
	)
}