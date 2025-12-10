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

// ==================== Busca de Cadastro por Artigo ====================

export interface CadastroInfo {
	artigo: string
	modelo: string
	componente: string
	material: string
	cor: string
	largura: string
	tipoTecido: number
	paresCriac: string
	conjugNavalha: string
	placaPorPar: string
	camada: string
	espacamento: string
	comprimentoMax: string
}

/**
 * Busca modelo e componentes pelo artigo (com ou sem prefixo COR).
 * Retorna array de CadastroInfo (um item por componente encontrado).
 */
export function getCadastroByArtigo(artigo: string): Promise<CadastroInfo[]> {
	return new Promise((resolve) => {
		if (!artigo) {
			console.log("[models] getCadastroByArtigo: empty artigo")
			return resolve([])
		}

		const database = getDatabase()

		// Normalize: try exact match, digits-only, and LIKE
		const variants = [artigo]
		const digits = String(artigo).replace(/\D/g, "")
		if (digits && !variants.includes(digits)) variants.push(digits)

		console.log(
			"[models] getCadastroByArtigo called with:",
			artigo,
			"variants:",
			variants,
		)

		let idx = 0

		const tryNextVariant = (): void => {
			if (idx >= variants.length) {
				// fallback: LIKE on digits
				if (digits) {
					database.get(
						"SELECT id, artigo, nome FROM modelos WHERE artigo LIKE ? LIMIT 1",
						[`%${digits}%`],
						(err: Error | null, row: ModeloRow | undefined) => {
							if (err || !row) {
								console.log("[models] LIKE query no match")
								return resolve([])
							}
							console.log(
								"[models] LIKE query found modelo:",
								row.id,
								row.artigo,
							)
							loadComponentesForModelo(row)
						},
					)
					return
				}
				return resolve([])
			}

			const v = variants[idx++]
			database.get(
				"SELECT id, artigo, nome FROM modelos WHERE artigo = ? LIMIT 1",
				[v],
				(err: Error | null, row: ModeloRow | undefined) => {
					if (err) {
						console.log("[models] exact query error for", v, err)
						return tryNextVariant()
					}
					if (row) {
						console.log(
							"[models] exact match found modelo:",
							row.id,
							row.artigo,
						)
						loadComponentesForModelo(row)
						return
					}
					tryNextVariant()
				},
			)
		}

		const loadComponentesForModelo = (modelo: ModeloRow): void => {
			database.all(
				"SELECT id, modelo_id, numero_tecido, nome, dados FROM componentes WHERE modelo_id = ? ORDER BY id",
				[modelo.id],
				async (err: Error | null, compRows: ComponenteRow[]) => {
					if (err || !compRows || compRows.length === 0) {
						console.log("[models] no componentes found for modelo", modelo.id)
						return resolve([])
					}

					// Load materiais for reference
					database.all(
						"SELECT id, artigo, largura FROM materiais",
						[],
						(
							matErr: Error | null,
							materiais: Array<{ id: number; artigo: string; largura: number }>,
						) => {
							if (matErr) {
								console.log("[models] error loading materiais:", matErr)
							}
							const matMap = new Map<
								number,
								{ artigo: string; largura: number }
							>()
							for (const m of materiais || []) {
								matMap.set(m.id, { artigo: m.artigo, largura: m.largura })
							}

							// Load modelo_cores for reference
							database.all(
								"SELECT id, cor_abreviada, cor_completa FROM modelo_cores WHERE modelo_id = ?",
								[modelo.id],
								(
									corErr: Error | null,
									cores: Array<{
										id: number
										cor_abreviada: string
										cor_completa: string
									}>,
								) => {
									if (corErr) {
										console.log("[models] error loading cores:", corErr)
									}
									const corMap = new Map<number, string>()
									for (const c of cores || []) {
										corMap.set(c.id, c.cor_abreviada)
									}

									// Load tamanhos for each componente
									const resultPromises = compRows.map((comp) => {
										return new Promise<CadastroInfo>((resComp) => {
											database.all(
												"SELECT tamanho FROM tamanhos WHERE componente_id = ? ORDER BY id",
												[comp.id],
												(
													tamErr: Error | null,
													tamRows: Array<{ tamanho: string }>,
												) => {
													let dados: ComponenteDados | null = null
													if (comp.dados) {
														try {
															dados = JSON.parse(comp.dados) as ComponenteDados
														} catch {
															dados = null
														}
													}

													const mat = dados?.materialId
														? matMap.get(dados.materialId)
														: null
													const corIds = dados?.coresDisponiveis || []
													const corNames = corIds
														.map((cid) => corMap.get(Number(cid)) || cid)
														.join(",")

													// Build tamanhos string
													let tamanhosStr = ""
													if (tamRows && tamRows.length > 0) {
														const nums: number[] = []
														for (const t of tamRows) {
															const s = String(t.tamanho)
															if (s.includes("-")) {
																const [a, b] = s.split("-")
																const start = parseInt(a) || 0
																const end = parseInt(b) || start
																for (let n = start; n <= end; n++) nums.push(n)
															} else {
																const v = parseInt(s) || 0
																if (v) nums.push(v)
															}
														}
														if (nums.length > 0) {
															const min = Math.min(...nums)
															const max = Math.max(...nums)
															tamanhosStr = `${min}-${max}`
														}
													}

													const info: CadastroInfo = {
														artigo: modelo.artigo,
														modelo: modelo.nome,
														componente: comp.nome,
														material: mat?.artigo || "",
														cor: corNames,
														largura: mat?.largura?.toString() || "",
														tipoTecido: dados?.tipoTecido || 0,
														paresCriac: tamanhosStr,
														conjugNavalha: dados?.conjugacaoNavalha || "",
														placaPorPar: dados?.placaPar || "",
														camada: dados?.camadas?.toString() || "0",
														espacamento: dados?.espacamento?.toString() || "",
														comprimentoMax: dados?.compMaximo?.toString() || "",
													}

													resComp(info)
												},
											)
										})
									})

									Promise.all(resultPromises)
										.then((infos) => {
											console.log(
												"[models] getCadastroByArtigo returning",
												infos.length,
												"componentes",
											)
											resolve(infos)
										})
										.catch((e) => {
											console.log("[models] error building cadastro infos:", e)
											resolve([])
										})
								},
							)
						},
					)
				},
			)
		}

		tryNextVariant()
	})
}
