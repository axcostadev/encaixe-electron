const fs = require("fs")
const path = require("path")

const dataPath = path.join(process.cwd(), "data", "turno_report.json")

function safeReadJSON(p) {
	if (!fs.existsSync(p)) {
		console.error("Arquivo não encontrado:", p)
		process.exit(1)
	}
	try {
		const raw = fs.readFileSync(p, "utf8")
		return JSON.parse(raw)
	} catch (e) {
		console.error("Erro ao ler JSON:", e.message)
		process.exit(1)
	}
}

const data = safeReadJSON(dataPath)
const records = Array.isArray(data.turnoReports) ? data.turnoReports : []

const byDate = {}
const byDateTurno = {}

for (const r of records) {
	const date = String(r.date || "unknown")
	const turno = String(r.turno ?? "unknown")
	byDate[date] = (byDate[date] || 0) + 1
	const key = `${date}|${turno}`
	byDateTurno[key] = (byDateTurno[key] || 0) + 1
}

console.log("Total de registros no arquivo:", records.length)
console.log("Contagem por data:")
Object.entries(byDate)
	.sort((a, b) => b[1] - a[1])
	.forEach(([d, c]) => {
		console.log(`  ${d}: ${c}`)
	})

console.log("\nContagem por data+turno:")
Object.entries(byDateTurno)
	.sort((a, b) => b[1] - a[1])
	.forEach(([k, c]) => {
		const [d, t] = k.split("|")
		console.log(`  ${d} turno ${t}: ${c}`)
	})

// Exibir alguns registros de hoje (se existirem)
const today = new Date()
const y = today.getFullYear()
const m = String(today.getMonth() + 1).padStart(2, "0")
const day = String(today.getDate()).padStart(2, "0")
const todayStr = `${y}-${m}-${day}`

const todayRecords = records.filter((r) => r.date === todayStr)
console.log(`\nRegistros para hoje (${todayStr}): ${todayRecords.length}`)
if (todayRecords.length > 0) {
	console.log("Amostra (até 10):")
	todayRecords
		.slice(0, 10)
		.forEach((r) =>
			console.log(
				`  id:${r.id} maquina:${r.maquina} periodo:${r.periodo} turno:${r.turno} pct:${r.porcentagem}`,
			),
		)
}

console.log("\nOK")
