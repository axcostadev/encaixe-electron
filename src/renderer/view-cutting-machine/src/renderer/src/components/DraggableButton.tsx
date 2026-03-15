import React, { useState, useRef, useEffect } from 'react'

interface DraggableButtonProps {
  children: React.ReactNode
  initialPosition?: { x: number; y: number }
  storageKey?: string // Para salvar posição no localStorage
  className?: string
}

export default function DraggableButton({
  children,
  initialPosition = { x: 20, y: 20 },
  storageKey,
  className = ''
}: DraggableButtonProps): React.ReactElement {
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)

  // Carregar posição salva do localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          setPosition(parsed)
        }
      } catch (err) {
        console.warn(`[DraggableButton] Erro ao carregar posição de ${storageKey}:`, err)
      }
    }
  }, [storageKey])

  // Salvar posição no localStorage
  useEffect(() => {
    if (storageKey && !isDragging) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(position))
      } catch (err) {
        console.warn(`[DraggableButton] Erro ao salvar posição de ${storageKey}:`, err)
      }
    }
  }, [position, isDragging, storageKey])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignorar se clicou em botão interno
    if ((e.target as HTMLElement).tagName === 'BUTTON' || 
        (e.target as HTMLElement).closest('button')) {
      return
    }

    e.preventDefault()
    setIsDragging(true)
    
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // Limitar à viewport
      const maxX = window.innerWidth - (buttonRef.current?.offsetWidth || 0)
      const maxY = window.innerHeight - (buttonRef.current?.offsetHeight || 0)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <div
      ref={buttonRef}
      className={`fixed z-50 ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      title="Arraste para mover"
    >
      <div 
        className={`bg-white/95 backdrop-blur-sm shadow-lg rounded-lg border-2 transition-colors ${
          isDragging ? 'border-blue-500 shadow-xl' : 'border-gray-200 hover:border-blue-300'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        {children}
      </div>
    </div>
  )
}
