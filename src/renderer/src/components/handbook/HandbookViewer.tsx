import React, { useEffect, useState } from 'react';
import { HandbookModel, OperationComponent } from '@renderer/types/handbook';
import { handbookDatabase } from '@renderer/database/handbookDatabase';
import { Printer, ZoomIn, ZoomOut, RotateCcw, Calendar, FileText, Maximize2, Minimize2 } from 'lucide-react';

interface HandbookViewerProps {
  selectedModel?: HandbookModel;
}

export const HandbookViewer: React.FC<HandbookViewerProps> = ({ selectedModel }) => {
  const [components, setComponents] = useState<OperationComponent[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const data = handbookDatabase.getAllComponents();
    setComponents(data);
  }, []);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') handleZoom(10);
      if (e.key === '-') handleZoom(-10);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

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

  if (!selectedModel) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center p-8">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">Nenhum Manual Selecionado</h3>
          <p className="text-muted-foreground">Selecione um modelo na lista para visualizar o manual</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Barra de ferramentas de visualização */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Visualização do Manual
          </h2>
          <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
            {selectedModel.nome_modelo}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Controles de Zoom */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1 border border-border">
            <button
              onClick={() => handleZoom(-10)}
              className="p-1.5 hover:bg-muted-foreground/20 rounded"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium min-w-12 text-center text-muted-foreground">
              {zoomLevel}%
            </span>
            <button
              onClick={() => handleZoom(10)}
              className="p-1.5 hover:bg-muted-foreground/20 rounded"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-muted-foreground/20 rounded border-l border-border"
              title="Resetar zoom"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          {/* Fullscreen */}
          <button
            onClick={async () => {
              const el = document.documentElement;
              if (!document.fullscreenElement) {
                await el.requestFullscreen().catch(() => {});
              } else {
                await document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-2 rounded hover:bg-muted-foreground/10"
            title="Alternar tela cheia"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Botão Imprimir */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="font-medium">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Área de visualização */}
      <div className="flex-1 overflow-auto p-6 bg-muted">
        <div 
          className="mx-auto bg-card shadow-lg rounded-lg overflow-hidden handbook-viewer-container"
          style={{ 
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            maxWidth: '1200px'
          }}
        >
          <style>
            {`
              @media print {
                .handbook-viewer-container {
                  transform: scale(1) !important;
                  max-width: none !important;
                  margin: 0 !important;
                }
              }
            `}
          </style>
          {/* Cabeçalho do Manual */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">
                ESCALA PARA O MODELO {selectedModel.nome_modelo}
              </h1>
              <div className="flex justify-center items-center gap-2 mb-3">
                <span className="font-medium">BR</span>
                <div className="flex gap-1">
                  {selectedModel.tamanhos.map((tamanho, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-1 bg-white/20 rounded text-sm font-medium"
                    >
                      {tamanho}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-6 text-sm opacity-90">
                <span>PROJETO {selectedModel.numero_projeto}</span>
                <span>•</span>
                <span>ARTIGO {selectedModel.numero_artigo}</span>
                <span>•</span>
                <span>FORMA {selectedModel.forma}</span>
              </div>
            </div>
          </div>

          {/* Data de liberação */}
          <div className="flex items-center justify-end gap-2 px-6 py-2 bg-muted text-sm text-muted-foreground border-b border-border">
            <Calendar className="w-4 h-4" />
            <span>LIBERAÇÃO: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>

          {/* Grid de componentes - Modo visualização (somente leitura) */}
          <div 
            className="grid gap-4 p-6"
            style={{ gridTemplateColumns: `repeat(${maxColumns}, 1fr)` }}
          >
            {grid.map((row, rowIndex) =>
              row.map((component, colIndex) => (
                <div key={`${rowIndex}-${colIndex}`} className="min-h-48 relative">
                  {component ? (
                    <div className="relative">
                      <ViewOnlyCard component={component} />
                      <div className="absolute top-1 left-1 text-base font-bold text-white bg-black/50 px-1 rounded">
                        {rowIndex + 1}:{colIndex + 1}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 border border-dashed border-border rounded bg-muted flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground">
                        {rowIndex + 1}:{colIndex + 1}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Rodapé */}
          <div className="bg-muted px-6 py-4 border-t border-border">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Total de componentes: {components.length}</span>
              <span>Gerado em: {new Date().toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de visualização somente leitura
const ViewOnlyCard: React.FC<{ component: OperationComponent }> = ({ component }) => {
  return (
    <div className="bg-blue-900 border-2 border-gray-300 p-3 h-48 flex flex-col justify-between text-xs relative overflow-hidden text-white">
      {/* Cabeçalho com nome e conjugação */}
      <div className="flex justify-between items-start gap-2">
        <span className="font-bold text-sm leading-tight flex-1">
          {component.nome_operacao}
        </span>
        {component.conjugacao && (
          <span className="font-bold text-sm whitespace-nowrap bg-yellow-400 px-1 rounded text-black">
            {component.conjugacao}
          </span>
        )}
      </div>

      {/* Material */}
      <div className="font-medium text-gray-200 mt-1">
        {component.materiais_operacao}
      </div>

      {/* Setores posteriores */}
      {component.setores_posteriores.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {component.setores_posteriores.map((setor, idx) => (
            <span 
              key={idx}
              className="px-1.5 py-0.5 bg-blue-700 text-blue-100 rounded text-[10px] font-medium"
            >
              {setor}
            </span>
          ))}
        </div>
      )}

      {/* Setor atual */}
      <div className="text-center font-bold text-base mt-2 text-blue-200">
        {component.setor_atual}
      </div>

      {/* Imagem */}
      {component.foto_desenho_url && (
        <div className="absolute top-2 right-2">
          <img
            src={component.foto_desenho_url}
            alt="Desenho"
            className="w-14 h-10 object-contain border border-gray-400 rounded bg-blue-800"
          />
        </div>
      )}

      {/* Infestado e peças */}
      <div className="mt-auto pt-2 space-y-1">
        {component.infestado_lado_so && (
          <div className="font-medium text-green-300 text-[10px]">
            ENFESTAR LADO SÓ
          </div>
        )}
        <div className="font-medium text-gray-200">
          {component.pecas_par}
        </div>
      </div>

      {/* Agrupamento de tamanhos */}
      {component.agrupamento_tamanhos.length > 0 && (
        <div className="bg-yellow-500 text-center font-medium py-1 -mx-3 -mb-3 mt-2 text-[10px] text-black">
          {component.agrupamento_tamanhos.join(' - ')}
        </div>
      )}
    </div>
  );
};
