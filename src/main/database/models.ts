import { getDatabase } from "./db"

// Tipos para modelos
export interface Modelo {
	id: number
	artigo: string
	nome: string
}

export interface ModeloCor {
	id: number
	modelo_id: number
	cor_abreviada: string
	cor_completa: string
}

type ModeloRow = {
	id: number
	artigo: string
	nome: string
}

type ModeloCorRow = {
	id: number
	modelo_id: number
	cor_abreviada: string
	cor_completa: string
}

// Funções CRUD para modelos e cores
export function listModelos(): Promise<Modelo[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, artigo, nome FROM modelos ORDER BY nome",
				[],
				(err: Error | null, rows: ModeloRow[]) => {
					if (err) {
						console.error("Erro listando modelos:", err)
						resolve([])
						return
					}
					resolve(rows as Modelo[])
				},
			)
		} catch (error) {
			console.error(error)
			resolve([])
		}
	})
}

export function createModelo(
	artigo: string,
	nome: string,
): Promise<{ success: boolean; message: string; modelo?: Modelo }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO modelos (artigo, nome) VALUES (?, ?)",
				[artigo, nome],
				function (err: Error | null) {
					if (err) {
						if (err.message.includes("UNIQUE constraint failed")) {
							resolve({ success: false, message: "Artigo já existe" })
						} else {
							resolve({ success: false, message: "Erro ao criar modelo" })
						}
						return
					}

					resolve({
						success: true,
						message: "Modelo criado",
						modelo: { id: this.lastID as number, artigo, nome },
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao criar modelo" + error?.toString(),
			})
		}
	})
}

export function updateModelo(
	id: number,
	artigo: string,
	nome: string,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"UPDATE modelos SET artigo = ?, nome = ? WHERE id = ?",
				[artigo, nome, id],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao atualizar modelo" })
						return
					}
					resolve({ success: true, message: "Modelo atualizado" })
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao atualizar modelo" + error?.toString(),
			})
		}
	})
}

export function deleteModelo(
	id: number,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			// primeiro deletar cores relacionadas (integridade)
			database.run(
				"DELETE FROM modelo_cores WHERE modelo_id = ?",
				[id],
				(err) => {
					if (err) {
						console.error(err)
					}
					database.run(
						"DELETE FROM modelos WHERE id = ?",
						[id],
						function (err2: Error | null) {
							if (err2) {
								resolve({ success: false, message: "Erro ao deletar modelo" })
								return
							}
							resolve({ success: true, message: "Modelo deletado" })
						},
					)
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao deletar modelo" + error?.toString(),
			})
		}
	})
}

export function listModeloCores(modelo_id: number): Promise<ModeloCor[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, modelo_id, cor_abreviada, cor_completa FROM modelo_cores WHERE modelo_id = ? ORDER BY cor_abreviada",
				[modelo_id],
				(err: Error | null, rows: ModeloCorRow[]) => {
					if (err) {
						console.error("Erro listando cores:", err)
						resolve([])
						return
					}
					resolve(rows as ModeloCor[])
				},
			)
		} catch (error) {
			console.error(error)
			resolve([])
		}
	})
}

export function addModeloCor(
	modelo_id: number,
	cor_abreviada: string,
	cor_completa: string,
): Promise<{ success: boolean; message: string; cor?: ModeloCor }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO modelo_cores (modelo_id, cor_abreviada, cor_completa) VALUES (?, ?, ?)",
				[modelo_id, cor_abreviada, cor_completa],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao adicionar cor" })
						return
					}
					resolve({
						success: true,
						message: "Cor adicionada",
						cor: {
							id: this.lastID as number,
							modelo_id,
							cor_abreviada,
							cor_completa,
						},
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao adicionar cor" + error?.toString(),
			})
		}
	})
}

export function deleteModeloCor(
	id: number,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"DELETE FROM modelo_cores WHERE id = ?",
				[id],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao deletar cor" })
						return
					}
					resolve({ success: true, message: "Cor deletada" })
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao deletar cor" + error?.toString(),
			})
		}
	})
}

// Tipos para materiais
export interface Material {
	id: number
	artigo: string
	largura: number
	obs?: string
	sentido: SentidoType
}

export type SentidoType = "S" | "N" | "U"

type MaterialRow = {
	id: number
	artigo: string
	largura: number
	obs?: string
	sentido: SentidoType
}

// Funções CRUD para materiais
export function listMateriais(): Promise<Material[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, artigo, largura, obs, sentido FROM materiais ORDER BY artigo",
				[],
				(err: Error | null, rows: MaterialRow[]) => {
					if (err) {
						console.error("Erro listando materiais:", err)
						resolve([])
						return
					}
					resolve(rows as Material[])
				},
			)
		} catch (error) {
			console.error(error)
			resolve([])
		}
	})
}

export function createMaterial(
	artigo: string,
	largura: number,
	obs: string | undefined,
	sentido: SentidoType,
): Promise<{ success: boolean; message: string; id?: number }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO materiais (artigo, largura, obs, sentido) VALUES (?, ?, ?, ?)",
				[artigo, largura, obs, sentido],
				function (err: Error | null) {
					if (err) {
						console.error("Erro criando material:", err)
						resolve({
							success: false,
							message: "Erro ao criar material: " + err.message,
						})
						return
					}
					resolve({
						success: true,
						message: "Material criado com sucesso",
						id: this.lastID,
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao criar material: " + error?.toString(),
			})
		}
	})
}

export function updateMaterial(
	id: number,
	artigo: string,
	largura: number,
	obs: string | undefined,
	sentido: SentidoType,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"UPDATE materiais SET artigo = ?, largura = ?, obs = ?, sentido = ? WHERE id = ?",
				[artigo, largura, obs, sentido, id],
				function (err: Error | null) {
					if (err) {
						console.error("Erro atualizando material:", err)
						resolve({
							success: false,
							message: "Erro ao atualizar material: " + err.message,
						})
						return
					}
					if (this.changes === 0) {
						resolve({
							success: false,
							message: "Material não encontrado",
						})
						return
					}
					resolve({
						success: true,
						message: "Material atualizado com sucesso",
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao atualizar material: " + error?.toString(),
			})
		}
	})
}

export function deleteMaterial(
	id: number,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"DELETE FROM materiais WHERE id = ?",
				[id],
				function (err: Error | null) {
					if (err) {
						console.error("Erro deletando material:", err)
						resolve({
							success: false,
							message: "Erro ao deletar material: " + err.message,
						})
						return
					}
					if (this.changes === 0) {
						resolve({
							success: false,
							message: "Material não encontrado",
						})
						return
					}
					resolve({
						success: true,
						message: "Material deletado com sucesso",
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao deletar material: " + error?.toString(),
			})
		}
	})
}
