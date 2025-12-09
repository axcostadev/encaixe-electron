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
	materialId: number
	tipoTecido: string
	conjugacaoNavalha: string
	placaPar: string
	camadas: number
	espacamento: number
	compMaximo: number
	percPerda: number
	coresDisponiveis: string[]
}

export type SentidoType = "S" | "N" | "U"

export const SENTIDO_OPTIONS: { value: SentidoType; label: string }[] = [
	{ value: "S", label: "S - Sim" },
	{ value: "N", label: "N - Não" },
	{ value: "U", label: "U - Único" },
]
