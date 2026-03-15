import { X } from "lucide-react"
import React from "react"

interface AboutDialogProps {
	isOpen: boolean
	onClose: () => void
}

export const AboutDialog: React.FC<AboutDialogProps> = ({
	isOpen,
	onClose,
}) => {
	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-lg font-semibold text-gray-900">
						Sobre o Aplicativo
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					<div className="mb-6">
						<h3 className="text-2xl font-bold text-gray-900 mb-2">
							Aincrad App
						</h3>
						<p className="text-gray-600 mb-4">
							Sistema de Monitoramento de Máquinas de Corte
						</p>
						<p className="text-sm text-gray-500 mb-6">Versão 1.0.55</p>
					</div>

					{/* Authors */}
					<div className="mb-6">
						<h4 className="font-semibold text-gray-900 mb-3">
							Desenvolvedores
						</h4>
						<div className="space-y-2">
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-blue-600 rounded-full"></div>
								<span className="text-gray-700">AlysonDEV</span>
								<span className="text-gray-500 text-sm">
									&lt;alysonronnan@gmail.com&gt;
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-blue-600 rounded-full"></div>
								<span className="text-gray-700">axcostadev</span>
								<span className="text-gray-500 text-sm">
									&lt;alexemidio2@outlook.com&gt;
								</span>
							</div>
						</div>
					</div>

					{/* Copyright */}
					<div className="text-center text-sm text-gray-500 mb-4">
						<p>Copyright © 2025 AlysonDEV & axcostadev</p>
						<p className="mt-1">Todos os direitos reservados</p>
					</div>

					{/* Website */}
					<div className="text-center">
						<a
							href="https://aincrad.dev"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:text-blue-800 text-sm underline"
						>
							aincrad.dev
						</a>
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-3 bg-gray-50 rounded-b-lg">
					<button
						onClick={onClose}
						className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
					>
						Fechar
					</button>
				</div>
			</div>
		</div>
	)
}
