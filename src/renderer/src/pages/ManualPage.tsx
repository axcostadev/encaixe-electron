import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HandbookDragDropGrid } from '@renderer/components/handbook/HandbookDragDropGrid';
import { HandbookViewer } from '@renderer/components/handbook/HandbookViewer';
import { HandbookModelForm } from '@renderer/components/handbook/HandbookModelForm';
import { ManualBreadcrumb } from '@renderer/components/handbook/ManualBreadcrumb';
import { handbookDatabase } from '@renderer/database/handbookDatabase';
import { HandbookModel, Brand } from '@renderer/types/handbook';
import { useAuth } from '@renderer/contexts/AuthContext';
import { toast } from 'sonner';
import { activityLogger } from '@renderer/services/activityLogger';
import { ModelGridSkeleton, Spinner } from '@renderer/components/ui/Skeleton';
import { 
  Book, 
  Edit3, 
  Eye, 
  Plus, 
  FolderOpen,
  Settings,
  FileText,
  X,
  Tag,
  Search,
  SortAsc,
  SortDesc,
  Copy,
  Download,
  Upload,
  ArrowUpDown
} from 'lucide-react';

type TabType = 'modelos' | 'edicao' | 'visualizacao';
type SortField = 'nome_modelo' | 'numero_projeto' | 'numero_artigo' | 'created_at';
type SortOrder = 'asc' | 'desc';

const ManualPage: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('canEditManual');
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | undefined>();
  const [models, setModels] = useState<HandbookModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<HandbookModel | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<HandbookModel | undefined>();
  const [activeTab, setActiveTab] = useState<TabType>('modelos');
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandColor, setNewBrandColor] = useState('#1e40af');
  const [modelSearch, setModelSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome_modelo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isLoading, setIsLoading] = useState(false);

  const loadBrands = useCallback(() => {
    const loadedBrands = handbookDatabase.getAllBrands();
    setBrands(loadedBrands);
    // Selecionar primeira marca se nenhuma estiver selecionada
    if (loadedBrands.length > 0 && !selectedBrand) {
      setSelectedBrand(loadedBrands[0]);
    }
  }, [selectedBrand]);

  const loadModels = useCallback(() => {
    if (selectedBrand) {
      setIsLoading(true);
      const loadedModels = handbookDatabase.getModelsByBrand(selectedBrand.id);
      setModels(loadedModels);
      setIsLoading(false);
    } else {
      setModels([]);
    }
  }, [selectedBrand]);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    loadModels();
    // Limpar modelo selecionado ao trocar de marca
    setSelectedModel(undefined);
  }, [selectedBrand, loadModels]);

  const handleSelectBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setSelectedModel(undefined);
    setShowForm(false);
    setEditingModel(undefined);
  };

  const handleCreateBrand = () => {
    if (!newBrandName.trim()) return;
    const brand = handbookDatabase.createBrand({
      nome: newBrandName.toUpperCase().trim(),
      cor: newBrandColor
    });
    activityLogger.logCreateBrand(user, brand.id, brand.nome);
    toast.success(`Marca "${brand.nome}" criada com sucesso!`);
    setNewBrandName('');
    setNewBrandColor('#1e40af');
    setShowBrandForm(false);
    loadBrands();
  };


  const handleSelectModel = (model: HandbookModel) => {
    setSelectedModel(model);
    setShowForm(false);
    setEditingModel(undefined);
  };

  const handleCreateNew = () => {
    if (!selectedBrand) {
      toast.warning('Selecione uma marca antes de criar um modelo.');
      return;
    }
    setEditingModel(undefined);
    setShowForm(true);
  };

  const handleEditModel = (model: HandbookModel) => {
    setEditingModel(model);
    setShowForm(true);
  };

  const handleDeleteModel = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    handbookDatabase.deleteModel(modelId);
    if (model) {
      activityLogger.logDeleteModel(user, modelId, model.nome_modelo, selectedBrand?.nome);
      toast.success(`Modelo "${model.nome_modelo}" excluído com sucesso!`);
    }
    loadModels();
    if (selectedModel?.id === modelId) {
      setSelectedModel(undefined);
    }
  };

  const handleDuplicateModel = (model: HandbookModel) => {
    const duplicated = handbookDatabase.duplicateModel(model.id);
    if (duplicated) {
      activityLogger.logDuplicateModel(user, model.id, duplicated.id, duplicated.nome_modelo);
      toast.success(`Modelo "${duplicated.nome_modelo}" criado como cópia!`);
      loadModels();
      setSelectedModel(duplicated);
    } else {
      toast.error('Não foi possível duplicar o modelo.');
    }
  };

  const handleExportModel = (model: HandbookModel) => {
    const exported = handbookDatabase.exportModelToJSON(model.id);
    if (exported) {
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.nome_modelo.replace(/\s+/g, '_')}_backup.json`;
      a.click();
      URL.revokeObjectURL(url);
      activityLogger.logExportModel(user, model.id, model.nome_modelo);
      toast.success(`Backup do modelo "${model.nome_modelo}" baixado!`);
    } else {
      toast.error('Não foi possível exportar o modelo.');
    }
  };

  const handleImportModel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            const imported = handbookDatabase.importModelFromJSON(json, selectedBrand?.id);
            if (imported) {
              activityLogger.logImportModel(user, imported.id, imported.nome_modelo);
              toast.success(`Modelo "${imported.nome_modelo}" importado com sucesso!`);
              loadModels();
              setSelectedModel(imported);
            } else {
              toast.error('Arquivo inválido ou marca não selecionada.');
            }
          } catch {
            toast.error('Arquivo JSON inválido.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSaveModel = (modelData: Omit<HandbookModel, 'id' | 'created_at' | 'componentes' | 'marca_id'>) => {
    if (editingModel) {
      handbookDatabase.updateModel(editingModel.id, modelData);
      activityLogger.logUpdateModel(user, editingModel.id, modelData.nome_modelo, modelData);
      toast.success(`Modelo "${modelData.nome_modelo}" salvo com sucesso!`);
      loadModels();
      setShowForm(false);
      setEditingModel(undefined);
    } else {
      // Criar novo modelo
      const newModel = handbookDatabase.createModel({
        ...modelData,
        marca_id: selectedBrand!.id
      });
      
      activityLogger.logCreateModel(user, newModel.id, newModel.nome_modelo, selectedBrand!.id, selectedBrand!.nome);
      toast.success(`Modelo "${newModel.nome_modelo}" criado com sucesso!`);
      loadModels();
      setShowForm(false);
      setEditingModel(undefined);
      
      // Selecionar o modelo criado e ir para aba de edição automaticamente
      if (newModel) {
        setSelectedModel(newModel);
        setActiveTab('edicao');
      }
    }
  };

  // Modelos filtrados e ordenados
  const filteredAndSortedModels = useMemo(() => {
    let result = models.filter(m => {
      const search = modelSearch.toLowerCase();
      return (
        m.nome_modelo.toLowerCase().includes(search) ||
        m.numero_projeto.toLowerCase().includes(search) ||
        m.numero_artigo.toLowerCase().includes(search)
      );
    });
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'nome_modelo':
          comparison = a.nome_modelo.localeCompare(b.nome_modelo);
          break;
        case 'numero_projeto':
          comparison = a.numero_projeto.localeCompare(b.numero_projeto);
          break;
        case 'numero_artigo':
          comparison = a.numero_artigo.localeCompare(b.numero_artigo);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [models, modelSearch, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Contar componentes do modelo selecionado
  const componentCount = useMemo(() => {
    if (selectedModel) {
      return handbookDatabase.getComponentsByModel(selectedModel.id).length;
    }
    return 0;
  }, [selectedModel]);

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingModel(undefined);
  };

  const handleGoToEdit = () => {
    if (selectedModel) {
      setActiveTab('edicao');
    }
  };

  const handleGoToView = () => {
    if (selectedModel) {
      setActiveTab('visualizacao');
    }
  };

  const tabs = [
    { id: 'modelos' as TabType, label: 'Modelos', icon: FolderOpen, description: 'Gerenciar modelos' },
    ...(canEdit ? [{ id: 'edicao' as TabType, label: 'Edição', icon: Edit3, description: 'Editar componentes' }] : []),
    { id: 'visualizacao' as TabType, label: 'Visualização', icon: Eye, description: 'Visualizar e imprimir' },
  ];

  // Modo tela cheia para visualização
  const isFullView = activeTab === 'visualizacao' && selectedModel;

  // Se estiver em modo visualização com modelo, mostra tela cheia
  if (isFullView) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Barra superior mínima */}
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border print:hidden">
          <div className="flex items-center gap-3">
            <Book className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{selectedModel.nome_modelo}</span>
          </div>
          <button
            onClick={() => setActiveTab('modelos')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted-foreground/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Fechar
          </button>
        </div>
        {/* Visualizador em tela cheia */}
        <div className="flex-1 overflow-auto">
          <HandbookViewer selectedModel={selectedModel} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar com abas */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Manual</h1>
              <p className="text-xs text-blue-100">Sistema de Operação</p>
            </div>
          </div>
        </div>

        {/* Abas de Marcas */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Marcas</span>
            {canEdit && (
              <button
                onClick={() => setShowBrandForm(!showBrandForm)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                title="Nova Marca"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Formulário nova marca */}
          {showBrandForm && canEdit && (
            <div className="mb-3 p-2 bg-muted rounded-lg space-y-2">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nome da marca"
                className="w-full px-2 py-1 text-sm bg-background border border-border rounded"
              />
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newBrandColor}
                  onChange={(e) => setNewBrandColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <button
                  onClick={handleCreateBrand}
                  disabled={!newBrandName.trim()}
                  className="flex-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowBrandForm(false)}
                  className="px-2 py-1 text-xs bg-muted-foreground/20 rounded hover:bg-muted-foreground/30"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Lista de marcas como abas */}
          <div className="flex flex-wrap gap-1">
            {brands.map(brand => (
              <div key={brand.id} className="relative group">
                <button
                  onClick={() => handleSelectBrand(brand)}
                  style={{ 
                    backgroundColor: selectedBrand?.id === brand.id ? brand.cor : 'transparent',
                    borderColor: brand.cor 
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
                    selectedBrand?.id === brand.id
                      ? 'text-white'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {brand.nome}
                </button>
              </div>
            ))}
          </div>
          
          {brands.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhuma marca cadastrada
            </p>
          )}
        </div>

        {/* Navegação por abas */}
        <nav className="flex-1 p-3">
          <div className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary/20 text-primary border-l-4 border-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <div className="font-medium text-sm">{tab.label}</div>
                  <div className="text-xs text-muted-foreground">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Modelo selecionado */}
          {selectedModel && (
            <div className="mt-6 p-3 bg-primary/10 rounded-lg border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">MODELO ATIVO</span>
              </div>
              {selectedBrand && (
                <span 
                  className="inline-block px-2 py-0.5 text-xs font-semibold text-white rounded mb-2"
                  style={{ backgroundColor: selectedBrand.cor }}
                >
                  {selectedBrand.nome}
                </span>
              )}
              <h3 className="font-semibold text-foreground text-sm truncate">
                {selectedModel.nome_modelo}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Projeto: {selectedModel.numero_projeto}
              </p>
              <div className="flex gap-2 mt-3">
                {canEdit && (
                  <button
                    onClick={handleGoToEdit}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </button>
                )}
                <button
                  onClick={handleGoToView}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Ver
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Rodapé */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{models.length} modelo(s)</span>
            <Settings className="w-4 h-4 cursor-pointer hover:text-foreground" />
          </div>
        </div>
      </div>

      {/* Área de conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra de título da aba */}
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {activeTab === 'modelos' && 'Gerenciar Modelos'}
              {activeTab === 'edicao' && 'Editor de Componentes'}
              {activeTab === 'visualizacao' && 'Visualização do Manual'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'modelos' && 'Crie e gerencie os modelos de manuais'}
              {activeTab === 'edicao' && 'Arraste e edite os componentes do manual'}
              {activeTab === 'visualizacao' && 'Visualize o manual pronto para impressão'}
            </p>
          </div>
          
          {activeTab === 'modelos' && canEdit && (
            <div className="flex items-center gap-3">
              {selectedBrand && (
                <span 
                  className="px-3 py-1 text-sm font-semibold text-white rounded-lg"
                  style={{ backgroundColor: selectedBrand.cor }}
                >
                  {selectedBrand.nome}
                </span>
              )}
              <button
                onClick={handleCreateNew}
                disabled={!selectedBrand}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={!selectedBrand ? 'Selecione uma marca primeiro' : 'Novo Modelo'}
              >
                <Plus className="w-4 h-4" />
                Novo Modelo
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo da aba */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'modelos' && (
            <div className="p-6">
              {!selectedBrand ? (
                <div className="text-center py-12">
                  <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Selecione uma marca</h3>
                  <p className="text-muted-foreground">Escolha uma marca no menu acima para ver seus modelos</p>
                </div>
              ) : showForm ? (
                <div className="max-w-2xl mx-auto">
                  <HandbookModelForm
                    model={editingModel}
                    onSave={handleSaveModel}
                    onCancel={handleCancelForm}
                  />
                </div>
              ) : (
                <div className="max-w-5xl mx-auto">
                  {/* Breadcrumb */}
                  <div className="mb-4">
                    <ManualBreadcrumb
                      brandName={selectedBrand?.nome}
                      brandColor={selectedBrand?.cor}
                      modelName={selectedModel?.nome_modelo}
                      componentCount={componentCount}
                      onClickHome={() => setActiveTab('modelos')}
                      onClickBrand={() => setSelectedModel(undefined)}
                      currentPage={activeTab}
                    />
                  </div>

                  {/* Barra de Busca e Ordenação */}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    {/* Busca */}
                    <div className="relative flex-1 min-w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Pesquisar por nome, projeto ou artigo..."
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground"
                      />
                    </div>

                    {/* Ordenação */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                      <button
                        onClick={() => toggleSort('nome_modelo')}
                        className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 transition-colors ${
                          sortField === 'nome_modelo' ? 'bg-primary text-white' : 'hover:bg-muted-foreground/20'
                        }`}
                        title="Ordenar por nome"
                      >
                        Nome
                        {sortField === 'nome_modelo' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                      <button
                        onClick={() => toggleSort('numero_projeto')}
                        className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 transition-colors ${
                          sortField === 'numero_projeto' ? 'bg-primary text-white' : 'hover:bg-muted-foreground/20'
                        }`}
                        title="Ordenar por projeto"
                      >
                        Projeto
                        {sortField === 'numero_projeto' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                      <button
                        onClick={() => toggleSort('created_at')}
                        className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 transition-colors ${
                          sortField === 'created_at' ? 'bg-primary text-white' : 'hover:bg-muted-foreground/20'
                        }`}
                        title="Ordenar por data"
                      >
                        Data
                        {sortField === 'created_at' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </div>

                    {/* Botões de ação */}
                    {canEdit && (
                      <>
                        <button
                          onClick={handleImportModel}
                          disabled={!selectedBrand}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-muted hover:bg-muted-foreground/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Importar modelo de backup"
                        >
                          <Upload className="w-4 h-4" />
                          Importar
                        </button>
                      </>
                    )}
                  </div>

                  {/* Contagem de resultados */}
                  <div className="mb-3 text-sm text-muted-foreground">
                    {modelSearch ? (
                      <span>{filteredAndSortedModels.length} resultado(s) para "{modelSearch}"</span>
                    ) : (
                      <span>{models.length} modelo(s) em {selectedBrand?.nome}</span>
                    )}
                  </div>

                  {/* Grid de modelos ou Loading */}
                  {isLoading ? (
                    <ModelGridSkeleton count={6} />
                  ) : (
                    <ModelosGrid
                      models={filteredAndSortedModels}
                      selectedModel={selectedModel}
                      onSelectModel={handleSelectModel}
                      onEditModel={handleEditModel}
                      onDeleteModel={handleDeleteModel}
                      onDuplicateModel={handleDuplicateModel}
                      onExportModel={handleExportModel}
                      onGoToEdit={handleGoToEdit}
                      onGoToView={handleGoToView}
                      canEdit={canEdit}
                      selectedBrand={selectedBrand}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'edicao' && (
            <HandbookDragDropGrid selectedModel={selectedModel} />
          )}

          {activeTab === 'visualizacao' && (
            <HandbookViewer selectedModel={selectedModel} />
          )}
        </div>
      </div>
    </div>
  );
};

// Componente de grid de modelos mais visual
interface ModelosGridProps {
  models: HandbookModel[];
  selectedModel?: HandbookModel;
  onSelectModel: (model: HandbookModel) => void;
  onEditModel: (model: HandbookModel) => void;
  onDeleteModel: (modelId: string) => void;
  onDuplicateModel: (model: HandbookModel) => void;
  onExportModel: (model: HandbookModel) => void;
  onGoToEdit: () => void;
  onGoToView: () => void;
  canEdit: boolean;
  selectedBrand?: Brand;
}

const ModelosGrid: React.FC<ModelosGridProps> = ({
  models,
  selectedModel,
  onSelectModel,
  onDeleteModel,
  onDuplicateModel,
  onExportModel,
  onGoToEdit,
  onGoToView,
  canEdit,
  selectedBrand
}) => {
  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          Nenhum modelo em {selectedBrand?.nome || 'esta marca'}
        </h3>
        <p className="text-muted-foreground">Clique em "Novo Modelo" para começar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map(model => {
        const componentCount = handbookDatabase.getComponentCountByModel(model.id);
        return (
          <div
            key={model.id}
            onClick={() => onSelectModel(model)}
            className={`bg-card rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
              selectedModel?.id === model.id
                ? 'border-primary shadow-md ring-2 ring-primary/20'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            {/* Badge selecionado + contador de componentes */}
            <div className="flex justify-between items-start mb-2">
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                {componentCount} componente{componentCount !== 1 ? 's' : ''}
              </span>
              {selectedModel?.id === model.id && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
                  Selecionado
                </span>
              )}
            </div>

            {/* Nome do modelo */}
            <h3 className="font-bold text-foreground text-lg mb-2">
              {model.nome_modelo}
            </h3>

            {/* Informações */}
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projeto:</span>
                <span className="font-medium text-foreground">{model.numero_projeto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Artigo:</span>
                <span className="font-medium text-foreground">{model.numero_artigo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forma:</span>
                <span className="font-medium text-foreground truncate max-w-32">{model.forma}</span>
              </div>
            </div>

            {/* Tamanhos */}
            <div className="flex flex-wrap gap-1 mb-4">
              {model.tamanhos.slice(0, 8).map((tam, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded"
                >
                  {tam}
                </span>
              ))}
              {model.tamanhos.length > 8 && (
                <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                  +{model.tamanhos.length - 8}
                </span>
              )}
            </div>

            {/* Ações principais */}
            <div className="flex gap-2 pt-3 border-t border-border">
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectModel(model);
                    onGoToEdit();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  title="Editar componentes"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectModel(model);
                  onGoToView();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                title="Visualizar e imprimir"
              >
                <Eye className="w-4 h-4" />
                Ver
              </button>
            </div>

            {/* Ações secundárias */}
            {canEdit && (
              <div className="flex gap-1 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateModel(model);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded transition-colors"
                  title="Duplicar modelo com componentes"
                >
                  <Copy className="w-3 h-3" />
                  Duplicar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExportModel(model);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded transition-colors"
                  title="Exportar modelo para backup"
                >
                  <Download className="w-3 h-3" />
                  Exportar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Excluir modelo "${model.nome_modelo}"?\nEsta ação não pode ser desfeita.`)) {
                      onDeleteModel(model.id);
                    }
                  }}
                  className="px-2 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  title="Excluir modelo"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Data */}
            <div className="text-xs text-muted-foreground mt-3 text-right">
              Criado em {new Date(model.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ManualPage;
