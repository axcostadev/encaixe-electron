import { ReactNode, useState } from "react"
import { cn } from "@renderer/lib/utils"
import { Sidebar } from "./Sidebar"

interface MainLayoutProps {
	children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
	const [collapsed, setCollapsed] = useState(false)

	return (
		<div className="min-h-screen bg-background">
			<Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
			<main
				className={cn(
					"min-h-screen transition-all duration-300 ease-in-out",
					collapsed ? "ml-24" : "ml-64",
				)}
			>
				<div className="p-8">{children}</div>
			</main>
		</div>
	)
}
