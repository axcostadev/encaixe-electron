import { useState, useEffect } from "react"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { Textarea } from "@renderer/components/ui/textarea"
import { Switch } from "@renderer/components/ui/switch"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog"
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@renderer/components/ui/accordion"
import { Shield, Save, X } from "lucide-react"
import { toast } from "sonner"

// Usar tipos globais de Window.api
export type UserPermissions = {
	canViewDashboard: boolean
	canViewModelos: boolean
	canEditModelos: boolean
	canDeleteModelos: boolean
	canViewCores: boolean
	canEditCores: boolean
	canDeleteCores: boolean
	canViewMateriais: boolean
	canEditMateriais: boolean
	canDeleteMateriais: boolean
	canViewComponentes: boolean
	canEditComponentes: boolean
	canDeleteComponentes: boolean
	canViewSetores: boolean
	canEditSetores: boolean
	canDeleteSetores: boolean
	canViewEncaixe: boolean
	canCreateEncaixe: boolean
	canViewManual: boolean
	canEditManual: boolean
	canViewEconomia: boolean
	canAccessSetup: boolean
	canManageUsers: boolean
	canManageRoles: boolean
}

export interface Role {
	id: number
	name: string
	displayName: string
	description: string
	permissions: UserPermissions
	isSystem: boolean
	created_at?: string
}

interface RoleFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	role?: Role | null
	onSave: () => void
}

// Permissões padrão (todas desabilitadas)
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
	canViewManual: false,
	canEditManual: false,
	canViewEconomia: false,
	canAccessSetup: false,
	canManageUsers: false,
	canManageRoles: false,
}

// Categorias de permissões para organização visual
const PERMISSION_CATEGORIES = [
	{
		title: "Dashboard",
		permissions: [
			{ key: "canViewDashboard", label: "Visualizar Dashboard" },
		],
	},
	{
		title: "Modelos",
		permissions: [
			{ key: "canViewModelos", label: "Visualizar Modelos" },
			{ key: "canEditModelos", label: "Editar/Criar Modelos" },
			{ key: "canDeleteModelos", label: "Excluir Modelos" },
		],
	},
	{
		title: "Cores",
		permissions: [
			{ key: "canViewCores", label: "Visualizar Cores" },
			{ key: "canEditCores", label: "Editar/Criar Cores" },
			{ key: "canDeleteCores", label: "Excluir Cores" },
		],
	},
	{
		title: "Materiais",
		permissions: [
			{ key: "canViewMateriais", label: "Visualizar Materiais" },
			{ key: "canEditMateriais", label: "Editar/Criar Materiais" },
			{ key: "canDeleteMateriais", label: "Excluir Materiais" },
		],
	},
	{
		title: "Componentes",
		permissions: [
			{ key: "canViewComponentes", label: "Visualizar Componentes" },
			{ key: "canEditComponentes", label: "Editar/Criar Componentes" },
			{ key: "canDeleteComponentes", label: "Excluir Componentes" },
		],
	},
	{
		title: "Setores",
		permissions: [
			{ key: "canViewSetores", label: "Visualizar Setores" },
			{ key: "canEditSetores", label: "Editar/Criar Setores" },
			{ key: "canDeleteSetores", label: "Excluir Setores" },
		],
	},
	{
		title: "Encaixe",
		permissions: [
			{ key: "canViewEncaixe", label: "Visualizar Encaixe" },
			{ key: "canCreateEncaixe", label: "Criar Encaixe" },
		],
	},
	{
		title: "Manual",
		permissions: [
			{ key: "canViewManual", label: "Visualizar Manual" },
			{ key: "canEditManual", label: "Editar Manual" },
		],
	},
	{
		title: "Economia Dashboard",
		permissions: [
			{ key: "canViewEconomia", label: "Visualizar Economia Dashboard" },
		],
	},
	{
		title: "Administração",
		permissions: [
			{ key: "canAccessSetup", label: "Acessar Configurações" },
			{ key: "canManageUsers", label: "Gerenciar Usuários" },
			{ key: "canManageRoles", label: "Gerenciar Papéis" },
		],
	},
]

export function RoleForm({ open, onOpenChange, role, onSave }: RoleFormProps) {
	const [name, setName] = useState("")
	const [displayName, setDisplayName] = useState("")
	const [description, setDescription] = useState("")
	const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS)
	const [saving, setSaving] = useState(false)

	const isEditing = !!role
	const isSystemRole = role?.isSystem || false

	// Resetar formulário quando abrir/fechar ou mudar role
	useEffect(() => {
		if (open) {
			if (role) {
				setName(role.name)
				setDisplayName(role.displayName)
				setDescription(role.description || "")
				setPermissions({ ...role.permissions })
			} else {
				setName("")
				setDisplayName("")
				setDescription("")
				setPermissions({ ...DEFAULT_PERMISSIONS })
			}
		}
	}, [open, role])

	// Gerar nome slug a partir do displayName
	const generateSlug = (text: string) => {
		return text
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
	}

	const handleDisplayNameChange = (value: string) => {
		setDisplayName(value)
		// Auto-gerar slug apenas se não estiver editando
		if (!isEditing) {
			setName(generateSlug(value))
		}
	}

	const handlePermissionChange = (key: keyof UserPermissions, value: boolean) => {
		setPermissions((prev) => ({
			...prev,
			[key]: value,
		}))
	}

	const handleSelectAll = (category: typeof PERMISSION_CATEGORIES[0]) => {
		const updates: Partial<UserPermissions> = {}
		category.permissions.forEach((p) => {
			updates[p.key as keyof UserPermissions] = true
		})
		setPermissions((prev) => ({ ...prev, ...updates }))
	}

	const handleDeselectAll = (category: typeof PERMISSION_CATEGORIES[0]) => {
		const updates: Partial<UserPermissions> = {}
		category.permissions.forEach((p) => {
			updates[p.key as keyof UserPermissions] = false
		})
		setPermissions((prev) => ({ ...prev, ...updates }))
	}

	const handleSubmit = async () => {
		// Validações
		if (!displayName.trim()) {
			toast.error("Nome de exibição é obrigatório")
			return
		}

		if (!isEditing && !name.trim()) {
			toast.error("Nome do papel é obrigatório")
			return
		}

		setSaving(true)

		try {
			if (isEditing && role) {
				// Atualizar role existente
				const response = await window.api.roles.update(role.id, {
					displayName: displayName.trim(),
					description: description.trim(),
					permissions,
				})

				if (response.success) {
					toast.success("Papel atualizado com sucesso!")
					onSave()
					onOpenChange(false)
				} else {
					toast.error(response.message || "Erro ao atualizar papel")
				}
			} else {
				// Criar novo role
				const response = await window.api.roles.create(
					name.trim(),
					displayName.trim(),
					description.trim(),
					permissions
				)

				if (response.success) {
					toast.success("Papel criado com sucesso!")
					onSave()
					onOpenChange(false)
				} else {
					toast.error(response.message || "Erro ao criar papel")
				}
			}
		} catch (error) {
			console.error("Erro ao salvar papel:", error)
			toast.error("Erro ao salvar papel")
		} finally {
			setSaving(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Shield className="w-5 h-5" />
						{isEditing ? "Editar Papel" : "Novo Papel"}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? `Edite as permissões do papel "${role?.displayName}"`
							: "Crie um novo papel de permissões personalizado"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Informações básicas */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="displayName">Nome de Exibição *</Label>
							<Input
								id="displayName"
								placeholder="Ex: Operador de Encaixe"
								value={displayName}
								onChange={(e) => handleDisplayNameChange(e.target.value)}
								disabled={isSystemRole && role?.name === "admin"}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="name">Identificador (slug)</Label>
							<Input
								id="name"
								placeholder="operador-encaixe"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={isEditing}
								className={isEditing ? "opacity-50" : ""}
							/>
							{!isEditing && (
								<p className="text-xs text-muted-foreground">
									Gerado automaticamente. Use apenas letras minúsculas, números e hífens.
								</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Descrição</Label>
						<Textarea
							id="description"
							placeholder="Descreva as responsabilidades deste papel..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
						/>
					</div>

					{/* Permissões */}
					<div className="space-y-2">
						<Label>Permissões</Label>
						{isSystemRole && role?.name === "admin" && (
							<p className="text-sm text-yellow-500 mb-2">
								⚠️ O papel Administrador possui todas as permissões e não pode ser modificado.
							</p>
						)}
						<Accordion type="multiple" className="w-full">
							{PERMISSION_CATEGORIES.map((category) => (
								<AccordionItem key={category.title} value={category.title}>
									<AccordionTrigger className="text-sm font-medium">
										{category.title}
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-3 pt-2">
											{/* Botões de seleção rápida */}
											<div className="flex gap-2 mb-3">
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => handleSelectAll(category)}
													disabled={isSystemRole && role?.name === "admin"}
												>
													Marcar todos
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => handleDeselectAll(category)}
													disabled={isSystemRole && role?.name === "admin"}
												>
													Desmarcar todos
												</Button>
											</div>
											{/* Lista de permissões */}
											{category.permissions.map((perm) => (
												<div
													key={perm.key}
													className="flex items-center justify-between"
												>
													<Label
														htmlFor={perm.key}
														className="text-sm font-normal cursor-pointer"
													>
														{perm.label}
													</Label>
													<Switch
														id={perm.key}
														checked={permissions[perm.key as keyof UserPermissions]}
														onCheckedChange={(checked) =>
															handlePermissionChange(
																perm.key as keyof UserPermissions,
																checked
															)
														}
														disabled={isSystemRole && role?.name === "admin"}
													/>
												</div>
											))}
										</div>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						<X className="w-4 h-4 mr-2" />
						Cancelar
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={saving || (isSystemRole && role?.name === "admin")}
					>
						<Save className="w-4 h-4 mr-2" />
						{saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Papel"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
