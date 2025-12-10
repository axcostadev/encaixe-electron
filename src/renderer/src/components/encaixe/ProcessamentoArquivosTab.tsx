import { Button } from "@renderer/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@renderer/components/ui/card"
import { Alert, AlertDescription } from "@renderer/components/ui/alert"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@renderer/components/ui/table"
import { useEncaixe } from "@renderer/hooks/useEncaixe"

export function ProcessamentoArquivosTab() {
	const [ctfPath, setCtfPath] = useState<string | null>(null)
	const [ctcPath, setCtcPath] = useState<string | null>(null)
	const [message, setMessage] = useState('')
	const [processedData, setProcessedData] = useState<{
		ctf: any[]
		ctc: any[]
	} | null>(null)

	const { loading, parseArquivos } = useEncaixe()

	async function selecionarCTF() {
		const result = await (window as any).api.electronAPI.selectFile()
		if (result) {
			setCtfPath(result)
			setMessage(`Arquivo CTF selecionado: ${result}`)
		}
	}

	async function selecionarCTC() {
		const result = await (window as any).api.electronAPI.selectFile()
		if (result) {
			setCtcPath(result)
			setMessage(`Arquivo CTC selecionado: ${result}`)
		}
	}

	async function processarArquivos() {
		if (!ctfPath && !ctcPath) {
			setMessage('Selecione pelo menos um arquivo para processar')
			return
		}

		setMessage('Processando arquivos...')
		
		try {
			const { ctfData, ctcData } = await parseArquivos(ctfPath || undefined, ctcPath || undefined)
			
			setProcessedData({
				ctf: ctfData,
				ctc: ctcData
			})

			setMessage(`Processamento concluído! CTF: ${ctfData.length} OFs, CTC: ${ctcData.length} OFs`)
		} catch (err) {
			console.error('Erro ao processar arquivos:', err)
			setMessage('Erro ao processar arquivos: ' + String(err))
		}
	}

	async function salvarNoBanco() {
		if (!processedData) {
			setMessage('Processe os arquivos primeiro')
			return
		}

		setMessage('Salvando no banco de dados...')
		
		try {
			if (processedData.ctf.length > 0) {
				await (window as any).api.electronAPI.saveCTF(processedData.ctf)
			}
			if (processedData.ctc.length > 0) {
				await (window as any).api.electronAPI.saveCTC(processedData.ctc)
			}

			setMessage('Dados salvos no banco com sucesso!')
		} catch (err) {
			console.error('Erro ao salvar no banco:', err)
			setMessage('Erro ao salvar no banco: ' + String(err))
		}
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Processar Arquivos CTF e CTC</CardTitle>
					<CardDescription>
						Selecione os arquivos para carregar e processar os dados
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Button onClick={selecionarCTF} className="w-full" variant="outline">
								{ctfPath ? '✓ CTF Selecionado' : 'Selecionar Arquivo CTF'}
							</Button>
							{ctfPath && (
								<p className="text-xs text-muted-foreground truncate">{ctfPath}</p>
							)}
						</div>

						<div className="space-y-2">
							<Button onClick={selecionarCTC} className="w-full" variant="outline">
								{ctcPath ? '✓ CTC Selecionado' : 'Selecionar Arquivo CTC'}
							</Button>
							{ctcPath && (
								<p className="text-xs text-muted-foreground truncate">{ctcPath}</p>
							)}
						</div>
					</div>

					<div className="flex gap-2">
						<Button 
							onClick={processarArquivos} 
							disabled={loading || (!ctfPath && !ctcPath)}
							className="flex-1"
						>
							{loading ? 'Processando...' : 'Processar Arquivos'}
						</Button>
						
						<Button 
							onClick={salvarNoBanco} 
							disabled={loading || !processedData}
							variant="secondary"
						>
							Salvar no Banco
						</Button>
					</div>

					{message && (
						<Alert>
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>

			{processedData && (
				<Card>
					<CardHeader>
						<CardTitle>Dados Processados</CardTitle>
						<CardDescription>
							Visualização dos dados carregados dos arquivos
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{processedData.ctf.length > 0 && (
							<div>
								<h4 className="font-semibold mb-2">CTF ({processedData.ctf.length} OFs)</h4>
								<div className="border rounded-lg max-h-64 overflow-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>OF</TableHead>
												<TableHead>Artigo</TableHead>
												<TableHead>Modelo</TableHead>
												<TableHead>Cor</TableHead>
												<TableHead>Grade</TableHead>
												<TableHead>Pares</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{processedData.ctf.slice(0, 10).map((bloco, idx) => (
												bloco.linhas?.slice(0, 3).map((linha: any, lIdx: number) => (
													<TableRow key={`${idx}-${lIdx}`}>
														<TableCell className="font-mono text-xs">{linha.of}</TableCell>
														<TableCell className="text-xs">{linha.artigo}</TableCell>
														<TableCell className="text-xs">{linha.modelo}</TableCell>
														<TableCell className="text-xs">{linha.codigoCor}</TableCell>
														<TableCell className="text-xs">{linha.grade}</TableCell>
														<TableCell className="text-xs">{linha.pares}</TableCell>
													</TableRow>
												))
											))}
										</TableBody>
									</Table>
								</div>
								<p className="text-xs text-muted-foreground mt-2">
									Mostrando primeiras linhas. Total: {processedData.ctf.reduce((acc, b) => acc + (b.linhas?.length || 0), 0)} linhas
								</p>
							</div>
						)}

						{processedData.ctc.length > 0 && (
							<div>
								<h4 className="font-semibold mb-2">CTC ({processedData.ctc.length} OFs)</h4>
								<div className="border rounded-lg max-h-64 overflow-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>OF</TableHead>
												<TableHead>Artigo</TableHead>
												<TableHead>Modelo</TableHead>
												<TableHead>Cor</TableHead>
												<TableHead>Grade</TableHead>
												<TableHead>Pares</TableHead>
												<TableHead>Especificação</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{processedData.ctc.slice(0, 10).map((bloco, idx) => (
												bloco.linhas?.slice(0, 3).map((linha: any, lIdx: number) => (
													<TableRow key={`${idx}-${lIdx}`}>
														<TableCell className="font-mono text-xs">{linha.of}</TableCell>
														<TableCell className="text-xs">{linha.artigo}</TableCell>
														<TableCell className="text-xs">{linha.modelo}</TableCell>
														<TableCell className="text-xs">{linha.codigoCor}</TableCell>
														<TableCell className="text-xs">{linha.grade}</TableCell>
														<TableCell className="text-xs">{linha.pares}</TableCell>
														<TableCell className="text-xs truncate max-w-[150px]">
															{linha.especificacaoTecnica}
														</TableCell>
													</TableRow>
												))
											))}
										</TableBody>
									</Table>
								</div>
								<p className="text-xs text-muted-foreground mt-2">
									Mostrando primeiras linhas. Total: {processedData.ctc.reduce((acc, b) => acc + (b.linhas?.length || 0), 0)} linhas
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
