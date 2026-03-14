import React, { Suspense, useEffect, useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"

// Importa o componente "Desktop" da outra aplicação (código completo já presente em `src/renderer/view-cutting-machine`)
const CuttingDesktop = React.lazy(async () => {
  try {
    const mod = await import("../../view-cutting-machine/src/renderer/src/screens/Desktop/Desktop")
    return { default: (mod as any).Desktop }
  } catch (error) {
    console.error("Falha ao carregar View Cutting Machine:", error)
    return {
      default: () => (
        <div className="p-8 text-red-600">
          Não foi possível carregar o módulo View Cutting Machine.
        </div>
      ),
    }
  }
})

export default function ViewCuttingMachinePage() {
  const [expanded, setExpanded] = useState(false)
  const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const saved = window.localStorage.getItem("vcm-expand-button-pos")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setButtonPos(parsed)
          return
        }
      } catch {
        // ignore malformed localStorage values
      }
    }

    setButtonPos({ x: Math.max(16, window.innerWidth - 170), y: 16 })
  }, [])

  useEffect(() => {
    if (buttonPos.x || buttonPos.y) {
      window.localStorage.setItem("vcm-expand-button-pos", JSON.stringify(buttonPos))
    }
  }, [buttonPos])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!dragging) return

      const maxX = window.innerWidth - 180
      const maxY = window.innerHeight - 60
      const x = Math.min(Math.max(8, event.clientX - dragOffset.x), Math.max(8, maxX))
      const y = Math.min(Math.max(8, event.clientY - dragOffset.y), Math.max(8, maxY))
      setButtonPos({ x, y })
    }

    const onMouseUp = () => {
      setDragging(false)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [dragging, dragOffset])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div
      className={
        expanded
          ? "view-cutting-machine-embedded fixed inset-0 z-[70] bg-background"
          : "view-cutting-machine-embedded relative rounded-md shadow-sm overflow-auto -m-8"
      }
      style={expanded ? undefined : { height: "100vh", minHeight: 600 }}
    >
      <style>{`
        .view-cutting-machine-embedded input,
        .view-cutting-machine-embedded textarea,
        .view-cutting-machine-embedded select {
          color: #111827 !important;
          caret-color: #111827 !important;
        }

        .view-cutting-machine-embedded input::placeholder,
        .view-cutting-machine-embedded textarea::placeholder {
          color: #6b7280 !important;
        }
      `}</style>

      <button
        type="button"
        onMouseDown={(event) => {
          setDragging(true)
          setDragOffset({
            x: event.clientX - buttonPos.x,
            y: event.clientY - buttonPos.y,
          })
        }}
        onClick={() => setExpanded((prev) => !prev)}
        className="fixed z-[90] inline-flex items-center gap-2 rounded-md border bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
        style={{
          left: buttonPos.x,
          top: buttonPos.y,
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        title={expanded ? "Sair da tela completa" : "Expandir tela"}
      >
        {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        <span>{expanded ? "Reduzir" : "Expandir"}</span>
      </button>

      <Suspense fallback={<div className="p-8 text-muted-foreground">Carregando View Cutting Machine...</div>}>
        <CuttingDesktop />
      </Suspense>
    </div>
  )
}
