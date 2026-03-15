import { promises as fs } from "fs"
import { join } from "path"
import { getGroupConfig, addSettingsWatcher } from "./settingsManager.js"

// Sistema automático: não mais hardcoded - usa configurações centralizadas
let settingsUnsubscribe = null

// Monitora mudanças nas configurações
function initializeAutoSync() {
	if (settingsUnsubscribe) {
		settingsUnsubscribe()
	}
	
	settingsUnsubscribe = addSettingsWatcher((newSettings) => {
		console.log("[getOccupationData] Configurações atualizadas automaticamente:", 
			Object.keys(newSettings.machineGroups || {}).map(group => 
				`${group}: ${Object.keys(newSettings.machineGroups[group].machineMap || {}).length} máquinas`
			).join(", ")
		)
	})
}

// Inicializa o sistema automático
initializeAutoSync()

function getMachineStatus(content, mtime) {
	const now = Date.now()
	if (now - mtime > 6000) return "offline"
	if (/CUT|PAUSAR/i.test(content)) return "working"
	if (/PAUSE/i.test(content)) return "stopped"
	return "offline"
}

async function getOccupationData(group = "Laser") {
	// Sistema automático: obtém configurações em tempo real
	const { baseDir, machineMap } = getGroupConfig(group)
	const ids = Object.keys(machineMap).map(Number)
	
	console.log(`[getOccupationData] Processando grupo ${group} com ${ids.length} máquinas`)
	
	const occupationData = await Promise.all(
		ids.map(async (id) => {
			const computer = machineMap[id]
			const registroPath = join(baseDir, computer, "registro.txt")
			let status = "offline"
			let speed = 0
			try {
				const stat = await fs.stat(registroPath)
				const content = await fs.readFile(registroPath, "utf8")
				console.log(`Máquina ${id} (${computer}):`)
				console.log(`Arquivo: ${registroPath}`)
				console.log(`Conteúdo:`, content)
				status = getMachineStatus(content, stat.mtimeMs)
			} catch (e) {
				console.log(`Erro ao ler ${registroPath}:`, e.message)
				status = "offline"
			}
			return { id, speed, status }
		}),
	)
	return occupationData
}

export default getOccupationData
