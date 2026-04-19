// src/main/service/settingsManager.js
// Sistema centralizado de configuraÃ§Ã£o que sincroniza automaticamente todas as configuraÃ§Ãµes de mÃ¡quinas

import fs from "fs"
import os from "os"
import path from "path"

// ConfiguraÃ§Ãµes de caminhos
const NETWORK_CONFIG_DIR = "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\AppData"
const NETWORK_SETTINGS_FILE = path.join(NETWORK_CONFIG_DIR, "settings.json")

// VariÃ¡vel global para controlar modo offline
let isOfflineMode = false
let networkCheckDone = false

/**
 * Verifica rapidamente se a rede estÃ¡ acessÃ­vel (timeout de 1 segundo)
 */
function quickNetworkCheck() {
	if (networkCheckDone) return !isOfflineMode
	
	try {
		// Tenta acessar a pasta raiz da rede com timeout rÃ¡pido
		const startTime = Date.now()
		const testPath = "\\\\va\\rede"
		
		// Verifica se existe com timeout manual
		const checkInterval = setInterval(() => {
			if (Date.now() - startTime > 1000) {
				clearInterval(checkInterval)
				isOfflineMode = true
				networkCheckDone = true
				console.log('[Settings] âš ï¸ MODO OFFLINE ativado - rede nÃ£o acessÃ­vel')
			}
		}, 100)
		
		const exists = fs.existsSync(testPath)
		clearInterval(checkInterval)
		
		if (!exists || (Date.now() - startTime) > 800) {
			isOfflineMode = true
			console.log('[Settings] âš ï¸ MODO OFFLINE ativado - rede lenta ou inacessÃ­vel')
		} else {
			isOfflineMode = false
			console.log('[Settings] âœ… Rede acessÃ­vel - modo online')
		}
		
		networkCheckDone = true
		return !isOfflineMode
	} catch (error) {
		isOfflineMode = true
		networkCheckDone = true
		console.log('[Settings] âš ï¸ MODO OFFLINE ativado - erro ao verificar rede:', error.message)
		return false
	}
}

// Detecta se estÃ¡ rodando no Electron
let app = null
let isElectron = false
try {
	// Use require when available to avoid top-level await during bundling
	// eslint-disable-next-line global-require
	const electronPkg = typeof require === "function" ? require("electron") : null
	if (electronPkg && electronPkg.app) {
		app = electronPkg.app
		isElectron = true
	} else {
		// Fallback para runtime ESM: usa import dinÃ¢mico de forma assÃ­ncrona sem bloquear o bundler
		;(async () => {
			try {
				const electronPkgDynamic = await import("electron")
				app = electronPkgDynamic.app
				isElectron = true
			} catch (_) {
				isElectron = false
			}
		})()
	}
} catch (e) {
	isElectron = false
}

let cachedSettings = null
let settingsWatchers = new Set()

/**
 * Garante que o diretÃ³rio da rede existe
 */
function ensureNetworkDirectory() {
	// Se estiver em modo offline, nÃ£o tenta acessar a rede
	if (isOfflineMode) {
		console.log('[Settings] â­ï¸ Pulando verificaÃ§Ã£o de rede (modo offline)')
		return false
	}
	
	try {
		// Tenta criar recursivamente o diretÃ³rio de destino na rede.
		// Em alguns ambientes de rede, criar vÃ¡rios nÃ­veis de diretÃ³rio pode falhar
		// por permissÃµes; escrevemos logs e retornamos false para que o caller
		// possa tentar fallback local quando necessÃ¡rio.
		if (!fs.existsSync(NETWORK_CONFIG_DIR)) {
			try {
				fs.mkdirSync(NETWORK_CONFIG_DIR, { recursive: true })
				console.log(`[Settings] âœ… DiretÃ³rio criado na rede: ${NETWORK_CONFIG_DIR}`)
				return true
			} catch (err) {
				console.warn(`[Settings] âŒ Falha ao criar diretÃ³rio na rede (tentativa direta): ${err.message}`)
				isOfflineMode = true // Ativa modo offline se falhar
				return false
			}
		}
		// Se jÃ¡ existe, consideramos OK
		return true
	} catch (error) {
		console.warn(`[Settings] âŒ Erro inesperado em ensureNetworkDirectory: ${error.message}`)
		isOfflineMode = true // Ativa modo offline se falhar
		return false
	}
}

/**
 * ObtÃ©m o caminho local de fallback
 */
function getLocalSettingsPath() {
	const isDev = process.env.NODE_ENV === "development"
	
	if (isDev) {
		// Em desenvolvimento, primeiro tenta a pasta data/ do projeto VCM embutido
		const vcmDataPath = path.join(process.cwd(), "src", "renderer", "view-cutting-machine", "data", "settings.json")
		if (fs.existsSync(vcmDataPath)) {
			return vcmDataPath
		}
		// Fallback para pasta data/ do projeto raiz
		return path.join(process.cwd(), "data", "settings.json")
	} else {
		// Em produÃ§Ã£o, usa backup compartilhado na rede ou AppData como Ãºltimo recurso
	const networkBackupDir = "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\AppData\\Backup"
		const networkBackupPath = path.join(networkBackupDir, "settings_backup.json")
		
		// Tenta usar backup compartilhado na rede
		try {
			if (fs.existsSync(path.dirname(networkBackupPath)) || fs.mkdirSync(path.dirname(networkBackupPath), { recursive: true })) {
				return networkBackupPath
			}
		} catch (error) {
			console.warn(`[Settings] âš ï¸ NÃ£o foi possÃ­vel usar backup compartilhado: ${error.message}`)
		}
		
		// Fallback para AppData local apenas se rede nÃ£o estiver disponÃ­vel
		const userDataDir = path.join(
			isElectron && app ? app.getPath("userData") : os.homedir(),
			"data",
		)
		return path.join(userDataDir, "settings.json")
	}
}

/**
 * Carrega as configuraÃ§Ãµes do arquivo settings.json
 * Prioridade: Rede > Local > PadrÃ£o
 */
function loadSettings() {
	console.log('[Settings] ðŸ” Iniciando carregamento de configuraÃ§Ãµes...')
	
	// Verifica rapidamente se a rede estÃ¡ acessÃ­vel (1 segundo max)
	const networkAvailable = quickNetworkCheck()
	
	// 1Âº: Tenta carregar da rede (sÃ³ se disponÃ­vel)
	if (networkAvailable) {
		try {
			if (fs.existsSync(NETWORK_SETTINGS_FILE)) {
				const networkData = fs.readFileSync(NETWORK_SETTINGS_FILE, 'utf-8')
				const settings = JSON.parse(networkData)
				console.log('[Settings] âœ… ConfiguraÃ§Ãµes carregadas da REDE')
				console.log(`[Settings] ðŸ“ Caminho: ${NETWORK_SETTINGS_FILE}`)
				cachedSettings = settings
				return settings
			} else {
				console.log('[Settings] âŒ Arquivo nÃ£o encontrado na rede, criando arquivo padrÃ£o...')
				const createResult = createDefaultNetworkSettings()
				if (createResult && createResult.success) {
					console.log('[Settings] âœ… Arquivo padrÃ£o criado, usando configuraÃ§Ãµes padrÃ£o')
					const defaultSettings = getDefaultSettings()
					cachedSettings = defaultSettings
					return defaultSettings
				}
			}
		} catch (error) {
			console.warn(`[Settings] âŒ Erro ao carregar da rede: ${error.message}`)
			isOfflineMode = true
		}
	} else {
		console.log('[Settings] â­ï¸ Pulando verificaÃ§Ã£o de rede (modo offline)')
	}

	// 2Âº: Fallback para arquivo local
	try {
		const localPath = getLocalSettingsPath()
		if (fs.existsSync(localPath)) {
			const localData = fs.readFileSync(localPath, 'utf-8')
			const settings = JSON.parse(localData)
			console.log('[Settings] âš ï¸ ConfiguraÃ§Ãµes carregadas LOCALMENTE (backup)')
			console.log(`[Settings] ðŸ“ Caminho: ${localPath}`)
			cachedSettings = settings
			return settings
		}
	} catch (error) {
		console.warn(`[Settings] âŒ Erro ao carregar configuraÃ§Ãµes locais: ${error.message}`)
	}

	// 3Âº: Usa configuraÃ§Ãµes padrÃ£o em memÃ³ria
	console.log('[Settings] ðŸ”„ Usando configuraÃ§Ãµes PADRÃƒO em memÃ³ria')
	const defaultSettings = getDefaultSettings()
	cachedSettings = defaultSettings
	return defaultSettings
}

/**
 * Cria arquivo de configuraÃ§Ãµes padrÃ£o na rede
 * @param {Object} customSettings - ConfiguraÃ§Ãµes personalizadas (opcional). Se nÃ£o fornecido, usa getDefaultSettings()
 */
function createDefaultNetworkSettings(customSettings = null) {
	try {
		// Garante diretÃ³rio e escreve o arquivo; se a escrita falhar por falta de diretÃ³rio,
		// tenta criar novamente a pasta pai e regravar.
		const settingsToSave = customSettings || getDefaultSettings()
		
	// Adiciona timestamp e versÃ£o
	const settingsWithMeta = {
		...settingsToSave,
		lastUpdated: new Date().toISOString(),
		version: "1.0.55"
	}
	
	if (!ensureNetworkDirectory()) {
		console.warn('[Settings] âš ï¸ NÃ£o foi possÃ­vel garantir diretÃ³rio de rede antes de criar arquivo. Tentando continuar.')
	}
		try {
			fs.writeFileSync(NETWORK_SETTINGS_FILE, JSON.stringify(settingsWithMeta, null, 2), 'utf-8')
			console.log(`[Settings] âœ… Arquivo padrÃ£o criado na rede: ${NETWORK_SETTINGS_FILE}`)
			return { success: true, path: NETWORK_SETTINGS_FILE }
		} catch (err) {
			// Se falhou devido a diretÃ³rio ausente, tenta criar e regravar
			if (err && (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'EPERM')) {
				try {
					fs.mkdirSync(path.dirname(NETWORK_SETTINGS_FILE), { recursive: true })
					fs.writeFileSync(NETWORK_SETTINGS_FILE, JSON.stringify(settingsWithMeta, null, 2), 'utf-8')
					console.log(`[Settings] âœ… Arquivo criado apÃ³s criar diretÃ³rio: ${NETWORK_SETTINGS_FILE}`)
					return { success: true, path: NETWORK_SETTINGS_FILE }
				} catch (err2) {
					console.error(`[Settings] âŒ Falha ao criar arquivo padrÃ£o na rede (segunda tentativa): ${err2.message}`)
					return { success: false, error: err2.message }
				}
			}
			console.error(`[Settings] âŒ Erro ao criar arquivo padrÃ£o na rede: ${err.message}`)
			return { success: false, error: err.message }
		}
	} catch (error) {
		console.error(`[Settings] âŒ Erro inesperado em createDefaultNetworkSettings: ${error.message}`)
		return { success: false, error: error.message }
	}
}

/**
 * Retorna as configuraÃ§Ãµes padrÃ£o
 */
export function getDefaultSettings() {
	return {
		baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work",
		machineGroups: {
			Laser: {
				name: "LASER",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work",
				machineMap: {
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
				},
			},
			Lectra: {
				name: "LECTRA",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Lectra",
				machineMap: {
					1: "02-1435",
					2: "02-2615",
					3: "02-1681",
					4: "02-1880",
					5: "02-1780",
					6: "02-1740",
					7: "02-2391",
					8: "02-2539",
					9: "02-1553",
					10: "02-1398",
					11: "02-1454",
	
				},
			},
			Emma: {
				name: "EMMA",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Emma",
				machineMap: {
					1: "02-2774",
					2: "02-2672",
					3: "02-2501",
					4: "02-2773",
				},
			},
			Comelz: {
				name: "COMELZ",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz",
				machineMap: {
					1: "02-1555",
					2: "02-1556",
					3: "02-1558",
					4: "02-1507",
				},
			},
			ComelzMontagem: {
				name: "COMELZ MONTAGEM",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz",
				machineMap: {
					1: "02-1471",
					2: "02-1334",
					3: "02-1557",
				},
			},
			ComelzSolas: {
				name: "COMELZ SOLAS",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz",
				machineMap: {
					1: "02-1559",
					2: "02-1325",
				},
			},
		},
	}
}

/**
 * Retorna as configuraÃ§Ãµes atuais (cached)
 */
export function getSettings() {
	if (!cachedSettings) {
		cachedSettings = loadSettings()
	}
	return cachedSettings
}

/**
 * Retorna a configuraÃ§Ã£o de um grupo especÃ­fico
 */
export function getGroupConfig(groupName) {
	const settings = getSettings()
	const group = settings.machineGroups?.[groupName]
	
	if (group) {
		return {
			baseDir: group.baseDir || settings.baseDir,
			machineMap: group.machineMap || {},
			name: group.name || groupName.toUpperCase()
		}
	}
	
	// Fallback para valores padrÃ£o se o grupo nÃ£o existir
	const defaults = getDefaultSettings()
	return defaults.machineGroups[groupName] || {
		baseDir: settings.baseDir,
		machineMap: {},
		name: groupName.toUpperCase()
	}
}

/**
 * Retorna todas as mÃ¡quinas de um grupo
 */
export function getGroupMachines(groupName) {
	const config = getGroupConfig(groupName)
	return config.machineMap
}

/**
 * Retorna o baseDir de um grupo
 */
export function getGroupBaseDir(groupName) {
	const config = getGroupConfig(groupName)
	return config.baseDir
}

/**
 * Salva as configuraÃ§Ãµes e notifica todos os watchers
 */
export function saveSettings(newSettings) {
	console.log('[Settings] ðŸ’¾ Iniciando salvamento de configuraÃ§Ãµes...')
	
	let savedToNetwork = false
	let savedToLocal = false
	const results = { network: false, local: false, errors: [] }

	// Adiciona timestamp de Ãºltima atualizaÃ§Ã£o
	const settingsWithTimestamp = {
		...newSettings,
		lastUpdated: new Date().toISOString(),
		version: "1.0.55"
	}

	// 1Âº: Tenta salvar na rede
	try {
		// Garantir diretÃ³rio e tentar gravar. Se a escrita falhar por falta de diretÃ³rio,
		// tentamos criar o diretÃ³rio pai e regravar uma vez.
		try {
			if (!ensureNetworkDirectory()) {
				console.warn('[Settings] âš ï¸ DiretÃ³rio de rede nÃ£o garantido; tentando criar pai antes de gravar.')
				fs.mkdirSync(path.dirname(NETWORK_SETTINGS_FILE), { recursive: true })
			}
			fs.writeFileSync(NETWORK_SETTINGS_FILE, JSON.stringify(settingsWithTimestamp, null, 2), 'utf-8')
			console.log(`[Settings] âœ… ConfiguraÃ§Ãµes salvas na REDE: ${NETWORK_SETTINGS_FILE}`)
			savedToNetwork = true
			results.network = true
		} catch (netErr) {
			// Se erro relacionado a inexistÃªncia de diretÃ³rio ou permissÃ£o, tenta criar e regravar
			if (netErr && (netErr.code === 'ENOENT' || netErr.code === 'EACCES' || netErr.code === 'EPERM')) {
				try {
					fs.mkdirSync(path.dirname(NETWORK_SETTINGS_FILE), { recursive: true })
					fs.writeFileSync(NETWORK_SETTINGS_FILE, JSON.stringify(settingsWithTimestamp, null, 2), 'utf-8')
					console.log(`[Settings] âœ… ConfiguraÃ§Ãµes gravadas apÃ³s criar diretÃ³rio pai: ${NETWORK_SETTINGS_FILE}`)
					savedToNetwork = true
					results.network = true
				} catch (netErr2) {
					const errorMsg = `Erro ao salvar na rede (segunda tentativa): ${netErr2.message}`
					console.error(`[Settings] âŒ ${errorMsg}`)
					results.errors.push(errorMsg)
				}
			} else {
				const errorMsg = `Erro ao salvar na rede: ${netErr.message}`
				console.error(`[Settings] âŒ ${errorMsg}`)
				results.errors.push(errorMsg)
			}
		}
	} catch (error) {
		const errorMsg = `Erro inesperado ao tentar salvar na rede: ${error.message}`
		console.error(`[Settings] âŒ ${errorMsg}`)
		results.errors.push(errorMsg)
	}

	// 2Âº: Sempre salva local como backup
	try {
		const localPath = getLocalSettingsPath()
		const localDir = path.dirname(localPath)
		if (!fs.existsSync(localDir)) {
			fs.mkdirSync(localDir, { recursive: true })
		}
		fs.writeFileSync(localPath, JSON.stringify(settingsWithTimestamp, null, 2), 'utf-8')
		console.log(`[Settings] âœ… Backup local salvo: ${localPath}`)
		savedToLocal = true
		results.local = true
	} catch (error) {
		const errorMsg = `Erro ao salvar backup local: ${error.message}`
		console.error(`[Settings] âŒ ${errorMsg}`)
		results.errors.push(errorMsg)
	}

	// Verifica se pelo menos um salvamento funcionou
	if (!savedToNetwork && !savedToLocal) {
		const fullError = `Falha total ao salvar configuraÃ§Ãµes: ${results.errors.join(', ')}`
		console.error(`[Settings] ðŸ’¥ ${fullError}`)
		return false
	}

	// Atualiza o cache
	cachedSettings = settingsWithTimestamp
	
	// Notifica todos os watchers
	notifySettingsChanged(settingsWithTimestamp)
	
	console.log(`[Settings] ðŸ“Š Resultado: Rede=${savedToNetwork}, Local=${savedToLocal}`)
	console.log("[Settings] ConfiguraÃ§Ãµes salvas e sincronizadas automaticamente")
	return true
}

/**
 * Adiciona um watcher para ser notificado quando as configuraÃ§Ãµes mudarem
 */
export function addSettingsWatcher(callback) {
	settingsWatchers.add(callback)
	
	// Retorna uma funÃ§Ã£o para remover o watcher
	return () => {
		settingsWatchers.delete(callback)
	}
}

/**
 * Notifica todos os watchers que as configuraÃ§Ãµes mudaram
 */
function notifySettingsChanged(newSettings) {
	settingsWatchers.forEach(callback => {
		try {
			callback(newSettings)
		} catch (error) {
			console.error("[SettingsManager] Erro ao notificar watcher:", error)
		}
	})
}

/**
 * ForÃ§a o reload das configuraÃ§Ãµes do arquivo
 */
export function reloadSettings() {
	cachedSettings = null
	const newSettings = loadSettings()
	notifySettingsChanged(newSettings)
	return newSettings
}

/**
 * Verifica se uma mÃ¡quina existe em qualquer grupo
 */
export function findMachineInGroups(machineCode) {
	const settings = getSettings()
	
	for (const [groupName, groupConfig] of Object.entries(settings.machineGroups || {})) {
		const machines = groupConfig.machineMap || {}
		for (const [id, code] of Object.entries(machines)) {
			if (code === machineCode) {
				return { group: groupName, id, code }
			}
		}
	}
	
	return null
}

/**
 * Retorna estatÃ­sticas das configuraÃ§Ãµes
 */
export function getSettingsStats() {
	const settings = getSettings()
	const groups = settings.machineGroups || {}
	
	const stats = {
		totalGroups: Object.keys(groups).length,
		totalMachines: 0,
		groupStats: {},
		networkStatus: {
			networkAvailable: false,
			networkFileExists: false,
			localFileExists: false,
			networkPath: NETWORK_SETTINGS_FILE,
			localPath: getLocalSettingsPath()
		}
	}
	
	// Verifica status dos arquivos
	try {
		stats.networkStatus.networkAvailable = fs.existsSync(NETWORK_CONFIG_DIR)
		stats.networkStatus.networkFileExists = fs.existsSync(NETWORK_SETTINGS_FILE)
		stats.networkStatus.localFileExists = fs.existsSync(getLocalSettingsPath())
	} catch (error) {
		// Ignore errors
	}
	
	for (const [groupName, groupConfig] of Object.entries(groups)) {
		const machineCount = Object.keys(groupConfig.machineMap || {}).length
		stats.totalMachines += machineCount
		stats.groupStats[groupName] = {
			name: groupConfig.name || groupName,
			machineCount,
			baseDir: groupConfig.baseDir || settings.baseDir
		}
	}
	
	return stats
}

/**
 * Verifica se o arquivo de configuraÃ§Ãµes da rede estÃ¡ acessÃ­vel
 */
export function checkNetworkAccess() {
	try {
		return fs.existsSync(NETWORK_CONFIG_DIR)
	} catch (error) {
		return false
	}
}

/**
 * ObtÃ©m informaÃ§Ãµes sobre o status das configuraÃ§Ãµes
 */
export function getSettingsStatus() {
	const status = {
		networkAvailable: false,
		networkFileExists: false,
		localFileExists: false,
		networkPath: NETWORK_SETTINGS_FILE,
		localPath: getLocalSettingsPath()
	}

	try {
		status.networkAvailable = fs.existsSync(NETWORK_CONFIG_DIR)
		status.networkFileExists = fs.existsSync(NETWORK_SETTINGS_FILE)
	} catch (error) {
		// Network not accessible
	}

	try {
		status.localFileExists = fs.existsSync(getLocalSettingsPath())
	} catch (error) {
		// Local file not accessible
	}

	return status
}

// InicializaÃ§Ã£o
export function initializeSettingsManager() {
	console.log("[Settings] ðŸš€ Inicializando sistema de configuraÃ§Ãµes centralizado...")
	
	// Verifica se deve forÃ§ar modo offline via variÃ¡vel de ambiente
	if (process.env.FORCE_OFFLINE_MODE === 'true' || process.env.NODE_ENV === 'development') {
		console.log('[Settings] ðŸ”’ Modo offline forÃ§ado via env ou dev mode')
		isOfflineMode = true
		networkCheckDone = true
	}
	
	try {
		const settings = loadSettings()
		console.log(`[Settings] âœ… Sistema inicializado com sucesso`)
		console.log(`[Settings] ðŸ“Š Grupos configurados: ${Object.keys(settings.machineGroups || {}).length}`)
		
		// Log do status da rede
		const status = getSettingsStatus()
		console.log(`[Settings] ðŸŒ Modo: ${isOfflineMode ? 'OFFLINE' : 'ONLINE'}`)
		console.log(`[Settings] ðŸŒ Rede disponÃ­vel: ${status.networkAvailable}`)
		console.log(`[Settings] ðŸ“ Arquivo na rede: ${status.networkFileExists}`)
		
		return settings
	} catch (error) {
		console.error('[Settings] âŒ Erro na inicializaÃ§Ã£o:', error)
		return getDefaultSettings()
	}
}

/**
 * Retorna se o sistema estÃ¡ em modo offline
 */
export function isInOfflineMode() {
	return isOfflineMode
}

/**
 * ForÃ§a o modo offline (Ãºtil para testes locais)
 */
export function setOfflineMode(enabled) {
	isOfflineMode = enabled
	networkCheckDone = true
	console.log(`[Settings] ${enabled ? 'ðŸ”’' : 'ðŸŒ'} Modo offline ${enabled ? 'ativado' : 'desativado'} manualmente`)
}

/**
 * Reseta completamente todas as configuraÃ§Ãµes
 * Remove o arquivo de configuraÃ§Ã£o da rede e local, forÃ§ando uso dos padrÃµes
 */
export function resetAllSettings() {
	try {
		console.log("[Settings] ðŸ”„ Iniciando reset completo das configuraÃ§Ãµes...")
		
		// Remove arquivo da rede se existir
		if (fs.existsSync(NETWORK_SETTINGS_FILE)) {
			fs.unlinkSync(NETWORK_SETTINGS_FILE)
			console.log("[Settings] âœ… Arquivo de configuraÃ§Ã£o da rede removido")
		}
		
		// Remove arquivo local se existir
		const localPath = getLocalSettingsPath()
		if (fs.existsSync(localPath)) {
			fs.unlinkSync(localPath)
			console.log("[Settings] âœ… Arquivo de configuraÃ§Ã£o local removido")
		}
		
		// Limpa cache
		cachedSettings = null
		
		// Recarrega com padrÃµes
		cachedSettings = getDefaultSettings()
		
		// Notifica watchers
		notifySettingsChanged(cachedSettings)
		
		console.log("[Settings] âœ… Reset completo realizado com sucesso")
		return { success: true, message: "ConfiguraÃ§Ãµes resetadas para os padrÃµes mais recentes" }
		
	} catch (error) {
		console.error("[Settings] âŒ Erro no reset:", error)
		throw error
	}
}

// Export so other modules (main/server) can call this explicitly via IPC
export { createDefaultNetworkSettings }