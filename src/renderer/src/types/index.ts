export interface Modelo {
	id: number
	artigo: string
	nome: string
	cores: Cor[]
	componentes: Componente[]
}

export interface Cor {
	id: number
	modeloId: number
	abreviacao: string
	nome: string
}

export interface Material {
	id: number
	artigo: string
	largura: number
	obs?: string
	sentido: "S" | "N" | "U"
}

export interface Componente {
	id: number
	modeloId: number
	sequencia: number
	nome: string
	apelido?: string
	materialId: number
	tipoTecido: number
	conjugacaoNavalha: string
	placaPar: string
	camadas: number
	espacamento: number
	compMaximo: number
	percPerda: number
	coresDisponiveis: string[]
	tamanhos: { tamanhoInicial: number; tamanhoFinal: number }[]
	// novos campos opcionais para compatibilidade com o novo esquema
	modeloCorId?: number
	setorId?: number
	numeroTecido?: string
}

export type ComponentePayload = Omit<
	Componente,
	"id" | "modeloId" | "sequencia"
>

export type SentidoType = "S" | "N" | "U"

export const SENTIDO_OPTIONS: { value: SentidoType; label: string }[] = [
	{ value: "S", label: "S - Sim" },
	{ value: "N", label: "N - Não" },
	{ value: "U", label: "U - Único" },
]

// ==================== TIPOS PARA SISTEMA DE ENCAIXE ====================

// Pedido Comelz
export interface PedidoComelz {
	id?: string
	date?: string
	note?: string
	customer?: string
	split_materials?: boolean
	model: string
	qty: QtyRuleComelz[]
}

export interface QtyRuleComelz {
	part_name?: string
	part_size?: string
	fitting?: string
	mirror?: boolean
	parts?: number
	material?: string
	items?: number
}

// Pedido Emma
export interface PedidoEmma {
	customer: string
	date: string
	id: string
	model: string
	qty: QtyEmma[]
}

export interface QtyEmma {
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

// Pedido Lectra
export interface ModelDataLectra {
	codigo: string
	tamanho: string | number
	a: number
	b: number
	c: number
	d: number
}

// Dados parseados dos arquivos
export interface LinhaCTF {
	artigo: string
	modelo: string
	codigoCor: string
	grade: string
	pares: number
	of: string
}

export interface LinhaCTC {
	of: string
	artigo: string
	modelo: string
	codigoCor: string
	grade: string
	pares: number
	especificacaoTecnica: string
	prioridade: string
}

export interface DadosCTF {
	of: string
	linhas: LinhaCTF[]
}

export interface DadosCTC {
	of: string
	linhas: LinhaCTC[]
}
