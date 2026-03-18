import { useState, useEffect, useCallback } from "react"
import { useAuth, UserRole } from "@renderer/contexts/AuthContext"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@renderer/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@renderer/components/ui/select"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog"
import { Badge } from "@renderer/components/ui/badge"
import { Switch } from "@renderer/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import {
	Users,
	UserPlus,
	Pencil,
	Trash2,
	Shield,
	ShieldCheck,
	Eye,
	Settings,
	CheckCircle2,
	XCircle,
	RefreshCw,
	Plus,
	Lock,
	History,
	Database,
	Search,
	Download,
	Filter,
	Scissors,
	Book,
} from "lucide-react"
import { toast } from "sonner"
import { RoleForm, RoleList, Role, UserPermissions } from "@renderer/components/roles"
import { activityLogger, ActivityLog } from "@renderer/services/activityLogger"

// Permissões padrão para fallback
const DEFAULT_PERMISSIONS: UserPermissions = {
	canViewDashboard: false,
	canViewModelos: false,
	canEditModelos: false,
	canDeleteModelos: false,
	canViewCores: false,
	canEditCores: false,
	canDeleteCores: false,
	canViewMateriais: false,
	canEditMateriais: false,
	canDeleteMateriais: false,
	canViewComponentes: false,
	canEditComponentes: false,
	canDeleteComponentes: false,
	canViewSetores: false,
	canEditSetores: false,
	canDeleteSetores: false,
	canViewEncaixe: false,
	canCreateEncaixe: false,
	canViewCuttingMachine: false,
	canViewManual: false,
	canEditManual: false,
	canViewFls: false,
	canViewEconomia: false,
	canRefreshBancoDados: false,
	canClearBancoDados: false,
	canSelectAllBancoDados: false,
	canDeleteBancoDados: false,
	canSaveBancoDados: false,
	canAccessSetup: false,
	canManageUsers: false,
	canManageRoles: false,
}

interface UserData {
	id: number
	username: string
	email: string
	role: UserRole
	active: boolean
	created_at?: string
}

const ROLE_LABELS: Record<UserRole, string> = {
	admin: "Administrador",
	editor: "Editor",
	viewer: "Visualizador",
}

const ROLE_COLORS: Record<UserRole, string> = {
	admin: "bg-red-500/20 text-red-400 border-red-500/30",
	editor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
	viewer: "bg-green-500/20 text-green-400 border-green-500/30",
}

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
	admin: ShieldCheck,
	editor: Shield,
	viewer: Eye,
}

// Função para obter ícone de role dinâmico
const getRoleIcon = (roleName: string) => {
	return ROLE_ICONS[roleName as UserRole] || Shield
}

// Função para obter cor de role dinâmico
const getRoleColor = (roleName: string) => {
	return ROLE_COLORS[roleName as UserRole] || "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
}

// Função para obter label de role dinâmico
const getRoleLabel = (roleName: string, roles: Role[]) => {
	const role = roles.find(r => r.name === roleName)
	if (role) return role.displayName
	return ROLE_LABELS[roleName as UserRole] || roleName
}

export default function SetupPage() {
	const { user, hasPermission } = useAuth()
	const [users, setUsers] = useState<UserData[]>([])
	const [roles, setRoles] = useState<Role[]>([])
	const [loading, setLoading] = useState(true)
	const [loadingRoles, setLoadingRoles] = useState(true)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const [isRoleFormOpen, setIsRoleFormOpen] = useState(false)
	const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
	const [selectedRole, setSelectedRole] = useState<Role | null>(null)
	const [activeTab, setActiveTab] = useState("usuarios")

	// Estados para aba de Auditoria
	const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
	const [logSearch, setLogSearch] = useState("")
	const [logFilter, setLogFilter] = useState<'all' | 'brand' | 'model' | 'component' | 'encaixe' | 'of' | 'apelido'>('all')
	const [logActionFilter, setLogActionFilter] = useState<string>('all')
	const [auditSubTab, setAuditSubTab] = useState<'encaixe' | 'manual'>('encaixe')

	// Entidades usadas para filtro na aba Auditoria
	const encaixeEntityTypes: Array<ActivityLog['entityType']> = ['encaixe', 'of', 'apelido']
	const manualEntityTypes: Array<ActivityLog['entityType']> = ['brand', 'model', 'component']

	// Migration status for redutor_largura
	const [migrationStatus, setMigrationStatus] = useState<'checking' | 'present' | 'missing' | 'error'>('checking')
	const [migrationMessage, setMigrationMessage] = useState('')
	const [runningMigration, setRunningMigration] = useState(false)

// Settings state (Configurações)
const [dbFilePath, setDbFilePath] = useState('')
const [originalDbFile, setOriginalDbFile] = useState('')
const [savingSettings, setSavingSettings] = useState(false)
const [economiaDbPath, setEconomiaDbPath] = useState('')
const [comelzBasePath, setComelzBasePath] = useState('')
const [emmaBasePath, setEmmaBasePath] = useState('')
const [cgcFilePath, setCgcFilePath] = useState('')
const [ofccFilePath, setOfccFilePath] = useState('')
const [ctfImportDir, setCtfImportDir] = useState('')
const [ctcImportDir, setCtcImportDir] = useState('')
const [ctcReportFile, setCtcReportFile] = useState('')
const [ctfReportFile, setCtfReportFile] = useState('')
const [defaultCustomerName, setDefaultCustomerName] = useState('')
const [allowEconomiaDbChange, setAllowEconomiaDbChange] = useState(false)

async function loadStatus() {
	try {
		const res = await (window as any).api.settings.getStatus()
		if (res && res.success) {
			setEconomiaDbPath(res.economiaDb || '')
			setAllowEconomiaDbChange(!!res.settings?.allowEconomiaDbChange)
			// also ensure input matches stored setting if not manually editing
			if (!dbFilePath) setDbFilePath(res.settings?.dbFile || 'C:\\Aincrad\\CuttingRoom\\app.db')
			if (!comelzBasePath) setComelzBasePath(res.settings?.comelzModelBasePath || 'O:\\Lectra\\Calcado\\Modelos\\COMELZ')
			if (!emmaBasePath) setEmmaBasePath(res.settings?.emmaModelBasePath || 'O:\\Lectra\\Calcado\\Modelos\\EMMA')
			if (!cgcFilePath) setCgcFilePath(res.settings?.cgcFilePath || 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\CGC.txt')
			if (!ofccFilePath) setOfccFilePath(res.settings?.ofccFilePath || 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\OFCC.txt')
			if (!ctfImportDir) setCtfImportDir(res.settings?.ctfImportDir || 'O:\\Lectra\\Calcado\\Modelos')
			if (!ctcImportDir) setCtcImportDir(res.settings?.ctcImportDir || 'O:\\Lectra\\Calcado\\Modelos')
			if (!ctcReportFile) setCtcReportFile(res.settings?.ctcReportFile || 'O:\\CORTE\\Alyson\\relatorioGCITXT\\CTC.txt')
			if (!ctfReportFile) setCtfReportFile(res.settings?.ctfReportFile || 'O:\\CORTE\\Alyson\\relatorioGCITXT\\CTF.txt')
			if (!defaultCustomerName) setDefaultCustomerName(res.settings?.defaultCustomerName || 'VULCABRAS')
		} else {
			console.error('Erro carregando status:', res?.message)
		}
	} catch (err) {
		console.error('Erro carregando status:', err)
	}
}

async function loadSettings() {
	try {
		const res = await (window as any).api.settings.get()
		if (res && res.success && res.settings) {
			setDbFilePath(res.settings.dbFile || 'C:\\Aincrad\\CuttingRoom\\app.db')
			setOriginalDbFile(res.settings.dbFile || 'C:\\Aincrad\\CuttingRoom\\app.db')
			setComelzBasePath(res.settings.comelzModelBasePath || 'O:\\Lectra\\Calcado\\Modelos\\COMELZ')
			setEmmaBasePath(res.settings.emmaModelBasePath || 'O:\\Lectra\\Calcado\\Modelos\\EMMA')
			setCgcFilePath(res.settings.cgcFilePath || 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\CGC.txt')
			setOfccFilePath(res.settings.ofccFilePath || 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\OFCC.txt')
			setCtfImportDir(res.settings.ctfImportDir || 'O:\\Lectra\\Calcado\\Modelos')
			setCtcImportDir(res.settings.ctcImportDir || 'O:\\Lectra\\Calcado\\Modelos')
			setCtcReportFile(res.settings.ctcReportFile || 'O:\\CORTE\\Alyson\\relatorioGCITXT\\CTC.txt')
			setCtfReportFile(res.settings.ctfReportFile || 'O:\\CORTE\\Calcado\\Modelos\\CTF.txt')
			setDefaultCustomerName(res.settings.defaultCustomerName || 'VULCABRAS')
		} else if (res && !res.success) {
			console.error('Erro carregando configurações:', res.message)
		}
	} catch (err) {
		console.error('Erro carregando configurações:', err)
	}
}

async function handleSelectDbFolder() {
	try {
		const selected = await (window as any).api.electronAPI.selectDirectory()
		// user cancelled
		if (!selected) {
			toast('Seleção de pasta cancelada')
			return
		}
		// inferir separador a partir do próprio caminho selecionado
		const sep = selected.includes('\\') ? '\\' : '/'
		let composed = selected
		if (!composed.endsWith('\\') && !composed.endsWith('/')) composed = `${composed}${sep}`
		composed = `${composed}app.db`
		setDbFilePath(composed)
	} catch (err) {
		console.error('Erro selecionando pasta:', err)
		toast.error('Erro ao abrir diálogo de pasta')
	}
}

async function handleTestDb() {
	if (!dbFilePath) {
		toast.error('Informe o caminho do arquivo de banco de dados para testar')
		return
	}
	try {
		const res = await (window as any).api.settings.test(dbFilePath)
		if (res && res.success) {
			toast.success('Conexão com o DB bem-sucedida')
		} else {
			toast.error(res?.message || 'Erro ao conectar com o DB')
		}
	} catch (err) {
		console.error('Erro testando DB:', err)
		toast.error('Erro ao testar conexão')
	}
}

async function handleSaveSettings() {
	if (!dbFilePath) {
		toast.error('Informe o caminho do arquivo de banco de dados')
		return
	}

	// Se mudou o caminho, pedir confirmação porque faremos backup e reiniciaremos a conexão
	if (originalDbFile && originalDbFile !== dbFilePath) {
		if (!confirm('Alterar o local do DB fará backup do arquivo atual e reinicializará a conexão. Deseja continuar?')) return
	}

	setSavingSettings(true)
	try {
		const res = await (window as any).api.settings.set({
			dbFile: dbFilePath,
			allowEconomiaDbChange: !!allowEconomiaDbChange,
			comelzModelBasePath: comelzBasePath,
			emmaModelBasePath: emmaBasePath,
			cgcFilePath: cgcFilePath,
			ofccFilePath: ofccFilePath,
			ctfImportDir: ctfImportDir,
			ctcImportDir: ctcImportDir,
			ctcReportFile: ctcReportFile,
			ctfReportFile: ctfReportFile,
			defaultCustomerName: defaultCustomerName,
		})
		if (res && res.success) {
			toast.success('Configurações salvas com sucesso')
			setOriginalDbFile(dbFilePath)
			if (res.economiaReinit) {
				if (res.economiaReinit.success) {
					toast.success('Economia DB reinicializado com sucesso')
				} else {
					console.error('Erro reinicializando economia DB:', res.economiaReinit.message)
					toast.error('Erro ao reinicializar Economia DB: ' + (res.economiaReinit.message || 'ver logs'))
				}
			}
		} else {
			toast.error(res?.message || 'Erro ao salvar configurações')
		}
	} catch (err) {
		console.error('Erro salvando configurações:', err)
		toast.error('Erro salvando configurações')
	} finally {
		setSavingSettings(false)
	}
}

async function handleRestoreDefault() {
	try {
		const res = await (window as any).api.settings.get()
		if (res && res.success && res.settings) {
			// padrão é o valor salvo no arquivo; se não existir, o main fornece o default
			setDbFilePath(res.settings.dbFile || 'C:\\Aincrad\\CuttingRoom\\app.db')
			setComelzBasePath(res.settings.comelzModelBasePath || 'O:\\Lectra\\Calcado\\Modelos\\COMELZ')
			setEmmaBasePath(res.settings.emmaModelBasePath || 'O:\\Lectra\\Calcado\\Modelos\\EMMA')
			setCgcFilePath(res.settings.cgcFilePath || 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\CGC.txt')
			setOfccFilePath(res.settings.ofccFilePath || 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\OFCC.txt')
			setCtfImportDir(res.settings.ctfImportDir || 'O:\\Lectra\\Calcado\\Modelos')
			setCtcImportDir(res.settings.ctcImportDir || 'O:\\Lectra\\Calcado\\Modelos')
			setCtcReportFile(res.settings.ctcReportFile || 'O:\\CORTE\\Alyson\\relatorioGCITXT\\CTC.txt')
			setCtfReportFile(res.settings.ctfReportFile || 'O:\\CORTE\\Alyson\\relatorioGCITXT\\CTF.txt')
			setDefaultCustomerName(res.settings.defaultCustomerName || 'VULCABRAS')
		}
	} catch (err) {
		console.error('Erro restaurando padrão:', err)
	}
}

	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
		confirmPassword: "",
		role: "viewer" as UserRole,
	})

	const loadUsers = useCallback(async () => {
		try {
			setLoading(true)
			const response = await window.api.users.list()
			if (response.success && response.users) {
				setUsers(response.users as UserData[])
			} else {
				toast.error("Erro ao carregar usuários")
			}
		} catch (error) {
			console.error("Erro ao carregar usuários:", error)
			toast.error("Erro ao carregar usuários")
		} finally {
			setLoading(false)
		}
	}, [])

	const loadRoles = useCallback(async () => {
		try {
			setLoadingRoles(true)
			const response = await window.api.roles.list()
			if (response.success && response.roles) {
				// Garantir que todas as permissões existam (fallback para novas permissões)
				const rolesWithDefaults = (response.roles as any[]).map((role) => ({
					...role,
					permissions: {
						...DEFAULT_PERMISSIONS,
						...(role.permissions || {}),
					},
				})) as Role[]
				setRoles(rolesWithDefaults)
			} else {
				toast.error("Erro ao carregar papéis")
			}
		} catch (error) {
			console.error("Erro ao carregar papéis:", error)
			toast.error("Erro ao carregar papéis")
		} finally {
			setLoadingRoles(false)
		}
	}, [])

	useEffect(() => {
		loadUsers()
		loadRoles()
		// Carregar configurações na inicialização
		loadSettings()
		loadStatus()
	}, [loadUsers, loadRoles])

	// Função para verificar o status da migração
	async function checkMigrationStatus() {
		setMigrationStatus('checking')
		setMigrationMessage('')
		try {
			const exists = await (window as any).api.migrations.checkRedutorLargura()
			setMigrationStatus(exists ? 'present' : 'missing')
		} catch (err: any) {
			console.error('Erro verificando migration:', err)
			setMigrationStatus('error')
			setMigrationMessage(err?.message || String(err))
		}
	}

	// Carregar logs quando a aba de auditoria for selecionada
	useEffect(() => {
		if (activeTab === 'auditoria') {
			setActivityLogs(activityLogger.getAllLogs())
		}
		if (activeTab === 'migrations') {
			checkMigrationStatus()
		}
		if (activeTab === 'configuracoes') {
			loadSettings()
			loadStatus()
		}
	}, [activeTab])

async function runMigration() {
	if (!confirm('Deseja aplicar a migração e adicionar a coluna redutor_largura?')) return
	setRunningMigration(true)
	try {
		const res = await (window as any).api.migrations.addRedutorLargura()
		if (res && res.success) {
			toast.success(res.message || 'Migração aplicada com sucesso')
			// Log de auditoria local
			try {
				activityLogger.log(user || null, 'update_model', 'model', 'db', 'schema', { migration: 'add_redutor_largura', result: res })
			} catch (e) {
				console.error('Erro salvando log de auditoria para migração:', e)
			}
		} else {
			toast.error(res?.message || 'Erro ao aplicar migração')
			try {
				activityLogger.log(user || null, 'update_model', 'model', 'db', 'schema', { migration: 'add_redutor_largura', result: res })
			} catch (e) {
				console.error('Erro salvando log de auditoria para migração (erro):', e)
			}
		}
		// reverificar status
		await checkMigrationStatus()
	} catch (err: any) {
		console.error('Erro aplicando migração:', err)
		toast.error(err?.message || String(err))
		setMigrationStatus('error')
		setMigrationMessage(err?.message || String(err))
	} finally {
		setRunningMigration(false)
	}
}

	// Filtrar logs por sub-aba (encaixe ou manual)
	const logsForCurrentTab = activityLogs.filter(log => {
		if (auditSubTab === 'encaixe') {
			return encaixeEntityTypes.includes(log.entityType) || 
				log.action.includes('encaixe') || 
				log.action.includes('generate') ||
				log.action === 'search_of' ||
				log.action === 'add_to_list' ||
				log.action === 'create_apelido'
		} else {
			return manualEntityTypes.includes(log.entityType)
		}
	})

	// Filtrar logs
	const filteredLogs = logsForCurrentTab.filter(log => {
		// Filtro por busca
		const searchLower = logSearch.toLowerCase()
		const matchesSearch = !logSearch || 
			log.entityName.toLowerCase().includes(searchLower) ||
			log.username.toLowerCase().includes(searchLower) ||
			activityLogger.formatAction(log.action).toLowerCase().includes(searchLower)
		
		// Filtro por tipo de entidade
		const matchesEntity = logFilter === 'all' || log.entityType === logFilter
		
		// Filtro por ação
		const matchesAction = logActionFilter === 'all' || log.action === logActionFilter
		
		return matchesSearch && matchesEntity && matchesAction
	})

	// Exportar logs para JSON
	const handleExportLogs = () => {
		const data = JSON.stringify(filteredLogs, null, 2)
		const blob = new Blob([data], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `auditoria_${auditSubTab}_${new Date().toISOString().split('T')[0]}.json`
		a.click()
		URL.revokeObjectURL(url)
		toast.success('Logs exportados com sucesso!')
	}

	// Limpar todos os logs
	const handleClearLogs = () => {
		if (confirm('Tem certeza que deseja limpar todos os logs de auditoria? Esta ação não pode ser desfeita.')) {
			activityLogger.clearLogs()
			setActivityLogs([])
			toast.success('Logs limpos com sucesso!')
		}
	}

	const resetForm = () => {
		setFormData({
			username: "",
			email: "",
			password: "",
			confirmPassword: "",
			role: "viewer",
		})
	}

	const handleCreateUser = async () => {
		if (!formData.username.trim()) {
			toast.error("Nome de usuário é obrigatório")
			return
		}
		if (!formData.password.trim()) {
			toast.error("Senha é obrigatória")
			return
		}
		if (formData.password !== formData.confirmPassword) {
			toast.error("As senhas não coincidem")
			return
		}
		if (formData.password.length < 4) {
			toast.error("A senha deve ter pelo menos 4 caracteres")
			return
		}

		try {
			const response = await window.api.users.create(
				formData.username.trim(),
				formData.password,
				formData.email.trim(),
				formData.role
			)

			if (response.success) {
				toast.success("Usuário criado com sucesso!")
				setIsCreateDialogOpen(false)
				resetForm()
				loadUsers()
			} else {
				toast.error(response.message || "Erro ao criar usuário")
			}
		} catch (error) {
			console.error("Erro ao criar usuário:", error)
			toast.error("Erro ao criar usuário")
		}
	}

	const handleEditUser = async () => {
		if (!selectedUser) return

		const updateData: {
			username?: string
			email?: string
			password?: string
			role?: string
		} = {}

		if (formData.username.trim() && formData.username !== selectedUser.username) {
			updateData.username = formData.username.trim()
		}
		if (formData.email.trim() !== selectedUser.email) {
			updateData.email = formData.email.trim()
		}
		if (formData.password) {
			if (formData.password !== formData.confirmPassword) {
				toast.error("As senhas não coincidem")
				return
			}
			if (formData.password.length < 4) {
				toast.error("A senha deve ter pelo menos 4 caracteres")
				return
			}
			updateData.password = formData.password
		}
		if (formData.role !== selectedUser.role) {
			updateData.role = formData.role
		}

		if (Object.keys(updateData).length === 0) {
			toast.info("Nenhuma alteração detectada")
			setIsEditDialogOpen(false)
			return
		}

		try {
			const response = await window.api.users.update(selectedUser.id, updateData)

			if (response.success) {
				toast.success("Usuário atualizado com sucesso!")
				setIsEditDialogOpen(false)
				resetForm()
				setSelectedUser(null)
				loadUsers()
			} else {
				toast.error(response.message || "Erro ao atualizar usuário")
			}
		} catch (error) {
			console.error("Erro ao atualizar usuário:", error)
			toast.error("Erro ao atualizar usuário")
		}
	}

	const handleToggleActive = async (userData: UserData) => {
		// Não permitir desativar o próprio usuário
		if (userData.id === user?.id) {
			toast.error("Você não pode desativar sua própria conta")
			return
		}

		try {
			const response = await window.api.users.update(userData.id, {
				active: !userData.active,
			})

			if (response.success) {
				toast.success(
					userData.active ? "Usuário desativado" : "Usuário ativado"
				)
				loadUsers()
			} else {
				toast.error(response.message || "Erro ao alterar status")
			}
		} catch (error) {
			console.error("Erro ao alterar status:", error)
			toast.error("Erro ao alterar status do usuário")
		}
	}

	const handleDeleteUser = async () => {
		if (!selectedUser) return

		// Não permitir deletar o próprio usuário
		if (selectedUser.id === user?.id) {
			toast.error("Você não pode deletar sua própria conta")
			setIsDeleteDialogOpen(false)
			return
		}

		try {
			const response = await window.api.users.delete(selectedUser.id)

			if (response.success) {
				toast.success("Usuário deletado com sucesso!")
				setIsDeleteDialogOpen(false)
				setSelectedUser(null)
				loadUsers()
			} else {
				toast.error(response.message || "Erro ao deletar usuário")
			}
		} catch (error) {
			console.error("Erro ao deletar usuário:", error)
			toast.error("Erro ao deletar usuário")
		}
	}

	const openEditDialog = (userData: UserData) => {
		setSelectedUser(userData)
		setFormData({
			username: userData.username,
			email: userData.email || "",
			password: "",
			confirmPassword: "",
			role: userData.role,
		})
		setIsEditDialogOpen(true)
	}

	const openDeleteDialog = (userData: UserData) => {
		setSelectedUser(userData)
		setIsDeleteDialogOpen(true)
	}

	// Funções para gerenciamento de roles
	const handleEditRole = (role: Role) => {
		setSelectedRole(role)
		setIsRoleFormOpen(true)
	}

	const handleCreateRole = () => {
		setSelectedRole(null)
		setIsRoleFormOpen(true)
	}

	const handleRoleSaved = () => {
		loadRoles()
	}

	const handleRoleDeleted = () => {
		loadRoles()
	}

	const handleRoleDuplicated = () => {
		loadRoles()
	}

	// Verificar se o usuário atual pode gerenciar usuários
	if (!hasPermission("canAccessSetup") || !hasPermission("canManageUsers")) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-8">
				<Shield className="w-16 h-16 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
				<p className="text-muted-foreground text-center">
					Você não tem permissão para acessar esta página.
					<br />
					Entre em contato com um administrador.
				</p>
			</div>
		)
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Settings className="w-6 h-6" />
						Configurações
					</h1>
					<p className="text-muted-foreground">
						Gerencie usuários e permissões do sistema
					</p>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full max-w-2xl grid-cols-6">
					<TabsTrigger value="usuarios" className="flex items-center gap-2">
						<Users className="w-4 h-4" />
						Usuários
					</TabsTrigger>
					<TabsTrigger value="papeis" className="flex items-center gap-2">
						<Shield className="w-4 h-4" />
						Papéis
					</TabsTrigger>
					<TabsTrigger value="permissoes" className="flex items-center gap-2">
						<Lock className="w-4 h-4" />
						Matriz
					</TabsTrigger>
					<TabsTrigger value="auditoria" className="flex items-center gap-2">
						<History className="w-4 h-4" />
						Auditoria
					</TabsTrigger>
				<TabsTrigger value="migrations" className="flex items-center gap-2">
					<Database className="w-4 h-4" />
					Migrações
				</TabsTrigger>
					<TabsTrigger value="configuracoes" className="flex items-center gap-2">
				<Settings className="w-4 h-4" />
				Configurações
			</TabsTrigger>
			</TabsList>
						<TabsContent value="usuarios" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Users className="w-5 h-5" />
										Gerenciar Usuários
									</CardTitle>
									<CardDescription>
										Adicione, edite ou remova usuários do sistema
									</CardDescription>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={loadUsers}
										disabled={loading}
									>
										<RefreshCw
											className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
										/>
										Atualizar
									</Button>
									<Button
										onClick={() => {
											resetForm()
											setIsCreateDialogOpen(true)
										}}
									>
										<UserPlus className="w-4 h-4 mr-2" />
										Novo Usuário
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="flex items-center justify-center py-8">
									<RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
								</div>
							) : users.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									Nenhum usuário cadastrado
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Usuário</TableHead>
											<TableHead>Email</TableHead>
											<TableHead>Papel</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Ações</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{users.map((userData) => {
											return (
												<TableRow key={userData.id}>
													<TableCell className="font-medium">
														<div className="flex items-center gap-2">
															{userData.username}
															{userData.id === user?.id && (
																<Badge variant="outline" className="text-xs">
																	Você
																</Badge>
															)}
														</div>
													</TableCell>
													<TableCell className="text-muted-foreground">
														{userData.email || "-"}
													</TableCell>
													<TableCell>
														{(() => {
															const RoleIcon = getRoleIcon(userData.role)
															return (
																<Badge
																	variant="outline"
																	className={`${getRoleColor(userData.role)} flex items-center gap-1 w-fit`}
																>
																	<RoleIcon className="w-3 h-3" />
																	{getRoleLabel(userData.role, roles)}
																</Badge>
															)
														})()}
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															<Switch
																checked={userData.active}
																onCheckedChange={() =>
																	handleToggleActive(userData)
																}
																disabled={userData.id === user?.id}
															/>
															{userData.active ? (
																<span className="text-green-500 text-sm flex items-center gap-1">
																	<CheckCircle2 className="w-3 h-3" />
																	Ativo
																</span>
															) : (
																<span className="text-red-500 text-sm flex items-center gap-1">
																	<XCircle className="w-3 h-3" />
																	Inativo
																</span>
															)}
														</div>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-2">
															<Button
																variant="ghost"
																size="icon"
																onClick={() => openEditDialog(userData)}
															>
																<Pencil className="w-4 h-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => openDeleteDialog(userData)}
																disabled={userData.id === user?.id}
																className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
															>
																<Trash2 className="w-4 h-4" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Tab Papéis (NOVA) */}
				<TabsContent value="papeis" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Shield className="w-5 h-5" />
										Gerenciar Papéis
									</CardTitle>
									<CardDescription>
										Crie, edite ou remova papéis de permissão personalizados
									</CardDescription>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={loadRoles}
										disabled={loadingRoles}
									>
										<RefreshCw
											className={`w-4 h-4 mr-2 ${loadingRoles ? "animate-spin" : ""}`}
										/>
										Atualizar
									</Button>
									<Button onClick={handleCreateRole}>
										<Plus className="w-4 h-4 mr-2" />
										Novo Papel
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{loadingRoles ? (
								<div className="flex items-center justify-center py-8">
									<RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
								</div>
							) : (
								<RoleList
									roles={roles}
									onEdit={handleEditRole}
									onDelete={handleRoleDeleted}
									onDuplicate={handleRoleDuplicated}
								/>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Tab Matriz de Permissões */}
				<TabsContent value="permissoes" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Lock className="w-5 h-5" />
								Matriz de Permissões
							</CardTitle>
							<CardDescription>
								Visualize as permissões de cada papel no sistema
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loadingRoles ? (
								<div className="flex items-center justify-center py-8">
									<RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{roles.map((role) => {
										const RoleIcon = getRoleIcon(role.name)
										return (
											<Card key={role.id} className="border-2">
												<CardHeader className="pb-3">
													<CardTitle className="flex items-center gap-2 text-lg">
														<RoleIcon className="w-5 h-5" />
														{role.displayName}
														{role.isSystem && (
															<Badge variant="outline" className="ml-2 text-xs">
																Sistema
															</Badge>
														)}
													</CardTitle>
													{role.description && (
														<CardDescription className="text-xs">
															{role.description}
														</CardDescription>
													)}
												</CardHeader>
												<CardContent className="space-y-2 text-sm">
													<PermissionItem
														label="Dashboard"
														allowed={role.permissions.canViewDashboard}
													/>
													<PermissionItem
														label="Ver Modelos"
														allowed={role.permissions.canViewModelos}
													/>
													<PermissionItem
														label="Editar Modelos"
														allowed={role.permissions.canEditModelos}
													/>
													<PermissionItem
														label="Ver Materiais"
														allowed={role.permissions.canViewMateriais}
													/>
													<PermissionItem
														label="Editar Materiais"
														allowed={role.permissions.canEditMateriais}
													/>
													<PermissionItem
														label="Ver Encaixe"
														allowed={role.permissions.canViewEncaixe}
													/>
													<PermissionItem
														label="Criar Encaixe"
														allowed={role.permissions.canCreateEncaixe}
													/>
													<PermissionItem
														label="Ver Manual"
														allowed={role.permissions.canViewManual}
													/>
													<PermissionItem
														label="Editar Manual"
														allowed={role.permissions.canEditManual}
													/>
													<PermissionItem
														label="Economia Dashboard"
														allowed={role.permissions.canViewEconomia}
													/>
													<PermissionItem
														label="Configurações"
														allowed={role.permissions.canAccessSetup}
													/>
													<PermissionItem
														label="Gerenciar Usuários"
														allowed={role.permissions.canManageUsers}
													/>
													<PermissionItem
														label="Gerenciar Papéis"
														allowed={role.permissions.canManageRoles}
													/>
												</CardContent>
											</Card>
										)
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Tab Migrações */}
			<TabsContent value="migrations" className="space-y-4">
				<Card className="border-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<History className="w-5 h-5" />
							Migrações do Banco
						</CardTitle>
						<CardDescription>Verifique e aplique migrações manualmente</CardDescription>
					</CardHeader>
					<CardContent>
						{migrationStatus === 'checking' && (
							<div className="flex items-center gap-2">
								<RefreshCw className="w-5 h-5 animate-spin" />
								<span>Verificando estado da migração...</span>
							</div>
						)}
						{migrationStatus === 'present' && (
							<div className="flex items-center justify-between">
								<div className="text-sm text-green-400">Coluna <code>redutor_largura</code> já existe.</div>
								<Button variant="outline" size="sm" onClick={checkMigrationStatus}>Reverificar</Button>
							</div>
						)}
						{migrationStatus === 'missing' && (
							<div className="flex items-center justify-between">
								<div className="text-sm text-yellow-300">Coluna <code>redutor_largura</code> não encontrada. O banco precisa ser atualizado.</div>
								<div className="flex gap-2">
									<Button size="sm" variant="destructive" onClick={runMigration} disabled={runningMigration}>
										{runningMigration ? 'Executando...' : 'Aplicar Migração'}
									</Button>
									<Button variant="outline" size="sm" onClick={checkMigrationStatus}>Reverificar</Button>
								</div>
							</div>
						)}
						{migrationStatus === 'error' && (
							<div className="flex items-center justify-between">
								<div className="text-sm text-red-400">Erro ao verificar migração: {migrationMessage}</div>
								<Button variant="outline" size="sm" onClick={checkMigrationStatus}>Tentar novamente</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			{/* Tab Configurações (nova) */}
			<TabsContent value="configuracoes" className="space-y-4">
				<Card className="border-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Settings className="w-5 h-5" />
							Configurações Gerais
						</CardTitle>
						<CardDescription>Defina caminhos e preferências da aplicação</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4">
							<div>
								<div className="mb-2">
								<div className="text-sm">Economia DB atual: <code title={economiaDbPath}>{economiaDbPath || '—'}</code></div>
							</div>
								<Label className="text-sm">Pasta onde será salvo o arquivo <code>app.db</code></Label>
									<div className="flex gap-2 mt-2">
										<Input value={dbFilePath} onChange={(e) => setDbFilePath((e.target as HTMLInputElement).value)} />
										<Button variant="outline" onClick={handleSelectDbFolder}>Selecionar pasta...</Button>
									</div>
								<p className="text-muted-foreground text-sm mt-2">Selecione a pasta na rede ou local onde será armazenado o arquivo <code>app.db</code>. Ao salvar, o app fará backup do DB atual (se existir) e reinicializará a conexão.</p>

								<Label className="text-sm mt-4">Base dos modelos COMELZ</Label>
								<div className="flex gap-2 mt-2">
									<Input value={comelzBasePath} onChange={(e) => setComelzBasePath((e.target as HTMLInputElement).value)} placeholder="\\\\servidor\\pasta\\COMELZ ou O:\\Lectra\\Calcado\\Modelos\\COMELZ" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Usado para exportar/normalizar modelos COMELZ (arquivos .cmz). Altere aqui sem precisar modificar código.</p>

								<Label className="text-sm mt-4">Base dos modelos EMMA</Label>
								<div className="flex gap-2 mt-2">
									<Input value={emmaBasePath} onChange={(e) => setEmmaBasePath((e.target as HTMLInputElement).value)} placeholder="\\\\servidor\\pasta\\EMMA ou O:\\Lectra\\Calcado\\Modelos\\EMMA" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Usado para exportar/gerar modelos EMMA (.emp). Ajuste aqui sem alterar código.</p>

								<Label className="text-sm mt-4">Arquivo CGC (Busca Dados - Primário)</Label>
								<div className="flex gap-2 mt-2">
									<Input value={cgcFilePath} onChange={(e) => setCgcFilePath((e.target as HTMLInputElement).value)} placeholder="O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\CGC.txt" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Caminho completo para o arquivo CGC.txt usado na tela de Economia/Busca Dados (busca primeiro neste arquivo).</p>

								<Label className="text-sm mt-4">Arquivo OFCC (Busca Dados - Secundário/Fallback)</Label>
								<div className="flex gap-2 mt-2">
									<Input value={ofccFilePath} onChange={(e) => setOfccFilePath((e.target as HTMLInputElement).value)} placeholder="O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\OFCC.txt" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Caminho completo para o arquivo OFCC.txt usado como fallback se não encontrar no CGC.txt.</p>

								<Label className="text-sm mt-4">Diretório de Importação CTF</Label>
								<div className="flex gap-2 mt-2">
									<Input value={ctfImportDir} onChange={(e) => setCtfImportDir((e.target as HTMLInputElement).value)} placeholder="O:\\Lectra\\Calcado\\Modelos" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Pasta base para importar arquivos .ctf na tela de Economia.</p>

								<Label className="text-sm mt-4">Diretório de Importação CTC</Label>
								<div className="flex gap-2 mt-2">
									<Input value={ctcImportDir} onChange={(e) => setCtcImportDir((e.target as HTMLInputElement).value)} placeholder="O:\\Lectra\\Calcado\\Modelos" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Pasta base para importar arquivos .ctc na tela de Economia.</p>

								<Label className="text-sm mt-4">Arquivo CTC.txt (Busca OF)</Label>
								<div className="flex gap-2 mt-2">
									<Input value={ctcReportFile} onChange={(e) => setCtcReportFile((e.target as HTMLInputElement).value)} placeholder="O:\\CORTE\\Alyson\\relatorioGCITXT\\CTC.txt" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Caminho do relatório CTC.txt usado na busca de OF.</p>

								<Label className="text-sm mt-4">Arquivo CTF.txt (Busca OF)</Label>
								<div className="flex gap-2 mt-2">
									<Input value={ctfReportFile} onChange={(e) => setCtfReportFile((e.target as HTMLInputElement).value)} placeholder="O:\\CORTE\\Alyson\\relatorioGCITXT\\CTF.txt" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Caminho do relatório CTF.txt usado na busca de OF.</p>

								<Label className="text-sm mt-4">Nome do Cliente Padrão</Label>
								<div className="flex gap-2 mt-2">
									<Input value={defaultCustomerName} onChange={(e) => setDefaultCustomerName((e.target as HTMLInputElement).value)} placeholder="VULCABRAS" />
								</div>
								<p className="text-muted-foreground text-sm mt-2">Nome do cliente usado nos arquivos gerados (Emma/Comelz).</p>
							</div>
							<div className="flex gap-2">
								<Button onClick={handleSaveSettings} disabled={savingSettings}>{savingSettings ? 'Salvando...' : 'Salvar'}</Button>
							<Button variant="outline" onClick={handleTestDb} disabled={!dbFilePath}>Testar conexão</Button>
								<Button variant="outline" onClick={handleRestoreDefault}>Restaurar padrão</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</TabsContent>

			{/* Tab Auditoria */}
				<TabsContent value="auditoria" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<History className="w-5 h-5" />
										Log de Auditoria
									</CardTitle>
									<CardDescription>
										Histórico de todas as ações realizadas no sistema
									</CardDescription>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setActivityLogs(activityLogger.getAllLogs())}
									>
										<RefreshCw className="w-4 h-4 mr-2" />
										Atualizar
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={handleExportLogs}
										disabled={filteredLogs.length === 0}
									>
										<Download className="w-4 h-4 mr-2" />
										Exportar
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={handleClearLogs}
										disabled={activityLogs.length === 0}
									>
										<Trash2 className="w-4 h-4 mr-2" />
										Limpar
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Sub-abas: Encaixe e Manual */}
							<div className="flex gap-2 border-b pb-2">
								<button
									onClick={() => setAuditSubTab('encaixe')}
									className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
										auditSubTab === 'encaixe'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted hover:bg-muted/80 text-muted-foreground'
									}`}
								>
									<Scissors className="w-4 h-4" />
									Encaixe
									<span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
										auditSubTab === 'encaixe' ? 'bg-primary-foreground/20' : 'bg-background'
									}`}>
										{activityLogs.filter(l => 
											['encaixe', 'of', 'apelido'].includes(l.entityType) || 
											l.action.includes('encaixe') || 
											l.action.includes('generate') ||
											l.action === 'search_of' ||
											l.action === 'add_to_list' ||
											l.action === 'create_apelido'
										).length}
									</span>
								</button>
								<button
									onClick={() => setAuditSubTab('manual')}
									className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
										auditSubTab === 'manual'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted hover:bg-muted/80 text-muted-foreground'
									}`}
								>
									<Book className="w-4 h-4" />
									Manual
									<span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
										auditSubTab === 'manual' ? 'bg-primary-foreground/20' : 'bg-background'
									}`}>
										{activityLogs.filter(l => ['brand', 'model', 'component'].includes(l.entityType)).length}
									</span>
								</button>
							</div>

							{/* Filtros */}
							<div className="flex flex-wrap gap-4">
								<div className="flex-1 min-w-[200px]">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
										<Input
											placeholder="Buscar por nome, usuário ou ação..."
											value={logSearch}
											onChange={(e) => setLogSearch(e.target.value)}
											className="pl-10"
										/>
									</div>
								</div>
								{auditSubTab === 'encaixe' ? (
									<>
										<Select value={logFilter} onValueChange={(v) => setLogFilter(v as any)}>
											<SelectTrigger className="w-[150px]">
												<Filter className="w-4 h-4 mr-2" />
												<SelectValue placeholder="Tipo" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">Todos</SelectItem>
												<SelectItem value="encaixe">Encaixes</SelectItem>
												<SelectItem value="of">OFs</SelectItem>
												<SelectItem value="apelido">Apelidos</SelectItem>
											</SelectContent>
										</Select>
										<Select value={logActionFilter} onValueChange={setLogActionFilter}>
											<SelectTrigger className="w-[180px]">
												<SelectValue placeholder="Ação" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">Todas ações</SelectItem>
												<SelectItem value="search_of">Buscar OF</SelectItem>
												<SelectItem value="generate_encaixe">Gerar encaixe</SelectItem>
												<SelectItem value="batch_generate_encaixe">Gerar lote</SelectItem>
												<SelectItem value="add_to_list">Adicionar à lista</SelectItem>
												<SelectItem value="create_apelido">Criar apelido</SelectItem>
											</SelectContent>
										</Select>
									</>
								) : (
									<>
										<Select value={logFilter} onValueChange={(v) => setLogFilter(v as any)}>
											<SelectTrigger className="w-[150px]">
												<Filter className="w-4 h-4 mr-2" />
												<SelectValue placeholder="Tipo" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">Todos</SelectItem>
												<SelectItem value="brand">Marcas</SelectItem>
												<SelectItem value="model">Modelos</SelectItem>
												<SelectItem value="component">Componentes</SelectItem>
											</SelectContent>
										</Select>
										<Select value={logActionFilter} onValueChange={setLogActionFilter}>
											<SelectTrigger className="w-[180px]">
												<SelectValue placeholder="Ação" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">Todas ações</SelectItem>
												<SelectItem value="create_brand">Criar marca</SelectItem>
												<SelectItem value="delete_brand">Excluir marca</SelectItem>
												<SelectItem value="create_model">Criar modelo</SelectItem>
												<SelectItem value="update_model">Atualizar modelo</SelectItem>
												<SelectItem value="delete_model">Excluir modelo</SelectItem>
												<SelectItem value="duplicate_model">Duplicar modelo</SelectItem>
												<SelectItem value="export_model">Exportar modelo</SelectItem>
												<SelectItem value="import_model">Importar modelo</SelectItem>
												<SelectItem value="create_component">Criar componente</SelectItem>
												<SelectItem value="update_component">Atualizar componente</SelectItem>
												<SelectItem value="delete_component">Excluir componente</SelectItem>
											</SelectContent>
										</Select>
									</>
								)}
							</div>



				{/* Estatísticas por sub-aba */}
							{auditSubTab === 'encaixe' ? (
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div className="bg-muted/50 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-foreground">{logsForCurrentTab.length}</div>
										<div className="text-xs text-muted-foreground">Total</div>
									</div>
									<div className="bg-cyan-500/10 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-cyan-600">
											{logsForCurrentTab.filter(l => l.action === 'generate_encaixe').length}
										</div>
										<div className="text-xs text-muted-foreground">Encaixes Gerados</div>
									</div>
									<div className="bg-purple-500/10 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-purple-600">
											{logsForCurrentTab.filter(l => l.action === 'batch_generate_encaixe').length}
										</div>
										<div className="text-xs text-muted-foreground">Lotes</div>
									</div>
									<div className="bg-amber-500/10 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-amber-600">
											{logsForCurrentTab.filter(l => l.action === 'search_of').length}
										</div>
										<div className="text-xs text-muted-foreground">Buscas OF</div>
									</div>
								</div>
							) : (
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div className="bg-muted/50 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-foreground">{logsForCurrentTab.length}</div>
										<div className="text-xs text-muted-foreground">Total</div>
									</div>
									<div className="bg-green-500/10 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-green-600">
											{logsForCurrentTab.filter(l => l.action.includes('create')).length}
										</div>
										<div className="text-xs text-muted-foreground">Criações</div>
									</div>
									<div className="bg-blue-500/10 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-blue-600">
											{logsForCurrentTab.filter(l => l.action.includes('update')).length}
										</div>
										<div className="text-xs text-muted-foreground">Atualizações</div>
									</div>
									<div className="bg-red-500/10 rounded-lg p-3 text-center">
										<div className="text-2xl font-bold text-red-600">
											{logsForCurrentTab.filter(l => l.action.includes('delete')).length}
										</div>
										<div className="text-xs text-muted-foreground">Exclusões</div>
									</div>
								</div>
							)}

							{/* Tabela de logs */}
							<div className="border rounded-lg">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[180px]">Data/Hora</TableHead>
											<TableHead className="w-[120px]">Usuário</TableHead>
											<TableHead className="w-[150px]">Ação</TableHead>
											<TableHead className="w-[100px]">Tipo</TableHead>
											<TableHead>Entidade</TableHead>
											<TableHead className="w-[200px]">Detalhes</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredLogs.length === 0 ? (
											<TableRow>
												<TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
													{logsForCurrentTab.length === 0 
														? `Nenhuma atividade de ${auditSubTab === 'encaixe' ? 'encaixe' : 'manual'} registrada ainda`
														: 'Nenhum resultado encontrado para os filtros aplicados'
													}
												</TableCell>
											</TableRow>
										) : (
											filteredLogs.slice(0, 100).map((log) => (
												<TableRow key={log.id}>
													<TableCell className="font-mono text-xs">
														{new Date(log.timestamp).toLocaleString('pt-BR')}
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="font-normal">
															{log.username}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge className={`
															${log.action.includes('create') ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
															${log.action.includes('update') ? 'bg-blue-500/20 text-blue-600 border-blue-500/30' : ''}
															${log.action.includes('delete') ? 'bg-red-500/20 text-red-600 border-red-500/30' : ''}
															${log.action.includes('duplicate') ? 'bg-purple-500/20 text-purple-600 border-purple-500/30' : ''}
															${log.action.includes('export') || log.action.includes('import') ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' : ''}
															${log.action.includes('generate') || log.action.includes('encaixe') ? 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30' : ''}
															${log.action === 'search_of' ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' : ''}
															${log.action === 'add_to_list' ? 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30' : ''}
														`}>
															{activityLogger.formatAction(log.action)}
														</Badge>
													</TableCell>
													<TableCell>
														<span className="text-xs text-muted-foreground">
															{activityLogger.formatEntityType(log.entityType)}
														</span>
													</TableCell>
													<TableCell className="font-medium">
														{log.entityName}
													</TableCell>
													<TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
														{log.metadata?.brandName && (
															<span>Marca: {log.metadata.brandName}</span>
														)}
														{log.metadata?.maquina && (
															<span>Máquina: {log.metadata.maquina}</span>
														)}
														{log.metadata?.of && !log.entityName.includes(log.metadata.of) && (
															<span>OF: {log.metadata.of}</span>
														)}
														{log.details && typeof log.details === 'object' && !log.metadata?.maquina && (
															<span title={JSON.stringify(log.details)}>
																{Object.keys(log.details).length} campo(s)
															</span>
														)}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>

							{/* Paginação info */}
							{filteredLogs.length > 100 && (
								<div className="text-center text-sm text-muted-foreground">
									Mostrando 100 de {filteredLogs.length} registros. Exporte para ver todos.
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Formulário de Role */}
			<RoleForm
				open={isRoleFormOpen}
				onOpenChange={setIsRoleFormOpen}
				role={selectedRole}
				onSave={handleRoleSaved}
			/>

			{/* Dialog Criar Usuário */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserPlus className="w-5 h-5" />
							Novo Usuário
						</DialogTitle>
						<DialogDescription>
							Preencha os dados para criar um novo usuário
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="username">Nome de Usuário *</Label>
							<Input
								id="username"
								placeholder="Digite o nome de usuário"
								value={formData.username}
								onChange={(e) =>
									setFormData({ ...formData, username: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="email@exemplo.com"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Senha *</Label>
							<Input
								id="password"
								type="password"
								placeholder="Digite a senha"
								value={formData.password}
								onChange={(e) =>
									setFormData({ ...formData, password: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirmar Senha *</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="Confirme a senha"
								value={formData.confirmPassword}
								onChange={(e) =>
									setFormData({ ...formData, confirmPassword: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="role">Papel</Label>
							<Select
								value={formData.role}
								onValueChange={(value: UserRole) =>
									setFormData({ ...formData, role: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione o papel" />
								</SelectTrigger>
								<SelectContent>
									{roles.map((role) => {
										const RoleIcon = getRoleIcon(role.name)
										return (
											<SelectItem key={role.id} value={role.name}>
												<div className="flex items-center gap-2">
													<RoleIcon className="w-4 h-4" />
													{role.displayName}
												</div>
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsCreateDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button onClick={handleCreateUser}>Criar Usuário</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Dialog Editar Usuário */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Pencil className="w-5 h-5" />
							Editar Usuário
						</DialogTitle>
						<DialogDescription>
							Altere os dados do usuário {selectedUser?.username}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="edit-username">Nome de Usuário</Label>
							<Input
								id="edit-username"
								placeholder="Digite o nome de usuário"
								value={formData.username}
								onChange={(e) =>
									setFormData({ ...formData, username: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-email">Email</Label>
							<Input
								id="edit-email"
								type="email"
								placeholder="email@exemplo.com"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-password">Nova Senha (opcional)</Label>
							<Input
								id="edit-password"
								type="password"
								placeholder="Deixe em branco para manter a atual"
								value={formData.password}
								onChange={(e) =>
									setFormData({ ...formData, password: e.target.value })
								}
							/>
						</div>
						{formData.password && (
							<div className="space-y-2">
								<Label htmlFor="edit-confirmPassword">Confirmar Nova Senha</Label>
								<Input
									id="edit-confirmPassword"
									type="password"
									placeholder="Confirme a nova senha"
									value={formData.confirmPassword}
									onChange={(e) =>
										setFormData({ ...formData, confirmPassword: e.target.value })
									}
								/>
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="edit-role">Papel</Label>
							<Select
								value={formData.role}
								onValueChange={(value: UserRole) =>
									setFormData({ ...formData, role: value })
								}
								disabled={selectedUser?.id === user?.id}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione o papel" />
								</SelectTrigger>
								<SelectContent>
									{roles.map((role) => {
										const RoleIcon = getRoleIcon(role.name)
										return (
											<SelectItem key={role.id} value={role.name}>
												<div className="flex items-center gap-2">
													<RoleIcon className="w-4 h-4" />
													{role.displayName}
												</div>
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
							{selectedUser?.id === user?.id && (
								<p className="text-xs text-muted-foreground">
									Você não pode alterar seu próprio papel
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button onClick={handleEditUser}>Salvar Alterações</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Dialog Confirmar Exclusão */}
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir o usuário{" "}
							<strong>{selectedUser?.username}</strong>?
							<br />
							Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteUser}
							className="bg-red-500 hover:bg-red-600"
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

// Componente auxiliar para mostrar permissões
function PermissionItem({
	label,
	allowed,
}: {
	label: string
	allowed: boolean
}) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-muted-foreground">{label}</span>
			{allowed ? (
				<CheckCircle2 className="w-4 h-4 text-green-500" />
			) : (
				<XCircle className="w-4 h-4 text-red-500" />
			)}
		</div>
	)
}
