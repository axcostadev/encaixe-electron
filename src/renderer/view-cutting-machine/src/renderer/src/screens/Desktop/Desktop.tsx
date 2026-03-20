import {
	CheckCircle,
	Info,
	RotateCcw,
	Settings,
	XCircle,
	Zap,
	ZoomIn,
	ZoomOut,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import vulcabrasLogo from "../../assets/vulcabras-1024x358.jpg"
import { AboutDialog } from "../../components/AboutDialog"
import ClockAdjustDialog from "../../components/ClockAdjustDialog"
import ClockWidget from "../../components/ClockWidget"
import DraggableButton from "../../components/DraggableButton"
import { KpiCard } from "../../components/KpiCard"
import { OccupationCard } from "../../components/OccupationCard"

import { RankingChart } from "../../components/RankingChart"
import RelatorioBanco from "./RelatorioBanco"
import Setup from "./Setup"
import TurnoReport from "./TurnoReport"
import TurnoReportModeloA from "./TurnoReportModeloA"
import TurnoReportModeloB from "./TurnoReportModeloB"
import TurnoReportModeloC from "./TurnoReportModeloC"
import FatigueOverlay from "../../components/FatigueOverlay"

// Tipos para ocupação por períodos e máquinas
type OccupationPeriods = {
	[period: string]: number
}
type Occupation = {
	[machineCode: string]: OccupationPeriods
}

// Tipos para estado das máquinas
type MachineStatus = "working" | "stopped" | "offline"
type MachineSpeedStatus = {
	id: number
	speed: number
	status: MachineStatus
}

function parseStatus(status: string): MachineStatus {
	if (status === "working" || status === "stopped" || status === "offline") {
		return status
	}
	return "offline"
}

export const Desktop = (): React.ReactElement => {
	// Estado para carregamento e erro na aba de fechamento
	const [activeTab, setActiveTab] = useState<
		"atual" | "turno" | "banco" | "setup"
	>("atual")
	// Estado para controlar o modal "Sobre"
	const [isAboutOpen, setIsAboutOpen] = useState(false)
	// Estado para controlar o modal de ajuste de relógio
	const [isClockAdjustOpen, setIsClockAdjustOpen] = useState(false)
	// Clock access control
	const [showClockAuth, setShowClockAuth] = useState(false)
	const [clockPasswordInput, setClockPasswordInput] = useState("")
	const [clockError, setClockError] = useState<string | null>(null)
	const clockInputRef = useRef<HTMLInputElement | null>(null)
	// Setup access control
	const [showSetupAuth, setShowSetupAuth] = useState(false)
	const [setupPasswordInput, setSetupPasswordInput] = useState("")
	const [setupError, setSetupError] = useState<string | null>(null)
	const [setupAuthenticated, setSetupAuthenticated] = useState(false)

	// Autofocus ref for setup password input
	const setupInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		// Small timeout to ensure the modal content is mounted in the DOM
		let id: ReturnType<typeof setTimeout> | undefined
		if (showSetupAuth) {
			id = setTimeout(() => setupInputRef.current?.focus(), 50)
		}
		return () => {
			if (id !== undefined) clearTimeout(id)
		}
	}, [showSetupAuth])

	// Autofocus ref for clock password input
	useEffect(() => {
		let id: ReturnType<typeof setTimeout> | undefined
		if (showClockAuth) {
			id = setTimeout(() => clockInputRef.current?.focus(), 50)
		}
		return () => {
			if (id !== undefined) clearTimeout(id)
		}
	}, [showClockAuth])

	// Estado para controle de zoom
	const [zoomLevel, setZoomLevel] = useState(1)
	// Container que receberá o zoom (apenas o conteúdo, não os botões flutuantes)
	const zoomContainerRef = useRef<HTMLDivElement | null>(null)

	// Aplique o zoom apenas no container de conteúdo
	useEffect(() => {
		try {
			if (zoomContainerRef.current) {
				zoomContainerRef.current.style.zoom = `${zoomLevel}`
			}
		} catch (err) {
			console.warn("[Desktop] CSS zoom apply failed:", err)
		}
	}, [zoomLevel])

	// Garante que ao desmontar a tela o zoom volte ao normal (100%)
	useEffect(() => {
		return () => {
			try {
				// Reset only the zoom container, not the whole document
				if (zoomContainerRef.current) {
					zoomContainerRef.current.style.zoom = "1"
				}
			} catch (e) {
				// ignore (used to satisfy linter)
				void e
			}
		}
	}, [])

	const zoomIn = useCallback(() => {
		const newZoom = Math.min(zoomLevel + 0.05, 2)
		setZoomLevel(newZoom)
	}, [zoomLevel])

	const zoomOut = useCallback(() => {
		const newZoom = Math.max(zoomLevel - 0.05, 0.5)
		setZoomLevel(newZoom)
	}, [zoomLevel])

	const resetZoom = useCallback(() => {
		setZoomLevel(1)
	}, [])

	// Sub-abas para modelos de máquina na aba de relatório por turno
	const turnoModels = [
		{ label: "Laser", key: "laser" },
		{ label: "Lectra", key: "modeloA" },
		{ label: "Emma", key: "modeloB" },
		{ label: "Comelz", key: "modeloC" },
	]
	const [activeTurnoModel, setActiveTurnoModel] = useState("laser")

	// Default machine groups (fallback)
	const defaultMachineGroups = {
		Laser: {
			name: "LASER",
			machineMap: {
				1: "02-2010",
				2: "02-2416",
				3: "02-1765",
				4: "02-1702",
				5: "02-2388",
				6: "02-1804",
				7: "02-1867",
				8: "02-2871",
				9: "02-1767",
				10: "02-1868",
				11: "02-2840",
				12: "02-2830",
				13: "02-2831",
				14: "02-2832",
			},
		},
		Emma: {
			name: "EMMA",
			machineMap: {
				1: "02-2774",
				2: "02-2672",
				3: "02-2501",
				4: "02-2773",
			},
		},
		Comelz: {
			name: "COMELZ",
			machineMap: {
				1: "02-1555",
				2: "02-1556",
				3: "02-1558",
				4: "02-1507",
			},
		},
		Lectra: {
			name: "LECTRA",
			machineMap: {
				1: "02-1435",
				2: "02-2615",
				3: "02-1681",
				4: "02-1880",
				5: "02-1780",
				6: "02-1740",
				7: "02-2391",
				8: "02-2539",
				9: "02-1553",
				10: "02-1398",
				11: "02-1454",
			},
		},
	}

	// Machine groups for ranking section - now loaded from settings
	const [machineGroups, setMachineGroups] = useState(defaultMachineGroups)

	// Load machine groups from settings
	useEffect(() => {
		const loadMachineGroups = async () => {
			try {
				// Verificar se o IPC está disponível
				if (!window.electron || !window.electron.ipcRenderer) {
					console.error("[Desktop] IPC Renderer não está disponível para carregar configurações")
					// Usar configurações padrão
					setMachineGroups(defaultMachineGroups)
					return
				}

				console.log("[Desktop] Carregando configurações de máquinas...")
				const res = await window.electron.ipcRenderer.invoke("get-settings")
				
				if (res && res.success && res.settings && res.settings.machineGroups) {
					// Merge with defaults to ensure all groups exist
					const loadedGroups = res.settings.machineGroups
					const merged = { ...defaultMachineGroups }
					
					for (const groupKey of Object.keys(loadedGroups)) {
						if (loadedGroups[groupKey] && typeof loadedGroups[groupKey] === "object") {
							const groupConfig = loadedGroups[groupKey]
							merged[groupKey] = {
								name: groupConfig.name || groupKey.toUpperCase(),
								machineMap: groupConfig.machineMap || {}
							}
						}
					}
					setMachineGroups(merged)
					console.log("[Desktop] Configurações carregadas com sucesso")
				} else {
					console.warn("[Desktop] Configurações não encontradas, usando padrões")
					setMachineGroups(defaultMachineGroups)
				}
			} catch (error) {
				console.error("Erro ao carregar configurações de máquinas:", error)
				// Fallback para configurações padrão
				setMachineGroups(defaultMachineGroups)
			}
		}

		loadMachineGroups()

		// Listen for settings updates
		const handleSettingsUpdate = () => {
			loadMachineGroups()
			// Also other components listen for settings-saved to trigger updates
		}

		window.addEventListener("settings-saved", handleSettingsUpdate)
		
		return () => {
			window.removeEventListener("settings-saved", handleSettingsUpdate)
		}
	}, [])

	// Carrega especificamente as configurações de fadiga (frases, períodos, turno)
	useEffect(() => {
		const loadFatigueSettings = async () => {
			try {
				if (!window.electron || !window.electron.ipcRenderer) return
				const res = await window.electron.ipcRenderer.invoke("get-settings")
				if (res && res.success && res.settings && res.settings.fatigue) {
					const f = res.settings.fatigue
					setFatigueEnabled(Boolean(f.enabled ?? true))
					// Não sobrescreve as frases se o usuário estiver editando ou com o modal aberto
					if (Array.isArray(f.phrases) && !editingFatigue && !fatigueModalOpen) setFatiguePhrases(f.phrases)
					if (Array.isArray(f.periods)) setFatiguePeriods(f.periods)
					if (Array.isArray(f.shiftPeriods)) setShiftPeriods(f.shiftPeriods)
				}
			} catch (err) {
				console.warn('[Desktop] Falha ao carregar fatigue settings:', err)
			}
		}

		loadFatigueSettings()
		const onSaved = () => loadFatigueSettings()
		window.addEventListener('settings-saved', onSaved)
		return () => window.removeEventListener('settings-saved', onSaved)
	}, [])

	const [activeRankingGroup, setActiveRankingGroup] = useState<
		"Laser" | "Emma" | "Lectra" | "Comelz"
	>("Laser")

	const periodos = [
		{ inicio: "05:00", fim: "06:00" },
		{ inicio: "06:00", fim: "07:00" },
		{ inicio: "07:00", fim: "08:00" },
		{ inicio: "08:00", fim: "09:00" },
		{ inicio: "09:00", fim: "10:00" },
		{ inicio: "10:00", fim: "11:00" },
		{ inicio: "11:00", fim: "12:00" },
		{ inicio: "12:00", fim: "13:20" },
		{ inicio: "13:20", fim: "14:00" },
		{ inicio: "14:00", fim: "15:00" },
		{ inicio: "15:00", fim: "16:00" },
		{ inicio: "16:00", fim: "17:00" },
		{ inicio: "17:00", fim: "18:00" },
		{ inicio: "18:00", fim: "19:00" },
		{ inicio: "19:00", fim: "20:00" },
		{ inicio: "20:00", fim: "21:40" },
		{ inicio: "21:40", fim: "22:00" },
		{ inicio: "22:00", fim: "23:00" },
		{ inicio: "23:00", fim: "00:00" },
		{ inicio: "00:00", fim: "01:00" },
		{ inicio: "01:00", fim: "02:00" },
		{ inicio: "02:00", fim: "03:00" },
		{ inicio: "03:00", fim: "04:00" },
		{ inicio: "04:00", fim: "05:00" },
	]

	// Função utilitária para obter minutos desde meia-noite
	const toMinutesFromMidnight = useCallback((hora: string) => {
		const [h, m] = hora.split(":").map(Number)
		return h * 60 + m
	}, [])

	// Fadiga - estados
	const [fatigueEnabled, setFatigueEnabled] = useState<boolean>(true)
	const [fatiguePhrases, setFatiguePhrases] = useState<string[]>([
		"# Atenção! Pausa programada — descanse por 10 minutos.",
		"**Segurança em primeiro lugar** — beba água e alongue-se.",
	])
	const [fatiguePeriods, setFatiguePeriods] = useState<{ inicio: string; fim: string }[]>([
		{ inicio: "08:00", fim: "08:10" },
		{ inicio: "10:00", fim: "10:10" },
		{ inicio: "16:00", fim: "16:10" },
		{ inicio: "20:00", fim: "20:10" },
		{ inicio: "00:00", fim: "00:10" },
		{ inicio: "03:00", fim: "03:10" },
		// Janela de início de cada turno (10 minutos)
		{ inicio: "05:00", fim: "05:10" },
		{ inicio: "13:20", fim: "13:30" },
		{ inicio: "21:40", fim: "21:50" },
	])
	const [shiftPeriods, setShiftPeriods] = useState<{ inicio: string; fim: string }[]>([
		{ inicio: "05:00", fim: "05:10" },
		{ inicio: "13:20", fim: "13:30" },
		{ inicio: "21:40", fim: "21:50" },
	])

	const [isFatigueNow, setIsFatigueNow] = useState(false)
	const [currentFatiguePhrase, setCurrentFatiguePhrase] = useState<string | null>(null)
	const [editingFatigue, setEditingFatigue] = useState<boolean>(false)
	const prevFatigueRef = useRef<boolean>(false)

	// Escuta eventos de edição de fadiga para impedir mostrar preview enquanto se edita
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const ed = (e as CustomEvent)?.detail?.editing
				setEditingFatigue(Boolean(ed))
			} catch { setEditingFatigue(false) }
		}
		window.addEventListener('fatigue-editing', handler)
		return () => window.removeEventListener('fatigue-editing', handler)
	}, [])

	// Escuta evento de abertura do modal de fadiga para evitar que cargas externas sobrescrevam o que o usuário está editando
	const [fatigueModalOpen, setFatigueModalOpen] = useState(false)
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const open = (e as CustomEvent)?.detail?.open
				setFatigueModalOpen(Boolean(open))
				// quando o modal fecha, recarrega settings para sincronizar possíveis mudanças externas
				if (!open) {
					(async () => {
						try {
							if (!window.electron || !window.electron.ipcRenderer) return
							const res = await window.electron.ipcRenderer.invoke('get-settings')
							if (res && res.success && res.settings && res.settings.fatigue) {
								const f = res.settings.fatigue
								if (Array.isArray(f.phrases) && !editingFatigue) setFatiguePhrases(f.phrases)
								if (Array.isArray(f.periods)) setFatiguePeriods(f.periods)
								if (Array.isArray(f.shiftPeriods)) setShiftPeriods(f.shiftPeriods)
							}
						} catch (err) { console.warn('[Desktop] Falha ao recarregar fatigue settings ao fechar modal:', err) }
					})()
				}
			} catch (_) {}
		}
		window.addEventListener('fatigue-modal-open', handler)
		return () => window.removeEventListener('fatigue-modal-open', handler)
	}, [editingFatigue])

	// Atualiza o overlay imediatamente quando uma frase é alterada via autosave
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent)?.detail
				const phrase = detail?.phrase
				if (typeof phrase === 'string' && isFatigueNow && !editingFatigue) {
					setCurrentFatiguePhrase(phrase)
				}
			} catch { }
		}
		window.addEventListener('fatigue-phrase-updated', handler)
		return () => window.removeEventListener('fatigue-phrase-updated', handler)
	}, [isFatigueNow, editingFatigue])

	const isTimeInPeriod = useCallback((nowMinutes: number, inicio: string, fim: string) => {
		const s = toMinutesFromMidnight(inicio)
		const e = fim === "00:00" ? 24 * 60 : toMinutesFromMidnight(fim)
		if (s <= e) {
			return nowMinutes >= s && nowMinutes < e
		}
		// overnight
		return nowMinutes >= s || nowMinutes < e
	}, [toMinutesFromMidnight])

	const checkFatigueNow = useCallback((periods: { inicio: string; fim: string }[], nowDate: Date | null = null) => {
		if (!fatigueEnabled) return false
		const now = nowDate ?? new Date()
		const nm = now.getHours() * 60 + now.getMinutes()
		for (const p of periods) {
			if (typeof p?.inicio === 'string' && typeof p?.fim === 'string') {
				if (isTimeInPeriod(nm, p.inicio, p.fim)) return true
			}
		}
		return false
	}, [fatigueEnabled, isTimeInPeriod])

	// Função para obter o período atual
	const getCurrentPeriod = useCallback(
		(periodos: { inicio: string; fim: string }[], now: Date) => {
			const nowMinutes = now.getHours() * 60 + now.getMinutes()
			for (const periodo of periodos) {
				const startMinutes = toMinutesFromMidnight(periodo.inicio)
				const endMinutes =
					periodo.fim === "00:00" ? 24 * 60 : toMinutesFromMidnight(periodo.fim)
				if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
					return `${periodo.inicio}-${periodo.fim}`
				}
			}
			return null
		},
		[toMinutesFromMidnight],
	)

	const [occupationData, setOccupationData] = useState<MachineSpeedStatus[]>([])

	// Initialize occupation data with default values for current group
	const initializeOccupationData = useCallback((group: "Laser" | "Emma" | "Lectra" | "Comelz") => {
		const groupMachines = Object.entries(
			machineGroups[group]?.machineMap || defaultMachineGroups[group]?.machineMap || {},
		)
		
		return groupMachines.map(([id]) => ({
			id: parseInt(id),
			speed: 0,
			status: "offline" as MachineStatus
		}))
	}, [machineGroups])

	// Initialize with default data on component mount
	useEffect(() => {
		const initialData = initializeOccupationData(activeRankingGroup)
		if (initialData.length > 0) {
			setOccupationData(initialData)
		}
	}, [activeRankingGroup, initializeOccupationData])
	const [kpiValues, setKpiValues] = useState({
		machinesActive: 0,
		machinesStopped: 0,
		efficiencyAverage: 0,
		speedAverage: 0,
	})
	// Initialize ranking data for current group
	const getInitialRanking = useCallback(
		(group: "Laser" | "Emma" | "Lectra" | "Comelz") => {
			return Object.values(machineGroups[group].machineMap).map(
				(machineCode, idx) => ({
					machine: machineCode,
					percentage: 0,
					position: idx + 1,
				}),
			)
		},
		[machineGroups],
	)

	const [rankingDataVisible, setRankingDataVisible] = useState<
		{ position: number; percentage: number; machine: string }[]
	>(getInitialRanking("Laser"))

	const fetchData = useCallback(async () => {
		try {
			// Verificar se o IPC está disponível
			if (!window.electron || !window.electron.ipcRenderer) {
				console.error("[Desktop] IPC Renderer não está disponível para buscar dados")
				// Usar dados de fallback
				setOccupationData(initializeOccupationData(activeRankingGroup))
				setRankingDataVisible(getInitialRanking(activeRankingGroup))
				return
			}

			console.log(`[Desktop] Buscando dados para grupo: ${activeRankingGroup}`)
			
			const occupation: Occupation = await window.electron.ipcRenderer.invoke(
				"machine-occupation-group",
				activeRankingGroup,
			)
			const speedRawData = await window.electron.ipcRenderer.invoke(
				"occupation-group",
				activeRankingGroup,
			)
			const speedData: MachineSpeedStatus[] = Array.isArray(speedRawData)
				? speedRawData.map((item: MachineSpeedStatus) => ({
						id: item.id,
						speed: item.speed,
						status: parseStatus(item.status),
					}))
				: []

			const now = new Date()
			const periodoAtual = getCurrentPeriod(periodos, now)

			// Verifica se estamos em horário de fadiga
			const fatigueNow = checkFatigueNow(fatiguePeriods, now)
			setIsFatigueNow(fatigueNow)
			// Quando entramos em fadiga, escolhe uma frase aleatória (apenas quando mudamos de estado)
			if (fatigueNow && !prevFatigueRef.current) {
				// Não sobrescreve a frase atual se o usuário estiver editando as frases
				if (editingFatigue) {
					console.log('[Desktop] Usuário editando frases — não atualizando currentFatiguePhrase')
				} else {
					if (Array.isArray(fatiguePhrases) && fatiguePhrases.length > 0) {
						const idx = Math.floor(Math.random() * fatiguePhrases.length)
						setCurrentFatiguePhrase(fatiguePhrases[idx])
					} else {
						setCurrentFatiguePhrase('# Fadiga')
					}
				}
			}
			prevFatigueRef.current = fatigueNow

			// LOG: Dados recebidos do backend
			console.log("=== DEBUG MÁQUINA 11 ===")
			console.log("Período atual:", periodoAtual)
			console.log("Occupation data recebida:", occupation)
			console.log("Dados da máquina 02-1454:", occupation["02-1454"])

			// Ensure occupation is an object
			const safeOccupation =
				occupation && typeof occupation === "object" ? occupation : {}

			const rankingArray = Object.entries(safeOccupation).map(
				([machineCode, periods]: [string, OccupationPeriods]) => {
					const percentual =
						periodoAtual &&
						periods &&
						typeof periods === "object" &&
						periods[periodoAtual] !== undefined
							? periods[periodoAtual]
							: 0

					// LOG: Processamento individual de cada máquina
					if (machineCode === "02-1454") {
						console.log("MÁQUINA 11 (02-1454) - Processamento:")
						console.log("  - Código:", machineCode)
						console.log("  - Periods:", periods)
						console.log(
							"  - Percentual para período",
							periodoAtual,
							":",
							percentual,
						)
					}

					return {
						machine: String(machineCode),
						percentage: Number(Math.round(percentual || 0)),
						position: 0,
					}
				},
			)
			rankingArray.sort((a, b) => b.percentage - a.percentage)
			rankingArray.forEach((item, idx) => {
				item.position = idx + 1
			})

			// LOG: Ranking array após ordenação
			console.log("Ranking array após ordenação:", rankingArray)
			const machine11InRanking = rankingArray.find(
				(item) => item.machine === "02-1454",
			)
			console.log("Máquina 11 no ranking:", machine11InRanking)

			// Create complete occupation data including all configured machines
			const currentGroupMachines = Object.entries(
				machineGroups[activeRankingGroup]?.machineMap || {},
			)
			
			console.log("Setup machines for", activeRankingGroup, ":", currentGroupMachines)
			console.log("Backend speedData:", speedData)
			
			// Se não temos máquinas configuradas, usa máquinas padrão do grupo
			const fallbackMachines = Object.entries(
				defaultMachineGroups[activeRankingGroup]?.machineMap || {},
			)
			const machinesToUse = currentGroupMachines.length > 0 ? currentGroupMachines : fallbackMachines
			
			const completeOccupationData: MachineSpeedStatus[] = machinesToUse.map(([id]) => {
				// Try to find data from backend for this machine
				const backendData = speedData.find((item) => item.id === parseInt(id))
				
				// Return backend data if available, otherwise return default data
				return backendData || {
					id: parseInt(id),
					speed: 0,
					status: "offline" as MachineStatus
				}
			})
			
			console.log("Complete occupation data:", completeOccupationData)

			setOccupationData(completeOccupationData)

			// Process ranking data
			if (rankingArray.length > 0) {
				// Garante que todas as máquinas estejam presentes
				const currentGroupMachines = Object.values(
					machineGroups[activeRankingGroup].machineMap,
				)
				console.log("Máquinas do grupo atual:", currentGroupMachines)

				const filledRanking = currentGroupMachines.map((machineCode) => {
					const found = rankingArray.find((r) => r && r.machine === machineCode)

					// LOG: Processo de busca para cada máquina
					if (machineCode === "02-1454") {
						console.log("MÁQUINA 11 (02-1454) - Processo de filledRanking:")
						console.log("  - Código procurado:", machineCode)
						console.log("  - Encontrada no ranking?", !!found)
						console.log("  - Dados encontrados:", found)
					}

					return found && found.machine && typeof found.percentage === "number"
						? found
						: {
								machine: String(machineCode),
								percentage: 0,
								position: rankingArray.length + 1,
							}
				})

				console.log("FilledRanking completo:", filledRanking)
				const machine11InFilled = filledRanking.find(
					(item) => item.machine === "02-1454",
				)
				console.log("Máquina 11 no filledRanking:", machine11InFilled)

				// Validate all items in filledRanking
				const validRanking = filledRanking.filter(
					(item) =>
						item &&
						typeof item.machine === "string" &&
						typeof item.percentage === "number" &&
						typeof item.position === "number",
				)

				console.log("ValidRanking:", validRanking)
				const machine11InValid = validRanking.find(
					(item) => item.machine === "02-1454",
				)
				console.log("Máquina 11 no validRanking:", machine11InValid)

				// Só atualiza se pelo menos um valor for diferente de zero
				if (validRanking.some((item) => item.percentage > 0)) {
					console.log("Atualizando rankingDataVisible com validRanking")
					setRankingDataVisible(validRanking)
				} else {
					console.log("Mantendo dados anteriores ou inicializando")
					setRankingDataVisible((prev) =>
						prev.length > 0 ? prev : getInitialRanking(activeRankingGroup),
					)
				}
			} else {
				// Se não houver dados novos, mantém os dados anteriores visíveis
				// Se não houver dados anteriores, exibe todos os cards zerados
				setRankingDataVisible((prev) =>
					prev.length > 0 ? prev : getInitialRanking(activeRankingGroup),
				)
			}

			const machinesActive = speedData.filter(
				(m) => m.status === "working",
			).length
			const machinesStopped = speedData.filter(
				(m) => m.status === "stopped",
			).length

			const efficiencyAverage =
				rankingArray.length > 0
					? Math.round(
							rankingArray.reduce((acc, item) => acc + item.percentage, 0) /
								rankingArray.length,
						)
					: 0

			const speedsFiltered = speedData
				.filter((m) => m.speed > 0)
				.map((m) => m.speed)

			// Lectra e Comelz não têm dados de velocidade válidos, então sempre mostrar 0
			const speedAverage =
				activeRankingGroup === "Lectra" || activeRankingGroup === "Comelz"
					? 0
					: speedsFiltered.length > 0
						? Math.round(
								speedsFiltered.reduce((acc, v) => acc + v, 0) /
									speedsFiltered.length,
							)
						: 0

			setKpiValues({
				machinesActive,
				machinesStopped,
				efficiencyAverage,
				speedAverage,
			})
		} catch (error) {
			console.error("Erro ao carregar dados:", error)
		}
	}, [activeRankingGroup, getCurrentPeriod, getInitialRanking, machineGroups, checkFatigueNow, fatiguePhrases, fatiguePeriods, initializeOccupationData])

	useEffect(() => {
		fetchData()
		const interval = setInterval(fetchData, 5000) // 5 seconds
		return () => clearInterval(interval)
	}, [fetchData])

	// Re-fetch quando settings são salvas
	useEffect(() => {
		const onSaved = () => fetchData()
		window.addEventListener('settings-saved', onSaved)
		return () => window.removeEventListener('settings-saved', onSaved)
	}, [fetchData])

	// Reset ranking data when group changes
	useEffect(() => {
		setRankingDataVisible(getInitialRanking(activeRankingGroup))
	}, [activeRankingGroup, getInitialRanking])

	// Get current group machine count
	const currentGroupMachineCount = Object.keys(
		machineGroups[activeRankingGroup].machineMap,
	).length

	const kpiCardsData = [
		{
			title: "Máquinas Ativas",
			value: String(kpiValues.machinesActive),
			subtitle: `de ${currentGroupMachineCount} máquinas`,
			icon: CheckCircle,
			iconBg: "bg-green-100",
			iconColor: "text-green-600",
		},
		{
			title: "Máquinas Paradas",
			value: String(kpiValues.machinesStopped),
			subtitle: "necessitam atenção",
			icon: XCircle,
			iconBg: "bg-red-100",
			iconColor: "text-red-600",
		},
		{
			title: "Eficiência Média",
			value: `${kpiValues.efficiencyAverage}%`,
			subtitle: "ocupação de corte",
			icon: Zap,
			iconBg: "bg-blue-100",
			iconColor: "text-blue-600",
		},
		{
			title: "Velocidade Média",
			value: String(kpiValues.speedAverage),
			subtitle: "unidades/min",
			icon: Settings,
			iconBg: "bg-orange-100",
			iconColor: "text-orange-600",
		},
	]

	return (
		<div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100 p-4 overflow-x-auto relative">
			<div ref={zoomContainerRef} className="w-full mx-auto flex flex-col h-max">
				{/* Cabeçalho com Logo e KPIs */}
				<div className="flex items-center justify-between mb-4 min-w-[1200px]">
					<div className="flex-shrink-0">
						<img
							width={240}
							src={vulcabrasLogo}
							alt="Logo da vulcabras com o texto vivemos para o esporte"
						/>
					</div>
					<div className="grid grid-cols-4 gap-4 flex-1 max-w-4xl ml-8">
						{kpiCardsData.map((kpi, index) => (
							<KpiCard
								key={index}
								title={kpi.title}
								value={kpi.value}
								subtitle={kpi.subtitle}
								icon={kpi.icon}
								iconBg={kpi.iconBg}
								iconColor={kpi.iconColor}
							/>
						))}
					</div>
				</div>

				{/* Abas para alternar entre ranking atual, fechamento por horário e relatório por turno */}
				<div className="flex flex-col min-h-0">
					<div className="flex gap-4 mb-4">
						<button
							className={`px-4 py-2 rounded font-bold ${activeTab === "atual" ? "bg-blue-900 text-white" : "bg-gray-200 text-blue-900"}`}
							onClick={() => setActiveTab("atual")}
						>
							RANKING DE MÁQUINAS (Hora Atual)
						</button>
						<button
							className={`px-4 py-2 rounded font-bold ${activeTab === "turno" ? "bg-blue-900 text-white" : "bg-gray-200 text-blue-900"}`}
							onClick={() => setActiveTab("turno")}
						>
							RELATÓRIO POR TURNO
						</button>
						<button
							className={`px-4 py-2 rounded font-bold ${activeTab === "banco" ? "bg-blue-900 text-white" : "bg-gray-200 text-blue-900"}`}
							onClick={() => setActiveTab("banco")}
						>
							BANCO DE DADOS
						</button>
						<button
							className={`px-4 py-2 rounded font-bold ${activeTab === "setup" ? "bg-blue-900 text-white" : "bg-gray-200 text-blue-900"}`}
							onClick={() => {
								// If already authenticated in this session, open directly
								if (setupAuthenticated) {
									setActiveTab("setup")
									return
								}
								// Show authentication modal
								setSetupPasswordInput("")
								setSetupError(null)
								setShowSetupAuth(true)
							}}
						>
							SETUP MACHINE
						</button>
					</div>


				{activeTab === "atual" && (
						<div className="flex-1 mb-4 overflow-x-auto">
						{isFatigueNow && currentFatiguePhrase && !editingFatigue && !fatigueModalOpen && (
						// Mostra overlay de fadiga (mantém o relógio arrastável por cima)
						<FatigueOverlay phrase={currentFatiguePhrase} shiftPeriods={shiftPeriods} />
					)}
						<div style={{ minWidth: 'max-content' }}>
							<h2 className="text-2xl font-bold text-blue-900 mb-3">
								{`RANKING DE MÁQUINAS - ${getCurrentPeriod(periodos, new Date()) ?? ""}`}
							</h2>
								<div className="flex gap-2 mb-4">
									{Object.entries(machineGroups).map(([key, config]) => (
										<button
											key={key}
											className={`px-4 py-2 rounded font-bold ${activeRankingGroup === key ? "bg-blue-600 text-white" : "bg-gray-200 text-blue-900"}`}
											onClick={() =>
												setActiveRankingGroup(key as "Laser" | "Emma" | "Lectra" | "Comelz")
											}
										>
											{config.name}
										</button>
									))}
								</div>

								<div className="h-full">
									<RankingChart
										data={rankingDataVisible.filter((item) => {
											const isValid =
												item &&
												typeof item.percentage === "number" &&
												typeof item.machine === "string" &&
												typeof item.position === "number" &&
												!isNaN(item.percentage) &&
												item.machine.length > 0

											return isValid
										})}
										machineMap={machineGroups[activeRankingGroup].machineMap}
									/>
								</div>
							</div>
						</div>
					)}
					{/* aba FECHAMENTO removida */}
					{activeTab === "turno" && (
						<div className="flex-1 mb-4">
							{/* Sub-abas para modelos de máquina */}
							<div className="flex gap-2 mb-4">
								{turnoModels.map((model) => (
									<button
										key={model.key}
										className={`px-4 py-2 rounded font-bold ${activeTurnoModel === model.key ? "bg-blue-600 text-white" : "bg-gray-200 text-blue-900"}`}
										onClick={() => setActiveTurnoModel(model.key)}
									>
										{model.label}
									</button>
								))}
							</div>
							{activeTurnoModel === "laser" && <TurnoReport />}
							{activeTurnoModel === "modeloA" && <TurnoReportModeloA />}
							{activeTurnoModel === "modeloB" && <TurnoReportModeloB />}
							{activeTurnoModel === "modeloC" && <TurnoReportModeloC />}
						</div>
					)}
					{/* Ocupação em tempo real só na aba atual */}
					{activeTab === "atual" && !isFatigueNow && (
						<div className="flex-shrink-0">
							<h2 className="text-2xl font-bold text-blue-900 mb-3">
								OCUPAÇÃO TEMPO REAL - {machineGroups[activeRankingGroup].name}
							</h2>
							<div className="space-y-3">
								{/* Sempre renderiza as máquinas, mesmo sem dados */}
								{/* Render cards with custom layout for different groups */}
								{activeRankingGroup === "Laser" ? (
									<>
										{/* First row: 6 machines */}
										<div className="grid grid-cols-6 gap-3">
											{occupationData.slice(0, 6).map((machine) => (
												<OccupationCard
													key={machine.id}
													id={machine.id}
													speed={machine.speed}
													status={machine.status}
												/>
											))}
										</div>
										{/* Second row: remaining machines (7+) */}
										{occupationData.length > 6 && (
											<div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(8, occupationData.length - 6)}, minmax(0, 1fr))` }}>
												{occupationData.slice(6).map((machine) => (
													<OccupationCard
														key={machine.id}
														id={machine.id}
														speed={machine.speed}
														status={machine.status}
													/>
												))}
											</div>
										)}
									</>
								) : activeRankingGroup === "Lectra" ? (
									<>
										{/* First row: 6 machines */}
										<div className="grid grid-cols-6 gap-3">
											{occupationData.slice(0, 6).map((machine) => (
												<OccupationCard
													key={machine.id}
													id={machine.id}
													speed={machine.speed}
													status={machine.status}
													hideValues
												/>
											))}
										</div>
										{/* Second row: 6 machines */}
										<div className="grid grid-cols-6 gap-3">
											{occupationData.slice(6, 12).map((machine) => (
												<OccupationCard
													key={machine.id}
													id={machine.id}
													speed={machine.speed}
													status={machine.status}
													hideValues
												/>
											))}
										</div>
									</>
								) : activeRankingGroup === "Comelz" ? (
									/* Custom layout for COMELZ (4 machines in one row) */
									<div className="grid grid-cols-4 gap-3">
										{occupationData.map((machine) => (
											<OccupationCard
												key={machine.id}
												id={machine.id}
												speed={machine.speed}
												status={machine.status}
												hideValues
											/>
										))}
									</div>
								) : (
									/* Default layout for other groups (5 per row) */
									Array.from(
										{ length: Math.ceil(occupationData.length / 5) },
										(_, rowIndex) => (
											<div key={rowIndex} className="grid grid-cols-5 gap-3">
												{occupationData
													.slice(rowIndex * 5, (rowIndex + 1) * 5)
													.map((machine) => (
														<OccupationCard
															key={machine.id}
															id={machine.id}
															speed={machine.speed}
															status={machine.status}
														/>
													))}
											</div>
										),
									)
								)}
							</div>
						</div>
					)}
					{activeTab === "banco" && (
						<div className="flex-1 mb-4">
							<RelatorioBanco />
						</div>
					)}
					{activeTab === "setup" && (
						<div className="mb-4">
							<Setup />
						</div>
					)}
				</div>
			</div>

			{/* Controles de zoom - arrastável */}
			<DraggableButton
				initialPosition={{ x: window.innerWidth - 100, y: window.innerHeight - 280 }}
				storageKey="zoom-controls-position"
			>
				<div className="flex flex-col gap-2 p-2">
					<button
						onClick={zoomIn}
						className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow transition-colors disabled:bg-gray-400"
						title="Aumentar zoom (+5%)"
						disabled={zoomLevel >= 2}
					>
						<ZoomIn size={20} />
					</button>
					<button
						onClick={zoomOut}
						className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow transition-colors disabled:bg-gray-400"
						title="Diminuir zoom (-5%)"
						disabled={zoomLevel <= 0.5}
					>
						<ZoomOut size={20} />
					</button>
					<button
						onClick={resetZoom}
						className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow transition-colors"
						title="Resetar zoom (100%)"
					>
						<RotateCcw size={20} />
					</button>
					<div className="bg-blue-50 text-blue-900 px-3 py-2 rounded-lg text-sm font-bold text-center">
						{Math.round(zoomLevel * 100)}%
					</div>
				</div>
			</DraggableButton>

			{/* Botão "Sobre" - arrastável */}
			<DraggableButton
				initialPosition={{ x: window.innerWidth - 80, y: window.innerHeight - 80 }}
				storageKey="about-button-position"
			>
				<button
					onClick={() => setIsAboutOpen(true)}
					className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
					title="Sobre o aplicativo"
				>
					<Info size={20} />
				</button>
			</DraggableButton>

			{/* Relógio arrastável para funcionários */}
			<DraggableButton
				initialPosition={{ x: 20, y: 20 }}
				storageKey="clock-widget-position"
			>
				<ClockWidget onAdjustClick={() => {
					setClockPasswordInput("")
					setClockError(null)
					setShowClockAuth(true)
				}} />
			</DraggableButton>

			{/* Modal "Sobre" */}
			<AboutDialog isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

			{/* Modal de ajuste de relógio */}
			<ClockAdjustDialog isOpen={isClockAdjustOpen} onClose={() => setIsClockAdjustOpen(false)} />

			{/* Clock auth modal */}
			{showClockAuth && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
					<div className="bg-white rounded p-6 w-96">
						<h3 className="text-lg font-semibold mb-2">🔒 Acesso ao Ajuste do Relógio</h3>
						<p className="text-sm text-gray-600 mb-4">
							Digite a senha para ajustar o horário.
						</p>
						<input
							ref={clockInputRef}
							type="password"
							className="w-full border rounded px-2 py-1 mb-3"
							value={clockPasswordInput}
							onChange={(e) => setClockPasswordInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && clockPasswordInput) {
									if (clockPasswordInput === "654321") {
										setShowClockAuth(false)
										setIsClockAdjustOpen(true)
										setClockPasswordInput("")
										setClockError(null)
									} else {
										setClockError("Senha inválida")
										setTimeout(() => setClockError(null), 3000)
									}
								}
							}}
						/>
						<div className="flex justify-end gap-2">
							<button
								className="px-3 py-1 bg-gray-200 rounded"
								onClick={() => {
									setShowClockAuth(false)
									setClockPasswordInput("")
									setClockError(null)
								}}
							>
								Cancelar
							</button>
							<button
								className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
								onClick={() => {
									if (clockPasswordInput === "654321") {
										setShowClockAuth(false)
										setIsClockAdjustOpen(true)
										setClockPasswordInput("")
										setClockError(null)
									} else {
										setClockError("Senha inválida")
										setTimeout(() => setClockError(null), 3000)
									}
								}}
								disabled={!clockPasswordInput}
							>
								Entrar
							</button>
						</div>
						{clockError && (
							<div className="text-red-600 mt-2">{clockError}</div>
						)}
					</div>
				</div>
			)}

			{/* Setup auth modal */}
			{showSetupAuth && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
					<div className="bg-white rounded p-6 w-96">
						<h3 className="text-lg font-semibold mb-2">🔒 Acesso Setup Machine</h3>
						<p className="text-sm text-gray-600 mb-4">
							Digite a senha para acessar as configurações.
						</p>
						<input
							ref={setupInputRef}
							type="password"
							className="w-full border rounded px-2 py-1 mb-3"
							value={setupPasswordInput}
							onChange={(e) => setSetupPasswordInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && setupPasswordInput) {
									if (setupPasswordInput === "654321") {
										setShowSetupAuth(false)
										setSetupAuthenticated(true)
										setActiveTab("setup")
										setSetupPasswordInput("")
										setSetupError(null)
									} else {
										setSetupError("Senha inválida")
										setTimeout(() => setSetupError(null), 3000)
									}
								}
							}}
						/>
						<div className="flex justify-end gap-2">
							<button
								className="px-3 py-1 bg-gray-200 rounded"
								onClick={() => {
									setShowSetupAuth(false)
									setSetupPasswordInput("")
									setSetupError(null)
								}}
							>
								Cancelar
							</button>
							<button
								className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
								onClick={() => {
									if (setupPasswordInput === "654321") {
										setShowSetupAuth(false)
										setSetupAuthenticated(true)
										setActiveTab("setup")
										setSetupPasswordInput("")
										setSetupError(null)
									} else {
										setSetupError("Senha inválida")
										setTimeout(() => setSetupError(null), 3000)
									}
								}}
								disabled={!setupPasswordInput}
							>
								Entrar
							</button>
						</div>
						{setupError && (
							<div className="text-red-600 mt-2">{setupError}</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
