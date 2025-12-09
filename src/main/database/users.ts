import { getDatabase } from "./db"

interface User {
	id: number
	username: string
	email: string
}

export interface LoginResult {
	success: boolean
	message: string
	user?: {
		id: number
		username: string
		email: string
	}
}

export function authenticateUser(
	username: string,
	password: string,
): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.get(
				"SELECT id, username, email FROM users WHERE username = ? AND password = ?",
				[username, password],
				(err: Error | null, user: User | undefined) => {
					if (err) {
						resolve({
							success: false,
							message: "Erro ao conectar ao banco de dados",
						})
						return
					}

					if (user) {
						resolve({
							success: true,
							message: "Login bem-sucedido",
							user: {
								id: user.id,
								username: user.username,
								email: user.email,
							},
						})
					} else {
						resolve({
							success: false,
							message: "Usuário ou senha inválidos",
						})
					}
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao conectar ao banco de dados " + error?.toString(),
			})
		}
	})
}

export function createUser(
	username: string,
	password: string,
	email: string,
): Promise<LoginResult> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
				[username, password, email],
				function (err: Error | null) {
					if (err) {
						if (err.message.includes("UNIQUE constraint failed")) {
							resolve({
								success: false,
								message: "Usuário já existe",
							})
						} else {
							resolve({
								success: false,
								message: "Erro ao criar usuário",
							})
						}
						return
					}

					resolve({
						success: true,
						message: "Usuário criado com sucesso",
						user: {
							id: this.lastID as number,
							username,
							email,
						},
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao criar usuário" + error?.toString(),
			})
		}
	})
}