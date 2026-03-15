// db.js
// Serviço para manipulação do banco SQLite - VERSÃO TEMPORÁRIA SEM BETTER-SQLITE3

// Mock do banco de dados para desenvolvimento temporário
const mockDatabase = {
	// Dados mockados para desenvolvimento
	turnoReport: [
		{
			id: 1,
			date: "2024-01-15",
			turno: 1,
			maquina: "Maq-001",
			periodo: "Manhã",
			porcentagem: 85.5,
		},
		{
			id: 2,
			date: "2024-01-15",
			turno: 2,
			maquina: "Maq-002",
			periodo: "Tarde",
			porcentagem: 92.3,
		},
		{
			id: 3,
			date: "2024-01-15",
			turno: 3,
			maquina: "Maq-003",
			periodo: "Noite",
			porcentagem: 78.1,
		},
	],
}

// Mock das funções do banco
const db = {
	prepare: (query) => ({
		all: () => {
			console.log("Mock DB Query:", query)
			// Retorna dados mockados baseado na query
			if (query.includes("turno_report")) {
				return mockDatabase.turnoReport
			}
			return []
		},
		run: (data) => {
			console.log("Mock DB Insert:", data)
			return { lastInsertRowid: Math.floor(Math.random() * 1000) }
		},
	}),
}

// Função de inicialização mockada
const initializeDatabase = () => {
	console.log("Mock database initialized")
}

// Funções de consulta mockadas
const getTurnoReport = (startDate, endDate) => {
	console.log(`Getting turno report from ${startDate} to ${endDate}`)
	return mockDatabase.turnoReport
}

const normalizePeriodo = (p) => {
	if (!p || typeof p !== "string") return null
	let cleaned = p.replace(/\s+/g, "").replace(/–|—/g, "-")
	const parts = cleaned.split("-")
	if (parts.length !== 2) return null
	const normPart = (part) => {
		const [h, m] = part.split(":")
		if (m === undefined) return null
		const hh = h.padStart(2, "0")
		const mm = m.padStart(2, "0")
		const hi = parseInt(hh, 10)
		const mi = parseInt(mm, 10)
		if (isNaN(hi) || isNaN(mi)) return null
		if (hi < 0 || hi > 23 || mi < 0 || mi > 59) return null
		return `${hh}:${mm}`
	}
	const a = normPart(parts[0])
	const b = normPart(parts[1])
	if (!a || !b) return null
	return `${a}-${b}`
}

const insertTurnoReport = (data) => {
	console.log("Inserting turno report:", data)
	const normalized = normalizePeriodo(data.periodo)
	if (!normalized) {
		console.warn(`Periodo inválido no mock insert: "${data.periodo}"`)
		throw new Error(
			"Formato de periodo inválido no mock. Deve ser 'HH:MM-HH:MM'.",
		)
	}
	// Normalize turno: accept 0..2, accept 1..3 (convert to 0..2), or infer from periodo
	let normalizedTurno = null
	if (typeof data.turno === "number") {
		if (data.turno >= 0 && data.turno <= 2) normalizedTurno = data.turno
		else if (data.turno >= 1 && data.turno <= 3)
			normalizedTurno = data.turno - 1
	}
	if (normalizedTurno === null) {
		// infer from periodo
		const start = normalized.split("-")[0]
		const [hh] = start.split(":")
		const h = parseInt(hh, 10)
		if (!Number.isNaN(h)) {
			if (h >= 5 && h < 13) normalizedTurno = 0
			else if (h >= 13 && h < 21) normalizedTurno = 1
			else normalizedTurno = 2
		} else normalizedTurno = 2
	}
	// For 3rd turno, if periodo starts after midnight, assign to previous day
	let storedDate = data.date
	try {
		if (normalizedTurno === 2 && typeof data.date === "string") {
			const start = normalized.split("-")[0]
			const [sh] = start.split(":").map((v) => parseInt(v, 10))
			if (!Number.isNaN(sh) && sh >= 0 && sh <= 4) {
				const d = new Date(data.date)
				d.setDate(d.getDate() - 1)
				storedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
			}
		}
	} catch (_e) {
		console.debug("db-mock: falha ao ajustar data de periodo noturno", _e)
	}
	const newId = mockDatabase.turnoReport.length + 1
	mockDatabase.turnoReport.push({
		id: newId,
		...data,
		periodo: normalized,
		turno: normalizedTurno,
		date: storedDate,
	})
	return newId
}

// Inicializa o banco mockado
initializeDatabase()

export { db, getTurnoReport, insertTurnoReport }
