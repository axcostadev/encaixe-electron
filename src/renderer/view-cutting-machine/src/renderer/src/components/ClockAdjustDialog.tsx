import { X, Plus, Minus } from 'lucide-react'
import React, { useState, useEffect } from 'react'

interface ClockAdjustDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface ClockSettings {
  fontSize: number
  color: string
}

export default function ClockAdjustDialog({ isOpen, onClose }: ClockAdjustDialogProps): React.ReactElement | null {
  const [offsetMinutes, setOffsetMinutes] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [fontSize, setFontSize] = useState(48)
  const [color, setColor] = useState('#000000')

  useEffect(() => {
    // Carregar offset salvo
    const saved = localStorage.getItem('clock-offset-minutes')
    if (saved) {
      const offset = parseInt(saved, 10)
      if (!isNaN(offset)) {
        setOffsetMinutes(offset)
      }
    }

    // Carregar configurações visuais
    const savedSettings = localStorage.getItem('clock-visual-settings')
    if (savedSettings) {
      try {
        const parsed: ClockSettings = JSON.parse(savedSettings)
        setFontSize(parsed.fontSize || 48)
        setColor(parsed.color || '#000000')
      } catch (err) {
        console.warn('Erro ao carregar configurações visuais:', err)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    // Atualizar preview a cada segundo
    const interval = setInterval(() => {
      setCurrentTime(new Date(Date.now() + offsetMinutes * 60000))
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, offsetMinutes])

  const handleSave = () => {
    localStorage.setItem('clock-offset-minutes', offsetMinutes.toString())
    
    // Salvar configurações visuais
    const visualSettings: ClockSettings = {
      fontSize,
      color
    }
    localStorage.setItem('clock-visual-settings', JSON.stringify(visualSettings))
    
    // Forçar reload do ClockWidget
    window.dispatchEvent(new Event('clock-settings-updated'))
    
    onClose()
  }

  const handleReset = () => {
    setOffsetMinutes(0)
    localStorage.setItem('clock-offset-minutes', '0')
  }

  const handleResetVisual = () => {
    setFontSize(48)
    setColor('#000000')
  }

  const adjustMinutes = (delta: number) => {
    setOffsetMinutes(prev => prev + delta)
  }

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            ⏰ Ajustar Horário e Aparência
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - com scroll */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Preview do horário atual */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
            <div className="text-sm text-gray-600 mb-2">Horário ajustado:</div>
            <div className="text-5xl font-bold text-black tracking-tight">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Ajuste de minutos */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Ajuste em minutos:
            </label>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustMinutes(-60)}
                className="flex-1 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors"
              >
                <Minus size={16} className="inline mr-1" />
                1 hora
              </button>
              <button
                onClick={() => adjustMinutes(-15)}
                className="flex-1 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition-colors"
              >
                <Minus size={16} className="inline mr-1" />
                15 min
              </button>
              <button
                onClick={() => adjustMinutes(-1)}
                className="flex-1 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg font-semibold transition-colors"
              >
                <Minus size={16} className="inline mr-1" />
                1 min
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustMinutes(1)}
                className="flex-1 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-semibold transition-colors"
              >
                <Plus size={16} className="inline mr-1" />
                1 min
              </button>
              <button
                onClick={() => adjustMinutes(15)}
                className="flex-1 px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-semibold transition-colors"
              >
                <Plus size={16} className="inline mr-1" />
                15 min
              </button>
              <button
                onClick={() => adjustMinutes(60)}
                className="flex-1 px-4 py-3 bg-green-200 hover:bg-green-300 text-green-800 rounded-lg font-semibold transition-colors"
              >
                <Plus size={16} className="inline mr-1" />
                1 hora
              </button>
            </div>

            {/* Valor atual do offset */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Diferença: 
                <span className={`font-bold ml-1 ${offsetMinutes === 0 ? 'text-gray-900' : offsetMinutes > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {offsetMinutes > 0 ? '+' : ''}{offsetMinutes} minutos
                </span>
              </span>
            </div>
          </div>

          {/* Divisor */}
          <hr className="my-6 border-gray-200" />

          {/* Personalização Visual */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 mb-3">🎨 Aparência do Relógio</h4>

            {/* Tamanho da Fonte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamanho da Fonte: <span className="text-blue-600 font-bold">{fontSize}px</span>
              </label>
              <input
                type="range"
                min="24"
                max="120"
                step="4"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Pequeno (24px)</span>
                <span>Grande (120px)</span>
              </div>
            </div>

            {/* Cor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cor do Texto
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                  placeholder="#000000"
                />
                <button
                  onClick={() => setColor('#000000')}
                  className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm"
                  title="Preto"
                >
                  Preto
                </button>
                <button
                  onClick={() => setColor('#1E40AF')}
                  className="px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 text-sm"
                  title="Azul"
                >
                  Azul
                </button>
              </div>
            </div>

            {/* Info sobre ajuste automático */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>💡 Dica:</strong> O tamanho do fundo branco se ajusta automaticamente conforme o tamanho da fonte!
            </div>

            {/* Botão Resetar Aparência */}
            <button
              onClick={handleResetVisual}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
            >
              Resetar Aparência Padrão
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Resetar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
