import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js"
import { useRef } from "react"
import { Doughnut } from "react-chartjs-2"

ChartJS.register(ArcElement, Tooltip, Legend)

export interface CategoriaDonutChartProps {
	data: number[]
	geral: string
	trabalhando?: number | null
	labels?: string[]
	colors?: string[]
}

const chartLabels = [
	"Manutenção",
	"Criando imagem",
	"Outros",
	"Ocupação",
	"Baixa Eficiência",
]

const chartColors = [
	"#d32f2f", // vermelho
	"#1976d2", // azul
	"#e6c200", // amarelo
	"#198754", // verde
	"#bdbdbd", // cinza
]

const options = {
	plugins: {
		legend: {
			display: false,
		},
		tooltip: {
			enabled: false,
		},
	},
	cutout: "70%",
}

export default function CategoriaDonutChart({
	data,
	geral,
	trabalhando,
	labels,
	colors,
}: CategoriaDonutChartProps) {
	const chartRef = useRef(null)

	// Debug para ver se o valor está chegando
	console.log("[CHART] Valor trabalhando recebido:", trabalhando)

	// Usar labels e cores fornecidas ou usar padrões
	const finalLabels = labels || chartLabels
	const finalColors = colors || chartColors
	// Donut principal (verde)
	const mainDataset = {
		data,
		backgroundColor: finalColors,
		borderWidth: 2,
		cutout: "70%",
		circumference: 360,
		rotation: 0,
	}

	// Donut menor (laranja) para "trabalhando" (só mostra se houver valor)
	let innerDataset: {
		data: number[]
		backgroundColor: string[]
		borderWidth: number
		cutout: string
		circumference: number
		rotation: number
	} | null = null
	// Donut central verde sólido (representando ocupação)
	const centerGreenDataset = {
		data: [100, 0],
		backgroundColor: ["#198754", "#f5f5f5"], // Verde para ocupação
		borderWidth: 0,
		cutout: "95%", // ainda menor
		circumference: 360,
		rotation: 0,
	}
	if (typeof trabalhando === "number" && trabalhando > 0) {
		console.log(
			"[CHART] Criando dataset interno para trabalhando:",
			trabalhando,
		)
		// O donut menor é só um valor (trabalhando) e o resto transparente
		innerDataset = {
			data: [
				Math.max(0, Math.round(trabalhando)),
				100 - Math.max(0, Math.round(trabalhando)),
			],
			backgroundColor: ["#ff9800", "#f5f5f5"],
			borderWidth: 0,
			cutout: "85%",
			circumference: 360,
			rotation: 0,
		}
	}

	// Três datasets sobrepostos: donut principal + donut menor + círculo verde central
	const chartData = {
		labels: finalLabels,
		datasets: innerDataset
			? [mainDataset, innerDataset, centerGreenDataset]
			: [mainDataset, centerGreenDataset],
	}

	// Legenda colorida das categorias
	const legendaLabels = finalLabels.map((label, idx) => (
		<div
			key={label}
			style={{
				display: "grid",
				gridTemplateColumns: "20px 1fr 50px",
				alignItems: "center",
				gap: 6,
				marginBottom: 8,
			}}
		>
			<div
				style={{
					width: 16,
					height: 16,
					background: finalColors[idx],
					borderRadius: 4,
				}}
			/>
			<span
				style={{ fontSize: 15, wordBreak: "keep-all", whiteSpace: "nowrap" }}
			>
				{label}
			</span>
			<span
				style={{
					fontSize: 15,
					fontWeight: "bold",
					color: finalColors[idx],
					textAlign: "right",
				}}
			>
				{/* Se for a legenda de 'Ocupação', usar o valor exato passado em `geral` para garantir correspondência com o centro */}
				{label === "Ocupação"
					? typeof geral === "string"
						? geral
						: `${geral}%`
					: typeof data[idx] === "number"
						? `${data[idx]}%`
						: ""}
			</span>
		</div>
	))

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "flex-start",
				gap: 32,
			}}
		>
			<div style={{ width: 260, position: "relative", height: 260 }}>
				<Doughnut ref={chartRef} data={chartData} options={options} />
				<div
					style={{
						position: "absolute",
						left: "50%",
						top: "50%",
						transform: "translate(-50%, -50%)",
						textAlign: "center",
						fontWeight: "bold",
						fontSize: 22,
						color: "#198754",
						pointerEvents: "none",
						lineHeight: 1.1,
					}}
				>
					{geral}
				</div>
				{typeof trabalhando === "number" && trabalhando > 0 && (
					<div
						style={{
							position: "absolute",
							left: "50%",
							top: "62%",
							transform: "translate(-50%, -50%)",
							textAlign: "center",
							fontWeight: 700,
							fontSize: 16,
							color: "#ff9800",
							pointerEvents: "none",
						}}
					>
						{`${Math.round(trabalhando)}%`}
						<div style={{ fontSize: 12, color: "#ff9800", fontWeight: 400 }}>
							trabalhando
						</div>
					</div>
				)}
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					marginTop: 16,
				}}
			>
				{legendaLabels}
			</div>
		</div>
	)
}
