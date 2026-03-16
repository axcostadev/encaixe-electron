import React, { Suspense } from "react"
import { MainLayout } from "@renderer/components/layout/MainLayout"
import { Toaster as Sonner } from "@renderer/components/ui/sonner"
import { Toaster } from "@renderer/components/ui/toaster"
import { TooltipProvider } from "@renderer/components/ui/tooltip"
import { AppProvider } from "@renderer/contexts/AppContext"
import { AuthProvider, useAuth } from "@renderer/contexts/AuthContext"
import type { User } from "@renderer/contexts/AuthContext"
import { LicenseProvider, useLicense } from "@renderer/contexts/LicenseContext"
import { SetoresProvider } from "@renderer/contexts/SetoresContext"
import { ComponentesPage } from "@renderer/pages/ComponentesPage"
import { CoresPage } from "@renderer/pages/CoresPage"
import { Dashboard } from "@renderer/pages/Dashboard"
import { MateriaisPage } from "@renderer/pages/MateriaisPage"
import { ModelosPage } from "@renderer/pages/ModelosPage"
import EncaixePage from "@renderer/pages/EncaixePage"
import ManualPage from "@renderer/pages/ManualPage"
import EconomiaPage from "@renderer/pages/EconomiaPage/EconomiaPage"
import SetupPage from "@renderer/pages/SetupPage"
import NotFound from "@renderer/pages/NotFound"
import LicenseStatusPage from "@renderer/pages/LicenseStatusPage"
import LicensePage from "@renderer/pages/LicensePage"

// Lazy-load páginas pesadas para não bloquear o carregamento inicial
const ViewCuttingMachinePage = React.lazy(() => import("@renderer/pages/ViewCuttingMachine"))
const MachineWorkStatePage = React.lazy(() => import("@renderer/pages/MachineWorkState"))
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
	HashRouter,
	Route,
	Routes,
	Navigate,
	useNavigate,
} from "react-router-dom"
import { Login } from "./pages/Login"

const queryClient = new QueryClient()

class AppErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean; errorMessage: string }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props)
		this.state = { hasError: false, errorMessage: "" }
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, errorMessage: error?.message || "Erro desconhecido" }
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error("Erro de render no App:", error, info)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-background p-6">
					<div className="max-w-xl w-full rounded-lg border bg-card p-6 shadow">
						<h1 className="text-lg font-semibold text-red-600 mb-2">Falha ao renderizar a aplicação</h1>
						<p className="text-sm text-muted-foreground mb-4">
							Tente recarregar a aplicação. Se persistir, abra o DevTools para ver o erro detalhado.
						</p>
						<pre className="text-xs bg-muted p-3 rounded overflow-auto">
							{this.state.errorMessage}
						</pre>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}

function AuthenticatedApp() {
	const { user, login } = useAuth()
	const { isValid, loading: licenseLoading } = useLicense()
	const navigate = useNavigate()

	const handleLogin = (u: User) => {
		login(u)
		navigate("/", { replace: true })
	}

	if (licenseLoading) {
		return (
			<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
				Validando licença...
			</div>
		)
	}

	if (user && !isValid) {
		return (
			<Routes>
				<Route path="/license" element={<LicensePage />} />
				<Route path="*" element={<Navigate to="/license" replace />} />
			</Routes>
		)
	}

	return user ? (
		<MainLayout>
			<Routes>
				<Route path="/" element={<Dashboard />} />
					<Route path="/economia" element={<EconomiaPage />} />
					<Route path="/encaixe" element={<EncaixePage />} />
					<Route path="/view-cutting-machine" element={<Suspense fallback={<div className="p-8 text-muted-foreground">Carregando View Cutting Machine...</div>}><ViewCuttingMachinePage /></Suspense>} />
					<Route path="/machine-work-state/*" element={<Suspense fallback={<div className="p-8 text-muted-foreground">Carregando Machine Work State...</div>}><MachineWorkStatePage /></Suspense>} />
					<Route path="/modelos" element={<ModelosPage />} />
				<Route path="/cores" element={<CoresPage />} />
				<Route path="/materiais" element={<MateriaisPage />} />
				<Route path="/componentes" element={<ComponentesPage />} />
				<Route path="/manual" element={<ManualPage />} />
				<Route path="/setup" element={<SetupPage />} />
				<Route path="/license-info" element={<LicenseStatusPage />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</MainLayout>
	) : (
		<Routes>
			<Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
			<Route path="*" element={<Navigate to="/login" replace />} />
		</Routes>
	)
}

function App() {
	return (
		<>
			<AppErrorBoundary>
				<QueryClientProvider client={queryClient}>
					<LicenseProvider>
						<AuthProvider>
							<AppProvider>
								<SetoresProvider>
									<TooltipProvider>
										<Toaster />
										<Sonner />
										<HashRouter>
											<AuthenticatedApp />
										</HashRouter>
									</TooltipProvider>
								</SetoresProvider>
							</AppProvider>
						</AuthProvider>
					</LicenseProvider>
				</QueryClientProvider>
			</AppErrorBoundary>
		</>
	)
}

export default App
