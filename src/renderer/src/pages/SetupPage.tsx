import { useState, useEffect, useCallback } from "react"
import { useAuth, UserRole, ROLE_PERMISSIONS } from "@renderer/contexts/AuthContext"
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
} from "lucide-react"
import { toast } from "sonner"

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

export default function SetupPage() {
	const { user, hasPermission } = useAuth()
	const [users, setUsers] = useState<UserData[]>([])
	const [loading, setLoading] = useState(true)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
	const [activeTab, setActiveTab] = useState("usuarios")

	// Form state
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

	useEffect(() => {
		loadUsers()
	}, [loadUsers])

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
				<TabsList className="grid w-full max-w-md grid-cols-2">
					<TabsTrigger value="usuarios" className="flex items-center gap-2">
						<Users className="w-4 h-4" />
						Usuários
					</TabsTrigger>
					<TabsTrigger value="permissoes" className="flex items-center gap-2">
						<Shield className="w-4 h-4" />
						Permissões
					</TabsTrigger>
				</TabsList>

				{/* Tab Usuários */}
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
											const RoleIcon = ROLE_ICONS[userData.role]
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
														<Badge
															variant="outline"
															className={`${ROLE_COLORS[userData.role]} flex items-center gap-1 w-fit`}
														>
															<RoleIcon className="w-3 h-3" />
															{ROLE_LABELS[userData.role]}
														</Badge>
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

				{/* Tab Permissões */}
				<TabsContent value="permissoes" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Shield className="w-5 h-5" />
								Matriz de Permissões
							</CardTitle>
							<CardDescription>
								Visualize as permissões de cada papel no sistema
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{(["admin", "editor", "viewer"] as UserRole[]).map((role) => {
									const RoleIcon = ROLE_ICONS[role]
									const permissions = ROLE_PERMISSIONS[role]
									return (
										<Card key={role} className="border-2">
											<CardHeader className="pb-3">
												<CardTitle className="flex items-center gap-2 text-lg">
													<RoleIcon className="w-5 h-5" />
													{ROLE_LABELS[role]}
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-2 text-sm">
												<PermissionItem
													label="Dashboard"
													allowed={permissions.canViewDashboard}
												/>
												<PermissionItem
													label="Ver Modelos"
													allowed={permissions.canViewModelos}
												/>
												<PermissionItem
													label="Editar Modelos"
													allowed={permissions.canEditModelos}
												/>
												<PermissionItem
													label="Ver Materiais"
													allowed={permissions.canViewMateriais}
												/>
												<PermissionItem
													label="Editar Materiais"
													allowed={permissions.canEditMateriais}
												/>
												<PermissionItem
													label="Ver Encaixe"
													allowed={permissions.canViewEncaixe}
												/>
												<PermissionItem
													label="Criar Encaixe"
													allowed={permissions.canCreateEncaixe}
												/>
												<PermissionItem
													label="Ver Manual"
													allowed={permissions.canViewManual}
												/>
												<PermissionItem
													label="Editar Manual"
													allowed={permissions.canEditManual}
												/>
												<PermissionItem
													label="Configurações"
													allowed={permissions.canAccessSetup}
												/>
												<PermissionItem
													label="Gerenciar Usuários"
													allowed={permissions.canManageUsers}
												/>
											</CardContent>
										</Card>
									)
								})}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

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
									<SelectItem value="admin">
										<div className="flex items-center gap-2">
											<ShieldCheck className="w-4 h-4" />
											Administrador
										</div>
									</SelectItem>
									<SelectItem value="editor">
										<div className="flex items-center gap-2">
											<Shield className="w-4 h-4" />
											Editor
										</div>
									</SelectItem>
									<SelectItem value="viewer">
										<div className="flex items-center gap-2">
											<Eye className="w-4 h-4" />
											Visualizador
										</div>
									</SelectItem>
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
									<SelectItem value="admin">
										<div className="flex items-center gap-2">
											<ShieldCheck className="w-4 h-4" />
											Administrador
										</div>
									</SelectItem>
									<SelectItem value="editor">
										<div className="flex items-center gap-2">
											<Shield className="w-4 h-4" />
											Editor
										</div>
									</SelectItem>
									<SelectItem value="viewer">
										<div className="flex items-center gap-2">
											<Eye className="w-4 h-4" />
											Visualizador
										</div>
									</SelectItem>
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
