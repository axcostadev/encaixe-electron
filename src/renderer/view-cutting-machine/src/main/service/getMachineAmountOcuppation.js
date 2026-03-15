// getMachineAmountOcuppation.js
import fs from "fs"
import path from "path"
import { getGroupConfig, addSettingsWatcher } from "./settingsManager.js"

// Sistema automático: não mais hardcoded - usa configurações centralizadas
let settingsUnsubscribe = null

// Monitora mudanças nas configurações
function initializeAutoSync() {
	if (settingsUnsubscribe) {
		settingsUnsubscribe()
	}
	
	settingsUnsubscribe = addSettingsWatcher((newSettings) => {
		console.log("[getMachineAmountOcuppation] Configurações atualizadas automaticamente:", 
			Object.keys(newSettings.machineGroups || {}).map(group => 
				`${group}: ${Object.keys(newSettings.machineGroups[group].machineMap || {}).length} máquinas`
			).join(", ")
		)
	})
}

// Inicializa o sistema automático
initializeAutoSync()

const periodos = [
	{ inicio: "05:00", fim: "06:00", baseCalculo: 60 },
	{ inicio: "06:00", fim: "07:00", baseCalculo: 50 },
	{ inicio: "07:00", fim: "08:00", baseCalculo: 60 },
	{ inicio: "08:00", fim: "09:00", baseCalculo: 40 },
	{ inicio: "09:00", fim: "10:00", baseCalculo: 20 },
	{ inicio: "10:00", fim: "11:00", baseCalculo: 60 },
	{ inicio: "11:00", fim: "12:00", baseCalculo: 50 },
	{ inicio: "12:00", fim: "13:20", baseCalculo: 80 },
	{ inicio: "13:20", fim: "14:00", baseCalculo: 40 },
	{ inicio: "14:00", fim: "15:00", baseCalculo: 60 },
	{ inicio: "15:00", fim: "16:00", baseCalculo: 50 },
	{ inicio: "16:00", fim: "17:00", baseCalculo: 60 },
	{ inicio: "17:00", fim: "18:00", baseCalculo: 40 },
	{ inicio: "18:00", fim: "19:00", baseCalculo: 20 },
	{ inicio: "19:00", fim: "20:00", baseCalculo: 60 },
	{ inicio: "20:00", fim: "21:40", baseCalculo: 90 },
	{ inicio: "21:40", fim: "22:00", baseCalculo: 20 },
	{ inicio: "22:00", fim: "23:00", baseCalculo: 60 },
	{ inicio: "23:00", fim: "00:00", baseCalculo: 50 },
	{ inicio: "00:00", fim: "01:00", baseCalculo: 40 },
	{ inicio: "01:00", fim: "02:00", baseCalculo: 20 },
	{ inicio: "02:00", fim: "03:00", baseCalculo: 60 },
	{ inicio: "03:00", fim: "04:00", baseCalculo: 50 },
	{ inicio: "04:00", fim: "05:00", baseCalculo: 60 },
]

// Retorna string da data local no formato yyyy-mm-dd
function getLocalDateString() {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, "0")
	const day = String(now.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function getLastFile(dir, machine) {
	try {
		if (!fs.existsSync(dir)) {
			console.warn(`Diretório não encontrado: ${dir}`)
			return null
		}
		const todayStr = getLocalDateString()
		const arquivos = fs.readdirSync(dir)
		const regexDiaAtual = new RegExp(
			`^${todayStr}-${machine}(-.*)?\\.txt$`,
			"i",
		)
		const filesDiaAtual = arquivos
			.filter((name) => regexDiaAtual.test(name))
			.map((name) => ({
				name,
				mtime: fs.statSync(path.join(dir, name)).mtime.getTime(),
			}))
			.sort((a, b) => b.mtime - a.mtime)
		if (filesDiaAtual.length > 0) {
			return path.join(dir, filesDiaAtual[0].name)
		}
		const regexAnyDate = /^\d{4}-\d{2}-\d{2}-.*\.txt$/i
		const filesTodos = arquivos
			.filter((name) => regexAnyDate.test(name))
			.map((name) => ({
				name,
				mtime: fs.statSync(path.join(dir, name)).mtime.getTime(),
			}))
			.sort((a, b) => b.mtime - a.mtime)
		if (filesTodos.length > 0) {
			return path.join(dir, filesTodos[0].name)
		}
		console.warn(
			`Nenhum arquivo .txt válido encontrado na pasta ${dir} para a máquina ${machine}`,
		)
		return null
	} catch (err) {
		console.error(`Erro ao listar arquivos na pasta ${dir}:`, err)
		return null
	}
}

function toMinutesFromMidnight(hora) {
	const [h, m] = hora.split(":").map(Number)
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

export function getMachineOccupation(group = "Laser") {
	// Sistema automático: obtém configurações em tempo real
	const { baseDir, machineMap } = getGroupConfig(group)
	const result = {}
	const todayStr = getLocalDateString()
	const now = new Date()
	const nowTimestamp = now.getTime()

	const startOfToday = new Date(now)
	startOfToday.setHours(0, 0, 0, 0)
	const startOfTodayTimestamp = startOfToday.getTime()

	console.log(`[getMachineOccupation] Processando grupo ${group} com ${Object.keys(machineMap).length} máquinas`)

	Object.values(machineMap).forEach((machine) => {
		const dir = path.join(baseDir, machine)
		const lastFile = getLastFile(dir, machine)

		const occupationByPeriod = {}
		const intervalsByPeriod = {}
		periodos.forEach((periodo) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			occupationByPeriod[key] = 0
			intervalsByPeriod[key] = []
		})

		if (!lastFile) {
			console.warn(
				`Nenhum arquivo encontrado para a máquina ${machine}, retornando zeros.`,
			)
			result[machine] = occupationByPeriod
			return
		}

		const content = fs.readFileSync(lastFile, "utf-8").trim()
		if (!content) {
			console.warn(`Arquivo ${lastFile} está vazio para a máquina ${machine}.`)
			result[machine] = occupationByPeriod
			return
		}

		const lines = content.split("\n")

		lines.forEach((line) => {
			const parts = line.split("|")
			if (parts.length < 4) return

			const estado = parts[3].trim().toUpperCase()
			if (!["CUT", "PAUSAR"].includes(estado)) return

			const startDate = new Date(parts[0].trim().replace(" ", "T"))
			const endDate = new Date(parts[1].trim().replace(" ", "T"))

			if (startDate.getTime() < startOfTodayTimestamp) return
			if (startDate.getTime() > nowTimestamp) return

			let adjustedEndTime = endDate.getTime()
			if (adjustedEndTime > nowTimestamp) adjustedEndTime = nowTimestamp

			if (adjustedEndTime <= startDate.getTime()) return

			const startMin = Math.floor(
				(startDate.getTime() - startOfTodayTimestamp) / 60000,
			)
			const endMin = Math.floor(
				(adjustedEndTime - startOfTodayTimestamp) / 60000,
			)

			periodos.forEach((periodo) => {
				const key = `${periodo.inicio}-${periodo.fim}`
				const perInicio = toMinutesFromMidnight(periodo.inicio)
				const perFim =
					periodo.fim === "00:00" ? 24 * 60 : toMinutesFromMidnight(periodo.fim)
				if (perInicio > perFim) return

				const overlapStart = Math.max(startMin, perInicio)
				const overlapEnd = Math.min(endMin, perFim)

				if (overlapStart < overlapEnd) {
					intervalsByPeriod[key].push({ start: overlapStart, end: overlapEnd })
				}
			})
		})

		// Calcula minutos reais trabalhados por período, sem limitar ainda pela hora corrente
		const minutosPorPeriodo = periodos.map((periodo) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			const merged = mergeIntervals(intervalsByPeriod[key])
			return sumIntervals(merged)
		})

		// Redistribui minutos excedentes para o próximo período
		const minutosAjustados = redistribuirExcesso(periodos, minutosPorPeriodo)

		// Agora limita o valor pelos minutos decorridos no período para evitar contar tempo futuro
		const occupationPercent = {}
		const nowMinutes = now.getHours() * 60 + now.getMinutes()

		periodos.forEach((periodo, i) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			const perInicio = toMinutesFromMidnight(periodo.inicio)
			const perFim =
				periodo.fim === "00:00" ? 24 * 60 : toMinutesFromMidnight(periodo.fim)
			const elapsedInPeriod = Math.max(
				0,
				Math.min(nowMinutes, perFim) - perInicio,
			)

			const minutosValidos = Math.min(minutosAjustados[i], elapsedInPeriod)

			const percentual = (minutosValidos / periodo.baseCalculo) * 100
			occupationPercent[key] = Math.min(percentual, 100)
		})

		result[machine] = occupationPercent
	})

	return result
}

/**
 * Obtém o último período ativo para cada máquina a partir da ocupação calculada
 *
 * @param {Object} occupation - Objeto com a ocupação das máquinas (resultado da função getMachineOccupation)
 * @returns {Object} - Objeto mapeando cada máquina para seu último período ativo
 */
export function getLastActivePeriod(occupation) {
	const result = {}
	for (const [machine, periods] of Object.entries(occupation)) {
		const periodKeys = Object.keys(periods)
		let lastActive = null
		for (let i = periodKeys.length - 1; i >= 0; i--) {
			if (periods[periodKeys[i]] > 0) {
				lastActive = periodKeys[i]
				break
			}
		}
		result[machine] = lastActive
	}
	return result
}
