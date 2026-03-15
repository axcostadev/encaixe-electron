import velocimentro from "../assets/velocimentro.svg"
import { Card, CardContent } from "./ui/card"

// import { abort } from "process"

interface OccupationCardProps {
	id: number
	speed: number
	status: "working" | "stopped" | "offline"
	hideValues?: boolean
}

export const OccupationCard: React.FC<OccupationCardProps> = ({
	id,
	speed,
	status,
	hideValues = false,
}) => {
	// Get card color based on machine status
	const getCardColor = (status: string) => {
		switch (status) {
			case "working":
				return "bg-gradient-to-br from-green-400 to-green-600"
			case "stopped":
				return "bg-gradient-to-br from-red-400 to-red-600"
			case "offline":
				return "bg-gradient-to-br from-yellow-400 to-yellow-600"
			default:
				return "bg-gradient-to-br from-gray-400 to-gray-600"
		}
	}

	return (
		<Card
			className={`${getCardColor(status)} text-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1`}
		>
			<CardContent className="p-4 relative h-24">
				<>
					<div
						className={
							!hideValues
								? `absolute top-3 left-3`
								: `flex justify-center items-center`
						}
					>
						{!hideValues ? (
							<div className="bg-white/10 backdrop-blur-sm text-white rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm">
								{id}
							</div>
						) : (
							<div className="bg-white/10 backdrop-blur-sm text-white rounded-lg w-16 h-16 flex items-center justify-center font-bold text-4xl">
								{id}
							</div>
						)}
					</div>
					<div className="flex items-center justify-center h-full">
						{!hideValues && (
							<div className="flex items-center space-x-2">
								<span className="text-4xl font-bold">{speed}</span>
								<img
									src={velocimentro}
									alt="Velocímetro"
									className="w-6 h-6 filter brightness-0 invert"
								/>
							</div>
						)}
					</div>
				</>
			</CardContent>
		</Card>
	)
}
