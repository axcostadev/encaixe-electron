import React from 'react';
import { HandbookModel } from '@renderer/types/handbook';
import { Plus, Edit, Trash2, FileText, Calendar } from 'lucide-react';

interface HandbookModelListProps {
  models: HandbookModel[];
  selectedModel?: HandbookModel;
  onSelectModel: (model: HandbookModel) => void;
  onEditModel: (model: HandbookModel) => void;
  onDeleteModel: (modelId: string) => void;
  onCreateNew: () => void;
}

export const HandbookModelList: React.FC<HandbookModelListProps> = ({
  models,
  selectedModel,
  onSelectModel,
  onEditModel,
  onDeleteModel,
  onCreateNew
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Modelos</h2>
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1 px-3 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>
      </div>

      {/* Lista de modelos */}
      <div className="max-h-96 overflow-y-auto">
        {models.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Nenhum modelo cadastrado</p>
            <button
              onClick={onCreateNew}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Criar primeiro modelo
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {models.map(model => (
              <li
                key={model.id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedModel?.id === model.id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectModel(model)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {model.nome_modelo}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Projeto:</span>
                        {model.numero_projeto}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Artigo:</span>
                        {model.numero_artigo}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        Forma: {model.forma}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {model.tamanhos.length} tam.
                      </span>
                    </div>
                    {model.componentes && model.componentes.length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        {model.componentes.length} componente(s)
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(model.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditModel(model);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar modelo"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Deseja excluir o modelo "${model.nome_modelo}"?`)) {
                          onDeleteModel(model.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Excluir modelo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contador */}
      {models.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
          {models.length} modelo(s) cadastrado(s)
        </div>
      )}
    </div>
  );
};
