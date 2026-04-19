// src/renderer/src/lib/motivosParadasCalculator.ts

export interface Top3MotivosData {
	labels: string[]
	data: number[]
	colors: string[]
}

// Cores para os top 3 motivos
const motivoColors = [
	"#d32f2f", // vermelho - mais crítico
	"#ff9800", // laranja - moderado
	"#fbc02d", // amarelo - menos crítico
]

export function calculateTop3Motivos(
	motivosData: Record<string, Record<string, string[]>>,
	percentualOcupacaoGeral?: number,
): Top3MotivosData | null {
	console.log("[DEBUG] calculateTop3Motivos - Dados recebidos:", motivosData)
	console.log(
		"[DEBUG] calculateTop3Motivos - Percentual ocupação geral:",
		percentualOcupacaoGeral,
	)

	// Contador geral de todos os motivos de todas as máquinas
	const motivoCount: Record<string, number> = {}
	let totalMotivos = 0

	// Contar todos os motivos de todas as máquinas
	Object.entries(motivosData).forEach(([machine, machineMotivos]) => {
		let machineTotal = 0
		Object.entries(machineMotivos).forEach(([categoria, motivosList]) => {
			console.log(
				`[DEBUG] Máquina ${machine}, Categoria ${categoria}:`,
				motivosList,
			)
			motivosList.forEach((motivo) => {
				motivoCount[motivo] = (motivoCount[motivo] || 0) + 1
				totalMotivos++
				machineTotal++
			})
		})
		if (machineTotal > 0) {
			console.log(
				`[DEBUG] Máquina ${machine} - Total de motivos: ${machineTotal}`,
			)
		}
	})

	console.log(`[DEBUG] Contagem de motivos:`, motivoCount)
	console.log(`[DEBUG] Total de motivos encontrados: ${totalMotivos}`)

	// Se não há motivos ou dados insuficientes, retornar null para usar fallback padrão
	if (totalMotivos === 0 || Object.keys(motivosData).length === 0) {
		console.log(
			"[DEBUG] Nenhum motivo encontrado, retornando null para fallback",
		)
		return null
	}

	// Calcular percentual de parada baseado na ocupação geral
	const percentualParada =
		percentualOcupacaoGeral !== undefined ? 100 - percentualOcupacaoGeral : 100
	console.log(`[DEBUG] Percentual de parada total: ${percentualParada}%`)

	// Ordenar motivos por frequência e pegar top 3
	const sortedMotivos = Object.entries(motivoCount)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3)

	console.log(`[DEBUG] Top 3 motivos ordenados:`, sortedMotivos)

	const labels: string[] = []
	const data: number[] = []
	const colors: string[] = []

	// Use float calculations first to avoid losing precision by rounding too early
	const rawValues: number[] = []

	sortedMotivos.forEach(([motivo, count], index) => {
		let rawPercentage: number
		if (percentualOcupacaoGeral !== undefined) {
			// proportional to total stoppage (parada)
			rawPercentage = (count / totalMotivos) * percentualParada
		} else {
			// fallback: percentage of all motives
			rawPercentage = (count / totalMotivos) * 100
		}
		rawValues.push(rawPercentage)
		labels.push(motivo)
		colors.push(motivoColors[index])
		console.log(
			`[DEBUG] ${index + 1}º lugar: ${motivo} - ${count} ocorrências (raw ${rawPercentage}%)`,
		)
	})

	// Sum raw top3 and compute raw 'Outros' as remainder of parada
	const rawTop3Sum = rawValues.reduce((s, v) => s + v, 0)
	const rawOutros = Math.max(0, percentualParada - rawTop3Sum)

	// Build final rounded data array (round at the end)
	rawValues.forEach((v) => data.push(Math.round(v)))
	if (rawOutros > 0.0001) {
		data.push(Math.round(rawOutros))
		labels.push("Outros")
		colors.push("#bdbdbd")
		console.log(
			`[DEBUG] Outros motivos (raw): ${rawOutros}% -> rounded ${Math.round(rawOutros)}%`,
		)
	}

	// Adicionar "Ocupação" sempre no final com cor verde
	if (percentualOcupacaoGeral !== undefined) {
		labels.push("Ocupação")
		data.push(percentualOcupacaoGeral)
		colors.push("#198754") // verde para ocupação
		console.log(`[DEBUG] Ocupação: ${percentualOcupacaoGeral}%`)
	}

	// VALIDAÇÃO: garantir que a soma seja exatamente 100% (corrige erros de arredondamento)
	let somaTotal = data.reduce((sum, val) => sum + val, 0)
	if (somaTotal !== 100) {
		const diferenca = 100 - somaTotal
		// Preferir ajustar a 'Ocupação' se presente, senão ajustar o maior valor
		let alvoIndex = labels.indexOf("Ocupação")
		if (alvoIndex === -1) {
			alvoIndex = data.indexOf(Math.max(...data))
			if (alvoIndex === -1) alvoIndex = 0
		}
		data[alvoIndex] = (data[alvoIndex] || 0) + diferenca
		somaTotal = data.reduce((sum, val) => sum + val, 0)
		console.log(
			`[DEBUG] Ajuste final aplicado (dif ${diferenca}): soma agora ${somaTotal}%`,
		)
	}

	// Preencher até 5 elementos se necessário (para manter compatibilidade com o gráfico)
	while (labels.length < 5) {
		labels.push("")
		data.push(0)
		colors.push("#f5f5f5") // cor neutra
	}

	const result = {
		labels,
		data,
		colors,
	}

	console.log(`[DEBUG] Resultado final do top 3:`, result)
	return result
}

// Função para buscar dados dos motivos (será chamada do main process)
export async function fetchMotivosData(
	dateStr?: string,
	turno?: number,
): Promise<Record<string, Record<string, string[]>>> {
	try {
		// Chama o main process para obter os dados
		const result = await window.electron.ipcRenderer.invoke(
			"get-motivos-paradas",
			{ dateStr, turno },
		)
		return result || {}
	} catch (error) {
		console.error("Erro ao buscar dados de motivos:", error)
		return {}
	}
}

// Função específica para ModeloA (Lectra)
export async function fetchMotivosDataModeloA(
	dateStr?: string,
	turno?: number,
): Promise<Record<string, Record<string, string[]>>> {
	try {
		// Chama o main process para obter os dados do ModeloA
		const result = await window.electron.ipcRenderer.invoke(
			"get-motivos-paradas-modelo-a",
			{ dateStr, turno },
		)
		return result || {}
	} catch (error) {
		console.error("Erro ao buscar dados de motivos ModeloA:", error)
		return {}
	}
}

// Função específica para ModeloB (Emma)
export async function fetchMotivosDataModeloB(
	dateStr?: string,
	turno?: number,
): Promise<Record<string, Record<string, string[]>>> {
	try {
		// Chama o main process para obter os dados do ModeloB
		const result = await window.electron.ipcRenderer.invoke(
			"get-motivos-paradas-modelo-b",
			{ dateStr, turno },
		)
		return result || {}
	} catch (error) {
		console.error("Erro ao buscar dados de motivos ModeloB:", error)
		return {}
	}
}

// Função específica para ModeloC (Comelz)
export async function fetchMotivosDataModeloC(
	dateStr: string,
	turno: number,
): Promise<Record<string, Record<string, string[]>>> {
	try {
		// Chama o main process para obter os dados do ModeloC
		const result = await window.electron.ipcRenderer.invoke(
			"get-motivos-paradas-modelo-c",
			{ dateStr, turno },
		)
		return result || {}
	} catch (error) {
		console.error("Erro ao buscar dados de motivos ModeloC:", error)
		return {}
	}
}

// Função específica para ModeloD (Comelz Montagem)
export async function fetchMotivosDataModeloD(
	dateStr: string,
	turno: number,
): Promise<Record<string, Record<string, string[]>>> {
	try {
		const result = await window.electron.ipcRenderer.invoke(
			"get-motivos-paradas-modelo-d",
			{ dateStr, turno },
		)
		return result || {}
	} catch (error) {
		console.error("Erro ao buscar dados de motivos ModeloD:", error)
		return {}
	}
}

// Função específica para ModeloE (Comelz Solas)
export async function fetchMotivosDataModeloE(
	dateStr: string,
	turno: number,
): Promise<Record<string, Record<string, string[]>>> {
	try {
		const result = await window.electron.ipcRenderer.invoke(
			"get-motivos-paradas-modelo-e",
			{ dateStr, turno },
		)
		return result || {}
	} catch (error) {
		console.error("Erro ao buscar dados de motivos ModeloE:", error)
		return {}
	}
}
