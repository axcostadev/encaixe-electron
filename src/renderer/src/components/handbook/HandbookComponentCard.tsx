import React, { useState, useRef, useEffect } from 'react';
import { OperationComponent } from '@renderer/types/handbook';
import { Upload, Edit3, Save, X, GripVertical, Minus, Plus } from 'lucide-react';

interface HandbookComponentCardProps {
  component: OperationComponent;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string, sourceId: string) => void;
  onUpdateComponent: (id: string, updates: Partial<OperationComponent>) => void;
}

interface DraggableFieldProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  onReorder: (draggedId: string, targetId: string) => void;
}

const DraggableField: React.FC<DraggableFieldProps> = ({ id, children, className = '', onReorder }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('field', id);
    setIsDragging(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('field');
    if (draggedId && draggedId !== id) {
      onReorder(draggedId, id);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`${className} ${isDragging ? 'opacity-50' : ''} group relative cursor-move`}
    >
      <div className="absolute left-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-2 h-2 text-gray-400" />
      </div>
      <div className="pl-3">
        {children}
      </div>
    </div>
  );
};

export const HandbookComponentCard: React.FC<HandbookComponentCardProps> = ({
  component,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onUpdateComponent
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<keyof OperationComponent | null>(null);
  const [tempValues, setTempValues] = useState<Partial<OperationComponent>>({});
  const [fontSize, setFontSize] = useState(12);
  const [fieldOrder, setFieldOrder] = useState([
    'nome_operacao',
    'materiais_operacao',
    'setores_posteriores',
    'setor_atual',
    'foto_desenho_url',
    'pecas_par',
    'infestado_lado_so',
    'conjugacao'
  ]);

  useEffect(() => {
    if (component.field_order && component.field_order.length > 0) {
      setFieldOrder(component.field_order);
    }
  }, [component.field_order]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', component.id);
    onDragStart(component.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && !e.dataTransfer.getData('field')) {
      onDrop(component.id, sourceId);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
    setTempValues({ ...component });
  };

  const handleFieldEdit = (fieldName: keyof OperationComponent, value: any) => {
    setEditingField(fieldName);
    setTempValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = () => {
    onUpdateComponent(component.id, tempValues);
    setIsEditing(false);
    setEditingField(null);
    setTempValues({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingField(null);
    setTempValues({});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        handleFieldEdit('foto_desenho_url', imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFieldReorder = (draggedId: string, targetId: string) => {
    const newOrder = [...fieldOrder];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      setFieldOrder(newOrder);
      onUpdateComponent(component.id, { field_order: newOrder });
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.max(8, Math.min(20, prev + delta)));
  };

  const renderEditableField = (
    fieldName: keyof OperationComponent,
    value: any,
    baseClassName: string = '',
    isTextArea: boolean = false
  ) => {
    const className = `${baseClassName}`;
    const style = { fontSize: `${fontSize}px` };

    if (isEditing && editingField === fieldName) {
      return isTextArea ? (
        <textarea
          value={tempValues[fieldName] as string || ''}
          onChange={(e) => handleFieldEdit(fieldName, e.target.value)}
          className={`${className} border border-blue-500 rounded px-1 resize-none`}
          style={style}
          rows={1}
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={tempValues[fieldName] as string || ''}
          onChange={(e) => handleFieldEdit(fieldName, e.target.value)}
          className={`${className} border border-blue-500 rounded px-1`}
          style={style}
          autoFocus
        />
      );
    }

    return (
      <div
        className={`${className} ${isEditing ? 'cursor-pointer hover:bg-blue-800 rounded px-1' : ''}`}
        style={style}
        onClick={() => isEditing && setEditingField(fieldName)}
      >
        {value}
      </div>
    );
  };

  const renderSetoresPosteriores = () => {
    const style = { fontSize: `${fontSize}px` };

    if (isEditing && editingField === 'setores_posteriores') {
      return (
        <textarea
          value={Array.isArray(tempValues.setores_posteriores) 
            ? tempValues.setores_posteriores.join(', ') 
            : component.setores_posteriores.join(', ')}
          onChange={(e) => handleFieldEdit('setores_posteriores', e.target.value.split(', ').filter(s => s.trim()))}
          className="text-red-600 font-bold border border-blue-500 rounded px-1 resize-none w-full"
          style={style}
          rows={1}
          autoFocus
        />
      );
    }

    const setores = Array.isArray(tempValues.setores_posteriores) 
      ? tempValues.setores_posteriores 
      : component.setores_posteriores;

    return (
      <div
        className={`${isEditing ? 'cursor-pointer hover:bg-blue-800 rounded px-1' : ''}`}
        onClick={() => isEditing && setEditingField('setores_posteriores')}
      >
        {setores.map((setor, index) => (
          <span key={index} className="text-red-300 font-bold mr-1" style={style}>
            {setor}{index < setores.length - 1 ? ',' : ''}
          </span>
        ))}
      </div>
    );
  };

  const renderAgrupamentoTamanhos = () => {
    const style = { fontSize: `${fontSize}px` };

    if (isEditing && editingField === 'agrupamento_tamanhos') {
      return (
        <input
          type="text"
          value={Array.isArray(tempValues.agrupamento_tamanhos) 
            ? tempValues.agrupamento_tamanhos.join(' - ') 
            : component.agrupamento_tamanhos.join(' - ')}
          onChange={(e) => handleFieldEdit('agrupamento_tamanhos', e.target.value.split(' - ').filter(s => s.trim()))}
          className="text-center font-medium border border-blue-500 rounded px-1 w-full"
          style={style}
          autoFocus
        />
      );
    }

    const tamanhos = Array.isArray(tempValues.agrupamento_tamanhos) 
      ? tempValues.agrupamento_tamanhos 
      : component.agrupamento_tamanhos;

    return (
      <div
        className={`text-center font-medium text-black ${isEditing ? 'cursor-pointer hover:bg-blue-800 rounded px-1' : ''}`}
        style={style}
        onClick={() => isEditing && setEditingField('agrupamento_tamanhos')}
      >
        {tamanhos.join(' - ')}
      </div>
    );
  };

  const renderField = (fieldName: string) => {
    const fieldContent = (() => {
      switch (fieldName) {
        case 'nome_operacao':
          return (
            <div className="flex justify-between items-start">
              {renderEditableField(
                'nome_operacao',
                tempValues.nome_operacao || component.nome_operacao,
                'font-bold leading-tight flex-1 pr-1'
              )}
              {component.conjugacao && renderEditableField(
                'conjugacao',
                tempValues.conjugacao || component.conjugacao,
                'font-bold whitespace-nowrap bg-yellow-400 text-black px-1 rounded'
              )}
            </div>
          );

        case 'materiais_operacao':
          return renderEditableField(
            'materiais_operacao',
            tempValues.materiais_operacao || component.materiais_operacao,
            'font-medium text-gray-200'
          );

        case 'setores_posteriores':
          return component.setores_posteriores.length > 0 ? renderSetoresPosteriores() : null;

        case 'setor_atual':
          return (
            <div className="text-center font-bold text-blue-200" style={{ fontSize: `${fontSize + 2}px` }}>
              {renderEditableField(
                'setor_atual',
                tempValues.setor_atual || component.setor_atual,
                ''
              )}
            </div>
          );

        case 'foto_desenho_url':
          return (
            <div className="absolute top-2 right-2 z-20">
              {(tempValues.foto_desenho_url || component.foto_desenho_url) ? (
                <div className="relative">
                  <img
                    src={tempValues.foto_desenho_url || component.foto_desenho_url}
                    alt="Desenho"
                    className="w-16 h-12 object-contain border border-gray-400 rounded bg-blue-800 shadow-sm"
                  />
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -top-1 -right-1 p-0.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-xs"
                      title="Alterar imagem"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : isEditing ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 p-2 border-2 border-dashed border-gray-400 rounded hover:border-blue-500 bg-blue-800 shadow-sm"
                >
                  <Upload className="w-3 h-3" />
                  <span style={{ fontSize: `${fontSize - 2}px` }}>IMG</span>
                </button>
              ) : (
                <div className="w-16 h-12 border border-gray-400 rounded flex items-center justify-center text-gray-300 bg-blue-800 shadow-sm">
                  <span style={{ fontSize: `${fontSize - 2}px` }}>IMG</span>
                </div>
              )}
            </div>
          );

        case 'infestado_lado_so':
          return (
            <div className="font-medium text-green-300" style={{ fontSize: `${fontSize - 1}px` }}>
              {component.infestado_lado_so ? 'ENFESTAR LADO SÓ' : 'SEM ENFESTAR'}
            </div>
          );

        case 'pecas_par':
          return renderEditableField(
            'pecas_par',
            tempValues.pecas_par || component.pecas_par,
            'font-medium text-gray-200'
          );

        default:
          return null;
      }
    })();

    if (!fieldContent) return null;

    if (isEditing) {
      return (
        <DraggableField key={fieldName} id={fieldName} onReorder={handleFieldReorder} className="mb-1">
          {fieldContent}
        </DraggableField>
      );
    }

    return <div key={fieldName} className="mb-1">{fieldContent}</div>;
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDoubleClick={handleDoubleClick}
      className={`
        bg-blue-900 border-2 border-gray-300 p-2 h-48 flex flex-col justify-between relative text-white
        ${!isEditing ? 'cursor-move' : 'cursor-default'} transition-all duration-200 hover:shadow-lg
        ${isDragging ? 'opacity-50 transform rotate-2' : 'opacity-100'}
        ${isEditing ? 'ring-2 ring-blue-500' : ''}
        overflow-hidden
      `}
    >
      {/* Botões de controle quando em modo de edição */}
      {isEditing && (
        <div className="absolute top-1 right-1 flex gap-1 z-30">
          <button
            onClick={() => adjustFontSize(-1)}
            className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            title="Diminuir fonte"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => adjustFontSize(1)}
            className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            title="Aumentar fonte"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={handleSave}
            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
            title="Salvar"
          >
            <Save className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
            title="Cancelar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Indicador de modo de edição */}
      {isEditing && (
        <div className="absolute top-1 left-1 z-30">
          <Edit3 className="w-3 h-3 text-blue-500" />
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-hidden pr-20">
        {fieldOrder.map(fieldName => renderField(fieldName)).filter(Boolean)}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Agrupamento de tamanhos no rodapé */}
      {component.agrupamento_tamanhos.length > 0 && (
        <div className="bg-yellow-500 p-1 -mx-2 -mb-2 mt-1 relative z-10">
          {renderAgrupamentoTamanhos()}
        </div>
      )}

      {/* Dica de uso */}
      {!isEditing && (
        <div className="absolute bottom-1 left-1 text-gray-300 opacity-0 hover:opacity-100 transition-opacity" style={{ fontSize: `${fontSize - 4}px` }}>
          2x clique = editar
        </div>
      )}
    </div>
  );
};
