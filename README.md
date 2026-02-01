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


$env:Path += ';C:\Aincrad\Development\_kit\node-v24.11.1-win-x64'
npm -v
npm run dev
```

### Geração de Licença

O sistema de licença offline vincula o token ao hardware do dispositivo. Para gerar uma licença válida, siga os passos abaixo:

#### Passo 1: Obter o Fingerprint do dispositivo

1. Execute a aplicação no dispositivo de destino:
   ```bash
   npm run dev
   ```
2. Acesse a página de **Licença** no menu lateral (ícone de cadeado ou "Licença")
3. Na tela de ativação, o **Fingerprint** do dispositivo será exibido automaticamente
4. Copie o código do fingerprint (exemplo: `5b7c5cdc6f2a84f452be7ff02544c34bbd0f70c4fff9b8b1d371229062e3d94c`)

> **Importante:** Cada dispositivo tem um fingerprint único. O token gerado só funcionará no dispositivo correspondente.

#### Passo 2: Gerar o Token de Licença

Com o fingerprint em mãos, execute o gerador de licença:

```bash
npx ts-node --transpile-only scripts/license-generator.ts \
  --fingerprint=<FINGERPRINT_COPIADO> \
  --product=cutting-room \
  --customer=<NOME_CLIENTE> \
  --features=full \
  --expires=365
```

**Exemplo completo:**
```bash
npx ts-node --transpile-only scripts/license-generator.ts --fingerprint=5b7c5cdc6f2a84f452be7ff02544c34bbd0f70c4fff9b8b1d371229062e3d94c --product=cutting-room --customer=demo --features=full --expires=365
```

O comando irá gerar um **token** (string longa em base64url) e exibir o payload no terminal.

#### Passo 3: Ativar a Licença

1. Copie o token gerado (a linha que começa com caracteres como `eyJ...`)
2. Na aplicação, vá para a página de **Licença**
3. Cole o token no campo de ativação e clique em **Ativar**
4. Se o fingerprint coincidir, a licença será ativada com sucesso ✅

#### Parâmetros do Gerador

| Parâmetro       | Descrição                                              | Padrão         |
|-----------------|--------------------------------------------------------|----------------|
| `--key`         | Caminho para a chave privada Ed25519                   | `resources/license/test-private-key.pem` |
| `--product`     | ID do produto                                          | `cutting-room` |
| `--customer`    | ID/nome do cliente                                     | `demo-customer`|
| `--fingerprint` | Fingerprint do dispositivo (obrigatório p/ vincular)   | —              |
| `--features`    | Features habilitadas (separadas por vírgula)           | `full`         |
| `--expires`     | Dias até expiração                                     | `365`          |
| `--grace`       | Dias de carência após expiração (v2)                   | `0`            |
| `--allowed`     | Fingerprints adicionais permitidos (v2)                | —              |
| `--version`     | Versão do payload (1 ou 2)                             | `2`            |

> **Dica:** Se quiser permitir a mesma licença em múltiplos dispositivos, use `--allowed=fp1,fp2,fp3` com os fingerprints adicionais.

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
