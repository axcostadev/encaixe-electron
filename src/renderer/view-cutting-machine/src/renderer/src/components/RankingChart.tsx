import React from "react"

interface MachineMap {
	[key: number]: string
}

interface RankingData {
	position: number
	percentage: number
	machine: string
}

interface RankingChartProps {
	data: RankingData[]
	machineMap: MachineMap
	isLoading?: boolean
}

export const RankingChart: React.FC<RankingChartProps> = ({
	data = [],
	machineMap = {},
	isLoading = false,
}) => {
	// LOG: Verificar dados recebidos
	console.log("RankingChart - Dados recebidos:", data)
	const machine11Data = data.find((item) => item.machine === "02-1454")
	console.log("RankingChart - Máquina 11 nos dados:", machine11Data)

	// Validate and sanitize data to prevent errors
	const safeData = React.useMemo(() => {
		const result = (data || [])
			.filter(
				(item) =>
					item &&
					typeof item === "object" &&
					typeof item.percentage === "number" &&
					typeof item.machine === "string" &&
					typeof item.position === "number" &&
					!isNaN(item.percentage) &&
					item.machine.length > 0,
			)
			.map((item) => ({
				...item,
				percentage: Math.max(0, Math.min(100, item.percentage)), // Clamp between 0-100
			}))

		console.log("RankingChart - SafeData:", result)
		const machine11Safe = result.find((item) => item.machine === "02-1454")
		console.log("RankingChart - Máquina 11 no safeData:", machine11Safe)

		return result
	}, [data])

	// Sempre renderiza, mesmo se data estiver vazio ou só com valores zerados

	const CHART_HEIGHT = 300

	// Animação de subida das porcentagens
	const [animatedPercentages, setAnimatedPercentages] = React.useState<
		number[]
	>([])

	React.useEffect(() => {
		// Sempre sincroniza o tamanho do array com safeData
		if (animatedPercentages.length !== safeData.length) {
			setAnimatedPercentages(safeData.map(() => 0))
			return
		}

		if (isLoading) {
			setAnimatedPercentages(safeData.map(() => 0))
		} else {
			// Anima gradualmente até o valor real
			let frame = 0
			const duration = 700 // ms
			const steps = 20
			const interval = duration / steps
			const increments = safeData.map((item) => (item?.percentage || 0) / steps)
			const timer = setInterval(() => {
				frame++
				setAnimatedPercentages((prev) =>
					prev.map((val, idx) =>
						frame < steps
							? Math.min(val + increments[idx], safeData[idx]?.percentage || 0)
							: safeData[idx]?.percentage || 0,
					),
				)
				if (frame >= steps) clearInterval(timer)
			}, interval)
		}
		// Nenhum return necessário
	}, [safeData, isLoading, animatedPercentages.length])

	// Ordena dados para garantir posição crescente
	const processedData = safeData
		.map((item, idx) => ({
			...item,
			animated:
				animatedPercentages[idx] !== undefined
					? animatedPercentages[idx]
					: item.percentage,
		}))
		.filter(
			(item) =>
				item.position != null &&
				item.machine != null &&
				!isNaN(item.percentage),
		)
		.sort((a, b) => a.position - b.position)

	console.log("RankingChart - ProcessedData:", processedData)
	console.log("RankingChart - AnimatedPercentages:", animatedPercentages)
	console.log("RankingChart - SafeData length:", safeData.length)
	console.log(
		"RankingChart - AnimatedPercentages length:",
		animatedPercentages.length,
	)
	const machine11Processed = processedData.find(
		(item) => item.machine === "02-1454",
	)
	console.log("RankingChart - Máquina 11 no processedData:", machine11Processed)

	// Calculate dynamic width based on number of machines
	// Each machine needs approximately 100px, plus padding
	const dynamicWidth = Math.max(1200, processedData.length * 100 + 100)

	return (
		<div 
			className="bg-white rounded-xl shadow-xl p-6 w-full" 
			style={{ minWidth: `${dynamicWidth}px` }}
		>
			<div className="flex justify-between items-end gap-2">
				{processedData.map((item) => {
					const percentage = Math.max(0, Math.min(100, item.animated))
					const fillHeight = (percentage / 100) * CHART_HEIGHT

					// Define cor da barra segundo a porcentagem
					const barColor =
						percentage === 0
							? "bg-gray-400"
							: percentage < 75
								? "bg-red-500"
								: percentage <= 79
									? "bg-yellow-500"
									: "bg-green-500"

					// Busca o número fixo da máquina a partir do código
					const machineId =
						Object.entries(machineMap).find(
							([_, code]) => code === item.machine,
						)?.[0] || "0"

					return (
						<div
							key={`rank-${item.position}-${item.machine}`}
							className="flex flex-col items-center flex-1 min-w-[80px]"
						>
							<div className="text-blue-900 font-bold text-3xl mb-3">
								{item.position}°
							</div>

							<div
								className="w-full bg-gray-200 rounded-lg relative flex flex-col justify-end"
								style={{ height: `${CHART_HEIGHT}px` }}
							>
								<div
									className={`${barColor} w-full rounded-lg flex items-center justify-center text-white font-bold transition-all duration-700 ease-out`}
									style={{
										height: `${fillHeight}px`,
										minHeight: percentage > 0 ? "20px" : "0px",
									}}
								>
									{percentage > 0 && (
										<span className="text-3xl font-bold text-white drop-shadow-[1px_1px_0px_#000]">
											{percentage.toFixed(0)}%
										</span>
									)}
								</div>

								{percentage === 0 && (
									<div className="absolute inset-0 flex items-center justify-center">
										<span className="text-3xl font-bold text-red-900">0%</span>
									</div>
								)}
							</div>

							<div className="text-center mt-3 w-full">
								<div className="text-blue-900 font-bold text-3xl truncate">
									{item.machine}
								</div>
								<div className="text-gray-900 font-bold text-5xl mt-1">
									{machineId.padStart(2, "0")}
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
