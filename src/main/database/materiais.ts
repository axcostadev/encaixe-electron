import { getDatabase } from "./db"

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
