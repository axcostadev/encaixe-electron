const fs = require("fs")
const path = require("path")

const file = path.join(__dirname, "..", "data", "turno_report.json")
const json = JSON.parse(fs.readFileSync(file, "utf8"))

const date = "2025-09-24"
const turno = 2

const matches = json.turnoReports.filter(
	(r) => r.date === date && r.turno === turno,
)
console.log("total", matches.length)
console.log(matches.slice(0, 10))
