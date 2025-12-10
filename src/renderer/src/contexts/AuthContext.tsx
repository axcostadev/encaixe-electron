import { createContext, ReactNode, useContext, useState } from "react"

interface User {
	id: number
	username: string
	email: string
}

interface AuthContextType {
	user: User | null
	login: (user: User) => void
	logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)

	const login = (loggedInUser: User) => {
		setUser(loggedInUser)
	}

	const logout = () => {
		setUser(null)
	}

	return (
		<AuthContext.Provider value={{ user, login, logout }}>
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
