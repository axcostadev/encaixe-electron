import { cn } from "@renderer/lib/utils"
import { Book, Box, Layers, LayoutDashboard, Package, Palette, Zap } from "lucide-react"
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

export function Sidebar() {
	return (
		<aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
			<div className="flex h-full flex-col">
				{/* Logo */}
				<div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
						<Box className="h-5 w-5 text-sidebar-primary-foreground" />
					</div>
					<span className="text-lg font-semibold text-sidebar-foreground">
						ModelManager
					</span>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1 p-4">
					{menuItems.map((item) => (
						<NavLink
							key={item.path}
							to={item.path}
							className={({ isActive }) =>
								cn(
									"flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
									isActive
										? "bg-sidebar-accent text-sidebar-primary"
										: "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
								)
							}
						>
							<item.icon className="h-5 w-5" />
							{item.label}
						</NavLink>
					))}
				</nav>

				{/* Footer */}
				<div className="border-t border-sidebar-border p-4">
					<p className="text-xs text-sidebar-foreground/50 text-center">
						Sistema de Gestão v1.0
					</p>
				</div>
			</div>
		</aside>
	)
}
