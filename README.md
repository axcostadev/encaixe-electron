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
# Windows — Instalador (NSIS): cria um .exe com processo de instalação
npm run build:win

# Windows — Versão portátil em pasta: gera uma pasta com o executável e dependências
# Resultado (exemplo): dist/win-unpacked/cutting-room.exe
npm run build:unpack

# Windows — Executável portátil único: .exe self-contained sem instalador
# Resultado (exemplo): dist/cutting-room-<version>-portable.exe
npm run build:portable

# macOS — Gera pacotes para macOS (.dmg / .app)
npm run build:mac

# Linux — Gera AppImage, snap e deb conforme configuração
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
