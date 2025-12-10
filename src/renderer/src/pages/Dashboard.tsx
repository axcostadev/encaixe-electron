import { Button } from "@renderer/components/ui/button"
import { useApp } from "@renderer/contexts/AppContext"
import { useAuth } from "@renderer/contexts/AuthContext"
import { ArrowRight, Box, Layers, LogOut, Package, Palette } from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export function Dashboard() {
	const { logout } = useAuth()
	const { modelos, materiais, loadModelos } = useApp()
	const navigate = useNavigate()

	useEffect(() => {
		async function load() {
			try {
				await loadModelos()
			} catch {
				// Ignore errors for now
			}
		}
		load()
	}, [loadModelos])

	const totalCores = modelos.reduce((acc, m) => acc + m.cores.length, 0)
	const totalComponentes = modelos.reduce(
		(acc, m) => acc + m.componentes.length,
		0,
	)

	const stats = [
		{
			title: "Modelos",
			value: modelos.length,
			icon: Box,
			color: "text-primary",
			bgColor: "bg-primary/10",
			path: "/modelos",
		},
		{
			title: "Cores",
			value: totalCores,
			icon: Palette,
			color: "text-accent",
			bgColor: "bg-accent/10",
			path: "/cores",
		},
		{
			title: "Materiais",
			value: materiais.length,
			icon: Layers,
			color: "text-warning",
			bgColor: "bg-warning/10",
			path: "/materiais",
		},
		{
			title: "Componentes",
			value: totalComponentes,
			icon: Package,
			color: "text-destructive",
			bgColor: "bg-destructive/10",
			path: "/componentes",
		},
	]

	return (
		<div className="space-y-8">
			<div className="animate-fade-in">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
						<p className="text-muted-foreground mt-1">
							Visão geral do sistema de gestão de modelos
						</p>
					</div>
					<Button variant="outline" onClick={logout}>
						<LogOut className="h-4 w-4 mr-2" />
						Sair
					</Button>
				</div>
			</div>

			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat, index) => (
					<div
						key={stat.title}
						className="card-stats animate-slide-in"
						style={{ animationDelay: `${index * 100}ms` }}
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									{stat.title}
								</p>
								<p className="text-3xl font-bold mt-1">{stat.value}</p>
							</div>
							<div className={`p-3 rounded-xl ${stat.bgColor}`}>
								<stat.icon className={`h-6 w-6 ${stat.color}`} />
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="w-full mt-4 justify-between text-muted-foreground hover:text-foreground"
							onClick={() => navigate(stat.path)}
						>
							Ver todos
							<ArrowRight className="h-4 w-4" />
						</Button>
					</div>
				))}
			</div>

			{modelos.length === 0 && (
				<div className="bg-card rounded-xl border border-border p-8 text-center animate-fade-in">
					<Box className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
					<h2 className="text-xl font-semibold mb-2">
						Comece criando um modelo
					</h2>
					<p className="text-muted-foreground mb-6 max-w-md mx-auto">
						Modelos são a base do sistema. Crie um modelo para depois adicionar
						cores e componentes.
					</p>
					<Button onClick={() => navigate("/modelos")}>
						<Box className="h-4 w-4 mr-2" />
						Criar Modelo
					</Button>
				</div>
			)}

			{modelos.length > 0 && (
				<div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
					<div className="p-6 border-b border-border">
						<h2 className="text-lg font-semibold">Modelos Recentes</h2>
					</div>
					<div className="divide-y divide-border">
						{modelos.slice(0, 5).map((modelo) => (
							<div
								key={modelo.id}
								className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
								onClick={() => navigate(`/modelos`)}
							>
								<div className="flex items-center gap-4">
									<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<Box className="h-5 w-5 text-primary" />
									</div>
									<div>
										<p className="font-medium">{modelo.nome}</p>
										<p className="text-sm text-muted-foreground">
											Artigo: {modelo.artigo}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className="text-right">
										<p className="text-sm font-medium">
											{modelo.cores.length} cores
										</p>
										<p className="text-sm text-muted-foreground">
											{modelo.componentes.length} componentes
										</p>
									</div>
									<ArrowRight className="h-5 w-5 text-muted-foreground" />
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
