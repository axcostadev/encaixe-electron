# view-cutting-machine

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
npm run dev```bash


```

### Build
```bash
# Windows
npm run build:win

npm run build:unpack

# Build manual
npx electron-builder

# Em caso de erro de privilégios simbólicos no Windows:

# PowerShell:
$env:ELECTRON_BUILDER_CACHE = "C:\temp\electron-builder-cache"
$env:SKIP_INTEGRITY_CHECK = "true"
npm run build:win

# Command Prompt (cmd):
set ELECTRON_BUILDER_CACHE=C:\temp\electron-builder-cache && set SKIP_INTEGRITY_CHECK=true && npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Solucionando Problemas de Build

### Erro de Links Simbólicos no Windows
Se você encontrar o erro:
```
ERROR: Cannot create symbolic link : O cliente não tem o privilégio necessário.
```

**Solução:** Execute os comandos abaixo antes do build:

**PowerShell:**
```powershell
$env:ELECTRON_BUILDER_CACHE = "C:\temp\electron-builder-cache"
$env:SKIP_INTEGRITY_CHECK = "true"
npm run build:win
```

**Command Prompt (cmd):**
```cmd
set ELECTRON_BUILDER_CACHE=C:\temp\electron-builder-cache && set SKIP_INTEGRITY_CHECK=true && npm run build:win
```

**Alternativa:** Ative o Modo Desenvolvedor do Windows:
1. Configurações → Atualização e Segurança → Para desenvolvedores
2. Ativar "Modo de desenvolvedor"
3. Reiniciar o computador


## Git - Push para Múltiplos Repositórios

Este projeto está configurado para fazer push automático para dois repositórios:
- **Principal**: https://github.com/axcostadev/view-cutting-machine.git
- **Organização**: https://github.com/aincrad-dev/view-cutting-machine.git

### Configuração Única (fazer apenas uma vez)

```bash

# Resetar configuração do remote origin
git remote remove origin

# Adicionar remote origin com o repositório principal
git remote add origin https://github.com/axcostadev/view-cutting-machine.git

# Adicionar o segundo repositório como pushurl
git remote set-url --add --push origin https://github.com/axcostadev/view-cutting-machine.git
git remote set-url --add --push origin https://github.com/aincrad-dev/view-cutting-machine.git

# Verificar configuração
git remote -v
```

git push origin working-from-upgrade-sistema

Você verá algo assim:
```
origin  https://github.com/axcostadev/view-cutting-machine.git (fetch)
origin  https://github.com/axcostadev/view-cutting-machine.git (push)
origin  https://github.com/aincrad-dev/view-cutting-machine.git (push)
```

### Uso Diário (workflow normal)

Depois da configuração, use os comandos Git normalmente:

# 1. Fazer suas alterações no código...

# 2. Adicionar ao stage
git add .

# 3. Fazer commit
git commit -m "sua mensagem de commit"

# 4. Push - vai automaticamente para AMBOS! 🚀
git push origin working-from-upgrade-sistema

**Pronto!** Um único `git push` envia para os dois repositórios automaticamente. ✨

### Caso queira push para apenas um repositório específico

```bash
# Criar remotes separados (opcional)
git remote add personal https://github.com/axcostadev/view-cutting-machine.git
git remote add org https://github.com/aincrad-dev/view-cutting-machine.git

# Push seletivo
git push personal main   # apenas para o pessoal
git push org main        # apenas para organização
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

## Como usar DevTools

Por segurança, o DevTools não abre automaticamente em modo de desenvolvimento. Existem três formas de acessá-lo:

1) **Atalho de teclado** (disponível sempre em desenvolvimento):
   - **Windows/Linux**: `Ctrl + Shift + I`
   - **macOS**: `Cmd + Alt + I`

2) **Variável de ambiente** (força abertura automática):
   ```powershell
   $env:ALLOW_DEVTOOLS_IN_PROD = "true"; npm run dev
   ```

3) **Via código JavaScript** (chamada manual do renderer):
   ```js
   // Exemplo: chamar do renderer
   window.electron.ipcRenderer.invoke('open-devtools').then(res => console.log(res))
   ```

**Observação**: em produção, DevTools só funciona com a variável `ALLOW_DEVTOOLS_IN_PROD=true`. Use apenas para debugging controlado.

## Autores
- **AlysonDEV** - <alysonronnan@gmail.com>
- **axcostadev** - <alexemidio2@outlook.com>

ax