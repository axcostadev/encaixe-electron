import { useState, useCallback } from 'react';
import { OperationComponent } from '@renderer/types/handbook';
import { handbookDatabase } from '@renderer/database/handbookDatabase';

export const useHandbookDragDrop = () => {
  const [components, setComponents] = useState<OperationComponent[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const loadComponents = useCallback(() => {
    const data = handbookDatabase.getAllComponents();
    setComponents(data);
  }, []);

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
      return prev.map(item => {
        if (item.id === sourceId) {
          return { ...item, position_x: targetPos.x, position_y: targetPos.y };
        }
        if (item.id === targetId) {
          return { ...item, position_x: sourcePos.x, position_y: sourcePos.y };
        }
        return item;
      });
    });
  }, []);

  const updateComponent = useCallback((id: string, updates: Partial<OperationComponent>) => {
    setComponents(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, ...updates, updated_at: new Date().toISOString() }
          : item
      )
    );
    
    // Atualizar no banco de dados
    handbookDatabase.updateComponent(id, updates);
    
    // Se for atualização da ordem dos campos, salvar também
    if (updates.field_order) {
      handbookDatabase.updateFieldOrder(id, updates.field_order);
    }
  }, []);

  return {
    components,
    draggedItem,
    loadComponents,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    updateComponent
  };
};
