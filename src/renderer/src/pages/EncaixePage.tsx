import { PageHeader } from "@renderer/components/common/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import { GeracaoArquivosTab } from "@renderer/components/encaixe/GeracaoArquivosTab"
import { ProcessamentoArquivosTab } from "@renderer/components/encaixe/ProcessamentoArquivosTab"
import { useState } from "react"

export type ListaAutomaticoItem = {
	of: string
	componente: string
	apelido: string
	maquina: string
	dados: any
	// Dados extras para exportação Lectra
	espacamento?: string
	sentidoMaterial?: string
	largura?: string
}

export default function EncaixePage() {
	const [listaAutomatico, setListaAutomatico] = useState<ListaAutomaticoItem[]>([])

	const adicionarNaLista = (item: ListaAutomaticoItem) => {
		setListaAutomatico(prev => [...prev, item])
	}

	const removerDaLista = (index: number) => {
		setListaAutomatico(prev => prev.filter((_, i) => i !== index))
	}

	const limparLista = () => {
		setListaAutomatico([])
	}

	return (
		<div className="space-y-6">
			<PageHeader 
				title="Sistema de Encaixe Automático" 
				description="Geração de arquivos para encaixe automático nas máquinas" 
			/>

			<Tabs defaultValue="geracao" className="w-full">
				<TabsList className="grid w-full max-w-md grid-cols-2">
					<TabsTrigger value="geracao">Geração de Arquivos</TabsTrigger>
					<TabsTrigger value="lista">
						Lista Automático
						{listaAutomatico.length > 0 && (
							<span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
								{listaAutomatico.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>
				
				<TabsContent value="geracao" className="mt-6">
					<GeracaoArquivosTab onAdicionarLista={adicionarNaLista} />
				</TabsContent>

				<TabsContent value="lista" className="mt-6">
					<ProcessamentoArquivosTab 
						lista={listaAutomatico}
						onRemover={removerDaLista}
						onLimpar={limparLista}
					/>
				</TabsContent>
			</Tabs>
		</div>
	)
}
