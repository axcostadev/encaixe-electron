import { useEffect, useState } from "react"

export type Periodo = { inicio: string; fim: string; baseCalculo: number }

export type PeriodosConfig = {
	turno1: Periodo[]
	turno2: Periodo[]
	turno3: Periodo[]
}

const defaultPeriodosTurno1: Periodo[] = [
	{ inicio: "05:00", fim: "06:00", baseCalculo: 60 },
	{ inicio: "06:00", fim: "07:00", baseCalculo: 50 },
	{ inicio: "07:00", fim: "08:00", baseCalculo: 60 },
	{ inicio: "08:00", fim: "09:00", baseCalculo: 40 },
	{ inicio: "09:00", fim: "10:00", baseCalculo: 20 },
	{ inicio: "10:00", fim: "11:00", baseCalculo: 60 },
	{ inicio: "11:00", fim: "12:00", baseCalculo: 50 },
	{ inicio: "12:00", fim: "13:20", baseCalculo: 80 },
]

const defaultPeriodosTurno2: Periodo[] = [
	{ inicio: "13:20", fim: "14:00", baseCalculo: 40 },
	{ inicio: "14:00", fim: "15:00", baseCalculo: 60 },
	{ inicio: "15:00", fim: "16:00", baseCalculo: 50 },
	{ inicio: "16:00", fim: "17:00", baseCalculo: 60 },
	{ inicio: "17:00", fim: "18:00", baseCalculo: 0 },
	{ inicio: "18:00", fim: "19:00", baseCalculo: 60 },
	{ inicio: "19:00", fim: "20:00", baseCalculo: 60 },
	{ inicio: "20:00", fim: "21:40", baseCalculo: 90 },
]

const defaultPeriodosTurno3: Periodo[] = [
	{ inicio: "21:40", fim: "22:00", baseCalculo: 20 },
	{ inicio: "22:00", fim: "23:00", baseCalculo: 60 },
	{ inicio: "23:00", fim: "00:00", baseCalculo: 50 },
	{ inicio: "00:00", fim: "01:00", baseCalculo: 40 },
	{ inicio: "01:00", fim: "02:00", baseCalculo: 20 },
	{ inicio: "02:00", fim: "03:00", baseCalculo: 60 },
	{ inicio: "03:00", fim: "04:00", baseCalculo: 50 },
	{ inicio: "04:00", fim: "05:00", baseCalculo: 60 },
]

export const DEFAULT_PERIODOS_CONFIG: PeriodosConfig = {
	turno1: defaultPeriodosTurno1,
	turno2: defaultPeriodosTurno2,
	turno3: defaultPeriodosTurno3,
}

/**
 * Hook that loads the períodos config from local IPC (never network).
 * Falls back to hardcoded defaults if IPC is unavailable.
 */
export function usePeriodosConfig(): PeriodosConfig {
	const [config, setConfig] = useState<PeriodosConfig>(DEFAULT_PERIODOS_CONFIG)

	useEffect(() => {
		let mounted = true
		;(async () => {
			try {
				const ipcHelper = (await import("../lib/ipcHelper")).default
				const res = await ipcHelper.invoke("get-periodos-config")
				if (mounted && res && res.success && res.config) {
					setConfig({
						turno1: res.config.turno1?.length ? res.config.turno1 : defaultPeriodosTurno1,
						turno2: res.config.turno2?.length ? res.config.turno2 : defaultPeriodosTurno2,
						turno3: res.config.turno3?.length ? res.config.turno3 : defaultPeriodosTurno3,
					})
				}
			} catch {
				// fallback to defaults already set
			}
		})()
		return () => { mounted = false }
	}, [])

	return config
}
