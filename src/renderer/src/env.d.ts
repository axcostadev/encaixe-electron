/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

// Declarações para imports dinâmicos de subprojetos (evita que tsc tente incluir os arquivos fonte externos no projeto)
declare module "../../view-cutting-machine/src/renderer/src/screens/Desktop/Desktop" {
  import React from "react";
  export const Desktop: React.ComponentType<any>;
  const _default: React.ComponentType<any>;
  export default _default;
}

