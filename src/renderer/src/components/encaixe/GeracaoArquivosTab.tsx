import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@renderer/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@renderer/components/ui/table"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@renderer/components/ui/card"
import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@renderer/components/ui/alert"
import { useEncaixe } from "@renderer/hooks/useEncaixe"
import { useAuth } from "@renderer/contexts/AuthContext"
import { activityLogger } from "@renderer/services/activityLogger"
import {
	PedidoComelz,
	PedidoEmma,
	ModelDataLectra,
	QtyRuleComelz,
} from "@renderer/types"

import { ListaAutomaticoItem } from "@renderer/pages/EncaixePage"
import { ListPlus, ChevronDown, ChevronUp } from "lucide-react"

type GradePar = {
	artigo: string
	modelo: string
	codigoCor: string
	grade: string
	pares: number
}

type CadastroInfo = {
	artigo: string
	modelo: string
	componente: string
	apelido: string
	material: string
	cor: string
	largura: string
	paresCriac: string
	conjugNavalha: string
	placaPorPar: string
	camada: string
	espacamento: string
	comprimentoMax: string
	tamanhos?: number[]
	setorId?: number
	setorNome?: string
	tamanhosRanges?: { tamanhoInicial: number; tamanhoFinal: number }[]
	sentidoMaterial?: string
	numeroTecido?: string // Número do tecido para fabric_type no Lectra
}

// Mapeamento de pares por tamanho para cada cor
type ParesPorTamanho = {
	[tamanho: number]: number
}

type ParesPorCor = {
	codigoCor: string
	pares: ParesPorTamanho
}

type QtyItem = {
	part_name: string
	part_size: string
	mirror: boolean
	parts: number
	angle: number
	toler: number
	material_name: string
	material_x: number
	material_y: number
	material_unit: string
	part_space: number
	material_plies_up: number
	material_plies_down: number
	material_margin: number
}

/**
 * Realiza o cálculo de folhas/encaixe baseado nos parâmetros do componente.
 * Usado para Lectra e Comelz.
 *
 * @param pares Número total de pares para o tamanho/range
 * @param placaPar Número de peças por par (placa par)
 * @param conjugacaoNavalha Valor da conjugação de navalhas
 * @param camadas Número de camadas
 * @returns Resultado do cálculo, arredondado para cima
 */
function calcularFolhas(
	pares: number,
	placaPar: number,
	conjugacaoNavalha: number,
	camadas: number
): number {
	// Evitar divisão por zero
	if (conjugacaoNavalha === 0 || camadas === 0) {
		console.error("Erro: 'conjugacaoNavalha' ou 'camadas' não pode ser zero.")
		return 0
	}

	// Cálculo: ((pares x placaPar) / conjugacaoNavalha) / camadas 
	// TODO: Corrigir o divisor 2 pois o gerador de arquivo esta com erro (saindo dobrado)
	const resultadoBruto = (pares * placaPar) / conjugacaoNavalha / camadas / 2
	return Math.ceil(resultadoBruto)
}

/**
 * Agrupa os pares por ranges de tamanhos e retorna o último tamanho de cada range com os pares somados.
 * Exemplo: Range 34-35 com 40 pares em 34 e 50 pares em 35 = { tamanho: 35, pares: 90 }
 */
function agruparParesPorRanges(
	paresPorTamanho: { [tamanho: number]: number },
	tamanhosRanges: { tamanhoInicial: number; tamanhoFinal: number }[]
): { tamanho: number; pares: number }[] {
	const resultado: { tamanho: number; pares: number }[] = []

	for (const range of tamanhosRanges) {
		let totalPares = 0
		// Soma todos os pares dentro do range
		for (let tam = range.tamanhoInicial; tam <= range.tamanhoFinal; tam++) {
			totalPares += paresPorTamanho[tam] || 0
		}
		// Usa o tamanho final como o tamanho principal
		resultado.push({
			tamanho: range.tamanhoFinal,
			pares: totalPares,
		})
	}

	return resultado
}

export function GeracaoArquivosTab({ onAdicionarLista }: { onAdicionarLista: (item: ListaAutomaticoItem) => void }) {
	const { user } = useAuth()
	const [ofSearch, setOfSearch] = useState("")
	const [artigoSearch, setArtigoSearch] = useState("")
	const [gradePares, setGradePares] = useState<GradePar[]>([])
	const [cadastrosInfo, setCadastrosInfo] = useState<CadastroInfo[]>([])
	const [cadastroMinimizado, setCadastroMinimizado] = useState(true)
	const [gradeMinimizada, setGradeMinimizada] = useState(true)
	const [componenteSelecionado, setComponenteSelecionado] = useState<
		string | null
	>(null)
	const [maquinaSelecionada, setMaquinaSelecionada] = useState<string>("Emma")
	const [message, setMessage] = useState<string>("")

	// Estados para gerenciamento de apelidos
	const [apelidosMap, setApelidosMap] = useState<Record<string, string>>({})
	const [apelidoSelecionado, setApelidoSelecionado] = useState<string>("")

	// Estado para gerenciar pares por tamanho e cor
	const [paresPorCorTamanho, setParesPorCorTamanho] = useState<ParesPorCor[]>(
		[],
	)
	
	// Caminhos configurados das settings
	const [comelzBasePath, setComelzBasePath] = useState("O:\\Lectra\\Calcado\\Modelos\\COMELZ")
	const [emmaBasePath, setEmmaBasePath] = useState("O:\\Lectra\\Calcado\\Modelos\\EMMA")
	const [defaultCustomerName, setDefaultCustomerName] = useState("VULCABRAS")
	
	// Carregar configurações na inicialização
	useEffect(() => {
		async function loadPaths() {
			try {
				const res = await (window as any).api.settings.get()
				if (res && res.success && res.settings) {
					if (res.settings.comelzModelBasePath) setComelzBasePath(res.settings.comelzModelBasePath)
					if (res.settings.emmaModelBasePath) setEmmaBasePath(res.settings.emmaModelBasePath)
					if (res.settings.defaultCustomerName) setDefaultCustomerName(res.settings.defaultCustomerName)
				}
			} catch (err) {
				console.error('Erro carregando paths das configurações:', err)
			}
		}
		loadPaths()
	}, [])

	const {
		loading,
		buscarOF: buscarOFHook,
		buscarArtigo: buscarArtigoHook,
		converterParaComelz,
		converterParaEmma,
		converterParaLectra,
		exportarArquivo,
	} = useEncaixe()

	// Carregar todos os apelidos cadastrados ao montar o componente
	useEffect(() => {
		async function carregarApelidos() {
			try {
				const apelidos: Record<string, string> = await (
					window as unknown as Window
				).api.apelidosAPI.getAll()
				setApelidosMap(apelidos || {})
			} catch (err) {
				console.error("Erro ao carregar apelidos:", err)
			}
		}
		carregarApelidos()
	}, [])

	// Função para inicializar os pares por tamanho baseado na grade da OF e tamanhos cadastrados
	function inicializarParesPorTamanho(
		gradeData: GradePar[],
		tamanhosCadastrados: number[],
	) {
		if (!tamanhosCadastrados || tamanhosCadastrados.length === 0) {
			setParesPorCorTamanho([])
			return
		}

		// Agrupa os pares da OF por código de cor
		const paresPorCor: ParesPorCor[] = []

		// Pega todas as cores únicas da grade
		const coresUnicas = [...new Set(gradeData.map((g) => g.codigoCor))]

		for (const codigoCor of coresUnicas) {
			// Pega TODOS os itens da grade para essa cor (pode ter múltiplos tamanhos)
			const gradeItems = gradeData.filter((g) => g.codigoCor === codigoCor)

			// Inicializa os pares para cada tamanho com 0
			const pares: ParesPorTamanho = {}
			for (const tam of tamanhosCadastrados) {
				pares[tam] = 0
			}

			// Mapeia cada item da grade para o tamanho correspondente
			for (const gradeItem of gradeItems) {
				if (gradeItem.grade) {
					const gradeNum = parseInt(gradeItem.grade)
					if (!isNaN(gradeNum) && tamanhosCadastrados.includes(gradeNum)) {
						// Soma os pares caso haja duplicatas do mesmo tamanho
						pares[gradeNum] = (pares[gradeNum] || 0) + (gradeItem.pares || 0)
					}
				}
			}

			paresPorCor.push({ codigoCor, pares })
		}

		setParesPorCorTamanho(paresPorCor)
	}

	async function buscarOF() {
		if (!ofSearch || ofSearch.length !== 9) {
			setMessage("Digite uma OF válida com 9 dígitos")
			return
		}

		setMessage("")
		const result = await buscarOFHook(ofSearch)
		setGradePares(result)
		setParesPorCorTamanho([]) // Limpa os pares por tamanho

		// Log de auditoria para busca de OF
		activityLogger.logSearchOF(user, ofSearch, result.length)

		if (result.length === 0) {
			setMessage("OF não encontrada nos arquivos CTF/CTC")
		} else {
			// Auto-preencher o campo artigo com "COR" + artigo da primeira linha
			const primeiroArtigo = result[0]?.artigo
			if (primeiroArtigo) {
				const artigoComCOR = primeiroArtigo.startsWith("COR")
					? primeiroArtigo
					: "COR" + primeiroArtigo
				setArtigoSearch(artigoComCOR)

				// Extrair as cores únicas da OF (código cor sem os números no início)
				// Ex: "9169 PTRL4" -> pega "PTRL4"
				const coresDaOF = [...new Set(result.map((g) => {
					const codigoCor = g.codigoCor || ""
					// Extrai a parte alfabética do código de cor (ex: "9169 PTRL4" -> "PTRL4")
					const partes = codigoCor.split(" ")
					return partes.length > 1 ? partes[partes.length - 1].toUpperCase() : codigoCor.toUpperCase()
				}))].filter(c => c.length > 0)

				// Buscar cadastros automaticamente após preencher o artigo
				setCadastrosInfo([])
				setComponenteSelecionado(null)
				const cadastros = await buscarArtigoHook(artigoComCOR)
				if (cadastros.length === 0) {
					setMessage("Nenhum cadastro encontrado para o artigo informado")
				} else {
					// Filtrar componentes que têm pelo menos uma das cores da OF
					const cadastrosFiltrados = cadastros.filter((cadastro) => {
						if (!cadastro.cor) return false
						// As cores do componente estão separadas por vírgula
						const coresDoComponente = cadastro.cor.split(",").map(c => c.trim().toUpperCase())
						// Verifica se alguma cor da OF está nas cores do componente
						return coresDaOF.some(corOF => coresDoComponente.includes(corOF))
					})

					if (cadastrosFiltrados.length === 0) {
						setMessage(`Nenhum componente encontrado para as cores da OF: ${coresDaOF.join(", ")}`)
						// Mostrar todos os cadastros como fallback
						setCadastrosInfo(cadastros)
					} else {
						setCadastrosInfo(cadastrosFiltrados)
					}
					
					// Se houver tamanhos no primeiro cadastro filtrado, inicializa os pares
					const primeiroCadastro = cadastrosFiltrados.length > 0 ? cadastrosFiltrados[0] : cadastros[0]
					if (primeiroCadastro?.tamanhos && primeiroCadastro.tamanhos.length > 0) {
						inicializarParesPorTamanho(result, primeiroCadastro.tamanhos)
					}
				}
			}
		}
	}

	// Note: explicit artigo search is handled via buscarOF which auto-calls buscarArtigoHook.

	// Função para selecionar componente e atualizar tamanhos
	function selecionarComponente(nomeComponente: string) {
		setComponenteSelecionado(nomeComponente)
		// Encontra o cadastro do componente selecionado
		const cadastro = cadastrosInfo.find((c) => c.componente === nomeComponente)
		if (cadastro?.tamanhos && cadastro.tamanhos.length > 0) {
			inicializarParesPorTamanho(gradePares, cadastro.tamanhos)
		}
		
		// Auto-selecionar apelido do cadastro
		if (cadastro?.apelido) {
			setApelidoSelecionado(cadastro.apelido)
		} else {
			// Fallback: verificar no mapa de apelidos antigos
			const apelidoAntigo = apelidosMap[nomeComponente.toLowerCase()]
			setApelidoSelecionado(apelidoAntigo || "")
		}
		
		// Auto-selecionar máquina baseado no setor do componente
		if (cadastro?.setorNome) {
			const setorUpper = cadastro.setorNome.toUpperCase()
			if (setorUpper.includes("EMMA")) {
				setMaquinaSelecionada("Emma")
			} else if (setorUpper.includes("LECTRA")) {
				setMaquinaSelecionada("Lectra")
			} else if (setorUpper.includes("COMELZ")) {
				setMaquinaSelecionada("Comelz")
			} else if (setorUpper.includes("PONTE")) {
				setMaquinaSelecionada("Ponte")
			}
		}
	}

	// Função para atualizar os pares de um tamanho específico para uma cor
	function atualizarPares(codigoCor: string, tamanho: number, valor: number) {
		setParesPorCorTamanho((prev) =>
			prev.map((item) => {
				if (item.codigoCor === codigoCor) {
					return {
						...item,
						pares: {
							...item.pares,
							[tamanho]: valor,
						},
					}
				}
				return item
			}),
		)
	}

	// Função para adicionar item à lista automático
	async function adicionarNaListaAutomatico() {
		if (!componenteSelecionado) {
			setMessage("Selecione um componente primeiro")
			return
		}

		if (!ofSearch) {
			setMessage("Busque uma OF primeiro")
			return
		}

		if (!apelidoSelecionado) {
			setMessage("Selecione um apelido para o nome do arquivo")
			return
		}

		const cadastroSelecionado = cadastrosInfo.find(
			(c) => c.componente === componenteSelecionado,
		)

		if (!cadastroSelecionado) {
			setMessage("Cadastro não encontrado para o componente selecionado")
			return
		}

		try {
			let dados: PedidoComelz | PedidoEmma | ModelDataLectra[] | null = null

			// Converter de acordo com a máquina selecionada
			if (maquinaSelecionada === "Emma") {
				if (paresPorCorTamanho.length > 0) {
					const qtyItems: QtyItem[] = []

					for (const corData of paresPorCorTamanho) {
						// Agrupar pares por ranges de tamanhos (se houver ranges definidos)
						if (cadastroSelecionado.tamanhosRanges && cadastroSelecionado.tamanhosRanges.length > 0) {
							const paresAgrupados = agruparParesPorRanges(
								corData.pares,
								cadastroSelecionado.tamanhosRanges
							)
							
							for (const item of paresAgrupados) {
								if (item.pares > 0) {
									qtyItems.push({
										part_name: cadastroSelecionado.numeroTecido || "",
										part_size: String(Number(item.tamanho).toFixed(2)),
										mirror: false,
										parts: item.pares,
										angle: 90,
										toler: 10,
										material_name: cadastroSelecionado.material || "",
										material_x: 1.41,
										material_y: parseFloat(cadastroSelecionado.largura) || 10,
										material_unit: "m",
										part_space: parseFloat(cadastroSelecionado.espacamento) || 1.5,
										material_plies_up: parseInt(cadastroSelecionado.camada) || 12,
										material_plies_down: 0,
										material_margin: 0,
									})
								}
							}
						} else {
							// Sem ranges, usar tamanhos individuais
							const tamanhos = cadastroSelecionado.tamanhos || []
							for (const tam of tamanhos) {
								const pares = corData.pares[tam] || 0
								if (pares > 0) {
									qtyItems.push({
										part_name: cadastroSelecionado.numeroTecido || "",
										part_size: String(Number(tam).toFixed(2)),
										mirror: false,
										parts: pares,
										angle: 90,
										toler: 10,
										material_name: cadastroSelecionado.material || "",
										material_x: 1.41,
										material_y: parseFloat(cadastroSelecionado.largura) || 10,
										material_unit: "m",
										part_space: parseFloat(cadastroSelecionado.espacamento) || 1.5,
										material_plies_up: parseInt(cadastroSelecionado.camada) || 12,
										material_plies_down: 0,
										material_margin: 0,
									})
								}
							}
						}
					}

					const modelPath = `${emmaBasePath}\\${cadastroSelecionado.artigo}.emp`

					dados = {
						customer: defaultCustomerName,
						date: new Date().toISOString().split("T")[0].replace(/-/g, ""),
						id: ofSearch,
						model: modelPath,
						qty: qtyItems,
					} as PedidoEmma
				} else {
					dados = await converterParaEmma(cadastroSelecionado)
				}
			} else if (maquinaSelecionada === "Comelz") {
				// Gerar dados Comelz com cálculo de folhas
				if (paresPorCorTamanho.length > 0 && cadastroSelecionado.tamanhosRanges) {
					const placaPar = parseInt(cadastroSelecionado.placaPorPar) || 1
					const conjugNavalha = parseInt(cadastroSelecionado.conjugNavalha) || 1
					const camadas = parseInt(cadastroSelecionado.camada) || 1
					
					const qtyRules: QtyRuleComelz[] = []
					
					for (const corData of paresPorCorTamanho) {
						const paresAgrupados = agruparParesPorRanges(
							corData.pares,
							cadastroSelecionado.tamanhosRanges
						)
						
						for (const item of paresAgrupados) {
							if (item.pares > 0) {
								const folhas = calcularFolhas(item.pares, placaPar, conjugNavalha, camadas)
								
								qtyRules.push({
									part_name: cadastroSelecionado.componente || cadastroSelecionado.artigo,
									part_size: String(Number(item.tamanho).toFixed(2)),
									mirror: false,
									parts: folhas,
							extra: "",
								})
							}
						}
					}
					
					const pastaArtigoComelz = `${cadastroSelecionado.artigo} - ${cadastroSelecionado.modelo}`
					const modelPathComelz = `${comelzBasePath}\\${pastaArtigoComelz}\\${cadastroSelecionado.componente}.cmz`
					
					dados = {
						id: ofSearch,
						date: new Date().toISOString().split("T")[0].replace(/-/g, ""),
						note: `OF: ${ofSearch}`,
						customer: defaultCustomerName,
						split_materials: false,
						model: modelPathComelz,
						qty: qtyRules,
					} as PedidoComelz
				} else {
					dados = await converterParaComelz(cadastroSelecionado)
				}
			} else if (maquinaSelecionada === "Lectra" || maquinaSelecionada === "Ponte") {
				// Gerar dados Lectra/Ponte com cálculo de folhas
				if (paresPorCorTamanho.length > 0 && cadastroSelecionado.tamanhosRanges) {
					const placaPar = parseInt(cadastroSelecionado.placaPorPar) || 1
					const conjugNavalha = parseInt(cadastroSelecionado.conjugNavalha) || 1
					const camadas = parseInt(cadastroSelecionado.camada) || 1
					
					const modelDataArray: ModelDataLectra[] = []
					
					for (const corData of paresPorCorTamanho) {
						const paresAgrupados = agruparParesPorRanges(
							corData.pares,
							cadastroSelecionado.tamanhosRanges
						)
						
						for (const item of paresAgrupados) {
							if (item.pares > 0) {
								const folhas = calcularFolhas(item.pares, placaPar, conjugNavalha, camadas)
								
								modelDataArray.push({
									// model_variant: artigo do modelo (ex: COR43245330)
									codigo: cadastroSelecionado.artigo || cadastroSelecionado.componente,
									// model_size: numeração/tamanho
									tamanho: item.tamanho,
									// model_quantity e model_fully_marked_number: pares (folhas)
									a: folhas,
									b: 0,
									c: 0,
									d: 0,
								})
							}
						}
					}
					
					dados = modelDataArray
				} else {
					dados = await converterParaLectra(cadastroSelecionado)
				}
			}

			if (!dados) {
				setMessage("Erro ao converter dados")
				return
			}

			// Adicionar à lista com dados extras do cadastro para Lectra
			onAdicionarLista({
				of: ofSearch,
				componente: componenteSelecionado,
				apelido: apelidoSelecionado,
				maquina: maquinaSelecionada,
				dados: dados,
				espacamento: cadastroSelecionado.espacamento,
				sentidoMaterial: cadastroSelecionado.sentidoMaterial,
				largura: cadastroSelecionado.largura,
				numeroTecido: cadastroSelecionado.numeroTecido,
			})

			// Log de auditoria para adicionar na lista
			activityLogger.logAddToList(user, ofSearch, componenteSelecionado, apelidoSelecionado, maquinaSelecionada)

			setMessage(`Item adicionado à lista: ${ofSearch}-${apelidoSelecionado}`)
		} catch (err) {
			console.error("Erro ao preparar dados:", err)
			setMessage("Erro ao preparar dados: " + String(err))
		}
	}

	async function gerarArquivo() {
		if (!componenteSelecionado) {
			setMessage("Selecione um componente primeiro")
			return
		}

		if (gradePares.length === 0) {
			setMessage("Busque uma OF primeiro para gerar o arquivo")
			return
		}

		if (!apelidoSelecionado) {
			setMessage("Selecione um apelido para o nome do arquivo")
			return
		}

		setMessage("")

		const cadastroSelecionado = cadastrosInfo.find(
			(c) => c.componente === componenteSelecionado,
		)

		if (!cadastroSelecionado) {
			setMessage("Cadastro não encontrado para o componente selecionado")
			return
		}

		try {
			let dados: PedidoComelz | PedidoEmma | ModelDataLectra[] | null = null

			// Converter de acordo com a máquina selecionada
			if (maquinaSelecionada === "Emma") {
				// Gerar JSON Emma usando os pares por tamanho preenchidos
				if (paresPorCorTamanho.length > 0) {
					const qtyItems: QtyItem[] = []

					for (const corData of paresPorCorTamanho) {
						// Agrupar pares por ranges de tamanhos (se houver ranges definidos)
						if (cadastroSelecionado.tamanhosRanges && cadastroSelecionado.tamanhosRanges.length > 0) {
							const paresAgrupados = agruparParesPorRanges(
								corData.pares,
								cadastroSelecionado.tamanhosRanges
							)
							
							for (const item of paresAgrupados) {
								if (item.pares > 0) {
									qtyItems.push({
										part_name: cadastroSelecionado.numeroTecido || "",
										part_size: String(Number(item.tamanho).toFixed(2)),
										mirror: false,
										parts: item.pares,
										angle: 90,
										toler: 10,
										material_name: cadastroSelecionado.material || "",
										material_x: 1.41,
										material_y: parseFloat(cadastroSelecionado.largura) || 10,
										material_unit: "m",
										part_space: parseFloat(cadastroSelecionado.espacamento) || 1.5,
										material_plies_up: parseInt(cadastroSelecionado.camada) || 12,
										material_plies_down: 0,
										material_margin: 0,
									})
								}
							}
						} else {
							// Sem ranges, usar tamanhos individuais
							const tamanhos = cadastroSelecionado.tamanhos || []
							for (const tam of tamanhos) {
								const pares = corData.pares[tam] || 0
								if (pares > 0) {
									qtyItems.push({
										part_name: cadastroSelecionado.numeroTecido || "",
										part_size: String(Number(tam).toFixed(2)),
										mirror: false,
										parts: pares,
										angle: 90,
										toler: 10,
										material_name: cadastroSelecionado.material || "",
										material_x: 1.41,
										material_y: parseFloat(cadastroSelecionado.largura) || 10,
										material_unit: "m",
										part_space: parseFloat(cadastroSelecionado.espacamento) || 1.5,
										material_plies_up: parseInt(cadastroSelecionado.camada) || 12,
										material_plies_down: 0,
										material_margin: 0,
									})
								}
							}
						}
					}

					// Construir caminho do modelo Emma
					const modelPath = `${emmaBasePath}\\${cadastroSelecionado.artigo}.emp`

					dados = {
						customer: defaultCustomerName,
						date: new Date().toISOString().split("T")[0].replace(/-/g, ""),
						id: ofSearch,
						model: modelPath,
						qty: qtyItems,
					} as PedidoEmma
				} else {
					dados = await converterParaEmma(cadastroSelecionado)
				}
			} else if (maquinaSelecionada === "Comelz") {
				// Gerar dados Comelz com cálculo de folhas usando os parâmetros do componente
				if (paresPorCorTamanho.length > 0 && cadastroSelecionado.tamanhosRanges) {
					const placaPar = parseInt(cadastroSelecionado.placaPorPar) || 1
					const conjugNavalha = parseInt(cadastroSelecionado.conjugNavalha) || 1
					const camadas = parseInt(cadastroSelecionado.camada) || 1
					
					const qtyRules: QtyRuleComelz[] = []
					
					for (const corData of paresPorCorTamanho) {
						// Agrupar pares por ranges de tamanhos
						const paresAgrupados = agruparParesPorRanges(
							corData.pares,
							cadastroSelecionado.tamanhosRanges
						)
						
						for (const item of paresAgrupados) {
							if (item.pares > 0) {
								// Calcular o número de folhas/encaixe
								const folhas = calcularFolhas(item.pares, placaPar, conjugNavalha, camadas)
								
								qtyRules.push({
									part_name: cadastroSelecionado.componente || cadastroSelecionado.artigo,
									part_size: String(Number(item.tamanho).toFixed(2)),
									mirror: false,
									parts: folhas,
							extra: "",
								})
							}
						}
					}
					
					const pastaArtigoComelz = `${cadastroSelecionado.artigo} - ${cadastroSelecionado.modelo}`
					const modelPathComelz = `${comelzBasePath}\\${pastaArtigoComelz}\\${cadastroSelecionado.componente}.cmz`
					
					dados = {
						id: ofSearch,
						date: new Date().toISOString().split("T")[0].replace(/-/g, ""),
						note: `OF: ${ofSearch}`,
						customer: defaultCustomerName,
						split_materials: false,
						model: modelPathComelz,
						qty: qtyRules,
					} as PedidoComelz
				} else {
					dados = await converterParaComelz(cadastroSelecionado)
				}
			} else if (maquinaSelecionada === "Lectra" || maquinaSelecionada === "Ponte") {
				// Gerar dados Lectra/Ponte com cálculo de folhas usando os parâmetros do componente
				if (paresPorCorTamanho.length > 0 && cadastroSelecionado.tamanhosRanges) {
					const placaPar = parseInt(cadastroSelecionado.placaPorPar) || 1
					const conjugNavalha = parseInt(cadastroSelecionado.conjugNavalha) || 1
					const camadas = parseInt(cadastroSelecionado.camada) || 1
					
					const modelDataArray: ModelDataLectra[] = []
					
					for (const corData of paresPorCorTamanho) {
						// Agrupar pares por ranges de tamanhos
						const paresAgrupados = agruparParesPorRanges(
							corData.pares,
							cadastroSelecionado.tamanhosRanges
						)
						
						for (const item of paresAgrupados) {
							if (item.pares > 0) {
								// Calcular o número de folhas/encaixe
								const folhas = calcularFolhas(item.pares, placaPar, conjugNavalha, camadas)
								
								modelDataArray.push({
									// model_variant: artigo do modelo (ex: COR43245330)
									codigo: cadastroSelecionado.artigo || cadastroSelecionado.componente,
									// model_size: numeração/tamanho
									tamanho: item.tamanho,
									// model_quantity e model_fully_marked_number: pares (folhas)
									a: folhas,
									b: 0,
									c: 0,
									d: 0,
								})
							}
						}
					}
					
					dados = modelDataArray
				} else {
					dados = await converterParaLectra(cadastroSelecionado)
				}
			}

			if (!dados) {
				setMessage("Erro ao converter dados")
				return
			}

			// Usar o apelido selecionado no nome do arquivo
			// Para Lectra/Ponte: formato OF_APELIDO (ex: 435020476_PLACA_DO_FORRO_DA_ESPUMA)
			const apelidoFormatado = apelidoSelecionado.replace(/\s+/g, '_').toUpperCase()
			const nomeArquivo = (maquinaSelecionada.toLowerCase() === "lectra" || maquinaSelecionada.toLowerCase() === "ponte")
				? `${ofSearch}_${apelidoFormatado}`
				: `${ofSearch}-${apelidoSelecionado}`

			// Preparar options para Lectra/Ponte
			const lectraOptions = (maquinaSelecionada.toLowerCase() === "lectra" || maquinaSelecionada.toLowerCase() === "ponte") && cadastroSelecionado
				? {
					espacamento: parseFloat(cadastroSelecionado.espacamento || "1.5"),
					sentidoMaterial: cadastroSelecionado.sentidoMaterial || "S",
					largura: parseFloat(cadastroSelecionado.largura || "1350"),
					fabric_type: cadastroSelecionado.numeroTecido ? parseInt(cadastroSelecionado.numeroTecido) : 9,
				}
				: undefined

			// Exportar arquivo com nome personalizado (OF-APELIDO)
			// Ponte usa o mesmo formato que Lectra
			const tipoExportacao = maquinaSelecionada.toLowerCase() === "ponte" ? "lectra" : maquinaSelecionada.toLowerCase() as "comelz" | "emma" | "lectra"
			const savePath = await exportarArquivo(
				tipoExportacao,
				dados,
				nomeArquivo,
				lectraOptions,
			)

			if (savePath) {
				// Log de auditoria para geração de encaixe
				activityLogger.logGenerateEncaixe(
					user,
					ofSearch,
					componenteSelecionado || '',
					apelidoSelecionado,
					maquinaSelecionada,
					savePath
				)
				setMessage(`Arquivo gerado com sucesso: ${savePath}`)
			} else {
				setMessage("Exportação cancelada")
			}
		} catch (err) {
			console.error("Erro ao gerar arquivo:", err)
			setMessage("Erro ao gerar arquivo: " + String(err))
		}
	}

	return (
		<div className="space-y-6">
			{/* Seção de Busca por OF */}
			<Card>
				<CardHeader>
					<CardTitle>Buscar por OF</CardTitle>
					<CardDescription>
						Digite o número da OF para visualizar a grade e pares
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<div className="flex-1">
							<Label htmlFor="of-search">OF (9 dígitos)</Label>
							<Input
								id="of-search"
								value={ofSearch}
								onChange={(e) => setOfSearch(e.target.value)}
								placeholder="000000000"
								maxLength={9}
							/>
						</div>
						<div className="flex items-end">
							<Button onClick={buscarOF} disabled={loading}>
								{loading ? "Buscando..." : "Buscar OF"}
							</Button>
						</div>
					</div>

					{gradePares.length > 0 && (
						<div className="border rounded-lg">
							<div 
								className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
								onClick={() => setGradeMinimizada(!gradeMinimizada)}
							>
								<span className="font-medium">Grade e Pares ({gradePares.length} itens)</span>
								<Button variant="ghost" size="sm">
									{gradeMinimizada ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
								</Button>
							</div>
							{!gradeMinimizada && (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Artigo</TableHead>
											<TableHead>Modelo</TableHead>
											<TableHead>Código Cor</TableHead>
											<TableHead>Grade</TableHead>
											<TableHead>Pares</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{gradePares.map((item, idx) => (
											<TableRow key={idx}>
												<TableCell>{item.artigo}</TableCell>
												<TableCell>{item.modelo}</TableCell>
												<TableCell>{item.codigoCor}</TableCell>
												<TableCell>{item.grade}</TableCell>
												<TableCell>{item.pares}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Seção de Informações do Cadastro (carregado automaticamente após buscar OF) */}
			{cadastrosInfo.length > 0 && (
				<Card>
					<CardHeader className="cursor-pointer" onClick={() => setCadastroMinimizado(!cadastroMinimizado)}>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Cadastro Encontrado</CardTitle>
								<CardDescription>Artigo: {artigoSearch}</CardDescription>
							</div>
							<Button variant="ghost" size="sm">
								{cadastroMinimizado ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
							</Button>
						</div>
					</CardHeader>
					{!cadastroMinimizado && (
					<CardContent className="space-y-4">
						<div className="space-y-4">
							<div className="border rounded-lg p-4 bg-muted/50">
								<h4 className="font-semibold mb-2">Informações do Cadastro</h4>
								{cadastrosInfo.map((cad, idx) => (
									<div
										key={idx}
										className="text-sm space-y-1 mb-4 pb-4 border-b last:border-b-0"
									>
										<p>
											<strong>Artigo:</strong> {cad.artigo}
										</p>
										<p>
											<strong>Modelo:</strong> {cad.modelo}
										</p>
										<p>
											<strong>Componente:</strong> {cad.componente}
										</p>
										<p>
											<strong>Apelido:</strong>{" "}
											<span className={cad.apelido ? "text-primary font-semibold" : "text-yellow-500"}>
												{cad.apelido || "⚠️ Não cadastrado"}
											</span>
										</p>
										<p>
											<strong>Material:</strong> {cad.material}
										</p>
										<p>
											<strong>Cor:</strong> {cad.cor}
										</p>
										<p>
											<strong>Largura:</strong> {cad.largura}
										</p>
										<p>
											<strong>Número Tecido:</strong> {cad.numeroTecido || "—"}
										</p>
										<p>
											<strong>Pares Criac:</strong> {cad.paresCriac}
										</p>
										<p>
											<strong>Conjug Navalha:</strong> {cad.conjugNavalha}
										</p>
										<p>
											<strong>Placa Por Par:</strong> {cad.placaPorPar}
										</p>
										<p>
											<strong>Camada:</strong> {cad.camada}
										</p>
										<p>
											<strong>Espacamento:</strong> {cad.espacamento}
										</p>
										<p>
											<strong>Comprimento Max:</strong> {cad.comprimentoMax}
										</p>
										<p>
											<strong>Tamanhos:</strong>{" "}
											{cad.tamanhos && cad.tamanhos.length > 0
												? cad.tamanhos.join(", ")
												: "Nenhum tamanho cadastrado"}
										</p>
										<p>
											<strong>Setor/Máquina:</strong>{" "}
											<span className={cad.setorNome ? "text-primary font-semibold" : "text-muted-foreground"}>
												{cad.setorNome || "Não definido"}
											</span>
										</p>
										{cad.tamanhosRanges && cad.tamanhosRanges.length > 0 && (
											<p>
												<strong>Ranges de Tamanhos:</strong>{" "}
												{cad.tamanhosRanges
													.map((r) => `${r.tamanhoInicial}-${r.tamanhoFinal}`)
													.join(", ")}
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					</CardContent>
					)}

					{/* Selecionar Componente - sempre visível */}
					<CardContent className="pt-0">
						<div className="space-y-2">
							<h4 className="font-semibold">Selecionar Componente</h4>
							<div className="flex flex-wrap gap-2">
								{cadastrosInfo.map((cad, idx) => (
									<Button
										key={idx}
										variant={
											componenteSelecionado === cad.componente
												? "default"
												: "outline"
										}
										onClick={() => selecionarComponente(cad.componente)}
										className="flex flex-col items-start"
									>
										<span>Componente: {cad.componente}</span>
										{cad.setorNome && (
											<span className="text-xs opacity-70">({cad.setorNome})</span>
										)}
									</Button>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Seção de Tamanhos e Pares */}
			{componenteSelecionado && paresPorCorTamanho.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Pares por Tamanho</CardTitle>
						<CardDescription>
							Preencha a quantidade de pares para cada tamanho por cor
						</CardDescription>
					</CardHeader>
					<CardContent>
						{(() => {
							const cadastroSel = cadastrosInfo.find(
								(c) => c.componente === componenteSelecionado,
							)
							const tamanhos = cadastroSel?.tamanhos || []

							if (tamanhos.length === 0) {
								return (
									<p className="text-muted-foreground">
										Nenhum tamanho cadastrado para este componente
									</p>
								)
							}

							return (
								<div className="border rounded-lg overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="sticky left-0 bg-background">
													Cor
												</TableHead>
												{tamanhos.map((tam) => (
													<TableHead
														key={tam}
														className="text-center min-w-[80px]"
													>
														{tam}
													</TableHead>
												))}
												<TableHead className="text-center">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{paresPorCorTamanho.map((item, idx) => {
												const totalPares = Object.values(item.pares).reduce(
													(sum, val) => sum + val,
													0,
												)
												return (
													<TableRow key={idx}>
														<TableCell className="sticky left-0 bg-background font-medium">
															{item.codigoCor}
														</TableCell>
														{tamanhos.map((tam) => (
															<TableCell key={tam} className="p-1">
																<Input
																	type="number"
																	min="0"
																	className="w-20 text-center"
																	value={item.pares[tam] || 0}
																	onChange={(e) =>
																		atualizarPares(
																			item.codigoCor,
																			tam,
																			parseInt(e.target.value) || 0,
																		)
																	}
																/>
															</TableCell>
														))}
														<TableCell className="text-center font-bold">
															{totalPares}
														</TableCell>
													</TableRow>
												)
											})}
											{/* Linha de totais por tamanho */}
											<TableRow className="bg-muted/50 font-bold">
												<TableCell className="sticky left-0 bg-muted/50">
													Total
												</TableCell>
												{tamanhos.map((tam) => {
													const totalTam = paresPorCorTamanho.reduce(
														(sum, item) => sum + (item.pares[tam] || 0),
														0,
													)
													return (
														<TableCell key={tam} className="text-center">
															{totalTam}
														</TableCell>
													)
												})}
												<TableCell className="text-center">
													{paresPorCorTamanho.reduce(
														(sum, item) =>
															sum +
															Object.values(item.pares).reduce(
																(s, v) => s + v,
																0,
															),
														0,
													)}
												</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</div>
							)
						})()}
					</CardContent>
				</Card>
			)}

			{/* Controles de Geração */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-wrap gap-4 items-end">
						<div className="flex-1 min-w-[200px]">
							<Label htmlFor="maquina-select">Máquina</Label>
							<Select
								value={maquinaSelecionada}
								onValueChange={setMaquinaSelecionada}
							>
								<SelectTrigger id="maquina-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Emma">Emma</SelectItem>
									<SelectItem value="Comelz">Comelz</SelectItem>
									<SelectItem value="Lectra">Lectra</SelectItem>
									<SelectItem value="Ponte">Ponte</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button
							onClick={gerarArquivo}
							disabled={
								loading || !componenteSelecionado || !apelidoSelecionado
							}
						>
							Gerar Arquivo
						</Button>
						<Button
							onClick={adicionarNaListaAutomatico}
							variant="secondary"
							disabled={
								loading || !componenteSelecionado || !apelidoSelecionado || !ofSearch
							}
						>
							<ListPlus className="w-4 h-4 mr-2" />
							Adicionar à Lista
						</Button>
					</div>
					{ofSearch && apelidoSelecionado && (
						<p className="text-sm text-muted-foreground mt-2">
							Nome do arquivo:{" "}
							<strong>
								{(maquinaSelecionada.toLowerCase() === "lectra" || maquinaSelecionada.toLowerCase() === "ponte")
									? `${ofSearch}_${apelidoSelecionado.replace(/\s+/g, '_').toUpperCase()}.mkx`
									: `${ofSearch}-${apelidoSelecionado}.json`}
							</strong>
						</p>
					)}
				</CardContent>
			</Card>

			{/* Mensagens de Status */}
			{message && (
				<Alert>
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			)}
		</div>
	)
}



