import { dialog, ipcMain } from "electron"
import os from "os"
import fs from "fs"
import {
	authenticateUser,
	resetAdminPassword,
	getUserByUsername,
	closeDatabase,
	createUser,
	updateUser,
	deleteUser,
	listUsers,
	initDatabase,
	ROLE_PERMISSIONS,
	listModelos,
	createModelo,
	updateModelo,
	deleteModelo,
	listModeloCores,
	addModeloCor,
	deleteModeloCor,
	listMateriais,
	createMaterial,
	updateMaterial,
	deleteMaterial,
	listComponentes,
	addComponente,
	updateComponente,
	deleteComponente,
	getCadastroByArtigo,
			hasColumnRedutorLargura,
			addRedutorLarguraColumn,
	listSetores,
	createSetor,
	updateSetor,
	deleteSetor,
	// Roles
	listRoles,
	getRoleById,
	getRoleByName,
	createRole,
	updateRole,
	deleteRole,
	getPermissionsByRoleName,
	duplicateRole,
} from "../database"
import type { ComponenteDados, CadastroInfo, UserPermissions } from "../database"
import * as parser from "../modules/arquivoParser.js"
import * as db from "../modules/db.js"
import * as gerenciadorApelidos from "../modules/gerenciadorApelidos.js"
import * as abreviacaoManager from "../modules/abreviacaoManager.js"
import * as exportadorComelz from "../modules/exportadorComelz.js"
import * as exportadorEmma from "../modules/exportadorEmma.js"
import * as exportadorLectra from "../modules/exportadorLectra.js"
import * as conversorComelz from "../modules/conversorComelz.js"
import * as conversorEmma from "../modules/conversorEmma.js"
import * as conversorLectra from "../modules/conversorLectra.js"
import * as cgcParser from "../modules/cgcParser.js"
import { getSettings, setSettings, getCtcReportFile, getCtfReportFile } from "../settings"
import {
	activateLicense,
	getFingerprint,
	getLicenseStatus,
	initLicense,
	requireLicense,
} from "../license"

// Type definitions
interface LinhaCTF {
	artigo: string
	modelo: string
	codigoCor: string
	grade: string
	pares: number
	of: string
}

interface LinhaCTC {
	of: string
	artigo: string
	modelo: string
	codigoCor: string
	grade: string
	pares: number
	especificacaoTecnica: string
	prioridade: string
}

interface DadosCTF {
	of: string
	linhas: LinhaCTF[]
}

interface DadosCTC {
	of: string
	linhas: LinhaCTC[]
}

interface QtyRuleComelz {
	part_name?: string
	part_size?: string
	fitting?: string
	mirror?: boolean
	parts?: number
	material?: string
	items?: number
	extra?: string
}

interface PedidoComelz {
	id?: string
	date?: string
	note?: string
	customer?: string
	split_materials?: boolean
	model: string
	qty: QtyRuleComelz[]
}

interface QtyEmma {
	part_name: string
	part_size: string
	mirror: boolean
	parts: number
	angle: number
	toler: number
	material_name: string
	material_x: number
	material_y: number
	material_unit: string
	part_space: number
	material_plies_up: number
	material_plies_down: number
	material_margin: number
}

interface PedidoEmma {
	customer: string
	date: string
	id: string
	model: string
	qty: QtyEmma[]
}

interface ModelDataLectra {
	codigo: string
	tamanho: string | number
	a: number
	b: number
	c: number
	d: number
}

interface CadastroObj {
	artigo?: string
	modelo?: string
	componente?: string
	material?: string
	cor?: string
	largura?: string
	tipoTecido?: string
	paresCriac?: string
	conjugNavalha?: string
	placaPorPar?: string
	camada?: string
	espacamento?: string
	comprimentoMax?: string
}

interface SaveDialogOptions {
	title?: string
	defaultPath?: string
	filters?: Array<{ name: string; extensions: string[] }>
}

interface BuscarOFResult {
	artigo: string
	modelo: string
	codigoCor: string
	grade: string
	pares: number
}

interface ConversorOptions {
	artigo?: string
	componente?: string
	[key: string]: unknown // For additional options
}

type SentidoType = "S" | "N" | "U"

export function setupIPC(): void {
	// Inicializar banco de dados
	initDatabase()

	// Inicializar sistema de licença (validação offline)
	initLicense()

	const ensureLicensed = (feature?: string) => {
		const status = requireLicense(feature)
		if (!status.valid) {
			return {
				success: false,
				code: status.code,
				message: status.message || "Licença requerida",
			}
		}
		return null
	}

	// IPC de licença (status, ativação e fingerprint)
	ipcMain.handle("license:status", async () => {
		return getLicenseStatus()
	})

	ipcMain.handle("license:activate", async (_event, token: string) => {
		return activateLicense(token)
	})

	ipcMain.handle("license:fingerprint", async () => {
		return getFingerprint()
	})

	// Inicializar banco de dados do electron-app e garantir headers
	db.initDB()
		.then(() => db.ensureEconomiaHeaders && db.ensureEconomiaHeaders())
		.catch((err) => console.error('Erro inicializando DB (initDB):', err))

	// Inicializar gerenciador de apelidos (cria tabela no DB se necessário)
	gerenciadorApelidos
		.init()
		.catch((err) =>
			console.error("Erro inicializando gerenciadorApelidos:", err),
		)

	// IPC para login
	ipcMain.handle(
		"auth:login",
		async (_event, username: string, password: string) => {
			return await authenticateUser(username, password)
		},
	)

	// Retornar usuário do SO (nome de usuário)
	ipcMain.handle("auth:whoami", async () => {
		try {
			const info = os.userInfo()
			return { success: true, username: info.username }
		} catch (err) {
			return { success: false, message: String(err) }
		}
	})

	// Verificar se usuário existe no banco por username
	ipcMain.handle("auth:find-user", async (_event, username: string) => {
		try {
			return await getUserByUsername(username)
		} catch (err) {
			return { success: false, message: String(err) }
		}
	})

	// Login por username (sem senha) — usado para autenticação via usuário do Windows
	ipcMain.handle("auth:login-windows", async (_event, username: string) => {
		try {
			const res = await getUserByUsername(username)
			if (res.success && res.user) {
				return {
					success: true,
					message: "Login por usuário do Windows bem-sucedido",
					user: res.user,
				}
			}
			return { success: false, message: "Usuário não encontrado" }
		} catch (err) {
			return { success: false, message: String(err) }
		}
	})

	// IPC para resetar senha do admin (uso de diagnóstico/recuperação)
	ipcMain.handle("auth:reset-admin", async (_event, password: string) => {
		try {
			return await resetAdminPassword(password)
		} catch (err) {
			console.error("Erro no auth:reset-admin:", err)
			return { success: false, message: String(err) }
		}
	})

	// IPC para registrar novo usuário
	ipcMain.handle(
		"auth:register",
		async (_event, username: string, password: string, email: string) => {
			return await createUser(username, password, email)
		},
	)

	// ============================================
	// GERENCIAMENTO DE USUÁRIOS (SETUP)
	// ============================================

	// Listar todos os usuários
	ipcMain.handle("users:list", async () => {
		const guard = ensureLicensed("usuarios")
		if (guard) return guard
		return await listUsers()
	})

	// Criar novo usuário com role
	ipcMain.handle(
		"users:create",
		async (
			_event,
			username: string,
			password: string,
			email: string,
			role: string,
		) => {
			const guard = ensureLicensed("usuarios")
			if (guard) return guard
			return await createUser(username, password, email, role as "admin" | "editor" | "viewer")
		},
	)

	// Atualizar usuário
	ipcMain.handle(
		"users:update",
		async (
			_event,
			id: number,
			data: {
				username?: string
				email?: string
				password?: string
				role?: string
				active?: boolean
			},
		) => {
			const guard = ensureLicensed("usuarios")
			if (guard) return guard
			return await updateUser(id, {
				username: data.username,
				email: data.email,
				password: data.password,
				role: data.role as "admin" | "editor" | "viewer" | undefined,
				active: data.active !== undefined ? (data.active ? 1 : 0) : undefined,
			})
		},
	)

	// Deletar usuário
	ipcMain.handle("users:delete", async (_event, id: number) => {
		const guard = ensureLicensed("usuarios")
		if (guard) return guard
		return await deleteUser(id)
	})

	// Obter permissões por role
	ipcMain.handle("users:get-permissions", async (_event, role: string) => {
		const guard = ensureLicensed("usuarios")
		if (guard) return guard
		// Primeiro tenta buscar do banco (roles customizados)
		const result = await getPermissionsByRoleName(role)
		if (result.success && result.permissions) {
			return { success: true, permissions: result.permissions }
		}
		// Fallback para roles padrão
		const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
		if (permissions) {
			return { success: true, permissions }
		}
		return { success: false, message: "Role não encontrada" }
	})

	// ===== ROLES (Papéis de Permissão) =====
	
	// Listar todos os roles
	ipcMain.handle("roles:list", async () => {
		const guard = ensureLicensed("roles")
		if (guard) return guard
		return await listRoles()
	})

	// Buscar role por ID
	ipcMain.handle("roles:get", async (_event, id: number) => {
		const guard = ensureLicensed("roles")
		if (guard) return guard
		return await getRoleById(id)
	})

	// Buscar role por nome
	ipcMain.handle("roles:get-by-name", async (_event, name: string) => {
		const guard = ensureLicensed("roles")
		if (guard) return guard
		return await getRoleByName(name)
	})

	// Criar novo role
	ipcMain.handle(
		"roles:create",
		async (
			_event,
			name: string,
			displayName: string,
			description: string,
			permissions: UserPermissions
		) => {
			const guard = ensureLicensed("roles")
			if (guard) return guard
			return await createRole(name, displayName, description, permissions)
		}
	)

	// Atualizar role
	ipcMain.handle(
		"roles:update",
		async (
			_event,
			id: number,
			data: {
				displayName?: string
				description?: string
				permissions?: UserPermissions
			}
		) => {
			const guard = ensureLicensed("roles")
			if (guard) return guard
			return await updateRole(id, data)
		}
	)

	// Deletar role
	ipcMain.handle("roles:delete", async (_event, id: number) => {
		const guard = ensureLicensed("roles")
		if (guard) return guard
		return await deleteRole(id)
	})

	// Duplicar role
	ipcMain.handle(
		"roles:duplicate",
		async (_event, sourceId: number, newName: string, newDisplayName: string) => {
			const guard = ensureLicensed("roles")
			if (guard) return guard
			return await duplicateRole(sourceId, newName, newDisplayName)
		}
	)

	// IPC para fechar banco de dados
	ipcMain.handle("app:close", async () => {
		closeDatabase()
	})

	// Modelos
	ipcMain.handle("modelos:list", async () => {
		const guard = ensureLicensed("modelos")
		if (guard) return guard
		return await listModelos()
	})

	ipcMain.handle(
		"modelos:create",
		async (_event, artigo: string, nome: string) => {
			const guard = ensureLicensed("modelos")
			if (guard) return guard
			return await createModelo(artigo, nome)
		},
	)

	ipcMain.handle(
		"modelos:update",
		async (_event, id: number, artigo: string, nome: string) => {
			const guard = ensureLicensed("modelos")
			if (guard) return guard
			return await updateModelo(id, artigo, nome)
		},
	)

	ipcMain.handle("modelos:delete", async (_event, id: number) => {
		const guard = ensureLicensed("modelos")
		if (guard) return guard
		return await deleteModelo(id)
	})

	// Cores do modelo
	ipcMain.handle("modelos:cores:list", async (_event, modelo_id: number) => {
		const guard = ensureLicensed("cores")
		if (guard) return guard
		return await listModeloCores(modelo_id)
	})

	// Componentes do modelo
	ipcMain.handle("componentes:list", async (_event, modelo_id: number) => {
		const guard = ensureLicensed("componentes")
		if (guard) return guard
		return await listComponentes(modelo_id)
	})

	ipcMain.handle(
		"componentes:create",
		async (
			_event,
			modelo_id: number,
			nome: string,
			dados: ComponenteDados | null,
			tamanhos: { tamanhoInicial: number; tamanhoFinal: number }[],
		) => {
			const guard = ensureLicensed("componentes")
			if (guard) return guard
			return await addComponente(modelo_id, nome, dados, tamanhos)
		},
	)

	ipcMain.handle(
		"componentes:update",
		async (
			_event,
			modelo_id: number,
			componente_id: number,
			nome: string,
			dados: ComponenteDados | null,
			tamanhos: { tamanhoInicial: number; tamanhoFinal: number }[],
		) => {
			const guard = ensureLicensed("componentes")
			if (guard) return guard
			console.log('[IPC] componentes:update called', { modelo_id, componente_id, nome, dados, tamanhos })
			return await updateComponente(
				modelo_id,
				componente_id,
				nome,
				dados,
				tamanhos,
			)
		},
	)

	ipcMain.handle(
		"componentes:delete",
		async (_event, modelo_id: number, componente_id: number) => {
			const guard = ensureLicensed("componentes")
			if (guard) return guard
			return await deleteComponente(modelo_id, componente_id)
		},
	)

	ipcMain.handle(
		"modelos:cores:add",
		async (_event, modelo_id: number, abreviada: string, completa: string) => {
			const guard = ensureLicensed("cores")
			if (guard) return guard
			return await addModeloCor(modelo_id, abreviada, completa)
		},
	)

	ipcMain.handle("modelos:cores:delete", async (_event, id: number) => {
		const guard = ensureLicensed("cores")
		if (guard) return guard
		return await deleteModeloCor(id)
	})

	// Materiais
	ipcMain.handle("materiais:list", async () => {
		const guard = ensureLicensed("materiais")
		if (guard) return guard
		return await listMateriais()
	})

	ipcMain.handle(
		"materiais:create",
		async (
			_event,
			artigo: string,
			largura: number,
			obs: string | undefined,
			sentido: SentidoType,
		) => {
			const guard = ensureLicensed("materiais")
			if (guard) return guard
			console.log("Creating material:", { artigo, largura, obs, sentido })
			const result = await createMaterial(artigo, largura, obs, sentido)
			console.log("Create result:", result)
			return result
		},
	)

	ipcMain.handle(
		"materiais:update",
		async (
			_event,
			id: number,
			artigo: string,
			largura: number,
			obs: string | undefined,
			sentido: SentidoType,
		) => {
			const guard = ensureLicensed("materiais")
			if (guard) return guard
			return await updateMaterial(id, artigo, largura, obs, sentido)
		},
	)

	ipcMain.handle("materiais:delete", async (_event, id: number) => {
		const guard = ensureLicensed("materiais")
		if (guard) return guard
		return await deleteMaterial(id)
	})

	// ==================== SETORES ====================

	ipcMain.handle("setores:list", async () => {
		const guard = ensureLicensed("setores")
		if (guard) return guard
		return await listSetores()
	})

	ipcMain.handle("setores:create", async (_event, nome: string) => {
		const guard = ensureLicensed("setores")
		if (guard) return guard
		return await createSetor(nome)
	})

	ipcMain.handle("setores:update", async (_event, id: number, nome: string) => {
		const guard = ensureLicensed("setores")
		if (guard) return guard
		return await updateSetor(id, nome)
	})

	ipcMain.handle("setores:delete", async (_event, id: number) => {
		const guard = ensureLicensed("setores")
		if (guard) return guard
		return await deleteSetor(id)
	})

	// ==================== HANDLERS DO ELECTRON-APP ====================

	// File selection
	ipcMain.handle("select-file", async () => {
		const guard = ensureLicensed("arquivos")
		if (guard) return guard
		const result = await dialog.showOpenDialog({
			properties: ["openFile"],
			filters: [
				{ name: "Text", extensions: ["txt", "ctf", "ctc", "log"] },
				{ name: "All", extensions: ["*"] },
			],
		})
		if (result.canceled) return null
		return result.filePaths[0]
	})

	// Directory selection
	ipcMain.handle("select-directory", async () => {
		const guard = ensureLicensed("arquivos")
		if (guard) return guard
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory", "createDirectory"],
			title: "Selecione a pasta de destino",
		})
		if (result.canceled) return null
		return result.filePaths[0]
	})

	// Parse handlers
	ipcMain.handle("parse-ctf", async (_event, filePath: string) => {
		const guard = ensureLicensed("conversor")
		if (guard) return guard
		return await parser.parseCTF(filePath)
	})

	ipcMain.handle("parse-ctc", async (_event, filePath: string) => {
		const guard = ensureLicensed("conversor")
		if (guard) return guard
		return await parser.parseCTC(filePath)
	})

	// Database handlers
	ipcMain.handle("save-ctf", async (_event, lines: DadosCTF[]) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.saveCTFLines(lines)
	})

	// Settings handlers
	ipcMain.handle("settings:get", async () => {
		const guard = ensureLicensed("settings")
		if (guard) return guard
		try {
			return { success: true, settings: getSettings() }
		} catch (err) {
			return { success: false, message: String(err) }
		}
	})

	ipcMain.handle("settings:set", async (_event, updates: Record<string, any>) => {
		const guard = ensureLicensed("settings")
		if (guard) return guard
		try {
			const oldSettings = getSettings()
			const res = setSettings(updates)
			// If dbFile mudou, reinicializa o DB para aplicar o novo caminho
			if (oldSettings.dbFile !== res.dbFile) {
				let economiaReinitResult: any = { success: true }
				// Primeiro reinicializa o DB da economia (módulo separado)
				try {
					if (db && typeof db.reinitDB === 'function') {
						economiaReinitResult = await db.reinitDB(res.dbFile)
						if (!economiaReinitResult || !economiaReinitResult.success) {
							console.error('Erro na reinit da economia DB:', economiaReinitResult?.message)
						}
					}
				} catch (e) {
					console.error('Erro reinicializando economia DB após alteração de settings:', e)
					economiaReinitResult = { success: false, message: String(e) }
				}

				// Depois reinicializa o DB principal
				try {
					closeDatabase()
					initDatabase()
				} catch (e) {
					console.error('Erro reinicializando DB após alteração de settings (main DB):', e)
				}

				// incluir resultado da reinit da economia no retorno
				return { success: true, settings: res, economiaReinit: economiaReinitResult }
			}
			return { success: true, settings: res }
		} catch (err) {
			return { success: false, message: String(err) }
		}
	})

// Retorna o estado atual das settings e o caminho do DB da economia (útil para a UI)
ipcMain.handle("settings:get-status", async () => {
	try {
		const guard = ensureLicensed("settings")
		if (guard) return guard
		const settings = getSettings()
		let economiaDb = null
		try {
			if (db && typeof db.getCurrentDbFile === 'function') {
				economiaDb = db.getCurrentDbFile()
			} else {
				economiaDb = process.env.ECONOMIA_DB_FILE || settings.dbFile || null
			}
		} catch (err) {
			console.error('Erro obtendo caminho economia DB:', err)
		}
		return { success: true, settings, economiaDb }
	} catch (err) {
		return { success: false, message: String(err) }
	}
	})

	ipcMain.handle("save-ctc", async (_event, lines: DadosCTC[]) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.saveCTCLines(lines)
	})

	ipcMain.handle("query-lines", async () => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.getAllLines()
	})

	ipcMain.handle("query-lines-by-of", async (_event, of: string) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.getLinesByOf(of)
	})

	ipcMain.handle("clear-lines", async () => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.clearLines()
	})

	// Buscar OF nos arquivos CTF/CTC
	ipcMain.handle("buscar-of", async (_event, ofBuscada: string) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		const fs = await import("fs")
		const readline = await import("readline")
		const resultado: BuscarOFResult[] = []

		// Caminhos configuráveis via settings
		const caminhos = [
			getCtcReportFile(),
			getCtfReportFile(),
		]

		const padraoOF = /PAR\s*(\d{9})\/\d/i
		const padraoArtigo = /(?:CORTE|COR)\s*(\d{7,9})/i
		const padraoPares = /N\s*([\d.]+,[\d]{3})/

		for (const caminho of caminhos) {
			if (!fs.existsSync(caminho)) continue

			const fileStream = fs.createReadStream(caminho, { encoding: "latin1" })
			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity,
			})

			for await (const linha of rl) {
				const mOF = padraoOF.exec(linha)
				if (!mOF) continue

				const ofLinha = mOF[1]
				if (ofLinha !== ofBuscada) continue

				let artigo = ""
				const mArtigo = padraoArtigo.exec(linha)
				if (mArtigo) artigo = mArtigo[1]

				let codigoCor = ""
				let grade = ""
				let modelo = ""

				if (linha.length >= 62) {
					// Extrair código de cor a partir da coluna 56 (1-based) -> índice 55 (0-based)
					// Pegar 6 caracteres: substring(55, 61)
					codigoCor = linha.substring(55, 55 + 6).trim()
					// Grade continua após (índice 61..63)
					grade = linha.substring(61, 64).trim()
					modelo = linha.substring(73, 82).trim()
				}

				let pares = 0
				const mPares = padraoPares.exec(linha)
				if (mPares) {
					const paresStr = mPares[1]
					const partesPares = paresStr.split(",")
					try {
						pares = parseInt(partesPares[0].replace(/\./g, ""))
					} catch {
						pares = 0
					}
				}

				if (grade && pares > 0) {
					resultado.push({ artigo, modelo, codigoCor, grade, pares })
				}
			}
		}

		return resultado
	})

	// Apelidos handlers
	ipcMain.handle("apelidos-get-all", async () => {
		const guard = ensureLicensed("apelidos")
		if (guard) return guard
		return await gerenciadorApelidos.getAllApelidos()
	})

	ipcMain.handle("apelidos-get", async (_event, componente: string) => {
		const guard = ensureLicensed("apelidos")
		if (guard) return guard
		return await gerenciadorApelidos.getApelido(componente)
	})

	ipcMain.handle(
		"apelidos-save",
		async (_event, componente: string, apelido: string) => {
			const guard = ensureLicensed("apelidos")
			if (guard) return guard
			return await gerenciadorApelidos.saveApelido(componente, apelido)
		},
	)

	ipcMain.handle("apelidos-remove", async (_event, componente: string) => {
		const guard = ensureLicensed("apelidos")
		if (guard) return guard
		return await gerenciadorApelidos.removeApelido(componente)
	})

	// Abreviacoes handlers
	ipcMain.handle("abreviacoes-get-all", async () => {
		const guard = ensureLicensed("abreviacoes")
		if (guard) return guard
		return await abreviacaoManager.getAllAbreviacoes()
	})

	ipcMain.handle(
		"abreviacoes-save",
		async (_event, componente: string, abrev: string) => {
			const guard = ensureLicensed("abreviacoes")
			if (guard) return guard
			return await abreviacaoManager.saveAbreviacao(componente, abrev)
		},
	)

	ipcMain.handle("abreviacoes-remove", async (_event, componente: string) => {
		const guard = ensureLicensed("abreviacoes")
		if (guard) return guard
		return await abreviacaoManager.removeAbreviacao(componente)
	})

	// Export handlers
	ipcMain.handle(
		"show-save-dialog",
		async (_event, opts: SaveDialogOptions) => {
			const guard = ensureLicensed("exportacao")
			if (guard) return guard
			const res = await dialog.showSaveDialog({
				title: opts?.title || "Salvar arquivo",
				defaultPath: opts?.defaultPath || undefined,
				filters: opts?.filters || [],
			})
			if (res.canceled) return null
			return res.filePath
		},
	)

	ipcMain.handle(
		"export-comelz",
		async (_event, pedidoObj: PedidoComelz, caminho: string) => {
			const guard = ensureLicensed("exportacao")
			if (guard) return guard
			return await exportadorComelz.exportar(pedidoObj, caminho)
		},
	)

	ipcMain.handle(
		"export-emma",
		async (_event, pedidoObj: PedidoEmma, caminho: string) => {
			const guard = ensureLicensed("exportacao")
			if (guard) return guard
			return await exportadorEmma.exportar(pedidoObj, caminho)
		},
	)

	ipcMain.handle(
		"export-lectra",
		async (
			_event,
			modelos: ModelDataLectra[],
			caminho: string,
			markerName: string,
			options?: { espacamento?: number; sentidoMaterial?: string; largura?: number; fabric_type?: number },
		) => {
			const guard = ensureLicensed("exportacao")
			if (guard) return guard
			return await exportadorLectra.exportarMkx(modelos, caminho, markerName, options || {})
		},
	)

	// Conversor handlers
	ipcMain.handle(
		"conversor-comelz",
		async (
			_event,
			parsedCTF: DadosCTF,
			parsedCTC: DadosCTC,
			options: ConversorOptions,
		) => {
			const guard = ensureLicensed("conversor")
			if (guard) return guard
			let cadastro: CadastroInfo[] | CadastroInfo | null = null
			try {
				if (options && options.artigo) {
					cadastro = options.componente
						? await db.findCadastro(options.artigo, options.componente)
						: await db.getCadastroByArtigo(options.artigo)
				}
			} catch (err) {
				console.error("Erro buscando cadastro para conversor Comelz:", err)
			}
			return conversorComelz.converterParaQtyRules(
				parsedCTF,
				parsedCTC,
				cadastro || options,
			)
		},
	)

	ipcMain.handle(
		"conversor-emma",
		async (
			_event,
			parsedCTF: DadosCTF,
			parsedCTC: DadosCTC,
			options: ConversorOptions,
		) => {
			const guard = ensureLicensed("conversor")
			if (guard) return guard
			let cadastro: CadastroInfo[] | CadastroInfo | null = null
			try {
				if (options && options.artigo) {
					cadastro = options.componente
						? await db.findCadastro(options.artigo, options.componente)
						: await db.getCadastroByArtigo(options.artigo)
				}
			} catch (err) {
				console.error("Erro buscando cadastro para conversor Emma:", err)
			}
			// Se cadastro for array, pega o primeiro item
			const cadastroObj = Array.isArray(cadastro) ? cadastro[0] : cadastro
			// Passa o componente nas options para o conversor usar como part_name
			const emmaOptions = {
				componente: options?.componente || cadastroObj?.componente || "",
			}
			console.log(
				"[IPC] conversor-emma options.componente:",
				options?.componente,
			)
			console.log(
				"[IPC] conversor-emma cadastroObj?.componente:",
				cadastroObj?.componente,
			)
			console.log("[IPC] conversor-emma emmaOptions:", emmaOptions)
			return conversorEmma.converterParaQtyEmma(
				parsedCTF,
				parsedCTC,
				cadastroObj || options,
				emmaOptions,
			)
		},
	)

	ipcMain.handle(
		"conversor-lectra",
		async (
			_event,
			parsedCTF: DadosCTF,
			parsedCTC: DadosCTC,
			options: ConversorOptions,
		) => {
			const guard = ensureLicensed("conversor")
			if (guard) return guard
			let cadastro: CadastroInfo[] | CadastroInfo | null = null
			try {
				if (options && options.artigo) {
					cadastro = options.componente
						? await db.findCadastro(options.artigo, options.componente)
						: await db.getCadastroByArtigo(options.artigo)
				}
			} catch (err) {
				console.error("Erro buscando cadastro para conversor Lectra:", err)
			}
			return conversorLectra.converterParaModelData(
				parsedCTF,
				parsedCTC,
				cadastro || options,
			)
		},
	)

	// Cadastro handlers
	ipcMain.handle("cadastro-open-file", async () => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		const res = await dialog.showOpenDialog({
			title: "Carregar Cadastro",
			properties: ["openFile"],
			filters: [{ name: "Text", extensions: ["txt"] }],
		})
		if (res.canceled) return null
		return res.filePaths[0]
	})

	ipcMain.handle("cadastro-save", async (_event, cadastroObj: CadastroObj) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.saveCadastro(cadastroObj)
	})

	ipcMain.handle("cadastro-get-by-artigo", async (_event, artigo: string) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		console.log("[IPC] cadastro-get-by-artigo called:", artigo)
		const result = await getCadastroByArtigo(artigo)
		console.log(
			"[IPC] cadastro-get-by-artigo result:",
			result.length > 0 ? result.length + " items" : false,
		)
		return result.length > 0 ? result : false
	})

	ipcMain.handle(
		"cadastro-find",
		async (_event, artigo: string, componente: string) => {
			const guard = ensureLicensed("cadastro")
			if (guard) return guard
			return await db.findCadastro(artigo, componente)
		},
	)

	ipcMain.handle("cadastro-list", async (_event, limit: number) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.listCadastros(limit || 100)
	})

	ipcMain.handle("cadastro-delete", async (_event, id: number) => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		return await db.deleteCadastroById(id)
	})

	// Migrations: check if redutor_largura exists and add it when requested
	ipcMain.handle("migrations:check-redutor-largura", async () => {
		const guard = ensureLicensed("migrations")
		if (guard) return guard
		try {
			return await hasColumnRedutorLargura()
		} catch (err) {
			console.error('[IPC] migrations:check-redutor-largura error:', err)
			return false
		}
	})

	ipcMain.handle("migrations:add-redutor-largura", async () => {
		const guard = ensureLicensed("migrations")
		if (guard) return guard
		try {
			return await addRedutorLarguraColumn()
		} catch (err) {
			console.error('[IPC] migrations:add-redutor-largura error:', err)
			return { success: false, message: (err as any)?.message || String(err) }
		}
	})

	ipcMain.handle("cadastro-import-folder", async () => {
		const guard = ensureLicensed("cadastro")
		if (guard) return guard
		// Implementar importação em lote se necessário
		return { imported: 0 }
	})

	// ==================== Economia IPC handlers ====================

	ipcMain.handle("economia-import-file", async (_event, filePath?: string) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			const xlsx = await import("xlsx")
			let pathToRead = filePath
			if (!pathToRead) {
				const res = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }] })
				if (res.canceled) return { imported: 0 }
				pathToRead = res.filePaths[0]
			}

			const wb = xlsx.readFile(pathToRead)
			const sheet = wb.SheetNames[0]
			const data = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { defval: null })
			if (!data || data.length === 0) return { imported: 0 }
			const result = await db.saveEconomiaRows(data)
			return result
		} catch (err) {
			console.error('[IPC] economia-import-file error:', err)
			return { imported: 0, error: (err as any)?.message || String(err) }
		}
	})

	ipcMain.handle("economia-list", async (_event, limit: number = 500) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		return await db.listEconomia(limit)
	})

	ipcMain.handle("economia-clear", async () => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		return await db.clearEconomia()
	})

	ipcMain.handle("economia-summary", async () => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		return await db.getEconomiaSummary()
	})

	ipcMain.handle("economia-by-modelo", async (_event, limit: number = 10) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		return await db.getEconomiaByModelo(limit)
	})

	ipcMain.handle("economia-by-material", async (_event, limit: number = 10) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		return await db.getEconomiaByMaterial(limit)
	})

	// Busca registros de economia por número de ordem (OF)
	ipcMain.handle("economia-by-ordem", async (_event, ordem: string) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		return await db.getEconomiaByOrdem(ordem)
	})

	// Upsert de encaixe: atualiza `encaixe`, `dif` e `porcent` ou insere nova linha quando não existir
	ipcMain.handle("economia:upsert-encaixe", async (_event, row) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			console.log('[IPC] economia:upsert-encaixe payload:', JSON.stringify(row))
			const res = await db.upsertEconomiaRow(row)
			console.log('[IPC] economia:upsert-encaixe result:', res)
			return { success: true, result: res }
		} catch (err) {
			console.error('[IPC] economia:upsert-encaixe error:', err)
			return { success: false, error: (err as any)?.message || String(err) }
		}
	})

	// Inserir cabeçalho (economia_headers) e retornar id (FK)
	ipcMain.handle("economia:insert-header", async (_event, header) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			const res = await db.insertEconomiaHeader(header)
			return { success: true, result: res }
		} catch (err) {
			console.error('[IPC] economia:insert-header error:', err)
			return { success: false, error: (err as any)?.message || String(err) }
		}
	})

	// Export economia rows to CSV (opens Save dialog when filePath not provided)
	ipcMain.handle("economia-export-csv", async (_event, filePath?: string, limit: number = 1000000) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			const rows = await db.listEconomia(limit)
			const cols = [
				'id','data','artigo','ordem','modelo','material','cor_espessura','preco','previsto','encaixe','header_data_fase','header_modelo','header_artigo','header_periodo'
			]
			const escapeCsv = (v: any) => {
				if (v === null || v === undefined) return ''
				let s = String(v)
				if (s.indexOf('"') !== -1) s = s.replace(/"/g, '""')
				if (s.indexOf(',') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('"') !== -1) return `"${s}"`
				return s
			}

			const lines: string[] = [cols.join(',')]
			for (const r of rows) {
				const line = cols.map(c => {
					const val = r[c] !== undefined ? r[c] : ''
					return escapeCsv(val)
				}).join(',')
				lines.push(line)
			}
			const csv = lines.join('\r\n')

			let savePath = filePath
			if (!savePath) {
				const date = new Date().toISOString().slice(0,10).replace(/-/g,'')
				const res = await dialog.showSaveDialog({ defaultPath: `economia-${date}.csv`, filters: [{ name: 'CSV', extensions:['csv'] }]})
				if (res.canceled) return { success: false, canceled: true }
				savePath = res.filePath
			}

			await fs.promises.writeFile(savePath as string, csv, 'utf8')
			return { success: true, path: savePath, rows: rows.length }
		} catch (err) {
			console.error('[IPC] economia-export-csv error:', err)
			return { success: false, error: (err as any)?.message || String(err) }
		}
	})

	// Export economia rows to XLSX (opens Save dialog when filePath not provided)
	ipcMain.handle("economia-export-xlsx", async (_event, filePath?: string, limit: number = 1000000) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			const rows = await db.listEconomia(limit)
			const cols = [
				'id','data','artigo','ordem','modelo','material','cor_espessura','preco','previsto','encaixe','header_data_fase','header_modelo','header_artigo','header_periodo'
			]
			const xlsx = await import('xlsx')
			const data: any[] = []
			// header row
			data.push(cols)
			for (const r of rows) {
				data.push(cols.map(c => (r[c] === undefined ? '' : r[c])))
			}
			const ws = xlsx.utils.aoa_to_sheet(data)
			const wb = xlsx.utils.book_new()
			xlsx.utils.book_append_sheet(wb, ws, 'economia')

			let savePath = filePath
			if (!savePath) {
				const date = new Date().toISOString().slice(0,10).replace(/-/g,'')
				const res = await dialog.showSaveDialog({ defaultPath: `economia-${date}.xlsx`, filters: [{ name: 'Excel', extensions:['xlsx'] }]})
				if (res.canceled) return { success: false, canceled: true }
				savePath = res.filePath
			}

			xlsx.writeFile(wb, savePath as string)
			return { success: true, path: savePath, rows: rows.length }
		} catch (err) {
			console.error('[IPC] economia-export-xlsx error:', err)
			return { success: false, error: (err as any)?.message || String(err) }
		}
	})

	// Atualizar linha por id (usado pelo Banco de Dados - edição inline)
	ipcMain.handle("economia:update-row", async (_event, id: number, fields: Record<string, any>) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			const res = await db.updateEconomiaRowById(id, fields)
			return { success: true, result: res }
		} catch (err) {
			console.error('[IPC] economia:update-row error:', err)
			return { success: false, error: (err as any)?.message || String(err) }
		}
	})

	// Deletar múltiplas linhas do banco de dados
	ipcMain.handle("economia:delete-rows", async (_event, ids: number[]) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			const res = await db.deleteEconomiaRows(ids)
			return { success: true, result: res }
		} catch (err) {
			console.error('[IPC] economia:delete-rows error:', err)
			return { success: false, error: (err as any)?.message || String(err) }
		}
	})

	// ==================== CGC Import IPC handlers ====================

	ipcMain.handle("economia-import-cgc", async (_event, filePath?: string) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			let pathToRead = filePath
			if (!pathToRead) {
				const res = await dialog.showOpenDialog({
					properties: ["openFile"],
					filters: [{ name: "CGC Files", extensions: ["txt", "TXT"] }],
					title: "Selecionar arquivo CGC",
				})
				if (res.canceled) return { imported: 0 }
				pathToRead = res.filePaths[0]
			}

			// Parse o arquivo CGC
			const registros = await cgcParser.parseCGC(pathToRead)

			if (!registros || registros.length === 0) {
				return { imported: 0, message: "Nenhum registro encontrado no arquivo" }
			}

			// Converter para formato esperado pelo saveEconomiaRows
			const rows = registros.map((r: any) => ({
				Data: r.data,
				Artigo: r.artigo,
				Ordem: r.ordem,
				Modelo: r.modelo,
				Material: r.material,
				"Cor/Espessura": r.cor_espessura,
				PREÇO: r.preco,
				Previsto: r.previsto,
				Encaixe: r.encaixe,
				Dif: r.dif,
				"%": r.porcent,
			}))

			const result = await db.saveEconomiaRows(rows)
			return { ...result, imported: registros.length }
		} catch (err) {
			console.error("[IPC] economia-import-cgc error:", err)
			return { imported: 0, error: (err as any)?.message || String(err) }
		}
	})

	// Handler para retornar apenas os headers das OFs (sem materiais)
	ipcMain.handle("economia-import-cgc-headers", async (_event, filePath?: string) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			let pathToRead = filePath
			if (!pathToRead) {
				const res = await dialog.showOpenDialog({
					properties: ["openFile"],
					filters: [{ name: "CGC Files", extensions: ["txt", "TXT"] }],
					title: "Selecionar arquivo CGC",
				})
				if (res.canceled) return { headers: [] }
				pathToRead = res.filePaths[0]
			}

			const headers = await cgcParser.parseCGCHeaders(pathToRead)
			return { headers, count: headers.length }
		} catch (err) {
			console.error("[IPC] economia-import-cgc-headers error:", err)
			return { headers: [], error: (err as any)?.message || String(err) }
		}
	})

	// Handler para buscar dados do CGC por termo (OF, artigo, etc)
	ipcMain.handle("economia-search-cgc", async (_event, filePath: string, searchTerm?: string) => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			if (!filePath) {
				return { results: [], error: "Nenhum arquivo selecionado" }
			}

			const registros = await cgcParser.parseCGC(filePath)
			
			// Se há termo de busca, filtrar
			let filtered = registros
			if (searchTerm && searchTerm.trim()) {
				const term = searchTerm.trim().toLowerCase()
				filtered = registros.filter((r: any) => {
					const text = JSON.stringify(r).toLowerCase()
					return text.includes(term)
				})
			}

			return { 
				results: filtered, 
				total: registros.length,
				filePath: filePath 
			}
		} catch (err) {
			console.error("[IPC] economia-search-cgc error:", err)
			return { results: [], error: (err as any)?.message || String(err) }
		}
	})

	// Handler para apenas selecionar o arquivo CGC (sem carregar dados)
	ipcMain.handle("economia-select-cgc-file", async () => {
		const guard = ensureLicensed("economia")
		if (guard) return guard
		try {
			const res = await dialog.showOpenDialog({
				properties: ["openFile"],
				filters: [{ name: "CGC Files", extensions: ["txt", "TXT"] }],
				title: "Selecionar arquivo CGC",
			})
			if (res.canceled) return { filePath: null }
			return { filePath: res.filePaths[0] }
		} catch (err) {
			console.error("[IPC] economia-select-cgc-file error:", err)
			return { filePath: null, error: (err as any)?.message || String(err) }
		}
	})
}
