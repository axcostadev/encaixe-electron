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

export function listModelos(): Promise<Modelo[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, artigo, nome FROM modelos ORDER BY artigo",
				[],
				(err: Error | null, rows: ModeloRow[]) => {
					if (err) {
						console.error("Erro listando modelos:", err)
						resolve([])
						return
					}
					resolve((rows || []) as Modelo[])
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
						resolve({ success: false, message: "Erro ao criar modelo" })
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
				message: "Erro ao criar modelo" + (error as Error).toString(),
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
			// primeiro deletar tamanhos dos componentes
			database.run(
				"DELETE FROM tamanhos WHERE componente_id IN (SELECT id FROM componentes WHERE modelo_id = ?)",
				[id],
				(err) => {
					if (err) {
						console.error("Erro ao deletar tamanhos:", err)
					}
					// deletar componente_cores
					database.run(
						"DELETE FROM componente_cores WHERE componente_id IN (SELECT id FROM componentes WHERE modelo_id = ?)",
						[id],
						(err2) => {
							if (err2) {
								console.error("Erro ao deletar componente_cores:", err2)
							}
							// deletar componente_materiais
							database.run(
								"DELETE FROM componente_materiais WHERE componente_id IN (SELECT id FROM componentes WHERE modelo_id = ?)",
								[id],
								(err3) => {
									if (err3) {
										console.error("Erro ao deletar componente_materiais:", err3)
									}
									// deletar componentes
									database.run(
										"DELETE FROM componentes WHERE modelo_id = ?",
										[id],
										(err4) => {
											if (err4) {
												console.error("Erro ao deletar componentes:", err4)
											}
											// deletar cores relacionadas
											database.run(
												"DELETE FROM modelo_cores WHERE modelo_id = ?",
												[id],
												(err5) => {
													if (err5) {
														console.error("Erro ao deletar modelo_cores:", err5)
													}
													// finalmente deletar o modelo
													database.run(
														"DELETE FROM modelos WHERE id = ?",
														[id],
														function (err6: Error | null) {
															if (err6) {
																resolve({
																	success: false,
																	message: "Erro ao deletar modelo",
																})
																return
															}
															resolve({
																success: true,
																message: "Modelo deletado",
															})
														},
													)
												},
											)
										},
									)
								},
							)
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
	modelo_cor_id?: number
	setor_id?: number
	numero_tecido: string
	nome: string
	apelido?: string
	materialId?: number
	tipoTecido?: number
	conjugacaoNavalha?: string
	placaPar?: string
	camadas?: number
	espacamento?: number
	compMaximo?: number
	percPerda?: number
	redutorLargura?: number
	coresDisponiveis?: string[]
	tamanhos?: { tamanhoInicial: number; tamanhoFinal: number }[]
}

type ComponenteRow = {
	id: number
	modelo_id: number
	modelo_cor_id?: number
	setor_id?: number
	numero_tecido?: string
	nome: string
	apelido?: string
	material_id?: number
	tipo_tecido?: number
	conjugacao_navalha?: string
	placa_par?: string
	camadas?: number
	espacamento?: number
	comp_maximo?: number
	perc_perda?: number
	redutor_largura?: number
} 

export interface ComponenteDados {
	materialId: number
	apelido?: string
	tipoTecido?: number
	conjugacaoNavalha?: string
	placaPar?: string
	camadas?: number
	espacamento?: number
	compMaximo?: number
	percPerda?: number
	redutorLargura?: number
	coresDisponiveis?: string[]
	modeloCorId?: number
	setorId?: number
	numeroTecido?: string
} 

export function listComponentes(modelo_id: number): Promise<Componente[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()

			const loadComponentes = new Promise<ComponenteRow[]>((res, rej) => {
				database.all(
					`SELECT id, modelo_id, modelo_cor_id, setor_id, numero_tecido, nome, apelido, material_id, tipo_tecido, conjugacao_navalha, placa_par, camadas, espacamento, comp_maximo, perc_perda, redutor_largura
					 FROM componentes WHERE modelo_id = ? ORDER BY id`,
					[modelo_id],
					(err: Error | null, rows: ComponenteRow[]) => {
						if (err) {
							console.error("Erro listando componentes:", err)
							rej(err)
						} else {
							res(rows || [])
						}
					},
				)
			})

			const loadComponenteCores = new Promise<
				Array<{ componente_id: number; modelo_cor_id: number }>
			>((res, rej) => {
				database.all(
					"SELECT componente_id, modelo_cor_id FROM componente_cores WHERE componente_id IN (SELECT id FROM componentes WHERE modelo_id = ?) ORDER BY componente_id, id",
					[modelo_id],
					(
						err: Error | null,
						rows: Array<{ componente_id: number; modelo_cor_id: number }>,
					) => {
						if (err) {
							console.error("Erro carregando componente_cores:", err)
							rej(err)
						} else {
							res(rows || [])
						}
					},
				)
			})

			const loadTamanhos = new Promise<
				Array<{
					componente_id: number
					tamanho_inicial: number
					tamanho_final: number
				}>
			>((res, rej) => {
				database.all(
					"SELECT componente_id, tamanho_inicial, tamanho_final FROM tamanhos WHERE componente_id IN (SELECT id FROM componentes WHERE modelo_id = ?) ORDER BY componente_id, id",
					[modelo_id],
					(
						err: Error | null,
						rows: Array<{
							componente_id: number
							tamanho_inicial: number
							tamanho_final: number
						}>,
					) => {
						if (err) {
							console.error("Erro carregando tamanhos:", err)
							rej(err)
						} else {
							res(rows || [])
						}
					},
				)
			})

			Promise.all([loadComponentes, loadComponenteCores, loadTamanhos])
				.then(([compRows, ccRows, tamRows]) => {
					const ccMap = new Map<number, number[]>()
					for (const cc of ccRows) {
						if (!ccMap.has(cc.componente_id)) ccMap.set(cc.componente_id, [])
						ccMap.get(cc.componente_id)!.push(cc.modelo_cor_id)
					}

					const tamMap = new Map<
						number,
						{ tamanhoInicial: number; tamanhoFinal: number }[]
					>()
					for (const t of tamRows) {
						if (!tamMap.has(t.componente_id)) tamMap.set(t.componente_id, [])
						tamMap.get(t.componente_id)!.push({
							tamanhoInicial: t.tamanho_inicial,
							tamanhoFinal: t.tamanho_final,
						})
					}

					const componentes: Componente[] = compRows.map((r) => {
						const comp: Componente = {
							id: r.id,
							modelo_id: r.modelo_id,
							modelo_cor_id: r.modelo_cor_id,
							setor_id: r.setor_id,
							numero_tecido: r.numero_tecido || "",
							nome: r.nome,
							apelido: r.apelido || "",
							materialId: r.material_id || 0,
							tipoTecido: r.tipo_tecido || 0,
							conjugacaoNavalha: r.conjugacao_navalha || "",
							placaPar: r.placa_par || "",
							camadas: r.camadas || 0,
							espacamento: r.espacamento || 0,
							compMaximo: r.comp_maximo || 0,
							percPerda: r.perc_perda || 0,
							redutorLargura: r.redutor_largura || 0,
							coresDisponiveis: (ccMap.get(r.id) || []).map((id) => String(id)),
							tamanhos: tamMap.get(r.id) || [],
						}
						return comp
					})
					resolve(componentes)
				})
				.catch((err) => {
					console.error("Erro carregando dados:", err)
					resolve([])
				})
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
			// Extrair campos individuais de `dados` (compatível com front-end atual)
			// Extrair campos individuais de `dados` (compatível com front-end atual)
			const material_id = dados?.materialId || null
			const apelido = dados?.apelido || ""
			const tipo_tecido = dados?.tipoTecido || null
			const conjugacao_navalha = dados?.conjugacaoNavalha || null
			const placa_par = dados?.placaPar || null
			const camadas = dados?.camadas || null
			const espacamento = dados?.espacamento || null
			const comp_maximo = dados?.compMaximo || null
			const perc_perda = dados?.percPerda || null
			const redutor_largura = dados?.redutorLargura ?? null
			// Se modelo_cor_id não informado, usar primeira cor de coresDisponiveis
			let modelo_cor_id = dados?.modeloCorId || null
			if (
				!modelo_cor_id &&
				dados?.coresDisponiveis &&
				dados.coresDisponiveis.length > 0
			) {
				const firstCor = dados.coresDisponiveis[0]
				modelo_cor_id =
					typeof firstCor === "string" ? parseInt(firstCor) : firstCor
			}
			const setor_id = dados?.setorId || null
			const numero_tecido = dados?.numeroTecido || ""

			database.run(
				`INSERT INTO componentes (modelo_id, modelo_cor_id, setor_id, numero_tecido, nome, apelido, material_id, tipo_tecido, conjugacao_navalha, placa_par, camadas, espacamento, comp_maximo, perc_perda, redutor_largura)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					modelo_id,
					modelo_cor_id,
					setor_id,
					numero_tecido,
					nome,
					apelido,
					material_id,
					tipo_tecido,
					conjugacao_navalha,
					placa_par,
					camadas,
					espacamento,
					comp_maximo,
					perc_perda,
					redutor_largura,
				],
				function (err: Error | null) { 
					if (err) {
						console.error("Erro ao criar componente (SQL):", err)
						resolve({
							success: false,
							message:
								"Erro ao criar componente: " +
								(err && err.message ? err.message : String(err)),
						})
						return
					}
					const componenteId = this.lastID as number

					// inserir tamanhos (com colunas tamanho_inicial/tamanho_final)
					if (tamanhos && tamanhos.length > 0) {
						const stmt = database.prepare(
							"INSERT INTO tamanhos (componente_id, tamanho_inicial, tamanho_final) VALUES (?, ?, ?)",
						)
						for (const t of tamanhos) {
							stmt.run([componenteId, t.tamanhoInicial, t.tamanhoFinal])
						}
						stmt.finalize()
					}

					// inserir cores associadas (componente_cores)
					if (dados?.coresDisponiveis && dados.coresDisponiveis.length > 0) {
						const stmtC = database.prepare(
							"INSERT INTO componente_cores (componente_id, modelo_cor_id) VALUES (?, ?)",
						)
						for (const cid of dados.coresDisponiveis) {
							const mid = typeof cid === "string" ? parseInt(cid) : cid
							if (mid) stmtC.run([componenteId, mid])
						}
						stmtC.finalize()
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
			// Extrair campos individuais de `dados` (compatível com front-end atual)
			const material_id = dados?.materialId || null
			const apelido = dados?.apelido || ""
			console.log('[DB] updateComponente called for componente', componente_id, 'apelido:', JSON.stringify(apelido))
			const tipo_tecido = dados?.tipoTecido || null
			const conjugacao_navalha = dados?.conjugacaoNavalha || null
			const placa_par = dados?.placaPar || null
			const camadas = dados?.camadas || null
			const espacamento = dados?.espacamento || null
			const comp_maximo = dados?.compMaximo || null
			const perc_perda = dados?.percPerda || null
			const redutor_largura = dados?.redutorLargura || null

			database.run(
				`UPDATE componentes SET nome = ?, apelido = ?, modelo_cor_id = ?, setor_id = ?, numero_tecido = ?, material_id = ?, tipo_tecido = ?, conjugacao_navalha = ?, placa_par = ?, camadas = ?, espacamento = ?, comp_maximo = ?, perc_perda = ?, redutor_largura = ? WHERE id = ? AND modelo_id = ?`,
				[
					nome,
					apelido,
					dados?.modeloCorId || null,
					dados?.setorId || null,
					dados?.numeroTecido || "",
					material_id,
					tipo_tecido,
					conjugacao_navalha,
					placa_par,
					camadas,
					espacamento,
					comp_maximo,
					perc_perda,
					redutor_largura,
					componente_id,
					modelo_id,
				],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao atualizar componente" })
						return
					}

					const updateTamanhos = () => {
					// Verificar valor salvo imediatamente após o UPDATE
					database.get("SELECT apelido FROM componentes WHERE id = ? AND modelo_id = ?", [componente_id, modelo_id], (getErr: Error | null, row?: { apelido?: string }) => {
						if (getErr) console.error('[DB] SELECT after UPDATE error', getErr)
						else console.log('[DB] SELECT after UPDATE for componente', componente_id, 'apelido in DB =', row?.apelido)
					})

						if (tamanhos !== undefined) {
							database.run(
								"DELETE FROM tamanhos WHERE componente_id = ?",
								[componente_id],
								(e) => {
									if (e) {
										console.error(e)
									}
									if (tamanhos && tamanhos.length > 0) {
										const stmt = database.prepare(
											"INSERT INTO tamanhos (componente_id, tamanho_inicial, tamanho_final) VALUES (?, ?, ?)",
										)
										for (const t of tamanhos) {
											stmt.run([
												componente_id,
												t.tamanhoInicial,
												t.tamanhoFinal,
											])
										}
										stmt.finalize()
									}
									updateCores()
								},
							)
						} else {
							updateCores()
						}
					}

					const updateCores = () => {
						if (dados?.coresDisponiveis !== undefined) {
							database.run(
								"DELETE FROM componente_cores WHERE componente_id = ?",
								[componente_id],
								(ccErr) => {
									if (ccErr) console.error(ccErr)
									if (
										dados?.coresDisponiveis &&
										dados.coresDisponiveis.length > 0
									) {
										const stmtC = database.prepare(
											"INSERT INTO componente_cores (componente_id, modelo_cor_id) VALUES (?, ?)",
										)
										for (const cid of dados.coresDisponiveis) {
											const mid = typeof cid === "string" ? parseInt(cid) : cid
											if (mid) stmtC.run([componente_id, mid])
										}
										stmtC.finalize()
									}
									resolve({ success: true, message: "Componente atualizado" })
								},
							)
						} else {
							resolve({ success: true, message: "Componente atualizado" })
						}
					}

					updateTamanhos()
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
	apelido: string
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
	tamanhos?: number[] // lista de tamanhos individuais cadastrados
	setorId?: number // ID do setor (máquina)
	setorNome?: string // Nome do setor (EMMA, LECTRA, COMELZ)
	tamanhosRanges?: { tamanhoInicial: number; tamanhoFinal: number }[] // Ranges originais dos tamanhos
	sentidoMaterial?: string // Sentido do material (S, N, U)
	numeroTecido?: string // Número do tecido para fabric_type no Lectra
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
				"SELECT id, modelo_id, numero_tecido, nome, apelido, modelo_cor_id, material_id, tipo_tecido, conjugacao_navalha, placa_par, camadas, espacamento, comp_maximo, perc_perda, redutor_largura, setor_id FROM componentes WHERE modelo_id = ? ORDER BY id",
				[modelo.id],
				async (err: Error | null, compRows: ComponenteRow[]) => {
					if (err || !compRows || compRows.length === 0) {
						console.log("[models] no componentes found for modelo", modelo.id)
						return resolve([])
					}

					// Load materiais for reference (including sentido)
					database.all(
						"SELECT id, artigo, largura, sentido FROM materiais",
						[],
						(
							matErr: Error | null,
							materiais: Array<{ id: number; artigo: string; largura: number; sentido: string }>,
						) => {
							if (matErr) {
								console.log("[models] error loading materiais:", matErr)
							}
							const matMap = new Map<
								number,
								{ artigo: string; largura: number; sentido: string }
							>()
							for (const m of materiais || []) {
								matMap.set(m.id, { artigo: m.artigo, largura: m.largura, sentido: m.sentido || "S" })
							}

							// Load setores for reference
							database.all(
								"SELECT id, nome FROM setores",
								[],
								(
									setorErr: Error | null,
									setoresRows: Array<{ id: number; nome: string }>,
								) => {
									if (setorErr) {
										console.log("[models] error loading setores:", setorErr)
									}
									const setorMap = new Map<number, string>()
									for (const s of setoresRows || []) {
										setorMap.set(s.id, s.nome)
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
												"SELECT tamanho_inicial, tamanho_final FROM tamanhos WHERE componente_id = ? ORDER BY id",
												[comp.id],
												(
													tamErr: Error | null,
													tamRows: Array<{
														tamanho_inicial?: number
														tamanho_final?: number
													}>,
												) => {
													if (tamErr) {
														console.log(
															"[models] error loading tamanhos:",
															tamErr,
														)
													}
													console.log(
														"[models] tamanhos loaded for comp",
														comp.id,
														":",
														tamRows,
													)

													// load cores for this componente
													database.all(
														"SELECT modelo_cor_id FROM componente_cores WHERE componente_id = ?",
														[comp.id],
														(
															ccErr: Error | null,
															ccRows: Array<{ modelo_cor_id: number }>,
														) => {
															if (ccErr) {
																console.log(
																	"[models] error loading componente_cores:",
																	ccErr,
																)
															}
															const corIds = (ccRows || []).map((c) =>
																String(c.modelo_cor_id),
															)
															const corNames = corIds
																.map((cid) => corMap.get(Number(cid)) || cid)
																.join(",")

															// Build tamanhos array, ranges, and string
															let tamanhosStr = ""
															const tamanhosArray: number[] = []
															const tamanhosRanges: { tamanhoInicial: number; tamanhoFinal: number }[] = []
															if (tamRows && tamRows.length > 0) {
																for (const t of tamRows) {
																	if (
																		typeof t.tamanho_inicial === "number" &&
																		typeof t.tamanho_final === "number"
																	) {
																		// Salvar os ranges originais
																		tamanhosRanges.push({
																			tamanhoInicial: t.tamanho_inicial,
																			tamanhoFinal: t.tamanho_final
																		})
																		for (
																			let n = t.tamanho_inicial;
																			n <= t.tamanho_final;
																			n++
																		)
																			tamanhosArray.push(n)
																	}
																}
																if (tamanhosArray.length > 0) {
																	const min = Math.min(...tamanhosArray)
																	const max = Math.max(...tamanhosArray)
																	tamanhosStr = `${min}-${max}`
																}
															}
															console.log(
																"[models] tamanhosArray for comp",
																comp.id,
																":",
																tamanhosArray,
															)

															const mat = comp.material_id
						? matMap.get(comp.material_id)
						: null
						
						// Get setor name
						const setorNome = comp.setor_id
							? setorMap.get(comp.setor_id) || ""
							: ""
						
						// Apply redutor_largura if present (stored as centesimos, e.g., 3 -> 0.03)
						const redutor = (comp as any).redutor_largura || 0
						let larguraAjustada = mat?.largura ?? 0
						if (redutor) {
							larguraAjustada = Math.round((larguraAjustada - redutor / 100) * 100) / 100
						}
						const info: CadastroInfo = {
							artigo: modelo.artigo,
							modelo: modelo.nome,
							componente: comp.nome,
							apelido: comp.apelido || "",
							material: mat?.artigo || "",
							cor: corNames,
				tipoTecido: (comp as any).tipo_tecido || 0,
							largura: larguraAjustada?.toString() || "",
																paresCriac: tamanhosStr,
																conjugNavalha: comp.conjugacao_navalha || "",
																placaPorPar: comp.placa_par || "",
																camada: String(comp.camadas || "0"),
																espacamento: String(comp.espacamento || ""),
																comprimentoMax: String(comp.comp_maximo || ""),
																tamanhos: tamanhosArray.sort((a, b) => a - b),
																setorId: comp.setor_id,
																setorNome: setorNome.toUpperCase(),
																tamanhosRanges: tamanhosRanges,
																sentidoMaterial: mat?.sentido || "S",
																numeroTecido: comp.numero_tecido || "",
															}

															resComp(info)
														},
													)
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
		},
			)
		}

		tryNextVariant()
	})
}

// ------------------ Migration helpers ------------------

export function hasColumnRedutorLargura(): Promise<boolean> {
	return new Promise((resolve) => {
		const db = getDatabase()
		db.all("PRAGMA table_info('componentes')", [], (err: Error | null, rows: any[]) => {
			if (err) {
				console.error('[models] PRAGMA table_info error', err)
				return resolve(false)
			}
			const found = (rows || []).some((r) => String(r.name).toLowerCase() === 'redutor_largura')
			resolve(found)
		})
	})
}

export function addRedutorLarguraColumn(): Promise<{ success: boolean; message: string }> {
	return new Promise(async (resolve) => {
		try {
			const exists = await hasColumnRedutorLargura()
			if (exists) {
				return resolve({ success: true, message: 'Coluna já existe' })
			}
			const db = getDatabase()
			db.run(
				'ALTER TABLE componentes ADD COLUMN redutor_largura NUMERIC DEFAULT 0',
				(err: Error | null) => {
					if (err) {
						console.error('[models] Error adding redutor_largura column:', err)
						return resolve({ success: false, message: err.message || String(err) })
					}
					resolve({ success: true, message: 'Coluna adicionada com sucesso' })
				},
			)
		} catch (e: any) {
			console.error('[models] addRedutorLarguraColumn exception', e)
			resolve({ success: false, message: e?.message || String(e) })
		}
	})
}

// ==================== Setores ====================

export interface Setor {
	id: number
	nome: string
}

type SetorRow = {
	id: number
	nome: string
}

export function listSetores(): Promise<Setor[]> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.all(
				"SELECT id, nome FROM setores ORDER BY nome",
				[],
				(err: Error | null, rows: SetorRow[]) => {
					if (err) {
						console.error("Erro listando setores:", err)
						resolve([])
						return
					}
					resolve((rows || []) as Setor[])
				},
			)
		} catch (error) {
			console.error(error)
			resolve([])
		}
	})
}

export function createSetor(
	nome: string,
): Promise<{ success: boolean; message: string; setor?: Setor }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"INSERT INTO setores (nome) VALUES (?)",
				[nome],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao criar setor" })
						return
					}
					resolve({
						success: true,
						message: "Setor criado",
						setor: { id: this.lastID as number, nome },
					})
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao criar setor" + (error as Error).toString(),
			})
		}
	})
}

export function updateSetor(
	id: number,
	nome: string,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"UPDATE setores SET nome = ? WHERE id = ?",
				[nome, id],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao atualizar setor" })
						return
					}
					resolve({ success: true, message: "Setor atualizado" })
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao atualizar setor" + error?.toString(),
			})
		}
	})
}

export function deleteSetor(
	id: number,
): Promise<{ success: boolean; message: string }> {
	return new Promise((resolve) => {
		try {
			const database = getDatabase()
			database.run(
				"DELETE FROM setores WHERE id = ?",
				[id],
				function (err: Error | null) {
					if (err) {
						resolve({ success: false, message: "Erro ao deletar setor" })
						return
					}
					resolve({ success: true, message: "Setor deletado" })
				},
			)
		} catch (error) {
			resolve({
				success: false,
				message: "Erro ao deletar setor" + error?.toString(),
			})
		}
	})
}
