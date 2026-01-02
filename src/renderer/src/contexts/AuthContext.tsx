import { createContext, ReactNode, useContext, useState, useCallback } from "react"

export type UserRole = string // Agora suporta roles customizados

export interface UserPermissions {
	canViewDashboard: boolean
	canViewModelos: boolean
	canEditModelos: boolean
	canDeleteModelos: boolean
	canViewMateriais: boolean
	canEditMateriais: boolean
	canDeleteMateriais: boolean
	canViewComponentes: boolean
	canEditComponentes: boolean
	canDeleteComponentes: boolean
	canViewCores: boolean
	canEditCores: boolean
	canDeleteCores: boolean
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

export interface User {
	id: number
	username: string
	email: string
	role?: UserRole
	active?: boolean
	permissions?: UserPermissions
}

// Permissões padrão (fallback)
const DEFAULT_PERMISSIONS: UserPermissions = {
	canViewDashboard: false,
	canViewModelos: false,
	canEditModelos: false,
	canDeleteModelos: false,
	canViewMateriais: false,
	canEditMateriais: false,
	canDeleteMateriais: false,
	canViewComponentes: false,
	canEditComponentes: false,
	canDeleteComponentes: false,
	canViewCores: false,
	canEditCores: false,
	canDeleteCores: false,
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

// Permissões padrão por role (fallback para compatibilidade)
const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
	admin: {
		canViewDashboard: true,
		canViewModelos: true,
		canEditModelos: true,
		canDeleteModelos: true,
		canViewMateriais: true,
		canEditMateriais: true,
		canDeleteMateriais: true,
		canViewComponentes: true,
		canEditComponentes: true,
		canDeleteComponentes: true,
		canViewCores: true,
		canEditCores: true,
		canDeleteCores: true,
		canViewSetores: true,
		canEditSetores: true,
		canDeleteSetores: true,
		canViewEncaixe: true,
		canCreateEncaixe: true,
		canViewManual: true,
		canEditManual: true,
		canViewEconomia: true,
		canAccessSetup: true,
		canManageUsers: true,
		canManageRoles: true,
	},
	editor: {
		canViewDashboard: true,
		canViewModelos: true,
		canEditModelos: true,
		canDeleteModelos: false,
		canViewMateriais: true,
		canEditMateriais: true,
		canDeleteMateriais: false,
		canViewComponentes: true,
		canEditComponentes: true,
		canDeleteComponentes: false,
		canViewCores: true,
		canEditCores: true,
		canDeleteCores: false,
		canViewSetores: true,
		canEditSetores: false,
		canDeleteSetores: false,
		canViewEncaixe: true,
		canCreateEncaixe: false,
		canViewManual: true,
		canEditManual: true,
		canViewEconomia: true,
		canAccessSetup: false,
		canManageUsers: false,
		canManageRoles: false,
	},
	viewer: {
		canViewDashboard: false,
		canViewModelos: false,
		canEditModelos: false,
		canDeleteModelos: false,
		canViewMateriais: false,
		canEditMateriais: false,
		canDeleteMateriais: false,
		canViewComponentes: false,
		canEditComponentes: false,
		canDeleteComponentes: false,
		canViewCores: false,
		canEditCores: false,
		canDeleteCores: false,
		canViewSetores: false,
		canEditSetores: false,
		canDeleteSetores: false,
		canViewEncaixe: false,
		canCreateEncaixe: false,
		canViewManual: true,
		canEditManual: false,
		canViewEconomia: false,
		canAccessSetup: false,
		canManageUsers: false,
		canManageRoles: false,
	},
}

interface AuthContextType {
	user: User | null
	permissions: UserPermissions | null
	login: (user: User) => Promise<void>
	logout: () => void
	hasPermission: (permission: keyof UserPermissions) => boolean
	isAdmin: () => boolean
	isEditor: () => boolean
	isViewer: () => boolean
	refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [permissions, setPermissions] = useState<UserPermissions | null>(null)

	// Buscar permissões do banco de dados
	const fetchPermissions = useCallback(async (roleName: string): Promise<UserPermissions> => {
		try {
			const response = await window.api.users.getPermissions(roleName)
			if (response.success && response.permissions) {
				// Garantir que todas as permissões existam (fallback para novas permissões)
				return {
					...DEFAULT_PERMISSIONS,
					...response.permissions,
				}
			}
		} catch (error) {
			console.error("Erro ao buscar permissões:", error)
		}
		// Fallback para permissões padrão
		return ROLE_PERMISSIONS[roleName] || DEFAULT_PERMISSIONS
	}, [])

	const login = useCallback(async (loggedInUser: User) => {
		const role = loggedInUser.role || "viewer"
		
		// Usar permissões do usuário se já vieram, senão buscar do banco
		let userPermissions = loggedInUser.permissions
		if (!userPermissions) {
			userPermissions = await fetchPermissions(role)
		}
		
		setUser({ ...loggedInUser, role, permissions: userPermissions })
		setPermissions(userPermissions)
	}, [fetchPermissions])

	const logout = useCallback(() => {
		setUser(null)
		setPermissions(null)
	}, [])

	const refreshPermissions = useCallback(async () => {
		if (user?.role) {
			const newPermissions = await fetchPermissions(user.role)
			setPermissions(newPermissions)
			setUser(prev => prev ? { ...prev, permissions: newPermissions } : null)
		}
	}, [user?.role, fetchPermissions])

	const hasPermission = useCallback(
		(permission: keyof UserPermissions): boolean => {
			if (!permissions) return false
			return permissions[permission] === true
		},
		[permissions]
	)

	const isAdmin = useCallback(() => user?.role === "admin", [user])
	const isEditor = useCallback(() => user?.role === "editor", [user])
	const isViewer = useCallback(() => user?.role === "viewer", [user])

	return (
		<AuthContext.Provider
			value={{
				user,
				permissions,
				login,
				logout,
				hasPermission,
				isAdmin,
				isEditor,
				isViewer,
				refreshPermissions,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return context
}

// Hook helper para verificar permissões específicas
export function usePermission(permission: keyof UserPermissions): boolean {
	const { hasPermission } = useAuth()
	return hasPermission(permission)
}

// Exportar as permissões por role para uso em outros lugares
export { ROLE_PERMISSIONS }
