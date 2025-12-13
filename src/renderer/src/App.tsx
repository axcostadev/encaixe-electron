import { MainLayout } from "@renderer/components/layout/MainLayout"
import { Toaster as Sonner } from "@renderer/components/ui/sonner"
import { Toaster } from "@renderer/components/ui/toaster"
import { TooltipProvider } from "@renderer/components/ui/tooltip"
import { AppProvider } from "@renderer/contexts/AppContext"
import { AuthProvider, useAuth } from "@renderer/contexts/AuthContext"
import { SetoresProvider } from "@renderer/contexts/SetoresContext"
import { ComponentesPage } from "@renderer/pages/ComponentesPage"
import { CoresPage } from "@renderer/pages/CoresPage"
import { Dashboard } from "@renderer/pages/Dashboard"
import { MateriaisPage } from "@renderer/pages/MateriaisPage"
import { ModelosPage } from "@renderer/pages/ModelosPage"
import EncaixePage from "@renderer/pages/EncaixePage"
import ManualPage from "@renderer/pages/ManualPage"
import NotFound from "@renderer/pages/NotFound"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import { Login } from "./pages/Login"

const queryClient = new QueryClient()

function AuthenticatedApp() {
	const { user, login } = useAuth()

	return user ? (
		<MainLayout>
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/encaixe" element={<EncaixePage />} />
				<Route path="/modelos" element={<ModelosPage />} />
				<Route path="/cores" element={<CoresPage />} />
				<Route path="/materiais" element={<MateriaisPage />} />
				<Route path="/componentes" element={<ComponentesPage />} />
				<Route path="/manual" element={<ManualPage />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</MainLayout>
	) : (
		<Routes>
			<Route path="/login" element={<Login onLoginSuccess={login} />} />
			<Route path="*" element={<Navigate to="/login" replace />} />
		</Routes>
	)
}

function App() {
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<AppProvider>
						<SetoresProvider>
							<TooltipProvider>
								<Toaster />
								<Sonner />
								<BrowserRouter>
									<AuthenticatedApp />
								</BrowserRouter>
							</TooltipProvider>
						</SetoresProvider>
					</AppProvider>
				</AuthProvider>
			</QueryClientProvider>
		</>
	)
}

export default App
