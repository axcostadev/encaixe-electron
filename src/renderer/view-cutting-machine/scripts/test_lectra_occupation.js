const { getMachineOccupation } = require("../src/main/service/getMachineAmountOcuppation.js")
const getOccupationData = require("../src/main/service/getOccupationData.js").default

async function testLectraOccupation() {
	console.log("=== TESTE DA SEÇÃO 'OCUPAÇÃO TEMPO REAL - Lectra' ===\n")
	
	try {
		console.log("📊 Testando getMachineOccupation para grupo Lectra...")
		const occupationResult = getMachineOccupation("Lectra")
		console.log("✅ getMachineOccupation executou com sucesso")
		
		const machineCount = Object.keys(occupationResult).length
		console.log(`📈 Máquinas encontradas: ${machineCount}`)
		
		if (machineCount === 12) {
			console.log("✅ Correto! 12 máquinas encontradas para Lectra")
		} else {
			console.log(`❌ Erro! Esperado 12 máquinas, encontrado ${machineCount}`)
		}
		
		console.log("\n📋 Lista de máquinas encontradas:")
		Object.keys(occupationResult).forEach((machine, index) => {
			console.log(`   ${index + 1}. ${machine}`)
		})
		
		console.log("\n📊 Testando getOccupationData para grupo Lectra...")
		const occupationData = await getOccupationData("Lectra")
		console.log("✅ getOccupationData executou com sucesso")
		
		console.log(`📈 Dados de ocupação recebidos: ${occupationData.length} máquinas`)
		
		if (occupationData.length === 12) {
			console.log("✅ Correto! 12 máquinas nos dados de ocupação")
		} else {
			console.log(`❌ Erro! Esperado 12 máquinas, encontrado ${occupationData.length}`)
		}
		
		console.log("\n📋 Dados de ocupação por máquina:")
		occupationData.forEach((data, index) => {
			console.log(`   ${index + 1}. ID: ${data.id}, Status: ${data.status}, Speed: ${data.speed}`)
		})
		
		console.log("\n🎯 RESULTADO:")
		if (machineCount === 12 && occupationData.length === 12) {
			console.log("✅ SUCESSO! A seção 'OCUPAÇÃO TEMPO REAL - Lectra' agora deve mostrar 12 máquinas")
		} else {
			console.log("❌ PROBLEMA! Nem todas as máquinas estão sendo detectadas corretamente")
		}
		
	} catch (error) {
		console.error("❌ Erro durante o teste:", error.message)
		console.error("Stack:", error.stack)
	}
}

testLectraOccupation()