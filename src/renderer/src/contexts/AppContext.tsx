import {
	Componente,
	ComponentePayload,
	Cor,
	Material,
	Modelo,
} from "@renderer/types"
import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react"

interface AppContextType {
	modelos: Modelo[]
	materiais: Material[]

	loadModelos: () => Promise<void>
	loadMateriais: () => Promise<void>

	// Modelos
	addModelo: (
		modelo: Omit<Modelo, "id" | "cores" | "componentes">,
	) => Promise<void>
	updateModelo: (id: number, modelo: Partial<Modelo>) => Promise<void>
	deleteModelo: (id: number) => Promise<void>

	// Cores
	addCor: (modeloId: number, cor: Omit<Cor, "id" | "modeloId">) => Promise<void>
	updateCor: (
		modeloId: number,
		corId: number,
		cor: Partial<Cor>,
	) => Promise<void>
	deleteCor: (modeloId: number, corId: number) => Promise<void>
	getCoresByModelo: (modeloId: number) => Cor[]

	// Materiais
	addMaterial: (material: Omit<Material, "id">) => Promise<void>
	updateMaterial: (id: number, material: Partial<Material>) => Promise<void>
	deleteMaterial: (id: number) => Promise<void>
	getComponentesCountByMaterial: (materialId: number) => number
	getComponentesByMaterial: (materialId: number) => Componente[]
	unlinkMaterialFromComponente: (
		componenteId: number,
		modeloId: number,
	) => Promise<void>

	// Componentes
	addComponente: (
		modeloId: number,
		componente: ComponentePayload,
	) => Promise<void>
	updateComponente: (
		modeloId: number,
		componenteId: number,
		componente: Partial<ComponentePayload>,
	) => Promise<void>
	deleteComponente: (modeloId: number, componenteId: number) => Promise<void>
	getComponentesByModelo: (modeloId: number) => Componente[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
	const [modelos, setModelos] = useState<Modelo[]>([])
	const [materiais, setMateriais] = useState<Material[]>([])

	useEffect(() => {
		loadModelos()
		loadMateriais()
	}, [])

	async function loadModelos() {
		if (!window.api?.modelos?.list) {
			console.error("API modelos.list não disponível")
			setModelos([])
			return
		}

		const modelosFromAPI = await window.api.modelos.list()

		// Alguns handlers podem retornar um objeto de erro em vez de um array,
		// por exemplo quando a licença não está ativa.
		if (!Array.isArray(modelosFromAPI)) {
			console.error("modelos.list retornou valor inesperado:", modelosFromAPI)
			setModelos([])
			return
		}

		const modelosWithExtras = await Promise.all(
			modelosFromAPI.map(async (m) => {
				const coresFromAPI = await window.api.modelos.cores.list(m.id)
				const cores: Cor[] = coresFromAPI.map((c) => ({
					id: c.id,
					modeloId: c.modelo_id,
					abreviacao: c.cor_abreviada,
					nome: c.cor_completa,
				}))

				// carregar componentes do backend
				const componentesFromAPI = await window.api.componentes.list(m.id)
				type ComponenteFromAPI = {
					id: number
					modelo_id: number
					modelo_cor_id?: number
					setor_id?: number
					numero_tecido?: string
					sequencia?: number
					nome: string
			apelido?: string
			material_id?: number
			materialId?: number
			redutor_largura?: number
			redutorLargura?: number
			// snake_case variants from backend
			tipo_tecido?: number
			conjugacao_navalha?: string
			placa_par?: string
			camadas?: number
			espacamento?: number
			comp_maximo?: number
			perc_perda?: number
			cores_disponiveis?: string[]
			// camelCase fallbacks
			tipoTecido?: number
			conjugacaoNavalha?: string
			placaPar?: string
			compMaximo?: number
			percPerda?: number
			coresDisponiveis?: string[]
			tamanhos?: { tamanhoInicial: number; tamanhoFinal: number }[]
			[key: string]: any
				}

				const componentes: Componente[] = (componentesFromAPI || []).map(
					(c: ComponenteFromAPI, idx: number) => {
						return {
							id: c.id,
							modeloId: c.modelo_id,
							sequencia: c.sequencia ?? idx,
							nome: c.nome,
							apelido: c.apelido || "",
							materialId: (c as any).material_id || c.materialId || 0,
							redutorLargura: (c as any).redutor_largura ?? (c as any).redutorLargura ?? 0,
							tipoTecido: c.tipoTecido ?? c.tipo_tecido ?? 0,
							conjugacaoNavalha: c.conjugacaoNavalha ?? c.conjugacao_navalha ?? "",
							placaPar: c.placaPar ?? c.placa_par ?? "",
							camadas: c.camadas ?? 0,
							espacamento: c.espacamento ?? 0,
							compMaximo: c.compMaximo ?? c.comp_maximo ?? 0,
							percPerda: c.percPerda ?? c.perc_perda ?? 0,
							coresDisponiveis: c.coresDisponiveis ?? c.cores_disponiveis ?? [],
							tamanhos: c.tamanhos || [],
							modeloCorId: c.modelo_cor_id || undefined,
							setorId: c.setor_id || undefined,
							numeroTecido: c.numero_tecido || undefined,
						}
					},
				)


				return {
					...m,
					cores,
					componentes,
				}
			}),
		)
		setModelos(modelosWithExtras)
	}

	async function loadMateriais() {
		const materiaisFromAPI = await window.api.materiais.list()
		setMateriais(materiaisFromAPI)
	}

	async function addModelo(
		modelo: Omit<Modelo, "id" | "cores" | "componentes">,
	) {
		const response = await window.api.modelos.create(modelo.artigo, modelo.nome)
		if (response.success && response.modelo) {
			const newModelo: Modelo = {
				...response.modelo,
				cores: [],
				componentes: [],
			}
			setModelos((prev) => [...prev, newModelo])
		} else {
			throw new Error(response.message)
		}
	}

	async function updateModelo(id: number, modelo: Partial<Modelo>) {
		const response = await window.api.modelos.update(
			id,
			modelo.artigo!,
			modelo.nome!,
		)
		if (response.success) {
			setModelos((prev) =>
				prev.map((m) => (m.id === id ? { ...m, ...modelo } : m)),
			)
		} else {
			throw new Error(response.message)
		}
	}

	async function deleteModelo(id: number) {
		const response = await window.api.modelos.delete(id)
		if (response.success) {
			setModelos((prev) => prev.filter((m) => m.id !== id))
		} else {
			throw new Error(response.message)
		}
	}

	// Cores
	async function addCor(modeloId: number, cor: Omit<Cor, "id" | "modeloId">) {
		const response = await window.api.modelos.cores.add(
			modeloId,
			cor.abreviacao,
			cor.nome,
		)
		if (response.success && response.cor) {
			const newCor: Cor = {
				id: response.cor.id,
				modeloId: response.cor.modelo_id,
				abreviacao: response.cor.cor_abreviada,
				nome: response.cor.cor_completa,
			}
			setModelos((prev) =>
				prev.map((m) =>
					m.id === modeloId ? { ...m, cores: [...m.cores, newCor] } : m,
				),
			)
		} else {
			throw new Error(response.message)
		}
	}

	async function updateCor(modeloId: number, corId: number, cor: Partial<Cor>) {
		// Since no update API, delete old and add new
		const responseDelete = await window.api.modelos.cores.delete(corId)
		if (responseDelete.success) {
			const responseAdd = await window.api.modelos.cores.add(
				modeloId,
				cor.abreviacao!,
				cor.nome!,
			)
			if (responseAdd.success && responseAdd.cor) {
				const newCor: Cor = {
					id: responseAdd.cor.id,
					modeloId: responseAdd.cor.modelo_id,
					abreviacao: responseAdd.cor.cor_abreviada,
					nome: responseAdd.cor.cor_completa,
				}
				setModelos((prev) =>
					prev.map((m) =>
						m.id === modeloId
							? {
									...m,
									cores: m.cores.map((c) => (c.id === corId ? newCor : c)),
								}
							: m,
					),
				)
			} else {
				throw new Error(responseAdd.message)
			}
		} else {
			throw new Error(responseDelete.message)
		}
	}

	async function deleteCor(modeloId: number, corId: number) {
		const response = await window.api.modelos.cores.delete(corId)
		if (response.success) {
			setModelos((prev) =>
				prev.map((m) =>
					m.id === modeloId
						? { ...m, cores: m.cores.filter((c) => c.id !== corId) }
						: m,
				),
			)
		} else {
			throw new Error(response.message)
		}
	}

	function getCoresByModelo(modeloId: number): Cor[] {
		const modelo = modelos.find((m) => m.id === modeloId)
		return modelo?.cores || []
	}

	// Materiais
	async function addMaterial(material: Omit<Material, "id">) {
		const response = await window.api.materiais.create(
			material.artigo,
			material.largura,
			material.obs,
			material.sentido,
		)
		if (response.success && response.id) {
			const newMaterial: Material = {
				...material,
				id: response.id,
			}
			setMateriais((prev) => [...prev, newMaterial])
		} else {
			throw new Error(response.message)
		}
	}

	async function updateMaterial(id: number, material: Partial<Material>) {
		const response = await window.api.materiais.update(
			id,
			material.artigo || "",
			material.largura || 0,
			material.obs,
			material.sentido,
		)
		if (response.success) {
			setMateriais((prev) =>
				prev.map((m) => (m.id === id ? { ...m, ...material } : m)),
			)
		} else {
			throw new Error(response.message)
		}
	}

	async function deleteMaterial(id: number) {
		const response = await window.api.materiais.delete(id)
		if (response.success) {
			setMateriais((prev) => prev.filter((m) => m.id !== id))
		} else {
			throw new Error(response.message)
		}
	}

	function getComponentesCountByMaterial(materialId: number): number {
		return modelos.reduce((count, modelo) => {
			return (
				count +
				modelo.componentes.filter((c) => c.materialId === materialId).length
			)
		}, 0)
	}

	function getComponentesByMaterial(materialId: number): Componente[] {
		const componentes: Componente[] = []
		modelos.forEach((modelo) => {
			modelo.componentes.forEach((componente) => {
				if (componente.materialId === materialId) {
					componentes.push(componente)
				}
			})
		})
		return componentes
	}

	async function unlinkMaterialFromComponente(
		componenteId: number,
		modeloId: number,
	) {
		// Criar payload com materialId = 0 para desvincular
		const componentePayload: ComponentePayload = {
			materialId: 0,
			tipoTecido: 0,
			conjugacaoNavalha: "",
			placaPar: "",
			camadas: 1,
			espacamento: 0,
			compMaximo: 0,
			percPerda: 0,
			coresDisponiveis: [],
			modeloCorId: 0,
			setorId: 0,
			numeroTecido: "",
			nome: "", // será preenchido pelo componente atual
			tamanhos: [],
		}

		// Buscar o componente atual para manter os outros valores
		const modelo = modelos.find((m) => m.id === modeloId)
		const componenteAtual = modelo?.componentes.find(
			(c) => c.id === componenteId,
		)

		if (componenteAtual) {
			componentePayload.nome = componenteAtual.nome
			componentePayload.tipoTecido = componenteAtual.tipoTecido
			componentePayload.conjugacaoNavalha = componenteAtual.conjugacaoNavalha
			componentePayload.placaPar = componenteAtual.placaPar
			componentePayload.camadas = componenteAtual.camadas
			componentePayload.espacamento = componenteAtual.espacamento
			componentePayload.compMaximo = componenteAtual.compMaximo
			componentePayload.percPerda = componenteAtual.percPerda
			componentePayload.coresDisponiveis = componenteAtual.coresDisponiveis
			componentePayload.modeloCorId = componenteAtual.modeloCorId ?? 0
			componentePayload.setorId = componenteAtual.setorId ?? 0
			componentePayload.numeroTecido = componenteAtual.numeroTecido ?? ""
			componentePayload.tamanhos = componenteAtual.tamanhos
		}

		await updateComponente(modeloId, componenteId, componentePayload)
	}

	// Componentes
	async function addComponente(
		modeloId: number,
		componente: ComponentePayload,
	) {
		// Persistir no backend
		const dados = {
			materialId: componente.materialId,
			apelido: componente.apelido,
				tipoTecido: componente.tipoTecido,
			conjugacaoNavalha: componente.conjugacaoNavalha,
			placaPar: componente.placaPar,
			camadas: componente.camadas,
			espacamento: componente.espacamento,
			compMaximo: componente.compMaximo,
			percPerda: componente.percPerda,
			redutorLargura: componente.redutorLargura ?? 0,
			coresDisponiveis: componente.coresDisponiveis,
			modeloCorId: componente.modeloCorId,
			setorId: componente.setorId,
			numeroTecido: componente.numeroTecido,
		} 

		console.debug("addComponente: payload:", {
			modeloId,
			nome: componente.nome,
			dados,
			tamanhos: componente.tamanhos || [],
		})
		let res: any
		try {
			console.debug("addComponente: sending to backend", { modeloId, nome: componente.nome, dados, tamanhos: componente.tamanhos })
			res = await window.api.componentes.create(
				modeloId,
				componente.nome,
				dados,
				componente.tamanhos || [],
			)
		} catch (err) {
			console.error("addComponente: exceção ao chamar API:", err)
			throw err
		}
		console.debug("addComponente: resposta backend:", JSON.stringify(res))

		if (res && res.success) {
			const componenteId: number =
				res.componenteId || Math.floor(Math.random() * 10000)
			const modelo = modelos.find((m) => m.id === modeloId)
			const nextSequencia = modelo
				? Math.max(0, ...modelo.componentes.map((c) => c.sequencia)) + 1
				: 0
			const newComponente: Componente = {
				...componente,
				id: componenteId,
				modeloId,
				sequencia: nextSequencia,
			}
			setModelos((prev) =>
				prev.map((m) =>
					m.id === modeloId
						? { ...m, componentes: [...m.componentes, newComponente] }
						: m,
				),
			)
			// Também salvar apelido no gerenciador de apelidos para uso global
			try {
				if (componente.apelido) {
					await (window as any).api.apelidosAPI.save(newComponente.nome, componente.apelido)
				}
				// Recarregar modelos do backend para garantir consistência
				console.debug('AppContext: reloading modelos after create to ensure consistency')
				await loadModelos()
			} catch (err) {
				console.error('Erro ao salvar apelido global ou recarregar modelos:', err)
			}
		} else {
			console.error("Falha ao criar componente:", res)
			throw new Error(res?.message || "Erro ao criar componente")
		}
	}

	async function updateComponente(
		modeloId: number,
		componenteId: number,
		componente: Partial<ComponentePayload>,
	) {
		// Persistir no backend - passar parâmetros individuais em vez de objeto "dados"
		console.debug("updateComponente: sending to backend", { modeloId, componenteId, nome: componente.nome, dados: { apelido: componente.apelido || "", materialId: componente.materialId ?? 0, tipoTecido: componente.tipoTecido ?? 0, conjugacaoNavalha: componente.conjugacaoNavalha ?? "", placaPar: componente.placaPar ?? "", camadas: componente.camadas ?? 1, espacamento: componente.espacamento ?? 0, compMaximo: componente.compMaximo ?? 0, percPerda: componente.percPerda ?? 0, redutorLargura: componente.redutorLargura ?? 0, coresDisponiveis: componente.coresDisponiveis ?? [], modeloCorId: componente.modeloCorId ?? 0, setorId: componente.setorId ?? 0, numeroTecido: componente.numeroTecido ?? "" }, tamanhos: componente.tamanhos || [] })
		const res = await window.api.componentes.update(
			modeloId,
			componenteId,
			componente.nome || "",
			{
				apelido: componente.apelido || "",
				materialId: componente.materialId ?? 0,
				tipoTecido: componente.tipoTecido ?? 0,
				conjugacaoNavalha: componente.conjugacaoNavalha ?? "",
				placaPar: componente.placaPar ?? "",
				camadas: componente.camadas ?? 1,
				espacamento: componente.espacamento ?? 0,
				compMaximo: componente.compMaximo ?? 0,
				percPerda: componente.percPerda ?? 0,
				redutorLargura: componente.redutorLargura ?? 0,
				coresDisponiveis: componente.coresDisponiveis ?? [],
				modeloCorId: componente.modeloCorId ?? 0,
				setorId: componente.setorId ?? 0,
				numeroTecido: componente.numeroTecido ?? "",
			},
			componente.tamanhos || [],
		)

		if (res && res.success) {
			setModelos((prev) => {
				const next = prev.map((m) =>
					m.id === modeloId
						? {
							...m,
							componentes: m.componentes.map((c) =>
								c.id === componenteId ? { ...c, ...componente } : c,
							),
						}
					: m,
				)
				// Logar o componente atualizado que será gravado no estado
				const updated = next
					.flatMap((m) => m.componentes)
					.find((c) => c.id === componenteId)
				console.debug('AppContext: after updateComponente, updated in-memory componente =', JSON.stringify(updated))
				// Salvar apelido no gerenciador de apelidos também
				try {
					if (componente.apelido) {
						;(window as any).api.apelidosAPI.save(updated?.nome || componente.nome, componente.apelido)
					}
				} catch (err) {
					console.error('Erro ao salvar apelido global:', err)
				}
				return next
			})
			try {
				console.debug('AppContext: reloading modelos after update to ensure consistency')
				await loadModelos()
			} catch (err) {
				console.error('Erro ao recarregar modelos após update:', err)
			}
		} else {
			throw new Error(res?.message || "Erro ao atualizar componente")
		}
	}

	async function deleteComponente(modeloId: number, componenteId: number) {
		const res = await window.api.componentes.delete(modeloId, componenteId)
		if (res && res.success) {
			setModelos((prev) =>
				prev.map((m) =>
					m.id === modeloId
						? {
								...m,
								componentes: m.componentes.filter((c) => c.id !== componenteId),
							}
						: m,
				),
			)
		} else {
			throw new Error(res?.message || "Erro ao deletar componente")
		}
	}

	function getComponentesByModelo(modeloId: number): Componente[] {
		const modelo = modelos.find((m) => m.id === modeloId)
		return modelo?.componentes || []
	}

	return (
		<AppContext.Provider
			value={{
				modelos,
				materiais,
				loadModelos,
				loadMateriais,
				addModelo,
				updateModelo,
				deleteModelo,
				addCor,
				updateCor,
				deleteCor,
				getCoresByModelo,
				addMaterial,
				updateMaterial,
				deleteMaterial,
				getComponentesCountByMaterial,
				getComponentesByMaterial,
				unlinkMaterialFromComponente,
				addComponente,
				updateComponente,
				deleteComponente,
				getComponentesByModelo,
			}}
		>
			{children}
		</AppContext.Provider>
	)
}

export function useApp() {
	const context = useContext(AppContext)
	if (!context) {
		throw new Error("useApp must be used within an AppProvider")
	}
	return context
}
