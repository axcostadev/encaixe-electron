import { useState, useEffect } from "react"
import { Box, User, Lock, Mail, Eye, EyeOff, Monitor, Loader2, ShieldCheck, Shield, EyeIcon } from "lucide-react"
import type { UserRole, User as UserType } from "@renderer/contexts/AuthContext"
import appLogo from "@renderer/assets/images/view-cutting-machine.png"

interface LoginProps {
	onLoginSuccess: (user: UserType) => void
}

export function Login({ onLoginSuccess }: LoginProps): React.JSX.Element {
	const [isLogin, setIsLogin] = useState(true)
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [email, setEmail] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	// Windows auto-detect
	const [windowsUser, setWindowsUser] = useState<string | null>(null)
	const [canWindowsLogin, setCanWindowsLogin] = useState(false)
	const [windowsUserRole, setWindowsUserRole] = useState<UserRole | null>(null)

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
						setWindowsUserRole(found.user.role || "viewer")
					}
				}
			} catch (err) {
				console.log(err)
			}
		})()
		return () => {
			mounted = false
		}
	}, [])

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setError("")
		setLoading(true)

		try {
			const result = await window.api.auth.login(username, password)
			if (result.success && result.user) {
				onLoginSuccess(result.user as UserType)
			} else {
				setError(result.message)
			}
		} catch {
			setError("Erro ao conectar ao servidor")
		} finally {
			setLoading(false)
		}
	}

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
				onLoginSuccess(res.user as UserType)
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

	const getRoleIcon = (role: UserRole) => {
		switch (role) {
			case "admin": return <ShieldCheck className="w-4 h-4" />
			case "editor": return <Shield className="w-4 h-4" />
			default: return <EyeIcon className="w-4 h-4" />
		}
	}

	const getRoleLabel = (role: UserRole) => {
		switch (role) {
			case "admin": return "Administrador"
			case "editor": return "Editor"
			default: return "Visualizador"
		}
	}

	return (
		<div className="flex min-h-screen">
			{/* Left Panel - Branding */}
			<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
				{/* Background Pattern */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
					<div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500 rounded-full blur-3xl" />
				</div>

				{/* Content */}
				<div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
					{/* Logo */}
					<div className="flex items-center gap-4 mb-12">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
							<Box className="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 className="text-3xl font-bold tracking-tight">ModelManager</h1>
							<p className="text-slate-400 text-sm">Sistema de Gestão de Modelos</p>
						</div>
					</div>

					{/* Features */}
					<div className="space-y-6 max-w-md">
						<div className="flex items-start gap-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h3 className="font-semibold mb-1">Gestão Completa</h3>
								<p className="text-slate-400 text-sm">Gerencie modelos, materiais, componentes e cores em um só lugar.</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
							</div>
							<div>
								<h3 className="font-semibold mb-1">Encaixe Automático</h3>
								<p className="text-slate-400 text-sm">Gere arquivos de encaixe para Comelz, Emma e Lectra automaticamente.</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
							</div>
							<div>
								<h3 className="font-semibold mb-1">Controle de Acesso</h3>
								<p className="text-slate-400 text-sm">Sistema de permissões com diferentes níveis de acesso por usuário.</p>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="absolute bottom-8 left-0 right-0 text-center text-slate-500 text-sm">
						© 2025 Aincrad. Todos os direitos reservados. Desenvolvido por Axcostadev & Alysondev.
					</div>
				</div>
			</div>

			{/* Right Panel - Login Form */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950">
				<div className="w-full max-w-md">
					{/* Mobile Logo */}
					<div className="lg:hidden flex items-center justify-center gap-3 mb-8">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
							<Box className="h-6 w-6 text-white" />
						</div>
						<span className="text-xl font-bold text-white">ModelManager</span>
					</div>

					{/* Logo */}
					<div className="flex justify-center mb-6">
						<img src={appLogo} alt="Logo" className="h-16 object-contain" />
					</div>

					{/* Header */}
					<div className="text-center mb-8">
						<h2 className="text-2xl font-bold text-white mb-2">
							{isLogin ? "Bem-vindo de volta!" : "Criar nova conta"}
						</h2>
						<p className="text-slate-400">
							{isLogin
								? "Entre com suas credenciais para acessar o sistema"
								: "Preencha os dados abaixo para se registrar"}
						</p>
					</div>

					{/* Error Message */}
					{error && (
						<div
							className={`flex items-center gap-3 p-4 mb-6 rounded-lg text-sm border ${
								isSuccess
									? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
									: "bg-red-500/10 text-red-400 border-red-500/30"
							}`}
						>
							<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{isSuccess ? (
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								) : (
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								)}
							</svg>
							<span>{error}</span>
						</div>
					)}

					{/* Windows Login Button */}
					{canWindowsLogin && windowsUser && isLogin && (
						<div className="mb-6">
							<button
								onClick={handleWindowsLogin}
								disabled={loading}
								className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Monitor className="w-5 h-5 text-blue-400" />
								<span className="font-medium">Entrar como</span>
								<span className="text-blue-400 font-semibold">{windowsUser}</span>
								{windowsUserRole && (
									<span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-300">
										{getRoleIcon(windowsUserRole)}
										{getRoleLabel(windowsUserRole)}
									</span>
								)}
							</button>
							<div className="relative my-6">
								<div className="absolute inset-0 flex items-center">
									<div className="w-full border-t border-slate-700" />
								</div>
								<div className="relative flex justify-center text-sm">
									<span className="px-4 bg-slate-950 text-slate-500">ou entre com usuário e senha</span>
								</div>
							</div>
						</div>
					)}

					{/* Login Form */}
					<form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
						{/* Username */}
						<div>
							<label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
								Usuário
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<User className="h-5 w-5 text-slate-500" />
								</div>
								<input
									type="text"
									id="username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									disabled={loading}
									required
									placeholder="Digite seu usuário"
									className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								/>
							</div>
						</div>

						{/* Password */}
						<div>
							<label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
								Senha
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-slate-500" />
								</div>
								<input
									type={showPassword ? "text" : "password"}
									id="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									disabled={loading}
									required
									placeholder="Digite sua senha"
									className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
								>
									{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
								</button>
							</div>
						</div>

						{/* Email (Register only) */}
						{!isLogin && (
							<div>
								<label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
									Email
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Mail className="h-5 w-5 text-slate-500" />
									</div>
									<input
										type="email"
										id="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										disabled={loading}
										required
										placeholder="email@exemplo.com"
										className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									/>
								</div>
							</div>
						)}

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									<span>Carregando...</span>
								</>
							) : (
								<span>{isLogin ? "Entrar" : "Criar Conta"}</span>
							)}
						</button>
					</form>

					{/* Toggle Login/Register */}
					<div className="text-center mt-6 text-slate-400 text-sm">
						{isLogin ? (
							<>
								Não tem conta?{" "}
								<button
									onClick={() => {
										setIsLogin(false)
										setError("")
									}}
									className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
								>
									Registre-se aqui
								</button>
							</>
						) : (
							<>
								Já tem conta?{" "}
								<button
									onClick={() => {
										setIsLogin(true)
										setError("")
									}}
									className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
								>
									Faça login
								</button>
							</>
						)}
					</div>


				</div>
			</div>
		</div>
	)
}
