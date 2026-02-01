import { cn } from "@renderer/lib/utils"
import { useAuth, UserPermissions } from "@renderer/contexts/AuthContext"
import {
	Book,
	Box,
	Layers,
	LayoutDashboard,
	Package,
	Palette,
	Zap,
	Menu,
	X,
	Settings,
	LogOut,
	ShieldCheck,
} from "lucide-react"
import { NavLink } from "react-router-dom"

type PermissionKey = keyof UserPermissions

interface MenuItem {
	path: string
	label: string
	icon: typeof LayoutDashboard
	permission?: PermissionKey
}

const menuItems: MenuItem[] = [
	{ path: "/", label: "Dashboard", icon: LayoutDashboard, permission: "canViewDashboard" },
	{ path: "/modelos", label: "Modelos", icon: Box, permission: "canViewModelos" },
	{ path: "/cores", label: "Cores", icon: Palette, permission: "canViewCores" },
	{ path: "/materiais", label: "Materiais", icon: Layers, permission: "canViewMateriais" },
	{ path: "/componentes", label: "Componentes", icon: Package, permission: "canViewComponentes" },
	{ path: "/encaixe", label: "Encaixe", icon: Zap, permission: "canViewEncaixe" },
	{ path: "/manual", label: "Manual", icon: Book, permission: "canViewManual" },
	{ path: "/economia", label: "Economia Dashboard", icon: LayoutDashboard, permission: "canViewEconomia" },
	{ path: "/setup", label: "Configurações", icon: Settings, permission: "canAccessSetup" },
	{ path: "/license-info", label: "Licença", icon: ShieldCheck, permission: "canAccessSetup" },
]

export function Sidebar({
	collapsed,
	setCollapsed,
}: {
	collapsed: boolean
	setCollapsed: (v: boolean) => void
}) {
	const { hasPermission, user, logout } = useAuth()

	// Filtrar itens de menu baseado nas permissões do usuário
	const visibleMenuItems = menuItems.filter((item) => {
		// Se não tem permissão definida, mostrar sempre
		if (!item.permission) return true
		// Verificar se o usuário tem a permissão necessária
		return hasPermission(item.permission)
	})

	return (
		<aside
			className={cn(
				"fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out overflow-hidden",
				collapsed ? "w-24" : "w-64",
			)}
		>
			<div className="flex h-full flex-col">
				{/* Logo + Toggle */}
				<div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
						<Box className="h-5 w-5 text-sidebar-primary-foreground" />
					</div>

					{!collapsed && (
						<span className="text-lg font-semibold text-sidebar-foreground">
							ModelManager
						</span>
					)}

					<div className="ml-auto pr-3 relative">
						<button
							aria-label={collapsed ? "Abrir sidebar" : "Fechar sidebar"}
							onClick={() => setCollapsed(!collapsed)}
							className="relative z-20 inline-flex items-center justify-center rounded p-2.5 text-sidebar-foreground/90 hover:bg-sidebar-accent bg-sidebar transition-colors duration-200"
						>
							{collapsed ? (
								<Menu className="h-6 w-6" />
							) : (
								<X className="h-6 w-6" />
							)}
						</button>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1 p-2">
					{visibleMenuItems.map((item) => (
						<NavLink
							key={item.path}
							to={item.path}
							title={item.label}
							className={({ isActive }) =>
								cn(
									"flex items-center gap-3 rounded-lg py-3 text-sm font-medium transition-all duration-200",
									collapsed ? "justify-center px-0" : "justify-start px-4",
									isActive
										? "bg-sidebar-accent text-sidebar-primary"
										: "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
								)
							}
						>
							<item.icon className="h-5 w-5" />
							<span className={cn(collapsed ? "hidden" : "block")}>
								{item.label}
							</span>
						</NavLink>
					))}
				</nav>

				{/* User Info + Footer */}
				<div className="border-t border-sidebar-border p-4">
					{user && !collapsed && (
						<div className="mb-2 px-2 flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-sidebar-foreground truncate">
									{user.username}
								</p>
								<p className="text-xs text-sidebar-foreground/50 capitalize">
									{user.role === "admin" && "Administrador"}
									{user.role === "editor" && "Editor"}
									{user.role === "viewer" && "Visualizador"}
								</p>
							</div>
							<button
								onClick={logout}
								className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
								title="Sair"
							>
								<LogOut className="h-4 w-4" />
							</button>
						</div>
					)}
					<p
						className={cn(
							"text-xs text-sidebar-foreground/50 text-center",
							collapsed ? "hidden" : "block",
						)}
					>
						cutting room v1.0
					</p>
				</div>
			</div>
		</aside>
	)
}
