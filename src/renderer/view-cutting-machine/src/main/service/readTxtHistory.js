// readTxtHistory.js
// Módulo dedicado para ler o histórico de longo prazo dos arquivos .txt
// Este módulo NÃO interfere com a funcionalidade existente do "Relatório por Turno"

import fs from 'fs'
import path from 'path'

// Períodos de cada turno (mesma configuração do sistema principal)
const periodosTurno1 = [
	{ inicio: '05:00', fim: '06:00', baseCalculo: 60 },
	{ inicio: '06:00', fim: '07:00', baseCalculo: 50 },
	{ inicio: '07:00', fim: '08:00', baseCalculo: 60 },
	{ inicio: '08:00', fim: '09:00', baseCalculo: 40 },
	{ inicio: '09:00', fim: '10:00', baseCalculo: 20 },
	{ inicio: '10:00', fim: '11:00', baseCalculo: 60 },
	{ inicio: '11:00', fim: '12:00', baseCalculo: 50 },
	{ inicio: '12:00', fim: '13:20', baseCalculo: 80 }
]

const periodosTurno2 = [
	{ inicio: '13:20', fim: '14:00', baseCalculo: 40 },
	{ inicio: '14:00', fim: '15:00', baseCalculo: 60 },
	{ inicio: '15:00', fim: '16:00', baseCalculo: 50 },
	{ inicio: '16:00', fim: '17:00', baseCalculo: 60 },
	{ inicio: '17:00', fim: '18:00', baseCalculo: 40 },
	{ inicio: '18:00', fim: '19:00', baseCalculo: 20 },
	{ inicio: '19:00', fim: '20:00', baseCalculo: 60 },
	{ inicio: '20:00', fim: '21:40', baseCalculo: 90 }
]

const periodosTurno3 = [
	{ inicio: '21:40', fim: '22:00', baseCalculo: 20 },
	{ inicio: '22:00', fim: '23:00', baseCalculo: 60 },
	{ inicio: '23:00', fim: '00:00', baseCalculo: 50 },
	{ inicio: '00:00', fim: '01:00', baseCalculo: 40 },
	{ inicio: '01:00', fim: '02:00', baseCalculo: 20 },
	{ inicio: '02:00', fim: '03:00', baseCalculo: 60 },
	{ inicio: '03:00', fim: '04:00', baseCalculo: 50 },
	{ inicio: '04:00', fim: '05:00', baseCalculo: 60 }
]

// Converte HH:MM em minutos desde meia-noite
function toMinutesFromMidnight(hora) {
	if (!hora || typeof hora !== 'string') return 0
	const parts = hora.split(':')
	if (parts.length < 2) return 0
	const h = parseInt(parts[0], 10) || 0
	const m = parseInt(parts[1], 10) || 0
	return h * 60 + m
}

// Mescla intervalos sobrepostos
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

// Soma total de minutos dos intervalos
function sumIntervals(intervals) {
	return intervals.reduce((acc, cur) => acc + (cur.end - cur.start), 0)
}

// Redistribui excesso de minutos entre períodos
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

// Determina o turno baseado na hora
function getTurnoFromHour(hora) {
	const minutos = toMinutesFromMidnight(hora)
	
	// Turno 1: 05:00 - 13:20 (300 - 800 minutos)
	if (minutos >= 300 && minutos < 800) return 1
	
	// Turno 2: 13:20 - 21:40 (800 - 1300 minutos)
	if (minutos >= 800 && minutos < 1300) return 2
	
	// Turno 3: 21:40 - 05:00 (>=1300 ou <300 minutos)
	return 3
}

// Obtém os períodos de acordo com o turno
function getPeriodosByTurno(turno) {
	if (turno === 1) return periodosTurno1
	if (turno === 2) return periodosTurno2
	return periodosTurno3
}

// Processa uma única linha do arquivo .txt
function processLine(line, date) {
	if (!line || typeof line !== 'string') return null
	
	const parts = line.split('|')
	if (parts.length < 4) return null
	
	// Extrai informações da linha
	const startDateTimeStr = parts[0].trim()
	const endDateTimeStr = parts[1].trim()
	const estado = parts[3].trim().toUpperCase()
	
	// Só processa linhas com estado CUT ou PAUSAR
	if (!['CUT', 'PAUSAR'].includes(estado)) return null
	
	// Parse das datas
	const startDateTime = startDateTimeStr.split(' ')
	const endDateTime = endDateTimeStr.split(' ')
	
	if (startDateTime.length < 2 || endDateTime.length < 2) return null
	
	const startDate = startDateTime[0]
	const startTime = startDateTime[1]
	const endDate = endDateTime[0]
	const endTime = endDateTime[1]
	
	// Retorna informações da linha
	return {
		startDate,
		startTime,
		endDate,
		endTime,
		estado,
		startTimestamp: new Date(startDateTimeStr.replace(' ', 'T')).getTime(),
		endTimestamp: new Date(endDateTimeStr.replace(' ', 'T')).getTime()
	}
}

// Calcula ocupação de uma máquina para um dia e turno específicos
function calculateOccupationForDay(lines, targetDate, turno) {
	const periodos = getPeriodosByTurno(turno)
	const occupationByPeriod = {}
	const intervalsByPeriod = {}
	
	// Inicializa estruturas
	periodos.forEach(periodo => {
		const key = `${periodo.inicio}-${periodo.fim}`
		occupationByPeriod[key] = 0
		intervalsByPeriod[key] = []
	})
	
	// Determina o intervalo de datas válido para o turno
	let validDates = [targetDate]
	
	// Se for turno 3, considera também o dia seguinte (até 05:00)
	if (turno === 3) {
		const nextDay = new Date(targetDate + 'T00:00:00')
		nextDay.setDate(nextDay.getDate() + 1)
		const nextDayStr = nextDay.toISOString().split('T')[0]
		validDates.push(nextDayStr)
	}
	
	// Processa cada linha
	lines.forEach(lineData => {
		if (!lineData) return
		
		// Verifica se a linha é do dia/turno correto
		let isValidDate = false
		
		if (turno === 3) {
			// Turno 3: aceita targetDate (>=21:40) ou dia seguinte (<05:00)
			const minFromMidnight = toMinutesFromMidnight(lineData.startTime)
			if (lineData.startDate === targetDate && minFromMidnight >= 1300) {
				isValidDate = true
			} else if (lineData.startDate === validDates[1] && minFromMidnight < 300) {
				isValidDate = true
			}
		} else {
			// Turnos 1 e 2: só aceita a data exata
			if (lineData.startDate === targetDate) {
				isValidDate = true
			}
		}
		
		if (!isValidDate) return
		
		// Calcula intervalos de ocupação para cada período
		const startMinutes = toMinutesFromMidnight(lineData.startTime)
		const endMinutes = toMinutesFromMidnight(lineData.endTime)
		
		// Ajusta endMinutes se cruzar meia-noite
		let adjustedEndMinutes = endMinutes
		if (turno === 3 && lineData.endDate !== lineData.startDate) {
			adjustedEndMinutes = endMinutes + 1440 // Adiciona 24 horas
		}
		
		periodos.forEach(periodo => {
			const key = `${periodo.inicio}-${periodo.fim}`
			const periodoStart = toMinutesFromMidnight(periodo.inicio)
			let periodoEnd = toMinutesFromMidnight(periodo.fim)
			
			// Ajusta períodos que cruzam meia-noite
			if (periodoEnd < periodoStart) {
				periodoEnd += 1440
			}
			
			// Calcula interseção entre linha e período
			const overlapStart = Math.max(startMinutes, periodoStart)
			const overlapEnd = Math.min(adjustedEndMinutes, periodoEnd)
			
			if (overlapStart < overlapEnd) {
				intervalsByPeriod[key].push({
					start: overlapStart,
					end: overlapEnd
				})
			}
		})
	})
	
	// Calcula ocupação final para cada período
	const minutosPorPeriodo = periodos.map((periodo, idx) => {
		const key = `${periodo.inicio}-${periodo.fim}`
		const merged = mergeIntervals(intervalsByPeriod[key])
		return sumIntervals(merged)
	})
	
	// Redistribui excesso
	const ajustados = redistribuirExcesso(periodos, minutosPorPeriodo)
	
	// Calcula porcentagens
	periodos.forEach((periodo, idx) => {
		const key = `${periodo.inicio}-${periodo.fim}`
		const porcentagem = periodo.baseCalculo > 0 
			? (ajustados[idx] / periodo.baseCalculo) * 100 
			: 0
		occupationByPeriod[key] = Math.round(porcentagem * 10) / 10
	})
	
	return occupationByPeriod
}

// Lê todos os arquivos .txt de um diretório (pasta de uma máquina)
function readTxtFilesFromDir(dirPath) {
	try {
		if (!fs.existsSync(dirPath)) {
			console.log(`[readTxtHistory] Diretório não existe: ${dirPath}`)
			return []
		}
		
		const files = fs.readdirSync(dirPath)
		const txtFiles = files.filter(f => f.endsWith('.txt'))
		
		console.log(`[readTxtHistory] Encontrados ${txtFiles.length} arquivos .txt em ${dirPath}`)
		
		let allLines = []
		let validLinesCount = 0
		
		txtFiles.forEach(filename => {
			const filePath = path.join(dirPath, filename)
			try {
				const content = fs.readFileSync(filePath, 'utf-8').trim()
				if (content) {
					const lines = content.split('\n')
					console.log(`[readTxtHistory] Arquivo ${filename}: ${lines.length} linhas`)
					
					lines.forEach(line => {
						const processed = processLine(line, null) // Pass null for date, not used in parsing
						if (processed) {
							allLines.push(processed)
							validLinesCount++
						}
					})
				}
			} catch (err) {
				console.error(`[readTxtHistory] Erro ao ler ${filePath}:`, err.message)
			}
		})
		
		console.log(`[readTxtHistory] Total de ${validLinesCount} linhas válidas processadas`)
		
		return allLines
	} catch (err) {
		console.error(`[readTxtHistory] Erro ao ler diretório ${dirPath}:`, err.message)
		return []
	}
}

// Extrai todas as datas únicas dos dados processados
function extractUniqueDates(linesData) {
	const dates = new Set()
	linesData.forEach(line => {
		if (line.startDate) dates.add(line.startDate)
		if (line.endDate && line.endDate !== line.startDate) dates.add(line.endDate)
	})
	return Array.from(dates).sort()
}

/**
 * Função principal: Lê dados históricos de uma pasta
 * @param {string} folderPath - Caminho da pasta raiz contendo subpastas de máquinas
 * @returns {Array} Array de registros no formato { date, turno, maquina, periodo, porcentagem }
 */
export function readHistoricalTxtData(folderPath) {
	console.log(`[readTxtHistory] Iniciando leitura de: ${folderPath}`)
	
	const records = []
	let processedMachines = 0
	let totalFiles = 0
	
	try {
		if (!fs.existsSync(folderPath)) {
			console.error(`[readTxtHistory] Pasta não encontrada: ${folderPath}`)
			return records
		}
		
		// Lista todas as subpastas (cada uma representa uma máquina)
		const entries = fs.readdirSync(folderPath, { withFileTypes: true })
		const machineFolders = entries.filter(e => e.isDirectory())
		
		console.log(`[readTxtHistory] Encontradas ${machineFolders.length} pastas de máquinas`)
		
		machineFolders.forEach(folder => {
			const machineId = folder.name
			const machinePath = path.join(folderPath, machineId)
			
			console.log(`[readTxtHistory] Processando máquina: ${machineId}`)
			console.log(`[readTxtHistory] Caminho: ${machinePath}`)
			
			// Lê todos os dados dos arquivos .txt da máquina
			const linesData = readTxtFilesFromDir(machinePath)
			
			console.log(`[readTxtHistory] ${machineId}: ${linesData.length} linhas processadas`)
			
			if (!linesData.length) {
				console.log(`[readTxtHistory] Nenhum dado válido encontrado para ${machineId}`)
				return
			}
			
			totalFiles += linesData.length
			processedMachines++
			
			// Extrai todas as datas únicas
			const uniqueDates = extractUniqueDates(linesData)
			console.log(`[readTxtHistory] ${machineId}: ${uniqueDates.length} datas únicas encontradas`)
			
			if (uniqueDates.length > 0) {
				console.log(`[readTxtHistory] ${machineId}: Primeira data = ${uniqueDates[0]}, Última data = ${uniqueDates[uniqueDates.length - 1]}`)
			}
			
			// Para cada data, calcula ocupação para os 3 turnos
			uniqueDates.forEach(date => {
				[1, 2, 3].forEach(turno => {
					const occupation = calculateOccupationForDay(linesData, date, turno)
					
					// Adiciona um registro para cada período
					Object.entries(occupation).forEach(([periodo, porcentagem]) => {
						records.push({
							date,
							turno,
							maquina: machineId,
							periodo,
							porcentagem
						})
					})
				})
			})
			
			console.log(`[readTxtHistory] ${machineId}: Gerados ${records.length} registros até agora`)
		})
		
		console.log(`[readTxtHistory] Processamento concluído:`)
		console.log(`  - Máquinas: ${processedMachines}`)
		console.log(`  - Linhas processadas: ${totalFiles}`)
		console.log(`  - Registros gerados: ${records.length}`)
		
		return records
		
	} catch (err) {
		console.error(`[readTxtHistory] Erro geral:`, err)
		return records
	}
}

export default readHistoricalTxtData
