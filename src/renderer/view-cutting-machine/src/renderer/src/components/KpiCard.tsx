import React from "react"
import { Card, CardContent } from "./ui/card"

// ...existing code...

interface KpiCardProps {
	title: string
	value: string
	subtitle: string
	icon: React.ElementType
	iconBg: string
	iconColor: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
	title,
	value,
	subtitle,
	icon: IconComponent,
	iconBg,
	iconColor,
}) => {
	return (
		<Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
			<CardContent className="p-4">
				<div className="flex items-center space-x-3">
					{/* Modern Icon on the left */}
					<div
						className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shadow-lg`}
					>
						<IconComponent className={`w-6 h-6 ${iconColor}`} />
					</div>

					{/* Content */}
					<div className="flex-1">
						<p className="text-gray-600 text-xs font-medium mb-1">{title}</p>
						<p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
						<p className="text-gray-500 text-xs">{subtitle}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
