// src/main/service/getCategoriaOcupacaoData.js
import fs from "fs"
import path from "path"

const baseDir =
	"\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work"

const machineMap = {
	1: "02-2010",
	2: "02-2416",
	3: "02-1765",
	4: "02-1702",
	5: "02-2388",
	6: "02-1804",
	7: "02-1867",
	8: "02-1548",
	9: "02-1767",
	10: "02-1868",
	11: "02-2830",
	12: "02-2831",
	13: "02-2832",
}

function getLocalDateString() {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, "0")
	const day = String(now.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function getAllTxtFiles(dir) {
	console.log(`[DEBUG] Verificando diretório: ${dir}`)

	try {
		if (!fs.existsSync(dir)) {
			console.log(`[DEBUG] ❌ Diretório NÃO existe: ${dir}`)
			return []
		}

		console.log(`[DEBUG] ✅ Diretório existe: ${dir}`)
		const arquivos = fs.readdirSync(dir)
		console.log(
			`[DEBUG] Total de arquivos/pastas encontrados: ${arquivos.length}`,
		)

		if (arquivos.length === 0) {
			console.log(`[DEBUG] ⚠️  Diretório vazio`)
			return []
		}

		// Mostra todos os arquivos/pastas
		arquivos.forEach((arquivo, index) => {
			const fullPath = path.join(dir, arquivo)
			const stats = fs.statSync(fullPath)
			const tipo = stats.isDirectory() ? "PASTA" : "ARQUIVO"
			const extensao = path.extname(arquivo)
			console.log(
				`[DEBUG] ${index + 1}. ${tipo}: ${arquivo} ${extensao ? `(${extensao})` : ""}`,
			)
		})

		const txtFiles = arquivos
			.filter((name) => {
				const isTxt = name.endsWith(".txt")
				if (isTxt) {
					console.log(`[DEBUG] ✅ Arquivo .txt encontrado: ${name}`)
				}
				return isTxt
			})
			.map((name) => path.join(dir, name))

		console.log(`[DEBUG] Total de arquivos .txt: ${txtFiles.length}`)
		return txtFiles
	} catch (error) {
		console.error(`[DEBUG] ❌ ERRO ao acessar diretório ${dir}:`, error.message)
		return []
	}
}

function parseDuracao(duracaoStr) {
	// Formato esperado: "00:00:09" (hh:mm:ss)
	const [h, m, s] = duracaoStr.split(":").map(Number)
	return h * 3600 + m * 60 + s
}

// Função para retornar apenas motivos de paradas por categoria (exclui ocupação normal)
// Lista de motivos válidos de parada
const motivosValidos = [
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

export function getMotivosParadasPorCategoria(dateStr, turno = null) {
	console.log(
		`[DEBUG] getMotivosParadasPorCategoria - dateStr: ${dateStr}, turno: ${turno}`,
	)

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

	console.log(`[DEBUG] Diretório base configurado: ${baseDir}`)
	console.log(`[DEBUG] Processando ${Object.keys(machineMap).length} máquinas`)

	Object.values(machineMap).forEach((machine) => {
		console.log(`[DEBUG] ========================================`)
		console.log(`[DEBUG] Processando máquina: ${machine}`)
		const dir = path.join(baseDir, machine)
		console.log(`[DEBUG] Caminho completo: ${dir}`)
		const txtFiles = getAllTxtFiles(dir)
		if (!txtFiles.length) {
			console.log(`[DEBUG] ${machine} - Nenhum arquivo .txt encontrado`)
			result[machine] = {}
			return
		}

		let allLines = []
		const dataAlvo = todayStr // Data que estamos buscando (para referência)
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
			const [inicio, fim, duracaoStr, categoria, motivo] = parts

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

			if (!motivosValidos.includes(motivoLimpo)) {
				console.log(
					`[DEBUG] ${machine} - Motivo "${motivoLimpo}" não está na lista de motivos válidos`,
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
	console.log(`[DEBUG] RESUMO FINAL:`)
	Object.entries(result).forEach(([machine, motivos]) => {
		const totalMotivos = Object.values(motivos).flat().length
		console.log(`[DEBUG] ${machine}: ${totalMotivos} motivos encontrados`)
	})
	console.log(`[DEBUG] Resultado final:`, result)
	return result
}
