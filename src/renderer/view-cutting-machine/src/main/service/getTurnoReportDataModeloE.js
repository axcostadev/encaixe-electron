// src/main/service/getTurnoReportDataModeloE.js — Comelz Solas
import fs from "fs"
import path from "path"
import { getGroupConfig } from "./settingsManager.js"

// Default baseDir (fallback)
const defaultBaseDir = "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz"

function resolveBaseDir() {
	try {
		const cfg = getGroupConfig && getGroupConfig("ComelzSolas")
		if (cfg && cfg.baseDir && typeof cfg.baseDir === "string" && cfg.baseDir.trim()) {
			console.log('[getTurnoReportDataModeloE] Usando baseDir das configurações:', cfg.baseDir)
			return cfg.baseDir
		}
	} catch (err) {
		console.warn('[getTurnoReportDataModeloE] Falha ao obter baseDir do settingsManager:', err)
	}
	console.log('[getTurnoReportDataModeloE] Usando baseDir padrão:', defaultBaseDir)
	return defaultBaseDir
}

function resolveMachineMap() {
	try {
		const cfg = getGroupConfig && getGroupConfig("ComelzSolas")
		if (cfg && cfg.machineMap && Object.keys(cfg.machineMap).length > 0) {
			console.log('[getTurnoReportDataModeloE] Usando machineMap das configurações:', cfg.machineMap)
			return cfg.machineMap
		}
	} catch (err) {
		console.warn('[getTurnoReportDataModeloE] Falha ao obter mapeamento do settingsManager:', err)
	}

	const defaultMap = {
		1: "02-1559",
		2: "02-1325",
	}
	console.log('[getTurnoReportDataModeloE] Usando machineMap padrão:', defaultMap)
	return defaultMap
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

function getLocalDateString() {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, "0")
	const day = String(now.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function getAllTxtFiles(dir) {
	try {
		if (!fs.existsSync(dir)) {
			console.warn(`[getTurnoReportDataModeloE] Diretório não existe ou inacessível: ${dir}`)
			return []
		}
		const arquivos = fs.readdirSync(dir)
		return arquivos
			.filter((name) => name.endsWith(".txt"))
			.map((name) => path.join(dir, name))
	} catch (err) {
		console.error(`[getTurnoReportDataModeloE] Erro ao acessar diretório ${dir}:`, err.code || err.message)
		return []
	}
}

function toMinutesFromMidnight(hora) {
	if (!hora || typeof hora !== "string") return 0
	const parts = hora.split(":")
	if (parts.length < 2) return 0
	const h = parseInt(parts[0], 10) || 0
	const m = parseInt(parts[1], 10) || 0
	return h * 60 + m
}

function mergeIntervals(intervals) {
	if (!intervals.length) return []
	intervals.sort((a, b) => a.start - b.start)
	const merged = [intervals[0]]
	for (let i = 1; i < intervals.length; i++) {
		const last = merged[merged.length - 1]
		if (intervals[i].start <= last.end) {
			last.end = Math.max(last.end, intervals[i].end)
		} else {
			merged.push(intervals[i])
		}
	}
	return merged
}

function sumIntervals(intervals) {
	return intervals.reduce((acc, cur) => acc + (cur.end - cur.start), 0)
}

function redistribuirExcesso(periodos, minutosPorPeriodo) {
	const ajustados = Array(minutosPorPeriodo.length).fill(0)
	let excesso = 0
	for (let i = 0; i < periodos.length; i++) {
		let total = minutosPorPeriodo[i] + excesso
		if (total > periodos[i].baseCalculo) {
			ajustados[i] = periodos[i].baseCalculo
			excesso = total - periodos[i].baseCalculo
		} else {
			ajustados[i] = total
			excesso = 0
		}
	}
	return ajustados
}

export function getTurnoReportDataModeloE(
	dateStr,
	turno = 2,
	dateInicial = null,
	dateFinal = null,
) {
	const baseDir = resolveBaseDir()
	const machineMap = resolveMachineMap()

	const result = {}
	const todayStr = dateStr || getLocalDateString()
	console.log(
		`[DEBUG] INÍCIO getTurnoReportDataModeloE - dateStr: ${dateStr}, todayStr: ${todayStr}, turno: ${turno}, dateInicial: ${dateInicial}, dateFinal: ${dateFinal}`,
	)
	console.log(`[DEBUG] baseDir: ${baseDir}`)
	console.log(`[DEBUG] machineMap:`, machineMap)
	let now
	let startOfTodayTimestamp
	const localDateStr = getLocalDateString()

	if (turno === 2 && dateInicial && dateFinal) {
		now = new Date()
		const startOfInitialDate = new Date(dateInicial + "T00:00:00")
		startOfTodayTimestamp = startOfInitialDate.getTime()
	} else if (!dateStr || dateStr === localDateStr) {
		now = new Date()
		const startOfToday = new Date(now)
		startOfToday.setHours(0, 0, 0, 0)
		startOfTodayTimestamp = startOfToday.getTime()
	} else {
		now = new Date(dateStr + "T00:00:00")
		const startOfToday = new Date(now)
		startOfToday.setHours(0, 0, 0, 0)
		startOfTodayTimestamp = startOfToday.getTime()
	}
	const nowTimestamp = now.getTime()

	let periodos
	if (turno === 0) {
		periodos = periodosTurno1
	} else if (turno === 1) {
		periodos = periodosTurno2
	} else {
		periodos = periodosTurno3
	}

	Object.values(machineMap).forEach((machine) => {
		const dir = path.join(baseDir, machine)
		const txtFiles = getAllTxtFiles(dir)

		const occupationByPeriod = {}
		const intervalsByPeriod = {}
		periodos.forEach((periodo) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			occupationByPeriod[key] = 0
			intervalsByPeriod[key] = []
		})

		if (!txtFiles.length) {
			result[machine] = occupationByPeriod
			return
		}

		let allLines = []
		txtFiles.forEach((filePath) => {
			const content = fs.readFileSync(filePath, "utf-8").trim()
			if (content) {
				const lines = content.split("\n")
				allLines = allLines.concat(lines)
			}
		})

		if (!allLines.length) {
			result[machine] = occupationByPeriod
			return
		}

		allLines.forEach((line) => {
			if (!line || typeof line !== "string") return

			const parts = line.split("|")
			if (parts.length < 4) return
			if (!parts[0] || !parts[0].trim()) return

			const dateTimeParts = parts[0].trim().split(" ")
			if (dateTimeParts.length < 2) return

			const startDateStr = dateTimeParts[0]
			let isValidDate = false

			if (turno === 2) {
				const hora = dateTimeParts[1]
				const minFromMidnight = toMinutesFromMidnight(hora)

				let validDate1, validDate2
				if (dateInicial && dateFinal && turno === 2) {
					validDate1 = dateInicial
					validDate2 = dateFinal
				} else {
					const nowMinutes = now.getHours() * 60 + now.getMinutes()
					const isAfter5AM = nowMinutes >= 300

					if (isAfter5AM) {
						validDate1 = todayStr
						const nextDay = new Date(todayStr)
						nextDay.setDate(nextDay.getDate() + 1)
						validDate2 = nextDay.toISOString().slice(0, 10)
					} else {
						const yesterday = new Date(todayStr)
						yesterday.setDate(yesterday.getDate() - 1)
						validDate1 = yesterday.toISOString().slice(0, 10)
						validDate2 = todayStr
					}
				}

				if (startDateStr === validDate1) {
					if (minFromMidnight >= 1300) isValidDate = true
				} else if (startDateStr === validDate2) {
					if (minFromMidnight < 300) isValidDate = true
				}
			} else {
				if (startDateStr === todayStr) isValidDate = true
			}
			if (!isValidDate) return

			const estado = parts[3].trim().toUpperCase()
			if (!["CUT", "PAUSAR"].includes(estado)) return

			const startDate = new Date(parts[0].trim().replace(" ", "T"))
			const endDate = new Date(parts[1].trim().replace(" ", "T"))
			if (startDate.getTime() < startOfTodayTimestamp) return
			if (startDate.getTime() > nowTimestamp) return

			let adjustedEndTime = endDate.getTime()
			if (adjustedEndTime > nowTimestamp) adjustedEndTime = nowTimestamp
			if (adjustedEndTime <= startDate.getTime()) return

			let startMin, endMin
			if (turno === 2 && dateInicial && dateFinal) {
				const baseTime = new Date(dateInicial + "T21:40:00").getTime()
				startMin = Math.floor((startDate.getTime() - baseTime) / 60000)
				endMin = Math.floor((adjustedEndTime - baseTime) / 60000)
			} else {
				startMin = Math.floor(
					(startDate.getTime() - startOfTodayTimestamp) / 60000,
				)
				endMin = Math.floor((adjustedEndTime - startOfTodayTimestamp) / 60000)
			}

			periodos.forEach((periodo) => {
				const key = `${periodo.inicio}-${periodo.fim}`
				let perInicio, perFim

				if (turno === 2 && dateInicial && dateFinal) {
					const baseTurno3 = 21 * 60 + 40
					perInicio = toMinutesFromMidnight(periodo.inicio)
					perFim =
						periodo.fim === "00:00"
							? 24 * 60
							: toMinutesFromMidnight(periodo.fim)

					if (perInicio >= baseTurno3) {
						perInicio = perInicio - baseTurno3
						perFim = perFim - baseTurno3
					} else {
						perInicio = 24 * 60 - baseTurno3 + perInicio
						perFim = 24 * 60 - baseTurno3 + perFim
					}
				} else {
					perInicio = toMinutesFromMidnight(periodo.inicio)
					perFim =
						periodo.fim === "00:00"
							? 24 * 60
							: toMinutesFromMidnight(periodo.fim)
				}

				if (perInicio > perFim) return
				const overlapStart = Math.max(startMin, perInicio)
				const overlapEnd = Math.min(endMin, perFim)
				if (overlapStart < overlapEnd) {
					intervalsByPeriod[key].push({ start: overlapStart, end: overlapEnd })
				}
			})
		})

		const minutosPorPeriodo = periodos.map((periodo) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			const merged = mergeIntervals(intervalsByPeriod[key])
			return sumIntervals(merged)
		})

		const minutosAjustados = redistribuirExcesso(periodos, minutosPorPeriodo)

		const occupationPercent = {}
		const nowMinutes = now.getHours() * 60 + now.getMinutes()

		periodos.forEach((periodo, i) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			const perInicio = toMinutesFromMidnight(periodo.inicio)
			const perFim =
				periodo.fim === "00:00" ? 24 * 60 : toMinutesFromMidnight(periodo.fim)

			if (turno === 2 && dateInicial && dateFinal) {
				// turno 3 com datas específicas - sempre inclui
			} else if (turno === 2 && perInicio < 300) {
				return
			}

			let elapsedInPeriod
			const isToday = todayStr === localDateStr
			const isTurno3ComDatas = turno === 2 && dateInicial && dateFinal
			const isDatePast = isTurno3ComDatas || !isToday

			if (isDatePast) {
				elapsedInPeriod = perFim - perInicio
			} else if (isToday) {
				if (nowMinutes >= perFim) {
					elapsedInPeriod = perFim - perInicio
				} else {
					elapsedInPeriod = Math.max(0, nowMinutes - perInicio)
				}
			}

			if (!isTurno3ComDatas && isToday) {
				if (nowMinutes < perInicio) return
				if (nowMinutes < perFim) return
			}

			const minutosValidos = Math.min(minutosAjustados[i], elapsedInPeriod)
			let percentual = (minutosValidos / periodo.baseCalculo) * 100
			if (percentual > 100) percentual = 100
			occupationPercent[key] = percentual
		})

		result[machine] = occupationPercent
	})

	return result
}

const motivosValidosModeloE = [
	"Sem motivo",
	"Criando imagem",
	"Aguardando técnico",
	"Falta de operador",
	"Falta de abastecimento",
	"Informática",
	"Almoço/Janta",
	"Fadiga",
	"Parada por motivo mecânico",
	"Parada por motivo elétrico",
]

export function getMotivosParadasPorCategoriaModeloE(dateStr, turno = null) {
	console.log(
		`[DEBUG] getMotivosParadasPorCategoriaModeloE - dateStr: ${dateStr}, turno: ${turno}`,
	)

	const baseDir = resolveBaseDir()
	const machineMap = resolveMachineMap()

	const todayStr = dateStr || getLocalDateString()
	const localDateStr = getLocalDateString()

	const result = {}
	let now
	if (!dateStr || dateStr === localDateStr) {
		now = new Date()
	} else {
		now = new Date(dateStr + "T00:00:00")
	}
	const nowTimestamp = now.getTime()
	const startOfToday = new Date(now)
	startOfToday.setHours(0, 0, 0, 0)
	const startOfTodayTimestamp = startOfToday.getTime()

	let turnoInicio = null
	let turnoFim = null

	if (turno === 0) {
		turnoInicio = 5 * 60
		turnoFim = 13 * 60 + 20
	} else if (turno === 1) {
		turnoInicio = 13 * 60 + 20
		turnoFim = 21 * 60 + 40
	} else if (turno === 2) {
		turnoInicio = 21 * 60 + 40
		turnoFim = 5 * 60 + 24 * 60
	}

	Object.values(machineMap).forEach((machine) => {
		const dir = path.join(baseDir, machine)
		const txtFiles = getAllTxtFiles(dir)
		if (!txtFiles.length) {
			result[machine] = {}
			return
		}

		let allLines = []
		txtFiles.forEach((filePath) => {
			try {
				const content = fs.readFileSync(filePath, "utf-8").trim()
				if (content) {
					allLines = allLines.concat(content.split("\n"))
				}
			} catch (error) {
				console.error(`[getTurnoReportDataModeloE] Erro ao ler arquivo ${filePath}:`, error)
			}
		})

		if (!allLines.length) {
			result[machine] = {}
			return
		}

		const motivosPorCategoria = {}

		allLines.forEach((line) => {
			const parts = line.split("|")
			if (parts.length < 5) return

			const [inicio, fim, , categoria, motivo] = parts
			const startDateStr = inicio.trim().split(" ")[0]
			if (dateStr && startDateStr !== todayStr) return

			const startDate = new Date(inicio.trim().replace(" ", "T"))
			const endDate = new Date(fim.trim().replace(" ", "T"))
			if (startDate.getTime() < startOfTodayTimestamp) return
			if (startDate.getTime() > nowTimestamp) return

			if (turno !== null && turnoInicio !== null && turnoFim !== null) {
				const startHour = startDate.getHours()
				const startMinuteOfDay = startHour * 60 + startDate.getMinutes()

				if (turno === 2) {
					if (startMinuteOfDay >= 300 && startMinuteOfDay < 1300) return
				} else {
					if (startMinuteOfDay < turnoInicio || startMinuteOfDay >= turnoFim) return
				}
			}

			let adjustedEndTime = endDate.getTime()
			if (adjustedEndTime > nowTimestamp) adjustedEndTime = nowTimestamp
			if (adjustedEndTime <= startDate.getTime()) return

			const cat = categoria.trim().toUpperCase()
			if (["OCUPAÇÃO", "CUT", "WORKING"].includes(cat)) return

			const motivoLimpo = motivo.trim()
			if (!motivosValidosModeloE.includes(motivoLimpo)) return

			if (!motivosPorCategoria[cat]) motivosPorCategoria[cat] = []
			motivosPorCategoria[cat].push(motivoLimpo)
		})

		result[machine] = motivosPorCategoria
	})

	return result
}
