import React, { useState } from "react"

interface RankingData {
	[machine: string]: {
		[period: string]: number
	}
}

interface MachineInfo {
	id: string
	label: string
}

const machines: MachineInfo[] = [
	{ id: "02-2010", label: "01" },
	{ id: "02-2416", label: "02" },
	{ id: "02-1765", label: "03" },
	{ id: "02-1702", label: "04" },
	{ id: "02-2388", label: "05" },
	{ id: "02-1804", label: "06" },
	{ id: "02-1867", label: "07" },
	{ id: "02-1548", label: "08" },
	{ id: "02-1767", label: "09" },
	{ id: "02-1868", label: "10" },
	{ id: "02-1869", label: "11" },
	{ id: "02-1870", label: "12" },
	{ id: "02-1871", label: "13" },
]

interface Props {
	rankingData: RankingData
	periods: string[]
	onPeriodChange?: (period: string) => void
}

export const RankingByPeriod: React.FC<Props> = ({
	rankingData,
	periods,
	onPeriodChange,
}) => {
	const [selectedPeriod, setSelectedPeriod] = useState(periods[0])

	// Notifica o pai quando o período muda
	function handlePeriodClick(period: string) {
		setSelectedPeriod(period)
		if (typeof onPeriodChange === "function") {
			onPeriodChange(period)
		}
	}

	// Ordena máquinas pelo percentual do período selecionado
	const ranking = machines
		.map((machine) => ({
			...machine,
			percent: rankingData[machine.id]?.[selectedPeriod] ?? 0,
		}))
		.sort((a, b) => b.percent - a.percent)

	// Divide os períodos em duas linhas
	const half = Math.ceil(periods.length / 2)
	const periodsRow1 = periods.slice(0, half)
	const periodsRow2 = periods.slice(half)

	return (
		<div style={{ maxWidth: 1100, margin: "0 auto" }}>
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 8,
					justifyContent: "center",
				}}
			>
				{periodsRow1.map((period) => (
					<button
						key={period}
						onClick={() => handlePeriodClick(period)}
						style={{
							padding: "8px 16px",
							background: selectedPeriod === period ? "#e0e0e0" : "#fff",
							border: "1px solid #ccc",
							borderRadius: 4,
							fontWeight: selectedPeriod === period ? "bold" : "normal",
						}}
					>
						{period}
					</button>
				))}
			</div>
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 24,
					justifyContent: "center",
				}}
			>
				{periodsRow2.map((period) => (
					<button
						key={period}
						onClick={() => handlePeriodClick(period)}
						style={{
							padding: "8px 16px",
							background: selectedPeriod === period ? "#e0e0e0" : "#fff",
							border: "1px solid #ccc",
							borderRadius: 4,
							fontWeight: selectedPeriod === period ? "bold" : "normal",
						}}
					>
						{period}
					</button>
				))}
			</div>
			<div
				style={{
					display: "flex",
					gap: 8,
					background: "#fafafa",
					padding: 32,
					borderRadius: 24,
					justifyContent: "center",
					flexWrap: "nowrap",
					overflowX: "auto",
					minHeight: 520,
				}}
			>
				{ranking.map((machine, idx) => {
					// Lógica de cor baseada no percentual
					let bgColor = "#eee" // cinza para 0%
					let textColor = "#a00"
					if (machine.percent >= 80) {
						bgColor = "#43a047" // verde
						textColor = "#fff"
					} else if (machine.percent >= 70) {
						bgColor = "#fbc02d" // amarelo
						textColor = "#fff"
					} else if (machine.percent > 0) {
						bgColor = "#e53935" // vermelho
						textColor = "#fff"
					}
					if (machine.percent === 0) {
						textColor = "#a00"
					}
					return (
						<div
							key={machine.id}
							style={{ textAlign: "center", width: 120, minHeight: 480 }}
						>
							<div
								style={{ color: "#1a237e", fontWeight: "bold", fontSize: 22 }}
							>
								{idx + 1}°
							</div>
							<div
								style={{
									background: bgColor,
									color: textColor,
									fontWeight: "bold",
									fontSize: 32,
									borderRadius: 8,
									margin: "10px 0",
									padding: "96px 0",
								}}
							>
								{machine.percent % 1 === 0
									? machine.percent
									: machine.percent > 0
										? machine.percent.toFixed(2)
										: "0"}
								%
							</div>
							<div
								style={{ color: "#1a237e", fontWeight: "bold", fontSize: 18 }}
							>
								{machine.id}
							</div>
							<div style={{ color: "#1a237e", fontSize: 16 }}>
								{machine.label}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
