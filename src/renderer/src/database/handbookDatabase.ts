import { OperationComponent, HandbookModel } from '@renderer/types/handbook';

export class HandbookDatabaseManager {
  private components: OperationComponent[] = [];
  private models: HandbookModel[] = [];
  private storageKey = 'handbook_components_data';
  private modelsStorageKey = 'handbook_models_data';

  constructor() {
    this.initializeData();
    this.initializeModels();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.components));
    } catch (error) {
      console.warn('Erro ao salvar no localStorage:', error);
    }
  }

  private saveModelsToStorage() {
    try {
      localStorage.setItem(this.modelsStorageKey, JSON.stringify(this.models));
    } catch (error) {
      console.warn('Erro ao salvar modelos no localStorage:', error);
    }
  }

  private loadFromStorage(): OperationComponent[] | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Erro ao carregar do localStorage:', error);
    }
    return null;
  }

  private loadModelsFromStorage(): HandbookModel[] | null {
    try {
      const stored = localStorage.getItem(this.modelsStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Erro ao carregar modelos do localStorage:', error);
    }
    return null;
  }

  private initializeData() {
    const storedData = this.loadFromStorage();
    if (storedData && storedData.length > 0) {
      this.components = storedData;
      return;
    }

    // Dados padrão de exemplo
    this.components = [
      {
        id: '1',
        nome_operacao: '01 PLACA DA VISTA',
        materiais_operacao: 'LP1050 - 1.38',
        setores_posteriores: ['FREQUÊNCIA', 'SERIGRAFIA'],
        setor_atual: 'COMELZ',
        infestado_lado_so: true,
        pecas_par: '1 PLACA/2 PEÇAS/4 FLS',
        conjugacao: '6 PARES',
        agrupamento_tamanhos: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
        position_x: 0,
        position_y: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        nome_operacao: '02 PLACA DO LOGO EXTERNO/INTERNO',
        materiais_operacao: 'LP1202 - 1.38',
        setores_posteriores: ['FREQUÊNCIA', 'SERIGRAFIA'],
        setor_atual: 'COMELZ',
        infestado_lado_so: true,
        pecas_par: '1 PLACA/PAR/4 FLS',
        conjugacao: '12 PARES',
        agrupamento_tamanhos: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
        position_x: 1,
        position_y: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        nome_operacao: '03 PLACA DO ENFEITE DO PASSADOR LÍNGUA',
        materiais_operacao: 'LP1195 - 1.38',
        setores_posteriores: ['FREQUÊNCIA', 'SERIGRAFIA'],
        setor_atual: 'EMMA',
        infestado_lado_so: true,
        pecas_par: '1 PLACA/3 PEÇAS/4 FLS',
        conjugacao: '4 PARES',
        agrupamento_tamanhos: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
        position_x: 2,
        position_y: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        nome_operacao: '04 PLACA DO TRASEIRO EXTERNO + INTERNO',
        materiais_operacao: 'LP1195 - 1.38',
        setores_posteriores: ['FREQUÊNCIA', 'SERIGRAFIA'],
        setor_atual: 'COMELZ',
        infestado_lado_so: true,
        pecas_par: '1 PLACA/PAR/4 FLS',
        conjugacao: '12 PARES',
        agrupamento_tamanhos: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
        position_x: 3,
        position_y: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    this.saveToStorage();
  }

  private initializeModels() {
    const storedModels = this.loadModelsFromStorage();
    if (storedModels && storedModels.length > 0) {
      this.models = storedModels;
      return;
    }

    this.models = [
      {
        id: '1',
        nome_modelo: 'MIZUNO COOL RIDE 2',
        tamanhos: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
        numero_projeto: '087',
        numero_artigo: '101087087',
        forma: '34A37-6N063UNL;38A44-6N063UN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    this.saveModelsToStorage();
  }

  getAllComponents(): OperationComponent[] {
    return [...this.components].sort((a, b) => {
      if (a.position_y !== b.position_y) {
        return a.position_y - b.position_y;
      }
      return a.position_x - b.position_x;
    });
  }

  updateComponentPosition(id: string, position_x: number, position_y: number) {
    const componentIndex = this.components.findIndex(c => c.id === id);
    if (componentIndex !== -1) {
      this.components[componentIndex] = {
        ...this.components[componentIndex],
        position_x,
        position_y,
        updated_at: new Date().toISOString()
      };
      this.saveToStorage();
    }
  }

  updateComponent(id: string, updates: Partial<OperationComponent>) {
    const componentIndex = this.components.findIndex(c => c.id === id);
    if (componentIndex !== -1) {
      this.components[componentIndex] = {
        ...this.components[componentIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.saveToStorage();
    }
  }

  createComponent(component: Omit<OperationComponent, 'id' | 'created_at' | 'updated_at'>) {
    const newComponent: OperationComponent = {
      ...component,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.components.push(newComponent);
    this.saveToStorage();
    return newComponent;
  }

  deleteComponent(id: string) {
    this.components = this.components.filter(c => c.id !== id);
    this.saveToStorage();
  }

  // Métodos para modelos
  getAllModels(): HandbookModel[] {
    return [...this.models].sort((a, b) => a.nome_modelo.localeCompare(b.nome_modelo));
  }

  createModel(model: Omit<HandbookModel, 'id' | 'created_at' | 'updated_at'>) {
    const newModel: HandbookModel = {
      ...model,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.models.push(newModel);
    this.saveModelsToStorage();
    return newModel;
  }

  updateModel(id: string, updates: Partial<HandbookModel>) {
    const modelIndex = this.models.findIndex(m => m.id === id);
    if (modelIndex !== -1) {
      this.models[modelIndex] = {
        ...this.models[modelIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.saveModelsToStorage();
    }
  }

  deleteModel(id: string) {
    this.models = this.models.filter(m => m.id !== id);
    this.saveModelsToStorage();
  }

  getModelById(id: string): HandbookModel | undefined {
    return this.models.find(m => m.id === id);
  }

  updateFieldOrder(id: string, fieldOrder: string[]) {
    const componentIndex = this.components.findIndex(c => c.id === id);
    if (componentIndex !== -1) {
      this.components[componentIndex] = {
        ...this.components[componentIndex],
        field_order: fieldOrder,
        updated_at: new Date().toISOString()
      };
      this.saveToStorage();
    }
  }

  resetData() {
    localStorage.removeItem(this.storageKey);
    this.components = [];
    this.initializeData();
  }
}

export const handbookDatabase = new HandbookDatabaseManager();
