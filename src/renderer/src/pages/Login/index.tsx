import { useState } from "react"
import { useEffect } from "react"

interface User {
	id: number
	username: string
	email: string
}

interface LoginProps {
	onLoginSuccess: (user: User) => void
}

export function Login({ onLoginSuccess }: LoginProps): React.JSX.Element {
	const [isLogin, setIsLogin] = useState(true)
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [email, setEmail] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")
		setLoading(true)

		try {
			const result = await window.api.auth.login(username, password)
			if (result.success && result.user) {
				onLoginSuccess(result.user)
			} else {
				setError(result.message)
			}
		} catch {
			setError("Erro ao conectar ao servidor")
		} finally {
			setLoading(false)
		}
	}

	// Windows auto-detect
	const [windowsUser, setWindowsUser] = useState<string | null>(null)
	const [canWindowsLogin, setCanWindowsLogin] = useState(false)

	useEffect(() => {
		let mounted = true
		;(async () => {
			try {
				const who = await window.api.auth.getWindowsUsername?.()
				if (!mounted) return
				if (who && who.success && who.username) {
					setWindowsUser(who.username)
					const found = await window.api.auth.findUser?.(who.username)
					if (found && found.success && found.user) {
						setCanWindowsLogin(true)
					}
				}
			} catch (err) {
				console.log(err)
				// ignore
			}
		})()
		return () => {
			mounted = false
		}
	}, [])

	const handleWindowsLogin = async () => {
		if (!windowsUser) return
		setLoading(true)
		try {
			const res = await window.api.auth.loginAsWindowsUser?.(windowsUser)
			if (!res) {
				setError("Login por usuário do Windows não disponível")
				return
			}
			if (res.success && res.user) {
				onLoginSuccess(res.user)
			} else {
				setError(res.message || "Erro no login do Windows")
			}
		} catch (err) {
			setError("Erro ao logar com usuário do Windows:" + String(err))
		} finally {
			setLoading(false)
		}
	}

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")
		setLoading(true)

		if (!username || !password || !email) {
			setError("Todos os campos são obrigatórios")
			setLoading(false)
			return
		}

		try {
			const result = await window.api.auth.register(username, password, email)
			if (result.success && result.user) {
				setError("")
				setUsername("")
				setPassword("")
				setEmail("")
				setIsLogin(true)
				setError("Usuário criado com sucesso! Faça login agora.")
			} else {
				setError(result.message)
			}
		} catch {
			setError("Erro ao criar usuário")
		} finally {
			setLoading(false)
		}
	}

	const isSuccess = error.includes("sucesso")

	return (
		<div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] font-sans">
			<div className="bg-white rounded-lg shadow-2xl p-10 w-full max-w-md">
				<h1 className="text-center text-gray-800 mb-8 text-3xl font-bold">
					{isLogin ? "Login" : "Registrar"}
				</h1>

				{error && (
					<div
						className={`p-3 mb-5 rounded-lg text-sm text-center font-medium border ${
							isSuccess
								? "bg-green-50 text-green-800 border-green-400"
								: "bg-red-50 text-red-800 border-red-400"
						}`}
					>
						{error}
					</div>
				)}

				<form onSubmit={isLogin ? handleLogin : handleRegister}>
					<div className="mb-5">
						<label
							htmlFor="username"
							className="block mb-2 text-gray-700 font-medium text-sm"
						>
							Usuário:
						</label>
						<input
							type="text"
							id="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							disabled={loading}
							required
							className="w-full px-3 py-3 border-2 border-gray-300 rounded-md text-sm transition-colors duration-300 focus:outline-none focus:border-[#667eea] disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
						/>
					</div>

					<div className="mb-5">
						<label
							htmlFor="password"
							className="block mb-2 text-gray-700 font-medium text-sm"
						>
							Senha:
						</label>
						<input
							type="password"
							id="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={loading}
							required
							className="w-full px-3 py-3 border-2 border-gray-300 rounded-md text-sm transition-colors duration-300 focus:outline-none focus:border-[#667eea] disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
						/>
					</div>

					{!isLogin && (
						<div className="mb-5">
							<label
								htmlFor="email"
								className="block mb-2 text-gray-700 font-medium text-sm"
							>
								Email:
							</label>
							<input
								type="email"
								id="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={loading}
								required
								className="w-full px-3 py-3 border-2 border-gray-300 rounded-md text-sm transition-colors duration-300 focus:outline-none focus:border-[#667eea] disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
							/>
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-md text-base font-semibold cursor-pointer transition-all duration-200 hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg active:enabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed mt-2.5"
					>
						{loading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
					</button>
				</form>

				{canWindowsLogin && windowsUser && (
					<div className="mt-4 text-center">
						<button
							onClick={handleWindowsLogin}
							disabled={loading}
							className="px-4 py-2 bg-gray-800 text-white rounded-md"
						>
							Entrar como {windowsUser}
						</button>
					</div>
				)}

				<div className="text-center mt-5 text-gray-600 text-sm">
					{isLogin ? (
						<>
							Não tem conta?{" "}
							<button
								onClick={() => setIsLogin(false)}
								className="bg-none border-none text-[#667eea] font-semibold cursor-pointer underline p-0 ml-1 hover:text-[#764ba2]"
							>
								Registre-se aqui
							</button>
						</>
					) : (
						<>
							Já tem conta?{" "}
							<button
								onClick={() => setIsLogin(true)}
								className="bg-none border-none text-[#667eea] font-semibold cursor-pointer underline p-0 ml-1 hover:text-[#764ba2]"
							>
								Faça login
							</button>
						</>
					)}
				</div>

				<div className="mt-5 pt-5 border-t border-gray-300 text-center text-gray-400 text-xs">
					<p className="m-0">Demo: admin / 123456</p>
				</div>
			</div>
		</div>
	)
}
