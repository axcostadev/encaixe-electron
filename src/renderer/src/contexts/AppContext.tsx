import { Componente, Cor, Material, Modelo } from "@renderer/types"
import { createContext, ReactNode, useContext, useState } from "react"

interface AppContextType {
	modelos: Modelo[]
	materiais: Material[]

	// Modelos
	addModelo: (modelo: Omit<Modelo, "id" | "cores" | "componentes">) => void
	updateModelo: (id: string, modelo: Partial<Modelo>) => void
	deleteModelo: (id: string) => void

	// Cores
	addCor: (modeloId: string, cor: Omit<Cor, "id" | "modeloId">) => void
	updateCor: (modeloId: string, corId: string, cor: Partial<Cor>) => void
	deleteCor: (modeloId: string, corId: string) => void
	getCoresByModelo: (modeloId: string) => Cor[]

	// Materiais
	addMaterial: (material: Omit<Material, "id">) => void
	updateMaterial: (id: string, material: Partial<Material>) => void
	deleteMaterial: (id: string) => void

	// Componentes
	addComponente: (
		modeloId: string,
		componente: Omit<Componente, "id" | "modeloId">,
	) => void
	updateComponente: (
		modeloId: string,
		componenteId: string,
		componente: Partial<Componente>,
	) => void
	deleteComponente: (modeloId: string, componenteId: string) => void
	getComponentesByModelo: (modeloId: string) => Componente[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)

function generateId(): string {
	return Math.random().toString(36).substring(2, 15)
}

export function AppProvider({ children }: { children: ReactNode }) {
	const [modelos, setModelos] = useState<Modelo[]>([])
	const [materiais, setMateriais] = useState<Material[]>([])

	// Modelos
	function addModelo(modelo: Omit<Modelo, "id" | "cores" | "componentes">) {
		const newModelo: Modelo = {
			...modelo,
			id: generateId(),
			cores: [],
			componentes: [],
		}
		setModelos((prev) => [...prev, newModelo])
	}

	function updateModelo(id: string, modelo: Partial<Modelo>) {
		setModelos((prev) =>
			prev.map((m) => (m.id === id ? { ...m, ...modelo } : m)),
		)
	}

	function deleteModelo(id: string) {
		setModelos((prev) => prev.filter((m) => m.id !== id))
	}

	// Cores
	function addCor(modeloId: string, cor: Omit<Cor, "id" | "modeloId">) {
		const newCor: Cor = {
			...cor,
			id: generateId(),
			modeloId,
		}
		setModelos((prev) =>
			prev.map((m) =>
				m.id === modeloId ? { ...m, cores: [...m.cores, newCor] } : m,
			),
		)
	}

	function updateCor(modeloId: string, corId: string, cor: Partial<Cor>) {
		setModelos((prev) =>
			prev.map((m) =>
				m.id === modeloId
					? {
							...m,
							cores: m.cores.map((c) =>
								c.id === corId ? { ...c, ...cor } : c,
							),
						}
					: m,
			),
		)
	}

	function deleteCor(modeloId: string, corId: string) {
		setModelos((prev) =>
			prev.map((m) =>
				m.id === modeloId
					? { ...m, cores: m.cores.filter((c) => c.id !== corId) }
					: m,
			),
		)
	}

	function getCoresByModelo(modeloId: string): Cor[] {
		const modelo = modelos.find((m) => m.id === modeloId)
		return modelo?.cores || []
	}

	// Materiais
	function addMaterial(material: Omit<Material, "id">) {
		const newMaterial: Material = {
			...material,
			id: generateId(),
		}
		setMateriais((prev) => [...prev, newMaterial])
	}

	function updateMaterial(id: string, material: Partial<Material>) {
		setMateriais((prev) =>
			prev.map((m) => (m.id === id ? { ...m, ...material } : m)),
		)
	}

	function deleteMaterial(id: string) {
		setMateriais((prev) => prev.filter((m) => m.id !== id))
	}

	// Componentes
	function addComponente(
		modeloId: string,
		componente: Omit<Componente, "id" | "modeloId">,
	) {
		const newComponente: Componente = {
			...componente,
			id: generateId(),
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

	function updateComponente(
		modeloId: string,
		componenteId: string,
		componente: Partial<Componente>,
	) {
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

	function deleteComponente(modeloId: string, componenteId: string) {
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

	function getComponentesByModelo(modeloId: string): Componente[] {
		const modelo = modelos.find((m) => m.id === modeloId)
		return modelo?.componentes || []
	}

	return (
		<AppContext.Provider
			value={{
				modelos,
				materiais,
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
