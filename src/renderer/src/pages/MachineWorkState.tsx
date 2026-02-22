import React, { Suspense } from 'react';

// componente do projeto externo que monta toda a interface com roteamento
// carregamos o bundle compilado (exportado pela build:lib)
const MachineStateApp = React.lazy(() =>
  import("machine-work-state").then(mod => ({
    // preferir componente sem <Router> para evitar múltiplos roteadores
    default: mod.MachineWorkStateRoutes || mod.MachineWorkStateRouter || mod.default,
  }))
);


export default function MachineWorkStatePage() {
  return (
    <div className="h-full min-h-[600px] bg-background rounded-md shadow-sm overflow-auto">
      <Suspense fallback={<div className="p-8">Carregando Machine Work State...</div>}>
        <MachineStateApp />
      </Suspense>
    </div>
  );
}
