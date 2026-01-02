export interface OperationComponent {
  id: string;
  nome_operacao: string;
  materiais_operacao: string;
  setores_posteriores: string[];
  setor_atual: string;
  infestado_lado_so: boolean;
  pecas_par: string;
  conjugacao: string;
  ftls?: number;
  agrupamento_tamanhos: string[];
  foto_desenho_url?: string;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
  field_order?: string[];
}

export interface DragDropItem {
  id: string;
  index: number;
}

export interface EditableField {
}

export interface HandbookModel {
  id: string;
  nome_modelo: string;
  tamanhos: number[];
  numero_projeto: string;
  numero_artigo: string;
  forma: string;
  created_at: string;
  updated_at?: string;
  componentes?: OperationComponent[];
}

export interface ModelComponent extends OperationComponent {
  model_id: string;
}
