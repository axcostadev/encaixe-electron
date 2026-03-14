import React, { Suspense } from "react"

// Importa o componente "Desktop" da outra aplicação (código completo já presente em `src/renderer/view-cutting-machine`)
const CuttingDesktop = React.lazy(() =>
  import("../../view-cutting-machine/src/renderer/src/screens/Desktop/Desktop").then(mod => ({ default: (mod as any).Desktop })),
)

export default function ViewCuttingMachinePage() {
  return (
    <div
      className="relative rounded-md shadow-sm overflow-auto -m-8"
      style={{ height: "100vh", minHeight: 600 }}
    >
      <Suspense fallback={<div className="p-8 text-muted-foreground">Carregando View Cutting Machine...</div>}>
        <CuttingDesktop />
      </Suspense>
    </div>
  )
}
