import React, { createContext, useContext, useEffect, useState } from "react"

export interface Setor {
	id: number
	nome: string
}

interface SetoresContextValue {
	setores: Setor[]
	addSetor: (nome: string) => Promise<void>
	updateSetor: (id: number, nome: string) => Promise<void>
	removeSetor: (id: number) => Promise<void>
	loading: boolean
}

const SetoresContext = createContext<SetoresContextValue | undefined>(undefined)

export { SetoresContext }

export function SetoresProvider({ children }: { children: React.ReactNode }) {
	const [setores, setSetores] = useState<Setor[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadSetores()
	}, [])

	async function loadSetores() {
		try {
			const result = await window.api.setores.list()
			setSetores(result)
		} catch (error) {
			console.error("Erro ao carregar setores:", error)
		} finally {
			setLoading(false)
		}
	}

	async function addSetor(nome: string) {
		try {
			const result = await window.api.setores.create(nome)
			if (result.success && result.setor) {
				setSetores((prev) => [...prev, result.setor!])
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			console.error("Erro ao adicionar setor:", error)
			throw error
		}
	}

	async function updateSetor(id: number, nome: string) {
		try {
			const result = await window.api.setores.update(id, nome)
			if (result.success) {
				setSetores((prev) =>
					prev.map((s) => (s.id === id ? { ...s, nome } : s)),
				)
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			console.error("Erro ao atualizar setor:", error)
			throw error
		}
	}

	async function removeSetor(id: number) {
		try {
			const result = await window.api.setores.delete(id)
			if (result.success) {
				setSetores((prev) => prev.filter((s) => s.id !== id))
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			console.error("Erro ao remover setor:", error)
			throw error
		}
	}

	return (
		<SetoresContext.Provider
			value={{ setores, addSetor, updateSetor, removeSetor, loading }}
		>
			{children}
		</SetoresContext.Provider>
	)
}

export function useSetores() {
	const ctx = useContext(SetoresContext)
	if (!ctx) throw new Error("useSetores must be used within SetoresProvider")
	return ctx
}
