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
    updateComponent,
    moveComponentToPosition,
    undo, redo, canUndo, canRedo
  } = useHandbookDragDrop();

  const [zoomLevel, setZoomLevel] = React.useState(100);
  const [isPanning, setIsPanning] = React.useState(false);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const panRef = React.useRef(pan);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [showGridLines, setShowGridLines] = React.useState(false);
  const [snapToGrid, setSnapToGrid] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault(); redo();
      }
      if (e.key === '+' || e.key === '=') handleZoom(25);
      if (e.key === '-') handleZoom(-25);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(25, Math.min(200, prev + delta)));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      handleZoom(delta);
    }
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const origin = panRef.current;
    setPan({ x: e.clientX - origin.x, y: e.clientY - origin.y });
  };

  const handleMouseUp = () => setIsPanning(false);

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-6 bg-card p-4 rounded-lg shadow-sm border border-border">
          {/* Informações do Modelo */}
          {selectedModel && (
            <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
              <div className="text-center">
                <h2 className="text-xl font-bold text-primary mb-2">
                  ESCALA PARA O MODELO {selectedModel.nome_modelo}
                </h2>
                <div className="flex justify-center items-center gap-4 text-sm">
                  <div className="flex gap-1">
                    <span className="font-medium text-foreground">BR</span>
                    {selectedModel.tamanhos.map((tamanho, index) => (
                      <span key={index} className="px-2 py-1 bg-card border border-border text-foreground">
                        {tamanho}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-center gap-8 text-sm text-muted-foreground">
                  <span>PROJETO {selectedModel.numero_projeto}</span>
                  <span>ARTIGO {selectedModel.numero_artigo}</span>
                  <span>FORMA {selectedModel.forma}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {selectedModel ? `Componentes - ${selectedModel.nome_modelo}` : 'Manual de Operação Industrial'}
            </h1>
            <div className="flex items-center gap-4">
              {/* Controles de Zoom */}
              <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                <button
                  onClick={() => handleZoom(-25)}
                  className="p-1 bg-card rounded hover:bg-muted-foreground/20 border border-border"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="text-sm font-medium min-w-12 text-center text-muted-foreground">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => handleZoom(25)}
                  className="p-1 bg-card rounded hover:bg-muted-foreground/20 border border-border"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-1 bg-card rounded hover:bg-muted-foreground/20 border border-border"
                  title="Resetar zoom"
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
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
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>LIBERAÇÃO: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {selectedModel 
              ? `Gerenciando componentes do modelo ${selectedModel.nome_modelo}. Arraste e solte para reorganizar.`
              : 'Selecione um modelo no menu lateral para gerenciar seus componentes.'
            }
          </p>
        </div>

        {/* Grid de componentes */}
        <div className="mb-4 flex items-center gap-2 no-print">
          <button onClick={() => undo()} disabled={!canUndo} className="px-3 py-1 bg-card border rounded hover:shadow disabled:opacity-50">Undo</button>
          <button onClick={() => redo()} disabled={!canRedo} className="px-3 py-1 bg-card border rounded hover:shadow disabled:opacity-50">Redo</button>
          <label className="inline-flex items-center px-2 py-1 bg-card border rounded">
            <input type="checkbox" checked={showGridLines} onChange={() => setShowGridLines(s => !s)} />
            <span className="ml-2 text-sm">Grade</span>
          </label>
          <label className="inline-flex items-center px-2 py-1 bg-card border rounded">
            <input type="checkbox" checked={snapToGrid} onChange={() => setSnapToGrid(s => !s)} />
            <span className="ml-2 text-sm">Snap</span>
          </label>
          {selectedIds.length > 0 && (
            <span className="px-2 py-1 bg-primary/20 text-primary text-sm rounded">
              {selectedIds.length} selecionado(s)
            </span>
          )}
          <div className="ml-auto text-sm text-muted-foreground">Dica: segure Ctrl e role para zoom | Shift+clique para multi-seleção</div>
        </div>

        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          id="handbook-components-grid"
          className="relative overflow-hidden"
          style={{ minHeight: '600px' }}
        >
          <div
            className="grid gap-4 bg-card p-6 rounded-lg shadow-sm border border-border"
            style={{
              gridTemplateColumns: `repeat(${maxColumns}, 1fr)`,
              transform: `scale(${zoomLevel / 100}) translate(${pan.x / (zoomLevel/100)}px, ${pan.y / (zoomLevel/100)}px)`,
              transformOrigin: 'top left',
              transition: isPanning ? 'none' : 'transform 0.1s linear',
              backgroundImage: showGridLines ? `repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(0,0,0,0.03) 48px, rgba(0,0,0,0.03) 49px), repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(0,0,0,0.03) 48px, rgba(0,0,0,0.03) 49px)` : undefined
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((component, colIndex) => (
                <div key={`${rowIndex}-${colIndex}`} className="min-h-48">
                  {component ? (
                    <div
                      onClick={(e) => {
                        if (e.shiftKey) {
                          setSelectedIds(prev => prev.includes(component.id) ? prev.filter(id => id !== component.id) : [...prev, component.id]);
                        } else {
                          setSelectedIds([component.id]);
                        }
                      }}
                      className="relative"
                    >
                      <HandbookComponentCard
                        component={component}
                        isDragging={draggedItem === component.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDrop={(targetId, sourceId) => handleDrop(targetId, sourceId)}
                        onUpdateComponent={updateComponent}
                      />
                      <div className="absolute top-1 left-1 text-base font-bold text-white bg-black/50 px-1 rounded z-20">
                        {rowIndex + 1}:{colIndex + 1}
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e: React.DragEvent) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData('text/plain');
                        if (sourceId) {
                          moveComponentToPosition(sourceId, colIndex, rowIndex);
                        }
                      }}
                      className="h-48 border-2 border-dashed border-border rounded bg-muted flex items-center justify-center text-muted-foreground text-lg font-bold"
                    >
                      {rowIndex + 1}:{colIndex + 1}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="mt-6 bg-card p-4 rounded-lg shadow-sm border border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-primary/10 rounded">
              <div className="text-2xl font-bold text-primary">{components.length}</div>
              <div className="text-sm text-primary">Total de Componentes</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded">
              <div className="text-2xl font-bold text-green-500">
                {components.filter(c => c.infestado_lado_so).length}
              </div>
              <div className="text-sm text-green-500">Enfestar Lado Só</div>
            </div>
            <div className="p-3 bg-purple-500/10 rounded">
              <div className="text-2xl font-bold text-purple-500">
                {new Set(components.map(c => c.setor_atual)).size}
              </div>
              <div className="text-sm text-purple-500">Setores Diferentes</div>
            </div>
            <div className="p-3 bg-orange-500/10 rounded">
              <button 
                onClick={() => {
                  if (confirm('Deseja resetar todos os dados do manual?')) {
                    localStorage.removeItem('handbook_components_data');
                    window.location.reload();
                  }
                }}
                className="text-sm text-orange-500 hover:text-orange-400 underline"
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
