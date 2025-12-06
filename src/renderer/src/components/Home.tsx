import { useState } from "react"
import { Modelo } from "./Modelo"
import { Componentes } from "./Componentes"
import { Tamanho } from "./Tamanho"
import { Material } from "./Material"
import { Setor } from "./Setor"

interface User {
	id: number
	username: string
	email: string
}

interface HomeProps {
	user: User
	onLogout: () => void
}

type View = "home" | "modelo" | "componentes" | "tamanho" | "material" | "setor"

export function Home({ user, onLogout }: HomeProps): React.JSX.Element {
	const [currentView, setCurrentView] = useState<View>("home")

	const renderView = () => {
		switch (currentView) {
			case "modelo":
				return <Modelo onBack={() => setCurrentView("home")} />
			case "componentes":
				return <Componentes onBack={() => setCurrentView("home")} />
			case "tamanho":
				return <Tamanho onBack={() => setCurrentView("home")} />
			case "material":
				return <Material onBack={() => setCurrentView("home")} />
			case "setor":
				return <Setor onBack={() => setCurrentView("home")} />
			default:
				return (
					<div className="min-h-screen bg-gray-100">
						<div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 shadow-lg">
							<div className="max-w-6xl mx-auto flex items-center justify-between">
								<div>
									<h1 className="text-4xl font-bold">Bem-vindo, {user.username}!</h1>
									<p className="text-blue-100 mt-2">{user.email}</p>
								</div>
								<button
									onClick={onLogout}
									className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
								>
									Sair
								</button>
							</div>
						</div>

						<div className="max-w-6xl mx-auto p-8">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								<div
									onClick={() => setCurrentView("modelo")}
									className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer hover:bg-blue-50"
								>
									<div className="text-4xl mb-4">📋</div>
									<h3 className="text-xl font-bold text-gray-800 mb-2">Modelos</h3>
									<p className="text-gray-600">
										Cadastre e gerencie os modelos de produtos com suas cores
									</p>
								</div>

								<div
									onClick={() => setCurrentView("componentes")}
									className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer hover:bg-blue-50"
								>
									<div className="text-4xl mb-4">🔧</div>
									<h3 className="text-xl font-bold text-gray-800 mb-2">Componentes</h3>
									<p className="text-gray-600">
										Defina os componentes dos modelos e seus materiais
									</p>
								</div>

								<div
									onClick={() => setCurrentView("tamanho")}
									className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer hover:bg-blue-50"
								>
									<div className="text-4xl mb-4">📏</div>
									<h3 className="text-xl font-bold text-gray-800 mb-2">Tamanhos</h3>
									<p className="text-gray-600">
										Configure os tamanhos disponíveis para cada componente
									</p>
								</div>

								<div
									onClick={() => setCurrentView("material")}
									className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer hover:bg-blue-50"
								>
									<div className="text-4xl mb-4">🎨</div>
									<h3 className="text-xl font-bold text-gray-800 mb-2">Materiais</h3>
									<p className="text-gray-600">
										Cadastre e gerencie os materiais com todas as especificações
									</p>
								</div>

								<div
									onClick={() => setCurrentView("setor")}
									className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer hover:bg-blue-50"
								>
									<div className="text-4xl mb-4">🏭</div>
									<h3 className="text-xl font-bold text-gray-800 mb-2">Setores</h3>
									<p className="text-gray-600">
										Gerencie os setores de produção do seu negócio
									</p>
								</div>
							</div>

							<div className="mt-12 bg-white rounded-lg shadow-lg p-6">
								<h2 className="text-2xl font-bold text-gray-800 mb-4">Informações do Usuário</h2>
								<div className="grid grid-cols-3 gap-6">
									<div className="bg-gray-50 p-4 rounded-lg">
										<p className="text-gray-600 text-sm font-medium">ID</p>
										<p className="text-gray-900 text-lg font-bold">{user.id}</p>
									</div>
									<div className="bg-gray-50 p-4 rounded-lg">
										<p className="text-gray-600 text-sm font-medium">Usuário</p>
										<p className="text-gray-900 text-lg font-bold">{user.username}</p>
									</div>
									<div className="bg-gray-50 p-4 rounded-lg">
										<p className="text-gray-600 text-sm font-medium">Email</p>
										<p className="text-gray-900 text-lg font-bold">{user.email}</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				)
		}
	}

	return <>{renderView()}</>
}
