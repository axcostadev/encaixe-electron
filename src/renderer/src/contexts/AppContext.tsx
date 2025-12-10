import { Componente, Cor, Material, Modelo } from "@renderer/types"
import { createContext, ReactNode, useContext, useState } from "react"

interface AppContextType {
	modelos: Modelo[]
	materiais: Material[]

	loadModelos: () => Promise<void>

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
		componente: Omit<Componente, "id" | "modeloId">,
	) => Promise<void>
	updateComponente: (
		modeloId: number,
		componenteId: number,
		componente: Partial<Componente>,
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
				return {
					...m,
					cores,
					componentes: [], // TODO: load componentes when API ready
				}
			}),
		)
		setModelos(modelosWithExtras)
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
		// TODO: Call API when available
		const newMaterial: Material = {
			...material,
			id: Math.floor(Math.random() * 10000), // Temporary
		}
		setMateriais((prev) => [...prev, newMaterial])
	}

	async function updateMaterial(id: number, material: Partial<Material>) {
		// TODO: Call API
		setMateriais((prev) =>
			prev.map((m) => (m.id === id ? { ...m, ...material } : m)),
		)
	}

	async function deleteMaterial(id: number) {
		// TODO: Call API
		setMateriais((prev) => prev.filter((m) => m.id !== id))
	}

	// Componentes
	async function addComponente(
		modeloId: number,
		componente: Omit<Componente, "id" | "modeloId">,
	) {
		// TODO: Call API
		const newComponente: Componente = {
			...componente,
			id: Math.floor(Math.random() * 10000), // Temporary
			modeloId,
		}
		setModelos((prev) =>
			prev.map((m) =>
				m.id === modeloId
					? { ...m, componentes: [...m.componentes, newComponente] }
					: m,
			),
		)
	}

	async function updateComponente(
		modeloId: number,
		componenteId: number,
		componente: Partial<Componente>,
	) {
		// TODO: Call API
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
	}

	async function deleteComponente(modeloId: number, componenteId: number) {
		// TODO: Call API
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
