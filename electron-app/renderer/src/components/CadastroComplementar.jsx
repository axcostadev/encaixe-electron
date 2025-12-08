import React, { useState } from 'react'

export default function CadastroComplementar() {
  const [form, setForm] = useState({
    artigo: '', modelo: '', componente: '', material: '', cor: '', largura: '',
    tipoTecido: '', paresCriac: '', conjugNavalha: '', placaPorPar: '',
    camada: '', espacamento: '', comprimentoMax: ''
  })
  const [message, setMessage] = useState('')

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSalvar() {
    if (!form.artigo || !form.componente) {
      alert('Os campos Artigo e Componente são obrigatórios')
      return
    }
    const res = await window.cadastroAPI.save(form)
    if (res && res.id) {
      setMessage('Cadastro salvo no DB com id: ' + res.id)
      setForm({ artigo: '', modelo: '', componente: '', material: '', cor: '', largura: '', tipoTecido: '', paresCriac: '', conjugNavalha: '', placaPorPar: '', camada: '', espacamento: '', comprimentoMax: '' })
    } else {
      setMessage('Erro ao salvar: ' + (res && res.error ? res.error : 'desconhecido'))
    }
  }

  async function handleCarregar() {
    const artigo = prompt('Informe o número do Artigo para carregar (ou vazio para cancelar):')
    if (!artigo) return
    const componente = prompt('Informe o Componente (opcional, deixe em branco para buscar pelo artigo):')
    let loaded = null
    if (componente && componente.trim()) {
      loaded = await window.cadastroAPI.find(artigo, componente.trim())
    } else {
      loaded = await window.cadastroAPI.getByArtigo(artigo)
    }
    if (!loaded) {
      setMessage('Nenhum cadastro encontrado para artigo: ' + artigo)
      return
    }
    if (loaded.error) {
      setMessage('Erro: ' + loaded.error)
      return
    }
    setForm({
      artigo: loaded.artigo || '',
      modelo: loaded.modelo || '',
      componente: loaded.componente || '',
      material: loaded.material || '',
      cor: loaded.cor || '',
      largura: loaded.largura || '',
      tipoTecido: loaded.tipo_tecido || loaded.tipoTecido || '',
      paresCriac: loaded.pares_criac || loaded.paresCriac || '',
      conjugNavalha: loaded.conjug_navalha || loaded.conjugNavalha || '',
      placaPorPar: loaded.placa_por_par || loaded.placaPorPar || '',
      camada: loaded.camada || '',
      espacamento: loaded.espacamento || '',
      comprimentoMax: loaded.comprimento_max || loaded.comprimentoMax || ''
    })
    setMessage('Carregado do DB: artigo ' + artigo)
  }

  async function handleImportarArquivos() {
    const confirmImport = confirm('Importar todos os arquivos em cadastros/*.txt para o banco de dados?')
    if (!confirmImport) return
    const res = await window.cadastroImportAPI.importAll()
    if (res && res.imported !== undefined) {
      setMessage('Registros importados: ' + res.imported)
    } else {
      setMessage('Erro na importação: ' + (res && res.error ? res.error : 'desconhecido'))
    }
  }

  return (
    <div style={{ padding: 8 }}>
      <h4>Cadastro Complementar</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, alignItems: 'center' }}>
        <label>Artigo:</label>
        <input value={form.artigo} onChange={e => setField('artigo', e.target.value)} />
        <label>Modelo:</label>
        <input value={form.modelo} onChange={e => setField('modelo', e.target.value)} />
        <label>Componente:</label>
        <input value={form.componente} onChange={e => setField('componente', e.target.value)} />
        <label>Material:</label>
        <input value={form.material} onChange={e => setField('material', e.target.value)} />
        <label>Cor:</label>
        <input value={form.cor} onChange={e => setField('cor', e.target.value)} />
        <label>Largura:</label>
        <input value={form.largura} onChange={e => setField('largura', e.target.value)} />
        <label>Tipo Tecido:</label>
        <input value={form.tipoTecido} onChange={e => setField('tipoTecido', e.target.value)} />
        <label>Pares Criac:</label>
        <input value={form.paresCriac} onChange={e => setField('paresCriac', e.target.value)} />
        <label>Conjug Navalha:</label>
        <input value={form.conjugNavalha} onChange={e => setField('conjugNavalha', e.target.value)} />
        <label>Placa Por Par:</label>
        <input value={form.placaPorPar} onChange={e => setField('placaPorPar', e.target.value)} />
        <label>Camada:</label>
        <input value={form.camada} onChange={e => setField('camada', e.target.value)} />
        <label>Espacamento:</label>
        <input value={form.espacamento} onChange={e => setField('espacamento', e.target.value)} />
        <label>Comprimento Max:</label>
        <input value={form.comprimentoMax} onChange={e => setField('comprimentoMax', e.target.value)} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleSalvar}>Salvar</button>
        <button onClick={handleCarregar} style={{ marginLeft: 8 }}>Carregar</button>
        <button onClick={handleImportarArquivos} style={{ marginLeft: 8 }}>Importar arquivos (*.txt)</button>
      </div>

      {message && <div style={{ marginTop: 8, color: '#333' }}>{message}</div>}
    </div>
  )
}
