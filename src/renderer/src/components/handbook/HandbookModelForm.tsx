import React, { useState, useEffect } from 'react';
import { HandbookModel } from '@renderer/types/handbook';
import { Save, X, Plus, Minus } from 'lucide-react';

interface HandbookModelFormProps {
  model?: HandbookModel;
  onSave: (model: Omit<HandbookModel, 'id' | 'created_at' | 'componentes' | 'marca_id'>) => void;
  onCancel: () => void;
}

export const HandbookModelForm: React.FC<HandbookModelFormProps> = ({
  model,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    nome_modelo: '',
    numero_projeto: '',
    numero_artigo: '',
    forma: '',
    tamanhos: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44] as number[]
  });

  const [newTamanho, setNewTamanho] = useState('');

  useEffect(() => {
    if (model) {
      setFormData({
        nome_modelo: model.nome_modelo,
        numero_projeto: model.numero_projeto,
        numero_artigo: model.numero_artigo,
        forma: model.forma,
        tamanhos: model.tamanhos
      });
    }
  }, [model]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_modelo.trim()) {
      alert('Nome do modelo é obrigatório');
      return;
    }

    if (!formData.numero_projeto.trim()) {
      alert('Número do projeto é obrigatório');
      return;
    }

    if (!formData.numero_artigo.trim()) {
      alert('Número do artigo é obrigatório');
      return;
    }

    if (formData.tamanhos.length === 0) {
      alert('Adicione pelo menos um tamanho');
      return;
    }

    onSave(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTamanho = () => {
    const tamanho = parseInt(newTamanho);
    if (!isNaN(tamanho) && !formData.tamanhos.includes(tamanho)) {
      setFormData(prev => ({
        ...prev,
        tamanhos: [...prev.tamanhos, tamanho].sort((a, b) => a - b)
      }));
      setNewTamanho('');
    }
  };

  const removeTamanho = (tamanho: number) => {
    setFormData(prev => ({
      ...prev,
      tamanhos: prev.tamanhos.filter(t => t !== tamanho)
    }));
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-gradient-to-r from-green-600 to-green-700">
        <h2 className="text-lg font-semibold text-white">
          {model ? 'Editar Modelo' : 'Novo Modelo'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Nome do Modelo */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Nome do Modelo *
          </label>
          <input
            type="text"
            value={formData.nome_modelo}
            onChange={(e) => handleChange('nome_modelo', e.target.value)}
            className="w-full px-3 py-2 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Ex: Modelo Esportivo"
          />
        </div>

        {/* Número do Projeto */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Número do Projeto *
          </label>
          <input
            type="text"
            value={formData.numero_projeto}
            onChange={(e) => handleChange('numero_projeto', e.target.value)}
            className="w-full px-3 py-2 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Ex: 001/2024"
          />
        </div>

        {/* Número do Artigo */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Número do Artigo *
          </label>
          <input
            type="text"
            value={formData.numero_artigo}
            onChange={(e) => handleChange('numero_artigo', e.target.value)}
            className="w-full px-3 py-2 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Ex: ART-2024-001"
          />
        </div>

        {/* Forma */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Forma
          </label>
          <input
            type="text"
            value={formData.forma}
            onChange={(e) => handleChange('forma', e.target.value)}
            className="w-full px-3 py-2 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Ex: F-001"
          />
        </div>

        {/* Tamanhos */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Tamanhos
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tamanhos.map(tamanho => (
              <span
                key={tamanho}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded text-sm"
              >
                {tamanho}
                <button
                  type="button"
                  onClick={() => removeTamanho(tamanho)}
                  className="text-primary hover:text-primary/80"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newTamanho}
              onChange={(e) => setNewTamanho(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTamanho())}
              className="flex-1 px-3 py-2 border border-border bg-muted text-foreground rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Adicionar tamanho"
            />
            <button
              type="button"
              onClick={addTamanho}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted-foreground/20 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
