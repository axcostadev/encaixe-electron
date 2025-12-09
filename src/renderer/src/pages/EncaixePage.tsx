import { PageHeader } from "@renderer/components/common/PageHeader"
import { Button } from "@renderer/components/ui/button"
import { useSearchParams } from "react-router-dom"
import { useEffect, useState } from "react"

type LinhaPreview = {
	of: string
	artigo: string
	modelo: string
	pares: number
	codigoCor?: string
	grade?: string
	cadastro: any | null
}

type ConversionPreview = {
	format: 'comelz' | 'emma' | 'lectra'
	data: any
}

function CadastroModal({ artigo, modelo, onSave, onClose }: { artigo: string; modelo: string; onSave: (cad: any) => void; onClose: () => void }) {
	const [material, setMaterial] = useState('')
	const [cor, setCor] = useState('')

	async function save() {
		const cadastroObj = { artigo, modelo, componente: modelo, material, cor }
		try {
			const res = await (window as any).api.cadastroAPI.save(cadastroObj)
			onSave(res)
		} catch (err) {
			console.error('Erro salvando cadastro', err)
		}
	}

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
			<div className="bg-white p-4 rounded shadow-md w-full max-w-md">
				<h3 className="text-lg font-semibold">Criar Cadastro</h3>
				<p className="text-sm text-muted-foreground">Artigo: {artigo} — Componente: {modelo}</p>
				<div className="space-y-2 mt-3">
					<div>
						<label className="block text-sm">Material</label>
						<input className="border p-1 w-full" value={material} onChange={(e) => setMaterial(e.target.value)} />
					</div>
					<div>
						<label className="block text-sm">Cor</label>
						<input className="border p-1 w-full" value={cor} onChange={(e) => setCor(e.target.value)} />
					</div>
				</div>
				<div className="flex justify-end gap-2 mt-4">
					<Button onClick={onClose}>Fechar</Button>
					<Button onClick={save}>Salvar Cadastro</Button>
				</div>
			</div>
		</div>
	)
}

function CadastrosBatchModal({ linhasSemCadastro, onSave, onClose }: { linhasSemCadastro: LinhaPreview[]; onSave: () => void; onClose: () => void }) {
	const [cadastros, setCadastros] = useState<Map<string, { material: string; cor: string }>>(new Map())

	function updateCadastro(key: string, field: 'material' | 'cor', value: string) {
		const updated = new Map(cadastros)
		const existing = updated.get(key) || { material: '', cor: '' }
		existing[field] = value
		updated.set(key, existing)
		setCadastros(updated)
	}

	async function saveAll() {
		try {
			for (const linha of linhasSemCadastro) {
				const key = `${linha.artigo}-${linha.modelo}`
				const data = cadastros.get(key)
				if (data && (data.material || data.cor)) {
					const cadastroObj = { artigo: linha.artigo, modelo: linha.modelo, componente: linha.modelo, material: data.material, cor: data.cor }
					await (window as any).api.cadastroAPI.save(cadastroObj)
				}
			}
			onSave()
		} catch (err) {
			console.error('Erro salvando cadastros em lote', err)
		}
	}

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 overflow-auto">
			<div className="bg-white p-4 rounded shadow-md w-full max-w-2xl m-4 max-h-[80vh] overflow-y-auto">
				<h3 className="text-lg font-semibold">Criar Cadastros em Lote</h3>
				<p className="text-sm text-muted-foreground mb-3">{linhasSemCadastro.length} linhas sem cadastro</p>
				<div className="space-y-3">
					{linhasSemCadastro.map((linha, idx) => {
						const key = `${linha.artigo}-${linha.modelo}`
						const data = cadastros.get(key) || { material: '', cor: '' }
						return (
							<div key={idx} className="border rounded p-2">
								<div className="text-sm font-semibold">Artigo: {linha.artigo} — Componente: {linha.modelo}</div>
								<div className="grid grid-cols-2 gap-2 mt-2">
									<div>
										<label className="block text-xs">Material</label>
										<input className="border p-1 w-full text-sm" value={data.material} onChange={(e) => updateCadastro(key, 'material', e.target.value)} />
									</div>
									<div>
										<label className="block text-xs">Cor</label>
										<input className="border p-1 w-full text-sm" value={data.cor} onChange={(e) => updateCadastro(key, 'cor', e.target.value)} />
									</div>
								</div>
							</div>
						)
					})}
				</div>
				<div className="flex justify-end gap-2 mt-4">
					<Button onClick={onClose}>Fechar</Button>
					<Button onClick={saveAll}>Salvar Todos</Button>
				</div>
			</div>
		</div>
	)
}

function ConversionPreviewModal({ preview, onExport, onClose }: { preview: ConversionPreview; onExport: () => void; onClose: () => void }) {
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 overflow-auto">
			<div className="bg-white p-4 rounded shadow-md w-full max-w-3xl m-4 max-h-[80vh] overflow-y-auto">
				<h3 className="text-lg font-semibold">Preview de Conversão - {preview.format.toUpperCase()}</h3>
				<div className="mt-3 bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-96">
					<pre>{JSON.stringify(preview.data, null, 2)}</pre>
				</div>
				<div className="flex justify-end gap-2 mt-4">
					<Button onClick={onClose}>Fechar</Button>
					<Button onClick={onExport}>Exportar Arquivo</Button>
				</div>
			</div>
		</div>
	)
}

export default function EncaixePage() {
	const [searchParams] = useSearchParams()
	const modeloId = searchParams.get('modelo') || ''
	const [ctfFile, setCtfFile] = useState<string | null>(null)
	const [ctcFile, setCtcFile] = useState<string | null>(null)
	const [status, setStatus] = useState('Pronto')

	const [previewLines, setPreviewLines] = useState<LinhaPreview[]>([])
	const [showModalFor, setShowModalFor] = useState<{ artigo: string; modelo: string } | null>(null)
	const [showBatchModal, setShowBatchModal] = useState(false)
	const [conversionPreview, setConversionPreview] = useState<ConversionPreview | null>(null)
	
	const [parsedCTF, setParsedCTF] = useState<any[]>([])
	const [parsedCTC, setParsedCTC] = useState<any[]>([])

	// Encaixe usa apenas cadastros existentes; não cria componentes aqui

	async function selectCTF() {
		const result = await (window as any).api.electronAPI.selectFile()
		if (result) setCtfFile(result)
	}

	async function selectCTC() {
		const result = await (window as any).api.electronAPI.selectFile()
		if (result) setCtcFile(result)
	}

	async function lookupCadastrosForLines(lines: any[]) {
		const flat: LinhaPreview[] = []
		for (const bloco of lines) {
			for (const l of bloco.linhas) {
				const cadastro = await (window as any).api.cadastroAPI.find(l.artigo, l.modelo)
				flat.push({ of: l.of, artigo: l.artigo, modelo: l.modelo, pares: l.pares || 0, codigoCor: l.codigoCor, grade: l.grade, cadastro: cadastro || null })
			}
		}
		setPreviewLines(flat)
	}

	async function parseAndPreview() {
		setStatus('Processando...')
		try {
			let ctfData: any[] = []
			let ctcData: any[] = []
			if (ctfFile) ctfData = await (window as any).api.electronAPI.parseCTF(ctfFile)
			if (ctcFile) ctcData = await (window as any).api.electronAPI.parseCTC(ctcFile)

			setParsedCTF(ctfData)
			setParsedCTC(ctcData)

			// populate preview and do cadastro lookup
			const combined = [...ctfData, ...ctcData]
			await lookupCadastrosForLines(combined)

			setStatus('Pronto para salvar — revise as linhas abaixo')
		} catch (err) {
			console.error(err)
			setStatus('Erro: ' + String(err))
		}
	}

	async function processAndSave() {
		setStatus('Salvando no banco...')
		try {
			if (parsedCTF.length) await (window as any).api.electronAPI.saveCTF(parsedCTF)
			if (parsedCTC.length) await (window as any).api.electronAPI.saveCTC(parsedCTC)

			setStatus('Concluído: arquivos processados e salvos')
		} catch (err) {
			console.error(err)
			setStatus('Erro: ' + String(err))
		}
	}

	function handleCreateCadastro(artigo: string, modelo: string) {
		// Para o fluxo de Encaixe, usamos apenas o modal simples de cadastro
		setShowModalFor({ artigo, modelo })
	}

	function handleModalSave(res: any) {
		// after save, refresh preview matches for the saved artigo+modelo
		setShowModalFor(null)
		// simple refresh: re-run lookup for current previewLines
		const current = previewLines.slice()
		lookupCadastrosForLines([{ of: '', linhas: current.map(pl => ({ of: pl.of, artigo: pl.artigo, modelo: pl.modelo, pares: pl.pares, codigoCor: pl.codigoCor, grade: pl.grade })) }])
	}

	function handleBatchModalSave() {
		setShowBatchModal(false)
		// refresh preview
		const current = previewLines.slice()
		lookupCadastrosForLines([{ of: '', linhas: current.map(pl => ({ of: pl.of, artigo: pl.artigo, modelo: pl.modelo, pares: pl.pares, codigoCor: pl.codigoCor, grade: pl.grade })) }])
	}

	function openBatchCadastro() {
		setShowBatchModal(true)
	}

	async function convertAndPreview(format: 'comelz' | 'emma' | 'lectra') {
		setStatus(`Convertendo para ${format.toUpperCase()}...`)
		try {
			let result: any
			// use first artigo/modelo as options (simple approach)
			const firstLine = previewLines[0]
			const options = firstLine ? { artigo: firstLine.artigo, componente: firstLine.modelo } : {}

			if (format === 'comelz') {
				result = await (window as any).api.conversorAPI.toComelz(parsedCTF, parsedCTC, options)
			} else if (format === 'emma') {
				result = await (window as any).api.conversorAPI.toEmma(parsedCTF, parsedCTC, options)
			} else if (format === 'lectra') {
				result = await (window as any).api.conversorAPI.toLectra(parsedCTF, parsedCTC, options)
			}

			setConversionPreview({ format, data: result })
			setStatus(`Preview de conversão ${format.toUpperCase()} pronto`)
		} catch (err) {
			console.error(err)
			setStatus('Erro na conversão: ' + String(err))
		}
	}

	async function exportConversion() {
		if (!conversionPreview) return

		setStatus('Exportando...')
		try {
			const filters = conversionPreview.format === 'lectra'
				? [{ name: 'MKX', extensions: ['mkx'] }]
				: [{ name: 'JSON', extensions: ['json'] }]

			const savePath = await (window as any).api.exportAPI.showSaveDialog({
				title: `Exportar ${conversionPreview.format.toUpperCase()}`,
				filters
			})

			if (!savePath) {
				setStatus('Exportação cancelada')
				return
			}

			if (conversionPreview.format === 'comelz') {
				await (window as any).api.exportAPI.exportComelz(conversionPreview.data, savePath)
			} else if (conversionPreview.format === 'emma') {
				await (window as any).api.exportAPI2.exportEmma(conversionPreview.data, savePath)
			} else if (conversionPreview.format === 'lectra') {
				const markerName = 'MARKER_' + Date.now()
				await (window as any).api.exportAPI2.exportLectra(conversionPreview.data, savePath, markerName)
			}

			setStatus(`Exportado com sucesso: ${savePath}`)
			setConversionPreview(null)
		} catch (err) {
			console.error(err)
			setStatus('Erro na exportação: ' + String(err))
		}
	}

	const linhasSemCadastro = previewLines.filter(l => !l.cadastro)

	return (
		<div className="space-y-6">
			<PageHeader title="Encaixe Automático" description="Fluxo para importar arquivos e gerar pedidos para encaixe automático" />

			<div className="grid grid-cols-1 gap-4 max-w-3xl">
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">Modelo selecionado: {modeloId || 'Nenhum'}</p>
					<div className="flex gap-2 flex-wrap">
						<Button onClick={selectCTF}>Selecionar arquivo CTF</Button>
						<Button onClick={selectCTC}>Selecionar arquivo CTC</Button>
						<Button onClick={parseAndPreview} disabled={!ctfFile && !ctcFile}>Processar (pré-visualizar)</Button>
						<Button onClick={processAndSave} disabled={previewLines.length === 0}>Processar e Salvar</Button>
					</div>
					<p className="text-sm text-muted-foreground">Status: {status}</p>
				</div>

				{previewLines.length > 0 && (
					<div className="flex gap-2 flex-wrap">
						<Button onClick={() => convertAndPreview('comelz')} variant="outline">Converter para Comelz</Button>
						<Button onClick={() => convertAndPreview('emma')} variant="outline">Converter para Emma</Button>
						<Button onClick={() => convertAndPreview('lectra')} variant="outline">Converter para Lectra</Button>
						{linhasSemCadastro.length > 0 && (
							<Button onClick={openBatchCadastro} variant="outline">Criar {linhasSemCadastro.length} Cadastros em Lote</Button>
						)}
					</div>
				)}

				<div>
					<h4 className="font-semibold">Pré-visualização de linhas</h4>
					<div className="mt-2 space-y-2">
						{previewLines.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma linha carregada</p>}
						{previewLines.map((l, idx) => (
							<div key={idx} className="p-2 border rounded flex justify-between items-center">
								<div>
									<div className="text-sm">OF: <strong>{l.of}</strong> — Artigo: <strong>{l.artigo}</strong> — Componente: <strong>{l.modelo}</strong></div>
									<div className="text-xs text-muted-foreground">Pares: {l.pares} — Cor: {l.codigoCor || '-' } — Grade: {l.grade || '-'}</div>
								</div>
								<div className="flex items-center gap-2">
									{l.cadastro ? (
										<div className="text-sm">Cadastro: <strong>{l.cadastro.material || l.cadastro.cor || l.cadastro.componente}</strong></div>
									) : (
										<Button onClick={() => handleCreateCadastro(l.artigo, l.modelo)}>Criar Cadastro</Button>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{showModalFor && (
				<CadastroModal artigo={showModalFor.artigo} modelo={showModalFor.modelo} onSave={handleModalSave} onClose={() => setShowModalFor(null)} />
			)}
			{showBatchModal && (
				<CadastrosBatchModal linhasSemCadastro={linhasSemCadastro} onSave={handleBatchModalSave} onClose={() => setShowBatchModal(false)} />
			)}
			{conversionPreview && (
				<ConversionPreviewModal preview={conversionPreview} onExport={exportConversion} onClose={() => setConversionPreview(null)} />
			)}
			{formOpen && (
				<ComponenteForm
					open={formOpen}
					onOpenChange={(open) => setFormOpen(open)}
					onSubmit={handleFormSubmit}
					componente={formEditingComponente}
					materiais={materiais}
					coresModelo={formModeloId ? getCoresByModelo(formModeloId) : []}
				/>
			)}
		</div>
	)
}
