import { CheckCircle, AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

type NetworkStatus = {
	networkAvailable: boolean
	networkFileExists: boolean
	localFileExists: boolean
	networkPath: string
	localPath: string
	totalGroups: number
	totalMachines: number
	groupStats: Record<string, {
		name: string
		machineCount: number
		baseDir: string
	}>
}

type SettingsStatusProps = {
	className?: string
}

export default function SettingsStatus({ className = "" }: SettingsStatusProps) {
	const [status, setStatus] = useState<NetworkStatus | null>(null)
	const [loading, setLoading] = useState(false)
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

	const loadStatus = useCallback(async () => {
		setLoading(true)
		try {
			console.log("[SettingsStatus] Carregando status das configurações...")
			
			// Verifica se o IPC está disponível
			if (!window.electron || !window.electron.ipcRenderer) {
				console.error("[SettingsStatus] IPC Renderer não está disponível")
				return
			}

			const response = await window.electron.ipcRenderer.invoke("get-settings-status")
			
			if (response && response.success) {
				setStatus(response.data)
				setLastUpdate(new Date())
				console.log("[SettingsStatus] Status carregado:", response.data)
			} else {
				console.error("[SettingsStatus] Erro ao carregar status:", response?.error)
			}
		} catch (error) {
			console.error("[SettingsStatus] Erro:", error)
		} finally {
			setLoading(false)
		}
	}, [])

	const reloadSettings = useCallback(async () => {
		setLoading(true)
		try {
			console.log("[SettingsStatus] Recarregando configurações...")
			
			if (!window.electron || !window.electron.ipcRenderer) {
				console.error("[SettingsStatus] IPC Renderer não está disponível")
				return
			}

			const response = await window.electron.ipcRenderer.invoke("reload-settings")
			
			if (response && response.success) {
				console.log("[SettingsStatus] Configurações recarregadas com sucesso")
				// Recarrega o status após reload
				await loadStatus()
			} else {
				console.error("[SettingsStatus] Erro ao recarregar:", response?.error)
			}
		} catch (error) {
			console.error("[SettingsStatus] Erro:", error)
		} finally {
			setLoading(false)
		}
	}, [loadStatus])

	// Carrega status na inicialização
	useEffect(() => {
		loadStatus()
	}, [loadStatus])

	// Auto-refresh a cada 30 segundos
	useEffect(() => {
		const interval = setInterval(loadStatus, 30000)
		return () => clearInterval(interval)
	}, [loadStatus])

	if (!status) {
		return (
			<div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
				<div className="flex items-center space-x-2">
					<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''} text-gray-400`} />
					<span className="text-sm text-gray-600">Carregando status...</span>
				</div>
			</div>
		)
	}

	const getStatusIcon = () => {
		if (status.networkAvailable && status.networkFileExists) {
			return <CheckCircle className="h-5 w-5 text-green-500" />
		} else if (status.localFileExists) {
			return <AlertCircle className="h-5 w-5 text-yellow-500" />
		} else {
			return <AlertCircle className="h-5 w-5 text-red-500" />
		}
	}

	const getStatusText = () => {
		if (status.networkAvailable && status.networkFileExists) {
			return "Conectado à rede"
		} else if (status.localFileExists) {
			return "Usando backup local"
		} else {
			return "Configurações padrão"
		}
	}

	const getStatusColor = () => {
		if (status.networkAvailable && status.networkFileExists) {
			return "text-green-700 bg-green-50 border-green-200"
		} else if (status.localFileExists) {
			return "text-yellow-700 bg-yellow-50 border-yellow-200"
		} else {
			return "text-red-700 bg-red-50 border-red-200"
		}
	}

	return (
		<div className={`bg-white rounded-lg border p-4 ${className}`}>
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center space-x-2">
					<h3 className="text-lg font-semibold text-gray-900">Status das Configurações</h3>
					{status.networkAvailable ? (
						<Wifi className="h-4 w-4 text-green-500" />
					) : (
						<WifiOff className="h-4 w-4 text-red-500" />
					)}
				</div>
				<button
					onClick={reloadSettings}
					disabled={loading}
					className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
				>
					<RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
					<span>Recarregar</span>
				</button>
			</div>

			{/* Status Principal */}
			<div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
				<div className="flex items-center space-x-2">
					{getStatusIcon()}
					<span className="font-medium">{getStatusText()}</span>
				</div>
				{lastUpdate && (
					<span className="text-xs opacity-75">
						{lastUpdate.toLocaleTimeString()}
					</span>
				)}
			</div>

			{/* Detalhes */}
			<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Arquivos */}
				<div className="space-y-2">
					<h4 className="text-sm font-semibold text-gray-700">Arquivos</h4>
					<div className="space-y-1 text-xs">
						<div className="flex items-center space-x-2">
							{status.networkFileExists ? (
								<CheckCircle className="h-3 w-3 text-green-500" />
							) : (
								<AlertCircle className="h-3 w-3 text-red-500" />
							)}
							<span className={status.networkFileExists ? "text-green-700" : "text-red-700"}>
								Arquivo na rede
							</span>
						</div>
						<div className="flex items-center space-x-2">
							{status.localFileExists ? (
								<CheckCircle className="h-3 w-3 text-green-500" />
							) : (
								<AlertCircle className="h-3 w-3 text-gray-400" />
							)}
							<span className={status.localFileExists ? "text-green-700" : "text-gray-500"}>
								Backup local
							</span>
						</div>
					</div>
				</div>

				{/* Estatísticas */}
				<div className="space-y-2">
					<h4 className="text-sm font-semibold text-gray-700">Configurações</h4>
					<div className="space-y-1 text-xs text-gray-600">
						<div>{status.totalGroups} grupos configurados</div>
						<div>{status.totalMachines} máquinas total</div>
					</div>
				</div>
			</div>

			{/* Grupos */}
			{status.groupStats && Object.keys(status.groupStats).length > 0 && (
				<div className="mt-4">
					<h4 className="text-sm font-semibold text-gray-700 mb-2">Grupos de Máquinas</h4>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{Object.entries(status.groupStats).map(([groupName, stats]) => (
							<div key={groupName} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
								<span className="font-medium">{stats.name}</span>
								<span className="text-gray-500">{stats.machineCount} máquinas</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Caminhos (modo debug) */}
			{process.env.NODE_ENV === 'development' && (
				<details className="mt-4">
					<summary className="text-xs text-gray-500 cursor-pointer">Informações de Debug</summary>
					<div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono space-y-1">
						<div><strong>Rede:</strong> {status.networkPath}</div>
						<div><strong>Local:</strong> {status.localPath}</div>
						<div><strong>Rede Disponível:</strong> {status.networkAvailable ? '✅' : '❌'}</div>
					</div>
				</details>
			)}
		</div>
	)
}