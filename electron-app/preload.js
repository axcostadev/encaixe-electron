const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  parseCTF: (filePath) => ipcRenderer.invoke('parse-ctf', filePath),
  parseCTC: (filePath) => ipcRenderer.invoke('parse-ctc', filePath),
  saveCTF: (lines) => ipcRenderer.invoke('save-ctf', lines),
  saveCTC: (lines) => ipcRenderer.invoke('save-ctc', lines)
})

contextBridge.exposeInMainWorld('dbAPI', {
  getAllLines: () => ipcRenderer.invoke('query-lines'),
  getLinesByOf: (of) => ipcRenderer.invoke('query-lines-by-of', of),
  clearLines: () => ipcRenderer.invoke('clear-lines')
})

contextBridge.exposeInMainWorld('apelidosAPI', {
  getAll: () => ipcRenderer.invoke('apelidos-get-all'),
  get: (comp) => ipcRenderer.invoke('apelidos-get', comp),
  save: (comp, ap) => ipcRenderer.invoke('apelidos-save', comp, ap),
  remove: (comp) => ipcRenderer.invoke('apelidos-remove', comp)
})

contextBridge.exposeInMainWorld('abreviacoesAPI', {
  getAll: () => ipcRenderer.invoke('abreviacoes-get-all'),
  save: (comp, ab) => ipcRenderer.invoke('abreviacoes-save', comp, ab),
  remove: (comp) => ipcRenderer.invoke('abreviacoes-remove', comp)
})

contextBridge.exposeInMainWorld('exportAPI', {
  showSaveDialog: (opts) => ipcRenderer.invoke('show-save-dialog', opts),
  exportComelz: (pedidoObj, caminho) => ipcRenderer.invoke('export-comelz', pedidoObj, caminho)
})

// Exporters
contextBridge.exposeInMainWorld('exportAPI2', {
  exportEmma: (pedidoObj, caminho) => ipcRenderer.invoke('export-emma', pedidoObj, caminho),
  exportLectra: (modelos, caminho, markerName) => ipcRenderer.invoke('export-lectra', modelos, caminho, markerName)
})

contextBridge.exposeInMainWorld('conversorAPI', {
  toComelz: (parsedCTF, parsedCTC, options) => ipcRenderer.invoke('conversor-comelz', parsedCTF, parsedCTC, options),
  toEmma: (parsedCTF, parsedCTC, options) => ipcRenderer.invoke('conversor-emma', parsedCTF, parsedCTC, options),
  toLectra: (parsedCTF, parsedCTC, options) => ipcRenderer.invoke('conversor-lectra', parsedCTF, parsedCTC, options)
})

contextBridge.exposeInMainWorld('cadastroAPI', {
  openFile: () => ipcRenderer.invoke('cadastro-open-file'),
  loadFromFile: (filePath, componente) => ipcRenderer.invoke('cadastro-load-from-file', filePath, componente),
  save: (cadastroObj) => ipcRenderer.invoke('cadastro-save', cadastroObj),
  getByArtigo: (artigo) => ipcRenderer.invoke('cadastro-get-by-artigo', artigo),
  find: (artigo, componente) => ipcRenderer.invoke('cadastro-find', artigo, componente),
  list: (limit) => ipcRenderer.invoke('cadastro-list', limit),
  delete: (id) => ipcRenderer.invoke('cadastro-delete', id)
})
 
contextBridge.exposeInMainWorld('cadastroImportAPI', {
  importAll: () => ipcRenderer.invoke('cadastro-import-folder')
})
