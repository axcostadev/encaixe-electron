import React, { Suspense } from "react"

// Importa o componente "Desktop" da outra aplicação (código completo já presente em `src/renderer/view-cutting-machine`)
const CuttingDesktop = React.lazy(() =>
  import("../../view-cutting-machine/src/renderer/src/screens/Desktop/Desktop").then(mod => ({ default: (mod as any).Desktop })),
)

export default function ViewCuttingMachinePage() {
  return (
    <div className="h-full min-h-[600px] bg-background rounded-md shadow-sm overflow-auto">
      <Suspense fallback={<div className="p-8">Carregando View Cutting Machine...</div>}>
        <CuttingDesktop />
      </Suspense>
    </div>
  )
}
