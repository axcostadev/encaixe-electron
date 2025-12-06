export interface Modelo {
  id: string;
  artigo: string;
  nome: string;
  cores: Cor[];
  componentes: Componente[];
}

export interface Cor {
  id: string;
  modeloId: string;
  abreviacao: string;
  nome: string;
}

export interface Material {
  id: string;
  artigo: string;
  largura: number;
  obs?: string;
  sentido: 'S' | 'N' | 'U';
}

export interface Componente {
  id: string;
  modeloId: string;
  sequencia: number;
  nome: string;
  materialId: string;
  tipoTecido: string;
  conjugacaoNavalha: string;
  placaPar: string;
  camadas: number;
  espacamento: number;
  compMaximo: number;
  percPerda: number;
  coresDisponiveis: string[];
}

export type SentidoType = 'S' | 'N' | 'U';

export const SENTIDO_OPTIONS: { value: SentidoType; label: string }[] = [
  { value: 'S', label: 'S - Sim' },
  { value: 'N', label: 'N - Não' },
  { value: 'U', label: 'U - Único' },
];
