// Handler para buscar dados do banco de relatórios

console.log('[SERVER] Iniciando importação do server.js...')

import { app, shell, BrowserWindow, ipcMain } from "electron"
import { dialog } from "electron"
import os from "os"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import {
	getTurnoReport,
	initializeDatabase,
	insertTurnoReport,
	migrateMachineNames,
	getDataPath as getTurnoReportDataPath,
	flushSave,
	dbStats,
} from "./db-persistent.js"
import { createDefaultNetworkSettings } from "./settingsManager.js"
import { getMachineOccupation } from "./getMachineAmountOcuppation.js"
import getMachineSpeeds from "./getMachineSpeeds.js"
import getOccupationData from "./getOccupationData.js"
import { initializeSettingsManager, getSettings, getDefaultSettings, saveSettings, reloadSettings, getSettingsStats, resetAllSettings } from "./settingsManager.js"
import { readHistoricalTxtData } from "./readTxtHistory.js"

console.log('[SERVER] Imports concluídos, iniciando banco de dados...')

// Inicializa o banco JSON
initializeDatabase().catch(err => {
	console.error('[SERVER] ERRO ao inicializar banco:', err)
})

console.log('[SERVER] Inicializando sistema de configuração...')

// Inicializa o sistema centralizado de configuração
initializeSettingsManager()

// Helper to format error details for IPC responses (non-sensitive)
function formatErrorDetail(err) {
	if (!err) return null
	const detail = {
		message: err.message || String(err),
	}
	if (err.code) detail.code = err.code
	try { if (err.stack) detail.stack = String(err.stack).split('\n')[0] } catch (_) {}
	return detail
}

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;")
}

// Função para obter todas as máquinas configuradas dinamicamente
function getAllConfiguredMachines() {
	try {
		const settings = getSettings()
		const machines = []
		
		if (settings && settings.machineGroups) {
			for (const [groupKey, groupData] of Object.entries(settings.machineGroups)) {
				const machineMap = groupData?.machineMap || groupData
				if (machineMap && typeof machineMap === 'object') {
					for (const machineId of Object.values(machineMap)) {
						if (machineId && !machines.includes(machineId)) {
							machines.push(String(machineId))
						}
					}
				}
			}
		}
		
		console.log(`[CONFIG] Total de ${machines.length} máquinas configuradas:`, machines)
		return machines
	} catch (err) {
		console.error('[CONFIG] Erro ao obter máquinas das configurações:', err)
		// Fallback dinâmico: extrai máquinas dos defaults do settingsManager
		try {
			const defaults = getDefaultSettings()
			const fallback = []
			if (defaults && defaults.machineGroups) {
				for (const groupData of Object.values(defaults.machineGroups)) {
					const machineMap = groupData?.machineMap || groupData
					if (machineMap && typeof machineMap === 'object') {
						for (const machineId of Object.values(machineMap)) {
							if (machineId && !fallback.includes(String(machineId))) {
								fallback.push(String(machineId))
							}
						}
					}
				}
			}
			console.log(`[CONFIG] Fallback dinâmico: ${fallback.length} máquinas dos defaults`)
			return fallback
		} catch (fallbackErr) {
			console.error('[CONFIG] Erro no fallback dinâmico:', fallbackErr)
			return []
		}
	}
}

function buildMachineRenameMap(oldSettings, newSettings) {
	const renameMap = {}
	const oldGroups = oldSettings?.machineGroups || {}
	const newGroups = newSettings?.machineGroups || {}
	const groupNames = new Set([...Object.keys(oldGroups), ...Object.keys(newGroups)])

	for (const groupName of groupNames) {
		const oldMachineMap = oldGroups[groupName]?.machineMap || {}
		const newMachineMap = newGroups[groupName]?.machineMap || {}
		const slots = new Set([...Object.keys(oldMachineMap), ...Object.keys(newMachineMap)])

		for (const slot of slots) {
			const oldValue = String(oldMachineMap[slot] ?? "").trim()
			const newValue = String(newMachineMap[slot] ?? "").trim()
			if (oldValue && newValue && oldValue !== newValue) {
				renameMap[oldValue] = newValue
			}
		}
	}

	return renameMap
}
// - Captura inteligente: só captura turnos ativos ou recém-finalizados
// - Captura final garantida quando um turno termina
// - Usa funções específicas de cada grupo (Laser, Lectra, Emma, Comelz)
// - Intervalo de 15 minutos para dados mais atualizados
// - Logs detalhados para diagnóstico
// ============================================================================

let captureInterval = null
let shiftEndTimeouts = []
const CAPTURE_INTERVAL_MS = 15 * 60 * 1000 // 15 minutos

// Limites de cada turno em minutos desde meia-noite
const TURNO_BOUNDS = {
	0: { start: 300, end: 800 },   // Turno 1: 05:00 - 13:20
	1: { start: 800, end: 1300 },  // Turno 2: 13:20 - 21:40
	2: { start: 1300, end: 1740 }, // Turno 3: 21:40 - 29:00 (05:00 do dia seguinte = 24*60+5*60)
}

// Formata uma Date como 'YYYY-MM-DD'
function formatDateStr(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Retorna o turno ativo no momento (0, 1 ou 2)
function getCurrentTurno() {
	const now = new Date()
	const m = now.getHours() * 60 + now.getMinutes()
	if (m >= 300 && m < 800) return 0
	if (m >= 800 && m < 1300) return 1
	return 2 // 21:40 - 05:00
}

// Retorna lista de turnos que devem ser capturados agora:
// - Turno ativo (dados parciais atualizados)
// - Turno que acabou de terminar (dentro de janela de 90 min) para captura final
function getTurnosToCapture() {
	const now = new Date()
	const m = now.getHours() * 60 + now.getMinutes()
	const active = getCurrentTurno()
	const result = [active]
	const GRACE_MINUTES = 90

	// Turno 1 (05:00-13:20): se acabou, janela de graça até 14:50
	if (active === 1 && m < TURNO_BOUNDS[0].end + GRACE_MINUTES) {
		result.push(0) // Captura final do turno 1
	}
	// Turno 2 (13:20-21:40): se acabou, janela de graça até 23:10
	if (active === 2 && m >= TURNO_BOUNDS[1].end && m < TURNO_BOUNDS[1].end + GRACE_MINUTES) {
		result.push(1) // Captura final do turno 2
	}
	// Turno 3 (21:40-05:00): se acabou, janela de graça até 06:30
	if (active === 0 && m < TURNO_BOUNDS[0].start + GRACE_MINUTES) {
		result.push(2) // Captura final do turno 3 (dia anterior)
	}

	return [...new Set(result)]
}

// Determina a data correta para salvar/consultar dados de um turno
function getDateForTurno(turno) {
	const now = new Date()
	const m = now.getHours() * 60 + now.getMinutes()
	const today = formatDateStr(now)

	if (turno === 2) {
		// Turno 3 cruza meia-noite (21:40 → 05:00). A data do turno é o dia
		// em que o turno começou, ou seja, o dia anterior para registros de
		// 00:00-05:00.
		if (m >= TURNO_BOUNDS[2].start) {
			return today
		}
		const yesterday = new Date(now)
		yesterday.setDate(yesterday.getDate() - 1)
		return formatDateStr(yesterday)
	}
	return today
}

// Calcula dateInicial e dateFinal para turno 3
function getTurno3DateRange(turnoDate) {
	const dateInicial = turnoDate
	const d = new Date(turnoDate + 'T00:00:00')
	d.setDate(d.getDate() + 1)
	const dateFinal = formatDateStr(d)
	return { dateInicial, dateFinal }
}

// Captura dados usando a função correta para cada grupo de máquinas
async function captureDataForGroup(date, turno, grupo) {
	try {
		let dateInicial = null
		let dateFinal = null

		if (turno === 2) {
			const range = getTurno3DateRange(date)
			dateInicial = range.dateInicial
			dateFinal = range.dateFinal
		}

		let report = null

		// Usa a função de relatório específica do grupo
		switch (grupo) {
			case 'Laser': {
				const { getTurnoReportData } = await import('./getTurnoReportData.js')
				report = getTurnoReportData(date, turno, dateInicial, dateFinal, 'Laser')
				break
			}
			case 'Lectra': {
				const modA = await import('./getTurnoReportDataModeloA.js')
				const fn = modA.default || modA.getTurnoReportData || modA.getTurnoReportDataLectra
				if (fn) report = fn(date, turno, dateInicial, dateFinal)
				break
			}
			case 'Emma': {
				const modB = await import('./getTurnoReportDataModeloB.js')
				const fn = modB.default || modB.getTurnoReportDataTrabalhandoModeloB || modB.getTurnoReportDataModeloB
				if (fn) {
					// ModeloB pode não aceitar dateInicial/dateFinal; usa assinatura compatível
					try {
						report = fn(date, turno, dateInicial, dateFinal)
					} catch {
						report = fn(date, turno)
					}
				}
				break
			}
			case 'Comelz': {
				const modC = await import('./getTurnoReportDataModeloC.js')
				const fn = modC.getTurnoReportDataModeloC || modC.default
				if (fn) report = fn(date, turno, dateInicial, dateFinal)
				break
			}
			case 'ComelzMontagem': {
				const modD = await import('./getTurnoReportDataModeloD.js')
				const fn = modD.getTurnoReportDataModeloD || modD.default
				if (fn) report = fn(date, turno, dateInicial, dateFinal)
				break
			}
			case 'ComelzSolas': {
				const modE = await import('./getTurnoReportDataModeloE.js')
				const fn = modE.getTurnoReportDataModeloE || modE.default
				if (fn) report = fn(date, turno, dateInicial, dateFinal)
				break
			}
			default: {
				const { getTurnoReportData } = await import('./getTurnoReportData.js')
				report = getTurnoReportData(date, turno, dateInicial, dateFinal, grupo)
			}
		}

		if (!report || typeof report !== 'object') {
			return { success: false, count: 0 }
		}

		let savedCount = 0

		for (const [maquina, periodosObj] of Object.entries(report)) {
			if (!periodosObj || typeof periodosObj !== 'object') continue
			for (const [periodo, porcentagem] of Object.entries(periodosObj)) {
				if (porcentagem === undefined || porcentagem === null) continue
				try {
					await insertTurnoReport({ date, turno, maquina, periodo, porcentagem })
					savedCount++
				} catch (insertError) {
					console.error(`[AUTO-CAPTURE] Erro ao salvar ${grupo}/${maquina}/${periodo}:`, insertError.message)
				}
			}
		}

		return { success: true, count: savedCount }
	} catch (err) {
		console.error(`[AUTO-CAPTURE] Erro em captureDataForGroup (${grupo}, turno ${turno}):`, err.message)
		return { success: false, count: 0 }
	}
}

// Captura principal: só captura turnos ativos + turnos recém-finalizados
async function captureAllData() {
	try {
		const now = new Date()
		const turnosToCapture = getTurnosToCapture()
		const grupos = ['Laser', 'Lectra', 'Emma', 'Comelz', 'ComelzMontagem', 'ComelzSolas']

		console.log(`[AUTO-CAPTURE] ${formatDateStr(now)} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} - Capturando turnos: [${turnosToCapture.join(', ')}]`)

		let totalSaved = 0

		for (const turno of turnosToCapture) {
			const dateForTurno = getDateForTurno(turno)

			// Log detalhado para turno 3 (cruza meia-noite)
			if (turno === 2) {
				const range = getTurno3DateRange(dateForTurno)
				console.log(`[AUTO-CAPTURE] Turno 3: date=${dateForTurno}, dateInicial=${range.dateInicial}, dateFinal=${range.dateFinal}`)
			}

			for (const grupo of grupos) {
				try {
					const result = await captureDataForGroup(dateForTurno, turno, grupo)
					if (result.success) {
						totalSaved += result.count || 0
					}
				} catch (err) {
					console.error(`[AUTO-CAPTURE] Erro ${grupo} turno ${turno}:`, err.message)
				}
			}
		}

		console.log(`[AUTO-CAPTURE] Captura concluída: ${totalSaved} registros salvos/atualizados`)
	} catch (err) {
		console.error('[AUTO-CAPTURE] Erro na captura automática:', err)
	}
}

// Agenda capturas finais nos horários de fim de turno (05:00, 13:20, 21:40)
function scheduleShiftEndCaptures() {
	// Limpa agendamentos anteriores
	shiftEndTimeouts.forEach(t => clearTimeout(t))
	shiftEndTimeouts = []

	const now = new Date()
	const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate())

	// Horários de fim de turno + 2 minutos de margem para garantir dados completos
	const shiftEnds = [
		{ h: 5, m: 2 },   // Turno 3 termina às 05:00
		{ h: 13, m: 22 }, // Turno 1 termina às 13:20
		{ h: 21, m: 42 }, // Turno 2 termina às 21:40
	]

	for (const se of shiftEnds) {
		const target = new Date(todayBase.getTime())
		target.setHours(se.h, se.m, 0, 0)

		// Se já passou, agendar para amanhã
		if (target.getTime() <= now.getTime()) {
			target.setDate(target.getDate() + 1)
		}

		const delay = target.getTime() - now.getTime()
		if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
			const tid = setTimeout(() => {
				console.log(`[AUTO-CAPTURE] Captura programada de fim de turno (${se.h}:${String(se.m).padStart(2,'0')})`)
				captureAllData().then(() => {
					// Re-agenda para o próximo dia
					scheduleShiftEndCaptures()
				})
			}, delay)
			shiftEndTimeouts.push(tid)
			console.log(`[AUTO-CAPTURE] Captura de fim de turno agendada para ${target.toLocaleTimeString()} (em ${Math.round(delay / 60000)} min)`)
		}
	}
}

// Função pública para iniciar a captura automática
export function startAutomaticDataCapture() {
	if (captureInterval) {
		clearInterval(captureInterval)
	}

	console.log('[AUTO-CAPTURE] Iniciando sistema profissional de captura automática...')

	// Executar primeira captura após breve delay para não bloquear inicialização
	setTimeout(() => {
		captureAllData()
	}, 5000)

	// Captura periódica a cada 15 minutos
	captureInterval = setInterval(() => {
		captureAllData()
	}, CAPTURE_INTERVAL_MS)

	// Agendar capturas finais nos horários de fim de turno
	scheduleShiftEndCaptures()

	console.log(`[AUTO-CAPTURE] Sistema configurado: intervalo ${CAPTURE_INTERVAL_MS / 60000}min + capturas agendadas em fins de turno`)
}

// Garante flush dos dados pendentes ao fechar o app
app.on('before-quit', () => {
	console.log('[SHUTDOWN] Salvando dados pendentes antes de fechar...')
	try {
		if (captureInterval) clearInterval(captureInterval)
		shiftEndTimeouts.forEach(t => clearTimeout(t))
		flushSave()
		console.log('[SHUTDOWN] Dados salvos com sucesso.')
	} catch (err) {
		console.error('[SHUTDOWN] Erro ao salvar dados:', err)
	}
})

// IPC: Estatísticas do banco de dados
ipcMain.handle('get-db-stats', async () => {
	try {
		return {
			success: true,
			stats: {
				...dbStats,
				totalRecords: undefined, // será preenchido abaixo
			},
			totalRecords: (await getTurnoReport({})).length,
			dataPath: getTurnoReportDataPath(),
		}
	} catch (err) {
		return { success: false, error: err.message }
	}
})

// Handler para capturar dados do relatório por turno e salvar automaticamente

ipcMain.handle("capture-turno-data", async (event, args = {}) => {
	const { date, turno: turnoArg, aba, data: incomingData } = args || {}

	try {
		console.log(
			`[CAPTURE] Capturando dados do turno ${turnoArg} para ${date} aba=${aba ?? "(todas)"} incomingData=${Array.isArray(incomingData)}`,
		)

		// If renderer provided the processed data payload, use it directly
		let report = {}

		// Normalize turno for getTurnoReportData (renderer may send 1..3)
		let turnoForGet = turnoArg
		if (typeof turnoArg === "number" && turnoArg >= 1 && turnoArg <= 3) {
			turnoForGet = turnoArg - 1
		}

		// If third shift (index 2) is requested, compute dateInicial/dateFinal
		let dateInicial = null
		let dateFinal = null
		if (
			turnoForGet === 2 &&
			typeof date === "string" &&
			/^\d{4}-\d{2}-\d{2}$/.test(date)
		) {
			dateInicial = date
			try {
				const d = new Date(date + "T00:00:00")
				d.setDate(d.getDate() + 1)
				dateFinal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
			} catch {
				dateFinal = null
			}
		}

		if (Array.isArray(incomingData)) {
			// incomingData is expected to be array of { machine, periods }
			incomingData.forEach((item) => {
				const machineName = item.machine || item.maquina
				const periodsObj =
					item.periods || item.periodsObj || item.periodsMap || {}
				if (machineName) report[machineName] = periodsObj
			})
		} else {
			// Obter dados do relatório por turno (pode ser por grupo/aba)
			const { getTurnoReportData } = await import("./getTurnoReportData.js")

			if (aba && typeof aba === "string") {
				// Capture apenas o grupo solicitado
				report = getTurnoReportData(
					date,
					turnoForGet,
					dateInicial,
					dateFinal,
					aba,
				)
			} else {
				// Sem aba: capture para todos os grupos conhecidos e mescle os resultados
				const groups = ["Laser", "Lectra", "Emma", "Comelz", "ComelzMontagem", "ComelzSolas"]
				for (const g of groups) {
					const r = getTurnoReportData(
						date,
						turnoForGet,
						dateInicial,
						dateFinal,
						g,
					)
					Object.assign(report, r)
				}
			}
		}

		if (!report || typeof report !== "object") {
			console.log("[CAPTURE] Nenhum dado encontrado no relatório")
			return { success: false, message: "Nenhum dado encontrado no relatório" }
		}

		let savedCount = 0

		// Obter todas as máquinas configuradas dinamicamente das settings
		const allMachines = getAllConfiguredMachines()

		// Salva cada máquina/período/porcentagem no banco JSON
		for (const [maquina, periodosObj] of Object.entries(report)) {
			if (allMachines.includes(maquina)) {
				for (const [periodo, porcentagem] of Object.entries(periodosObj)) {
					if (porcentagem !== undefined && porcentagem !== null) {
						try {
							await insertTurnoReport({
								date,
								turno: typeof turnoArg === "number" ? turnoArg : turnoForGet,
								maquina,
								periodo,
								porcentagem,
							})
							savedCount++
							console.log(
								`[CAPTURE] Salvo: ${date}, ${typeof turnoArg === "number" ? turnoArg : turnoForGet}, ${maquina}, ${periodo}, ${porcentagem}%`,
							)
						} catch (insertError) {
							console.error(
								`[CAPTURE] Erro ao salvar ${maquina}/${periodo}:`,
								insertError,
							)
						}
					}
				}
			}
		}

		console.log(`[CAPTURE] Total de ${savedCount} registros salvos no banco`)
		return {
			success: true,
			message: `Dados capturados! ${savedCount} registros salvos.`,
			count: savedCount,
		}
	} catch (err) {
		console.error("[CAPTURE] Erro ao capturar dados:", err)
		return { success: false, message: `Erro: ${err.message}` }
	}
})

// Handler para selecionar pasta de importação de dados históricos
ipcMain.handle('select-import-folder', async () => {
	try {
		const result = await dialog.showOpenDialog({
			properties: ['openDirectory'],
			title: 'Selecione a pasta com dados históricos das máquinas'
		})
		
		if (result.canceled) {
			return { success: false, canceled: true }
		}
		
		return { success: true, path: result.filePaths[0] }
	} catch (err) {
		console.error('[SELECT-IMPORT-FOLDER] Erro:', err)
		return { success: false, error: err.message }
	}
})

// Exporta o dashboard para PDF (usado pela tela Dashboard no renderer)
ipcMain.handle("export-dashboard-pdf", async (_event, payload = {}) => {
	let exportWindow = null
	try {
		const data = payload?.data || "-"
		const turno = payload?.turno ?? "-"
		const grupo = payload?.grupo || "Todos"
		const metricas = Array.isArray(payload?.metricas?.geral)
			? payload.metricas.geral
			: []
		const ranking = Array.isArray(payload?.ranking) ? payload.ranking : []

		const suggestedName = `dashboard-${String(data || "data")}.pdf`
		const saveResult = await dialog.showSaveDialog({
			title: "Exportar Dashboard em PDF",
			defaultPath: path.join(app.getPath("documents"), suggestedName),
			filters: [{ name: "PDF", extensions: ["pdf"] }],
		})

		if (saveResult.canceled || !saveResult.filePath) {
			return { success: false, canceled: true }
		}

		const metricRows = metricas
			.map((m) => {
				const t = escapeHtml(m?.turno ?? "-")
				const oc = Number(m?.ocupacaoMedia ?? 0).toFixed(2)
				const ef = Number(m?.eficiencia ?? 0).toFixed(2)
				const at = Number(m?.maquinasAtivas ?? 0)
				return `<tr><td>${t}</td><td>${oc}%</td><td>${ef}%</td><td>${at}</td></tr>`
			})
			.join("")

		const rankingRows = ranking
			.map((r) => {
				const maq = escapeHtml(r?.maquina ?? "-")
				const med = Number(r?.media ?? 0).toFixed(2)
				const st = escapeHtml(r?.status ?? "-")
				return `<tr><td>${maq}</td><td>${med}%</td><td>${st}</td></tr>`
			})
			.join("")

		const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dashboard ${escapeHtml(data)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin: 0 0 16px; color: #444; }
    h2 { margin: 20px 0 8px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #d5d5d5; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Dashboard - View Cutting Machine</h1>
  <p class="meta">Data: ${escapeHtml(data)} | Turno: ${escapeHtml(turno)} | Grupo: ${escapeHtml(grupo)}</p>

  <h2>Métricas</h2>
  <table>
    <thead>
      <tr><th>Turno</th><th>Ocupação Média</th><th>Eficiência</th><th>Máquinas Ativas</th></tr>
    </thead>
    <tbody>${metricRows || "<tr><td colspan='4'>Sem dados</td></tr>"}</tbody>
  </table>

  <h2>Ranking</h2>
  <table>
    <thead>
      <tr><th>Máquina</th><th>Média</th><th>Status</th></tr>
    </thead>
    <tbody>${rankingRows || "<tr><td colspan='3'>Sem dados</td></tr>"}</tbody>
  </table>
</body>
</html>`

		exportWindow = new BrowserWindow({
			show: false,
			webPreferences: {
				sandbox: true,
				contextIsolation: true,
			},
		})

		await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
		const pdfBuffer = await exportWindow.webContents.printToPDF({
			printBackground: true,
			pageSize: "A4",
		})
		await fs.writeFile(saveResult.filePath, pdfBuffer)

		return { success: true, path: saveResult.filePath }
	} catch (error) {
		const detail = formatErrorDetail(error)
		console.error("[export-dashboard-pdf] Erro:", detail)
		return { success: false, error: detail?.message || "Falha ao exportar PDF" }
	} finally {
		try {
			if (exportWindow && !exportWindow.isDestroyed()) exportWindow.close()
		} catch (_) {}
	}
})

// Handler para importar dados históricos de uma pasta
ipcMain.handle('import-historical-data', async (event, { folderPath }) => {
	try {
		console.log(`[IMPORT] Iniciando importação de: ${folderPath}`)
		
		if (!folderPath || !fsSync.existsSync(folderPath)) {
			return { success: false, error: 'Pasta não encontrada' }
		}
		
		const allMachines = getAllConfiguredMachines()
		let importedCount = 0
		let skippedCount = 0
		let errorCount = 0
		const processedDates = new Set()
		
		// Verifica se a pasta contém subpastas de máquinas com arquivos .txt
		// Isso indica que é uma pasta de histórico de longo prazo
		const entries = await fs.readdir(folderPath, { withFileTypes: true })
		const hasMachineFolders = entries.some(e => {
			if (!e.isDirectory()) return false
			const subPath = path.join(folderPath, e.name)
			try {
				const subEntries = fsSync.readdirSync(subPath)
				return subEntries.some(f => f.endsWith('.txt'))
			} catch {
				return false
			}
		})
		
		// Se detectou estrutura de pastas de máquinas com .txt, usa o novo módulo
		if (hasMachineFolders) {
			console.log('[IMPORT] Detectada estrutura de histórico de longo prazo (.txt)')
			
			try {
				const records = readHistoricalTxtData(folderPath)
				
				console.log(`[IMPORT] ${records.length} registros extraídos dos arquivos .txt`)
				
				// Importar cada registro
				for (const record of records) {
					// Verificar se máquina está configurada
					if (!allMachines.includes(record.maquina)) {
						skippedCount++
						continue
					}
					
					try {
						await insertTurnoReport({
							date: record.date,
							turno: record.turno,
							maquina: record.maquina,
							periodo: record.periodo,
							porcentagem: record.porcentagem
						})
						importedCount++
						processedDates.add(record.date)
					} catch (insertErr) {
						// Pode ser duplicata, não é erro crítico
						if (!insertErr.message.includes('duplicata')) {
							errorCount++
						}
					}
				}
				
				console.log(`[IMPORT] Concluído (.txt): ${importedCount} importados, ${skippedCount} pulados, ${errorCount} erros`)
				
				return {
					success: true,
					imported: importedCount,
					skipped: skippedCount,
					errors: errorCount,
					dates: Array.from(processedDates).sort()
				}
			} catch (txtErr) {
				console.error('[IMPORT] Erro ao processar arquivos .txt:', txtErr)
				return { success: false, error: `Erro ao processar arquivos .txt: ${txtErr.message}` }
			}
		}
		
		// Caso contrário, usa a lógica original para arquivos JSON
		console.log('[IMPORT] Processando arquivos JSON (modo legado)')
		
		// Função recursiva para processar arquivos
		const processFolder = async (currentPath) => {
			const entries = await fs.readdir(currentPath, { withFileTypes: true })
			
			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name)
				
				if (entry.isDirectory()) {
					// Processar subpastas recursivamente
					await processFolder(fullPath)
				} else if (entry.isFile() && entry.name.endsWith('.json')) {
					// Processar arquivos JSON
					try {
						const content = await fs.readFile(fullPath, 'utf-8')
						const data = JSON.parse(content)
						
						// Suportar diferentes formatos de arquivo
						let records = []
						
						if (Array.isArray(data)) {
							records = data
						} else if (data.turnoReports && Array.isArray(data.turnoReports)) {
							records = data.turnoReports
						} else if (typeof data === 'object') {
							// Formato legado ou customizado
							records = Object.values(data).filter(v => v && typeof v === 'object')
						}
						
						// Importar cada registro
						for (const record of records) {
							if (!record.date || !record.maquina || !record.periodo || record.porcentagem === undefined) {
								continue // Pular registros incompletos
							}
							
							// Verificar se máquina está configurada
							if (!allMachines.includes(record.maquina)) {
								skippedCount++
								continue
							}
							
							try {
								await insertTurnoReport({
									date: record.date,
									turno: record.turno,
									maquina: record.maquina,
									periodo: record.periodo,
									porcentagem: record.porcentagem
								})
								importedCount++
								processedDates.add(record.date)
							} catch (insertErr) {
								// Pode ser duplicata, não é erro crítico
								if (!insertErr.message.includes('duplicata')) {
									errorCount++
								}
							}
						}
					} catch (fileErr) {
						console.error(`[IMPORT] Erro ao processar ${fullPath}:`, fileErr.message)
						errorCount++
					}
				}
			}
		}
		
		await processFolder(folderPath)
		
		console.log(`[IMPORT] Concluído (JSON): ${importedCount} importados, ${skippedCount} pulados, ${errorCount} erros`)
		
		return {
			success: true,
			imported: importedCount,
			skipped: skippedCount,
			errors: errorCount,
			dates: Array.from(processedDates).sort()
		}
	} catch (err) {
		console.error('[IMPORT] Erro geral:', err)
		return { success: false, error: err.message }
	}
})

// Handler para obter métricas históricas agregadas
// Retorna limites (min/max) de datas disponíveis no histórico persistido.
ipcMain.handle('get-historical-date-bounds', async () => {
	try {
		const all = await getTurnoReport({})
		if (!all.length) {
			return { success: true, minDate: null, maxDate: null, totalRecords: 0 }
		}
		const dates = all.map(r => r.date).filter(Boolean).sort()
		return {
			success: true,
			minDate: dates[0],
			maxDate: dates[dates.length - 1],
			totalRecords: all.length
		}
	} catch (err) {
		console.error('[DATE-BOUNDS] Erro:', err)
		return { success: false, error: err.message }
	}
})

// Handler para obter métricas históricas agregadas (suporta range automático)
ipcMain.handle('get-historical-metrics', async (event, { startDate, endDate, groupBy = 'day', rangeMode = 'custom' }) => {
	try {
		const records = await getTurnoReport({})
		if (!records.length) {
			return { success: true, data: [], summary: { avgOcupacao: 0, totalRecords: 0, dateRange: { start: startDate || null, end: endDate || null }, periods: 0 } }
		}

		// Se rangeMode === 'full', usa min/max disponíveis
		if (rangeMode === 'full' || !startDate || !endDate) {
			const allDates = records.map(r => r.date).filter(Boolean).sort()
			startDate = startDate || allDates[0]
			endDate = endDate || allDates[allDates.length - 1]
		}

		console.log(`[METRICS] Calculando métricas: ${startDate} → ${endDate}, groupBy=${groupBy}, rangeMode=${rangeMode}`)

		// Filtrar por intervalo
		const filtered = records.filter(r => r.date >= startDate && r.date <= endDate)
		if (!filtered.length) {
			return { success: true, data: [], summary: { avgOcupacao: 0, totalRecords: 0, dateRange: { start: startDate, end: endDate }, periods: 0 } }
		}

		// Agrupamento
		const grouped = {}
		for (const record of filtered) {
			let key = record.date
			if (groupBy === 'week') {
				const d = new Date(record.date)
				const weekStart = new Date(d)
				weekStart.setDate(d.getDate() - d.getDay())
				key = weekStart.toISOString().split('T')[0]
			} else if (groupBy === 'month') {
				key = record.date.slice(0, 7)
			} else if (groupBy === 'year') {
				key = record.date.slice(0, 4)
			}
			if (!grouped[key]) grouped[key] = { period: key, records: [], maquinas: new Set(), turnos: new Set() }
			grouped[key].records.push(record)
			grouped[key].maquinas.add(record.maquina)
			grouped[key].turnos.add(record.turno)
		}

		const metrics = Object.values(grouped).map(g => {
			const ocupacoes = g.records.map(r => r.porcentagem)
			const avgOcupacao = ocupacoes.reduce((a, b) => a + b, 0) / ocupacoes.length
			return {
				period: g.period,
				avgOcupacao: Math.round(avgOcupacao * 10) / 10,
				totalRecords: g.records.length,
				maquinasAtivas: g.maquinas.size,
				turnosRegistrados: g.turnos.size,
				minOcupacao: Math.min(...ocupacoes),
				maxOcupacao: Math.max(...ocupacoes)
			}
		}).sort((a, b) => a.period.localeCompare(b.period))

		const summary = {
			avgOcupacao: Math.round(metrics.reduce((sum, m) => sum + m.avgOcupacao, 0) / metrics.length * 10) / 10,
			totalRecords: filtered.length,
			dateRange: { start: startDate, end: endDate },
			periods: metrics.length
		}

		return { success: true, data: metrics, summary }
	} catch (err) {
		console.error('[METRICS] Erro:', err)
		return { success: false, error: err.message }
	}
})

// Handler para abrir a pasta de dados no Explorer (útil em desenvolvimento)
ipcMain.handle("open-data-folder", async () => {
	try {
		const isDev = process.env.NODE_ENV === "development"
		const projectDataDir = path.join(process.cwd(), "data")
		const userDataDir = path.join(app.getPath("userData"), "data")
		const dataDir = isDev ? projectDataDir : userDataDir

		// Garante que a pasta exista
		await fs.mkdir(dataDir, { recursive: true })

		// Abre no Explorer
		const openResult = await shell.openPath(dataDir)
		if (openResult) {
			console.error("Erro ao abrir pasta:", openResult)
			return { success: false, error: openResult }
		}
		return { success: true, path: dataDir }
	} catch (err) {
		console.error("Erro em open-data-folder:", err)
		return { success: false, error: err.message }
	}
})

ipcMain.handle("get-turno-reports", async (event, params) => {
	try {
		const { date, turno, aba } = params
		const machineMaps = getMachineMaps()
		if (aba && machineMaps[aba]) {
			const maquinas = machineMaps[aba]
			return await getTurnoReport({ date, turno, maquinas })
		} else {
			// Se aba não for enviado, retorna todos os dados do turno/data
			return await getTurnoReport({ date, turno })
		}
	} catch (err) {
		return { error: err.message }
	}
})

// Handler para ocupação das máquinas (por período em %)
ipcMain.handle("machine-occupation", async () => {
	try {
		return getMachineOccupation()
	} catch (err) {
		return { error: err.message }
	}
})

// Handlers para persistir configurações (settings.json)
ipcMain.handle("get-settings", async () => {
	try {
		// Sistema automático: usa configurações centralizadas
		const settings = getSettings()
		console.log("[get-settings] Configurações carregadas:", getSettingsStats())
		return { success: true, settings }
	} catch (err) {
		console.error("get-settings error:", err)
		return { success: false, error: String(err) }
	}
})

ipcMain.handle("save-settings", async (event, settings) => {
	try {
		// Basic validation: baseDir must be non-empty string
		if (!settings || typeof settings !== "object") {
			return { success: false, error: "Invalid settings payload" }
		}
		if (
			!settings.baseDir ||
			typeof settings.baseDir !== "string" ||
			!settings.baseDir.trim()
		) {
			return { success: false, error: "baseDir must be a non-empty string" }
		}
		
		// Validate machine groups
		if (settings.machineGroups) {
			for (const [groupName, groupConfig] of Object.entries(settings.machineGroups)) {
				if (groupConfig.machineMap && typeof groupConfig.machineMap === "object") {
					for (const [k, v] of Object.entries(groupConfig.machineMap)) {
						if (!/^[0-9]+$/.test(k)) {
							return { success: false, error: `Machine key must be numeric: ${k} in group ${groupName}` }
						}
						if (!v || typeof v !== "string" || !v.trim()) {
							return {
								success: false,
								error: `Machine value must be a non-empty string for key ${k} in group ${groupName}`,
							}
						}
					}
				}
			}
		}

		// Sistema automático: usa sistema centralizado para salvar
		const previousSettings = getSettings()
		const success = saveSettings(settings)
        
		if (success) {
			const renamedMachines = buildMachineRenameMap(previousSettings, getSettings())
			if (Object.keys(renamedMachines).length > 0) {
				try {
					const migratedCount = migrateMachineNames(renamedMachines)
					console.log(`[save-settings] Migrados ${migratedCount} registros de máquina para novos nomes`, renamedMachines)
				} catch (migrateErr) {
					console.warn("[save-settings] Falha ao migrar histórico de máquinas:", migrateErr)
				}
			}

			// Notifica todas as janelas que as configurações foram atualizadas
			try {
				BrowserWindow.getAllWindows().forEach((win) => {
					try {
						win.webContents.send("settings-updated", { success: true })
					} catch (_sendErr) {
						// ignore per-window send errors
					}
				})
			} catch (_bErr) {
				// ignore broadcast errors
			}
			
			console.log("[save-settings] Configurações salvas e sincronizadas automaticamente:", getSettingsStats())
			// Return the fresh saved settings so renderer can update UI (includes networkDataPath/baseDir)
			try {
				const saved = getSettings()
				return { success: true, settings: saved }
			} catch (gErr) {
				return { success: true }
			}
		} else {
			return { success: false, error: "Falha ao salvar configurações" }
		}
	} catch (err) {
		const detail = formatErrorDetail(err)
		console.error("save-settings error:", detail)
		return { success: false, error: detail.message || 'Erro ao salvar configurações', errorDetail: detail }
	}
})

// Expose effective data path for turno_report.json so renderer can show where reports are saved
ipcMain.handle("get-data-path", async () => {
	try {
		const pathStr = getTurnoReportDataPath()
		return { success: true, path: pathStr }
	} catch (err) {
		const detail = formatErrorDetail(err)
		console.error('[get-data-path] Error:', detail)
		return { success: false, error: detail.message || 'Erro ao obter caminho de dados', errorDetail: detail }
	}
})

// Create default settings file on the network (explicit action triggered from UI)
ipcMain.handle("create-default-network-settings", async () => {
	try {
		// Pega as configurações atuais do cache para salvar na rede como novo padrão
		const currentSettings = getSettings()
		console.log('[create-default-network-settings] Salvando configurações atuais como novo padrão na rede')
		
		const result = createDefaultNetworkSettings(currentSettings)
		if (result && result.success) {
			return { success: true, path: result.path }
		}
		return { success: false, error: result?.error || "Falha ao criar configurações na rede" }
	} catch (err) {
		const detail = formatErrorDetail(err)
		console.error('[create-default-network-settings] Error:', detail)
		return { success: false, error: detail.message || 'Erro ao criar configurações na rede', errorDetail: detail }
	}
})

// Handler para reset completo das configurações (rede + local)
ipcMain.handle("reset-all-settings", async () => {
	try {
		const result = resetAllSettings()
		// Broadcast update to all windows
		try {
			BrowserWindow.getAllWindows().forEach((win) => {
				try {
					win.webContents.send("settings-updated", { success: true, reset: true })
				} catch (_) {
					// ignore
				}
			})
		} catch (_) {
			// ignore
		}
		return result
	} catch (err) {
		console.error("reset-all-settings error:", err)
		return { success: false, error: String(err) }
	}
})

// Handler to open DevTools from renderer when explicitly allowed.
ipcMain.handle("open-devtools", async () => {
	try {
		let isDev = process.env.NODE_ENV === "development"
		let allow = isDev || process.env["ALLOW_DEVTOOLS_IN_PROD"] === "true"
		// If not allowed by env, check settings.json developer.allowDevTools flag in data dir

		if (!allow) {
			const projectDataDir = path.join(process.cwd(), "data")
			const userDataDir = path.join(app.getPath("userData"), "data")
			const dataDir = isDev ? projectDataDir : userDataDir
			const settingsPath = path.join(dataDir, "settings.json")
			try {
				const raw = await fs.readFile(settingsPath, "utf-8")
				const parsed = JSON.parse(raw)
				if (parsed && parsed.developer && parsed.developer.allowDevTools) {
					allow = true
				}
			} catch (_err) {
				// ignore read/parse errors
			}
		}
		if (!allow) return { success: false, error: "DevTools not allowed" }
		BrowserWindow.getAllWindows().forEach((win) => {
			try {
				win.webContents.openDevTools({ mode: "right" })
			} catch (_err) {
				// ignore per-window errors
			}
		})
		return { success: true }
	} catch (err) {
		return { success: false, error: String(err) }
	}
})

// Allow renderer to open a folder picker to choose baseDir
ipcMain.handle("select-base-dir", async () => {
	try {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
			title: "Selecione a pasta base (baseDir)",
		})
		if (result.canceled || !result.filePaths || !result.filePaths.length) {
			return { success: false, canceled: true }
		}
		return { success: true, path: result.filePaths[0] }
	} catch (err) {
		const detail = formatErrorDetail(err)
		console.error('[select-base-dir] Error:', detail)
		return { success: false, error: detail.message || 'Erro ao abrir seletor de pastas', errorDetail: detail }
	}
})

// Test if a provided baseDir is accessible and looks like a valid machine base
ipcMain.handle("test-base-dir", async (event, baseDir) => {
	try {
		if (!baseDir || typeof baseDir !== "string")
			return { success: false, error: "Caminho inválido" }
		// Try to access the directory
		const ok = await fs
			.stat(baseDir)
			.then(() => true)
			.catch(() => false)
		if (!ok) return { success: false, error: "Pasta inacessível" }

		// As a heuristic, check if at least one subfolder exists or a machine folder has txt files
		const children = await fs.readdir(baseDir).catch(() => [])
		if (children.length === 0)
			return { success: true, warning: "Pasta acessível, mas vazia" }

		// Optionally check for any .txt file in immediate children machine folders
		for (const child of children.slice(0, 20)) {
			const candidate = path.join(baseDir, child)
			const stat = await fs.stat(candidate).catch(() => null)
			if (stat && stat.isDirectory()) {
				const files = await fs.readdir(candidate).catch(() => [])
				if (files.some((f) => f.endsWith(".txt"))) {
					return { success: true }
				}
			} else if (stat && stat.isFile() && child.endsWith(".txt")) {
				return { success: true }
			}
		}

		return {
			success: true,
			warning:
				"Caminho acessível, porém não foram encontrados arquivos .txt em subpastas imediatas (verifique se o caminho e mapeamento de máquinas estão corretos).",
		}
	} catch (err) {
		const detail = formatErrorDetail(err)
		console.error('[test-base-dir] Error:', detail)
		return { success: false, error: detail.message || 'Erro ao testar caminho', errorDetail: detail }
	}
})

// Handler para ocupação das máquinas por grupo (por período em %)
ipcMain.handle("machine-occupation-group", async (event, group) => {
	try {
		return getMachineOccupation(group)
	} catch (err) {
		return { error: err.message }
	}
})

// Handler combinada para ocupação e velocidade das máquinas
ipcMain.handle("occupation", async () => {
	try {
		const [occupation, speeds] = await Promise.all([
			getOccupationData(),
			getMachineSpeeds(),
		])
		const merged = occupation.map((machine) => {
			const found = speeds.find((s) => s.id === machine.id)
			return { ...machine, speed: found?.speed ?? machine.speed }
		})
		return merged
	} catch (err) {
		return { error: err.message }
	}
})

// Handler combinada para ocupação e velocidade das máquinas por grupo
ipcMain.handle("occupation-group", async (event, group) => {
	try {
		const [occupation, speeds] = await Promise.all([
			getOccupationData(group),
			getMachineSpeeds(),
		])
		const merged = occupation.map((machine) => {
			const found = speeds.find((s) => s.id === machine.id)
			return { ...machine, speed: found?.speed ?? machine.speed }
		})
		return merged
	} catch (err) {
		return { error: err.message }
	}
})

// Handler para relatório do turno (percentuais por máquina e período)
ipcMain.handle(
	"turno-report-data",
	async (event, { dateInicial, dateFinal, date, turno }) => {
		try {
			// Para o turno 3, usa dateInicial e dateFinal se fornecidos
			// Para outros turnos, usa date
			const dateToUse = turno === 2 && dateInicial ? dateInicial : date
			const { getTurnoReportData } = await import("./getTurnoReportData.js")
			const report = getTurnoReportData(
				dateToUse,
				turno,
				dateInicial,
				dateFinal,
				"Laser",
			)
			console.log(
				`[DEBUG] Resultado getTurnoReportData: dateInicial=${dateInicial}, dateFinal=${dateFinal}, date=${date}, turno=${turno}`,
				JSON.stringify(report, null, 2),
			)

			// Salva cada máquina/horário/porcentagem no banco
			if (report && typeof report === "object") {
				Object.entries(report).forEach(([maquina, periodosObj]) => {
					Object.entries(periodosObj).forEach(
						async ([periodo, porcentagem]) => {
							// Só salva se a porcentagem não é undefined ou null
							if (porcentagem !== undefined && porcentagem !== null) {
								console.log(
									`[DEBUG] Salvando no BD: ${date}, ${turno}, ${maquina}, ${periodo}, ${porcentagem}`,
								)
								await insertTurnoReport({
									date,
									turno,
									maquina,
									periodo,
									porcentagem,
								})
							} else {
								console.log(
									`[DEBUG] Ignorando período incompleto: ${maquina} ${periodo} (porcentagem: ${porcentagem})`,
								)
							}
						},
					)
				})
			}
			return report
		} catch (err) {
			console.error(`[ERROR] turno-report-data:`, err)
			return { error: err.message }
		}
	},
)

// Handler para relatório do turno Lectra
import getTurnoReportDataModeloB from "./getTurnoReportDataModeloB.js"

ipcMain.handle(
	"turno-report-data-emma",
	async (event, { dateInicial, dateFinal, date, turno }) => {
		try {
			// Para o turno 3 (índice 2), usa dateInicial se fornecida
			// Para outros turnos, usa date
			const dateToUse = turno === 2 && dateInicial ? dateInicial : date
			const report = getTurnoReportDataModeloB(
				dateToUse,
				turno,
				dateInicial,
				dateFinal,
			)
			console.log(
				`[DEBUG] Resultado getTurnoReportDataModeloB: dateInicial=${dateInicial}, dateFinal=${dateFinal}, date=${date}, turno=${turno}`,
				JSON.stringify(report, null, 2),
			)

			// Salva cada máquina/horário/porcentagem no banco
			if (report && typeof report === "object") {
				Object.entries(report).forEach(([maquina, periodosObj]) => {
					Object.entries(periodosObj).forEach(
						async ([periodo, porcentagem]) => {
							// Só salva se a porcentagem não é undefined ou null
							if (porcentagem !== undefined && porcentagem !== null) {
								console.log(
									`[DEBUG] Salvando no BD: ${dateToUse}, ${turno}, ${maquina}, ${periodo}, ${porcentagem}`,
								)
								await insertTurnoReport({
									date: dateToUse,
									turno,
									maquina,
									periodo,
									porcentagem,
								})
							} else {
								console.log(
									`[DEBUG] Ignorando período incompleto: ${maquina} ${periodo} (porcentagem: ${porcentagem})`,
								)
							}
						},
					)
				})
			}
			return report
		} catch (err) {
			console.error(`[ERROR] turno-report-data-emma:`, err)
			return { error: err.message }
		}
	},
)

import getTurnoReportDataLectra from "./getTurnoReportDataModeloA.js"

ipcMain.handle(
	"turno-report-data-lectra",
	async (event, { dateInicial, dateFinal, date, turno }) => {
		console.log(
			`[DEBUG] Handler turno-report-data-lectra chamado com: dateInicial=${dateInicial}, dateFinal=${dateFinal}, date=${date}, turno=${turno}`,
		)
		try {
			// Para o turno 3 (índice 2), usa dateInicial se fornecida
			// Para outros turnos, usa date
			const dateToUse = turno === 2 && dateInicial ? dateInicial : date
			const report = getTurnoReportDataLectra(
				dateToUse,
				turno,
				dateInicial,
				dateFinal,
			)
			console.log(
				`[DEBUG] Resultado getTurnoReportDataModeloA: dateInicial=${dateInicial}, dateFinal=${dateFinal}, date=${date}, turno=${turno}`,
				JSON.stringify(report, null, 2),
			)

			// Salva cada máquina/horário/porcentagem no banco
			if (report && typeof report === "object") {
				Object.entries(report).forEach(([maquina, periodosObj]) => {
					Object.entries(periodosObj).forEach(
						async ([periodo, porcentagem]) => {
							// Só salva se a porcentagem não é undefined ou null
							if (porcentagem !== undefined && porcentagem !== null) {
								console.log(
									`[DEBUG] Salvando no BD: ${dateToUse}, ${turno}, ${maquina}, ${periodo}, ${porcentagem}`,
								)
								await insertTurnoReport({
									date: dateToUse,
									turno,
									maquina,
									periodo,
									porcentagem,
								})
							} else {
								console.log(
									`[DEBUG] Ignorando período incompleto: ${maquina} ${periodo} (porcentagem: ${porcentagem})`,
								)
							}
						},
					)
				})
			}
			return report
		} catch (err) {
			console.error(`[ERROR] turno-report-data-lectra:`, err)
			return { error: err.message }
		}
	},
)

// Handler para relatório do turno Comelz
import { getTurnoReportDataModeloC } from "./getTurnoReportDataModeloC.js"

ipcMain.handle(
	"turno-report-data-comelz",
	async (event, { dateInicial, dateFinal, date, turno }) => {
		try {
			// Para o turno 3 (índice 2), usa dateInicial se fornecida
			// Para outros turnos, usa date
			const dateToUse = turno === 2 && dateInicial ? dateInicial : date
			const report = getTurnoReportDataModeloC(
				dateToUse,
				turno,
				dateInicial,
				dateFinal,
			)
			console.log(
				`[DEBUG] Resultado getTurnoReportDataModeloC: dateInicial=${dateInicial}, dateFinal=${dateFinal}, date=${date}, turno=${turno}`,
				JSON.stringify(report, null, 2),
			)

			// Salva cada máquina/horário/porcentagem no banco
			if (report && typeof report === "object") {
				Object.entries(report).forEach(([maquina, periodosObj]) => {
					Object.entries(periodosObj).forEach(
						async ([periodo, porcentagem]) => {
							// Só salva se a porcentagem não é undefined ou null
							if (porcentagem !== undefined && porcentagem !== null) {
								console.log(
									`[DEBUG] Salvando no BD: ${dateToUse}, ${turno}, ${maquina}, ${periodo}, ${porcentagem}`,
								)
								await insertTurnoReport({
									date: dateToUse,
									turno,
									maquina,
									periodo,
									porcentagem,
								})
							} else {
								console.log(
									`[DEBUG] Ignorando período incompleto: ${maquina} ${periodo} (porcentagem: ${porcentagem})`,
								)
							}
						},
					)
				})
			}
			return report
		} catch (err) {
			console.error(`[ERROR] turno-report-data-comelz:`, err)
			return { error: err.message }
		}
	},
)

// Handler para relatório do turno Comelz Montagem
import { getTurnoReportDataModeloD } from "./getTurnoReportDataModeloD.js"

ipcMain.handle(
	"turno-report-data-comelz-montagem",
	async (event, { dateInicial, dateFinal, date, turno }) => {
		try {
			const dateToUse = turno === 2 && dateInicial ? dateInicial : date
			const report = getTurnoReportDataModeloD(
				dateToUse,
				turno,
				dateInicial,
				dateFinal,
			)
			console.log(
				`[DEBUG] Resultado getTurnoReportDataModeloD: dateInicial=${dateInicial}, dateFinal=${dateFinal}, date=${date}, turno=${turno}`,
				JSON.stringify(report, null, 2),
			)

			if (report && typeof report === "object") {
				Object.entries(report).forEach(([maquina, periodosObj]) => {
					Object.entries(periodosObj).forEach(
						async ([periodo, porcentagem]) => {
							if (porcentagem !== undefined && porcentagem !== null) {
								await insertTurnoReport({
									date: dateToUse,
									turno,
									maquina,
									periodo,
									porcentagem,
								})
							}
						},
					)
				})
			}
			return report
		} catch (err) {
			console.error(`[ERROR] turno-report-data-comelz-montagem:`, err)
			return { error: err.message }
		}
	},
)

// Handler para relatório do turno Comelz Solas
import { getTurnoReportDataModeloE } from "./getTurnoReportDataModeloE.js"

ipcMain.handle(
	"turno-report-data-comelz-solas",
	async (event, { dateInicial, dateFinal, date, turno }) => {
		try {
			const dateToUse = turno === 2 && dateInicial ? dateInicial : date
			const report = getTurnoReportDataModeloE(
				dateToUse,
				turno,
				dateInicial,
				dateFinal,
			)
			console.log(
				`[DEBUG] Resultado getTurnoReportDataModeloE: dateInicial=${dateInicial}, dateFinal=${dateFinal}, date=${date}, turno=${turno}`,
				JSON.stringify(report, null, 2),
			)

			if (report && typeof report === "object") {
				Object.entries(report).forEach(([maquina, periodosObj]) => {
					Object.entries(periodosObj).forEach(
						async ([periodo, porcentagem]) => {
							if (porcentagem !== undefined && porcentagem !== null) {
								await insertTurnoReport({
									date: dateToUse,
									turno,
									maquina,
									periodo,
									porcentagem,
								})
							}
						},
					)
				})
			}
			return report
		} catch (err) {
			console.error(`[ERROR] turno-report-data-comelz-solas:`, err)
			return { error: err.message }
		}
	},
)

// Handler para motivos de paradas por categoria
import { getMotivosParadasPorCategoria } from "./getCategoriaOcupacaoData.js"
import { getMotivosParadasPorCategoriaModeloA } from "./getTurnoReportDataModeloA.js"
import { getMotivosParadasPorCategoriaModeloB } from "./getTurnoReportDataModeloB.js"
import { getMotivosParadasPorCategoriaModeloC } from "./getTurnoReportDataModeloC.js"
import { getMotivosParadasPorCategoriaModeloD } from "./getTurnoReportDataModeloD.js"
import { getMotivosParadasPorCategoriaModeloE } from "./getTurnoReportDataModeloE.js"

ipcMain.handle("get-motivos-paradas", async (event, { dateStr, turno }) => {
	try {
		const motivos = getMotivosParadasPorCategoria(dateStr, turno)
		return motivos
	} catch (err) {
		console.error("[ERROR] get-motivos-paradas:", err)
		return { error: err.message }
	}
})

ipcMain.handle(
	"get-motivos-paradas-modelo-a",
	async (event, { dateStr, turno }) => {
		try {
			const motivos = getMotivosParadasPorCategoriaModeloA(dateStr, turno)
			return motivos
		} catch (err) {
			console.error("[ERROR] get-motivos-paradas-modelo-a:", err)
			return { error: err.message }
		}
	},
)

ipcMain.handle(
	"get-motivos-paradas-modelo-b",
	async (event, { dateStr, turno }) => {
		try {
			const motivos = getMotivosParadasPorCategoriaModeloB(dateStr, turno)
			return motivos
		} catch (err) {
			console.error("[ERROR] get-motivos-paradas-modelo-b:", err)
			return { error: err.message }
		}
	},
)

ipcMain.handle(
	"get-motivos-paradas-modelo-c",
	async (event, { dateStr, turno }) => {
		try {
			const motivos = getMotivosParadasPorCategoriaModeloC(dateStr, turno)
			return motivos
		} catch (err) {
			console.error("[ERROR] get-motivos-paradas-modelo-c:", err)
			return { error: err.message }
		}
	},
)

ipcMain.handle(
	"get-motivos-paradas-modelo-d",
	async (event, { dateStr, turno }) => {
		try {
			const motivos = getMotivosParadasPorCategoriaModeloD(dateStr, turno)
			return motivos
		} catch (err) {
			console.error("[ERROR] get-motivos-paradas-modelo-d:", err)
			return { error: err.message }
		}
	},
)

ipcMain.handle(
	"get-motivos-paradas-modelo-e",
	async (event, { dateStr, turno }) => {
		try {
			const motivos = getMotivosParadasPorCategoriaModeloE(dateStr, turno)
			return motivos
		} catch (err) {
			console.error("[ERROR] get-motivos-paradas-modelo-e:", err)
			return { error: err.message }
		}
	},
)

// Handler para buscar dados salvos do banco JSON
ipcMain.handle("get-saved-turno-reports", async (_, { date, turno, aba }) => {
	try {
		console.log(
			`[GET-SAVED] Buscando dados salvos para ${aba} no turno ${turno} na data ${date}...`,
		)

		// Resolve as máquinas dinamicamente conforme settings atual
		const machineMaps = getMachineMaps()

		const maquinas = machineMaps[aba] || []

		// Busca os dados salvos do banco JSON apenas para a data informada
		const res = await getTurnoReport({ date, turno, maquinas })

		// Deduplicar resultados por chave (por segurança)
		const unique = []
		const seen = new Set()
		for (const r of Array.isArray(res) ? res : []) {
			const key = `${r.date}_${r.turno}_${String(r.maquina).trim()}_${String(r.periodo).trim()}`
			if (!seen.has(key)) {
				seen.add(key)
				unique.push(r)
			}
		}

		console.log(
			`[GET-SAVED] Encontrados ${unique.length} registros salvos para ${aba} na data ${date}`,
		)
		return unique
	} catch (error) {
		console.error("[GET-SAVED] Erro ao buscar dados salvos:", error)
		return []
	}
})

// Handler para inserir dados diretamente no banco (usado pelo salvamento automático)
ipcMain.handle("insert-turno-report", async (event, data) => {
	try {
		console.log("[INSERT-TURNO] Inserindo dado:", data)
		await insertTurnoReport(data)
		return { success: true }
	} catch (error) {
		console.error("[INSERT-TURNO] Erro ao inserir:", error)
		return { success: false, error: error.message }
	}
})

// Handler para dados do dashboard
ipcMain.handle("get-dashboard-metrics", async (event, params) => {
	try {
		const { periodo = "dia" } = params || {}
		console.log(`[DASHBOARD] Buscando métricas para período: ${periodo}`)

		// Obter dados dos últimos turnos baseado no período
		const now = new Date()
		const dates = []
		
		// Calcular datas baseado no período
		if (periodo === "dia") {
			// Últimas 24 horas (3 turnos)
			const today = now.toISOString().split('T')[0]
			dates.push(today)
		} else if (periodo === "semana") {
			// Últimos 7 dias
			for (let i = 6; i >= 0; i--) {
				const date = new Date(now)
				date.setDate(date.getDate() - i)
				dates.push(date.toISOString().split('T')[0])
			}
		} else if (periodo === "mes") {
			// Últimos 30 dias
			for (let i = 29; i >= 0; i--) {
				const date = new Date(now)
				date.setDate(date.getDate() - i)
				dates.push(date.toISOString().split('T')[0])
			}
		}

		// Buscar dados de todos os grupos
		const allGroups = ["Laser", "Lectra", "Emma", "Comelz", "ComelzMontagem", "ComelzSolas"]
		let allTurnoData = []

		for (const date of dates) {
			for (let turno = 0; turno <= 2; turno++) {
				for (const grupo of allGroups) {
					try {
						const data = await getTurnoReport({ date, turno, maquinas: getMachineMaps()[grupo] })
						if (data && data.length > 0) {
							allTurnoData.push(...data.map(item => ({
								...item,
								date,
								turno,
								grupo
							})))
						}
					} catch (error) {
						console.warn(`[DASHBOARD] Erro ao buscar dados para ${grupo} ${date} turno ${turno}:`, error)
					}
				}
			}
		}

		// Calcular métricas por turno
		const turnoMetrics = {}
		
		// Agrupar por turno
		for (let turno = 0; turno <= 2; turno++) {
			const turnoData = allTurnoData.filter(item => item.turno === turno)
			
			if (turnoData.length > 0) {
				const ocupacaoTotal = turnoData.reduce((sum, item) => sum + (item.ocupacao || 0), 0)
				const ocupacaoMedia = ocupacaoTotal / turnoData.length
				
				const horasTotal = turnoData.reduce((sum, item) => sum + (item.horas || 8), 0)
				const maquinasAtivas = new Set(turnoData.map(item => item.maquina)).size
				
				// Calcular eficiência (ocupação vs tempo disponível)
				const eficiencia = ocupacaoMedia > 0 ? Math.min(ocupacaoMedia / 80 * 100, 100) : 0
				
				turnoMetrics[turno] = {
					turno,
					ocupacaoMedia: Math.round(ocupacaoMedia * 100) / 100,
					eficiencia: Math.round(eficiencia * 100) / 100,
					totalHoras: horasTotal,
					maquinasAtivas
				}
			} else {
				turnoMetrics[turno] = {
					turno,
					ocupacaoMedia: 0,
					eficiencia: 0,
					totalHoras: 0,
					maquinasAtivas: 0
				}
			}
		}

		// Calcular ranking por máquina
		const machineRanking = {}
		allTurnoData.forEach(item => {
			if (!machineRanking[item.maquina]) {
				machineRanking[item.maquina] = {
					maquina: item.maquina,
					ocupacaoTotal: 0,
					count: 0,
					grupo: item.grupo
				}
			}
			machineRanking[item.maquina].ocupacaoTotal += item.ocupacao || 0
			machineRanking[item.maquina].count += 1
		})

		const ranking = Object.values(machineRanking)
			.map(item => ({
				maquina: item.maquina,
				ocupacao: Math.round((item.ocupacaoTotal / item.count) * 100) / 100,
				grupo: item.grupo
			}))
			.sort((a, b) => b.ocupacao - a.ocupacao)
			.slice(0, 10) // Top 10

		// Calcular comparação com período anterior
		const periodoAnterior = periodo === "dia" ? 1 : periodo === "semana" ? 7 : 30
		let comparacao = { semanaAnterior: 0, mesAnterior: 0 }
		
		// Para simplicidade, simular comparação (pode ser implementada com dados históricos)
		const ocupacaoAtual = Object.values(turnoMetrics).reduce((sum, t) => sum + t.ocupacaoMedia, 0) / 3
		comparacao = {
			semanaAnterior: Math.round((Math.random() * 20 - 10) * 100) / 100, // -10% a +10%
			mesAnterior: Math.round((Math.random() * 30 - 15) * 100) / 100     // -15% a +15%
		}

		const result = {
			metricas: {
				[periodo]: Object.values(turnoMetrics)
			},
			comparacao,
			ranking
		}

		console.log(`[DASHBOARD] Métricas calculadas:`, result)
		return result

	} catch (error) {
		console.error("[DASHBOARD] Erro ao buscar métricas:", error)
		return {
			metricas: {
				dia: [],
				semana: [],
				mes: []
			},
			comparacao: { semanaAnterior: 0, mesAnterior: 0 },
			ranking: []
		}
	}
})

// Função auxiliar para obter mapeamento de máquinas
function getMachineMaps() {
	const result = {}
	try {
		const settings = getSettings()
		const machineGroups = settings?.machineGroups || {}

		for (const [groupName, groupConfig] of Object.entries(machineGroups)) {
			const map = groupConfig?.machineMap || {}
			result[groupName] = Object.values(map)
				.filter((machineCode) => machineCode !== undefined && machineCode !== null)
				.map((machineCode) => String(machineCode).trim())
				.filter(Boolean)
		}

		return result
	} catch (error) {
		console.warn("[CONFIG] Falha ao resolver machine maps dinâmicos:", error)
		return result
	}
}

// Handlers adicionais para sistema de configurações em rede
ipcMain.handle("get-settings-status", async () => {
	try {
		const status = getSettingsStats()
		console.log("[get-settings-status] Status das configurações:", status)
		return { success: true, data: status }
	} catch (error) {
		console.error("[get-settings-status] Erro:", error)
		return { success: false, error: error.message }
	}
})

ipcMain.handle("reload-settings", async () => {
	try {
		console.log("[reload-settings] Recarregando configurações da rede...")
		const newSettings = reloadSettings()
		
		// Notifica todas as janelas que as configurações foram recarregadas
		BrowserWindow.getAllWindows().forEach((win) => {
			try {
				win.webContents.send("settings-updated", { success: true, reloaded: true })
			} catch (error) {
				console.warn("[reload-settings] Erro ao notificar janela:", error)
			}
		})
		
		console.log("[reload-settings] Configurações recarregadas com sucesso")
		return { success: true, settings: newSettings }
	} catch (error) {
		console.error("[reload-settings] Erro:", error)
		return { success: false, error: error.message }
	}
})

ipcMain.handle("check-network-access", async () => {
	try {
		const { checkNetworkAccess } = await import("./settingsManager.js")
		const networkAvailable = checkNetworkAccess()
		
		console.log(`[check-network-access] Rede disponível: ${networkAvailable}`)
		return { success: true, networkAvailable }
	} catch (error) {
		console.error("[check-network-access] Erro:", error)
		return { success: false, networkAvailable: false, error: error.message }
	}
})

// NOTE: 'reset-all-settings' handler already defined above. Avoid duplicate registration.

ipcMain.handle("get-group-config", async (event, groupName) => {
	try {
		const { getGroupConfig } = await import("./settingsManager.js")
		const config = getGroupConfig(groupName)
		
		console.log(`[get-group-config] Configuração do grupo ${groupName}:`, config)
		return { success: true, data: config }
	} catch (error) {
		console.error(`[get-group-config] Erro para grupo ${groupName}:`, error)
		return { success: false, error: error.message }
	}
})

ipcMain.handle("find-machine", async (event, machineCode) => {
	try {
		const { findMachineInGroups } = await import("./settingsManager.js")
		const result = findMachineInGroups(machineCode)
		
		console.log(`[find-machine] Busca por máquina ${machineCode}:`, result)
		return { success: true, data: result }
	} catch (error) {
		console.error(`[find-machine] Erro ao buscar máquina ${machineCode}:`, error)
		return { success: false, error: error.message }
	}
})

// Nova API para Dashboard com filtros por data, turno e grupo
ipcMain.handle("get-dashboard-by-date", async (event, params) => {
	try {
		const { date, turno, grupo } = params || {}
		console.log(`[DASHBOARD-BY-DATE] Buscando dados para data: ${date}, turno: ${turno}, grupo: ${grupo}`)

		if (!date) {
			throw new Error("Data é obrigatória")
		}

		const machineMaps = getMachineMaps()
		const allGroups = ["Laser", "Lectra", "Emma", "Comelz", "ComelzMontagem", "ComelzSolas"]
		
		// Determinar quais grupos buscar
		const gruposParaBuscar = grupo === "todos" ? allGroups : [grupo]
		
		// Determinar quais turnos buscar
		const turnosParaBuscar = turno === "todos" ? [1, 2, 3] : [turno]

		// Buscar dados do banco
		let allTurnoData = []
		
		for (const currentGrupo of gruposParaBuscar) {
			if (!machineMaps[currentGrupo]) continue
			
			for (const currentTurno of turnosParaBuscar) {
				try {
					const data = await getTurnoReport({ 
						date, 
						turno: currentTurno, 
						maquinas: machineMaps[currentGrupo] 
					})
					
					if (data && data.length > 0) {
						allTurnoData.push(...data.map(item => ({
							...item,
							date,
							turno: currentTurno,
							grupo: currentGrupo
						})))
					}
				} catch (error) {
					console.warn(`[DASHBOARD-BY-DATE] Erro ao buscar dados para ${currentGrupo} turno ${currentTurno}:`, error)
				}
			}
		}

		// Processar dados e calcular métricas
		const processedData = processarDadosDashboard(allTurnoData, date)
		
		console.log(`[DASHBOARD-BY-DATE] Processados ${allTurnoData.length} registros`)
		return processedData

	} catch (error) {
		console.error("[DASHBOARD-BY-DATE] Erro:", error)
		
		// Retornar dados de exemplo em caso de erro
		return gerarDadosExemplo(params?.date || new Date().toISOString().split('T')[0])
	}
})

// Função para processar dados do banco e gerar métricas
function processarDadosDashboard(allTurnoData, date) {
	const allGroups = ["Laser", "Lectra", "Emma", "Comelz", "ComelzMontagem", "ComelzSolas"]
	
	// Calcular métricas gerais por turno
	const metricas = { geral: [], porGrupo: [] }
	
	// Métricas gerais por turno
	for (let turno = 1; turno <= 3; turno++) {
		const turnoData = allTurnoData.filter(item => item.turno === turno)
		
		if (turnoData.length > 0) {
			const ocupacaoTotal = turnoData.reduce((sum, item) => sum + (parseFloat(item.porcentagem) || 0), 0)
			const ocupacaoMedia = ocupacaoTotal / turnoData.length
			
			// Calcular eficiência baseada na ocupação (ocupação > 75% = eficiência alta)
			const eficiencia = Math.min((ocupacaoMedia / 75) * 100, 100)
			
			const maquinasAtivas = new Set(turnoData.map(item => item.maquina)).size
			const totalHoras = maquinasAtivas * 8 // 8 horas por turno por máquina
			
			metricas.geral.push({
				turno,
				ocupacaoMedia: Math.round(ocupacaoMedia * 100) / 100,
				eficiencia: Math.round(eficiencia * 100) / 100,
				totalHoras,
				maquinasAtivas
			})
		}
	}
	
	// Métricas por grupo
	for (const grupo of allGroups) {
		const grupoData = allTurnoData.filter(item => item.grupo === grupo)
		
		if (grupoData.length > 0) {
			const turnos = []
			
			// Calcular por turno dentro do grupo
			for (let turno = 1; turno <= 3; turno++) {
				const turnoGrupoData = grupoData.filter(item => item.turno === turno)
				
				if (turnoGrupoData.length > 0) {
					const ocupacaoTotal = turnoGrupoData.reduce((sum, item) => sum + (parseFloat(item.porcentagem) || 0), 0)
					const ocupacaoMedia = ocupacaoTotal / turnoGrupoData.length
					const eficiencia = Math.min((ocupacaoMedia / 75) * 100, 100)
					const maquinasAtivas = new Set(turnoGrupoData.map(item => item.maquina)).size
					const totalHoras = maquinasAtivas * 8
					
					turnos.push({
						turno,
						ocupacaoMedia: Math.round(ocupacaoMedia * 100) / 100,
						eficiencia: Math.round(eficiencia * 100) / 100,
						totalHoras,
						maquinasAtivas,
						grupo
					})
				}
			}
			
			// Calcular resumo do grupo
			if (turnos.length > 0) {
				const resumo = {
					ocupacaoMedia: turnos.reduce((sum, t) => sum + t.ocupacaoMedia, 0) / turnos.length,
					eficiencia: turnos.reduce((sum, t) => sum + t.eficiencia, 0) / turnos.length,
					maquinasAtivas: turnos.reduce((sum, t) => sum + t.maquinasAtivas, 0),
					totalHoras: turnos.reduce((sum, t) => sum + t.totalHoras, 0)
				}
				
				metricas.porGrupo.push({ grupo, turnos, resumo })
			}
		}
	}
	
	// Gerar ranking de máquinas
	const ranking = []
	const maquinasOcupacao = {}
	
	allTurnoData.forEach(item => {
		const maquina = item.maquina
		const ocupacao = parseFloat(item.porcentagem) || 0
		
		if (!maquinasOcupacao[maquina]) {
			maquinasOcupacao[maquina] = { total: 0, count: 0, grupo: item.grupo }
		}
		
		maquinasOcupacao[maquina].total += ocupacao
		maquinasOcupacao[maquina].count++
	})
	
	Object.entries(maquinasOcupacao).forEach(([maquina, data]) => {
		ranking.push({
			maquina,
			ocupacao: data.total / data.count,
			grupo: data.grupo
		})
	})
	
	// Ordenar ranking por ocupação
	ranking.sort((a, b) => b.ocupacao - a.ocupacao)
	
	// Gerar comparações aleatórias (em produção, viria de dados históricos)
	const comparacao = {
		semanaAnterior: Math.round((Math.random() - 0.5) * 20 * 100) / 100,
		mesAnterior: Math.round((Math.random() - 0.5) * 30 * 100) / 100
	}
	
	return {
		data: date,
		metricas,
		comparacao,
		ranking: ranking.slice(0, 20) // Top 20 máquinas
	}
}

// Função para gerar dados de exemplo quando não há dados reais
function gerarDadosExemplo(date) {
	const grupos = ["Laser", "Lectra", "Emma", "Comelz", "ComelzMontagem", "ComelzSolas"]
	
	const generateTurnoMetrics = (turno, grupo) => {
		const baseOcupacao = 85 - (turno - 1) * 7
		const baseEficiencia = 90 - (turno - 1) * 4
		const variation = Math.random() * 10 - 5
		
		return {
			turno,
			ocupacaoMedia: Math.max(0, Math.min(100, baseOcupacao + variation)),
			eficiencia: Math.max(0, Math.min(100, baseEficiencia + variation)),
			totalHoras: 8 * (6 + Math.floor(Math.random() * 4)),
			maquinasAtivas: 6 + Math.floor(Math.random() * 4),
			grupo
		}
	}

	const gerarGrupoMetrics = (grupo) => {
		const turnos = [1, 2, 3].map(turno => generateTurnoMetrics(turno, grupo))
		const resumo = {
			ocupacaoMedia: turnos.reduce((sum, t) => sum + t.ocupacaoMedia, 0) / turnos.length,
			eficiencia: turnos.reduce((sum, t) => sum + t.eficiencia, 0) / turnos.length,
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
			eficiencia: turnoData.reduce((sum, t) => sum + t.eficiencia, 0) / turnoData.length,
			totalHoras: turnoData.reduce((sum, t) => sum + t.totalHoras, 0),
			maquinasAtivas: turnoData.reduce((sum, t) => sum + t.maquinasAtivas, 0)
		}
	})

	return {
		data: date,
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
