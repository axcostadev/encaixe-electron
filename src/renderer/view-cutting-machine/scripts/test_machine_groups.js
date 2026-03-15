const fs = require("fs")
const path = require("path")

function testMachineGroups() {
	try {
		console.log("=== TESTE DE CONFIGURAÇÃO DOS GRUPOS DE MÁQUINAS ===\n")
		
		const projectRoot = process.cwd()
		const dataDir = path.join(projectRoot, "data")
		const settingsPath = path.join(dataDir, "settings.json")
		
		if (!fs.existsSync(settingsPath)) {
			console.error("❌ Arquivo settings.json não encontrado em:", settingsPath)
			return
		}
		
		const raw = fs.readFileSync(settingsPath, "utf8")
		const settings = JSON.parse(raw)
		
		console.log("✅ Arquivo settings.json carregado com sucesso\n")
		
		if (!settings.machineGroups) {
			console.error("❌ Propriedade machineGroups não encontrada")
			return
		}
		
		const expectedGroups = ["Laser", "Emma", "Comelz", "Lectra"]
		
		for (const groupName of expectedGroups) {
			console.log(`📁 Grupo: ${groupName}`)
			
			const group = settings.machineGroups[groupName]
			if (!group) {
				console.log(`   ❌ Grupo ${groupName} não encontrado`)
				continue
			}
			
			console.log(`   📛 Nome: ${group.name || "não definido"}`)
			console.log(`   📂 BaseDir: ${group.baseDir || "não definido"}`)
			
			if (!group.machineMap || Object.keys(group.machineMap).length === 0) {
				console.log(`   ❌ MachineMap vazio para ${groupName}`)
			} else {
				const machineCount = Object.keys(group.machineMap).length
				console.log(`   ✅ Máquinas: ${machineCount} configuradas`)
				
				// Mostra as primeiras 3 máquinas
				const machines = Object.entries(group.machineMap).slice(0, 3)
				machines.forEach(([id, code]) => {
					console.log(`      ${id}: ${code}`)
				})
				if (machineCount > 3) {
					console.log(`      ... e mais ${machineCount - 3} máquinas`)
				}
			}
			console.log("")
		}
		
		console.log("🎯 RESUMO:")
		const totalGroups = Object.keys(settings.machineGroups).length
		const totalMachines = Object.values(settings.machineGroups)
			.reduce((total, group) => total + Object.keys(group.machineMap || {}).length, 0)
		
		console.log(`   - ${totalGroups} grupos configurados`)
		console.log(`   - ${totalMachines} máquinas no total`)
		
		// Verifica se todos os grupos esperados estão presentes
		const missingGroups = expectedGroups.filter(name => !settings.machineGroups[name])
		if (missingGroups.length > 0) {
			console.log(`   ⚠️  Grupos faltando: ${missingGroups.join(", ")}`)
		} else {
			console.log(`   ✅ Todos os grupos esperados estão configurados`)
		}
		
	} catch (error) {
		console.error("❌ Erro durante o teste:", error.message)
	}
}

testMachineGroups()