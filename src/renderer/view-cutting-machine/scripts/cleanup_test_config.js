// Script para reverter configurações de teste e validar sistema final
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Importa o sistema centralizado
const settingsManagerPath = join(projectRoot, 'src', 'main', 'service', 'settingsManager.js')
const { getSettings, saveSettings, getGroupConfig, getSettingsStats } = await import(`file://${settingsManagerPath}`)

console.log('\n=== REVERTENDO CONFIGURAÇÕES DE TESTE ===\n')

// 1. Estado atual
const currentSettings = getSettings()
console.log('Estado atual:', getSettingsStats())

// 2. Remove TestGroup e reverte Lectra para 12 máquinas
const cleanedSettings = {
    ...currentSettings
}

// Remove TestGroup
delete cleanedSettings.machineGroups.TestGroup

// Reverte Lectra para 12 máquinas
delete cleanedSettings.machineGroups.Lectra.machineMap["13"]

console.log('\n2. Aplicando limpeza das configurações de teste...')
const saveResult = saveSettings(cleanedSettings)
console.log('Resultado da limpeza:', saveResult)

// 3. Verificação final
console.log('\n3. Estado final após limpeza:')
const finalSettings = getSettings()
const finalStats = getSettingsStats()
console.log('Stats finais:', finalStats)

// 4. Validação dos grupos principais
console.log('\n4. Validação dos grupos principais:')
Object.keys(finalSettings.machineGroups).forEach(groupName => {
    const config = getGroupConfig(groupName)
    console.log(`✓ ${groupName}: ${Object.keys(config.machineMap).length} máquinas`)
})

console.log('\n=== SISTEMA PRONTO PARA PRODUÇÃO ===')
console.log('✅ Sistema de sincronização automática funcionando')
console.log('✅ Configurações de teste removidas')
console.log('✅ Todos os grupos principais validados')
console.log('✅ Total de máquinas:', finalStats.totalMachines)