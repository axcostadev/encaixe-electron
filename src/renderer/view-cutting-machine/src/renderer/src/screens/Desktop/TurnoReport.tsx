import vulcabrasLogo from "../../assets/vulcabras-1024x358.jpg"
import CategoriaDonutChart from "../../components/CategoriaDonutChart"
import {
	calculateTop3Motivos,
	fetchMotivosData,
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

// Text color should be readable on the background returned by getColor.
// When the value is not a number (e.g. "-"), default to black text.
function getTextColor(percentStr: string) {
	const percent = parseInt(percentStr.replace("%", ""))
	return Number.isNaN(percent) ? "text-black" : "text-white"
}

import React, { useEffect, useState } from "react"

// Exemplo de dados estáticos para o layout
const turnos = ["1º Turno", "2º Turno", "3º Turno"]

// Mapeamento para os nomes das máquinas usados no backend
const machineMap = {
	1: "02-2010",
	2: "02-2416",
	3: "02-1765",
	4: "02-1702",
	5: "02-2388",
	6: "02-1804",
	7: "02-1867",
	8: "02-2871",
	9: "02-1767",
	10: "02-1868",
	11: "02-2840",
	12: "02-2830",
	13: "02-2831",
	14: "02-2832",
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

// Função para salvar dados automaticamente no banco JSON
async function salvarDadosNoBanco(
	ocupacao: Record<string, Record<string, number>>,
	date: string,
	turno: number,
) {
	if (!ocupacao) return

	try {
		console.log("[SALVAMENTO] Salvando dados no banco:", { date, turno })

		// Converter dados de ocupação para o formato esperado pelo banco
		const dadosParaSalvar: Array<{
			date: string
			turno: number
			maquina: string
			periodo: string
			porcentagem: number
		}> = []

		// Iterar sobre todas as máquinas e períodos
		Object.keys(ocupacao).forEach((maquina) => {
			Object.keys(ocupacao[maquina]).forEach((periodo) => {
				const porcentagem = ocupacao[maquina][periodo]
				if (typeof porcentagem === "number") {
					dadosParaSalvar.push({
						date,
						turno,
						maquina,
						periodo,
						porcentagem,
					})
				}
			})
		})

		// Salvar no banco via IPC
		for (const dado of dadosParaSalvar) {
			await window.electron?.ipcRenderer?.invoke("insert-turno-report", dado)
		}

		console.log(
			`[SALVAMENTO] ${dadosParaSalvar.length} registros salvos com sucesso`,
		)
	} catch (error) {
		console.error("[SALVAMENTO] Erro ao salvar dados:", error)
	}
}

export default function TurnoReport() {
	// Estado para edição do machineMap
	const [machineMapEdit, setMachineMapEdit] = useState(machineMap)
	const [editIdx, setEditIdx] = useState<number | null>(null)
	const [editValue, setEditValue] = useState("")

	// Handler para iniciar edição (recebe número da máquina)
	function handleEditStart(machineNum: number) {
		setEditIdx(machineNum)
		setEditValue(machineMapEdit[String(machineNum)])
	}

	// Handler para salvar edição (recebe número da máquina)
	function handleEditSave(machineNum: number) {
		setMachineMapEdit((prev) => ({ ...prev, [String(machineNum)]: editValue }))
		setEditIdx(null)
	}
	// Estado para máquinas ignoradas (armazenamos a chave da máquina, ex: '2')
	const [maquinasIgnoradas, setMaquinasIgnoradas] = useState<string[]>([])

	// Lista de máquinas visíveis - derivada do mapping editável
	const visibleMaquinas = Object.keys(machineMapEdit)
		.map((k) => Number(k))
		.sort((a, b) => a - b)

	// Ao montar, carregar configurações persistidas e escutar atualizações
	useEffect(() => {
		let mounted = true
		async function loadSettings() {
			try {
				const res = await window.electron.ipcRenderer.invoke("get-settings")
				if (res && res.success && res.settings) {
					const groups =
						res.settings.machineGroups ?? res.settings.machineMap ?? {}
					const laser = groups?.Laser?.machineMap ?? groups
					if (mounted) setMachineMapEdit(laser || {})
				}
			} catch {
				// ignore
			}
		}

		loadSettings()

		let unsubscribe: (() => void) | null = null
		// Prefer IPC notification from main process; preload.on returns an unsubscribe
		try {
			if (window.electron?.ipcRenderer?.on) {
				unsubscribe = window.electron.ipcRenderer.on("settings-updated", () => {
					loadSettings()
				})
			} else {
				// fallback to DOM event if IPC not exposed
				function onSettingsSaved() {
					loadSettings()
				}
				window.addEventListener(
					"settings-saved",
					onSettingsSaved as EventListener,
				)
				unsubscribe = () =>
					window.removeEventListener(
						"settings-saved",
						onSettingsSaved as EventListener,
					)
			}
		} catch {
			// ignore
		}

		return () => {
			mounted = false
			if (unsubscribe) unsubscribe()
		}
	}, [])

	// Handler para seleção de máquinas ignoradas (usa a chave como string)
	function handleToggleIgnorada(key: string) {
		setMaquinasIgnoradas((prev) =>
			prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key],
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

	// Estado para loading com progresso
	const [isLoading, setIsLoading] = useState(false)
	const [loadingProgress, setLoadingProgress] = useState(0)

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

	// Estado para dados dinâmicos dos motivos de paradas
	const [motivosData, setMotivosData] = useState<Top3MotivosData | null>(null)

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (turnoSelecionado !== null) {
			// Inicia o loading
			setIsLoading(true)
			setLoadingProgress(0)
			
			// Simula progresso incremental
			const progressInterval = setInterval(() => {
				setLoadingProgress(prev => {
					if (prev >= 90) {
						clearInterval(progressInterval)
						return 90
					}
					return prev + 10
				})
			}, 200)

			// Carrega dados de ocupação
			window.electron?.ipcRenderer
				?.invoke("turno-report-data", {
					dateInicial: dataInicial,
					dateFinal: dataFinal,
					date: dataSelecionada, // mantém compatibilidade
					turno: turnoSelecionado,
				})
				.then((data) => {
					console.log("[FRONTEND] OCUPACAO RECEBIDA:", data)
					clearInterval(progressInterval)
					setLoadingProgress(100)
					setTimeout(() => {
						setOcupacao(data)
						setIsLoading(false)
					}, 300)

					// Salvar automaticamente os dados no banco JSON
					salvarDadosNoBanco(data, dataSelecionada, turnoSelecionado + 1)
				})
				.catch((error) => {
					console.error("[FRONTEND] Erro ao carregar dados:", error)
					clearInterval(progressInterval)
					setIsLoading(false)
				})
		}
	}, [turnoSelecionado, dataInicial, dataFinal, dataSelecionada])

	// useEffect para carregar motivos de paradas quando ocupação é carregada
	useEffect(() => {
		if (ocupacao && turnoSelecionado !== null) {
			fetchMotivosData(dataSelecionada, turnoSelecionado)
				.then((motivosRawData) => {
					if (motivosRawData) {
						// Calcular percentual geral inline (sem depender de função instável)
						const percentualGeral = (() => {
							// calcular média dos valores já finalizados por máquina
							const valores: number[] = []
							const now = new Date()
							let periodosValidos: typeof periodos = []
							if (turnoSelecionado === 2 && dataInicial && dataFinal) {
								periodosValidos = periodos.filter((p) => {
									const [h, m] = p.fim.split(":")
									const fimHora = parseInt(h)
									const fimMin = parseInt(m)
									let dataReferencia: string
									if (fimHora >= 21 || (fimHora === 21 && fimMin >= 40)) {
										dataReferencia = dataInicial
									} else if (fimHora <= 5) {
										dataReferencia = dataFinal
									} else {
										dataReferencia = dataInicial
									}
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
								const nowMinutes = now.getHours() * 60 + now.getMinutes()
								periodosValidos = periodos.filter((p) => {
									const [h, m] = p.fim.split(":")
									const fimMin = parseInt(h) * 60 + parseInt(m)
									return fimMin <= nowMinutes
								})
							}

							visibleMaquinas.forEach((num) => {
								const key = String(num)
								if (maquinasIgnoradas.includes(key)) return
								const machineName = machineMapEdit[key]
								const percs = periodosValidos
									.map((p) => {
										const periodoKey = `${p.inicio}-${p.fim}`
										const val = ocupacao[machineName]?.[periodoKey]
										return typeof val === "number" ? val : null
									})
									.filter((v) => v !== null) as number[]
								if (percs.length === 0) return
								const avg = percs.reduce((a, b) => a + b, 0) / percs.length
								valores.push(avg)
							})
							if (valores.length === 0) return 0
							const geral = valores.reduce((a, b) => a + b, 0) / valores.length
							return geral
						})()

						console.log(
							"[FRONTEND] PERCENTUAL GERAL OCUPAÇÃO:",
							percentualGeral + "%",
						)
						const top3Data = calculateTop3Motivos(
							motivosRawData,
							percentualGeral,
						)
						console.log("[FRONTEND] TOP 3 MOTIVOS:", top3Data)
						setMotivosData(top3Data)
					}
				})
				.catch((error) => {
					console.error("[FRONTEND] Erro ao carregar motivos:", error)
					setMotivosData(null)
				})
		}
	}, [ocupacao, dataSelecionada, turnoSelecionado])

	// Helper para pegar o percentual de ocupação por máquina/período
	function getPercent(machineNum: number, periodoIdx: number): string {
		// Se o turno 3 ainda não começou, todos os períodos devem ficar em branco
		if (turnoSelecionado === 2 && !isTurno3Iniciado()) return ""
		if (!ocupacao) return ""

		const periodo = periodos[periodoIdx]

		// Para turno 3, verificar se o período já terminou considerando as datas corretas
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
			// Para turnos 1 e 2, lógica original
			const now = new Date()
			const nowMinutes = now.getHours() * 60 + now.getMinutes()
			const [h, m] = periodo.fim.split(":")
			const fimMin = parseInt(h) * 60 + parseInt(m)

			// Se o período ainda não terminou, deixa em branco
			if (nowMinutes < fimMin) return ""
		}

		const machineName = machineMapEdit[String(machineNum)]
		const periodoKey = `${periodo.inicio}-${periodo.fim}`
		const value = ocupacao[machineName]?.[periodoKey]

		// Se o valor não existe no resultado do backend, deixa em branco
		if (value === undefined) return ""

		// Se o valor é 0 e o período já terminou, mostra 0%
		if (value === 0) return "0%"
		return `${Math.round(value)}%`
	}

	// Helper para calcular o geral do turno por máquina
	function getGeralTurno(machineNum: number): string {
		if (turnoSelecionado === 2 && !isTurno3Iniciado()) return "0%"
		if (!ocupacao) return "0%"
		if (maquinasIgnoradas.includes(String(machineNum))) return "-"
		const machineName = machineMapEdit[String(machineNum)]

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

				// Lógica original para turnos 1 e 2
				const now = new Date()
				const nowMinutes = now.getHours() * 60 + now.getMinutes()
				const [h, m] = p.fim.split(":")
				const fimMin = parseInt(h) * 60 + parseInt(m)
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
			const fimMin = parseInt(h) * 60 + parseInt(m)
			if (nowMinutes < fimMin) return "" // Se não terminou, deixa em branco
		}

		const values = visibleMaquinas
			.map((num) => {
				const key = String(num)
				if (maquinasIgnoradas.includes(key)) return null
				const machineName = machineMapEdit[key]
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
				const fimMin = parseInt(h) * 60 + parseInt(m)
				return fimMin <= nowMinutes
			})
		}

		const values = visibleMaquinas
			.map((num) => {
				const key = String(num)
				if (maquinasIgnoradas.includes(key)) return null
				const machineName = machineMapEdit[key]
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
				{visibleMaquinas.map((m) => (
					<label key={m} className="mr-3 text-sm">
						<input
							type="checkbox"
							checked={maquinasIgnoradas.includes(String(m))}
							onChange={() => handleToggleIgnorada(String(m))}
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
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-bold text-blue-700">
					CORTE - LASER - RELATÓRIO % OCUPAÇÃO DE MÁQUINAS
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

			{/* Barra de carregamento */}
			{isLoading && (
				<div className="mb-6 bg-gray-100 rounded-lg p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold text-gray-700">
							Carregando dados do turno...
						</span>
						<span className="text-sm font-bold text-blue-600">
							{loadingProgress}%
						</span>
					</div>
					<div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
						<div
							className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
							style={{ width: `${loadingProgress}%` }}
						></div>
					</div>
				</div>
			)}

			<div className="grid grid-cols-2 gap-6">
				{/* Tabela de ocupação */}
				<div className="bg-gray-50 rounded p-4">
					<h3 className="font-semibold mb-2 text-blue-700">
						{turnoSelecionado === null
							? "Selecione o turno para visualizar o relatório"
							: `LASER - ${turnos[turnoSelecionado]} - MÁQUINAS`}
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
							{visibleMaquinas.map((m) => {
								const key = String(m)
								if (maquinasIgnoradas.includes(key)) {
									return (
										<React.Fragment key={m}>
											<tr>
												<td className="p-1 font-bold border border-black text-center text-black">
													{editIdx === m ? (
														<input
															type="text"
															value={editValue}
															autoFocus
															onChange={(e) => setEditValue(e.target.value)}
															onBlur={() => handleEditSave(m)}
															onKeyDown={(e) => {
																if (e.key === "Enter") handleEditSave(m)
															}}
															className="border rounded px-1 py-0.5 text-xs w-20"
														/>
													) : (
														<span
															onDoubleClick={() => handleEditStart(m)}
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
									)
								}

								return (
									<React.Fragment key={m}>
										<tr>
											<td className="p-1 font-bold border border-black text-center text-black">
												{editIdx === m ? (
													<input
														type="text"
														value={editValue}
														autoFocus
														onChange={(e) => setEditValue(e.target.value)}
														onBlur={() => handleEditSave(m)}
														onKeyDown={(e) => {
															if (e.key === "Enter") handleEditSave(m)
														}}
														className="border rounded px-1 py-0.5 text-xs w-20"
													/>
												) : (
													<span
														onDoubleClick={() => handleEditStart(m)}
														style={{ cursor: "pointer" }}
														title="Duplo clique para editar o número do computador"
													>
														{m}
													</span>
												)}
											</td>
											{periodos.map((_, i) => {
												const percentStr = getPercent(m, i)
												return (
													<td
														key={i}
														className={`p-1 text-center border border-black ${getColor(percentStr)} ${getTextColor(percentStr)} font-bold`}
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
												className={`p-1 text-center border border-black ${getColor(getGeralTurno(m))} ${getTextColor(getGeralTurno(m))} font-bold`}
												style={
													getColor(getGeralTurno(m)) === "custom-yellow"
														? { backgroundColor: "#e6c200" }
														: {}
												}
											>
												{getGeralTurno(m)}
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
								)
							})}
							<tr className="font-bold">
								<td className="p-1 border border-black">
									<span className="font-bold">GERAL</span>
								</td>
								{periodos.map((_, i) => {
									const percentStr = getGeralPeriodo(i)
									return (
										<td
											key={i}
											className={`p-1 text-center border border-black ${getColor(percentStr)} ${getTextColor(percentStr)} font-bold`}
											style={
												getColor(percentStr) === "custom-yellow"
													? { backgroundColor: "#e6c200" }
													: {}
											}
										>
											<span className="font-bold">{percentStr}</span>
										</td>
									)
								})}
								<td className="p-1 bg-white"></td>
								<td
									className={`p-1 text-center border border-black ${getColor(getGeralTurnoTotal())} ${getTextColor(getGeralTurnoTotal())} font-bold`}
									style={
										getColor(getGeralTurnoTotal()) === "custom-yellow"
											? { backgroundColor: "#e6c200" }
											: {}
									}
								>
									<span className="font-bold">
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
							{visibleMaquinas
								.map((m) => ({
									nome: m,
									percent: parseInt(getGeralTurno(m).replace("%", "")),
									percentStr: getGeralTurno(m),
								}))
								.filter((it) => !maquinasIgnoradas.includes(String(it.nome)))
								.sort((a, b) => b.percent - a.percent)
								.map((item, rankIdx) => {
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
						<h3 className="font-semibold mb-2 text-blue-700">
							% INTERFERÊNCIAS E OCUPAÇÃO POR CATEGORIAS
						</h3>
						<div className="flex flex-col items-center gap-4">
							<CategoriaDonutChart
								data={
									motivosData && motivosData.data
										? motivosData.data
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
							<div
								style={{
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
	)
}
