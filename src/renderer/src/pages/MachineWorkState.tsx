import React, { Suspense } from 'react';

// componente do projeto externo que monta toda a interface com roteamento
// carregamos o bundle compilado (exportado pela build:lib)
const MachineStateApp = React.lazy(async () => {
  try {
    const mod = await import("machine-work-state")
    return {
      // preferir componente sem <Router> para evitar múltiplos roteadores
      default: mod.MachineWorkStateRoutes || mod.MachineWorkStateRouter || mod.default,
    }
  } catch (error) {
    console.error("Falha ao carregar Machine Work State:", error)
    return {
      default: () => (
        <div className="p-8 text-red-600">
          Não foi possível carregar o módulo Machine Work State.
        </div>
      ),
    }
  }
});


export default function MachineWorkStatePage() {
  return (
    <div className="h-full min-h-[600px] bg-background rounded-md shadow-sm overflow-auto">
      <Suspense fallback={<div className="p-8">Carregando Machine Work State...</div>}>
        <MachineStateApp />
      </Suspense>
    </div>
  );
}
