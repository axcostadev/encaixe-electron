import { Clock, Settings } from 'lucide-react'
import React, { useState, useEffect } from 'react'

interface ClockWidgetProps {
  onAdjustClick?: () => void
}

interface ClockSettings {
  fontSize: number // em pixels
  color: string
}

export default function ClockWidget({ onAdjustClick }: ClockWidgetProps): React.ReactElement {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [settings, setSettings] = useState<ClockSettings>({
    fontSize: 48, // 3xl padrão
    color: '#000000' // preto
  })

  useEffect(() => {
    const loadSettings = () => {
      // Carregar configurações visuais
      const savedSettings = localStorage.getItem('clock-visual-settings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings(parsed)
        } catch (err) {
          console.warn('Erro ao carregar configurações do relógio:', err)
        }
      }
    }

    loadSettings()

    // Carregar offset salvo do localStorage
    const savedOffset = localStorage.getItem('clock-offset-minutes')
    if (savedOffset) {
      const offset = parseInt(savedOffset, 10)
      if (!isNaN(offset)) {
        setCurrentTime(new Date(Date.now() + offset * 60000))
      }
    }

    // Atualizar relógio a cada segundo
    const interval = setInterval(() => {
      const savedOffset = localStorage.getItem('clock-offset-minutes')
      const offset = savedOffset ? parseInt(savedOffset, 10) : 0
      setCurrentTime(new Date(Date.now() + (isNaN(offset) ? 0 : offset * 60000)))
    }, 1000)

    // Ouvir mudanças nas configurações
    const handleSettingsUpdate = () => {
      loadSettings()
    }
    window.addEventListener('clock-settings-updated', handleSettingsUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener('clock-settings-updated', handleSettingsUpdate)
    }
  }, [])

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const formatDate = (date: Date): string => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    
    const dayName = days[date.getDay()]
    const day = date.getDate().toString().padStart(2, '0')
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    
    return `${dayName}, ${day} ${month} ${year}`
  }

  // Calcular padding proporcional ao tamanho da fonte
  const paddingSize = Math.max(12, settings.fontSize * 0.25)
  const iconSize = Math.max(24, settings.fontSize * 0.6)
  const dateSize = Math.max(12, settings.fontSize * 0.3)
  const buttonSize = Math.max(16, Math.min(24, settings.fontSize * 0.4))

  return (
    <div 
      className="flex items-center gap-3"
      style={{
        padding: `${paddingSize}px`,
        minWidth: 'fit-content',
        width: 'auto'
      }}
    >
      {/* Ícone do relógio */}
      <div className="flex-shrink-0">
        <Clock size={iconSize} style={{ color: settings.color }} strokeWidth={2} />
      </div>

      {/* Hora e Data */}
      <div className="flex flex-col flex-1 whitespace-nowrap">
        <div 
          className="font-bold tracking-tight leading-none"
          style={{ 
            fontSize: `${settings.fontSize}px`,
            color: settings.color
          }}
        >
          {formatTime(currentTime)}
        </div>
        <div 
          style={{ 
            fontSize: `${dateSize}px`,
            color: settings.color,
            opacity: 0.7,
            marginTop: `${Math.max(4, settings.fontSize * 0.08)}px`
          }}
        >
          {formatDate(currentTime)}
        </div>
      </div>

      {/* Botão de ajuste */}
      <button
        onClick={onAdjustClick}
        className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
        style={{
          padding: `${Math.max(8, settings.fontSize * 0.15)}px`
        }}
        title="Ajustar horário e aparência"
      >
        <Settings size={buttonSize} />
      </button>
    </div>
  )
}
