// src/main/service/getTurnoReportDataModeloC.js
import fs from "fs"
import path from "path"
// Import settings helper so machine mapping can follow saved Setup (network/local)
import { getGroupConfig } from "./settingsManager.js"

// Default baseDir (fallback)
const defaultBaseDir = "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz"

// Resolve baseDir from settings if available. Fall back to built-in default.
function resolveBaseDir() {
	try {
		const cfg = getGroupConfig && getGroupConfig("Comelz")
		if (cfg && cfg.baseDir && typeof cfg.baseDir === "string" && cfg.baseDir.trim()) {
			console.log('[getTurnoReportDataModeloC] Usando baseDir das configurações:', cfg.baseDir)
			return cfg.baseDir
		}
	} catch (err) {
		console.warn('[getTurnoReportDataModeloC] Falha ao obter baseDir do settingsManager:', err)
	}
	console.log('[getTurnoReportDataModeloC] Usando baseDir padrão:', defaultBaseDir)
	return defaultBaseDir
}

// Resolve machine map from settings if available. Fall back to built-in defaults.
function resolveMachineMap() {
	try {
		const cfg = getGroupConfig && getGroupConfig("Comelz")
		if (cfg && cfg.machineMap && Object.keys(cfg.machineMap).length > 0) {
			console.log('[getTurnoReportDataModeloC] Usando machineMap das configurações:', cfg.machineMap)
			return cfg.machineMap
		}
	} catch (err) {
		console.warn('[getTurnoReportDataModeloC] Falha ao obter mapeamento do settingsManager:', err)
	}

	const defaultMap = {
		1: "02-1555",
		2: "02-1556",
		3: "02-1558",
		4: "02-1507",
	}
	console.log('[getTurnoReportDataModeloC] Usando machineMap padrão:', defaultMap)
	return defaultMap
}

// Períodos de cada turno
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
			console.warn(`[getTurnoReportDataModeloC] Diretório não existe ou inacessível: ${dir}`)
			return []
		}
		const arquivos = fs.readdirSync(dir)
		return arquivos
			.filter((name) => name.endsWith(".txt"))
			.map((name) => path.join(dir, name))
	} catch (err) {
		console.error(`[getTurnoReportDataModeloC] Erro ao acessar diretório ${dir}:`, err.code || err.message)
		return []
	}
}

function toMinutesFromMidnight(hora) {
	// Garante que só pega hora e minuto
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

export function getTurnoReportDataModeloC(
	dateStr,
	turno = 2,
	dateInicial = null,
	dateFinal = null,
) {
	// Resolve baseDir e machineMap dinamicamente a cada chamada
	const baseDir = resolveBaseDir()
	const machineMap = resolveMachineMap()
	
	// Adaptação para preencher uma máquina por vez usando a lógica do getMachineAmountOcuppation.js
	const result = {}
	const todayStr = dateStr || getLocalDateString()
	console.log(
		`[DEBUG] INÍCIO getTurnoReportDataModeloC - dateStr: ${dateStr}, todayStr: ${todayStr}, turno: ${turno}, dateInicial: ${dateInicial}, dateFinal: ${dateFinal}`,
	)
	console.log(`[DEBUG] baseDir: ${baseDir}`)
	console.log(`[DEBUG] machineMap:`, machineMap)
	let now
	let startOfTodayTimestamp
	const localDateStr = getLocalDateString()

	if (turno === 2 && dateInicial && dateFinal) {
		// Para turno 3 com dateInicial/dateFinal, usa a data inicial como referência
		// mas o timestamp atual para limitar dados futuros
		now = new Date() // Sempre usa horário atual para não mostrar dados futuros
		const startOfInitialDate = new Date(dateInicial + "T00:00:00")
		startOfTodayTimestamp = startOfInitialDate.getTime()
		console.log(
			`[DEBUG] Turno 3 com datas específicas - usando ${dateInicial} como referência base`,
		)
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

	// Seleciona os períodos conforme o turno
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
		if (txtFiles.length) {
			console.log(`[DEBUG][${machine}] Arquivos TXT encontrados:`, txtFiles)
		} else {
			console.log(
				`[DEBUG][${machine}] Nenhum arquivo TXT encontrado no diretório: ${dir}`,
			)
		}

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
		let totalLines = 0
		txtFiles.forEach((filePath) => {
			const content = fs.readFileSync(filePath, "utf-8").trim()
			if (content) {
				const lines = content.split("\n")
				console.log(
					`[DEBUG][${machine}] Linhas lidas do arquivo ${filePath}:`,
					lines.length,
				)
				allLines = allLines.concat(lines)
				totalLines += lines.length
			} else {
				console.log(`[DEBUG][${machine}] Arquivo ${filePath} está vazio.`)
			}
		})

		if (!allLines.length) {
			console.log(
				`[DEBUG][${machine}] Nenhuma linha encontrada nos arquivos TXT.`,
			)
			result[machine] = occupationByPeriod
			return
		}
		console.log(`[DEBUG][${machine}] Total de linhas lidas:`, totalLines)

		// Log das últimas 10 linhas e se são válidas
		const ultimas10 = allLines.slice(-10)
		if (ultimas10.length) {
			console.log(`[DEBUG][${machine}] Últimas 10 linhas lidas:`)
			ultimas10.forEach((line, idx) => {
				const parts = line.split("|")
				let motivo = []
				let isValid = true
				if (parts.length < 4) {
					motivo.push("Menos de 4 campos")
					isValid = false
				}
				let isValidDate = false
				if (parts.length >= 1) {
					const startDateStr = parts[0].trim().split(" ")[0]
					if (turno === 2 && parts[0]) {
						const hora = parts[0].trim().split(" ")[1]
						const minFromMidnight = toMinutesFromMidnight(hora)
						if (startDateStr === todayStr) {
							if (minFromMidnight >= 1300) {
								isValidDate = true
							} else {
								motivo.push("Turno 3: horário antes de 21:40")
							}
						} else {
							const nextDay = new Date(todayStr)
							nextDay.setDate(nextDay.getDate() + 1)
							const nextDayStr = nextDay.toISOString().slice(0, 10)
							if (startDateStr === nextDayStr) {
								if (minFromMidnight < 300) {
									isValidDate = true
								} else {
									motivo.push("Turno 3: dia seguinte >=05:00")
								}
							} else {
								motivo.push("Turno 3: data não é today nem nextDay")
							}
						}
					} else if (parts.length >= 1) {
						if (startDateStr === todayStr) {
							isValidDate = true
						} else {
							motivo.push("Data não é today")
						}
					}
				}
				if (!isValidDate) isValid = false
				let estado = parts.length >= 4 ? parts[3].trim().toUpperCase() : ""
				if (isValid && !["CUT", "PAUSAR"].includes(estado)) {
					motivo.push(`Estado não é CUT/PAUSAR: ${estado}`)
					isValid = false
				}
				let startDate, endDate
				if (isValid && parts.length >= 2) {
					startDate = new Date(parts[0].trim().replace(" ", "T"))
					endDate = new Date(parts[1].trim().replace(" ", "T"))
					if (startDate.getTime() < startOfTodayTimestamp) {
						motivo.push("startDate < startOfToday")
						isValid = false
					}
					if (startDate.getTime() > nowTimestamp) {
						motivo.push("startDate > nowTimestamp")
						isValid = false
					}
					let adjustedEndTime = endDate.getTime()
					if (adjustedEndTime > nowTimestamp) adjustedEndTime = nowTimestamp
					if (adjustedEndTime <= startDate.getTime()) {
						motivo.push("adjustedEndTime <= startDate")
						isValid = false
					}
				}
				console.log(
					`  [${idx + 1}] ${line} => ${isValid ? "VÁLIDA" : "INVÁLIDA"}${motivo.length ? ` (${motivo.join(", ")})` : ""}`,
				)
			})
		}

		let validLinesCount = 0
		let rejectedByDate = 0
		let rejectedByState = 0
		let rejectedByTime = 0

		// Teste específico para uma linha que deveria ser válida
		console.log(
			`[DEBUG][${machine}] INICIANDO VALIDAÇÃO DE LINHAS - Total: ${allLines.length} linhas`,
		)

		allLines.forEach((line, index) => {
			// Verifica se a linha não está vazia ou undefined
			if (!line || typeof line !== "string") return

			const parts = line.split("|")
			if (parts.length < 4) return

			// Verifica se parts[0] existe e tem conteúdo
			if (!parts[0] || !parts[0].trim()) return

			const dateTimeParts = parts[0].trim().split(" ")
			if (dateTimeParts.length < 2) return

			const startDateStr = dateTimeParts[0]
			let isValidDate = false

			// Debug apenas as primeiras 3 linhas para evitar spam
			const shouldDebug = index < 3

			if (turno === 2) {
				// Para o turno 3, considerar registros do dia atual a partir de 21:40 e do dia seguinte até 05:00
				const hora = dateTimeParts[1]
				const minFromMidnight = toMinutesFromMidnight(hora)

				if (shouldDebug) {
					console.log(
						`[DEBUG][T3] Linha ${index + 1}: ${line.substring(0, 50)}...`,
					)
					console.log(
						`[DEBUG][T3] startDateStr: ${startDateStr}, todayStr: ${todayStr}, hora: ${hora}, minFromMidnight: ${minFromMidnight}`,
					)
				}

				// Determina qual dia estamos considerando como base para o turno 3
				let validDate1, validDate2
				if (dateInicial && dateFinal && turno === 2) {
					// Para turno 3, usa dateInicial e dateFinal quando fornecidos
					validDate1 = dateInicial // Data inicial (21:40 em diante)
					validDate2 = dateFinal // Data final (até 05:00)
					if (shouldDebug) {
						console.log(
							`[DEBUG][T3] Usando dateInicial/dateFinal: validDate1=${validDate1}, validDate2=${validDate2}`,
						)
					}
				} else {
					// Lógica original para compatibilidade
					const nowMinutes = now.getHours() * 60 + now.getMinutes()
					const isAfter5AM = nowMinutes >= 300 // 05:00 = 300 minutos

					if (isAfter5AM) {
						// Após 05:00: procura hoje (>=21:40) + amanhã (<05:00)
						validDate1 = todayStr
						const nextDay = new Date(todayStr)
						nextDay.setDate(nextDay.getDate() + 1)
						validDate2 = nextDay.toISOString().slice(0, 10)
					} else {
						// Antes de 05:00: procura ontem (>=21:40) + hoje (<05:00)
						const yesterday = new Date(todayStr)
						yesterday.setDate(yesterday.getDate() - 1)
						validDate1 = yesterday.toISOString().slice(0, 10)
						validDate2 = todayStr
					}
				}

				if (startDateStr === validDate1) {
					// Primeiro dia: só considera se for a partir de 21:40
					if (minFromMidnight >= 1300) {
						isValidDate = true
						if (shouldDebug)
							console.log(
								`[DEBUG][T3] isValidDate = true (${validDate1} >=21:40)`,
							)
					} else {
						rejectedByDate++
						if (shouldDebug)
							console.log(
								`[DEBUG][T3] Rejeitado: ${validDate1} horário antes de 21:40`,
							)
					}
				} else if (startDateStr === validDate2) {
					// Segundo dia: só considera se o horário for entre 00:00 e 05:00
					if (minFromMidnight < 300) {
						isValidDate = true
						if (shouldDebug)
							console.log(
								`[DEBUG][T3] isValidDate = true (${validDate2} <05:00)`,
							)
					} else {
						rejectedByDate++
						if (shouldDebug)
							console.log(`[DEBUG][T3] Rejeitado: ${validDate2} >=05:00`)
					}
				} else {
					rejectedByDate++
					if (shouldDebug)
						console.log(
							`[DEBUG][T3] Rejeitado: data não é ${validDate1} nem ${validDate2}`,
						)
				}
			} else {
				if (startDateStr === todayStr) isValidDate = true
				else rejectedByDate++
			}
			if (!isValidDate) return
			validLinesCount++
			const estado = parts[3].trim().toUpperCase()
			if (!["CUT", "PAUSAR"].includes(estado)) {
				rejectedByState++
				return
			}
			const startDate = new Date(parts[0].trim().replace(" ", "T"))
			const endDate = new Date(parts[1].trim().replace(" ", "T"))
			if (startDate.getTime() < startOfTodayTimestamp) {
				rejectedByTime++
				return
			}
			if (startDate.getTime() > nowTimestamp) {
				rejectedByTime++
				return
			}
			let adjustedEndTime = endDate.getTime()
			if (adjustedEndTime > nowTimestamp) adjustedEndTime = nowTimestamp
			if (adjustedEndTime <= startDate.getTime()) {
				rejectedByTime++
				return
			}
			// Para turno 3, ajusta cálculo de minutos considerando o período de 2 dias
			let startMin, endMin
			if (turno === 2 && dateInicial && dateFinal) {
				// Para turno 3 com datas específicas, calcula minutos desde 21:40 da data inicial
				const baseTime = new Date(dateInicial + "T21:40:00").getTime()
				startMin = Math.floor((startDate.getTime() - baseTime) / 60000)
				endMin = Math.floor((adjustedEndTime - baseTime) / 60000)
			} else {
				// Lógica original
				startMin = Math.floor(
					(startDate.getTime() - startOfTodayTimestamp) / 60000,
				)
				endMin = Math.floor((adjustedEndTime - startOfTodayTimestamp) / 60000)
			}
			periodos.forEach((periodo) => {
				const key = `${periodo.inicio}-${periodo.fim}`
				let perInicio, perFim

				if (turno === 2 && dateInicial && dateFinal) {
					// Para turno 3, calcula minutos desde 21:40 da data inicial
					const baseTurno3 = 21 * 60 + 40 // 21:40 em minutos
					perInicio = toMinutesFromMidnight(periodo.inicio)
					perFim =
						periodo.fim === "00:00"
							? 24 * 60
							: toMinutesFromMidnight(periodo.fim)

					// Ajusta para ser relativo ao início do turno (21:40)
					if (perInicio >= baseTurno3) {
						// Períodos do primeiro dia (21:40-00:00)
						perInicio = perInicio - baseTurno3
						perFim = perFim - baseTurno3
					} else {
						// Períodos do segundo dia (00:00-05:00)
						perInicio = 24 * 60 - baseTurno3 + perInicio
						perFim = 24 * 60 - baseTurno3 + perFim
					}
				} else {
					// Lógica original
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
					console.log(
						`[DEBUG][${machine}] Período ${key}: adicionado intervalo ${overlapStart}-${overlapEnd}`,
					)
				}
			})
		})

		console.log(`[DEBUG][${machine}] Estatísticas de processamento:`)
		console.log(
			`[DEBUG][${machine}] - Total de linhas válidas processadas: ${validLinesCount}`,
		)
		console.log(`[DEBUG][${machine}] - Rejeitadas por data: ${rejectedByDate}`)
		console.log(
			`[DEBUG][${machine}] - Rejeitadas por estado: ${rejectedByState}`,
		)
		console.log(`[DEBUG][${machine}] - Rejeitadas por tempo: ${rejectedByTime}`)

		// Calcula minutos reais trabalhados por período
		const minutosPorPeriodo = periodos.map((periodo) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			const merged = mergeIntervals(intervalsByPeriod[key])
			const minutos = sumIntervals(merged)
			console.log(
				`[DEBUG][${machine}] Período ${key}: minutosPorPeriodo = ${minutos}`,
			)
			return minutos
		})

		// Redistribui minutos excedentes para o próximo período
		const minutosAjustados = redistribuirExcesso(periodos, minutosPorPeriodo)
		minutosAjustados.forEach((min, i) => {
			const key = `${periodos[i].inicio}-${periodos[i].fim}`
			console.log(
				`[DEBUG][${machine}] Período ${key}: minutosAjustados = ${min}`,
			)
		})

		// Limita o valor pelos minutos decorridos no período para evitar contar tempo futuro
		const occupationPercent = {}
		const nowMinutes = now.getHours() * 60 + now.getMinutes()

		periodos.forEach((periodo, i) => {
			const key = `${periodo.inicio}-${periodo.fim}`
			const perInicio = toMinutesFromMidnight(periodo.inicio)
			const perFim =
				periodo.fim === "00:00" ? 24 * 60 : toMinutesFromMidnight(periodo.fim)

			// Para turno 3 com dateInicial/dateFinal, sempre mostra todos os períodos
			// que já terminaram (não considera se é dia seguinte)
			if (turno === 2 && dateInicial && dateFinal) {
				// Para turno 3 com datas específicas, sempre mostra os dados
				// A validação temporal já foi feita anteriormente
				console.log(
					`[DEBUG][${machine}] Período ${key}: turno 3 com datas específicas - sempre inclui`,
				)
			} else if (turno === 2 && perInicio < 300) {
				// Para turno 3 sem datas específicas, períodos de 00:00 às 05:00 são do dia seguinte
				console.log(
					`[DEBUG][${machine}] Período ${key}: ignorado (é do dia seguinte - perInicio: ${perInicio})`,
				)
				return // Pula este período
			}

			let elapsedInPeriod
			const isToday = todayStr === localDateStr

			// Para turno 3 com dateInicial/dateFinal, considera como "passado"
			const isTurno3ComDatas = turno === 2 && dateInicial && dateFinal
			const isDatePast = isTurno3ComDatas || !isToday

			if (isDatePast) {
				// Para datas passadas ou turno 3 com datas específicas, sempre mostra período completo
				elapsedInPeriod = perFim - perInicio
			} else if (isToday) {
				if (nowMinutes >= perFim) {
					elapsedInPeriod = perFim - perInicio
				} else {
					elapsedInPeriod = Math.max(0, nowMinutes - perInicio)
				}
			}

			// Para turno 3 com datas específicas, não precisa validar se período já terminou
			// pois os dados são históricos
			if (!isTurno3ComDatas && isToday) {
				// Verifica se o período ainda não começou
				if (nowMinutes < perInicio) {
					console.log(
						`[DEBUG][${machine}] Período ${key}: ignorado (ainda não começou - nowMinutes: ${nowMinutes}, perInicio: ${perInicio})`,
					)
					return // Não inclui no resultado
				}

				// Verifica se o período ainda não terminou
				if (nowMinutes < perFim) {
					console.log(
						`[DEBUG][${machine}] Período ${key}: ignorado (ainda não terminou - nowMinutes: ${nowMinutes}, perFim: ${perFim})`,
					)
					return // Não inclui no resultado
				}

				// Se chegou aqui, o período já terminou completamente
				console.log(
					`[DEBUG][${machine}] Período ${key}: período completo (nowMinutes: ${nowMinutes}, perFim: ${perFim})`,
				)
			}

			console.log(
				`[DEBUG][${machine}] Período ${key}: elapsedInPeriod = ${elapsedInPeriod}`,
			)
			const minutosValidos = Math.min(minutosAjustados[i], elapsedInPeriod)
			console.log(
				`[DEBUG][${machine}] Período ${key}: minutosValidos = ${minutosValidos}`,
			)
			let percentual = (minutosValidos / periodo.baseCalculo) * 100
			if (percentual > 100) percentual = 100
			occupationPercent[key] = percentual
			console.log(
				`[DEBUG][${machine}] Período ${key}: percentual final registrado = ${occupationPercent[key]}`,
			)
		})

		result[machine] = occupationPercent
	})

	return result
}

// Lista de motivos válidos de parada para Comelz
const motivosValidosModeloC = [
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

export function getMotivosParadasPorCategoriaModeloC(dateStr, turno = null) {
	console.log(
		`[DEBUG] getMotivosParadasPorCategoriaModeloC - dateStr: ${dateStr}, turno: ${turno}`,
	)

	// Resolve baseDir e machineMap dinamicamente
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

	// Definir horários por turno
	let turnoInicio = null
	let turnoFim = null

	if (turno === 0) {
		// 1º Turno: 05:00 - 13:20
		turnoInicio = 5 * 60 // 05:00 em minutos
		turnoFim = 13 * 60 + 20 // 13:20 em minutos
	} else if (turno === 1) {
		// 2º Turno: 13:20 - 21:40
		turnoInicio = 13 * 60 + 20 // 13:20 em minutos
		turnoFim = 21 * 60 + 40 // 21:40 em minutos
	} else if (turno === 2) {
		// 3º Turno: 21:40 - 05:00 (próximo dia)
		turnoInicio = 21 * 60 + 40 // 21:40 em minutos
		turnoFim = 5 * 60 + 24 * 60 // 05:00 + 24h em minutos (próximo dia)
	}

	console.log(
		`[DEBUG] Filtro de turno: ${
			turno !== null
				? `${Math.floor(turnoInicio / 60)
						.toString()
						.padStart(
							2,
							"0",
						)}:${(turnoInicio % 60).toString().padStart(2, "0")} - ${Math.floor(
						turnoFim / 60,
					)
						.toString()
						.padStart(2, "0")}:${(turnoFim % 60).toString().padStart(2, "0")}`
				: "SEM FILTRO"
		}`,
	)
	console.log(`[DEBUG] Diretório base ModeloC: ${baseDir}`)
	console.log(
		`[DEBUG] Processando ${Object.keys(machineMap).length} máquinas ModeloC`,
	)

	Object.values(machineMap).forEach((machine) => {
		console.log(`[DEBUG] ========================================`)
		console.log(`[DEBUG] Processando máquina: ${machine} (ModeloC)`)
		const dir = path.join(baseDir, machine)
		console.log(`[DEBUG] Caminho completo: ${dir}`)
		const txtFiles = getAllTxtFiles(dir)
		if (!txtFiles.length) {
			console.log(`[DEBUG] ${machine} - Nenhum arquivo .txt encontrado`)
			result[machine] = {}
			return
		}

		let allLines = []
		console.log(
			`[DEBUG] ${machine} - Lendo TODOS os arquivos .txt (${txtFiles.length} arquivos)`,
		)

		txtFiles.forEach((filePath) => {
			try {
				const content = fs.readFileSync(filePath, "utf-8").trim()
				if (content) {
					const fileLines = content.split("\n")
					console.log(
						`[DEBUG] ${machine} - Arquivo ${path.basename(filePath)}: ${fileLines.length} linhas`,
					)

					// Adiciona TODAS as linhas, sem filtro de data
					allLines = allLines.concat(fileLines)

					// Mostra algumas linhas de exemplo do arquivo
					if (fileLines.length > 0) {
						console.log(
							`[DEBUG] ${machine} - Primeiras linhas do arquivo ${path.basename(filePath)}:`,
							fileLines.slice(0, 2),
						)
					}
				}
			} catch (error) {
				console.error(
					`[DEBUG] ${machine} - Erro ao ler arquivo ${filePath}:`,
					error,
				)
			}
		})

		console.log(
			`[DEBUG] ${machine} - Total de linhas de todos os arquivos: ${allLines.length}`,
		)

		if (!allLines.length) {
			result[machine] = {}
			return
		}
		// Filtra linhas do dia e só paradas
		const motivosPorCategoria = {}
		let totalLinhasProcessadas = 0
		let linhasDoTurno = 0
		let motivosEncontrados = 0

		allLines.forEach((line) => {
			totalLinhasProcessadas++
			const parts = line.split("|")
			if (parts.length < 5) return

			// Formato: inicio|fim|duracao|categoria|motivo
			const [inicio, fim, , categoria, motivo] = parts

			// Filtra por data selecionada (se especificada)
			const startDateStr = inicio.trim().split(" ")[0]
			if (dateStr && startDateStr !== todayStr) return

			const startDate = new Date(inicio.trim().replace(" ", "T"))
			const endDate = new Date(fim.trim().replace(" ", "T"))
			if (startDate.getTime() < startOfTodayTimestamp) return
			if (startDate.getTime() > nowTimestamp) return

			// Filtrar por turno se especificado
			if (turno !== null && turnoInicio !== null && turnoFim !== null) {
				const startHour = startDate.getHours()
				const startMinute = startDate.getMinutes()
				const startMinuteOfDay = startHour * 60 + startMinute

				// Para 3º turno que cruza meia-noite
				if (turno === 2) {
					if (
						!(
							startMinuteOfDay >= turnoInicio ||
							startMinuteOfDay <= turnoFim - 24 * 60
						)
					) {
						return
					}
				} else {
					if (startMinuteOfDay < turnoInicio || startMinuteOfDay >= turnoFim) {
						return
					}
				}
			}

			linhasDoTurno++

			let adjustedEndTime = endDate.getTime()
			if (adjustedEndTime > nowTimestamp) adjustedEndTime = nowTimestamp
			if (adjustedEndTime <= startDate.getTime()) return

			// Filtra apenas categorias de parada (exclui ocupação normal)
			const cat = categoria.trim().toUpperCase()
			if (["OCUPAÇÃO", "CUT", "WORKING"].includes(cat)) return // Exclui estados de trabalho

			// O motivo está na posição 4 (índice 4)
			const motivoLimpo = motivo.trim()
			console.log(
				`[DEBUG] ${machine} - Linha: data="${startDateStr}", categoria="${cat}", motivo="${motivoLimpo}", hora: ${inicio.trim()}`,
			)

			if (!motivosValidosModeloC.includes(motivoLimpo)) {
				console.log(
					`[DEBUG] ${machine} - Motivo "${motivoLimpo}" não está na lista de motivos válidos ModeloC`,
				)
				return
			}

			motivosEncontrados++
			if (!motivosPorCategoria[cat]) motivosPorCategoria[cat] = []
			motivosPorCategoria[cat].push(motivoLimpo)
			console.log(
				`[DEBUG] ${machine} - Motivo adicionado: ${motivoLimpo} na categoria ${cat}`,
			)
		})

		console.log(
			`[DEBUG] ${machine} - Linhas processadas: ${totalLinhasProcessadas}, Do turno: ${linhasDoTurno}, Motivos válidos: ${motivosEncontrados}`,
		)
		if (motivosEncontrados > 0) {
			console.log(
				`[DEBUG] ${machine} - Motivos por categoria:`,
				motivosPorCategoria,
			)
		}

		result[machine] = motivosPorCategoria
	})

	console.log(`[DEBUG] ========================================`)
	console.log(`[DEBUG] RESUMO FINAL ModeloC:`)
	Object.entries(result).forEach(([machine, motivos]) => {
		const totalMotivos = Object.values(motivos).flat().length
		console.log(`[DEBUG] ${machine}: ${totalMotivos} motivos encontrados`)
	})
	console.log(`[DEBUG] Resultado final ModeloC:`, result)
	return result
}
