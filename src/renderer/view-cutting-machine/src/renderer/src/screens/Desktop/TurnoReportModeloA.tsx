import vulcabrasLogo from "../../assets/vulcabras-1024x358.jpg"
import CategoriaDonutChart from "../../components/CategoriaDonutChart"
import {
	calculateTop3Motivos,
	fetchMotivosDataModeloA,
	type Top3MotivosData,
} from "../../lib/motivosParadasCalculator"

// Função para definir cor conforme percentual
function getColor(percentStr: string) {
	const percent = parseInt(percentStr.replace("%", ""))
	if (percent < 75) return "bg-red-700"
	if (percent >= 75 && percent <= 80) return "custom-yellow"
	if (percent > 80) return "bg-green-700"
	return "bg-gray-200"
}

import React, { useEffect, useState } from "react"

// Exemplo de dados estáticos para o layout
const turnos = ["1º Turno", "2º Turno", "3º Turno"]
const maquinas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

// Mapeamento para os nomes das máquinas usados no backend
const machineMap = {
	1: "02-1435",
	2: "02-2540",
	3: "02-1681",
	4: "02-1880",
	5: "02-1780",
	6: "02-1740",
	7: "02-2391",
	8: "02-2539",
	9: "02-1553",
	10: "02-1398",
	11: "02-1454",
	12: "02-2617",
}

const periodosTurno1 = [
	{ inicio: "05:00", fim: "06:00", baseCalculo: 60 },
	{ inicio: "06:00", fim: "07:00", baseCalculo: 50 },
	{ inicio: "07:00", fim: "08:00", baseCalculo: 60 },
	{ inicio: "08:00", fim: "09:00", baseCalculo: 40 },
	{ inicio: "09:00", fim: "10:00", baseCalculo: 20 },
	{ inicio: "10:00", fim: "11:00", baseCalculo: 60 },
	{ inicio: "11:00", fim: "12:00", baseCalculo: 50 },
	{ inicio: "12:00", fim: "13:20", baseCalculo: 80 },
]

const periodosTurno2 = [
	{ inicio: "13:20", fim: "14:00", baseCalculo: 40 },
	{ inicio: "14:00", fim: "15:00", baseCalculo: 60 },
	{ inicio: "15:00", fim: "16:00", baseCalculo: 50 },
	{ inicio: "16:00", fim: "17:00", baseCalculo: 60 },
	{ inicio: "17:00", fim: "18:00", baseCalculo: 40 },
	{ inicio: "18:00", fim: "19:00", baseCalculo: 20 },
	{ inicio: "19:00", fim: "20:00", baseCalculo: 60 },
	{ inicio: "20:00", fim: "21:40", baseCalculo: 90 },
]

const periodosTurno3 = [
	{ inicio: "21:40", fim: "22:00", baseCalculo: 20 },
	{ inicio: "22:00", fim: "23:00", baseCalculo: 60 },
	{ inicio: "23:00", fim: "00:00", baseCalculo: 50 },
	{ inicio: "00:00", fim: "01:00", baseCalculo: 40 },
	{ inicio: "01:00", fim: "02:00", baseCalculo: 20 },
	{ inicio: "02:00", fim: "03:00", baseCalculo: 60 },
	{ inicio: "03:00", fim: "04:00", baseCalculo: 50 },
	{ inicio: "04:00", fim: "05:00", baseCalculo: 60 },
]

export default function TurnoReport() {
	// Estado para edição do machineMap
	const [machineMapEdit, setMachineMapEdit] = useState(machineMap)
	const [editIdx, setEditIdx] = useState<number | null>(null)
	const [editValue, setEditValue] = useState("")

	// Handler para iniciar edição
	function handleEditStart(idx: number) {
		setEditIdx(idx)
		setEditValue(machineMapEdit[idx + 1])
	}

	// Handler para salvar edição
	function handleEditSave(idx: number) {
		setMachineMapEdit((prev) => ({ ...prev, [idx + 1]: editValue }))
		setEditIdx(null)
	}

	// Carrega as configurações salvas (quando disponíveis) e atualiza o mapping
	useEffect(() => {
		let mounted = true
		async function loadSettings() {
			try {
				const res = await window.electron?.ipcRenderer?.invoke("get-settings")
				if (!mounted) return
				if (res && res.success && res.settings) {
					const groups = res.settings.machineGroups ?? res.settings.machineMap ?? {}
					// Preferir o mapeamento do grupo Lectra quando disponível
					const lectra = groups?.Lectra?.machineMap ?? groups
					if (lectra && Object.keys(lectra).length > 0) {
						setMachineMapEdit(lectra)
					}
				}
			} catch (err) {
				console.warn('[TurnoReportModeloA] Falha ao carregar settings:', err)
			}
		}

		loadSettings()

		const onSettingsSaved = () => {
			loadSettings()
		}
		window.addEventListener("settings-saved", onSettingsSaved)

		const ipc = window.electron?.ipcRenderer
		const onSettingsUpdated = (_ev: any, _data: any) => {
			loadSettings()
		}
		if (ipc && ipc.on) ipc.on("settings-updated", onSettingsUpdated)

		return () => {
			mounted = false
			window.removeEventListener("settings-saved", onSettingsSaved)
			if (ipc && ipc.removeListener) ipc.removeListener("settings-updated", onSettingsUpdated)
		}
	}, [])
	// Estado para máquinas ignoradas
	const [maquinasIgnoradas, setMaquinasIgnoradas] = useState<number[]>([])

	// Handler para seleção de máquinas ignoradas
	function handleToggleIgnorada(idx: number) {
		setMaquinasIgnoradas((prev) =>
			prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
		)
	}
	// Função para verificar se todos os dados estão zerados
	function isOcupacaoZerada() {
		if (!ocupacao) return false
		let total = 0
		let count = 0
		Object.values(ocupacao).forEach((periodosObj) => {
			Object.values(periodosObj).forEach((valor) => {
				total += valor
				count++
			})
		})
		return count > 0 && total === 0
	}
	const [turnoSelecionado, setTurnoSelecionado] = useState<null | number>(null) // Nenhum turno selecionado inicialmente
	const periodosPorTurno = [periodosTurno1, periodosTurno2, periodosTurno3]
	const periodos =
		turnoSelecionado !== null ? periodosPorTurno[turnoSelecionado] : []

	// Estado para os dados reais do backend
	const [ocupacao, setOcupacao] = useState<null | Record<
		string,
		Record<string, number>
	>>(null)

	// Estado para os motivos de paradas
	const [motivosData, setMotivosData] = useState<Top3MotivosData | null>(null)

	// Estados para controle de carregamento
	const [isLoading, setIsLoading] = useState(false)
	const [loadingProgress, setLoadingProgress] = useState(0)
	const [loadingMessage, setLoadingMessage] = useState("")

	// Estado para a data inicial e final
	const [dataInicial, setDataInicial] = useState(() => {
		const now = new Date()
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
	})
	const [dataFinal, setDataFinal] = useState(() => {
		const now = new Date()
		// Data final é o próximo dia
		const nextDay = new Date(now)
		nextDay.setDate(now.getDate() + 1)
		return `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`
	})
	// Helper para saber se o turno 3 já começou
	function isTurno3Iniciado() {
		if (turnoSelecionado !== 2) return true
		const now = new Date()
		// Se a data inicial for hoje e horário atual < 21:40, turno não começou
		const [ano, mes, dia] = dataInicial.split("-")
		const hoje =
			now.getFullYear() === Number(ano) &&
			now.getMonth() + 1 === Number(mes) &&
			now.getDate() === Number(dia)
		if (!hoje) return true
		const horaAtual = now.getHours()
		const minAtual = now.getMinutes()
		return horaAtual > 21 || (horaAtual === 21 && minAtual >= 40)
	}

	// Mantém compatibilidade com backend
	const [dataSelecionada, setDataSelecionada] = useState(() => {
		const now = new Date()
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
	})

	useEffect(() => {
		if (turnoSelecionado !== null) {
			// Iniciar loading
			setIsLoading(true)
			setLoadingProgress(0)
			setLoadingMessage("Carregando dados de ocupação...")

			console.log(
				`[DEBUG] Frontend fazendo chamada turno-report-data-lectra com: dateInicial=${dataInicial}, dateFinal=${dataFinal}, date=${dataSelecionada}, turno=${turnoSelecionado}`,
			)
			window.electron?.ipcRenderer
				?.invoke("turno-report-data-lectra", {
					dateInicial: dataInicial,
					dateFinal: dataFinal,
					date: dataSelecionada, // mantém compatibilidade
					turno: turnoSelecionado,
				})
				.then((data) => {
					console.log(`[DEBUG] Frontend recebeu dados:`, data)
					setLoadingProgress(66)
					setLoadingMessage("Dados de ocupação carregados...")
					setOcupacao(data)

					setLoadingProgress(100)
					setLoadingMessage("Carregamento concluído!")

					// Aguardar um momento antes de remover a barra de loading
					setTimeout(() => {
						setIsLoading(false)
					}, 500)
				})
				.catch((error) => {
					console.error(`[ERROR] Frontend erro na chamada:`, error)
					setOcupacao(null)
					setIsLoading(false)
				})
		}
	}, [turnoSelecionado, dataInicial, dataFinal, dataSelecionada])

	// useEffect para carregar motivos de paradas quando ocupação é carregada
	useEffect(() => {
		if (ocupacao && turnoSelecionado !== null) {
			fetchMotivosDataModeloA(dataSelecionada, turnoSelecionado)
				.then((motivosRawData) => {
					if (motivosRawData) {
						// Usar o mesmo cálculo da função getGeralTurnoTotal() para consistência
						const percentualGeralStr = getGeralTurnoTotal()
							.replace("%", "")
							.replace("-", "0")
						const percentualGeral = parseFloat(percentualGeralStr) || 0

						const top3Motivos = calculateTop3Motivos(
							motivosRawData,
							percentualGeral,
						)
						setMotivosData(top3Motivos)
					}
				})
				.catch(console.error)
		}
	}, [ocupacao, dataSelecionada, turnoSelecionado])

	// Função para capturar dados automaticamente para o BANCO DE DADOS
	const captureData = React.useCallback(async () => {
		if (!ocupacao || turnoSelecionado === null) return

		try {
			const reportData: Array<{
				machine: string
				periods: Record<string, number>
				averageOccupation: number
			}> = []

			// Processar cada máquina
			for (const machineNum of maquinas) {
				const machineName = machineMap[machineNum]
				const machineOcupacao = ocupacao[machineName] || {}

				// Calcular ocupação por período
				const periodData: Record<string, number> = {}
				let totalOcupacao = 0
				let totalPeriodos = 0

				periodos.forEach((periodo) => {
					const periodoKey = `${periodo.inicio}-${periodo.fim}`
					const ocupacaoValue = machineOcupacao[periodoKey] || 0
					periodData[periodoKey] = ocupacaoValue
					totalOcupacao += ocupacaoValue
					totalPeriodos++
				})

				// Calcular média geral da máquina
				const mediaGeral =
					totalPeriodos > 0 ? Math.round(totalOcupacao / totalPeriodos) : 0

				reportData.push({
					machine: machineName,
					periods: periodData,
					averageOccupation: mediaGeral,
				})
			}

			console.log(
				`[LECTRA-CAPTURE] Capturando dados para turno ${turnoSelecionado + 1} na data ${dataSelecionada}`,
			)

			// Enviar dados para o BANCO DE DADOS
			await window.electron?.ipcRenderer?.invoke("capture-turno-data", {
				date: dataSelecionada,
				turno: turnoSelecionado + 1, // Converter para 1, 2, 3
				aba: "Lectra",
				data: reportData,
			})

			console.log("[LECTRA-CAPTURE] Dados capturados com sucesso!")
		} catch (error) {
			console.error("[LECTRA-CAPTURE] Erro ao capturar dados:", error)
		}
	}, [ocupacao, turnoSelecionado, dataSelecionada, periodos])

	// useEffect para capturar dados automaticamente quando os dados carregam
	useEffect(() => {
		if (ocupacao && turnoSelecionado !== null && dataSelecionada) {
			console.log(
				"[LECTRA-CAPTURE] Dados carregados, iniciando captura automática...",
			)
			captureData()
		}
	}, [captureData, ocupacao, turnoSelecionado, dataSelecionada])

	// Helper para pegar o percentual de ocupação por máquina/período
	function getPercent(machineIdx: number, periodoIdx: number): string {
		if (turnoSelecionado === 2 && !isTurno3Iniciado()) return ""
		if (!ocupacao) return ""

		// Verificar se o período já terminou
		const periodo = periodos[periodoIdx]

		// Para turno 3 com período de datas, verificar se o período já passou considerando as datas corretas
		if (turnoSelecionado === 2 && dataInicial && dataFinal) {
			const now = new Date()
			const [h, m] = periodo.fim.split(":")
			const fimHora = parseInt(h)
			const fimMin = parseInt(m)

			// Determinar qual dia corresponde este período
			let dataReferencia: string
			if (fimHora >= 21 || (fimHora === 21 && fimMin >= 40)) {
				// Período termina no primeiro dia (21:40-23:59)
				dataReferencia = dataInicial
			} else if (fimHora <= 5) {
				// Período termina no segundo dia (00:00-05:00)
				dataReferencia = dataFinal
			} else {
				// Períodos entre 06:00-20:59 não existem no turno 3, mas por segurança
				dataReferencia = dataInicial
			}

			// Criar data de referência para o fim do período
			const [ano, mes, dia] = dataReferencia.split("-")
			const dataFimPeriodo = new Date(
				Number(ano),
				Number(mes) - 1,
				Number(dia),
				fimHora,
				fimMin,
				0,
				0,
			)

			// Se o período ainda não terminou, deixa em branco
			if (now < dataFimPeriodo) return ""
		} else {
			// Lógica original para outros casos
			const now = new Date()
			const nowMinutes = now.getHours() * 60 + now.getMinutes()
			const [h, m] = periodo.fim.split(":")
			let fimMin = parseInt(h) * 60 + parseInt(m)

			// Ajustar para períodos que passam da meia-noite (turno 3)
			if (turnoSelecionado === 2 && parseInt(h) < 12) {
				fimMin += 24 * 60 // Adicionar 24 horas para horários do dia seguinte
			}

			// Se o período ainda não terminou, deixa em branco
			if (nowMinutes < fimMin) return ""
		}

		const machineName = machineMapEdit[machineIdx + 1]
		const periodoKey = `${periodo.inicio}-${periodo.fim}`
		const value = ocupacao[machineName]?.[periodoKey]

		// Se o valor não existe no resultado do backend, deixa em branco
		if (value === undefined) return ""

		// Se o valor é 0 e o período já terminou, mostra 0%
		if (value === 0) return "0%"
		return `${Math.round(value)}%`
	}

	// Helper para calcular o geral do turno por máquina
	function getGeralTurno(machineIdx: number): string {
		if (turnoSelecionado === 2 && !isTurno3Iniciado()) return "0%"
		if (!ocupacao) return "0%"
		if (maquinasIgnoradas.includes(machineIdx)) return "-"
		const machineName = machineMapEdit[machineIdx + 1]

		const values = periodos
			.map((p) => {
				// Para turno 3 com dataInicial/dataFinal, verificar se cada período já terminou
				if (turnoSelecionado === 2 && dataInicial && dataFinal) {
					const now = new Date()
					const [h, m] = p.fim.split(":")
					const fimHora = parseInt(h)
					const fimMin = parseInt(m)

					// Determinar qual dia corresponde este período
					let dataReferencia: string
					if (fimHora >= 21 || (fimHora === 21 && fimMin >= 40)) {
						// Período termina no primeiro dia
						dataReferencia = dataInicial
					} else if (fimHora <= 5) {
						// Período termina no segundo dia
						dataReferencia = dataFinal
					} else {
						dataReferencia = dataInicial
					}

					// Criar data de referência para o fim do período
					const [ano, mes, dia] = dataReferencia.split("-")
					const dataFimPeriodo = new Date(
						Number(ano),
						Number(mes) - 1,
						Number(dia),
						fimHora,
						fimMin,
						0,
						0,
					)

					// Se o período ainda não terminou, não conta
					if (now < dataFimPeriodo) return null

					const key = `${p.inicio}-${p.fim}`
					const val = ocupacao[machineName]?.[key]
					return typeof val === "number" ? val : null
				}

				// Lógica original para outros casos
				const now = new Date()
				const nowMinutes = now.getHours() * 60 + now.getMinutes()
				const [h, m] = p.fim.split(":")
				let fimMin = parseInt(h) * 60 + parseInt(m)

				// Ajustar para períodos que passam da meia-noite (turno 3)
				if (turnoSelecionado === 2 && parseInt(h) < 12) {
					fimMin += 24 * 60 // Adicionar 24 horas para horários do dia seguinte
				}

				if (nowMinutes < fimMin) return null // período não preenchido
				const key = `${p.inicio}-${p.fim}`
				const val = ocupacao[machineName]?.[key]
				return typeof val === "number" ? val : null
			})
			.filter((v) => v !== null)
		if (values.length === 0) return "0%"
		const avg = values.reduce((a, b) => a + (b as number), 0) / values.length
		return `${Math.round(avg)}%`
	}

	// Helper para calcular o geral por período (linha GERAL)
	function getGeralPeriodo(periodoIdx: number): string {
		if (turnoSelecionado === 2 && !isTurno3Iniciado()) return ""
		if (!ocupacao) return "-"
		const periodo = periodos[periodoIdx]

		// Para turno 3 com período de datas, verificar se o período já passou considerando as datas corretas
		if (turnoSelecionado === 2 && dataInicial && dataFinal) {
			const now = new Date()
			const [h, m] = periodo.fim.split(":")
			const fimHora = parseInt(h)
			const fimMin = parseInt(m)

			// Determinar qual dia corresponde este período
			let dataReferencia: string
			if (fimHora >= 21 || (fimHora === 21 && fimMin >= 40)) {
				// Período termina no primeiro dia
				dataReferencia = dataInicial
			} else if (fimHora <= 5) {
				// Período termina no segundo dia
				dataReferencia = dataFinal
			} else {
				dataReferencia = dataInicial
			}

			// Criar data de referência para o período
			const [ano, mes, dia] = dataReferencia.split("-")
			const dataFimPeriodo = new Date(
				Number(ano),
				Number(mes) - 1,
				Number(dia),
				fimHora,
				fimMin,
				0,
				0,
			)

			// Se o período ainda não terminou, deixa em branco
			if (now < dataFimPeriodo) return ""
		} else {
			// Lógica original para outros casos
			const now = new Date()
			const nowMinutes = now.getHours() * 60 + now.getMinutes()
			const [h, m] = periodo.fim.split(":")
			let fimMin = parseInt(h) * 60 + parseInt(m)

			// Ajustar para períodos que passam da meia-noite (turno 3)
			if (turnoSelecionado === 2 && parseInt(h) < 12) {
				fimMin += 24 * 60 // Adicionar 24 horas para horários do dia seguinte
			}

			if (nowMinutes < fimMin) return "" // Se não terminou, deixa em branco
		}

		const values = maquinas
			.map((_, i) => {
				if (maquinasIgnoradas.includes(i)) return null
				const machineName = machineMapEdit[i + 1]
				const val = ocupacao[machineName]?.[`${periodo.inicio}-${periodo.fim}`]
				return val === undefined ? null : val
			})
			.filter((v) => v !== null)
		if (values.length === 0) return "" // Se todos undefined, retorna em branco
		const avg = values.reduce((a, b) => a + (b as number), 0) / values.length
		return `${Math.round(avg)}%`
	}

	// Helper para geral do turno (linha GERAL)
	function getGeralTurnoTotal(): string {
		if (turnoSelecionado === 2 && !isTurno3Iniciado()) return "0%"
		if (!ocupacao) return "0%"

		// Para turno 3 com dateInicial/dataFinal, filtra apenas períodos que já terminaram
		let periodosValidos: typeof periodos = []
		if (turnoSelecionado === 2 && dataInicial && dataFinal) {
			const now = new Date()
			periodosValidos = periodos.filter((p) => {
				const [h, m] = p.fim.split(":")
				const fimHora = parseInt(h)
				const fimMin = parseInt(m)

				// Determinar qual dia corresponde este período
				let dataReferencia: string
				if (fimHora >= 21 || (fimHora === 21 && fimMin >= 40)) {
					// Período termina no primeiro dia
					dataReferencia = dataInicial
				} else if (fimHora <= 5) {
					// Período termina no segundo dia
					dataReferencia = dataFinal
				} else {
					dataReferencia = dataInicial
				}

				// Criar data de referência para o período
				const [ano, mes, dia] = dataReferencia.split("-")
				const dataFimPeriodo = new Date(
					Number(ano),
					Number(mes) - 1,
					Number(dia),
					fimHora,
					fimMin,
					0,
					0,
				)

				return now >= dataFimPeriodo
			})
		} else {
			// Lógica original: filtra períodos que já fecharam
			const now = new Date()
			const nowMinutes = now.getHours() * 60 + now.getMinutes()
			periodosValidos = periodos.filter((p) => {
				const [h, m] = p.fim.split(":")
				let fimMin = parseInt(h) * 60 + parseInt(m)

				// Ajustar para períodos que passam da meia-noite (turno 3)
				if (turnoSelecionado === 2 && parseInt(h) < 12) {
					fimMin += 24 * 60 // Adicionar 24 horas para horários do dia seguinte
				}

				return fimMin <= nowMinutes
			})
		}

		const values = maquinas
			.map((_, i) => {
				if (maquinasIgnoradas.includes(i)) return null
				const machineName = machineMapEdit[i + 1]
				// Só conta se a máquina tem pelo menos um período preenchido (não vazio)
				const percs = periodosValidos
					.map((p) => {
						const periodoKey = `${p.inicio}-${p.fim}`
						const val = ocupacao[machineName]?.[periodoKey]
						// Se não tem valor ou é undefined, retorna null
						return typeof val === "number" ? val : null
					})
					.filter((v) => v !== null)
				// Se não tem nenhum período preenchido, ignora essa máquina
				if (percs.length === 0) return null
				return percs.reduce((a, b) => a + (b as number), 0) / percs.length
			})
			.filter((v) => v !== null)
		if (values.length === 0) return "0%"
		const avg = values.reduce((a, b) => a + (b as number), 0) / values.length
		return `${Math.round(avg)}%`
	}

	return (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			{/* Seletor de máquinas ignoradas */}
			<div className="mb-4">
				<span className="font-bold mr-2">IGNORAR MÁQUINAS:</span>
				{maquinas.map((m, idx) => (
					<label key={m} className="mr-3 text-sm">
						<input
							type="checkbox"
							checked={maquinasIgnoradas.includes(idx)}
							onChange={() => handleToggleIgnorada(idx)}
							className="mr-1"
						/>
						{m}
					</label>
				))}
			</div>
			{isOcupacaoZerada() && (
				<div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
					Aviso: Nenhum dado de ocupação encontrado para o turno e data
					selecionados.
				</div>
			)}

			{/* Barra de Carregamento */}
			{isLoading && (
				<div className="mb-6 bg-white border border-gray-300 rounded-lg p-4 shadow-md">
					<div className="mb-2">
						<div className="flex justify-between items-center mb-1">
							<span className="text-sm font-semibold text-gray-700">
								{loadingMessage}
							</span>
							<span className="text-sm font-semibold text-blue-600">
								{loadingProgress}%
							</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
							<div
								className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
								style={{ width: `${loadingProgress}%` }}
							>
								{loadingProgress > 10 && (
									<span className="text-xs text-white font-bold">
										{loadingProgress}%
									</span>
								)}
							</div>
						</div>
					</div>
					<div className="flex items-center justify-center text-gray-500 text-xs mt-2">
						<svg
							className="animate-spin h-4 w-4 mr-2"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Aguarde enquanto os dados são carregados...
					</div>
				</div>
			)}

			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-bold text-blue-700">
					CORTE - LECTRA - RELATÓRIO % OCUPAÇÃO DE MÁQUINAS
				</h2>
				<div className="flex items-center gap-4">
					{turnoSelecionado === 2 ? (
						<>
							<div className="flex flex-col items-start">
								<span className="text-gray-600 text-xs">DATA INICIAL</span>
								<input
									type="date"
									className="border rounded px-2 py-1 text-sm"
									value={dataInicial}
									onChange={(e) => setDataInicial(e.target.value)}
								/>
								<span className="text-xs text-gray-500 mt-1">
									Horário fixo: 21:40
								</span>
							</div>
							<div className="flex flex-col items-start">
								<span className="text-gray-600 text-xs">DATA FINAL</span>
								<input
									type="date"
									className="border rounded px-2 py-1 text-sm"
									value={dataFinal}
									onChange={(e) => setDataFinal(e.target.value)}
								/>
								<span className="text-xs text-gray-500 mt-1">
									Horário fixo: 05:00
								</span>
							</div>
						</>
					) : (
						<div className="flex flex-col items-start">
							<span className="text-gray-600 text-xs">DATA</span>
							<input
								type="date"
								className="border rounded px-2 py-1 text-sm"
								value={dataSelecionada}
								onChange={(e) => setDataSelecionada(e.target.value)}
							/>
						</div>
					)}
				</div>
			</div>
			<div className="flex gap-4 mb-6">
				{turnos.map((t, idx) => (
					<button
						key={t}
						className={`px-4 py-2 rounded ${turnoSelecionado === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
						onClick={() => setTurnoSelecionado(idx)}
					>
						{t}
					</button>
				))}
			</div>
			<div className="grid grid-cols-2 gap-6">
				{/* Tabela de ocupação */}
				<div className="bg-gray-50 rounded p-4">
					<h3 className="font-semibold mb-2">
						{turnoSelecionado === null
							? "Selecione o turno para visualizar o relatório"
							: `LECTRA - ${turnos[turnoSelecionado]} - MÁQUINAS`}
					</h3>
					<table className="w-full text-sm">
						<thead>
							<tr>
								<th className="p-1 align-bottom text-blue-900 font-bold">
									<div className="flex flex-col items-center">
										<span>De</span>
										<span>Até</span>
									</div>
								</th>
								{periodos.map((p) => (
									<th
										key={p.inicio + "-cabecalho"}
										className="p-1 text-blue-900 font-bold"
									>
										<div className="flex flex-col items-center">
											<span>{p.inicio}</span>
											<span className="text-xs text-blue-900 font-normal">
												{p.fim}
											</span>
										</div>
									</th>
								))}
								<th className="p-1 bg-white"></th>
								<th className="p-1 align-bottom">GERAL TURNO</th>
							</tr>
						</thead>
						<tbody>
							{maquinas.map((m, idx) =>
								maquinasIgnoradas.includes(idx) ? (
									<React.Fragment key={m}>
										<tr>
											<td className="p-1 font-bold border border-black text-center text-black">
												{editIdx === idx ? (
													<input
														type="text"
														value={editValue}
														autoFocus
														onChange={(e) => setEditValue(e.target.value)}
														onBlur={() => handleEditSave(idx)}
														onKeyDown={(e) => {
															if (e.key === "Enter") handleEditSave(idx)
														}}
														className="border rounded px-1 py-0.5 text-xs w-20"
													/>
												) : (
													<span
														onDoubleClick={() => handleEditStart(idx)}
														style={{ cursor: "pointer" }}
														title="Duplo clique para editar o número do computador"
													>
														{m}
													</span>
												)}
											</td>
											{periodos.map((_, i) => (
												<td
													key={i}
													className="p-1 text-center border border-black"
													style={{ background: "#fff" }}
												></td>
											))}
											<td className="p-1 bg-white"></td>
											<td
												className="p-1 text-center border border-black"
												style={{ background: "#fff" }}
											></td>
										</tr>
										<tr>
											<td
												colSpan={periodos.length + 2}
												style={{
													height: "12px",
													background: "transparent",
													border: "none",
												}}
											></td>
										</tr>
									</React.Fragment>
								) : (
									<React.Fragment key={m}>
										<tr>
											<td className="p-1 font-bold border border-black text-center text-black">
												{editIdx === idx ? (
													<input
														type="text"
														value={editValue}
														autoFocus
														onChange={(e) => setEditValue(e.target.value)}
														onBlur={() => handleEditSave(idx)}
														onKeyDown={(e) => {
															if (e.key === "Enter") handleEditSave(idx)
														}}
														className="border rounded px-1 py-0.5 text-xs w-20"
													/>
												) : (
													<span
														onDoubleClick={() => handleEditStart(idx)}
														style={{ cursor: "pointer" }}
														title="Duplo clique para editar o número do computador"
													>
														{m}
													</span>
												)}
											</td>
											{periodos.map((_, i) => {
												const percentStr = getPercent(idx, i)
												return (
													<td
														key={i}
														className={`p-1 text-center border border-black ${getColor(percentStr)} text-white font-bold`}
														style={
															getColor(percentStr) === "custom-yellow"
																? { backgroundColor: "#e6c200" }
																: {}
														}
													>
														{percentStr}
													</td>
												)
											})}
											<td className="p-1 bg-white"></td>
											<td
												className={`p-1 text-center border border-black ${getColor(getGeralTurno(idx))} text-white font-bold`}
												style={
													getColor(getGeralTurno(idx)) === "custom-yellow"
														? { backgroundColor: "#e6c200" }
														: {}
												}
											>
												{getGeralTurno(idx)}
											</td>
										</tr>
										<tr>
											<td
												colSpan={periodos.length + 2}
												style={{
													height: "12px",
													background: "transparent",
													border: "none",
												}}
											></td>
										</tr>
									</React.Fragment>
								),
							)}
							<tr className="font-bold">
								<td className="p-1 border border-black">
									<span className="text-black font-bold">GERAL</span>
								</td>
								{periodos.map((_, i) => {
									const percentStr = getGeralPeriodo(i)
									return (
										<td
											key={i}
											className={`p-1 text-center border border-black ${getColor(percentStr)} text-white font-bold`}
											style={
												getColor(percentStr) === "custom-yellow"
													? { backgroundColor: "#e6c200" }
													: {}
											}
										>
											<span className="text-white font-bold">{percentStr}</span>
										</td>
									)
								})}
								<td className="p-1 bg-white"></td>
								<td
									className={`p-1 text-center border border-black ${getColor(getGeralTurnoTotal())} text-white font-bold`}
									style={
										getColor(getGeralTurnoTotal()) === "custom-yellow"
											? { backgroundColor: "#e6c200" }
											: {}
									}
								>
									<span className="text-black font-bold">
										{getGeralTurnoTotal()}
									</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				{/* Ranking de máquinas + gráfico de categorias */}
				<div className="flex flex-col gap-4">
					<div className="bg-gray-50 rounded p-3 mb-2">
						<h3 className="font-semibold mb-2 text-sm">
							{turnoSelecionado === null
								? "Selecione o turno para visualizar o ranking"
								: `RANKING DE MÁQUINAS ${turnos[turnoSelecionado]}`}
						</h3>
						<ul>
							{maquinas
								.map((m, idx) => ({
									nome: m,
									idx,
									percent: parseInt(getGeralTurno(idx).replace("%", "")),
									percentStr: getGeralTurno(idx),
								}))
								.sort((a, b) => b.percent - a.percent)
								.map((item, rankIdx) => {
									// Usa a mesma lógica de cor da tabela principal
									const colorClass = getColor(item.percentStr)
									const style =
										colorClass === "custom-yellow"
											? { backgroundColor: "#e6c200" }
											: {}
									return (
										<li
											key={item.nome}
											className={`mb-0.5 px-1 py-0.5 rounded text-xs ${colorClass} ${item.percentStr !== "0%" ? "text-white font-bold" : ""}`}
											style={style}
										>
											{String(rankIdx + 1).padStart(2, "0")}º Lugar | Máquina{" "}
											{item.nome} - {item.percentStr}
										</li>
									)
								})}
						</ul>
					</div>
					<div className="bg-gray-50 rounded p-4 flex flex-col items-center">
						<h3 className="font-semibold mb-2">
							% INTERFERÊNCIAS E OCUPAÇÃO POR CATEGORIAS
						</h3>
						<div className="flex flex-row items-center gap-6">
							<div style={{ width: 180 }}>
								{/* Gráfico donut real */}
								<CategoriaDonutChart
									data={
										motivosData && motivosData.data.length >= 4
											? motivosData.data // Usar os dados como retornados pela função
											: [
													0,
													0,
													0,
													parseFloat(
														getGeralTurnoTotal()
															.replace("%", "")
															.replace("-", "0"),
													),
													0,
												]
									}
									geral={getGeralTurnoTotal()}
									labels={motivosData?.labels}
									colors={motivosData?.colors}
								/>
							</div>
							<div
								style={{
									minWidth: 160,
									marginLeft: 72,
									textAlign: "left",
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
								}}
							>
								<div
									style={{
										marginTop: 180,
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
									}}
								>
									<div
										style={{
											display: "flex",
											fontWeight: "bold",
											fontSize: "13px",
											marginBottom: "4px",
										}}
									>
										<div
											style={{
												background: "#e60000",
												color: "#fff",
												padding: "2px 12px",
												borderRadius: "2px 0 0 2px",
											}}
										>
											&lt; 75%
										</div>
										<div
											style={{
												background: "#ffe600",
												color: "#222",
												padding: "2px 12px",
											}}
										>
											75% : 80%
										</div>
										<div
											style={{
												background: "#009e3c",
												color: "#fff",
												padding: "2px 12px",
												borderRadius: "0 2px 2px 0",
											}}
										>
											&gt;80%
										</div>
									</div>
									<img
										src={vulcabrasLogo}
										alt="Logo da Vulcabras"
										style={{ maxWidth: "180px", height: "auto" }}
									/>
									{/* Legenda removida conforme solicitado */}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
