import { OperationComponent, HandbookModel, Brand } from '@renderer/types/handbook';

export class HandbookDatabaseManager {
  private components: OperationComponent[] = [];
  private models: HandbookModel[] = [];
  private brands: Brand[] = [];
  private storageKey = 'handbook_components_data';
  private modelsStorageKey = 'handbook_models_data';
  private brandsStorageKey = 'handbook_brands_data';

  constructor() {
    this.initializeBrands();
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

  private saveBrandsToStorage() {
    try {
      localStorage.setItem(this.brandsStorageKey, JSON.stringify(this.brands));
    } catch (error) {
      console.warn('Erro ao salvar marcas no localStorage:', error);
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

  private loadBrandsFromStorage(): Brand[] | null {
    try {
      const stored = localStorage.getItem(this.brandsStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Erro ao carregar marcas do localStorage:', error);
    }
    return null;
  }

  private initializeBrands() {
    const storedBrands = this.loadBrandsFromStorage();
    if (storedBrands && storedBrands.length > 0) {
      this.brands = storedBrands;
      return;
    }

    // Marcas padrão
    this.brands = [
      {
        id: '1',
        nome: 'MIZUNO',
        cor: '#1e40af',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        nome: 'OLYMPIKUS',
        cor: '#dc2626',
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        nome: 'UNDER ARMOUR',
        cor: '#000000',
        created_at: new Date().toISOString(),
      }
    ];
    this.saveBrandsToStorage();
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
        modelo_id: '1',
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
        modelo_id: '1',
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
        modelo_id: '1',
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
        modelo_id: '1',
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
        marca_id: '1', // MIZUNO
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

  getComponentsByModel(modeloId: string): OperationComponent[] {
    return this.components
      .filter(c => c.modelo_id === modeloId)
      .sort((a, b) => {
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

  getModelsByBrand(marcaId: string): HandbookModel[] {
    return this.models
      .filter(m => m.marca_id === marcaId)
      .sort((a, b) => a.nome_modelo.localeCompare(b.nome_modelo));
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
    // Deletar todos os componentes associados ao modelo
    this.components = this.components.filter(c => c.modelo_id !== id);
    this.saveToStorage();
    // Deletar o modelo
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

  // Métodos para marcas
  getAllBrands(): Brand[] {
    return [...this.brands].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  getBrandById(id: string): Brand | undefined {
    return this.brands.find(b => b.id === id);
  }

  createBrand(brand: Omit<Brand, 'id' | 'created_at' | 'updated_at'>) {
    const newBrand: Brand = {
      ...brand,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.brands.push(newBrand);
    this.saveBrandsToStorage();
    return newBrand;
  }

  updateBrand(id: string, updates: Partial<Brand>) {
    const brandIndex = this.brands.findIndex(b => b.id === id);
    if (brandIndex !== -1) {
      this.brands[brandIndex] = {
        ...this.brands[brandIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.saveBrandsToStorage();
    }
  }

  deleteBrand(id: string) {
    // Deletar todos os modelos (e seus componentes) associados à marca
    const modelsToDelete = this.models.filter(m => m.marca_id === id);
    modelsToDelete.forEach(model => {
      this.components = this.components.filter(c => c.modelo_id !== model.id);
    });
    this.saveToStorage();
    
    this.models = this.models.filter(m => m.marca_id !== id);
    this.saveModelsToStorage();
    
    this.brands = this.brands.filter(b => b.id !== id);
    this.saveBrandsToStorage();
  }

  // Duplicar modelo com todos os componentes
  duplicateModel(modelId: string): HandbookModel | null {
    const originalModel = this.getModelById(modelId);
    if (!originalModel) return null;

    // Criar novo modelo com nome modificado
    const newModel = this.createModel({
      nome_modelo: `${originalModel.nome_modelo} (Cópia)`,
      numero_projeto: originalModel.numero_projeto,
      numero_artigo: originalModel.numero_artigo,
      forma: originalModel.forma,
      tamanhos: [...originalModel.tamanhos],
      marca_id: originalModel.marca_id
    });

    // Copiar todos os componentes
    const originalComponents = this.getComponentsByModel(modelId);
    originalComponents.forEach(comp => {
      this.createComponent({
        modelo_id: newModel.id,
        nome_operacao: comp.nome_operacao,
        materiais_operacao: comp.materiais_operacao,
        setores_posteriores: [...comp.setores_posteriores],
        setor_atual: comp.setor_atual,
        foto_desenho_url: comp.foto_desenho_url,
        infestado_lado_so: comp.infestado_lado_so,
        pecas_par: comp.pecas_par,
        conjugacao: comp.conjugacao,
        agrupamento_tamanhos: [...comp.agrupamento_tamanhos],
        position_x: comp.position_x,
        position_y: comp.position_y,
        field_order: comp.field_order ? [...comp.field_order] : undefined,
        fls: comp.fls
      });
    });

    return newModel;
  }

  // Exportar modelo para JSON
  exportModelToJSON(modelId: string): string | null {
    const model = this.getModelById(modelId);
    if (!model) return null;

    const components = this.getComponentsByModel(modelId);
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      model: {
        nome_modelo: model.nome_modelo,
        numero_projeto: model.numero_projeto,
        numero_artigo: model.numero_artigo,
        forma: model.forma,
        tamanhos: model.tamanhos
      },
      components: components.map(c => ({
        nome_operacao: c.nome_operacao,
        materiais_operacao: c.materiais_operacao,
        setores_posteriores: c.setores_posteriores,
        setor_atual: c.setor_atual,
        foto_desenho_url: c.foto_desenho_url,
        infestado_lado_so: c.infestado_lado_so,
        pecas_par: c.pecas_par,
        conjugacao: c.conjugacao,
        agrupamento_tamanhos: c.agrupamento_tamanhos,
        position_x: c.position_x,
        position_y: c.position_y,
        field_order: c.field_order,
        fls: c.fls
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Importar modelo de JSON
  importModelFromJSON(json: string, marcaId?: string): HandbookModel | null {
    try {
      const data = JSON.parse(json);
      
      if (!data.model || !data.components) {
        return null;
      }

      // Usar marca fornecida ou não definir (será necessário selecionar)
      if (!marcaId) return null;

      const newModel = this.createModel({
        nome_modelo: `${data.model.nome_modelo} (Importado)`,
        numero_projeto: data.model.numero_projeto,
        numero_artigo: data.model.numero_artigo,
        forma: data.model.forma,
        tamanhos: data.model.tamanhos || [],
        marca_id: marcaId
      });

      // Importar componentes
      data.components.forEach((comp: Record<string, unknown>) => {
        this.createComponent({
          modelo_id: newModel.id,
          nome_operacao: comp.nome_operacao as string || '',
          materiais_operacao: comp.materiais_operacao as string || '',
          setores_posteriores: comp.setores_posteriores as string[] || [],
          setor_atual: comp.setor_atual as string || 'COMELZ',
          foto_desenho_url: comp.foto_desenho_url as string,
          infestado_lado_so: comp.infestado_lado_so as boolean ?? true,
          pecas_par: comp.pecas_par as string || '',
          conjugacao: comp.conjugacao as string || '',
          agrupamento_tamanhos: comp.agrupamento_tamanhos as string[] || [],
          position_x: comp.position_x as number || 0,
          position_y: comp.position_y as number || 0,
          field_order: comp.field_order as string[],
          fls: comp.fls as number
        });
      });

      return newModel;
    } catch {
      return null;
    }
  }

  // Obter contagem de componentes por modelo
  getComponentCountByModel(modelId: string): number {
    return this.components.filter(c => c.modelo_id === modelId).length;
  }
}

export const handbookDatabase = new HandbookDatabaseManager();
