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

// ==================== Componentes e Tamanhos ====================

export interface Componente {
	id: number
	modelo_id: number
	numero_tecido: string
	nome: string
	dados?: ComponenteDados | null // campos extras salvos em JSON (materialId, camadas, etc)
	tamanhos?: { tamanhoInicial: number; tamanhoFinal: number }[]
}

type ComponenteRow = {
	id: number
	modelo_id: number
	numero_tecido: string
	nome: string
	dados?: string
}

export interface ComponenteDados {
	materialId: number
	tipoTecido?: number
	conjugacaoNavalha?: string
	placaPar?: string
	camadas?: number
	espacamento?: number
	compMaximo?: number
	percPerda?: number
	coresDisponiveis?: string[]
}

export function listComponentes(modelo_id: number): Promise<Componente[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, modelo_id, numero_tecido, nome, dados FROM componentes WHERE modelo_id = ? ORDER BY id",
				[modelo_id],
				async (err: Error | null, rows: ComponenteRow[]) => {
					if (err) {
						console.error("Erro listando componentes:", err)
						resolve([])
						return
					}

					const componentesPromises: Promise<Componente>[] = (rows || []).map(
						(r) => {
							return new Promise<Componente>((resComp) => {
								const comp: Componente = {
									id: r.id,
									modelo_id: r.modelo_id,
									numero_tecido: r.numero_tecido,
									nome: r.nome,
									dados: null,
									tamanhos: [],
								}

								if (r.dados) {
									try {
										comp.dados = JSON.parse(r.dados) as ComponenteDados
									} catch {
										comp.dados = null
									}
								}

								// carregar tamanhos
								database.all(
									"SELECT tamanho FROM tamanhos WHERE componente_id = ? ORDER BY id",
									[r.id],
									(e: Error | null, trows: Array<{ tamanho: string }>) => {
										if (e) {
											comp.tamanhos = []
										} else {
											const tamanhosRows = trows || []
											comp.tamanhos = tamanhosRows.map((t) => {
												const s = String(t.tamanho)
												if (s.includes("-")) {
													const parts = s.split("-")
													const inicio = parseInt(parts[0]) || 0
													const fim = parseInt(parts[1]) || inicio
													return { tamanhoInicial: inicio, tamanhoFinal: fim }
												}
												const v = parseInt(s) || 0
												return { tamanhoInicial: v, tamanhoFinal: v }
											})
										}
										resComp(comp)
									},
								)
							})
						},
					)

					Promise.all(componentesPromises)
						.then((componentes) => resolve(componentes))
						.catch((err) => {
							console.error("Erro processando componentes:", err)
							resolve([])
						})
				},
			)
		} catch (error) {
			console.error(error)
			resolve([])
		}
	})
}

export function addComponente(
	modelo_id: number,
	nome: string,
	dados?: ComponenteDados | null,
	tamanhos?: { tamanhoInicial: number; tamanhoFinal: number }[],
): Promise<{ success: boolean; message: string; componenteId?: number }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			const dadosStr = dados ? JSON.stringify(dados) : null
			database.run(
				"INSERT INTO componentes (modelo_id, modelo_cor_id, numero_tecido, nome, dados) VALUES (?, ?, ?, ?, ?)",
				[modelo_id, 0, "", nome, dadosStr],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao criar componente" })
						return
					}
					const componenteId = this.lastID as number

					// inserir tamanhos
					if (tamanhos && tamanhos.length > 0) {
						const stmt = database.prepare(
							"INSERT INTO tamanhos (componente_id, tamanho) VALUES (?, ?)",
						)
						for (const t of tamanhos) {
							const s = `${t.tamanhoInicial}-${t.tamanhoFinal}`
							stmt.run([componenteId, s])
						}
						stmt.finalize()
					}

					resolve({ success: true, message: "Componente criado", componenteId })
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao criar componente" + error?.toString(),
			})
		}
	})
}

export function updateComponente(
	modelo_id: number,
	componente_id: number,
	nome: string,
	dados?: ComponenteDados | null,
	tamanhos?: { tamanhoInicial: number; tamanhoFinal: number }[],
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			const dadosStr = dados ? JSON.stringify(dados) : null
			database.run(
				"UPDATE componentes SET nome = ?, dados = ? WHERE id = ? AND modelo_id = ?",
				[nome, dadosStr, componente_id, modelo_id],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao atualizar componente" })
						return
					}

					// atualizar tamanhos: remover os antigos e inserir novos
					database.run(
						"DELETE FROM tamanhos WHERE componente_id = ?",
						[componente_id],
						(e) => {
							if (e) {
								// continue mesmo se falhar
								console.error(e)
							}
							if (tamanhos && tamanhos.length > 0) {
								const stmt = database.prepare(
									"INSERT INTO tamanhos (componente_id, tamanho) VALUES (?, ?)",
								)
								for (const t of tamanhos) {
									const s = `${t.tamanhoInicial}-${t.tamanhoFinal}`
									stmt.run([componente_id, s])
								}
								stmt.finalize()
							}
							resolve({ success: true, message: "Componente atualizado" })
						},
					)
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao atualizar componente" + error?.toString(),
			})
		}
	})
}

export function deleteComponente(
	modelo_id: number,
	componente_id: number,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()

			// remover tamanhos e componentes relacionados
			database.run(
				"DELETE FROM tamanhos WHERE componente_id = ?",
				[componente_id],
				(err) => {
					if (err) console.error(err)
					database.run(
						"DELETE FROM componente_materiais WHERE componente_id = ?",
						[componente_id],
						(e) => {
							if (e) console.error(e)
							database.run(
								"DELETE FROM componentes WHERE id = ? AND modelo_id = ?",
								[componente_id, modelo_id],
								function (err2: Error | null) {
									if (err2) {
										resolve({
											success: false,
											message: "Erro ao deletar componente",
										})
										return
									}
									resolve({ success: true, message: "Componente deletado" })
								},
							)
						},
					)
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao deletar componente" + error?.toString(),
			})
		}
	})
}
