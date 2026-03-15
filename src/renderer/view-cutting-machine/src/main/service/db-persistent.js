// db-persistent.js
// Versão melhorada do db-mock.js que persiste dados no arquivo JSON

import { app } from "electron"
import fs from "fs"
import path from "path"
import { getSettings } from "./settingsManager.js"

// Caminho para o arquivo JSON
const getDataPath = () => {
	// Optionally allow saving to a network UNC path via environment variable.
	// Standardized default UNC path (aligned with final rule):
	// \\va\rede\Grupos\Horizonte\Departamental\CORTE\Alyson\Laser\Work\AppData
	const defaultNetworkPath =
		"\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\AppData"
	// Priority for network path:
	// 1) env var TURNO_REPORT_NETWORK_PATH
	// 2) user-selected path persisted in settings (settings.networkDataPath)
	// 3) top-level baseDir from settings (legacy)
	// 4) defaultNetworkPath
	let envNetworkPath = process.env.TURNO_REPORT_NETWORK_PATH || undefined
	try {
		const settings = getSettings()
		if (!envNetworkPath) {
			envNetworkPath = settings && (settings.networkDataPath || settings.baseDir)
		}
	} catch (e) {
		// ignore - fallback to defaults below
	}
	if (!envNetworkPath) envNetworkPath = defaultNetworkPath
	const forceNetwork = process.env.TURNO_REPORT_FORCE_NETWORK === "true"
	const isDev = process.env.NODE_ENV === "development"
	// Allow an explicit override to always try network even in dev
	const alwaysUseNetwork =
		process.env.TURNO_REPORT_ALWAYS_USE_NETWORK === "true"

	// Helper that builds a candidate file path from a base dir
	const candidateFromBase = (baseDir) => path.join(baseDir, "turno_report.json")

	// If an explicit network path is provided, prefer it (unless in dev and not forced)
	const testNetworkWritable = (dir) => {
		try {
			fs.mkdirSync(dir, { recursive: true })
			const testFile = path.join(
				dir,
				`.turno_report_write_test_${Date.now()}.tmp`,
			)
			fs.writeFileSync(testFile, "ok")
			fs.unlinkSync(testFile)
			return true
		} catch (e) {
			console.warn("[DB-PERSISTENT] Teste de escrita em rede falhou:", {
				message: e && e.message ? e.message : String(e),
				code: e && e.code,
				stack: e && e.stack,
			})
			return false
		}
	}

	// Prefer network path when available in production or when explicitly forced.
	// In production we return the network candidate even if the writable test fails
	// because the requirement is to save on the network path regardless.
	if (envNetworkPath) {
		const candidate = candidateFromBase(envNetworkPath)
		if (!isDev || forceNetwork || alwaysUseNetwork) {
			console.log(
				"[DB-PERSISTENT] Preferindo caminho de rede (produção/flag):",
				candidate,
			)
			// Return the network candidate: save will be attempted there.
			return candidate
		}
		// If in dev and not forced, still prefer it when a quick write test succeeds
		if (testNetworkWritable(envNetworkPath)) {
			console.log("[DB-PERSISTENT] Usando caminho de rede válido:", candidate)
			return candidate
		} else {
			console.warn(
				"[DB-PERSISTENT] Caminho de rede detectado mas teste de escrita falhou (em DEV) - usando fallback local.",
			)
		}
	}

	if (isDev) {
		// Primeiro tenta a pasta data/ do projeto VCM embutido
		const vcmDataPath = path.join(process.cwd(), "src", "renderer", "view-cutting-machine", "data", "turno_report.json")
		if (fs.existsSync(vcmDataPath)) {
			return vcmDataPath
		}
		return path.join(process.cwd(), "data", "turno_report.json")
	} else {
		// In production prefer userData but keep network preference higher up the call
		const userDataDir = path.join(app.getPath("userData"), "data")
		try {
			fs.mkdirSync(userDataDir, { recursive: true })
		} catch (e) {
			console.warn('[DB-PERSISTENT] Não foi possível garantir userDataDir:', e.message)
		}
		return path.join(userDataDir, "turno_report.json")
	}
}

// Função para carregar dados existentes do arquivo JSON
const loadExistingData = () => {
	const filePath = getDataPath()

	try {
		if (fs.existsSync(filePath)) {
			const rawData = fs.readFileSync(filePath, "utf8")
			const data = JSON.parse(rawData)
			if (data && Array.isArray(data.turnoReports)) {
				console.log(
					`[DB-PERSISTENT] Carregados ${data.turnoReports.length} registros existentes`,
				)
				return data.turnoReports
			}
		}
	} catch (error) {
		console.error("[DB-PERSISTENT] Erro ao carregar dados existentes:", error)
	}

	console.log("[DB-PERSISTENT] Iniciando com array vazio")
	return []
}

// Dados em memória com dados existentes carregados
let turnoReportData = loadExistingData()
// Set para chaves existentes para checagem rápida de duplicatas
let existingKeys = new Set()

// Inicializa existingKeys com os dados carregados (normaliza chaves)
const initExistingKeys = () => {
	existingKeys = new Set()
	turnoReportData.forEach((r) => {
		const key = `${r.date}_${r.turno}_${String(r.maquina).trim()}_${String(r.periodo).trim()}`
		existingKeys.add(key)
	})
}

initExistingKeys()

// Função para salvar dados no arquivo JSON
const saveDataToFile = () => {
	const filePath = getDataPath()
	console.log("[DB-PERSISTENT] saveDataToFile target path:", filePath)

	try {
		const dataToSave = {
			turnoReports: turnoReportData,
			lastModified: new Date().toISOString(),
			totalRecords: turnoReportData.length,
		}

			// Cria o diretório se não existir. Se o caminho alvo estiver em rede, tentamos
			// criar a pasta AppData explicitamente (alguns sistemas de arquivo em rede falham
			// ao criar múltiplos níveis de pasta de uma vez).
			const dir = path.dirname(filePath)
			try {
				if (!fs.existsSync(dir)) {
					try {
						fs.mkdirSync(dir, { recursive: true })
					} catch (err) {
						console.warn('[DB-PERSISTENT] Falha ao criar diretório completo, tentando criar apenas AppData:', err.message)
						// tentativa alternativa: criar somente a pasta AppData no caminho de rede
						const parts = dir.split(path.sep)
						const appDataIndex = parts.findIndex(p => p.toLowerCase() === 'appdata')
						if (appDataIndex !== -1) {
							const appDataPath = parts.slice(0, appDataIndex + 1).join(path.sep)
							try {
								fs.mkdirSync(appDataPath, { recursive: true })
								// depois tenta recriar o dir completo
								fs.mkdirSync(dir, { recursive: true })
							} catch (err2) {
								console.error('[DB-PERSISTENT] Falha ao criar appDataPath alternativo:', err2.message)
								throw err2
							}
						} else {
							throw err
						}
					}
				}
			} catch (mkdirErr) {
				console.error(
					"[DB-PERSISTENT] Falha ao criar diretório alvo:",
					dir,
					mkdirErr,
				)
				throw mkdirErr
			}

		// Salva os dados de forma atômica (escreve em arquivo temporário e renomeia)
		const tmpFile = `${filePath}.tmp`
		try {
			fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), "utf8")
			fs.renameSync(tmpFile, filePath)
		} catch (writeErr) {
			// Se a escrita falhar por falta de diretório ou permissão, tentamos criar
			// o diretório pai explicitamente (AppData) e regravamos uma vez.
			console.warn('[DB-PERSISTENT] Falha ao escrever arquivo temporário, tentando criar diretório pai:', writeErr.message)
			try {
				fs.mkdirSync(path.dirname(filePath), { recursive: true })
				fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), "utf8")
				fs.renameSync(tmpFile, filePath)
			} catch (writeErr2) {
				console.error('[DB-PERSISTENT] Segunda tentativa de escrita falhou:', writeErr2)
				// Se segunda tentativa falhar, limpa tmpFile se existir
				try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile) } catch(_){}
				throw writeErr2
			}
		}
		console.log(
			`[DB-PERSISTENT] Salvos ${turnoReportData.length} registros no arquivo JSON`,
		)
	} catch (error) {
		console.error("[DB-PERSISTENT] Erro ao salvar dados:", error)
		throw error
	}
}

// Função para criar backup diário do turno_report.json em data/backups/
const backupDaily = () => {
	try {
		const filePath = getDataPath()
		if (!fs.existsSync(filePath)) return false
		let backupsDir = path.join(path.dirname(filePath), "backups")
		try {
			fs.mkdirSync(backupsDir, { recursive: true })
		} catch (e) {
			console.warn(
				"[DB-PERSISTENT] Falha ao criar diretório de backups no local alvo, tentando diretório temporário:",
				e,
			)
			// fallback to app userData backups folder
			const fallbackDir = path.join(app.getPath("userData"), "data", "backups")
			fs.mkdirSync(fallbackDir, { recursive: true })
			backupsDir = fallbackDir // eslint-disable-line no-param-reassign
		}
		const now = new Date()
		const y = now.getFullYear()
		const m = String(now.getMonth() + 1).padStart(2, "0")
		const d = String(now.getDate()).padStart(2, "0")
		const backupName = `turno_report-${y}${m}${d}.json`
		const dest = path.join(backupsDir, backupName)
		// Se já existe backup para hoje, não sobrescreve
		if (fs.existsSync(dest)) {
			console.log("[DB-PERSISTENT] Backup diário já existe:", dest)
			return dest
		}
		fs.copyFileSync(filePath, dest)
		console.log("[DB-PERSISTENT] Backup diário criado em:", dest)
		return dest
	} catch (e) {
		console.error("[DB-PERSISTENT] Erro ao criar backup diário:", e)
		return false
	}
}

// Função de inicialização
const initializeDatabase = async () => {
	try {
		// Os dados já foram carregados na inicialização
		console.log(
			`[DB-PERSISTENT] Banco inicializado com ${turnoReportData.length} registros`,
		)

		// Remover duplicatas existentes
		// Garante normalização inicial e remoção de duplicatas
		// Normaliza campos básicos
		turnoReportData = turnoReportData.map((r) => ({
			id: r.id,
			date: String(r.date),
			turno: typeof r.turno === "number" ? r.turno : parseInt(r.turno, 10) || 0,
			maquina: String(r.maquina).trim(),
			periodo: String(r.periodo).trim(),
			porcentagem: r.porcentagem,
			created: r.created || new Date().toISOString(),
		}))

		initExistingKeys()
		const removedCount = removeDuplicates()
		if (removedCount > 0) {
			console.log(
				`[DB-PERSISTENT] ${removedCount} registros duplicados foram removidos`,
			)
		}

		// Salva os dados carregados para garantir que o arquivo esteja atualizado
		saveDataToFile()

		// Após carregar e normalizar, tentar reparar datas deslocadas (1º/2º turno) se existirem
		try {
			const fixed = repairShift12Dates()
			if (fixed > 0) {
				console.log(`[DB-PERSISTENT] Datas corrigidas para 1º/2º turnos: ${fixed} registros ajustados`)
				// Após correção, remover possíveis duplicatas e salvar
				const removedAfterFix = removeDuplicates()
				if (removedAfterFix > 0) {
					console.log(`[DB-PERSISTENT] Duplicatas removidas após correção de datas: ${removedAfterFix}`)
				}
				saveDataToFile()
			}
		} catch (e) {
			console.warn('[DB-PERSISTENT] Falha ao executar reparo de datas 1º/2º turnos:', e)
		}

		// Faz backup diário automático ao inicializar (não sobrescreve se já existir)
		try {
			const backup = backupDaily()
			if (backup)
				console.log(
					"[DB-PERSISTENT] Backup automático criado/confirmado:",
					backup,
				)
		} catch (e) {
			console.warn(
				"[DB-PERSISTENT] Falha ao criar backup automático na inicialização:",
				e,
			)
		}

		return true
	} catch (error) {
		console.error("[DB-PERSISTENT] Erro na inicialização:", error)
		throw error
	}
}

// Normalização de período
const normalizePeriodo = (p) => {
	if (!p || typeof p !== "string") return null
	let cleaned = p.replace(/\s+/g, "").replace(/–|—/g, "-")
	const parts = cleaned.split("-")
	if (parts.length !== 2) return null

	const normPart = (part) => {
		const [h, m] = part.split(":")
		if (m === undefined) return null
		const hh = h.padStart(2, "0")
		const mm = m.padStart(2, "0")
		const hi = parseInt(hh, 10)
		const mi = parseInt(mm, 10)
		if (isNaN(hi) || isNaN(mi)) return null
		if (hi < 0 || hi > 23 || mi < 0 || mi > 59) return null
		return `${hh}:${mm}`
	}

	const a = normPart(parts[0])
	const b = normPart(parts[1])
	if (!a || !b) return null
	return `${a}-${b}`
}

// Função para inserir dados mantendo registros existentes
const insertTurnoReport = async (data) => {
	try {
		console.log("[DB-PERSISTENT] Inserindo turno report:", data)

		const normalized = normalizePeriodo(data.periodo)
		if (!normalized) {
			console.warn(`[DB-PERSISTENT] Periodo inválido: "${data.periodo}"`)
			throw new Error("Formato de periodo inválido. Deve ser 'HH:MM-HH:MM'.")
		}

		// Normaliza turno
		let normalizedTurno = null
		if (typeof data.turno === "number") {
			if (data.turno >= 0 && data.turno <= 2) normalizedTurno = data.turno
			else if (data.turno >= 1 && data.turno <= 3)
				normalizedTurno = data.turno - 1
		}

		if (normalizedTurno === null) {
			// Inferir do período
			const start = normalized.split("-")[0]
			const [hh] = start.split(":")
			const h = parseInt(hh, 10)
			if (!Number.isNaN(h)) {
				if (h >= 5 && h < 13) normalizedTurno = 0
				else if (h >= 13 && h < 21) normalizedTurno = 1
				else normalizedTurno = 2
			} else {
				normalizedTurno = 2
			}
		}

		// Para turno 3, usar a data fornecida diretamente (o frontend já gerencia a lógica de data)
		// OBSERVAÇÃO: Turnos 1 (05:00-13:20) e 2 (13:20-21:40) NÃO atravessam meia-noite
		// Apenas turno 3 (21:40-05:00) atravessa meia-noite e já tem tratamento especial
		let storedDate = data.date

		// Cria uma chave consistente e normalizada para checar duplicatas rapidamente
		const maquinaTrim = String(data.maquina).trim()
		const periodoTrim = String(normalized).trim()
		const key = `${storedDate}_${normalizedTurno}_${maquinaTrim}_${periodoTrim}`

		console.log(
			`[DB-PERSISTENT] Verificando duplicata para: ${storedDate}, ${normalizedTurno}, ${maquinaTrim}, ${periodoTrim}`,
		)

	// Se já existe a chave
	if (existingKeys.has(key)) {
		// encontra índice existente
		const existingIndex = turnoReportData.findIndex((record) => {
			return (
				String(record.date) === storedDate &&
				Number(record.turno) === normalizedTurno &&
				String(record.maquina).trim() === maquinaTrim &&
				String(record.periodo).trim() === periodoTrim
			)
		})

		if (existingIndex !== -1) {
			// Se porcentagem igual, não faz nada
			const existing = turnoReportData[existingIndex]
			if (existing.porcentagem === data.porcentagem) {
				console.log(
					`[DB-PERSISTENT] Registro já existe com mesma porcentagem - ignorando inserção`,
				)
				return existing.id
			}

			// Atualiza porcentagem e timestamp
			console.log(
				`[DB-PERSISTENT] REGISTRO DUPLICADO ENCONTRADO - Atualizando porcentagem`,
			)
			turnoReportData[existingIndex] = {
				...existing,
				porcentagem: data.porcentagem,
				created: new Date().toISOString(),
			}
			// Salva e retorna id
			saveDataToFile()
			return turnoReportData[existingIndex].id
		}
		// Caso estranho: chave presente mas não encontrado index (continua para inserir)
		console.warn(
			"[DB-PERSISTENT] Chave duplicada encontrada mas índice não localizado - prosseguindo para inserção segura",
		)
	}

	// Criar novo registro
	const newId = Math.max(...turnoReportData.map((r) => r.id || 0), 0) + 1
		const newRecord = {
			id: newId,
			date: storedDate,
			turno: normalizedTurno,
			maquina: maquinaTrim,
			periodo: periodoTrim,
			porcentagem: data.porcentagem,
			created: new Date().toISOString(),
		}

		turnoReportData.push(newRecord)
		existingKeys.add(key)
		console.log(
			`[DB-PERSISTENT] Novo registro criado: ${storedDate}, ${normalizedTurno}, ${maquinaTrim}, ${periodoTrim}`,
		)

		// Salvar no arquivo após cada inserção
		saveDataToFile()

		// Retorna o id do registro inserido/atualizado
		return newRecord.id
	} catch (error) {
		console.error("[DB-PERSISTENT] Erro ao inserir dados:", error)
		throw error
	}
}

// Função para consultar dados
const getTurnoReport = async ({ date, turno, maquinas }) => {
	try {
		console.log(
			`[DB-PERSISTENT] Consultando dados: date=${date}, turno=${turno}, maquinas=${maquinas?.length || "todas"}`,
		)

		let filteredData = turnoReportData

		if (date) {
			filteredData = filteredData.filter((record) => record.date === date)
		}

		if (turno !== undefined && turno !== null) {
			filteredData = filteredData.filter((record) => record.turno === turno)
		}

		if (Array.isArray(maquinas) && maquinas.length > 0) {
			filteredData = filteredData.filter((record) =>
				maquinas.includes(record.maquina),
			)
		}

		console.log(`[DB-PERSISTENT] Retornando ${filteredData.length} registros`)
		return filteredData
	} catch (error) {
		console.error("[DB-PERSISTENT] Erro ao consultar dados:", error)
		throw error
	}
}

// Função para remover duplicatas existentes
const removeDuplicates = () => {
	const uniqueRecords = []
	const seen = new Set()

	for (const record of turnoReportData) {
		const key = `${String(record.date)}_${String(record.turno)}_${String(record.maquina).trim()}_${String(record.periodo).trim()}`
		if (!seen.has(key)) {
			seen.add(key)
			uniqueRecords.push({
				...record,
				maquina: String(record.maquina).trim(),
				periodo: String(record.periodo).trim(),
			})
		} else {
			console.log(
				`[DB-PERSISTENT] Removendo duplicata: ${record.date}, ${record.turno}, ${record.maquina}, ${record.periodo}`,
			)
		}
	}

	const originalCount = turnoReportData.length
	turnoReportData = uniqueRecords

	// Recria existingKeys a partir dos registros únicos
	existingKeys = new Set()
	turnoReportData.forEach((r) => {
		existingKeys.add(
			`${r.date}_${r.turno}_${String(r.maquina).trim()}_${String(r.periodo).trim()}`,
		)
	})

	console.log(
		`[DB-PERSISTENT] Duplicatas removidas: ${originalCount} -> ${turnoReportData.length} registros`,
	)

	// Salvar após remoção de duplicatas
	saveDataToFile()

	return originalCount - turnoReportData.length
}

// Mock do banco para compatibilidade
const db = {
	prepare: (query) => ({
		all: () => {
			console.log("[DB-PERSISTENT] Mock DB Query:", query)
			if (query.includes("turno_report")) {
				return turnoReportData
			}
			return []
		},
		run: (data) => {
			console.log("[DB-PERSISTENT] Mock DB Insert:", data)
			return { lastInsertRowid: Math.floor(Math.random() * 1000) }
		},
	}),
}

export {
	db,
	getTurnoReport,
	insertTurnoReport,
	initializeDatabase,
	removeDuplicates,
}

// Export getDataPath so other modules (server.js) can query the effective file path
export { getDataPath }

// ========================= Funções auxiliares de reparo =========================

// Converte uma ISO string (UTC) para data local YYYY-MM-DD
function isoToLocalDateStr(iso) {
	if (!iso) return null
	try {
		const d = new Date(iso)
		const y = d.getFullYear()
		const m = String(d.getMonth() + 1).padStart(2, '0')
		const day = String(d.getDate()).padStart(2, '0')
		return `${y}-${m}-${day}`
	} catch {
		return null
	}
}

function addDays(dateStr, days) {
	try {
		const d = new Date(dateStr + 'T00:00:00')
		d.setDate(d.getDate() + days)
		const y = d.getFullYear()
		const m = String(d.getMonth() + 1).padStart(2, '0')
		const day = String(d.getDate()).padStart(2, '0')
		return `${y}-${m}-${day}`
	} catch {
		return dateStr
	}
}

// Determina se um período pertence ao turno 1 ou 2 (pelos horários)
function periodBelongsToShift(periodo, shiftIndex /* 0 ou 1 */) {
	if (!periodo || typeof periodo !== 'string') return false
	const p = String(periodo).trim()
	const [ini, fim] = p.split('-')
	if (!ini || !fim) return false
	const toMin = (hhmm) => {
		const [h, m] = hhmm.split(':')
		return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0)
	}
	const startMin = toMin(ini)
	// Turno 1: 05:00–13:20 | Turno 2: 13:20–21:40
	if (shiftIndex === 0) {
		return startMin >= 5 * 60 && startMin < (13 * 60 + 20)
	}
	if (shiftIndex === 1) {
		return startMin >= (13 * 60 + 20) && startMin < (21 * 60 + 40)
	}
	return false
}

// Repara registros do turno 1/2 que foram salvos por engano no dia seguinte (D+1)
function repairShift12Dates() {
	let fixes = 0
	// Criar backup antes de alterar
	try { backupDaily() } catch {}

	for (let i = 0; i < turnoReportData.length; i++) {
		const r = turnoReportData[i]
		// turno armazenado como 0,1,2
		if (r && (r.turno === 0 || r.turno === 1)) {
			const createdLocal = isoToLocalDateStr(r.created)
			const stored = String(r.date)
			// Heurística: se a data armazenada for exatamente um dia após a data local de criação
			// e o período pertence ao turno correspondente, então provavelmente está deslocada
			if (createdLocal && addDays(createdLocal, 1) === stored && periodBelongsToShift(r.periodo, r.turno)) {
				const newDate = createdLocal
				const oldKey = `${stored}_${r.turno}_${String(r.maquina).trim()}_${String(r.periodo).trim()}`
				const newKey = `${newDate}_${r.turno}_${String(r.maquina).trim()}_${String(r.periodo).trim()}`
				// Se já existe um registro com a nova chave, preferimos manter o mais recente e pular
				if (!existingKeys.has(newKey)) {
					turnoReportData[i] = { ...r, date: newDate }
					existingKeys.delete(oldKey)
					existingKeys.add(newKey)
					fixes++
				}
			}
		}
	}
	return fixes
}
