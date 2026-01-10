import { useState, useCallback } from 'react';
import { OperationComponent } from '@renderer/types/handbook';
import { handbookDatabase } from '@renderer/database/handbookDatabase';

export const useHandbookDragDrop = (modeloId?: string) => {
  const [components, setComponents] = useState<OperationComponent[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [history, setHistory] = useState<OperationComponent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const loadComponents = useCallback(() => {
    // Se não houver modelo selecionado, não carrega nenhum componente
    if (!modeloId) {
      setComponents([]);
      setHistory([[]]);
      setHistoryIndex(0);
      return;
    }
    const data = handbookDatabase.getComponentsByModel(modeloId);
    setComponents(data);
    // reset history
    setHistory([data.map(d => ({ ...d }))]);
    setHistoryIndex(0);
  }, [modeloId]);

  const handleDragStart = useCallback((id: string) => {
    setDraggedItem(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const handleDrop = useCallback((targetId: string, sourceId: string) => {
    if (targetId === sourceId) return;

    setComponents(prev => {
      const sourceItem = prev.find(item => item.id === sourceId);
      const targetItem = prev.find(item => item.id === targetId);
      
      if (!sourceItem || !targetItem) return prev;

      // Trocar posições
      const sourcePos = { x: sourceItem.position_x, y: sourceItem.position_y };
      const targetPos = { x: targetItem.position_x, y: targetItem.position_y };

      // Atualizar no banco de dados
      handbookDatabase.updateComponentPosition(sourceId, targetPos.x, targetPos.y);
      handbookDatabase.updateComponentPosition(targetId, sourcePos.x, sourcePos.y);

      // Atualizar estado local
      const next = prev.map(item => {
        if (item.id === sourceId) {
          return { ...item, position_x: targetPos.x, position_y: targetPos.y };
        }
        if (item.id === targetId) {
          return { ...item, position_x: sourcePos.x, position_y: sourcePos.y };
        }
        return item;
      });

      // push to history
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(next.map(it => ({ ...it })));
        // limit history size
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(idx => Math.min((idx + 1) || 0, 1000));

      return next;
    });
  }, []);

  const moveComponentToPosition = useCallback((sourceId: string, position_x: number, position_y: number) => {
    setComponents(prev => {
      const item = prev.find(i => i.id === sourceId);
      if (!item) return prev;

      const next = prev.map(i => i.id === sourceId ? { ...i, position_x, position_y, updated_at: new Date().toISOString() } : i);

      handbookDatabase.updateComponentPosition(sourceId, position_x, position_y);

      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(next.map(it => ({ ...it })));
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(idx => Math.min((idx + 1) || 0, 1000));

      return next;
    });
  }, [historyIndex]);

  const updateComponent = useCallback((id: string, updates: Partial<OperationComponent>) => {
    setComponents(prev => {
      const next = prev.map(item => 
        item.id === id 
          ? { ...item, ...updates, updated_at: new Date().toISOString() }
          : item
      );

      // push to history for significant updates (positions or field_order)
      if (updates.position_x !== undefined || updates.position_y !== undefined || updates.field_order) {
        setHistory(h => {
          const newHistory = h.slice(0, historyIndex + 1);
          newHistory.push(next.map(it => ({ ...it })));
          if (newHistory.length > 50) newHistory.shift();
          return newHistory;
        });
        setHistoryIndex(idx => Math.min((idx + 1) || 0, 1000));
      }

      return next;
    });
    
    // Atualizar no banco de dados
    handbookDatabase.updateComponent(id, updates);
    
    // Se for atualização da ordem dos campos, salvar também
    if (updates.field_order) {
      handbookDatabase.updateFieldOrder(id, updates.field_order);
    }
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    setHistoryIndex(idx => {
      const nextIdx = Math.max(0, idx - 1);
      const snapshot = history[nextIdx];
      if (snapshot) {
        setComponents(snapshot.map(s => ({ ...s })));
        // persist positions
        snapshot.forEach(s => handbookDatabase.updateComponentPosition(s.id, s.position_x, s.position_y));
      }
      return nextIdx;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex(idx => {
      const nextIdx = Math.min(history.length - 1, idx + 1);
      const snapshot = history[nextIdx];
      if (snapshot) {
        setComponents(snapshot.map(s => ({ ...s })));
        snapshot.forEach(s => handbookDatabase.updateComponentPosition(s.id, s.position_x, s.position_y));
      }
      return nextIdx;
    });
  }, [history]);

  const createComponent = useCallback((componentData: Omit<OperationComponent, 'id' | 'created_at' | 'updated_at'>) => {
    const newComponent = handbookDatabase.createComponent(componentData);
    setComponents(prev => {
      const next = [...prev, newComponent];
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(next.map(it => ({ ...it })));
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(idx => Math.min((idx + 1) || 0, 1000));
      return next;
    });
    return newComponent;
  }, [historyIndex]);

  const deleteComponent = useCallback((id: string) => {
    handbookDatabase.deleteComponent(id);
    setComponents(prev => {
      const next = prev.filter(c => c.id !== id);
      setHistory(h => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(next.map(it => ({ ...it })));
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(idx => Math.min((idx + 1) || 0, 1000));
      return next;
    });
  }, [historyIndex]);

  return {
    components,
    draggedItem,
    loadComponents,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    updateComponent,
    moveComponentToPosition,
    createComponent,
    deleteComponent,
    undo,
    redo,
    canUndo,
    canRedo
  };
};
