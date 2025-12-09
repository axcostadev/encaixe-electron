import { PageHeader } from "@renderer/components/common/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import { GeracaoArquivosTab } from "@renderer/components/encaixe/GeracaoArquivosTab"
import { ProcessamentoArquivosTab } from "@renderer/components/encaixe/ProcessamentoArquivosTab"

export default function EncaixePage() {
	return (
		<div className="space-y-6">
			<PageHeader 
				title="Sistema de Encaixe Automático" 
				description="Geração de arquivos para encaixe automático nas máquinas" 
			/>

			<Tabs defaultValue="geracao" className="w-full">
				<TabsList className="grid w-full max-w-md grid-cols-2">
					<TabsTrigger value="geracao">Geração de Arquivos</TabsTrigger>
					<TabsTrigger value="processamento">Processamento</TabsTrigger>
				</TabsList>
				
				<TabsContent value="geracao" className="mt-6">
					<GeracaoArquivosTab />
				</TabsContent>

				<TabsContent value="processamento" className="mt-6">
					<ProcessamentoArquivosTab />
				</TabsContent>
			</Tabs>
		</div>
	)
}
