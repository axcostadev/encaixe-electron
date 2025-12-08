import React, { useEffect, useState } from 'react'

export default function ApelidosPanel() {
  const [mapa, setMapa] = useState({})
  const [key, setKey] = useState('')
  const [val, setVal] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const m = await window.apelidosAPI.getAll()
    setMapa(m || {})
  }

  async function handleSave() {
    if (!key || !val) return alert('Preencha componente e apelido')
    await window.apelidosAPI.save(key, val)
    setKey(''); setVal('')
    loadAll()
  }

  async function handleRemove(k) {
    if (!confirm('Remover ' + k + '?')) return
    await window.apelidosAPI.remove(k)
    loadAll()
  }

  return (
    <div>
      <h4>Apelidos</h4>
      <div style={{ marginBottom: 8 }}>
        <input placeholder="componente" value={key} onChange={e => setKey(e.target.value)} />
        <input placeholder="apelido" value={val} onChange={e => setVal(e.target.value)} style={{ marginLeft: 8 }} />
        <button onClick={handleSave} style={{ marginLeft: 8 }}>Salvar</button>
      </div>
      <div style={{ maxHeight: 240, overflow: 'auto', background: '#fff', border: '1px solid #ddd', padding: 8 }}>
        <table style={{ width: '100%' }}>
          <thead><tr><th>Componente</th><th>Apelido</th><th></th></tr></thead>
          <tbody>
            {Object.entries(mapa).map(([k,v]) => (
              <tr key={k}><td>{k}</td><td>{v}</td><td><button onClick={() => handleRemove(k)}>Remover</button></td></tr>
            ))}
          </tbody>
        </table>
        {Object.keys(mapa).length===0 && <div style={{ color: '#666' }}>Nenhum apelido</div>}
      </div>
    </div>
  )
}
