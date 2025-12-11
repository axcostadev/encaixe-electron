import {
	Componente,
	ComponentePayload,
	Cor,
	Material,
	Modelo,
} from "@renderer/types"
import { createContext, ReactNode, useContext, useState } from "react"

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

	async function loadModelos() {
		const modelosFromAPI = await window.api.modelos.list()
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
					materialId?: number
					tipoTecido?: number
					conjugacaoNavalha?: string
					placaPar?: string
					camadas?: number
					espacamento?: number
					compMaximo?: number
					percPerda?: number
					coresDisponiveis?: string[]
					tamanhos?: { tamanhoInicial: number; tamanhoFinal: number }[]
				}

				const componentes: Componente[] = (componentesFromAPI || []).map(
					(c: ComponenteFromAPI, idx: number) => {
						return {
							id: c.id,
							modeloId: c.modelo_id,
							sequencia: c.sequencia ?? idx,
							nome: c.nome,
							materialId: c.materialId || 0,
							tipoTecido: c.tipoTecido || 0,
							conjugacaoNavalha: c.conjugacaoNavalha || "",
							placaPar: c.placaPar || "",
							camadas: c.camadas || 0,
							espacamento: c.espacamento || 0,
							compMaximo: c.compMaximo || 0,
							percPerda: c.percPerda || 0,
							coresDisponiveis: c.coresDisponiveis || [],
							tamanhos: c.tamanhos || [],
							modeloCorId: (c as any).modelo_cor_id || undefined,
							setorId: (c as any).setor_id || undefined,
							numeroTecido: (c as any).numero_tecido || undefined,
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

	// Componentes
	async function addComponente(
		modeloId: number,
		componente: ComponentePayload,
	) {
		// Persistir no backend
		const dados = {
			materialId: componente.materialId,
			tipoTecido: componente.tipoTecido,
			conjugacaoNavalha: componente.conjugacaoNavalha,
			placaPar: componente.placaPar,
			camadas: componente.camadas,
			espacamento: componente.espacamento,
			compMaximo: componente.compMaximo,
			percPerda: componente.percPerda,
			coresDisponiveis: componente.coresDisponiveis,
			modeloCorId: (componente as any).modeloCorId,
			setorId: (componente as any).setorId,
			numeroTecido: (componente as any).numeroTecido,
		}

		const res = await window.api.componentes.create(
			modeloId,
			componente.nome,
			dados,
			componente.tamanhos || [],
		)

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
		} else {
			throw new Error(res?.message || "Erro ao criar componente")
		}
	}

	async function updateComponente(
		modeloId: number,
		componenteId: number,
		componente: Partial<ComponentePayload>,
	) {
		// Persistir no backend
		const dados = {
			materialId: componente.materialId,
			tipoTecido: componente.tipoTecido,
			conjugacaoNavalha: componente.conjugacaoNavalha,
			placaPar: componente.placaPar,
			camadas: componente.camadas,
			espacamento: componente.espacamento,
			compMaximo: componente.compMaximo,
			percPerda: componente.percPerda,
			coresDisponiveis: componente.coresDisponiveis,
			modeloCorId: (componente as any).modeloCorId,
			setorId: (componente as any).setorId,
			numeroTecido: (componente as any).numeroTecido,
		}

		const res = await window.api.componentes.update(
			modeloId,
			componenteId,
			componente.nome || "",
			dados,
			componente.tamanhos || [],
		)

		if (res && res.success) {
			setModelos((prev) =>
				prev.map((m) =>
					m.id === modeloId
						? {
								...m,
								componentes: m.componentes.map((c) =>
									c.id === componenteId ? { ...c, ...componente } : c,
								),
							}
						: m,
				),
			)
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
