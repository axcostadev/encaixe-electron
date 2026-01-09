import { Button } from "@renderer/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@renderer/components/ui/card"
import { Alert, AlertDescription } from "@renderer/components/ui/alert"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@renderer/components/ui/table"
import { useEncaixe } from "@renderer/hooks/useEncaixe"
import { useAuth } from "@renderer/contexts/AuthContext"
import { activityLogger } from "@renderer/services/activityLogger"
import { ListaAutomaticoItem } from "@renderer/pages/EncaixePage"
import { Trash2, Play, ListX } from "lucide-react"

interface ProcessamentoArquivosTabProps {
	lista: ListaAutomaticoItem[]
	onRemover: (index: number) => void
	onLimpar: () => void
}

export function ProcessamentoArquivosTab({ lista, onRemover, onLimpar }: ProcessamentoArquivosTabProps) {
	const { user } = useAuth()
	const [message, setMessage] = useState('')
	const [processando, setProcessando] = useState(false)
	const [progresso, setProgresso] = useState(0)

	const { exportarArquivo } = useEncaixe()

	async function gerarTodosArquivos() {
		if (lista.length === 0) {
			setMessage('Nenhum item na lista para processar')
			return
		}

		setProcessando(true)
		setProgresso(0)
		setMessage('Iniciando geração dos arquivos...')

		let sucessos = 0
		let erros = 0

		for (let i = 0; i < lista.length; i++) {
			const item = lista[i]
			try {
				// Para Lectra: formato OF_APELIDO (ex: 435020476_PLACA_DO_FORRO_DA_ESPUMA)
				const apelidoFormatado = item.apelido.replace(/\s+/g, '_').toUpperCase()
				const nomeArquivo = item.maquina.toLowerCase() === "lectra"
					? `${item.of}_${apelidoFormatado}`
					: `${item.of}-${item.apelido}`
				
				// Preparar options para Lectra (espacamento, sentidoMaterial, largura)
				const lectraOptions = item.maquina.toLowerCase() === "lectra" 
					? {
						espacamento: parseFloat(item.espacamento || "1.5"),
						sentidoMaterial: item.sentidoMaterial || "S",
						largura: parseFloat(item.largura || "1350"),
					}
					: undefined
				
				const savePath = await exportarArquivo(
					item.maquina.toLowerCase() as "comelz" | "emma" | "lectra",
					item.dados,
					nomeArquivo,
					lectraOptions,
				)

				if (savePath) {
					// Log individual de cada encaixe gerado
					activityLogger.logGenerateEncaixe(user, item.of, item.componente, item.apelido, item.maquina, savePath)
					sucessos++
				}
			} catch (err) {
				console.error(`Erro ao gerar arquivo ${item.of}-${item.apelido}:`, err)
				erros++
			}

			setProgresso(Math.round(((i + 1) / lista.length) * 100))
		}

		// Log de auditoria para geração em lote
		activityLogger.logBatchGenerateEncaixe(user, lista.length, sucessos, erros)

		setProcessando(false)
		setMessage(`Processamento concluído! ${sucessos} arquivo(s) gerado(s)${erros > 0 ? `, ${erros} erro(s)` : ''}`)
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Lista de Arquivos Automático</span>
						{lista.length > 0 && (
							<span className="text-sm font-normal text-muted-foreground">
								{lista.length} item(s) na lista
							</span>
						)}
					</CardTitle>
					<CardDescription>
						Arquivos adicionados para geração em lote
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{lista.length === 0 ? (
						<div className="text-center py-12 border-2 border-dashed rounded-lg">
							<ListX className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
							<p className="text-muted-foreground">Lista vazia</p>
							<p className="text-sm text-muted-foreground mt-1">
								Adicione itens na aba "Geração de Arquivos" usando o botão "Adicionar à Lista"
							</p>
						</div>
					) : (
						<>
							<div className="border rounded-lg">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-10">#</TableHead>
											<TableHead>OF</TableHead>
											<TableHead>Componente</TableHead>
											<TableHead>Apelido</TableHead>
											<TableHead>Máquina</TableHead>
											<TableHead>Nome Arquivo</TableHead>
											<TableHead className="w-10"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{lista.map((item, idx) => (
											<TableRow key={idx}>
												<TableCell className="font-mono text-muted-foreground">
													{idx + 1}
												</TableCell>
												<TableCell className="font-mono font-medium">
													{item.of}
												</TableCell>
												<TableCell>{item.componente}</TableCell>
												<TableCell className="font-semibold text-primary">
													{item.apelido}
												</TableCell>
												<TableCell>
													<span className="px-2 py-1 bg-muted rounded text-xs">
														{item.maquina}
													</span>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{item.of}-{item.apelido}.json
												</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => onRemover(idx)}
														className="text-destructive hover:text-destructive hover:bg-destructive/10"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{processando && (
								<div className="space-y-2">
									<div className="w-full bg-muted rounded-full h-2">
										<div 
											className="bg-primary h-2 rounded-full transition-all duration-300"
											style={{ width: `${progresso}%` }}
										/>
									</div>
									<p className="text-sm text-center text-muted-foreground">
										Processando... {progresso}%
									</p>
								</div>
							)}

							<div className="flex gap-2">
								<Button 
									onClick={gerarTodosArquivos} 
									disabled={processando || lista.length === 0}
									className="flex-1"
								>
									<Play className="w-4 h-4 mr-2" />
									{processando ? 'Processando...' : `Gerar Todos os Arquivos (${lista.length})`}
								</Button>
								
								<Button 
									onClick={onLimpar} 
									disabled={processando || lista.length === 0}
									variant="destructive"
								>
									<Trash2 className="w-4 h-4 mr-2" />
									Limpar Lista
								</Button>
							</div>
						</>
					)}

					{message && (
						<Alert>
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
