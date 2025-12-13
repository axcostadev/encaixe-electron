import { cn } from "@renderer/lib/utils"
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
} from "lucide-react"
import { NavLink } from "react-router-dom"

const menuItems = [
	{ path: "/", label: "Dashboard", icon: LayoutDashboard },
	{ path: "/modelos", label: "Modelos", icon: Box },
	{ path: "/cores", label: "Cores", icon: Palette },
	{ path: "/materiais", label: "Materiais", icon: Layers },
	{ path: "/componentes", label: "Componentes", icon: Package },
	{ path: "/encaixe", label: "Encaixe", icon: Zap },
	{ path: "/manual", label: "Manual", icon: Book },
]

export function Sidebar({
	collapsed,
	setCollapsed,
}: {
	collapsed: boolean
	setCollapsed: (v: boolean) => void
}) {
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
					{menuItems.map((item) => (
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

				{/* Footer */}
				<div className="border-t border-sidebar-border p-4">
					<p
						className={cn(
							"text-xs text-sidebar-foreground/50 text-center",
							collapsed ? "hidden" : "block",
						)}
					>
						Sistema de Gestão v1.0
					</p>
				</div>
			</div>
		</aside>
	)
}
