# electronjs-vite-tailwindcss

Aplicação desktop feita com Electron, React, TypeScript, Vite e TailwindCSS.

## Principais Tecnologias
- Electron
- React
- TypeScript
- Vite
- TailwindCSS
- Biome (linter e formatter)

## Requisitos
- Node.js 18+
- npm
- VSCode (recomendado)

## Configuração do Projeto

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Build
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Qualidade de Código
Este projeto utiliza [Biome](https://biomejs.dev/) para análise e formatação de código.

- Checar problemas:
  ```bash
  npm run biome
  ```
- Formatador:
  ```bash
  npm run biome:format
  ```

## Estrutura
- `src/main/` - Código principal do Electron
- `src/preload/` - Scripts de preload
- `src/renderer/` - Frontend React

## Autor
- example.com
