import { FolderOpen, Plus, Trash2 } from "lucide-react"
import React, { useEffect, useState } from "react"
import SettingsStatus from "../../components/SettingsStatus"
import FatigueSettings from "./FatigueSettings"
import { ipcHelper } from "../../lib/ipcHelper"

type MachineMap = { [key: string]: string }

type GroupConfig = {
	name: string
	baseDir: string
	machineMap: MachineMap
}

type Periodo = {
	inicio: string
	fim: string
	baseCalculo: number
}

type PeriodosConfig = {
	turno1: Periodo[]
	turno2: Periodo[]
	turno3: Periodo[]
}

export default function Setup(): React.ReactElement {
	const [status, setStatus] = useState<string | null>(null)
	const [ipcReady, setIpcReady] = useState<boolean>(false)

	// Fatigue modal visibility
	const [showFatigueModal, setShowFatigueModal] = useState(false)

	
	// Watchdog: detecta se window.electron desapareceu após hot-reload
	useEffect(() => {
		const checkIpc = () => {
			if (ipcReady && !ipcHelper.isAvailable()) {
				console.error('[Setup] Watchdog: IPC estava pronto mas agora está indisponível! Resetando...')
				setIpcReady(false)
				setStatus("⚠️ Conexão IPC perdida - recarregue a página")
			}
		}
		const interval = setInterval(checkIpc, 2000)
		return () => clearInterval(interval)
	}, [ipcReady])

	const defaultGroups: Record<string, GroupConfig> = {
		Laser: {
			name: "LASER",
			baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work",
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
			Lectra: {
			name: "LECTRA",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Lectra",
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
			Emma: {
			name: "EMMA",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Emma",
			machineMap: {
				1: "02-2774",
				2: "02-2672",
				3: "02-2501",
				4: "02-2773",
			},
		},
			Comelz: {
			name: "COMELZ",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz",
			machineMap: {
				1: "02-1555",
				2: "02-1556",
				3: "02-1558",
				4: "02-1507",
			},
		},
			ComelzMontagem: {
			name: "COMELZ MONTAGEM",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz",
			machineMap: {
				1: "02-1471",
				2: "02-1334",
				3: "02-1557",
			},
		},
			ComelzSolas: {
			name: "COMELZ SOLAS",
				baseDir: "\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work\\Comelz",
			machineMap: {
				1: "02-1559",
				2: "02-1325",
			},
		},
	}

	const [machineGroups, setMachineGroups] = useState<Record<string, GroupConfig>>(
		defaultGroups,
	)
	const [networkSavePath, setNetworkSavePath] = useState<string>(defaultGroups['Laser'].baseDir + '\\AppData')
	const [effectiveDataPath, setEffectiveDataPath] = useState<string>('')
	const [activeGroup, setActiveGroup] = useState<string>("Laser")

	// Períodos config — local only
	const [periodosConfig, setPeriodosConfig] = useState<PeriodosConfig | null>(null)
	const [periodosStatus, setPeriodosStatus] = useState<string | null>(null)
	const [periodosActiveTurno, setPeriodosActiveTurno] = useState<"turno1" | "turno2" | "turno3">("turno1")

	// NOTE: Fatigue state moved to `FatigueSettings` component to keep setup isolated.
	// See `FatigueSettings.tsx` for managing phrases, periods and shift windows.

	useEffect(() => {
		const waitForElectron = async (maxAttempts = 30, delay = 200) => {
			console.log('[Setup] waitForElectron - starting, window.electron:', typeof window.electron)
			for (let i = 0; i < maxAttempts; i++) {
				if (ipcHelper.isAvailable()) {
					console.log('[Setup] waitForElectron - IPC available after attempt', i+1)
					return true
				}
				await new Promise((r) => setTimeout(r, delay))
			}
			console.error('[Setup] waitForElectron - failed after', maxAttempts, 'attempts')
			console.error('[Setup] window.electron final state:', window.electron)
			return false
		}

		;(async () => {
			try {
				const ok = await waitForElectron()
				if (!ok) {
					console.error('[Setup] IPC não disponível após 6 segundos - preload pode não ter carregado')
					setStatus("Erro: IPC não disponível. Recarregue a página (Ctrl+R)")
					throw new Error("IPC não disponível")
				}
				console.log('[Setup] IPC ready, setting ipcReady=true')
				setIpcReady(true)
				// Load machine settings
				const res = await ipcHelper.invoke("get-settings")
				if (res && res.success && res.settings) {
					const s = res.settings
					const loadedGroups = s.machineGroups ?? s.machineMap ?? {}
					const merged = { ...defaultGroups }
					for (const k of Object.keys(loadedGroups)) {
						const cfg = loadedGroups[k]
						if (cfg && typeof cfg === "object") {
							const map = (cfg.machineMap ?? cfg) as MachineMap
							if (map && Object.keys(map).length > 0) {
								let cleanBaseDir = cfg.baseDir ?? defaultGroups[k]?.baseDir ?? ""
								if (
									typeof cleanBaseDir === "string" &&
									cleanBaseDir.includes("\\\\")
								) {
									cleanBaseDir = cleanBaseDir.replace(/\\\\/g, "\\")
								}
								merged[k] = {
									name: cfg.name ?? k,
									baseDir: cleanBaseDir,
									machineMap: map,
								}
							}
						}
					}
					setMachineGroups(merged)
					setStatus("Configurações carregadas")
 				} else {
					setMachineGroups(defaultGroups)
					setStatus("Usando configurações padrão das máquinas")
				}
			} catch (error) {
				console.error("[Setup] Erro ao carregar configurações:", error)
				setMachineGroups(defaultGroups)
				setStatus("Erro ao carregar configurações - usando padrões")
			}

			// Load períodos config (local only)
			try {
				const pr = await ipcHelper.invoke("get-periodos-config")
				if (pr && pr.success && pr.config) {
					setPeriodosConfig(pr.config)
				}
			} catch (e) {
				console.warn("[Setup] Erro ao carregar períodos:", e)
			}
		})()
	}, [])

	const ensureIpc = async () => {
		console.log('[Setup] ensureIpc - checking window.electron:', typeof window.electron)
		if (ipcHelper.isAvailable()) {
			console.log('[Setup] ensureIpc - IPC available immediately')
			return true
		}
		// tentar aguardar um pouco mais
		console.log('[Setup] ensureIpc - IPC not ready, waiting up to 3 seconds...')
		for (let i = 0; i < 30; i++) {
			await new Promise((r) => setTimeout(r, 100))
			if (ipcHelper.isAvailable()) {
				console.log('[Setup] ensureIpc - IPC became available after', (i+1)*100, 'ms')
				return true
			}
		}
		console.error('[Setup] ensureIpc - IPC still not available after 3s - window.electron:', window.electron)
		return false
	}

	const openDataFolder = async () => {
		setStatus("Abrindo pasta de dados...")
		if (!(await ensureIpc())) {
			setStatus("Erro: IPC não disponível no momento")
			return
		}
		try {
			const res = await ipcHelper.invoke("open-data-folder")
			if (res && res.success) setStatus(`Pasta aberta: ${res.path}`)
			else setStatus(`Erro: ${res?.error ?? "não foi possível abrir a pasta"}`)
		} catch (err: unknown) {
			let msg = String(err)
			if (err && typeof err === "object") {
				const e = err as { message?: unknown }
				if (typeof e.message === "string") msg = e.message
			}
			setStatus(`Erro: ${msg}`)
		}
	}

	const saveSettings = async () => {
		console.log('[Setup] saveSettings CLICKED - starting save process')
		console.log('[Setup] ipcReady state:', ipcReady)
		setStatus("Salvando configurações...")
		if (!(await ensureIpc())) {
			console.error('[Setup] ensureIpc returned false - aborting save')
			setStatus("Erro: IPC não disponível no momento para salvar")
			return
		}
		console.log('[Setup] ensureIpc passed, building payload...')
		try {
			const sanitizedGroups: Record<string, GroupConfig> = {}
			for (const [gk, gv] of Object.entries(machineGroups)) {
				const mm: MachineMap = {}
				for (const [k, v] of Object.entries(gv.machineMap || {})) {
					if (typeof v === "string" && v.trim().length > 0) mm[k] = v.trim()
				}
				sanitizedGroups[gk] = {
					name: gv.name,
					baseDir: String(gv.baseDir || "").trim(),
					machineMap: mm,
				}
			}
			const topLevelBaseDir =
				sanitizedGroups["Laser"]?.baseDir ||
				Object.values(sanitizedGroups)[0]?.baseDir ||
				""
			// Merge into current settings so we preserve fields managed elsewhere (ex: fatigue)
			let settings: any = {
				baseDir: topLevelBaseDir,
				machineGroups: sanitizedGroups,
				networkDataPath: String(networkSavePath || topLevelBaseDir + '\\AppData').trim(),
			}
			try {
				const current = await ipcHelper.invoke('get-settings')
				if (current && current.success && current.settings) {
					settings = { ...current.settings, ...settings }
				}
			} catch (e) { void e }
			let res: unknown = null
			try {
				res = await ipcHelper.invoke("save-settings", settings)
			} catch (ipcErr) {
				console.warn('[Setup] ipcHelper.invoke save-settings failed:', ipcErr)
				try {
					res = await window.electron?.ipcRenderer?.invoke("save-settings", settings)
				} catch (directErr) {
					console.error('[Setup] direct ipc invoke also failed:', directErr)
				}
			}
			console.log('[Setup] save-settings final result:', res)
			if (res && (res as any).success) {
				setStatus("Configurações salvas com sucesso")
				// atualiza caminho salvo na UI caso backend tenha ajustado
				if (res && (res as any).settings && (res as any).settings.networkDataPath) setNetworkSavePath((res as any).settings.networkDataPath)
				// Atualiza caminho efetivo do turno_report.json perguntando ao main
				try {
					const dp = await ipcHelper.invoke("get-data-path")
					if (dp && dp.success && dp.path) {
						setEffectiveDataPath(dp.path)
					}
				} catch (dpErr) {
					console.warn('[Setup] get-data-path failed:', dpErr)
				}
				try {
					window.dispatchEvent(new CustomEvent("settings-saved"))
				} catch (e) { void e }
			} else {
				setStatus(`Erro ao salvar: ${(res as any)?.error ?? "desconhecido"}`)
			}
		} catch (err: unknown) {
			let msg = String(err)
			if (err && typeof err === "object") {
				const e = err as { message?: unknown }
				if (typeof e.message === "string") msg = e.message
			}
			setStatus(`Erro: ${msg}`)
		}
	}

	const addMachine = () => {
		setMachineGroups((prev) => {
			const group = prev[activeGroup] || {
				name: activeGroup,
				machineMap: {} as MachineMap,
				baseDir: "",
			}
			const keys = Object.keys(group.machineMap)
				.map((k) => parseInt(k, 10))
				.filter((num) => !isNaN(num))
			const next = keys.length ? Math.max(...keys) + 1 : 1
			return {
				...prev,
				[activeGroup]: {
					...group,
					machineMap: { ...group.machineMap, [String(next)]: "" },
				},
			}
		})
		// focus on the newly added input after state update
		setTimeout(() => {
			try {
				const inputs = document.querySelectorAll<HTMLInputElement>(".machine-map-input")
				if (inputs && inputs.length) {
					const last = inputs[inputs.length - 1]
					last.focus()
				}
			} catch (err) {
				console.warn('[Setup] focus on new machine input failed:', err)
			}
		}, 60)
	}

	const removeMachine = (key: string) => {
		setMachineGroups((prev) => {
			const group = prev[activeGroup] || {
				name: activeGroup,
				machineMap: {} as MachineMap,
				baseDir: "",
			}
			const copy = { ...group.machineMap }
			delete copy[key]
			return { ...prev, [activeGroup]: { ...group, machineMap: copy } }
		})
	}

	const updateMachine = (key: string, value: string) => {
		setMachineGroups((prev) => {
			const group = prev[activeGroup] || {
				name: activeGroup,
				baseDir: "",
				machineMap: {} as MachineMap,
			}
			return {
				...prev,
				[activeGroup]: {
					...group,
					machineMap: { ...group.machineMap, [key]: value },
				},
			}
		})
	}

	const updateGroupBaseDir = (value: string) => {
		setMachineGroups((prev) => ({
			...prev,
			[activeGroup]: {
				...prev[activeGroup],
				baseDir: value,
			},
		}))
	}

	const resetAllSettings = async () => {
		if (
			confirm(
				"Tem certeza que deseja RESETAR COMPLETAMENTE todas as configurações? Isso irá apagar o arquivo de configuração e usar apenas os padrões mais recentes.",
			)
		) {
			try {
				setStatus("Resetando configurações...")
				const res = await ipcHelper.invoke("reset-all-settings")
				if (res && res.success) {
					setMachineGroups(defaultGroups)
					setStatus(
						"Configurações resetadas completamente. Usando apenas padrões atuais.",
					)
				} else {
					setStatus(`Erro ao resetar: ${res?.error ?? "desconhecido"}`)
				}
			} catch (err: unknown) {
				let msg = String(err)
				if (err && typeof err === "object") {
					const e = err as { message?: unknown }
					if (typeof e.message === "string") msg = e.message
				}
				setStatus(`Erro: ${msg}`)
			}
		}
	}

	const restoreDefaults = () => {
		if (
			confirm(
				"Tem certeza que deseja restaurar todas as configurações padrão? Isso irá sobrescrever as configurações atuais.",
			)
		) {
			setMachineGroups(defaultGroups)
			setStatus("Configurações padrão restauradas. Clique em 'Salvar' para aplicar.")
		}
	}

	const setAsNewDefault = async () => {
		if (
			confirm(
				`Deseja definir a configuração atual de ${machineGroups[activeGroup].name} como NOVO PADRÃO?\n\n` +
				"Isso irá:\n" +
				"1. Salvar as configurações atuais\n" +
				"2. Criar um arquivo de configuração padrão na rede\n" +
				"3. Todas as máquinas que abrirem o sistema usarão estas configurações como base\n\n" +
				"Continuar?"
			)
		) {
			setStatus("⏳ Definindo como novo padrão...")
			if (!(await ensureIpc())) {
				setStatus("❌ Erro: IPC não disponível")
				return
			}
			
			try {
				// Primeiro salva as configurações atuais
				const sanitizedGroups: Record<string, GroupConfig> = {}
				for (const [gk, gv] of Object.entries(machineGroups)) {
					const mm: MachineMap = {}
					for (const [k, v] of Object.entries(gv.machineMap || {})) {
						if (typeof v === "string" && v.trim().length > 0) mm[k] = v.trim()
					}
					sanitizedGroups[gk] = {
						name: gv.name,
						baseDir: String(gv.baseDir || "").trim(),
						machineMap: mm,
					}
				}
				
				const topLevelBaseDir =
					sanitizedGroups["Laser"]?.baseDir ||
					Object.values(sanitizedGroups)[0]?.baseDir ||
					""
				
				// Merge into current settings to ensure fields set by other screens (ex: fatigue) are preserved
				let settings: any = {}
				try {
					const current = await ipcHelper.invoke('get-settings')
					settings = (current && current.success && current.settings) ? current.settings : {}
				} catch (e) { settings = {} }
				settings.baseDir = topLevelBaseDir
				settings.machineGroups = sanitizedGroups
				settings.networkDataPath = String(networkSavePath || topLevelBaseDir + '\\AppData').trim()
				
				console.log('[Setup] Salvando configurações antes de definir como padrão:', settings)
				
				// Salva localmente primeiro
				const saveRes = await ipcHelper.invoke("save-settings", settings)
				if (!(saveRes && saveRes.success)) {
					setStatus(`❌ Erro ao salvar: ${saveRes?.error ?? "desconhecido"}`)
					return
				}
				
				console.log('[Setup] Configurações salvas, criando arquivo padrão na rede...')
				
				// Agora cria o arquivo de configuração padrão na rede
				const networkRes = await ipcHelper.invoke('create-default-network-settings')
				console.log('[Setup] Resposta do create-default-network-settings:', networkRes)
				
				if (networkRes && networkRes.success) {
					setStatus(`✅ NOVO PADRÃO DEFINIDO com sucesso!\n📄 Arquivo criado em: ${networkRes.path || 'rede'}`)
					
					// Mostra mensagem de sucesso detalhada
					setTimeout(() => {
						alert(
							`✅ Configuração definida como novo padrão!\n\n` +
							`Arquivo: ${networkRes.path || 'settings.json'}\n` +
							`Grupo: ${machineGroups[activeGroup].name}\n` +
							`Máquinas configuradas: ${Object.keys(machineGroups[activeGroup].machineMap).length}\n\n` +
							`📍 Todas as máquinas que abrirem o sistema agora usarão estas configurações.`
						)
					}, 100)
				} else {
					setStatus(`⚠️ Configurações salvas localmente, mas erro ao criar padrão na rede: ${networkRes?.error ?? 'desconhecido'}`)
					
					// Mostra alerta com erro detalhado
					setTimeout(() => {
						alert(
							`⚠️ Aviso:\n\n` +
							`As configurações foram salvas LOCALMENTE com sucesso, mas houve um erro ao criar o arquivo padrão na REDE.\n\n` +
							`Erro: ${networkRes?.error ?? 'Desconhecido'}\n\n` +
							`Verifique:\n` +
							`- Conexão com a rede\n` +
							`- Permissões de escrita na pasta de rede\n` +
							`- Caminho configurado: ${topLevelBaseDir}\\AppData`
						)
					}, 100)
				}
			} catch (err) {
				let msg = String(err)
				if (err && typeof err === "object") {
					const e = err as { message?: unknown }
					if (typeof e.message === "string") msg = e.message
				}
				console.error('[Setup] Erro ao definir como padrão:', err)
				setStatus(`❌ Erro: ${msg}`)
			}
		}
	}

	return (
		<div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
			<h2 className="text-2xl font-bold text-blue-900 mb-3">SETUP MACHINE</h2>

			<SettingsStatus className="mb-6" />

			<div className="mb-4">
				<div className="flex gap-2 mb-4 items-center">
					{Object.keys(machineGroups).map((g) => (
						<button
							key={g}
							className={`px-4 py-2 rounded font-bold ${
								activeGroup === g ? "bg-blue-600 text-white" : "bg-gray-200 text-blue-900"
							}`}
							onClick={() => setActiveGroup(g)}
						>
							{machineGroups[g].name}
						</button>
					))}
					<div className="ml-auto flex items-center gap-2">
						<button
							className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
							onClick={() => setShowFatigueModal(true)}
							title="Configurar Fadiga"
						>
							⚙️ Config Fadiga
						</button>
					</div>
				</div>

				<div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
					<p className="text-sm text-blue-800">
						<strong>💡 Importante:</strong> Cada grupo de máquinas tem seu próprio caminho de rede específico.
						Selecione a aba acima para configurar o caminho de cada grupo individualmente.
					</p>
				</div>

				{/* SEÇÃO 1: CAMINHO DE REDE DO GRUPO */}
				<div className="bg-white border-2 border-gray-300 rounded-lg p-4 mb-6">
					<h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
						<FolderOpen size={20} className="text-blue-600" />
						1. Caminho de Rede do Grupo
					</h3>
					<p className="text-sm text-gray-600 mb-3">
						Configure o diretório base onde estão os arquivos de trabalho deste grupo de máquinas.
					</p>
					
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Network baseDir para {machineGroups[activeGroup].name}
					</label>
					<div className="flex gap-2">
						<input
							value={machineGroups[activeGroup].baseDir}
							onChange={(e) => updateGroupBaseDir(e.target.value)}
							className="flex-1 px-3 py-2 border rounded font-mono text-sm"
							placeholder={defaultGroups[activeGroup]?.baseDir || ""}
						/>
						<button
							onClick={async () => {
								setStatus("Abrindo seletor de pastas...")
								if (!(await ensureIpc())) {
									setStatus("Erro: IPC não disponível para selecionar pasta")
									return
								}
								const res = await ipcHelper.invoke("select-base-dir")
								if (res && res.success && res.path) {
									updateGroupBaseDir(res.path)
									setStatus("✅ Pasta selecionada")
								} else if (res && res.canceled) {
									setStatus("Seleção cancelada")
								} else {
									setStatus(`Erro: ${res?.error ?? "não foi possível selecionar"}`)
								}
							}}
							className="px-4 py-2 bg-gray-600 text-white rounded flex items-center gap-2 hover:bg-gray-700 transition-colors"
							disabled={!ipcReady}
						>
							<FolderOpen size={16} /> Procurar...
						</button>
						<button
							onClick={async () => {
								setStatus("Testando caminho...")
								if (!(await ensureIpc())) {
									setStatus("Erro: IPC não disponível para testar caminho")
									return
								}
								const res = await ipcHelper.invoke(
									"test-base-dir",
									machineGroups[activeGroup].baseDir,
								)
								if (res && res.success) {
									if (res.warning) setStatus(`⚠️ Aviso: ${res.warning}`)
									else setStatus("✅ Caminho validado com sucesso")
								} else {
									setStatus(`❌ Erro: ${res?.error ?? "não foi possível acessar"}`)
								}
							}}
							className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
							disabled={!ipcReady}
						>
							✓ Testar Caminho
						</button>
					</div>
				</div>

				{/* SEÇÃO 2: MAPEAMENTO DE MÁQUINAS */}
				<div className="bg-white border-2 border-gray-300 rounded-lg p-4 mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
								🔧 2. Mapeamento de Máquinas
							</h3>
							<p className="text-sm text-gray-600 mt-1">
								Configure os IDs das máquinas do grupo {machineGroups[activeGroup].name}
							</p>
						</div>
						<button
							onClick={addMachine}
							className="px-3 py-2 bg-green-600 text-white rounded flex items-center gap-2 hover:bg-green-700 transition-colors font-medium"
						>
							<Plus size={16} /> Adicionar Máquina
						</button>
					</div>

					<div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
						{Object.keys(machineGroups[activeGroup].machineMap)
							.sort((a, b) => Number(a) - Number(b))
							.map((key) => (
								<div key={key} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
									<div className="w-16 text-sm font-bold text-gray-700 text-center bg-white border rounded px-2 py-1">
										# {key}
									</div>
									<input
										type="text"
										className="machine-map-input flex-1 px-3 py-2 border rounded font-mono text-sm"
										value={machineGroups[activeGroup].machineMap[key]}
										onChange={(e) => updateMachine(key, e.target.value)}
										placeholder="Ex: 02-2010"
									/>
									<button
										onClick={() => removeMachine(key)}
										className="px-3 py-2 bg-red-500 text-white rounded flex items-center gap-1 hover:bg-red-600 transition-colors"
										title="Remover máquina"
									>
										<Trash2 size={16} /> Remover
									</button>
								</div>
							))}
					</div>
				</div>

{/* Fadiga: agora em local separado */}
				<div className="bg-white border-2 border-gray-300 rounded-lg p-4 mb-6">
					<h3 className="text-lg font-bold text-gray-800 mb-3">😴 Horários e Mensagens de Fadiga</h3>
					<p className="text-sm text-gray-600 mb-3">A configuração de horários e mensagens de fadiga foi movida para um local separado. Clique em <strong>"⚙️ Config Fadiga"</strong> no canto superior direito para abrir.</p>
					<button onClick={() => setShowFatigueModal(true)} className="px-3 py-2 bg-purple-600 text-white rounded">Abrir Config Fadiga</button>
				</div>

				{showFatigueModal && (
					<FatigueSettings
						machineGroups={machineGroups}
						activeGroup={activeGroup}
						ensureIpc={ensureIpc}
						setStatus={setStatus}
						onClose={() => setShowFatigueModal(false)}
					/>
				)}

				{/* SEÇÃO 3: CONFIGURAÇÃO DE SALVAMENTO DE DADOS */}
				<div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-300 rounded-lg p-4 mb-6">
					<h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
						<FolderOpen size={20} className="text-indigo-600" />
						3. Configuração de Salvamento de Dados
					</h3>
					<p className="text-sm text-indigo-700 mb-4">
						Defina onde os relatórios e dados do dashboard serão salvos. Esta pasta armazenará o arquivo <code className="bg-white px-1 rounded">turno_report.json</code>.
					</p>
					
					<label className="block text-sm font-medium text-indigo-900 mb-2">
						Pasta de Salvamento (Rede ou Local)
					</label>
					<div className="flex gap-2 mb-3">
						<input 
							value={networkSavePath} 
							onChange={(e) => setNetworkSavePath(e.target.value)} 
							className="flex-1 px-3 py-2 border border-indigo-300 rounded font-mono text-sm"
							placeholder="Ex: \\va\rede\...\AppData"
						/>
						<button 
							onClick={async () => {
								if (!(await ensureIpc())) { 
									setStatus('❌ Erro: IPC não disponível'); 
									return 
								}
								const res = await ipcHelper.invoke('select-base-dir')
								if (res && res.success && res.path) {
									setNetworkSavePath(res.path + '\\AppData')
									setStatus('✅ Pasta de salvamento selecionada')
								}
							}} 
							className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
							disabled={!ipcReady}
						>
							<FolderOpen size={16} /> Escolher Pasta
						</button>
					</div>

					<div className="flex gap-2">
						<button 
							className="px-4 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-800 transition-colors flex items-center gap-2 font-medium" 
							onClick={async () => {
								setStatus('⏳ Aplicando caminho de dados...')
								if (!(await ensureIpc())) { 
									setStatus('❌ Erro: IPC não disponível'); 
									return 
								}
								try {
									const res = await ipcHelper.invoke('get-settings')
									if (!(res && res.success && res.settings)) {
										setStatus('❌ Erro ao carregar configurações atuais')
										return
									}
									const settings = res.settings
									settings.networkDataPath = String(networkSavePath || (machineGroups[activeGroup].baseDir + '\\AppData')).trim()
									const saveRes = await ipcHelper.invoke('save-settings', settings)
									if (saveRes && saveRes.success) {
										setStatus('✅ Caminho aplicado com sucesso!')
										try { 
											const dp = await ipcHelper.invoke('get-data-path'); 
											if (dp && dp.success) setEffectiveDataPath(dp.path) 
										} catch(_){}
									} else {
										setStatus(`❌ Erro ao salvar: ${saveRes?.error ?? 'desconhecido'}`)
									}
								} catch (err) {
									setStatus(`❌ Erro: ${String(err)}`)
								}
							}}
							disabled={!ipcReady}
						>
							✓ Aplicar Caminho ao Dashboard
						</button>
						
						<button
							onClick={openDataFolder}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
							disabled={!ipcReady}
						>
							<FolderOpen size={16} /> Abrir Pasta de Dados
						</button>
					</div>

					{effectiveDataPath && (
						<div className="mt-3 p-3 bg-white rounded border border-indigo-200">
							<p className="text-xs text-gray-600 mb-1">Caminho efetivo atual:</p>
							<code className="text-sm text-indigo-900 font-mono break-all">{effectiveDataPath}</code>
						</div>
					)}
				</div>

				{/* SEÇÃO 3: CONFIGURAÇÃO DE REDE AVANÇADA */}
				<div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
					<h3 className="text-lg font-bold text-yellow-900 mb-3 flex items-center gap-2">
						⚙️ 3. Configuração de Rede Avançada
					</h3>
					<p className="text-sm text-yellow-800 mb-4">
						Crie um arquivo de configuração padrão na rede para compartilhar settings entre múltiplas máquinas.
					</p>
					
					<button 
						className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors flex items-center gap-2 font-medium" 
						onClick={async () => {
							setStatus('⏳ Criando configurações na rede...')
							if (!(await ensureIpc())) { 
								setStatus('❌ Erro: IPC não disponível'); 
								return 
							}
							try {
								// Salva as configurações antes de publicar na rede
								try { await saveSettings() } catch (e) { console.warn('[Setup] Falha ao salvar antes de criar padrão:', e) }
								const res = await ipcHelper.invoke('create-default-network-settings')
								if (res && res.success) {
									setStatus('✅ Arquivo settings.json criado na rede com sucesso')
									try { 
										const r2 = await ipcHelper.invoke('get-settings'); 
										if (r2 && r2.success) { 
											setMachineGroups(r2.settings.machineGroups || r2.settings) 
										} 
								} catch(_){ void _ }
								} else {
									setStatus(`❌ Erro ao criar: ${res?.error ?? 'desconhecido'}`)
								}
							} catch (err) {
								setStatus(`❌ Erro: ${String(err)}`)
							}
						}}
						disabled={!ipcReady}
					>
						📄 Criar Config Padrão na Rede
					</button>
					<p className="text-xs text-yellow-700 mt-2">
						Isso criará um arquivo <code className="bg-white px-1 rounded">settings.json</code> na pasta AppData de rede configurada acima.
					</p>
				</div>
			</div>

			{/* SEÇÃO 4: PERÍODOS / BASE DE CÁLCULO */}
			<div className="bg-white border-2 border-orange-300 rounded-lg p-4 mb-6">
				<h3 className="text-lg font-bold text-orange-900 mb-1 flex items-center gap-2">
					⏱️ 4. Períodos — Base de Cálculo dos Turnos
				</h3>
				<p className="text-sm text-orange-700 mb-1">
					Define quantos minutos produtivos existem em cada período do turno.<br />
					<strong>Salvo localmente nesta máquina — nunca na rede.</strong>
				</p>

				{/* Tab selector */}
				<div className="flex gap-2 mb-3">
					{(["turno1", "turno2", "turno3"] as const).map((t, i) => (
						<button
							key={t}
							className={`px-4 py-1 rounded font-bold text-sm ${periodosActiveTurno === t ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800"}`}
							onClick={() => setPeriodosActiveTurno(t)}
						>
							{i + 1}º Turno
						</button>
					))}
				</div>

				{periodosConfig ? (
					<>
						<table className="w-full text-sm border-collapse mb-3">
							<thead>
								<tr className="bg-orange-50">
									<th className="border border-orange-200 px-3 py-1 text-left">Início</th>
									<th className="border border-orange-200 px-3 py-1 text-left">Fim</th>
									<th className="border border-orange-200 px-3 py-1 text-center w-36">Base Cálculo (min)</th>
								</tr>
							</thead>
							<tbody>
								{periodosConfig[periodosActiveTurno].map((p, idx) => (
									<tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-orange-50"}>
										<td className="border border-orange-200 px-3 py-1 font-mono text-gray-700">{p.inicio}</td>
										<td className="border border-orange-200 px-3 py-1 font-mono text-gray-700">{p.fim}</td>
										<td className="border border-orange-200 px-2 py-1 text-center">
											<input
												type="number"
												min={0}
												max={999}
												className="w-24 px-2 py-0.5 border rounded text-center font-mono"
												value={p.baseCalculo}
												onChange={(e) => {
													const val = Math.max(0, Math.min(999, parseInt(e.target.value) || 0))
													setPeriodosConfig((prev) => {
														if (!prev) return prev
														const turnoArr = [...prev[periodosActiveTurno]]
														turnoArr[idx] = { ...turnoArr[idx], baseCalculo: val }
														return { ...prev, [periodosActiveTurno]: turnoArr }
													})
												}}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<div className="flex gap-2 items-center flex-wrap">
							<button
								className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
								disabled={!ipcReady}
								onClick={async () => {
									setPeriodosStatus("Salvando...")
									if (!(await ensureIpc())) {
										setPeriodosStatus("❌ IPC não disponível")
										return
									}
									const res = await ipcHelper.invoke("save-periodos-config", periodosConfig)
									if (res && res.success) {
										setPeriodosStatus("✅ Períodos salvos localmente")
									} else {
										setPeriodosStatus(`❌ Erro: ${res?.error ?? "desconhecido"}`)
									}
								}}
							>
								💾 Salvar Períodos
							</button>
							<button
								className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
								onClick={async () => {
									if (confirm("Restaurar os valores padrão dos períodos?")) {
										const res = await ipcHelper.invoke("get-default-periodos-config")
										if (res && res.success && res.config) {
											setPeriodosConfig(res.config)
											setPeriodosStatus("Padrões restaurados — clique em Salvar para aplicar")
										}
									}
								}}
							>
								↺ Restaurar Padrão
							</button>
							{periodosStatus && (
								<span className="text-sm text-gray-700">{periodosStatus}</span>
							)}
						</div>
					</>
				) : (
					<p className="text-sm text-gray-500">Carregando períodos...</p>
				)}
			</div>

			{/* SEÇÃO 5: AÇÕES PRINCIPAIS */}
			<div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6">
				<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
					💾 5. Ações e Controles
				</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
					<button 
						onClick={() => {
							console.log('[Setup] SAVE BUTTON CLICKED - ipcReady:', ipcReady)
							saveSettings()
						}} 
						className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2" 
						disabled={!ipcReady}
					>
						💾 Salvar Configurações
					</button>
					
					<button
						onClick={setAsNewDefault}
						className="px-6 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
						disabled={!ipcReady}
						title="Define as configurações atuais como novo padrão para todas as máquinas"
					>
						⭐ Definir como Padrão
					</button>
					
					<button
						onClick={restoreDefaults}
						className="px-6 py-3 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
					>
						↺ Restaurar Padrões
					</button>
					
					<button 
						onClick={resetAllSettings} 
						className="px-6 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" 
						disabled={!ipcReady}
					>
						🗑️ Reset Completo
					</button>
					
					{!ipcReady && (
						<button 
							onClick={() => window.location.reload()} 
							className="px-6 py-3 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
						>
							🔄 Recarregar Página
						</button>
					)}
				</div>

				<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
					<p className="text-sm text-blue-800">
						<strong>💡 Dica:</strong> Sempre clique em <strong>"Salvar Configurações"</strong> após fazer alterações para garantir que sejam aplicadas.
					</p>
				</div>
			</div>

			{status && <div className="mt-4 text-sm text-gray-800">{status}</div>}
			{!ipcReady && (
				<div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-sm">
					⚠️ IPC não está disponível. Clique em "Recarregar Página" ou pressione Ctrl+R
				</div>
			)}
		</div>
	)
}

