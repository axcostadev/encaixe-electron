import React, { useState, useEffect, useCallback } from 'react';
import { HandbookDragDropGrid } from '@renderer/components/handbook/HandbookDragDropGrid';
import { HandbookViewer } from '@renderer/components/handbook/HandbookViewer';
import { HandbookModelForm } from '@renderer/components/handbook/HandbookModelForm';
import { handbookDatabase } from '@renderer/database/handbookDatabase';
import { HandbookModel } from '@renderer/types/handbook';
import { 
  Book, 
  Edit3, 
  Eye, 
  Plus, 
  FolderOpen,
  Settings,
  FileText,
  X
} from 'lucide-react';

type TabType = 'modelos' | 'edicao' | 'visualizacao';

const ManualPage: React.FC = () => {
  const [models, setModels] = useState<HandbookModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<HandbookModel | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<HandbookModel | undefined>();
  const [activeTab, setActiveTab] = useState<TabType>('modelos');

  const loadModels = useCallback(() => {
    const loadedModels = handbookDatabase.getAllModels();
    setModels(loadedModels);
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleSelectModel = (model: HandbookModel) => {
    setSelectedModel(model);
    setShowForm(false);
    setEditingModel(undefined);
  };

  const handleCreateNew = () => {
    setEditingModel(undefined);
    setShowForm(true);
  };

  const handleEditModel = (model: HandbookModel) => {
    setEditingModel(model);
    setShowForm(true);
  };

  const handleDeleteModel = (modelId: string) => {
    handbookDatabase.deleteModel(modelId);
    loadModels();
    if (selectedModel?.id === modelId) {
      setSelectedModel(undefined);
    }
  };

  const handleSaveModel = (modelData: Omit<HandbookModel, 'id' | 'created_at' | 'componentes'>) => {
    if (editingModel) {
      handbookDatabase.updateModel(editingModel.id, modelData);
    } else {
      handbookDatabase.createModel(modelData);
    }
    
    loadModels();
    setShowForm(false);
    setEditingModel(undefined);
  };

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
    { id: 'edicao' as TabType, label: 'Edição', icon: Edit3, description: 'Editar componentes' },
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
              <h3 className="font-semibold text-foreground text-sm truncate">
                {selectedModel.nome_modelo}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Projeto: {selectedModel.numero_projeto}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleGoToEdit}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Editar
                </button>
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
          
          {activeTab === 'modelos' && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Modelo
            </button>
          )}
        </div>

        {/* Conteúdo da aba */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'modelos' && (
            <div className="p-6">
              {showForm ? (
                <div className="max-w-2xl mx-auto">
                  <HandbookModelForm
                    model={editingModel}
                    onSave={handleSaveModel}
                    onCancel={handleCancelForm}
                  />
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <ModelosGrid
                    models={models}
                    selectedModel={selectedModel}
                    onSelectModel={handleSelectModel}
                    onEditModel={handleEditModel}
                    onDeleteModel={handleDeleteModel}
                    onGoToEdit={handleGoToEdit}
                    onGoToView={handleGoToView}
                  />
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
  onGoToEdit: () => void;
  onGoToView: () => void;
}

const ModelosGrid: React.FC<ModelosGridProps> = ({
  models,
  selectedModel,
  onSelectModel,
  onDeleteModel,
  onGoToEdit,
  onGoToView
}) => {
  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhum modelo cadastrado</h3>
        <p className="text-muted-foreground">Clique em "Novo Modelo" para começar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map(model => (
        <div
          key={model.id}
          onClick={() => onSelectModel(model)}
          className={`bg-card rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
            selectedModel?.id === model.id
              ? 'border-primary shadow-md ring-2 ring-primary/20'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          {/* Badge selecionado */}
          {selectedModel?.id === model.id && (
            <div className="flex justify-end mb-2">
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
                Selecionado
              </span>
            </div>
          )}

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

          {/* Ações */}
          <div className="flex gap-2 pt-3 border-t border-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectModel(model);
                onGoToEdit();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectModel(model);
                onGoToView();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Visualizar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Excluir modelo "${model.nome_modelo}"?`)) {
                  onDeleteModel(model.id);
                }
              }}
              className="px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Excluir"
            >
              ✕
            </button>
          </div>

          {/* Data */}
          <div className="text-xs text-muted-foreground mt-3 text-right">
            Criado em {new Date(model.created_at).toLocaleDateString('pt-BR')}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ManualPage;
