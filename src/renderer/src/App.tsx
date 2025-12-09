import { MainLayout } from "@renderer/components/layout/MainLayout"
import { Toaster as Sonner } from "@renderer/components/ui/sonner"
import { Toaster } from "@renderer/components/ui/toaster"
import { TooltipProvider } from "@renderer/components/ui/tooltip"
import { AppProvider } from "@renderer/contexts/AppContext"
import { ComponentesPage } from "@renderer/pages/ComponentesPage"
import { CoresPage } from "@renderer/pages/CoresPage"
import { Dashboard } from "@renderer/pages/Dashboard"
import { MateriaisPage } from "@renderer/pages/MateriaisPage"
import { ModelosPage } from "@renderer/pages/ModelosPage"
import NotFound from "@renderer/pages/NotFound"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import { Home } from "./components/Home"
import { Login } from "./pages/Login"

const queryClient = new QueryClient()

interface User {
	id: number
	username: string
	email: string
}

function App() {
	const [user, setUser] = useState<User | null>(null)

	const handleLoginSuccess = (loggedInUser: User) => {
		setUser(loggedInUser)
	}

	const handleLogout = () => {
		setUser(null)
	}

	return (
		<>
			<QueryClientProvider client={queryClient}>
				<AppProvider>
					<TooltipProvider>
						<Toaster />
						<Sonner />
												<BrowserRouter>
													{user ? (
														<MainLayout>
															<Routes>
																<Route path="/" element={<Dashboard />} />
																<Route path="/modelos" element={<ModelosPage />} />
																<Route path="/cores" element={<CoresPage />} />
																<Route path="/materiais" element={<MateriaisPage />} />
																<Route path="/componentes" element={<ComponentesPage />} />
																<Route path="*" element={<NotFound />} />
															</Routes>
														</MainLayout>
													) : (
														<Routes>
															<Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
															<Route path="*" element={<Navigate to="/login" replace />} />
														</Routes>
													)}
												</BrowserRouter>
					</TooltipProvider>
				</AppProvider>
			</QueryClientProvider>
		</>
	)
}

export default App
