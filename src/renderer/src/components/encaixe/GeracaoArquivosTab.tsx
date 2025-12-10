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
import { useState } from "react"
import { Alert, AlertDescription } from "@renderer/components/ui/alert"
import { useEncaixe } from "@renderer/hooks/useEncaixe"
import { PedidoComelz, PedidoEmma, ModelDataLectra } from "@renderer/types"

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

	async function buscarOF() {
		if (!ofSearch || ofSearch.length !== 9) {
			setMessage("Digite uma OF válida com 9 dígitos")
			return
		}

		setMessage("")
		const result = await buscarOFHook(ofSearch)
		setGradePares(result)

		if (result.length === 0) {
			setMessage("OF não encontrada nos arquivos CTF/CTC")
		}
	}

	async function buscarArtigo() {
		if (!artigoSearch.trim()) {
			setMessage("Digite um artigo para buscar")
			return
		}

		setMessage("")
		setCadastrosInfo([])
		setComponenteSelecionado(null)

		const cadastros = await buscarArtigoHook(artigoSearch.trim())

		if (cadastros.length === 0) {
			setMessage("Nenhum cadastro encontrado para o artigo informado")
			return
		}

		setCadastrosInfo(cadastros)
	}

	async function cadastrarApelido() {
		if (!componenteSelecionado) {
			setMessage("Selecione um componente primeiro")
			return
		}

		const apelido = prompt(
			`Digite o apelido para o componente ${componenteSelecionado}:`,
		)

		if (apelido && apelido.trim()) {
			const success = await cadastrarApelidoHook(
				componenteSelecionado,
				apelido.trim(),
			)
			if (success) {
				setMessage("Apelido cadastrado com sucesso!")
			}
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
				dados = await converterParaEmma(cadastroSelecionado)
			} else if (maquinaSelecionada === "Comelz") {
				dados = await converterParaComelz(cadastroSelecionado)
			} else if (maquinaSelecionada === "Lectra") {
				dados = await converterParaLectra(cadastroSelecionado)
			}

			if (!dados) {
				setMessage("Erro ao converter dados")
				return
			}

			// Exportar arquivo
			const savePath = await exportarArquivo(
				maquinaSelecionada.toLowerCase() as "comelz" | "emma" | "lectra",
				dados,
				"MARKER_" + Date.now(),
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

			{/* Seção de Busca por Artigo */}
			<Card>
				<CardHeader>
					<CardTitle>Buscar Artigo e Selecionar Componente</CardTitle>
					<CardDescription>
						Digite o artigo para visualizar os cadastros e componentes
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<div className="flex-1">
							<Label htmlFor="artigo-search">Artigo</Label>
							<Input
								id="artigo-search"
								value={artigoSearch}
								onChange={(e) => setArtigoSearch(e.target.value)}
								placeholder="Digite o artigo"
							/>
						</div>
						<div className="flex items-end">
							<Button onClick={buscarArtigo} disabled={loading}>
								{loading ? "Buscando..." : "Buscar Artigo"}
							</Button>
						</div>
					</div>

					{cadastrosInfo.length > 0 && (
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
											onClick={() => setComponenteSelecionado(cad.componente)}
										>
											Componente: {cad.componente}
										</Button>
									))}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

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
						<Button
							onClick={gerarArquivo}
							disabled={loading || !componenteSelecionado}
						>
							Gerar Arquivo
						</Button>
						<Button
							onClick={cadastrarApelido}
							variant="outline"
							disabled={!componenteSelecionado}
						>
							Cadastrar Apelido
						</Button>
					</div>
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
