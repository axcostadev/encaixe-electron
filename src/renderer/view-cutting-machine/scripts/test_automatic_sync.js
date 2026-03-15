// Test script para verificar sincronização automática
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Importa o sistema centralizado
const settingsManagerPath = join(projectRoot, 'src', 'main', 'service', 'settingsManager.js')
const { getSettings, saveSettings, getGroupConfig, getSettingsStats } = await import(`file://${settingsManagerPath}`)

console.log('\n=== TESTE DE SINCRONIZAÇÃO AUTOMÁTICA ===\n')

// 1. Estado inicial
console.log('1. Estado inicial das configurações:')
const initialSettings = getSettings()
console.log('Stats iniciais:', getSettingsStats())

// 2. Testa mudança em Lectra (de 12 para 13 máquinas)
console.log('\n2. Adicionando 13ª máquina ao grupo Lectra:')
const newSettings = {
    ...initialSettings,
    machineGroups: {
        ...initialSettings.machineGroups,
        Lectra: {
            ...initialSettings.machineGroups.Lectra,
            machineMap: {
                ...initialSettings.machineGroups.Lectra.machineMap,
                "13": "Lectra 13"
            }
        }
    }
}

const saveResult = saveSettings(newSettings)
console.log('Resultado do save:', saveResult)
console.log('Stats após save:', getSettingsStats())

// 3. Verifica se a mudança foi aplicada
console.log('\n3. Verificando se mudança foi aplicada:')
const updatedSettings = getSettings()
const lectraConfig = getGroupConfig('Lectra')
console.log('Máquinas Lectra após update:', Object.keys(lectraConfig.machineMap).length)
console.log('Nova máquina 13:', lectraConfig.machineMap["13"])

// 4. Testa adição de novo grupo
console.log('\n4. Testando adição de novo grupo "TestGroup":')
const settingsWithNewGroup = {
    ...updatedSettings,
    machineGroups: {
        ...updatedSettings.machineGroups,
        TestGroup: {
            machineMap: {
                "1": "Test Machine 1",
                "2": "Test Machine 2"
            },
            activeDir: "TestGroup"
        }
    }
}

const saveResult2 = saveSettings(settingsWithNewGroup)
console.log('Resultado do save novo grupo:', saveResult2)
console.log('Stats finais:', getSettingsStats())

// 5. Verificação final
console.log('\n5. Verificação final de todos os grupos:')
const finalSettings = getSettings()
Object.keys(finalSettings.machineGroups).forEach(groupName => {
    const config = getGroupConfig(groupName)
    console.log(`- ${groupName}: ${Object.keys(config.machineMap).length} máquinas`)
})

console.log('\n=== TESTE CONCLUÍDO ===')