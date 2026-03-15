const fs = require("fs")
const path = require("path")

const filePath = path.join(process.cwd(), "data", "turno_report.json")

function toMinutes(h) {
	const [hh, mm] = h.split(":").map(Number)
	return hh * 60 + mm
}

function getTurnoFromPeriodStart(periodo) {
	// periodo expected like 'HH:MM-HH:MM'
	const inicio = periodo.split("-")[0]
	const start = toMinutes(inicio)
	const t1Start = toMinutes("05:00")
	const t1End = toMinutes("13:20")
	const t2Start = toMinutes("13:20")
	const t2End = toMinutes("21:40")

	if (start >= t1Start && start < t1End) return 0
	if (start >= t2Start && start < t2End) return 1
	// else night
	return 2
}

function main() {
	if (!fs.existsSync(filePath)) {
		console.error("Arquivo não encontrado:", filePath)
		process.exit(1)
	}

	const raw = fs.readFileSync(filePath, "utf8")
	const data = JSON.parse(raw)
	if (!Array.isArray(data.turnoReports)) {
		console.error("Formato inesperado no JSON")
		process.exit(1)
	}

	let changed = 0
	data.turnoReports.forEach((r) => {
		if (!r.periodo) return
		const correct = getTurnoFromPeriodStart(r.periodo)
		if (r.turno !== correct) {
			r.turno = correct
			changed++
		}
	})

	data.lastModified = new Date().toISOString()
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
	console.log(`Migração concluída. Registros alterados: ${changed}`)
}

main()
