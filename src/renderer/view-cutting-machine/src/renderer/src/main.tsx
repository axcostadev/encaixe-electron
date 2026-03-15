import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Desktop } from "./screens/Desktop"
import { ipcHelper } from "./lib/ipcHelper"

// Expor diagnóstico globalmente para debug
;(window as any).ipcDiagnose = () => ipcHelper.diagnose()

console.log('[Main] Iniciando aplicação...')
console.log('[Main] window.electron disponível?', typeof window.electron)
ipcHelper.diagnose()

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<Desktop />
	</StrictMode>,
)
