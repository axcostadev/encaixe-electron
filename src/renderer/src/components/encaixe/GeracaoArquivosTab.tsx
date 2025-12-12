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
import { PedidoComelz, PedidoEmma, ModelDataLectra } from "@renderer/types"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog"
import { ScrollArea } from "@renderer/components/ui/scroll-area"

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
}

// Mapeamento de pares por tamanho para cada cor
type ParesPorTamanho = {
	[tamanho: number]: number
}

type ParesPorCor = {
	codigoCor: string
	pares: ParesPorTamanho
}

export function GeracaoArquivosTab() {
	const [ofSearch, setOfSearch] = useState("")
	const [artigoSearch, setArtigoSearch] = useState("")
	const [gradePares, setGradePares] = useState<GradePar[]>([])
	const [cadastrosInfo, setCadastrosInfo] = useState<CadastroInfo[]>([])
	const [componenteSelecionado, setComponenteSelecionado] = useState<
		string | null
	>(null)
	const [maquinaSelecionada, setMaquinaSelecionada] = useState<string>("Emma")
	const [message, setMessage] = useState<string>("")

	// Estados para gerenciamento de apelidos
	const [apelidosMap, setApelidosMap] = useState<Record<string, string>>({})
	const [apelidoSelecionado, setApelidoSelecionado] = useState<string>("")
	const [dialogApelidoAberto, setDialogApelidoAberto] = useState(false)
	const [novoApelido, setNovoApelido] = useState("")
	const [componenteParaApelido, setComponenteParaApelido] = useState("")

	// Estado para gerenciar pares por tamanho e cor
	const [paresPorCorTamanho, setParesPorCorTamanho] = useState<ParesPorCor[]>(
		[],
	)

	const {
		loading,
		buscarOF: buscarOFHook,
		buscarArtigo: buscarArtigoHook,
		converterParaComelz,
		converterParaEmma,
		converterParaLectra,
		exportarArquivo,
		cadastrarApelido: cadastrarApelidoHook,
	} = useEncaixe()

	// Carregar todos os apelidos cadastrados ao montar o componente
	useEffect(() => {
		async function carregarApelidos() {
			try {
				const apelidos = await (window as any).api.apelidosAPI.getAll()
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

				// Buscar cadastros automaticamente após preencher o artigo
				setCadastrosInfo([])
				setComponenteSelecionado(null)
				const cadastros = await buscarArtigoHook(artigoComCOR)
				if (cadastros.length === 0) {
					setMessage("Nenhum cadastro encontrado para o artigo informado")
				} else {
					setCadastrosInfo(cadastros)
					// Se houver tamanhos no primeiro cadastro, inicializa os pares
					if (cadastros[0]?.tamanhos && cadastros[0].tamanhos.length > 0) {
						inicializarParesPorTamanho(result, cadastros[0].tamanhos)
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

	function abrirDialogApelido() {
		if (!componenteSelecionado) {
			setMessage("Selecione um componente primeiro")
			return
		}
		setComponenteParaApelido(componenteSelecionado)
		setNovoApelido("")
		setDialogApelidoAberto(true)
	}

	async function salvarApelido() {
		if (!componenteParaApelido || !novoApelido.trim()) {
			setMessage("Digite um apelido válido")
			return
		}

		const success = await cadastrarApelidoHook(
			componenteParaApelido,
			novoApelido.trim(),
		)

		if (success) {
			// Atualizar mapa de apelidos local
			setApelidosMap((prev) => ({
				...prev,
				[componenteParaApelido.toLowerCase()]: novoApelido.trim(),
			}))
			setMessage(
				`Apelido "${novoApelido.trim()}" cadastrado para "${componenteParaApelido}"!`,
			)
			setDialogApelidoAberto(false)
			setNovoApelido("")
		} else {
			setMessage("Erro ao cadastrar apelido")
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
					const tamanhos = cadastroSelecionado.tamanhos || []
					const qtyItems: any[] = []

					for (const corData of paresPorCorTamanho) {
						for (const tam of tamanhos) {
							const pares = corData.pares[tam] || 0
							if (pares > 0) {
								qtyItems.push({
									part_name: cadastroSelecionado.artigo,
									part_size: String(tam),
									mirror: false,
									parts: pares,
									angle: 90,
									toler: 10,
									material_name: cadastroSelecionado.material || "",
									material_x: 1.41,
									material_y: parseFloat(cadastroSelecionado.largura) || 10,
									material_unit: "m",
									part_space:
										parseFloat(cadastroSelecionado.espacamento) || 1.5,
									material_plies_up: parseInt(cadastroSelecionado.camada) || 12,
									material_plies_down: 0,
									material_margin: 0,
								})
							}
						}
					}

					// Construir caminho do modelo Emma
					const pastaArtigo = `${cadastroSelecionado.artigo} - ${cadastroSelecionado.modelo}`
					const modelPath = `O:\\Lectra\\Calcado\\Modelos\\EMMA\\${pastaArtigo}\\${cadastroSelecionado.componente}.emp`

					dados = {
						customer: "VULCABRAS",
						date: new Date().toISOString().split("T")[0].replace(/-/g, ""),
						id: ofSearch,
						model: modelPath,
						qty: qtyItems,
					} as PedidoEmma
				} else {
					dados = await converterParaEmma(cadastroSelecionado)
				}
			} else if (maquinaSelecionada === "Comelz") {
				dados = await converterParaComelz(cadastroSelecionado)
			} else if (maquinaSelecionada === "Lectra") {
				dados = await converterParaLectra(cadastroSelecionado)
			}

			if (!dados) {
				setMessage("Erro ao converter dados")
				return
			}

			// Usar o apelido selecionado no nome do arquivo
			const nomeArquivo = `${ofSearch}-${apelidoSelecionado}`

			// Exportar arquivo com nome personalizado (OF-APELIDO)
			const savePath = await exportarArquivo(
				maquinaSelecionada.toLowerCase() as "comelz" | "emma" | "lectra",
				dados,
				nomeArquivo,
			)

			if (savePath) {
				setMessage(`Arquivo gerado com sucesso: ${savePath}`)
			} else {
				setMessage("Exportação cancelada")
			}
		} catch (err) {
			console.error("Erro ao gerar arquivo:", err)
			setMessage("Erro ao gerar arquivo: " + String(err))
		}
	}

	// Obter lista de apelidos únicos para o dropdown
	const apelidosLista = Object.entries(apelidosMap).map(([comp, apelido]) => ({
		componente: comp,
		apelido,
	}))

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
						</div>
					)}
				</CardContent>
			</Card>

			{/* Seção de Informações do Cadastro (carregado automaticamente após buscar OF) */}
			{cadastrosInfo.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Cadastro Encontrado</CardTitle>
						<CardDescription>Artigo: {artigoSearch}</CardDescription>
					</CardHeader>
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
											<strong>Material:</strong> {cad.material}
										</p>
										<p>
											<strong>Cor:</strong> {cad.cor}
										</p>
										<p>
											<strong>Largura:</strong> {cad.largura}
										</p>
										<p>
											<strong>Tipo Tecido:</strong> {String(cad.tipoTecido)}
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
									</div>
								))}
							</div>

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
										>
											Componente: {cad.componente}
										</Button>
									))}
								</div>
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
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1 min-w-[200px]">
							<Label htmlFor="apelido-select">
								Apelido para nome do arquivo
							</Label>
							<Select
								value={apelidoSelecionado}
								onValueChange={setApelidoSelecionado}
							>
								<SelectTrigger id="apelido-select">
									<SelectValue placeholder="Selecione um apelido" />
								</SelectTrigger>
								<SelectContent>
									<ScrollArea className="h-[200px]">
										{apelidosLista.length === 0 ? (
											<SelectItem value="_none" disabled>
												Nenhum apelido cadastrado
											</SelectItem>
										) : (
											apelidosLista.map(({ componente, apelido }) => (
												<SelectItem key={componente} value={apelido}>
													{componente} - {apelido}
												</SelectItem>
											))
										)}
									</ScrollArea>
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
							onClick={abrirDialogApelido}
							variant="outline"
							disabled={!componenteSelecionado}
						>
							Cadastrar Apelido
						</Button>
					</div>
					{ofSearch && apelidoSelecionado && (
						<p className="text-sm text-muted-foreground mt-2">
							Nome do arquivo:{" "}
							<strong>
								{ofSearch}-{apelidoSelecionado}.json
							</strong>
						</p>
					)}
				</CardContent>
			</Card>

			{/* Dialog para cadastrar apelido */}
			<Dialog open={dialogApelidoAberto} onOpenChange={setDialogApelidoAberto}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cadastrar Apelido</DialogTitle>
						<DialogDescription>
							Digite o apelido para o componente "{componenteParaApelido}"
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="novo-apelido">Apelido</Label>
							<Input
								id="novo-apelido"
								value={novoApelido}
								onChange={(e) => setNovoApelido(e.target.value.toUpperCase())}
								placeholder="Ex: PLCVIST"
							/>
						</div>
						{Object.keys(apelidosMap).length > 0 && (
							<div className="space-y-2">
								<Label>Apelidos já cadastrados:</Label>
								<ScrollArea className="h-[150px] border rounded-md p-2">
									{Object.entries(apelidosMap).map(([comp, apelido]) => (
										<div
											key={comp}
											className="flex justify-between text-sm py-1 border-b last:border-b-0"
										>
											<span>{comp}</span>
											<span className="font-mono font-semibold">{apelido}</span>
										</div>
									))}
								</ScrollArea>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDialogApelidoAberto(false)}
						>
							Cancelar
						</Button>
						<Button onClick={salvarApelido} disabled={!novoApelido.trim()}>
							Salvar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Mensagens de Status */}
			{message && (
				<Alert>
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			)}
		</div>
	)
}
