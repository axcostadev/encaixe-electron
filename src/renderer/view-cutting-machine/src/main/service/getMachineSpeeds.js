import { promises as fs } from "fs"
import path from "path"
import { getSettings, getGroupConfig, addSettingsWatcher } from "./settingsManager.js"

// Sistema automático: não mais hardcoded - usa configurações centralizadas
let settingsUnsubscribe = null

// Monitora mudanças nas configurações
function initializeAutoSync() {
	if (settingsUnsubscribe) {
		settingsUnsubscribe()
	}
	
	settingsUnsubscribe = addSettingsWatcher((newSettings) => {
		console.log("[getMachineSpeeds] Configurações atualizadas automaticamente:", 
			Object.keys(newSettings.machineGroups || {}).map(group => 
				`${group}: ${Object.keys(newSettings.machineGroups[group].machineMap || {}).length} máquinas`
			).join(", ")
		)
	})
}

// Inicializa o sistema automático
initializeAutoSync()

async function getMachineSpeeds() {
	const allSpeeds = []
	
	// Sistema automático: obtém configurações em tempo real
	const settings = getSettings()
	const machineGroups = settings.machineGroups || {}

	// Processa todas as máquinas de todos os grupos
	for (const [groupName, groupData] of Object.entries(machineGroups)) {
		const { baseDir, machineMap } = getGroupConfig(groupName)

		console.log(`[getMachineSpeeds] Processando grupo ${groupName} com ${Object.keys(machineMap).length} máquinas`)

		const speedPromises = Object.entries(machineMap).map(
			async ([id, machineFolder]) => {
				const configFileName =
					groupName === "Laser" ? "LaserConfig.ini" : "registro.txt"
				const configPath = path.join(baseDir, machineFolder, configFileName)

				try {
					const content = await fs.readFile(configPath, "utf8")

					if (groupName === "Laser") {
						// Para Laser, procura WORKSPEED no arquivo .ini
						const match = content.match(/WORKSPEED\s*=\s*([0-9.]+)/i)
						if (match) {
							const speed = parseInt(match[1].split(".")[0], 10)
							return { id: Number(id), speed }
						}
					} else {
						// Para Emma e Lectra, extrai velocidade do arquivo registro.txt
						// Assumindo que o formato inclui a velocidade de alguma forma
						// Você pode ajustar esta lógica conforme o formato real do arquivo
						const speedMatch =
							content.match(/SPEED[:\s]*([0-9]+)/i) ||
							content.match(/VEL[:\s]*([0-9]+)/i) ||
							content.match(/([0-9]+)\s*%/i)
						if (speedMatch) {
							return { id: Number(id), speed: parseInt(speedMatch[1], 10) }
						}
					}

					return { id: Number(id), speed: null }
				} catch {
					// Se o arquivo não existir ou erro de leitura, retorna null no speed
					return { id: Number(id), speed: null }
				}
			},
		)

		const groupSpeeds = await Promise.all(speedPromises)
		allSpeeds.push(...groupSpeeds)
	}

	return allSpeeds
}

// Executa a função e imprime resultado formatado
getMachineSpeeds()
	.then((data) => {
		console.log(JSON.stringify(data, null, 2))
	})
	.catch((err) => {
		console.error("Erro ao obter velocidades:", err)
	})

export default getMachineSpeeds
