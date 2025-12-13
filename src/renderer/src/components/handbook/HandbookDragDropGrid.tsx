import React, { useEffect } from 'react';
import { HandbookComponentCard } from './HandbookComponentCard';
import { useHandbookDragDrop } from '@renderer/hooks/useHandbookDragDrop';
import { HandbookModel } from '@renderer/types/handbook';
import { Calendar, ZoomIn, ZoomOut, RotateCcw, Printer } from 'lucide-react';

interface HandbookDragDropGridProps {
  selectedModel?: HandbookModel;
}

export const HandbookDragDropGrid: React.FC<HandbookDragDropGridProps> = ({ selectedModel }) => {
  const {
    components,
    draggedItem,
    loadComponents,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    updateComponent
  } = useHandbookDragDrop();

  const [zoomLevel, setZoomLevel] = React.useState(100);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(25, Math.min(200, prev + delta)));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const handlePrint = () => {
    window.print();
  };

  const maxColumns = components.length > 0 
    ? Math.max(4, Math.max(...components.map(c => c.position_x)) + 1)
    : 4;
  const maxRows = components.length > 0 
    ? Math.max(4, Math.max(...components.map(c => c.position_y)) + 1)
    : 4;

  const grid = Array(maxRows).fill(null).map(() => Array(maxColumns).fill(null));
  
  components.forEach(component => {
    if (component.position_y < maxRows && component.position_x < maxColumns) {
      grid[component.position_y][component.position_x] = component;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          {/* Informações do Modelo */}
          {selectedModel && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-center">
                <h2 className="text-xl font-bold text-blue-900 mb-2">
                  ESCALA PARA O MODELO {selectedModel.nome_modelo}
                </h2>
                <div className="flex justify-center items-center gap-4 text-sm">
                  <div className="flex gap-1">
                    <span className="font-medium">BR</span>
                    {selectedModel.tamanhos.map((tamanho, index) => (
                      <span key={index} className="px-2 py-1 bg-white border border-gray-300">
                        {tamanho}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-center gap-8 text-sm">
                  <span>PROJETO {selectedModel.numero_projeto}</span>
                  <span>ARTIGO {selectedModel.numero_artigo}</span>
                  <span>FORMA {selectedModel.forma}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedModel ? `Componentes - ${selectedModel.nome_modelo}` : 'Manual de Operação Industrial'}
            </h1>
            <div className="flex items-center gap-4">
              {/* Controles de Zoom */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
                <button
                  onClick={() => handleZoom(-25)}
                  className="p-1 bg-white rounded hover:bg-gray-50 border"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium min-w-12 text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => handleZoom(25)}
                  className="p-1 bg-white rounded hover:bg-gray-50 border"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-1 bg-white rounded hover:bg-gray-50 border"
                  title="Resetar zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              
              {/* Botão Imprimir */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Imprimir"
              >
                <Printer className="w-4 h-4" />
                <span className="text-sm font-medium">Imprimir</span>
              </button>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>LIBERAÇÃO: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {selectedModel 
              ? `Gerenciando componentes do modelo ${selectedModel.nome_modelo}. Arraste e solte para reorganizar.`
              : 'Selecione um modelo no menu lateral para gerenciar seus componentes.'
            }
          </p>
        </div>

        {/* Grid de componentes */}
        <div 
          id="handbook-components-grid"
          className="grid gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          style={{ 
            gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
            minHeight: '600px',
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left'
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((component, colIndex) => (
              <div key={`${rowIndex}-${colIndex}`} className="min-h-48">
                {component ? (
                  <HandbookComponentCard
                    component={component}
                    isDragging={draggedItem === component.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    onUpdateComponent={updateComponent}
                  />
                ) : (
                  <div className="h-48 border-2 border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                    Área disponível
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Estatísticas */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{components.length}</div>
              <div className="text-sm text-blue-800">Total de Componentes</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                {components.filter(c => c.infestado_lado_so).length}
              </div>
              <div className="text-sm text-green-800">Enfestar Lado Só</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(components.map(c => c.setor_atual)).size}
              </div>
              <div className="text-sm text-purple-800">Setores Diferentes</div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <button 
                onClick={() => {
                  if (confirm('Deseja resetar todos os dados do manual?')) {
                    localStorage.removeItem('handbook_components_data');
                    window.location.reload();
                  }
                }}
                className="text-sm text-orange-600 hover:text-orange-800 underline"
              >
                Resetar Dados
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
