// import React from "react"; // Removido, não utilizado
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

// Exemplo de mapeamento de cor (pode importar do seu arquivo principal)
const motivoCorMap: Record<string, string> = {
	"Sem motivo": "#888888",
	"Criando imagem": "#2196f3",
	"Aguardando técnico": "#e6c200",
	"Falta de operador": "#e60000",
	"Falta de abastecimento": "#ff9800",
	Informática: "#9c27b0",
	"Almoço/Janta": "#0d47a1",
	Fadiga: "#795548",
	"Parada por motivo mecânico": "#d32f2f",
	"Parada por motivo elétrico": "#fbc02d",
	Manutenção: "#e60000",
	Outros: "#e6c200",
	Ocupação: "#009e3c",
	"Baixa Eficiência": "#888888",
}

export interface CategoriaPieChartProps {
	data: Array<{ categoria: string; percent: number }>
}

export default function CategoriaPieChart({ data }: CategoriaPieChartProps) {
	// Recharts espera value, não percent
	const chartData = data.map((item) => ({
		name: item.categoria,
		value: item.percent,
		color: motivoCorMap[item.categoria] || "#888",
	}))

	return (
		<ResponsiveContainer width={400} height={400}>
			<PieChart>
				<Pie
					data={chartData}
					cx="50%"
					cy="50%"
					labelLine={true}
					label={({ name, value, x, y, fill }) => {
						const numeric = typeof value === 'number' ? value : Number(value);
						return (
							<text
								x={x}
								y={y}
								fill={fill}
								fontSize={16}
								fontWeight="bold"
								textAnchor="middle"
								dominantBaseline="central"
							>
								{name}: {Number.isFinite(numeric) ? numeric.toFixed(2) : String(value)}%
							</text>
						)
					}}
					outerRadius={120}
					dataKey="value"
				>
					{chartData.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={entry.color} />
					))}
				</Pie>
			</PieChart>
		</ResponsiveContainer>
	)
}
