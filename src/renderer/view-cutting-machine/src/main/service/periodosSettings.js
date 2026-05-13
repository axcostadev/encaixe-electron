/**
 * periodosSettings.js
 *
 * Gerencia a configuração de períodos (baseCalculo) dos turnos.
 * ARMAZENAMENTO 100% LOCAL — nunca vai para a rede.
 * Salva em app.getPath('userData') / periodos-config.json
 */

import { app } from "electron"
import fs from "fs"
import path from "path"

const FILENAME = "periodos-config.json"

function getFilePath() {
	return path.join(app.getPath("userData"), FILENAME)
}

const DEFAULT_PERIODOS = {
	turno1: [
		{ inicio: "05:00", fim: "06:00", baseCalculo: 60 },
		{ inicio: "06:00", fim: "07:00", baseCalculo: 50 },
		{ inicio: "07:00", fim: "08:00", baseCalculo: 60 },
		{ inicio: "08:00", fim: "09:00", baseCalculo: 40 },
		{ inicio: "09:00", fim: "10:00", baseCalculo: 20 },
		{ inicio: "10:00", fim: "11:00", baseCalculo: 60 },
		{ inicio: "11:00", fim: "12:00", baseCalculo: 50 },
		{ inicio: "12:00", fim: "13:20", baseCalculo: 80 },
	],
	turno2: [
		{ inicio: "13:20", fim: "14:00", baseCalculo: 40 },
		{ inicio: "14:00", fim: "15:00", baseCalculo: 60 },
		{ inicio: "15:00", fim: "16:00", baseCalculo: 50 },
		{ inicio: "16:00", fim: "17:00", baseCalculo: 60 },
		{ inicio: "17:00", fim: "18:00", baseCalculo: 0 },
		{ inicio: "18:00", fim: "19:00", baseCalculo: 60 },
		{ inicio: "19:00", fim: "20:00", baseCalculo: 60 },
		{ inicio: "20:00", fim: "21:40", baseCalculo: 90 },
	],
	turno3: [
		{ inicio: "21:40", fim: "22:00", baseCalculo: 20 },
		{ inicio: "22:00", fim: "23:00", baseCalculo: 60 },
		{ inicio: "23:00", fim: "00:00", baseCalculo: 50 },
		{ inicio: "00:00", fim: "01:00", baseCalculo: 40 },
		{ inicio: "01:00", fim: "02:00", baseCalculo: 20 },
		{ inicio: "02:00", fim: "03:00", baseCalculo: 60 },
		{ inicio: "03:00", fim: "04:00", baseCalculo: 50 },
		{ inicio: "04:00", fim: "05:00", baseCalculo: 60 },
	],
}

export function getPeriodosConfig() {
	try {
		const filePath = getFilePath()
		if (!fs.existsSync(filePath)) {
			return structuredClone(DEFAULT_PERIODOS)
		}
		const raw = fs.readFileSync(filePath, "utf-8")
		const parsed = JSON.parse(raw)
		// Merge com defaults para garantir que todos os campos existam
		return {
			turno1: parsed.turno1 ?? DEFAULT_PERIODOS.turno1,
			turno2: parsed.turno2 ?? DEFAULT_PERIODOS.turno2,
			turno3: parsed.turno3 ?? DEFAULT_PERIODOS.turno3,
		}
	} catch (err) {
		console.error("[periodosSettings] Erro ao ler:", err)
		return structuredClone(DEFAULT_PERIODOS)
	}
}

export function savePeriodosConfig(config) {
	try {
		if (!config || typeof config !== "object") {
			return { success: false, error: "Payload inválido" }
		}
		// Valida estrutura mínima
		for (const turno of ["turno1", "turno2", "turno3"]) {
			if (!Array.isArray(config[turno])) {
				return { success: false, error: `${turno} deve ser um array` }
			}
			for (const p of config[turno]) {
				if (typeof p.baseCalculo !== "number" || p.baseCalculo < 0 || p.baseCalculo > 999) {
					return { success: false, error: `baseCalculo inválido em ${turno}: ${p.baseCalculo}` }
				}
			}
		}
		const filePath = getFilePath()
		fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8")
		console.log("[periodosSettings] Salvo localmente em:", filePath)
		return { success: true }
	} catch (err) {
		console.error("[periodosSettings] Erro ao salvar:", err)
		return { success: false, error: String(err) }
	}
}

export function getDefaultPeriodosConfig() {
	return structuredClone(DEFAULT_PERIODOS)
}
