import React, { useState, useEffect, useCallback } from 'react';
import { HandbookDragDropGrid } from '@renderer/components/handbook/HandbookDragDropGrid';
import { HandbookModelList } from '@renderer/components/handbook/HandbookModelList';
import { HandbookModelForm } from '@renderer/components/handbook/HandbookModelForm';
import { handbookDatabase } from '@renderer/database/handbookDatabase';
import { HandbookModel } from '@renderer/types/handbook';
import { Book, List, Grid, PanelLeft, PanelLeftClose } from 'lucide-react';

const ManualPage: React.FC = () => {
  const [models, setModels] = useState<HandbookModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<HandbookModel | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<HandbookModel | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadModels = useCallback(() => {
    const loadedModels = handbookDatabase.getAllModels();
    setModels(loadedModels);
    
    // Se não há modelo selecionado mas há modelos disponíveis, seleciona o primeiro
    if (!selectedModel && loadedModels.length > 0) {
      setSelectedModel(loadedModels[0]);
    }
  }, [selectedModel]);

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
      // Atualizar modelo existente
      handbookDatabase.updateModel(editingModel.id, modelData);
    } else {
      // Criar novo modelo
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

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar de Modelos */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white flex-shrink-0`}
      >
        <div className="p-4 h-full overflow-y-auto">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Book className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">Manual</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Visualização em grade"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Visualização em lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Formulário ou Lista */}
          {showForm ? (
            <HandbookModelForm
              model={editingModel}
              onSave={handleSaveModel}
              onCancel={handleCancelForm}
            />
          ) : (
            <HandbookModelList
              models={models}
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
              onEditModel={handleEditModel}
              onDeleteModel={handleDeleteModel}
              onCreateNew={handleCreateNew}
            />
          )}
        </div>
      </div>

      {/* Botão Toggle Sidebar */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-200 p-2 rounded-r-lg shadow-sm hover:bg-gray-50 transition-colors"
        style={{ left: sidebarOpen ? '318px' : '0' }}
        title={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-4 h-4 text-gray-600" />
        ) : (
          <PanelLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Área Principal - Grid de Componentes */}
      <div className="flex-1 overflow-auto">
        <HandbookDragDropGrid selectedModel={selectedModel} />
      </div>
    </div>
  );
};

export default ManualPage;
