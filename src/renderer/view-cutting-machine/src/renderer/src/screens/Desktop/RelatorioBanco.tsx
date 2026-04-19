import { useCallback, useEffect, useState } from "react"
import vulcabrasLogo from "../../assets/vulcabras-1024x358.jpg"
import CategoriaDonutChart from "../../components/CategoriaDonutChart"
import Dashboard from "../../components/Dashboard"

// Default static mapping kept as a fallback; will prefer persisted settings when available
const defaultMachineMaps: Record<string, Record<string, string>> = {
	Laser: {
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
	Lectra: {
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
	Emma: {
		1: "02-2774",
		2: "02-2672",
		3: "02-2501",
		4: "02-2773",
	},
	Comelz: {
		1: "02-1555",
		2: "02-1556",
		3: "02-1558",
		4: "02-1507",
	},
	ComelzMontagem: {
		1: "02-1471",
		2: "02-1334",
		3: "02-1557",
	},
	ComelzSolas: {
		1: "02-1559",
		2: "02-1325",
	},
}

const turnos = ["1º Turno", "2º Turno", "3º Turno"]
const abas = ["Dashboard", "Laser", "Lectra", "Emma", "Comelz", "ComelzMontagem", "ComelzSolas"]

type ReportRow = {
	id: number
	date: string
	turno: number
	maquina: string
	periodo: string
	porcentagem: number
}

export default function RelatorioBanco() {
	const [date, setDate] = useState(() => {
		// Use local date to avoid UTC timezone shift issues
		const now = new Date()
		const year = now.getFullYear()
		const month = String(now.getMonth() + 1).padStart(2, "0")
		const day = String(now.getDate()).padStart(2, "0")
		return `${year}-${month}-${day}`
	})
	// Range for relatório por turno
	const [startDate, setStartDate] = useState(date)
	const [endDate, setEndDate] = useState(date)
	const [turno, setTurno] = useState(0)
	const [dados, setDados] = useState<ReportRow[]>([])
	const [aba, setAba] = useState("Dashboard")

	// If user switches away from 3º turno, reset start/end to the single capture date
	useEffect(() => {
		if (turno !== 2) {
			setStartDate(date)
			setEndDate(date)
		}
	}, [turno, date])

	// machineMaps loaded from persisted settings (or default fallback)
	const [machineMaps, setMachineMaps] =
		useState<Record<string, Record<string, string>>>(defaultMachineMaps)
	// carregando state removed (no manual update button shown)

	// Função separada para carregar dados salvos
	const carregarDadosSalvos = useCallback(async () => {
		// starting load
		try {
			console.log(
				`[CARREGANDO] Solicitando dados para: intervalo=${startDate} → ${endDate}, turno=${turno + 1} (índice ${turno}), tipo=${aba}`,
			)

			// Build inclusive date list between startDate and endDate
			const buildDateRange = (from: string, to: string) => {
				const dates: string[] = []
				// Helper to parse date as local instead of UTC
				const parseLocalDate = (dateStr: string) => {
					const [year, month, day] = dateStr.split("-").map(Number)
					return new Date(year, month - 1, day)
				}
				let a = parseLocalDate(from)
				const b = parseLocalDate(to)
				if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return dates
				if (a > b) {
					// swap
					const tmp = a
					a = b
					b.setTime(tmp.getTime())
				}
				for (; a <= b; a.setDate(a.getDate() + 1)) {
					dates.push(
						`${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, "0")}-${String(a.getDate()).padStart(2, "0")}`,
					)
				}
				return dates
			}

			const dateList = buildDateRange(startDate, endDate)
			const aggregated: Record<string, ReportRow> = {}
			for (const d of dateList) {
				// for 3º turno we also query previous date to include overnight stored records
				const candidates = [d]
				if (turno === 2) {
					const prev = new Date(d)
					prev.setDate(prev.getDate() - 1)
					candidates.push(
						`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`,
					)
				}
				for (const qd of Array.from(new Set(candidates))) {
					try {
						console.log(
							`[CARREGANDO] Solicitando ${qd} turno=${turno} aba=${aba}`,
						)
						const res = await window.electron?.ipcRenderer?.invoke(
							"get-saved-turno-reports",
							{ date: qd, turno, aba },
						)
						if (Array.isArray(res)) {
							for (const item of res) {
								const key = `${item.date}_${item.turno}_${String(item.maquina).trim()}_${String(item.periodo).trim()}`
								if (!aggregated[key]) aggregated[key] = item
							}
						}
					} catch (err) {
						console.error(`[CARREGANDO] Erro ao solicitar ${qd}:`, err)
					}
				}
			}

			// Filter aggregated results by machines of selected aba
			const maquinasDoTipo = Object.values(machineMaps[aba] ?? {}) as string[]
			const dadosFiltrados = Object.values(aggregated).filter((item) =>
				maquinasDoTipo.includes(item.maquina),
			)

			console.log(
				`[CARREGANDO] Total agregados: ${Object.keys(aggregated).length}`,
			)
			console.log(
				`[CARREGANDO] Filtrados para ${aba}: ${dadosFiltrados.length}`,
			)
			setDados(dadosFiltrados as ReportRow[])
		} catch (error) {
			console.error("[CARREGANDO] Erro ao carregar dados:", error)
			setDados([])
		} finally {
			// finished load
		}
	}, [startDate, endDate, turno, aba, machineMaps])

	// Load persisted settings on mount and subscribe to updates
	useEffect(() => {
		let unsubscribe: (() => void) | undefined
		const loadSettings = async () => {
			try {
				const settings =
					await window.electron?.ipcRenderer?.invoke("get-settings")
				if (settings && settings.machineGroups) {
					// settings.machineGroups may have the shape { Laser: { name, machineMap: {..} } }
					// we want to extract the inner machineMap for each group when present
					const merged: typeof defaultMachineMaps = { ...defaultMachineMaps }
					for (const [groupKey, groupVal] of Object.entries(
						settings.machineGroups,
					)) {
						// groupVal can be { name, machineMap } or a direct map
						// @ts-ignore - runtime shape check
						const candidate = groupVal && (groupVal.machineMap ?? groupVal)
						if (candidate && typeof candidate === "object") {
							// ensure values are strings
							merged[groupKey as keyof typeof merged] = candidate as Record<
								string,
								string
							>
						}
					}
					setMachineMaps(merged)
				}
			} catch (err) {
				console.error("Erro ao carregar settings persistidos:", err)
			}
		}

		loadSettings()

		// subscribe for settings updates from main
		if (window.electron?.ipcRenderer?.on) {
			unsubscribe = window.electron.ipcRenderer.on("settings-updated", () => {
				console.log("settings-updated received, reloading settings...")
				loadSettings()
			})
		}

		return () => {
			if (typeof unsubscribe === "function") unsubscribe()
		}
	}, [])

	// Captura automática de dados
	// Função para capturar manualmente (botão) - Comentada pois não está sendo utilizada
	// const captureData = useCallback(async () => {
	// 	try {
	// 		console.log(
	// 			`[MANUAL CAPTURE] Capturando dados do turno ${turno + 1} (índice ${turno}) para ${date}`,
	// 		)
	// 		const res = await window.electron?.ipcRenderer?.invoke(
	// 			"capture-turno-data",
	// 			{
	// 				date,
	// 				turno: turno,
	// 				aba: aba,
	// 			},
	// 		)
	// 		console.log("[MANUAL CAPTURE] Resultado:", res)
	// 		// Recarrega dados salvos após captura manual
	// 		await carregarDadosSalvos()
	// 	} catch (error) {
	// 		console.error("[MANUAL CAPTURE] Erro ao capturar dados:", error)
	// 	}
	// }, [date, turno, aba, carregarDadosSalvos])

	// Effect: carregar dados salvos quando a data mudar
	// A captura automática agora é feita em segundo plano pelo processo principal
	useEffect(() => {
		console.log(`[RELATORIO] Carregando dados para ${date}`)
		carregarDadosSalvos()
	}, [date, carregarDadosSalvos])

	// Effect: load aggregated report for the selected interval
	useEffect(() => {
		carregarDadosSalvos()
	}, [carregarDadosSalvos])

	// openDataFolder removed: UI no longer exposes a button to open data folder

	const maquinas = aba === "Dashboard" ? [] : (Object.values(machineMaps[aba]) as string[])

	// State for bulk capture across interval
	const [isCapturingAll, setIsCapturingAll] = useState(false)
	const [captureProgress, setCaptureProgress] = useState<{
		done: number
		total: number
	}>({ done: 0, total: 0 })
	const [captureResults, setCaptureResults] = useState<
		Array<{
			date: string
			aba: string
			turno: number
			ok: boolean
			error?: string
			skipped?: boolean
		}>
	>([])

	// Capture all for interval across all abas and turnos (sequential)
	const captureAllInterval = useCallback(async () => {
		// small delay helper local to avoid being a dependency
		const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
		try {
			setIsCapturingAll(true)
			setCaptureResults([])
			const buildDateRange = (from: string, to: string): string[] => {
				const dates: string[] = []
				let a = new Date(from)
				const b = new Date(to)
				if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return dates
				if (a > b) {
					const tmp = a
					a = b
					b.setTime(tmp.getTime())
				}
				for (; a <= b; a.setDate(a.getDate() + 1)) {
					dates.push(
						`${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, "0")}-${String(a.getDate()).padStart(2, "0")}`,
					)
				}
				return dates
			}

			const dateList = buildDateRange(startDate, endDate)
			const combos: Array<{ date: string; aba: string; turno: number }> = []
			for (const d of dateList) {
				for (const a of abas) {
					for (let t = 0; t < 3; t++) combos.push({ date: d, aba: a, turno: t })
				}
			}
			setCaptureProgress({ done: 0, total: combos.length })
			for (const c of combos) {
				try {
					console.log("[CAPTURAR-TUDO] verificando existência para", c)
					// check if data already exists for this combo
					const existing = await window.electron?.ipcRenderer?.invoke(
						"get-saved-turno-reports",
						{ date: c.date, turno: c.turno, aba: c.aba },
					)
					if (Array.isArray(existing) && existing.length > 0) {
						// already present — skip capture
						setCaptureResults((s) => [...s, { ...c, ok: true, skipped: true }])
					} else {
						console.log("[CAPTURAR-TUDO] solicitando captura para", c)
						await window.electron?.ipcRenderer?.invoke("capture-turno-data", {
							date: c.date,
							turno: c.turno,
							aba: c.aba,
						})
						setCaptureResults((s) => [...s, { ...c, ok: true }])
					}
				} catch (err) {
					console.error("[CAPTURAR-TUDO] erro em", c, err)
					setCaptureResults((s) => [
						...s,
						{ ...c, ok: false, error: String(err) },
					])
				}
				setCaptureProgress((p) => ({ ...p, done: p.done + 1 }))
				// small delay to avoid overloading main process
				await delay(200)
			}
			// after finishing, optionally reload aggregated data
			await carregarDadosSalvos()
		} finally {
			setIsCapturingAll(false)
		}
	}, [startDate, endDate, carregarDadosSalvos])

	// Lista canônica de períodos por turno (formato "HH:MM-HH:MM")
	const canonicalPeriodos = [
		[
			"05:00-06:00",
			"06:00-07:00",
			"07:00-08:00",
			"08:00-09:00",
			"09:00-10:00",
			"10:00-11:00",
			"11:00-12:00",
			"12:00-13:20",
		],
		[
			"13:20-14:00",
			"14:00-15:00",
			"15:00-16:00",
			"16:00-17:00",
			"17:00-18:00",
			"18:00-19:00",
			"19:00-20:00",
			"20:00-21:40",
		],
		[
			"21:40-22:00",
			"22:00-23:00",
			"23:00-00:00",
			"00:00-01:00",
			"01:00-02:00",
			"02:00-03:00",
			"03:00-04:00",
			"04:00-05:00",
		],
	]

	// Use canonical periods for the selected turno; fall back to periods derived from data if data contains periods not in canonical list
	const periodoSetFromData = new Set(dados.map((d) => d.periodo))
	let periodos = canonicalPeriodos[turno].filter((p) =>
		periodoSetFromData.has(p),
	)
	// If some canonical periods are missing in data, still include them to keep columns consistent
	if (periodos.length === 0) {
		periodos = canonicalPeriodos[turno]
	}
	const ocupacao: Record<string, Record<string, number>> = {}
	maquinas.forEach((m) => {
		ocupacao[m] = {}
	})

	console.log("[OCUPACAO] Dados disponíveis:", dados)
	console.log("[OCUPACAO] Máquinas esperadas:", maquinas)

	dados.forEach(({ maquina, periodo, porcentagem }) => {
		console.log(
			`[OCUPACAO] Processando: máquina=${maquina}, período=${periodo}, porcentagem=${porcentagem}`,
		)
		if (ocupacao[maquina]) {
			ocupacao[maquina][periodo] = porcentagem
		} else {
			console.warn(`[OCUPACAO] Máquina ${maquina} não encontrada no mapeamento`)
		}
	})

	console.log("[OCUPACAO] Ocupação final:", ocupacao)
	// Compute per-machine geral percent (lookup) and a separate ranking list
	const machineGeralMap: Record<
		string,
		{ percent: number; percentStr: string }
	> = {}

	// Summary counters for UI (captured / skipped / errors)
	const capturedCount = captureResults.filter((r) => r.ok && !r.skipped).length
	const skippedCount = captureResults.filter((r) => !!r.skipped).length
	const errorCount = captureResults.filter((r) => !r.ok).length
	const ranking = maquinas
		.map((m, idx) => {
			const percent = Math.round(
				periodos.length
					? periodos.reduce((a, p) => a + (ocupacao[m][p] ?? 0), 0) /
							periodos.length
					: 0,
			)
			const percentStr = `${percent}%`
			machineGeralMap[m] = { percent, percentStr }
			return {
				nome: m,
				idx,
				percent,
				percentStr,
			}
		})
		.sort((a, b) => b.percent - a.percent)
	const donutData = [
		0,
		0,
		0,
		ranking.length
			? Math.round(ranking.reduce((a, b) => a + b.percent, 0) / ranking.length)
			: 0,
		0,
	]
	const geralDonut = donutData[3] + "%"

	return (
		<div className="p-6 bg-white rounded-lg shadow-lg">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-bold text-blue-700">
					RELATÓRIO DO BANCO DE DADOS
				</h2>
				<div className="flex items-center gap-2">
					<button
						className="px-3 py-2 bg-green-600 text-white rounded font-semibold text-sm"
						onClick={() => captureAllInterval()}
						disabled={isCapturingAll}
					>
						{isCapturingAll
							? `Capturando... ${captureProgress.done}/${captureProgress.total}`
							: "Capturar tudo"}
					</button>
					{(captureResults.length > 0 || isCapturingAll) && (
						<span className="text-sm text-gray-700 ml-2">
							{`${capturedCount} capturados`}
							{skippedCount ? ` • ${skippedCount} pulados` : ""}
							{errorCount ? ` • ${errorCount} erros` : ""}
						</span>
					)}
				</div>
			</div>

			{aba !== "Dashboard" && (
				<div className="flex items-center gap-4 mb-4">
					{turno !== 2 && (
						<div className="flex flex-col items-start">
							<span className="text-gray-600 text-xs">DATA (captura)</span>
							<input
								type="date"
								className="border rounded px-2 py-1 text-sm"
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
							{new Date(date).setHours(0, 0, 0, 0) >
								new Date().setHours(0, 0, 0, 0) && (
								<span className="text-orange-600 text-xs mt-1">
									⚠️ Data futura - apenas dados já salvos serão exibidos
								</span>
							)}
						</div>
					)}
					{turno === 2 && (
						<>
							<div className="flex flex-col items-start">
								<span className="text-gray-600 text-xs">DATA INICIAL</span>
								<input
									type="date"
									className="border rounded px-2 py-1 text-sm"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
								/>
								<span className="text-gray-500 text-xs">
									Horário fixo: 21:40
								</span>
							</div>
							<div className="flex flex-col items-start">
								<span className="text-gray-600 text-xs">DATA FINAL</span>
								<input
									type="date"
									className="border rounded px-2 py-1 text-sm"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
								<span className="text-gray-500 text-xs">
									Horário fixo: 05:00
								</span>
							</div>
						</>
					)}
				</div>
			)}

			<div className="flex gap-2 mb-4">
				{abas.map((tab) => (
					<button
						key={tab}
						className={`px-4 py-2 rounded font-bold ${aba === tab ? "bg-blue-600 text-white" : "bg-gray-200 text-blue-900"}`}
						onClick={() => setAba(tab)}
					>
						{tab}
					</button>
				))}
			</div>
			<div className="flex gap-4 mb-6">
				{aba !== "Dashboard" && turnos.map((t, idx) => (
					<div key={t} className="inline-flex items-center">
						<button
							className={`px-4 py-2 rounded ${turno === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
							onClick={() => {
								console.log(`[TURNOS] setTurno called with index: ${idx}`)
								setTurno(idx)
							}}
							// Add a tooltip for the 3º turno button to explain date semantics
							title={
								idx === 2
									? "3º turno → defina a data para o dia em que começa (ex.: 24/09 para 24→25/09)"
									: undefined
							}
						>
							{t}
						</button>
						{idx === 2 && (
							<span
								className="ml-2 inline-block w-5 h-5 rounded-full text-center text-white bg-blue-600 text-xs font-bold"
								title="3º turno → defina a data para o dia em que começa (ex.: 24/09 para 24→25/09)"
							>
								i
							</span>
						)}
					</div>
				))}
			</div>

			{/* Explanatory message for 3º turno date semantics */}
			{turno === 2 && aba !== "Dashboard" && (
				<div className="mb-4 p-3 bg-blue-100 border-l-4 border-blue-600 text-sm text-blue-900 rounded">
					<strong>Observação:</strong>
					<span className="ml-2">
						O 3º turno pertence à data em que começa. Por exemplo:
					</span>
					<span className="font-bold ml-1"> selecione 24/09 </span>
					<span className="ml-1">para visualizar o turno de 24→25/09.</span>
				</div>
			)}

			{/* Renderizar Dashboard ou conteúdo normal */}
			{aba === "Dashboard" ? (
				<Dashboard />
			) : (
			<div className="grid grid-cols-2 gap-6 text-black">
				{/* Tabela de ocupação */}
				<div className="bg-gray-50 rounded p-4">
					<h3 className="font-semibold mb-2">
						{`BANCO - ${aba} - ${turnos[turno]} - MÁQUINAS`}
					</h3>
					<table className="w-full text-sm">
						<thead>
							<tr>
								<th className="p-1 align-bottom text-blue-900 font-bold">
									<div className="flex flex-col items-center">
										<span>Máquina</span>
									</div>
								</th>
								{periodos.map((p) => (
									<th key={p} className="p-1 text-blue-900 font-bold">
										<div className="flex flex-col items-center">
											<span>{p}</span>
										</div>
									</th>
								))}
								<th className="p-1 bg-white"></th>
								<th className="p-1 align-bottom">GERAL TURNO</th>
							</tr>
						</thead>
						<tbody>
							{maquinas.map((m) => (
								<tr key={String(m)}>
									<td className="p-1 font-bold border border-black text-center text-black">
										{String(m)}
									</td>
									{periodos.map((p) => {
										const val = ocupacao[m][p]
										let colorClass = "text-black"
										if (typeof val === "number") {
											if (val < 75)
												colorClass = "bg-red-700 text-black font-bold"
											else if (val <= 80)
												colorClass = "bg-yellow-400 text-black font-bold"
											else colorClass = "bg-green-700 text-black font-bold"
										}
										return (
											<td
												key={p}
												className={`border border-black text-center ${colorClass}`}
											>
												{typeof val === "number" ? `${Math.round(val)}%` : "-"}
											</td>
										)
									})}
									<td className="p-1 bg-white"></td>
									<td
										className={`p-1 text-center border border-black ${machineGeralMap[m].percent < 75 ? "bg-red-700 text-black font-bold" : machineGeralMap[m].percent <= 80 ? "bg-yellow-400 text-black font-bold" : "bg-green-700 text-black font-bold"}`}
									>
										{machineGeralMap[m].percentStr}
									</td>
								</tr>
							))}
							<tr className="font-bold">
								<td className="p-1 border border-black">
									<span className="text-black font-bold">GERAL</span>
								</td>
								{periodos.map((p, i) => {
									const values = maquinas.map((m) => ocupacao[m][p] ?? 0)
									const avg = values.length
										? Math.round(
												values.reduce((a, b) => a + b, 0) / values.length,
											)
										: 0
									return (
										<td
											key={i}
											className={`p-1 text-center border border-black ${avg < 75 ? "bg-red-700 text-black font-bold" : avg <= 80 ? "bg-yellow-400 text-black font-bold" : "bg-green-700 text-black font-bold"}`}
										>
											{avg}%
										</td>
									)
								})}
								<td className="p-1 bg-white"></td>
								<td
									className={`p-1 text-center border border-black ${parseFloat(geralDonut) < 75 ? "bg-red-700 text-black font-bold" : parseFloat(geralDonut) <= 80 ? "bg-yellow-400 text-black font-bold" : "bg-green-700 text-black font-bold"}`}
								>
									<span className="text-black font-bold">{geralDonut}</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				{/* Ranking de máquinas + gráfico de categorias */}
				<div className="flex flex-col gap-4">
					<div className="bg-gray-50 rounded p-3 mb-2">
						<h3 className="font-semibold mb-2 text-sm">
							{`RANKING DE MÁQUINAS ${turnos[turno]}`}
						</h3>
						<ul>
							{ranking.map((item, rankIdx) => {
								const colorClass =
									item.percent < 75
										? "bg-red-700"
										: item.percent <= 80
											? "bg-yellow-400"
											: "bg-green-700"
								const style =
									colorClass === "bg-yellow-400"
										? { backgroundColor: "#e6c200" }
										: {}
								return (
									<li
										key={String(item.nome)}
										className={`mb-0.5 px-1 py-0.5 rounded text-xs text-black ${colorClass} ${item.percent !== 0 ? "font-bold" : ""}`}
										style={style}
									>
										{String(rankIdx + 1).padStart(2, "0")}º Lugar | Máquina{" "}
										{String(item.nome)} - {item.percentStr}
									</li>
								)
							})}
						</ul>
					</div>
					<div className="bg-gray-50 rounded p-4 flex flex-col items-center">
						<h3 className="font-semibold mb-2">
							% INTERFERÊNCIAS E OCUPAÇÃO POR CATEGORIAS
						</h3>
						<CategoriaDonutChart data={donutData} geral={geralDonut} />
						<img
							src={vulcabrasLogo}
							alt="Logo da Vulcabras"
							style={{ maxWidth: "180px", height: "auto", marginTop: 35 }}
						/>
					</div>
				</div>
			</div>
		)}
		</div>
	)
}
