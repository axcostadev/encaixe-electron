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
  const [images, setImages] = useState({ shoe: shoeImg, rolls: rollsImg, logo: vulcabrasImg })

  // Tabs state
  const [tab, setTab] = useState<'dashboard' | 'busca' | 'banco'>('dashboard')

  // Busca Dados (file search) state
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [selectedFileContent, setSelectedFileContent] = useState<string>('')
  const [searchResults, setSearchResults] = useState<{ line: number; text: string; parsed?: Record<string,string> }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [includeToday, setIncludeToday] = useState<boolean>(true)
  const [additionalTerms, setAdditionalTerms] = useState<string>('')

  const fieldsList = [
    'Data','Artigo','DATA FASE','Ordem','Modelo','Material','Cor/Espessura','PREÇO','Previsto','Encaixe','Dif','%','Economia (R$)','Periodo (Ano/Mês)'
  ]
  const [selectedFields, setSelectedFields] = useState<string[]>(['Data','Artigo','Ordem','Modelo','Material','Encaixe','Dif','Periodo (Ano/Mês)'])

  useEffect(() => {
    const tryUsePng = (name: 'shoe' | 'rolls' | 'logo', pngFileName: string) => {
      try {
        const pngUrl = new URL(`../assets/images/${pngFileName}`, import.meta.url).href
        const img = new Image()
        img.onload = () => setImages((s) => ({ ...s, [name]: pngUrl }))
        img.onerror = () => {}
        img.src = pngUrl
      } catch (e) {
        // ignore
      }
    }

    tryUsePng('shoe', 'shoe.png')
    tryUsePng('rolls', 'rolls.png')
    tryUsePng('logo', 'vulcabras.png')

    // if PNGs exist locally, prefer them (update images state immediately)
    try {
      const shoeP = new URL('../assets/images/shoe.png', import.meta.url).href
      const rollsP = new URL('../assets/images/rolls.png', import.meta.url).href
      const logoP = new URL('../assets/images/vulcabras.png', import.meta.url).href
      setImages({ shoe: shoeP, rolls: rollsP, logo: logoP })
    } catch (e) {
      // ignore
    }
  }, [])

  // Load data once on mount (no Import/Atualizar buttons)
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
          <div className="economia-badges mt-4 mb-2 flex justify-end gap-3">
            <div className="econ-badge">
              <div className="badge-icon bg-primary/20 text-primary"><img src={images.shoe} alt="shoe" className="w-6 h-6" /></div>
              <div className="badge-body">
                <div className="badge-amount">{summary ? (summary.totalDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
                <div className="badge-label">Total Economia</div>
              </div>
            </div>
            <div className="econ-badge">
              <div className="badge-icon bg-muted/30 text-muted-foreground"><img src={images.rolls} alt="rolos" className="w-6 h-6" /></div>
              <div className="badge-body">
                <div className="badge-amount">{summary ? summary.ordemCount : 0}</div>
                <div className="badge-label">Pedidos</div>
              </div>
            </div>
            <div className="econ-badge">
              <div className="badge-icon bg-emerald-600/20 text-emerald-400"><Zap className="w-5 h-5" /></div>
              <div className="badge-body">
                <div className="badge-amount">{summary ? (summary.avgDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
                <div className="badge-label">Média por pedido</div>
              </div>
            </div>
            <div className="econ-badge">
              <div className="badge-icon bg-muted/30 text-muted-foreground"><Box className="w-5 h-5" /></div>
              <div className="badge-body">
                <div className="badge-amount">{rows.length}</div>
                <div className="badge-label">Linhas</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="card-stats-economia">
              <div className="label">Total Economia (R$)</div>
              <div className="value">{summary ? (summary.totalDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
            </div>
            <div className="card-stats-economia">
              <div className="label">Pedidos</div>
              <div className="value">{summary ? summary.ordemCount : 0}</div>
            </div>
            <div className="card-stats-economia">
              <div className="label">Média por pedido</div>
              <div className="value">{summary ? (summary.avgDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
            </div>
            <div className="card-stats-economia">
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
        <div className="busca-panel">
          <h2 className="busca-title">Busca Dados</h2>

          <div className="busca-row">
            <label className="busca-field">
              <span className="busca-label">Termo de busca</span>
              <input className="busca-input" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Digite número da OFF" />
            </label>

            <label className="busca-field">
              <span className="busca-label">Termos adicionais (vírgula separado)</span>
              <input className="busca-input" value={additionalTerms} onChange={(e)=>setAdditionalTerms(e.target.value)} placeholder="ex: artigo, ordem" />
            </label>

            <label className="busca-field-inline">
              <input type="checkbox" checked={includeToday} onChange={(e)=>setIncludeToday(e.target.checked)} />
              <span className="busca-label-inline">Incluir data de hoje</span>
            </label>

            <label className="busca-field">
              <span className="busca-label">Arquivo .txt</span>
              <input className="busca-file" type="file" accept=".txt" onChange={(e:any)=>{
                const f = e.target.files && e.target.files[0]
                if (!f) return
                setSelectedFileName(f.name)
                const reader = new FileReader()
                reader.onload = () => setSelectedFileContent(String(reader.result || ''))
                reader.onerror = () => { setSelectedFileContent(''); console.error('Erro ao ler arquivo') }
                reader.readAsText(f, 'utf-8')
              }} />
            </label>

            <div className="busca-actions">
              <button className="busca-button" onClick={()=>{
                if (!selectedFileContent) { alert('Selecione um arquivo .txt primeiro') ; return }
                setSearchLoading(true)
                setTimeout(()=>{
                  // build required terms
                  const termMain = (searchTerm||'').trim()
                  const extras = (additionalTerms||'').split(',').map(s=>s.trim()).filter(Boolean)
                  const requireTerms = [] as string[]
                  if (termMain) requireTerms.push(termMain.toLowerCase())
                  extras.forEach(t=> requireTerms.push(t.toLowerCase()))

                  // date formats for today
                  const today = new Date()
                  const dd = String(today.getDate()).padStart(2,'0')
                  const mm = String(today.getMonth()+1).padStart(2,'0')
                  const yyyy = String(today.getFullYear())
                  const dateCandidates = [
                    `${dd}/${mm}/${yyyy}`,
                    `${dd}-${mm}-${yyyy}`,
                    `${yyyy}-${mm}-${dd}`,
                    `${yyyy}/${mm}/${dd}`,
                    `${yyyy}/${mm}`,
                    today.toLocaleDateString()
                  ].map(s=>s.toLowerCase())

                  const lines = selectedFileContent.split(/\r?\n/)
                  const results:{line:number;text:string; parsed?:Record<string,string>}[] = []

                  // try detect header and delimiter
                  const firstNonEmptyIdx = lines.findIndex(l=>l && l.trim().length>0)
                  const headerLine = firstNonEmptyIdx >=0 ? lines[firstNonEmptyIdx] : ''
                  let delim = '\t'
                  if (headerLine.includes('\t')) delim='\t'
                  else if (headerLine.includes(';')) delim=';'
                  else if (headerLine.includes(',')) delim=','
                  else delim='\t'
                  const headerCols = headerLine ? headerLine.split(delim).map(h=>h.trim()) : []
                  const headerMap = new Map<string,number>()
                  headerCols.forEach((h,i)=> headerMap.set(h.toLowerCase(), i))

                  lines.forEach((ln,idx)=>{
                    const low = ln.toLowerCase()
                    // date requirement
                    const dateOk = includeToday ? dateCandidates.some(d=> low.includes(d)) : true
                    if (!dateOk) return
                    // require all terms if any
                    const termsOk = requireTerms.length === 0 ? true : requireTerms.every(t => low.includes(t))
                    if (!termsOk) return

                    // build parsed mapping if we have columns
                    let parsed: Record<string,string> | undefined = undefined
                    if (headerCols.length > 0) {
                      const cols = ln.split(delim).map(c=>c.trim())
                      parsed = {}
                      headerCols.forEach((h,i)=> parsed![h] = cols[i] ?? '')
                    }
                    results.push({line: idx+1, text: ln, parsed})
                  })
                  setSearchResults(results)
                  setSearchLoading(false)
                }, 10)
              }} style={{padding:'8px 12px', borderRadius:8, background:'#1f6feb', color:'#fff', border:'none', cursor:'pointer'}}>Buscar no arquivo</button>
              <button className="busca-clear" onClick={()=>{ setSelectedFileName(''); setSelectedFileContent(''); setSearchResults([]) }}>Limpar</button>
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <div style={{fontSize:13, color:'#e6f0ff'}}>Arquivo selecionado: <strong style={{color:'#fff'}}>{selectedFileName || 'Nenhum'}</strong></div>
            <div style={{fontSize:13, color:'#e6f0ff'}}>Resultados: <strong style={{color:'#fff'}}>{searchLoading ? 'Buscando...' : `${searchResults.length} ocorrência(s)`}</strong></div>
          </div>

          <div style={{display:'flex', gap:8, marginBottom:8, flexWrap:'wrap'}}>
            {fieldsList.map(f=> (
              <label key={f} style={{display:'flex', alignItems:'center', gap:6}}>
                <input type="checkbox" checked={selectedFields.includes(f)} onChange={(e)=>{
                  if (e.target.checked) setSelectedFields(s=>Array.from(new Set([...s,f])))
                  else setSelectedFields(s=>s.filter(x=>x!==f))
                }} />
                <span style={{fontSize:12,color:'#e6f0ff'}}>{f}</span>
              </label>
            ))}
          </div>

          <div style={{maxHeight:320, overflow:'auto', background:'rgba(255,255,255,0.03)', padding:12, borderRadius:8}}>
            {searchLoading ? (
              <div>Buscando...</div>
            ) : searchResults.length === 0 ? (
              <div style={{color:'#bfdbfe'}}>Nenhum resultado encontrado</div>
            ) : (
              // if parsed exists and selectedFields, show table
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left', padding:8, color:'#9fb7ff'}}>Ln</th>
                      {selectedFields.map(f=> <th key={f} style={{textAlign:'left', padding:8, color:'#9fb7ff'}}>{f}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(r=> (
                      <tr key={r.line} style={{borderTop:'1px solid rgba(255,255,255,0.03)'}}>
                        <td style={{padding:8, verticalAlign:'top'}}>{r.line}</td>
                        {selectedFields.map(f=> (
                          <td key={f} style={{padding:8, verticalAlign:'top'}}>{(r.parsed && (r.parsed[f] ?? r.parsed[f.toLowerCase()] ?? r.parsed[f.replace(/\s+/g,'')])) || r.text}</td>
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
