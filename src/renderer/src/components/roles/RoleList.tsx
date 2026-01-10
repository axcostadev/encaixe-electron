import { useState } from "react"
import { Button } from "@renderer/components/ui/button"
import { Badge } from "@renderer/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu"
import {
	Shield,
	ShieldCheck,
	Eye,
	Pencil,
	Trash2,
	Copy,
	MoreHorizontal,
	Lock,
} from "lucide-react"
import { toast } from "sonner"
import type { Role, UserPermissions } from "./RoleForm"

interface RoleListProps {
	roles: Role[]
	onEdit: (role: Role) => void
	onDelete: (id: number) => void
	onDuplicate: (role: Role) => void
}

// Ícones por tipo de role
const getRoleIcon = (name: string, isSystem: boolean) => {
	if (name === "admin") return ShieldCheck
	if (name === "editor") return Shield
	if (name === "viewer") return Eye
	return isSystem ? Lock : Shield
}

// Cores por tipo de role
const getRoleColor = (name: string, isSystem: boolean) => {
	if (name === "admin") return "bg-red-500/20 text-red-400 border-red-500/30"
	if (name === "editor") return "bg-blue-500/20 text-blue-400 border-blue-500/30"
	if (name === "viewer") return "bg-green-500/20 text-green-400 border-green-500/30"
	if (isSystem) return "bg-purple-500/20 text-purple-400 border-purple-500/30"
	return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
}

// Contar permissões ativas
const countActivePermissions = (permissions: UserPermissions) => {
	return Object.values(permissions).filter(Boolean).length
}

// Total de permissões
const TOTAL_PERMISSIONS = 16

export function RoleList({ roles, onEdit, onDelete, onDuplicate }: RoleListProps) {
	const [deleteRole, setDeleteRole] = useState<Role | null>(null)

	const handleConfirmDelete = async () => {
		if (!deleteRole) return

		try {
			const response = await window.api.roles.delete(deleteRole.id)
			if (response.success) {
				toast.success("Papel deletado com sucesso!")
				onDelete(deleteRole.id)
			} else {
				toast.error(response.message || "Erro ao deletar papel")
			}
		} catch (error) {
			console.error("Erro ao deletar:", error)
			toast.error("Erro ao deletar papel")
		} finally {
			setDeleteRole(null)
		}
	}

	const handleDuplicate = async (role: Role) => {
		try {
			const newName = `${role.name}-copia`
			const newDisplayName = `${role.displayName} (Cópia)`

			const response = await window.api.roles.duplicate(role.id, newName, newDisplayName)
			if (response.success) {
				toast.success("Papel duplicado com sucesso!")
				onDuplicate(role)
			} else {
				toast.error(response.message || "Erro ao duplicar papel")
			}
		} catch (error) {
			console.error("Erro ao duplicar:", error)
			toast.error("Erro ao duplicar papel")
		}
	}

	if (roles.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
				<p>Nenhum papel encontrado</p>
			</div>
		)
	}

	return (
		<>
			<div className="rounded-lg border border-border bg-card overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Papel</TableHead>
							<TableHead>Descrição</TableHead>
							<TableHead className="text-center">Permissões</TableHead>
							<TableHead className="text-center">Tipo</TableHead>
							<TableHead className="text-right w-[100px]">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{roles.map((role) => {
							const RoleIcon = getRoleIcon(role.name, role.isSystem)
							const activePerms = countActivePermissions(role.permissions)

							return (
								<TableRow key={role.id}>
									<TableCell>
										<div className="flex items-center gap-2">
											<Badge
												variant="outline"
												className={`${getRoleColor(role.name, role.isSystem)} flex items-center gap-1`}
											>
												<RoleIcon className="w-3 h-3" />
												{role.displayName}
											</Badge>
										</div>
										<span className="text-xs text-muted-foreground ml-1">
											{role.name}
										</span>
									</TableCell>
									<TableCell className="text-muted-foreground max-w-[200px] truncate">
										{role.description || "-"}
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="secondary">
											{activePerms}/{TOTAL_PERMISSIONS}
										</Badge>
									</TableCell>
									<TableCell className="text-center">
										{role.isSystem ? (
											<Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
												<Lock className="w-3 h-3 mr-1" />
												Sistema
											</Badge>
										) : (
											<Badge variant="outline">
												Personalizado
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreHorizontal className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => onEdit(role)}>
													<Pencil className="w-4 h-4 mr-2" />
													{role.isSystem && role.name === "admin"
														? "Visualizar"
														: "Editar"}
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleDuplicate(role)}>
													<Copy className="w-4 h-4 mr-2" />
													Duplicar
												</DropdownMenuItem>
												{!role.isSystem && (
													<>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															onClick={() => setDeleteRole(role)}
															className="text-red-500 focus:text-red-500"
														>
															<Trash2 className="w-4 h-4 mr-2" />
															Excluir
														</DropdownMenuItem>
													</>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			{/* Dialog de confirmação de exclusão */}
			<AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir o papel{" "}
							<strong>{deleteRole?.displayName}</strong>?
							<br />
							<br />
							Esta ação não pode ser desfeita. Certifique-se de que nenhum usuário
							está usando este papel.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-red-500 hover:bg-red-600"
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
