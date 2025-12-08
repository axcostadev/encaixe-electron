import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as parser from './arquivoParser.js';
import { initDB, saveCTFLines, saveCTCLines, getAllLines, getLinesByOf, clearLines, saveCadastro, getCadastroByArtigo, findCadastro, listCadastros, deleteCadastroById } from './db.js';
import * as gerenciadorApelidos from './gerenciadorApelidos.js';
import * as abreviacaoManager from './abreviacaoManager.js';
import * as exportadorComelz from './exportadorComelz.js';
import * as exportadorEmma from './exportadorEmma.js';
import * as exportadorLectra from './exportadorLectra.js';
import * as conversorComelz from './conversorComelz.js';
import * as conversorEmma from './conversorEmma.js';
import * as conversorLectra from './conversorLectra.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  await initDB();
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Text', extensions: ['txt', 'ctf', 'ctc', 'log'] }, { name: 'All', extensions: ['*'] }] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('parse-ctf', async (event, filePath) => {
  return await parser.parseCTF(filePath);
});

ipcMain.handle('parse-ctc', async (event, filePath) => {
  return await parser.parseCTC(filePath);
});

ipcMain.handle('save-ctf', async (event, lines) => {
  return await saveCTFLines(lines);
});

ipcMain.handle('save-ctc', async (event, lines) => {
  return await saveCTCLines(lines);
});

ipcMain.handle('query-lines', async () => {
  return await getAllLines();
});

ipcMain.handle('query-lines-by-of', async (event, of) => {
  return await getLinesByOf(of);
});

ipcMain.handle('clear-lines', async () => {
  return await clearLines();
});

// Gerenciador de Apelidos
ipcMain.handle('apelidos-get-all', async () => {
  return await gerenciadorApelidos.getAllApelidos();
});

ipcMain.handle('apelidos-get', async (event, componente) => {
  return await gerenciadorApelidos.getApelido(componente);
});

ipcMain.handle('apelidos-save', async (event, componente, apelido) => {
  return await gerenciadorApelidos.saveApelido(componente, apelido);
});

ipcMain.handle('apelidos-remove', async (event, componente) => {
  return await gerenciadorApelidos.removeApelido(componente);
});

// Abreviacoes
ipcMain.handle('abreviacoes-get-all', async () => {
  return await abreviacaoManager.getAllAbreviacoes();
});

ipcMain.handle('abreviacoes-save', async (event, componente, abrev) => {
  return await abreviacaoManager.saveAbreviacao(componente, abrev);
});

ipcMain.handle('abreviacoes-remove', async (event, componente) => {
  return await abreviacaoManager.removeAbreviacao(componente);
});

ipcMain.handle('show-save-dialog', async (event, opts) => {
  const res = await dialog.showSaveDialog({
    title: opts?.title || 'Salvar arquivo',
    defaultPath: opts?.defaultPath || undefined,
    filters: opts?.filters || []
  })
  if (res.canceled) return null
  return res.filePath
})

ipcMain.handle('export-comelz', async (event, pedidoObj, caminho) => {
  return await exportadorComelz.exportar(pedidoObj, caminho)
})

ipcMain.handle('export-emma', async (event, pedidoObj, caminho) => {
  return await exportadorEmma.exportar(pedidoObj, caminho)
})

ipcMain.handle('export-lectra', async (event, modelos, caminho, markerName) => {
  return await exportadorLectra.exportarMkx(modelos, caminho, markerName)
})

ipcMain.handle('conversor-comelz', async (event, parsedCTF, parsedCTC, options) => {
  // try to find cadastro by artigo/componente in options and pass to converter
  let cadastro = null
  try {
    if (options && options.artigo) {
      cadastro = options.componente ? await findCadastro(options.artigo, options.componente) : await getCadastroByArtigo(options.artigo)
    }
  } catch (err) {
    console.error('Erro buscando cadastro para conversor Comelz:', err)
  }
  return conversorComelz.converterParaQtyRules(parsedCTF, parsedCTC, cadastro || options)
})

ipcMain.handle('conversor-emma', async (event, parsedCTF, parsedCTC, options) => {
  let cadastro = null
  try {
    if (options && options.artigo) {
      cadastro = options.componente ? await findCadastro(options.artigo, options.componente) : await getCadastroByArtigo(options.artigo)
    }
  } catch (err) {
    console.error('Erro buscando cadastro para conversor Emma:', err)
  }
  return conversorEmma.converterParaQtyEmma(parsedCTF, parsedCTC, cadastro || options)
})

ipcMain.handle('conversor-lectra', async (event, parsedCTF, parsedCTC, options) => {
  let cadastro = null
  try {
    if (options && options.artigo) {
      cadastro = options.componente ? await findCadastro(options.artigo, options.componente) : await getCadastroByArtigo(options.artigo)
    }
  } catch (err) {
    console.error('Erro buscando cadastro para conversor Lectra:', err)
  }
  return conversorLectra.converterParaModelData(parsedCTF, parsedCTC, cadastro || options)
})

// Import all cadastros from cadastros/*.txt into the SQLite table (batch)
ipcMain.handle('cadastro-import-folder', async () => {
  try {
    const pasta = path.join(__dirname, '..', 'cadastros')
    const files = await fs.promises.readdir(pasta)
    let imported = 0
    for (const f of files) {
      if (!f.toLowerCase().endsWith('.txt')) continue
      const p = path.join(pasta, f)
      const content = await fs.promises.readFile(p, 'utf8')
      const lines = content.split(/\r?\n/).filter(Boolean)
      for (const linha of lines) {
        const campos = linha.split(';')
        if (campos.length >= 13) {
          const cadastroObj = {
            artigo: campos[0].trim(),
            modelo: campos[1].trim(),
            componente: campos[2].trim(),
            material: campos[3].trim(),
            cor: campos[4].trim(),
            largura: campos[5].trim(),
            tipoTecido: campos[6].trim(),
            paresCriac: campos[7].trim(),
            conjugNavalha: campos[8].trim(),
            placaPorPar: campos[9].trim(),
            camada: campos[10].trim(),
            espacamento: campos[11].trim(),
            comprimentoMax: campos[12].trim()
          }
          await saveCadastro(cadastroObj)
          imported++
        }
      }
    }
    return { imported }
  } catch (err) {
    console.error('Erro importando cadastros:', err)
    return { error: String(err) }
  }
})

// Cadastro Complementar handlers
ipcMain.handle('cadastro-open-file', async () => {
  const res = await dialog.showOpenDialog({ title: 'Carregar Cadastro', defaultPath: path.join(__dirname, '..', 'cadastros'), properties: ['openFile'], filters: [{ name: 'Text', extensions: ['txt'] }] })
  if (res.canceled) return null
  return res.filePaths[0]
})

ipcMain.handle('cadastro-load-from-file', async (event, filePath, componenteBuscado) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8')
    const lines = content.split(/\r?\n/).filter(Boolean)
    for (const linha of lines) {
      const campos = linha.split(';')
      if (campos.length >= 13) {
        const componenteNoArquivo = campos[2].trim()
        if (!componenteBuscado || componenteNoArquivo.toLowerCase() === (componenteBuscado || '').toLowerCase()) {
          return {
            artigo: campos[0].trim(),
            modelo: campos[1].trim(),
            componente: componenteNoArquivo,
            material: campos[3].trim(),
            cor: campos[4].trim(),
            largura: campos[5].trim(),
            tipoTecido: campos[6].trim(),
            paresCriac: campos[7].trim(),
            conjugNavalha: campos[8].trim(),
            placaPorPar: campos[9].trim(),
            camada: campos[10].trim(),
            espacamento: campos[11].trim(),
            comprimentoMax: campos[12].trim()
          }
        }
      }
    }
    return null
  } catch (err) {
    console.error('Erro ao carregar cadastro:', err)
    return { error: String(err) }
  }
})

ipcMain.handle('cadastro-save', async (event, cadastroObj) => {
  try {
    const artigo = (cadastroObj.artigo || '').trim()
    if (!artigo) throw new Error('Campo artigo é obrigatório')
    const res = await saveCadastro(cadastroObj)
    return { id: res.id }
  } catch (err) {
    console.error('Erro ao salvar cadastro:', err)
    return { error: String(err) }
  }
})

ipcMain.handle('cadastro-get-by-artigo', async (event, artigo) => {
  try {
    return await getCadastroByArtigo(artigo)
  } catch (err) {
    return { error: String(err) }
  }
})

ipcMain.handle('cadastro-find', async (event, artigo, componente) => {
  try {
    return await findCadastro(artigo, componente)
  } catch (err) {
    return { error: String(err) }
  }
})

ipcMain.handle('cadastro-list', async (event, limit) => {
  try {
    return await listCadastros(limit || 100)
  } catch (err) {
    return { error: String(err) }
  }
})

ipcMain.handle('cadastro-delete', async (event, id) => {
  try {
    return await deleteCadastroById(id)
  } catch (err) {
    return { error: String(err) }
  }
})
