import React, { useEffect, useState } from 'react'
import ApelidosPanel from './ApelidosPanel'
import AbreviacoesPanel from './AbreviacoesPanel'
import CadastroComplementar from './CadastroComplementar'

function LineTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid #ddd', padding: 6 }}>ID</th>
          <th style={{ border: '1px solid #ddd', padding: 6 }}>Source</th>
          <th style={{ border: '1px solid #ddd', padding: 6 }}>OF</th>
          <th style={{ border: '1px solid #ddd', padding: 6 }}>Artigo</th>
          <th style={{ border: '1px solid #ddd', padding: 6 }}>Modelo</th>
          <th style={{ border: '1px solid #ddd', padding: 6 }}>Pares</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td style={{ border: '1px solid #ddd', padding: 6 }}>{r.id}</td>
            <td style={{ border: '1px solid #ddd', padding: 6 }}>{r.source}</td>
            <td style={{ border: '1px solid #ddd', padding: 6 }}>{r.of_number}</td>
            <td style={{ border: '1px solid #ddd', padding: 6 }}>{r.artigo}</td>
            <td style={{ border: '1px solid #ddd', padding: 6 }}>{r.modelo}</td>
            <td style={{ border: '1px solid #ddd', padding: 6 }}>{r.pares}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function TelaEncaixe() {
  const [filePath, setFilePath] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [dbRows, setDbRows] = useState([])
  const [ofQuery, setOfQuery] = useState('')
  const [tab, setTab] = useState(null)

  useEffect(() => {
    loadDb()
  }, [])

  async function loadDb() {
    const rows = await window.dbAPI.getAllLines()
    setDbRows(rows || [])
  }

  async function handleSelect() {
    const p = await window.electronAPI.selectFile()
    if (p) setFilePath(p)
  }

  async function handleParseCTF() {
    if (!filePath) return alert('Selecione um arquivo primeiro')
    const res = await window.electronAPI.parseCTF(filePath)
    setParsed(res)
  }

  async function handleParseCTC() {
    if (!filePath) return alert('Selecione um arquivo primeiro')
    const res = await window.electronAPI.parseCTC(filePath)
    setParsed(res)
  }

  async function handleSave() {
    if (!parsed) return alert('Nada para salvar')
    // infer source from first block
    if (parsed.length > 0 && parsed[0].linhas && parsed[0].linhas[0]) {
      const source = parsed[0].linhas[0].especificacaoTecnica ? 'ctc' : 'ctf'
      const ids = await window.electronAPI.saveCTF ? await window.electronAPI.saveCTF(parsed) : []
      // prefer saveCTF existing function; saveCTC may be used separately
      alert('Inseridos: ' + ids.length)
      loadDb()
    } else {
      alert('Formato de dados inesperado')
    }
  }

  async function handleQueryOf() {
    if (!ofQuery) return loadDb()
    const rows = await window.dbAPI.getLinesByOf(ofQuery)
    setDbRows(rows || [])
  }

  async function handleClearDb() {
    const res = await window.dbAPI.clearLines()
    alert('Removidos: ' + (res.deleted || 0))
    loadDb()
  }

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16 }}>
      <div style={{ flex: '0 0 360px', borderRight: '1px solid #ddd', paddingRight: 12 }}>
        <h3>Controles</h3>
        <div style={{ marginBottom: 8 }}>
          <button onClick={handleSelect}>Selecionar arquivo</button>
        </div>
        <div style={{ marginBottom: 8 }}>{filePath || 'Nenhum arquivo'}</div>
        <div style={{ marginBottom: 8 }}>
          <button onClick={handleParseCTF}>Parse CTF</button>
          <button onClick={handleParseCTC} style={{ marginLeft: 8 }}>Parse CTC</button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <button onClick={handleSave}>Salvar no DB</button>
        </div>

        <h4>Consultas</h4>
        <div style={{ marginBottom: 8 }}>
          <input placeholder="Número OF" value={ofQuery} onChange={e => setOfQuery(e.target.value)} />
          <button onClick={handleQueryOf} style={{ marginLeft: 8 }}>Buscar</button>
        </div>
        <div>
          <button onClick={loadDb}>Atualizar</button>
          <button onClick={handleClearDb} style={{ marginLeft: 8 }}>Limpar DB</button>
        </div>

        <div style={{ marginTop: 16 }}>
          <h4>Gerenciamento</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTab('apelidos')}>Apelidos</button>
            <button onClick={() => setTab('abreviacoes')}>Abreviações</button>
            <button onClick={() => setTab('cadastro')}>Cadastro Complementar</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h3>Visualização - Parsed</h3>
        <pre style={{ maxHeight: 220, overflow: 'auto', background: '#f7f7f7', padding: 8 }}>{parsed ? JSON.stringify(parsed, null, 2) : 'Sem parse'}</pre>

        <h3 style={{ marginTop: 12 }}>Linhas no Banco</h3>
        <div style={{ maxHeight: 380, overflow: 'auto' }}>
          <LineTable rows={dbRows} />
        </div>

        <div style={{ marginTop: 12 }}>
          {tab === 'apelidos' && <ApelidosPanel />}
          {tab === 'abreviacoes' && <AbreviacoesPanel />}
          {tab === 'cadastro' && <CadastroComplementar />}
        </div>
        
        <div style={{ marginTop: 12 }}>
          <h4>Exportação</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={async () => {
              if (!parsed) return alert('Sem dados parsed para exportar')
              const defaultPath = 'exports/pedido_comelz.json'
              const caminho = await window.exportAPI.showSaveDialog({ title: 'Salvar Comelz', defaultPath, filters: [{ name: 'JSON', extensions: ['json'] }] })
              if (!caminho) return
              const res = await window.exportAPI.exportComelz(parsed, caminho)
              alert('Exportado Comelz: ' + res.path)
            }}>Exportar Comelz (.json)</button>

            <button onClick={async () => {
              if (!parsed) return alert('Sem dados parsed para exportar')
              // build PedidoEmma using conversor
              const pedidoEmma = await window.conversorAPI.toEmma(parsed, [], { customer: 'CLIENTE' })
              const defaultPath = 'exports/pedido_emma.json'
              const caminho = await window.exportAPI.showSaveDialog({ title: 'Salvar Emma', defaultPath, filters: [{ name: 'JSON', extensions: ['json'] }] })
              if (!caminho) return
              const res = await window.exportAPI2.exportEmma(pedidoEmma, caminho)
              alert('Exportado Emma: ' + res.path)
            }}>Exportar Emma (.json)</button>

            <button onClick={async () => {
              if (!parsed) return alert('Sem dados parsed para exportar')
              // build Lectra models
              const modelos = await window.conversorAPI.toLectra(parsed, [], {})
              const defaultPath = 'exports/pedido_lectra.mkx'
              const caminho = await window.exportAPI.showSaveDialog({ title: 'Salvar Lectra', defaultPath, filters: [{ name: 'MKX', extensions: ['mkx'] }] })
              if (!caminho) return
              const res = await window.exportAPI2.exportLectra(modelos, caminho, 'MARKER')
              alert('Exportado Lectra: ' + res.path)
            }}>Exportar Lectra (.mkx)</button>
          </div>
        </div>
      </div>
    </div>
  )
}
