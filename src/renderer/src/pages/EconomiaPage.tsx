import { useEffect, useState } from "react"
import { PageHeader } from "@renderer/components/common/PageHeader"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@renderer/components/ui/table"
import { Button } from "@renderer/components/ui/button"
import { ChartContainer } from "@renderer/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Box, Zap } from "lucide-react"
import "./EconomiaPage.css"
import shoeImg from "../assets/images/shoe.svg"
import rollsImg from "../assets/images/rolls.svg"
import vulcabrasImg from "../assets/images/vulcabras.svg"
import shoePng from "../assets/images/shoe.png"
import rollsPng from "../assets/images/rolls.png"
import vulcabrasPng from "../assets/images/vulcabras.png"

export interface CadastroInfo {
  id?: number
  artigo: string
  modelo: string
  componente: string
  material: string
  cor: string
  largura: string
  tipoTecido?: number
  paresCriac?: string
  conjugNavalha?: string
  placaPorPar?: string
  camada?: string
  espacamento?: string
  comprimentoMax?: string
}


export default function EconomiaPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [summary, setSummary] = useState<any>(null)
  const [byModelo, setByModelo] = useState<any[]>([])
  const [byMaterial, setByMaterial] = useState<any[]>([])
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  // Prefer PNG versions of images when available; fallback to bundled SVGs
  const images = { shoe: shoePng || shoeImg, rolls: rollsPng || rollsImg, logo: vulcabrasPng || vulcabrasImg }

  // Tabs state
  const [tab, setTab] = useState<'dashboard' | 'busca' | 'banco'>('dashboard')

  // Busca Dados (file search) state
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [cgcFilePath, setCgcFilePath] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<{ line: number; text: string; parsed?: Record<string,string> }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Função para buscar no arquivo CGC
  const handleSearchCGC = async () => {
    if (!cgcFilePath) {
      alert('Selecione um arquivo CGC primeiro!')
      return
    }
    if (!searchTerm.trim()) {
      alert('Digite o número da OF para buscar!')
      return
    }
    setSearchLoading(true)
    try {
      const result = await (window as any).api.economia.searchCGC(cgcFilePath, searchTerm)
      if (result.error) {
        console.error('Erro na busca:', result.error)
        setSearchResults([])
      } else {
        // Converter para o formato esperado pela tabela
        const formattedResults = result.results.map((r: any, idx: number) => ({
          line: idx + 1,
          text: '',
          parsed: {
            'Data': r.data || '',
            'Artigo': r.artigo || '',
            'DATA FASE': r.data || '',
            'Ordem': r.ordem || '',
            'Modelo': r.modelo || '',
            'Material': r.material || '',
            'Cor/Espessura': r.cor_espessura || '',
            'PREÇO': r.preco?.toString() || '',
            'Previsto': r.previsto?.toString() || '',
            'Encaixe': r.encaixe?.toString() || '',
            'Dif': r.dif?.toString() || '',
            '%': r.porcent?.toString() || '',
            'Economia (R$)': '',
            'Periodo (Ano/Mês)': r.data ? `${r.data.split('-')[0]}/${r.data.split('-')[1]}` : ''
          }
        }))
        setSearchResults(formattedResults)
      }
    } catch (err) {
      console.error('Erro ao buscar:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Função para selecionar arquivo (apenas define o caminho)
  const handleSelectFile = async () => {
    try {
      const result = await (window as any).api.economia.selectCGCFile()
      if (result.filePath) {
        setCgcFilePath(result.filePath)
        setSelectedFileName(result.filePath.split(/[/\\]/).pop() || 'CGC.txt')
        setSearchResults([]) // Limpar resultados anteriores
      }
    } catch (err) {
      console.error('Erro ao selecionar arquivo:', err)
    }
  }

  const fieldsList = [
    'Data','Artigo','DATA FASE','Ordem','Modelo','Material','Cor/Espessura','PREÇO','Previsto','Encaixe','Dif','%','Economia (R$)','Periodo (Ano/Mês)'
  ]
  const [selectedFields, setSelectedFields] = useState<string[]>(['Data','Artigo','Ordem','Modelo','Material','Cor/Espessura','PREÇO','Previsto'])
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [list, sum, modelos, materiais] = await Promise.all([
          (window as any).api.economia.list(1000),
          (window as any).api.economia.summary(),
          (window as any).api.economia.byModelo(12),
          (window as any).api.economia.byMaterial(12),
        ])

        if (!mounted) return
        setRows(Array.isArray(list) ? list : [])
        setSummary(sum || { totalDif: 0, ordemCount: 0, avgDif: 0 })
        setByModelo(Array.isArray(modelos) ? modelos : [])
        setByMaterial(Array.isArray(materiais) ? materiais : [])

        // compute available periods and models for client-side filters
        const rs = Array.isArray(list) ? list : []
        const periodsSet = new Set<string>()
        const modelsSet = new Set<string>()
        rs.forEach((r:any) => {
          if (r.data) {
            try {
              const dt = new Date(r.data)
              const p = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}`
              periodsSet.add(p)
            } catch(e) {}
          }
          if (r.modelo) modelsSet.add(r.modelo)
        })
        const periods = Array.from(periodsSet).sort().reverse()
        const models = Array.from(modelsSet).sort()
        setAvailablePeriods(periods)
        setAvailableModels(models)
        // default select all
        setSelectedPeriods(periods)
        setSelectedModels(models)
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Apply filters client-side and recompute aggregates
  const applyFilters = () => {
    const filtered = rows.filter((r:any) => {
      let okPeriod = true
      let okModel = true
      if (selectedPeriods && selectedPeriods.length > 0) {
        if (r.data) {
          try {
            const dt = new Date(r.data)
            const p = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}`
            okPeriod = selectedPeriods.includes(p)
          } catch(e) { okPeriod = false }
        } else okPeriod = false
      }
      if (selectedModels && selectedModels.length > 0) {
        okModel = selectedModels.includes(r.modelo)
      }
      return okPeriod && okModel
    })

    // summary: totalDif, ordemCount (distinct), avgDif per order
    const totalDif = filtered.reduce((s:any,r:any)=>s + (Number(r.dif)||0), 0)
    const ordSet = new Set(filtered.map((r:any)=>r.ordem))
    const ordemCount = ordSet.size
    const avgDif = ordemCount > 0 ? totalDif / ordemCount : 0
    setSummary({ totalDif, ordemCount, avgDif })

    // byModelo and byMaterial from filtered
    const modeloMap = new Map<string,number>()
    const materialMap = new Map<string,number>()
    filtered.forEach((r:any)=>{
      const m = r.modelo || 'N/A'
      const mat = r.material || 'N/A'
      modeloMap.set(m, (modeloMap.get(m)||0) + (Number(r.dif)||0))
      materialMap.set(mat, (materialMap.get(mat)||0) + (Number(r.dif)||0))
    })
    const bm = Array.from(modeloMap.entries()).map(([name,total])=>({name,total})).sort((a,b)=>Math.abs(b.total)-Math.abs(a.total)).slice(0,20)
    const bmat = Array.from(materialMap.entries()).map(([name,total])=>({name,total})).sort((a,b)=>Math.abs(b.total)-Math.abs(a.total)).slice(0,20)
    setByModelo(bm)
    setByMaterial(bmat)
  }

  // rerun applyFilters when rows or selections change
  useEffect(()=>{ applyFilters() }, [rows, selectedPeriods, selectedModels])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Economia Dashboard"
        description="Corte - Economia de Encaixe"
        logo={images.logo}
        action={null}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#181f2a', borderRadius: 10, overflow: 'hidden', width: 'fit-content', marginBottom: 16 }}>
        <button
          onClick={() => setTab('dashboard')}
          style={{
            padding: '10px 24px',
            background: tab === 'dashboard' ? '#101624' : 'transparent',
            color: tab === 'dashboard' ? '#fff' : '#bfc9db',
            fontWeight: 600,
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            fontSize: 16,
            transition: 'background 0.2s',
          }}
        >
          Economia Dashboard
        </button>
        <button
          onClick={() => setTab('busca')}
          style={{
            padding: '10px 24px',
            background: tab === 'busca' ? '#101624' : 'transparent',
            color: tab === 'busca' ? '#fff' : '#bfc9db',
            fontWeight: 600,
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            fontSize: 16,
            transition: 'background 0.2s',
          }}
        >
          Busca Dados
        </button>
        <button
          onClick={() => setTab('banco')}
          style={{
            padding: '10px 24px',
            background: tab === 'banco' ? '#101624' : 'transparent',
            color: tab === 'banco' ? '#fff' : '#bfc9db',
            fontWeight: 600,
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            fontSize: 16,
            transition: 'background 0.2s',
          }}
        >
          Banco de Dados
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'dashboard' && (
        <>
          {/* top badges removed per user request */}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="card-stats-economia">
              <div className="card-icon"><img src={shoeImg} alt="shoe" className="shoe-icon"/></div>
              <div className="label">Total Economia (R$)</div>
              <div className="value">{summary ? (summary.totalDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
            </div>
            <div className="card-stats-economia">
              <div className="card-icon"><img src={rollsImg} alt="rolos" className="rolls-icon"/></div>
              <div className="label">Pedidos</div>
              <div className="value">{summary ? summary.ordemCount : 0}</div>
            </div>
            <div className="card-stats-economia">
              <div className="card-icon"><Zap className="economia-icon" /></div>
              <div className="label">Média por pedido</div>
              <div className="value">{summary ? (summary.avgDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
            </div>
            <div className="card-stats-economia">
              <div className="card-icon"><Box className="economia-icon" /></div>
              <div className="label">Linhas</div>
              <div className="value">{rows.length}</div>
            </div>
          </div>

          <div className="economia-charts-container">
            <div className="economia-filters">
              <h3 className="font-semibold mb-2">FILTROS</h3>
              <div className="mb-3">
                <div className="font-medium">Período</div>
                <div className="h-44 overflow-auto border rounded mt-2 p-2 bg-muted/5">
                  {availablePeriods.map(p=> (
                    <label key={p} className="block text-sm">
                      <input type="checkbox" checked={selectedPeriods.includes(p)} onChange={(e)=>{
                        if (e.target.checked) setSelectedPeriods(s=>Array.from(new Set([...s,p])))
                        else setSelectedPeriods(s=>s.filter(x=>x!==p))
                      }} /> <span className="ml-2">{p}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={()=>setSelectedPeriods(availablePeriods)}>Todos</Button>
                  <Button onClick={()=>setSelectedPeriods([])}>Limpar</Button>
                </div>
              </div>
              <div>
                <div className="font-medium">Modelo</div>
                <div className="h-44 overflow-auto border rounded mt-2 p-2 bg-muted/5">
                  {availableModels.map(m=> (
                    <label key={m} className="block text-sm">
                      <input type="checkbox" checked={selectedModels.includes(m)} onChange={(e)=>{
                        if (e.target.checked) setSelectedModels(s=>Array.from(new Set([...s,m])))
                        else setSelectedModels(s=>s.filter(x=>x!==m))
                      }} /> <span className="ml-2">{m}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={()=>setSelectedModels(availableModels)}>Todos</Button>
                  <Button onClick={()=>setSelectedModels([])}>Limpar</Button>
                </div>
              </div>
            </div>
            <div className="charts-right">
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-2">Modelos - Performance Negativa</h3>
                {byModelo && byModelo.length > 0 ? (
                  <ChartContainer config={{ total: { color: '#2563eb' } }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={byModelo.map((i:any)=>({ name: i.name, total: Math.abs(i.total) }))} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={140} />
                        <Tooltip formatter={(value:number) => value.toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })} />
                        <Bar dataKey="total" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="chart-placeholder">Sem dados para exibir</div>
                )}
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-2">Materiais - Performance Negativa</h3>
                {byMaterial && byMaterial.length > 0 ? (
                  <ChartContainer config={{ total: { color: '#ef4444' } }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={byMaterial.map((i:any)=>({ name: i.name, total: Math.abs(i.total) }))} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={140} />
                        <Tooltip formatter={(value:number) => value.toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })} />
                        <Bar dataKey="total" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="chart-placeholder">Sem dados para exibir</div>
                )}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Detalhes (últimas linhas)</h3>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Artigo</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Encaixe</TableHead>
                    <TableHead>Previsto</TableHead>
                    <TableHead>Dif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9}>Carregando...</TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={9}>Nenhum registro</TableCell></TableRow>
                  ) : (
                    rows.slice(0, 200).map((r:any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.id}</TableCell>
                        <TableCell>{r.data ? new Date(r.data).toLocaleString() : ''}</TableCell>
                        <TableCell>{r.artigo}</TableCell>
                        <TableCell>{r.ordem}</TableCell>
                        <TableCell>{r.modelo}</TableCell>
                        <TableCell>{r.material}</TableCell>
                        <TableCell>{r.encaixe?.toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>{r.previsto?.toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>{r.dif?.toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
      {tab === 'busca' && (
        <div className="busca-container">
          {/* Header */}
          <div className="busca-header">
            <div className="busca-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <h2 className="busca-header-title">Busca de Dados CGC</h2>
              <p className="busca-header-subtitle">Pesquise por OF, artigo ou material no arquivo CGC</p>
            </div>
          </div>

          {/* Search Controls */}
          <div className="busca-controls">
            <div className="busca-input-group">
              <label className="busca-input-label">Número da OF</label>
              <div className="busca-input-wrapper">
                <svg className="busca-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input 
                  className="busca-input-field" 
                  value={searchTerm} 
                  onChange={(e)=>setSearchTerm(e.target.value)} 
                  placeholder="Ex: 435018688"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchCGC()
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="busca-button-group">
              <button 
                className="busca-btn busca-btn-primary" 
                onClick={handleSearchCGC}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <>
                    <svg className="busca-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    Buscar
                  </>
                )}
              </button>
              <button 
                className="busca-btn busca-btn-secondary" 
                onClick={handleSelectFile}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
                Selecionar Arquivo
              </button>
              {searchResults.length > 0 && (
                <button 
                  className="busca-btn busca-btn-ghost" 
                  onClick={()=>{ setSearchResults([]); setSearchTerm('') }}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="busca-status-bar">
            <div className="busca-status-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <span>{selectedFileName || 'CGC.txt (padrão)'}</span>
            </div>
            <div className="busca-status-divider" />
            <div className="busca-status-item busca-status-results">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <span><strong>{searchResults.length}</strong> resultado(s) encontrado(s)</span>
            </div>
          </div>

          {/* Column Selector */}
          <div className="busca-columns">
            <span className="busca-columns-label">Colunas visíveis:</span>
            <div className="busca-columns-list">
              {fieldsList.map(f=> (
                <label key={f} className={`busca-column-chip ${selectedFields.includes(f) ? 'active' : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedFields.includes(f)} 
                    onChange={(e)=>{
                      if (e.target.checked) setSelectedFields(s=>Array.from(new Set([...s,f])))
                      else setSelectedFields(s=>s.filter(x=>x!==f))
                    }}
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          {/* Results Table */}
          <div className="busca-results">
            {searchLoading ? (
              <div className="busca-loading">
                <svg className="busca-spinner-large" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Processando arquivo CGC...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="busca-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <h3>Nenhum resultado</h3>
                <p>Digite o número da OF e clique em Buscar</p>
              </div>
            ) : (
              <div className="busca-table-wrapper">
                <table className="busca-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {selectedFields.map(f=> <th key={f}>{f}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((r, idx)=> (
                      <tr key={`${r.line}-${idx}`}>
                        <td className="busca-row-num">{idx + 1}</td>
                        {selectedFields.map(f=> (
                          <td key={f}>{(r.parsed && (r.parsed[f] ?? r.parsed[f.toLowerCase()] ?? r.parsed[f.replace(/\s+/g,'')])) || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {tab === 'banco' && (
        <div style={{padding: 32, background: 'var(--economia-gradient)', borderRadius: 12, color: '#fff', minHeight: 400}}>
          <h2 style={{fontSize: 24, fontWeight: 700, marginBottom: 16}}>Banco de Dados</h2>
          <p>Conteúdo do banco de dados aqui...</p>
        </div>
      )}
    </div>
  )
}
