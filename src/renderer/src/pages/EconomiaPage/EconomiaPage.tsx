import { useEffect, useState, useRef, useMemo } from "react"
import { useAuth } from "@renderer/contexts/AuthContext"
import { PageHeader } from "@renderer/components/common/PageHeader"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@renderer/components/ui/table"

import { ChartContainer } from "@renderer/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from "recharts"
import { toast } from "@renderer/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog"
import "./EconomiaPage.css"
import shoeImg from "@renderer/assets/images/shoe.svg"
import shoeIcon from "@renderer/assets/images/icone_sapato.svg"
import rollsImg from "@renderer/assets/images/rolls.svg"
import vulcabrasImg from "@renderer/assets/images/vulcabras.svg"
import shoePng from "@renderer/assets/images/shoe.png"
import rollsPng from "@renderer/assets/images/rolls.png"
import vulcabrasPng from "@renderer/assets/images/vulcabras.png"
import matirialIcon from "@renderer/assets/images/icone_rolo_material.svg"

export interface CadastroInfo {
  id?: number
  artigo: string
  modelo: string
  componente: string
  apelido: string
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
  const { permissions } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // High contrast mode (persisted)
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try { return localStorage.getItem('economia:highContrast') === '1' } catch (e) { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('economia:highContrast', highContrast ? '1' : '0') } catch (e) {}
  }, [highContrast])

  const [summary, setSummary] = useState<any>(null)
  const [byModelo, setByModelo] = useState<any[]>([])
  const [byModeloPos, setByModeloPos] = useState<any[]>([])
  const [modelView, setModelView] = useState<'brl'|'pct'>('brl')
  const [materialView, setMaterialView] = useState<'brl'|'pct'>('brl')

  // Optional manual overrides for Y axis max (0 or null = auto). Values stored in localStorage.
  const [modelYMaxOverride, setModelYMaxOverride] = useState<number | null>(() => {
    try { const v = localStorage.getItem('economia:modelYMax'); return v && v !== '0' ? Number(v) : null } catch (e) { return null }
  })
  const [materialYMaxOverride, setMaterialYMaxOverride] = useState<number | null>(() => {
    try { const v = localStorage.getItem('economia:materialYMax'); return v && v !== '0' ? Number(v) : null } catch (e) { return null }
  })
  const setModelYMaxFromInput = (v:string) => {
    if (v === '' || v === '0') { setModelYMaxOverride(null); try { localStorage.removeItem('economia:modelYMax') } catch (e) {} ; return }
    const n = Math.max(0, Math.min(10000, parseInt(v || '0', 10) || 0))
    setModelYMaxOverride(n)
    try { localStorage.setItem('economia:modelYMax', String(n)) } catch (e) {}
  }
  const setMaterialYMaxFromInput = (v:string) => {
    if (v === '' || v === '0') { setMaterialYMaxOverride(null); try { localStorage.removeItem('economia:materialYMax') } catch (e) {} ; return }
    const n = Math.max(0, Math.min(10000, parseInt(v || '0', 10) || 0))
    setMaterialYMaxOverride(n)
    try { localStorage.setItem('economia:materialYMax', String(n)) } catch (e) {}
  }
  const [byMaterial, setByMaterial] = useState<any[]>([])
  // positive materials (summing dif > 0) — materiais passando do Previsto
  const [byMaterialPos, setByMaterialPos] = useState<any[]>([])
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  // Valida formato YYYY/MM e limites razoáveis (mês 01-12, ano entre 2000 e nextYear)
  const isValidPeriod = (p?: string) => {
    if (!p || typeof p !== 'string') return false
    const m = /^([0-9]{4})\/(0[1-9]|1[0-2])$/.exec(p.trim())
    if (!m) return false
    const year = Number(m[1])
    const nextYear = new Date().getFullYear() + 1
    return year >= 2000 && year <= nextYear
  }



  // Prefer PNG versions of images when available; fallback to bundled SVGs
  const images = { shoe: shoePng || shoeImg, rolls: rollsPng || rollsImg, logo: vulcabrasPng || vulcabrasImg }

  // Helpers for date display (DD-MM-YYYY) <-> ISO (YYYY-MM-DD)
  const pad2 = (n:number) => String(n).padStart(2, '0')
  const formatISOToDisplay = (iso?: string) => {
    if (!iso) return ''
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    if (/^\d{2}-\d{2}-\d{4}$/.test(iso)) return iso
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`
  }
  const formatDisplayToISO = (disp?: string) => {
    if (!disp) return ''
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(disp.trim())
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    if (/^\d{4}-\d{2}-\d{2}$/.test(disp)) return disp
    const d = new Date(disp)
    if (isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
  }
  const getTodayDisplay = () => {
    const d = new Date()
    return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`
  }

  // Derive period YYYY/MM from various date string formats (ISO or dd-mm-yyyy or other parsable)
  const getPeriodFromDateString = (s?: string) => {
    if (!s) return ''
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
    if (isoMatch) return `${isoMatch[1]}/${isoMatch[2]}`
    const dispMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim())
    if (dispMatch) return `${dispMatch[3]}/${dispMatch[2]}`
    const d = new Date(s)
    if (!isNaN(d.getTime())) return `${d.getFullYear()}/${pad2(d.getMonth()+1)}`
    return ''
  }
  const getTodayPeriod = () => {
    const d = new Date()
    return `${d.getFullYear()}/${pad2(d.getMonth()+1)}`
  }

  // Tabs state
  const [tab, setTab] = useState<'dashboard' | 'busca' | 'banco'>('dashboard')

  // Busca Dados (file search) state
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [cgcFilePath, setCgcFilePath] = useState<string | null>(null)
  const [ofccFilePath, setOfccFilePath] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<{ line: number; text: string; parsed?: Record<string,string> }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchedInFile, setSearchedInFile] = useState<string>('') // qual arquivo retornou os resultados

  // Carregar caminhos CGC e OFCC das configurações na inicialização
  useEffect(() => {
    async function loadFilePaths() {
      try {
        const res = await (window as any).api.settings.get()
        if (res && res.success && res.settings && res.settings.cgcFilePath) {
          setCgcFilePath(res.settings.cgcFilePath)
          setSelectedFileName(res.settings.cgcFilePath.split(/[/\\]/).pop() || 'CGC.txt')
        } else {
          // Fallback para caminho padrão CGC
          const defaultPath = 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\CGC.txt'
          setCgcFilePath(defaultPath)
          setSelectedFileName('CGC.txt')
        }
        // Segundo arquivo: OFCC.txt (fallback se não encontrar no CGC)
        if (res && res.success && res.settings && res.settings.ofccFilePath) {
          setOfccFilePath(res.settings.ofccFilePath)
        } else {
          // Fallback para caminho padrão OFCC
          const defaultOfccPath = 'O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\OFCC.txt'
          setOfccFilePath(defaultOfccPath)
        }
      } catch (err) {
        console.error('Erro carregando configuração dos arquivos:', err)
        // Fallback para caminhos padrão
        setCgcFilePath('O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\CGC.txt')
        setOfccFilePath('O:\\Lectra\\Calcado\\Modelos\\SL-ECX\\OFCC.txt')
        setSelectedFileName('CGC.txt')
      }
    }
    loadFilePaths()
  }, [])

  // Header (FK) fields and saved header id
  const [headerFields, setHeaderFields] = useState<{ dataFase?: string; modelo?: string; artigo?: string; data?: string; periodo?: string }>(() => ({ data: getTodayDisplay(), periodo: getTodayPeriod(), artigo: '' }))
  const [headerId, setHeaderId] = useState<number | null>(null)

  // Banco de Dados (persistido)
  const [bancoRows, setBancoRows] = useState<any[]>([])
  const [bancoLoading, setBancoLoading] = useState(false)
  const [bancoSelected, setBancoSelected] = useState<number[]>([])
  const [bancoEdits, setBancoEdits] = useState<Record<number, string>>({})
  const [exporting, setExporting] = useState(false)
  const [exportingXlsx, setExportingXlsx] = useState(false)

  // Toggle para ocultar botões do painel "Banco de Dados"
  const hideBancoButtons = true

  // Client-side Excel-like filters/sort for Banco de Dados
  const [bancoFilters, setBancoFilters] = useState<Record<string, Set<string>>>({})
  const [bancoFilterOpen, setBancoFilterOpen] = useState<string | null>(null)
  const [bancoFilterSearch, setBancoFilterSearch] = useState<Record<string, string>>({})
  const [bancoFilterWorking, setBancoFilterWorking] = useState<Record<string, Set<string>>>({})
  const [bancoSort, setBancoSort] = useState<{ col?: string; dir?: 'asc' | 'desc' }>({})

  const FILTER_COLUMNS: { key: string; label: string; getter: (r:any) => string }[] = [
    { key: 'artigo', label: 'Artigo', getter: (r:any) => r.artigo || '-' },
    { key: 'dataFase', label: 'Data Fase', getter: (r:any) => (r.header_data_fase || (r.data ? formatISOToDisplay(r.data) : '')) || '-' },
    { key: 'ordem', label: 'Ordem', getter: (r:any) => r.ordem || '-' },
    { key: 'modelo', label: 'Modelo', getter: (r:any) => (r.header_modelo || r.modelo) || '-' },
    { key: 'material', label: 'Material', getter: (r:any) => r.material || '-' },
    { key: 'cor', label: 'Cor/Espessura', getter: (r:any) => r.cor_espessura || '-' },
    { key: 'periodo', label: 'Período', getter: (r:any) => r.periodo || r.header_periodo || '-' },
  ]

  const getUniqueValuesFor = (key: string) => {
    const col = FILTER_COLUMNS.find(c => c.key === key)
    if (!col) return []
    const s = new Set<string>()
    bancoRows.forEach(r => { s.add(String(col.getter(r))) })
    return Array.from(s).sort((a,b)=>a.localeCompare(b, 'pt-BR', { numeric: true }))
  }

  const openFilterFor = (key: string) => {
    const values = getUniqueValuesFor(key)
    const current = bancoFilters[key]
    // if no filter, preselect all values (Excel behavior)
    const initial = current && current.size > 0 ? new Set(Array.from(current)) : new Set(values)
    setBancoFilterWorking(prev => ({ ...prev, [key]: initial }))
    setBancoFilterSearch(prev => ({ ...prev, [key]: '' }))
    setBancoFilterOpen(key)
  }

  const applyFilterFor = (key: string) => {
    const working = bancoFilterWorking[key]
    if (!working) return
    // if all values are selected, treat as no filter
    const allValues = getUniqueValuesFor(key)
    if (working.size === 0 || working.size === allValues.length) {
      setBancoFilters(prev => { const copy = { ...prev }; delete copy[key]; return copy })
    } else {
      setBancoFilters(prev => ({ ...prev, [key]: new Set(Array.from(working)) }))
    }
    setBancoFilterOpen(null)
  }

  const clearFilterFor = (key: string) => {
    setBancoFilterWorking(prev => ({ ...prev, [key]: new Set() }))
  }

  const toggleFilterValue = (key: string, value: string) => {
    setBancoFilterWorking(prev => {
      const copy = { ...prev }
      const s = new Set(copy[key] ? Array.from(copy[key]) : [])
      if (s.has(value)) s.delete(value)
      else s.add(value)
      copy[key] = s
      return copy
    })
  }

  const toggleBancoSort = (colKey: string) => {
    setBancoSort(prev => {
      if (prev.col !== colKey) return { col: colKey, dir: 'asc' }
      if (prev.dir === 'asc') return { col: colKey, dir: 'desc' }
      return {}
    })
  }

  const FilterableTh = ({ colKey, className, children }: any) => {
    const unique = getUniqueValuesFor(colKey)
    const search = bancoFilterSearch[colKey] || ''
    const working = bancoFilterWorking[colKey] || new Set(unique)
    const isActive = bancoFilters[colKey] && bancoFilters[colKey].size > 0
    const sortActive = bancoSort.col === colKey ? bancoSort.dir : undefined
    return (
      <th className={className} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={() => toggleBancoSort(colKey)}>
            {children}
            {sortActive ? (sortActive === 'asc' ? ' ▲' : ' ▼') : ''}
          </span>
          <button title="Filtro" className={`filter-btn ${isActive ? 'active' : ''}`} onClick={(e:any) => { e.stopPropagation(); openFilterFor(colKey) }} style={{ background: isActive ? '#ef4444' : 'transparent', color: isActive ? '#fff' : 'inherit', border: '1px solid rgba(255,255,255,0.05)', padding: '4px 6px', borderRadius: 6 }}>
            ⌕
          </button>
        </div>
        {bancoFilterOpen === colKey && (
          <div style={{ position: 'absolute', top: 36, left: 0, zIndex: 80, width: 320, background: '#fff', color: '#000', borderRadius: 6, padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <input autoFocus placeholder="Pesquisar..." value={search} onChange={(e)=>setBancoFilterSearch(prev=>({...prev,[colKey]: e.target.value}))} onKeyDown={(e)=>{ e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); applyFilterFor(colKey) } }} onKeyUp={(e)=>e.stopPropagation()} style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ddd' }} />
            <div style={{ maxHeight: 220, overflow: 'auto', marginTop: 8 }}>
              {unique.filter(v=> search.trim() === '' || v.toLowerCase().includes(search.toLowerCase())).map(v => (
                <label key={v} style={{ display: 'block', padding: '2px 0' }}>
                  <input type="checkbox" checked={working.has(v)} onChange={()=>toggleFilterValue(colKey, v)} /> <span style={{ marginLeft: 6 }}>{v}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <div>
                <button className="busca-btn busca-btn-ghost" onClick={()=>{ setBancoFilterWorking(prev=>({...prev, [colKey]: new Set(getUniqueValuesFor(colKey))})); }} style={{ marginRight: 6 }}>Selecionar tudo</button>
                <button className="busca-btn busca-btn-ghost" onClick={()=>clearFilterFor(colKey)}>Limpar</button>
              </div>
              <div>
                <button className="busca-btn busca-btn-ghost" onClick={()=>setBancoFilterOpen(null)} style={{ marginRight: 6 }}>Cancelar</button>
                <button className="busca-btn busca-btn-secondary" onClick={()=>applyFilterFor(colKey)}>OK</button>
              </div>
            </div>
          </div>
        )}
      </th>
    )
  }

  const filteredBancoRows = useMemo(() => {
    let rows = Array.isArray(bancoRows) ? bancoRows.slice() : []
    // apply filters
    Object.entries(bancoFilters).forEach(([k, setV]) => {
      const col = FILTER_COLUMNS.find(c => c.key === k)
      if (!col) return
      rows = rows.filter(r => setV.has(String(col.getter(r))))
    })
    // apply sort
    if (bancoSort.col) {
      const colCfg = FILTER_COLUMNS.find(c => c.key === bancoSort.col)
      if (colCfg) {
        rows.sort((a, b) => {
          const va = String(colCfg.getter(a) || '')
          const vb = String(colCfg.getter(b) || '')
          const cmp = va.localeCompare(vb, 'pt-BR', { numeric: true })
          return bancoSort.dir === 'asc' ? cmp : -cmp
        })
      }
    }
    return rows
  }, [bancoRows, bancoFilters, bancoSort])

  // Confirm dialog (replaces blocking window.confirm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState<string>('')
  const confirmResolveRef = useRef<(ok: boolean) => void | null>(null)
  const askConfirm = (msg: string) => {
    setConfirmMessage(msg)
    setConfirmOpen(true)
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = (ok: boolean) => {
        setConfirmOpen(false)
        resolve(ok)
      }
    })
  }

  // Bloqueio temporário após confirmação cancelada — usa timestamp para contornar throttling de timers
  const LOCK_DURATION_MS = 1000
  const [encaixeLocked, setEncaixeLocked] = useState<Record<number, boolean>>({})
  const encaixeLockedRef = useRef<Record<number, boolean>>({})
  const encaixeLockedAtRef = useRef<Record<number, number>>({})
  const [bancoLocked, setBancoLocked] = useState<Record<number, boolean>>({})
  const bancoLockedRef = useRef<Record<number, boolean>>({})
  const bancoLockedAtRef = useRef<Record<number, number>>({})

  const unlockEncaixeIndex = (idx: number) => {
    delete encaixeLockedRef.current[idx]
    delete encaixeLockedAtRef.current[idx]
    setEncaixeLocked(prev => { const copy = { ...prev }; delete copy[idx]; return copy })
    encaixeAllowEditRef.current[idx] = true
  }
  const tryUnlockEncaixeIndex = (idx: number) => {
    const start = encaixeLockedAtRef.current[idx]
    if (!start) return false
    if (Date.now() - start >= LOCK_DURATION_MS) {
      unlockEncaixeIndex(idx)
      return true
    }
    return false
  }

  const unlockBancoIndex = (id: number) => {
    delete bancoLockedRef.current[id]
    delete bancoLockedAtRef.current[id]
    setBancoLocked(prev => { const copy = { ...prev }; delete copy[id]; return copy })
    bancoAllowEditRef.current[id] = true
  }
  const tryUnlockBancoIndex = (id: number) => {
    const start = bancoLockedAtRef.current[id]
    if (!start) return false
    if (Date.now() - start >= LOCK_DURATION_MS) {
      unlockBancoIndex(id)
      return true
    }
    return false
  }

  // Charts should only render after the dashboard tab is visible — avoids Recharts measuring width/height = -1
  const [chartsReady, setChartsReady] = useState(false)

  useEffect(() => {
    let raf = 0
    if (tab === 'dashboard') {
      // wait a frame so layout settles (sidebar animations, CSS) before rendering charts
      raf = window.requestAnimationFrame(() => setChartsReady(true))
    } else {
      setChartsReady(false)
    }
    return () => { window.cancelAnimationFrame(raf) }
  }, [tab])
  
  // Estado para valores editáveis de "Encaixe" por linha
  const [encaixeValues, setEncaixeValues] = useState<Record<number, string>>({})
  // Marca se o usuário fez uma entrada (digitou/colou) no campo — usado para ignorar mudanças via spinner/scroll
  const [encaixeTouched, setEncaixeTouched] = useState<Record<number, boolean>>({})
  // Marca semelhante para o Banco de Dados
  const [bancoTouched, setBancoTouched] = useState<Record<number, boolean>>({})
  // Ref to track in-flight header save promises so multiple callers can await the same promise
  const headerSavedPromiseRef = useRef<Record<number, Promise<number | null> | undefined>>({})
  // Refs para marcação síncrona (evita bloqueio causado por atualização assíncrona de state)
  const encaixeTouchedRef = useRef<Record<number, boolean>>({})
  const bancoTouchedRef = useRef<Record<number, boolean>>({})
  // Refs para permitir edição imediata após cancelamento (bypass temporário do bloqueio)
  const encaixeAllowEditRef = useRef<Record<number, boolean>>({})
  const bancoAllowEditRef = useRef<Record<number, boolean>>({})
  
  // Função para atualizar valor de Encaixe
  const handleEncaixeChange = (idx: number, value: string) => {
    // Permitir edição imediata se marcado por um cancelamento recente
    if (encaixeAllowEditRef.current[idx]) {
      setEncaixeValues(prevState => ({ ...prevState, [idx]: value }))
      // limpar a permissão depois do primeiro caractere
      encaixeAllowEditRef.current[idx] = false
      return
    }

    // Ignorar alterações iniciais vindas de spinner/scroll quando o campo estava vazio e o usuário não digitou
    const prev = encaixeValues[idx]
    const touchedNow = !!encaixeTouchedRef.current[idx] || !!encaixeTouched[idx]
    if ((prev === undefined || prev === '') && value !== '' && !touchedNow) {
      return
    }

    // Se usuario digitou e header não salvo, tente salvar automaticamente a partir do headerFields ou linha atual
    if (!headerId) {
      const row = searchResults[idx]
      ensureHeaderSaved(row?.parsed, idx)
    }

    setEncaixeValues(prevState => ({ ...prevState, [idx]: value }))
  }
  
  // Função para calcular valores
  // getEncaixeValue agora considera o valor local (input) e, se ausente, usa o valor parseado do arquivo
  const getEncaixeValue = (idx: number, parsedEncaixe?: string): number => {
    const val = encaixeValues[idx]
    if (val !== undefined && val !== '') {
      return parseFloat(val) || 0
    }
    if (parsedEncaixe !== undefined && parsedEncaixe !== '') {
      return parseFloat(parsedEncaixe) || 0
    }
    return 0
  }
  
  const calcDif = (idx: number, previsto: number, parsedEncaixe?: string): number => {
    const encaixe = getEncaixeValue(idx, parsedEncaixe)
    return encaixe - previsto
  }
  
  const calcPercent = (dif: number, previsto: number): number => {
    if (previsto === 0) return 0
    return (dif / previsto) * 100
  }
  
  const calcEconomia = (dif: number, preco: number): number => {
    return dif * preco
  }

  // Custom vertical tick renderer for X axis labels
  const VerticalTick = ({ x, y, payload }: any) => {
    // move tick labels slightly down and rotate for vertical rendering to avoid overlap with value labels
    const ty = y + 24
    return (
      <text x={x} y={ty} textAnchor="end" transform={`rotate(-90 ${x} ${ty})`} style={{ fontSize: 12 }}>
        {payload && payload.value}
      </text>
    )
  }

  // Tip label renderer for bar values (Modelos)
  const TipModelValueLabel = (props:any) => {
    const { x, y, width, height, value } = props
    if (value === undefined || value === null) return null
    const text = modelView === 'brl'
      ? Math.abs(value).toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })
      : `${Math.abs(Number(value)).toFixed(1)}%`
    const isPos = value > 0
    const px = x + (width ? width / 2 : 0)
    const absH = Math.abs(height || 0)
    const fontSize = 11
    // dynamic positive offset: small bars get labels pushed further down proportionally; large bars keep small offset
    const posOffset = absH < 80 ? Math.max(3, Math.round(absH * 0.2)) : 2
    const py = isPos ? (y + posOffset) : (y + 3)
    // textAnchor: for rotated -90deg text, 'start' makes text grow downward from anchor
    const anchor = 'start'
    return (
      <text
        x={px}
        y={py}
        fill="#fff"
        stroke="rgba(0,0,0,0.8)"
        strokeWidth={2}
        paintOrder="stroke"
        textAnchor={anchor}
        dominantBaseline="middle"
        transform={`rotate(-90 ${px} ${py})`}
        style={{ fontSize, fontWeight: 700 as any, pointerEvents: 'none' }}
      >
        {text}
      </text>
    )
  }

  // Tip label renderer for bar values (Materiais)
  const TipMaterialValueLabel = (props:any) => {
    const { x, y, width, height, value } = props
    if (value === undefined || value === null) return null
    const text = materialView === 'brl'
      ? Math.abs(value).toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })
      : `${Math.abs(Number(value)).toFixed(1)}%`
    const isPos = value > 0
    const px = x + (width ? width / 2 : 0)
    const fontSize = 11
    // dynamic positive offset: small bars get labels pushed further down proportionally; large bars keep small offset
    const posOffset = (Math.abs(height || 0) < 80) ? Math.max(3, Math.round(Math.abs(height || 0) * 0.2)) : 2
    const py = isPos ? (y + posOffset) : (y + 3)
    const anchor = 'start'
    return (
      <text
        x={px}
        y={py}
        fill="#fff"
        stroke="rgba(0,0,0,0.8)"
        strokeWidth={2}
        paintOrder="stroke"
        textAnchor={anchor}
        dominantBaseline="middle"
        transform={`rotate(-90 ${px} ${py})`}
        style={{ fontSize, fontWeight: 700 as any, pointerEvents: 'none' }}
      >
        {text}
      </text>
    )
  }

  // Salva o encaixe no banco (upsert) e foca o próximo input quando Enter for pressionado
  const saveEncaixeAndFocusNext = async (idx: number, row: any) => {
    // Não salvar se usuário não digitou nada ou não alterou o valor
    const currentInput = encaixeValues[idx]
    const prevInput = (row.parsed?.['Encaixe'] ?? '').toString()
    if (currentInput === undefined || String(currentInput).trim() === '') {
      // nada a salvar
      return
    }
    if (String(currentInput) === prevInput) {
      // se valor não mudou, apenas foca próximo (comportamento do Enter) e não salva
      const next = document.querySelector<HTMLInputElement>(`.encaixe-input[data-idx="${idx + 1}"]`)
      if (next) next.focus()
      return
    }

    const valStr = currentInput
    const val = parseFloat(String(valStr).replace(',', '.')) || 0

    // Verificação percentual: se diferir >= 30% do Previsto, pedir confirmação
    const previstoNum = parseFloat(row.parsed?.['Previsto'] || '0') || 0
    if (previstoNum > 0) {
      const difCheck = val - previstoNum
      const pct = Math.abs(difCheck) / previstoNum
      if (pct >= 0.3) {
        const dir = val > previstoNum ? 'maior' : 'menor'
        const ok = await askConfirm(`Valor de Encaixe (${val.toFixed(2)}) é ${(pct * 100).toFixed(1)}% ${dir} que o Previsto (${previstoNum.toFixed(2)}). Deseja confirmar?`)
        if (!ok) {
          // reverter o valor visível para o anterior e bloquear temporariamente a edição
          const prevStr = prevInput !== undefined && prevInput !== null ? String(prevInput) : ''

          setEncaixeValues(prevState => ({ ...prevState, [idx]: prevStr }))
          setSearchResults(prevSR => {
            const updatedSR = [...prevSR]
            updatedSR[idx] = {
              ...row,
              parsed: {
                ...row.parsed,
                'Encaixe': prevStr,
              }
            }
            return updatedSR
          })

          const now = Date.now()
          setEncaixeLocked(prev => ({ ...prev, [idx]: true }))
          encaixeLockedRef.current[idx] = true
          encaixeLockedAtRef.current[idx] = now

          toast({ title: 'Alteração cancelada', description: 'Encaixe não foi alterado — campo liberado em instantes' })

          // fallback para liberar quando o timer rodar normalmente
          setTimeout(() => {
            unlockEncaixeIndex(idx)
          }, LOCK_DURATION_MS)

          return
        }
      }
    }

    // Ensure header is saved (try to create automatically using headerFields or row data)
    let headerToUse = headerId
    if (!headerToUse) {
      const created = await ensureHeaderSaved(row.parsed, idx)
      if (created) headerToUse = created
    }

    const payload = {
      // Preferir a data definida no cabeçalho (field `data`) quando disponível — converte para ISO para armazenamento
      Data: headerFields.data ? formatDisplayToISO(headerFields.data) : (row.parsed?.['Data'] || row.parsed?.['DATA FASE'] || null),
      Artigo: row.parsed?.['Artigo'] || null,
      Ordem: row.parsed?.['Ordem'] || null,
      Modelo: row.parsed?.['Modelo'] || null,
      Material: row.parsed?.['Material'] || null,
      'Cor/Espessura': row.parsed?.['Cor/Espessura'] || null,
      'PREÇO': parseFloat(row.parsed?.['PREÇO'] || '0') || 0,
      Previsto: parseFloat(row.parsed?.['Previsto'] || '0') || 0,
      Encaixe: val,
      header_id: headerToUse || null,
    }

    try {
      const res = await (window as any).api.economia.upsertEncaixe(payload)
      if (!res || !res.success) throw new Error(res?.error || 'Erro ao salvar')

      // Atualizar UI localmente (dif, % e manter encaixe exibido)
      const updated = [...searchResults]
      const previsto = parseFloat(row.parsed?.['Previsto'] || '0') || 0
      const dif = val - previsto
      const perc = previsto !== 0 ? (dif / previsto) * 100 : 0
      updated[idx] = {
        ...row,
        parsed: {
          ...row.parsed,
          'Encaixe': val.toFixed(2),
          'Dif': dif.toFixed(2),
          '%': perc.toFixed(1),
        },
      }
      setSearchResults(updated)

      // Marcar campo como não tocado após salvar (state + ref)
      setEncaixeTouched(prev => ({ ...prev, [idx]: false }))
      encaixeTouchedRef.current[idx] = false

      // Refresh do banco e das tabelas dependentes
      try {
        const all = await (window as any).api.economia.list(1000)
        if (Array.isArray(all)) {
          setRows(all)
          setBancoRows(all)
        }
      } catch (e) {
        console.warn('Não foi possível atualizar listagem do banco automaticamente', e)
      }

      // feedback visual
      toast({ title: 'Encaixe salvo', description: `Linha ${idx + 1} atualizada` })

      // foco no próximo input (se existir)
      const next = document.querySelector<HTMLInputElement>(`.encaixe-input[data-idx="${idx + 1}"]`)
      if (next) next.focus()
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: String(err) })
      console.error(err)
    }
  }

  // Função para buscar nos arquivos CGC e OFCC (fallback)
  const handleSearchCGC = async () => {
    if (!cgcFilePath && !ofccFilePath) {
      alert('Caminho dos arquivos CGC/OFCC não configurado! Vá em Configurações para definir.')
      return
    }
    if (!searchTerm.trim()) {
      alert('Digite o número da OF para buscar!')
      return
    }
    setSearchLoading(true)
    setSearchedInFile('')
    try {
      // PRIMEIRO: Consultar banco de dados para verificar se essa OF já foi processada
      let existingDbRows: any[] = []
      try {
        existingDbRows = await (window as any).api.economia.byOrdem(searchTerm.trim()) || []
      } catch (dbErr) {
        console.log('Erro ao consultar banco para OF existente:', dbErr)
        existingDbRows = []
      }
      
      // Criar mapa de (material + cor_espessura) -> dados salvos no banco (para preencher Encaixe)
      // Usando chave composta para evitar conflitos quando mesmo material tem cores diferentes
      const dbRowsByKey: Record<string, any> = {}
      existingDbRows.forEach((dbRow: any) => {
        // Usar material + cor_espessura como chave composta para identificação única
        const key = `${dbRow.material || ''}|${dbRow.cor_espessura || ''}`
        dbRowsByKey[key] = dbRow
      })
      
      // Agora buscar no CGC.txt
      let result: any = null
      let usedFile = ''
      
      if (cgcFilePath) {
        result = await (window as any).api.economia.searchCGC(cgcFilePath, searchTerm)
        usedFile = cgcFilePath.split(/[/\\]/).pop() || 'CGC.txt'
      }
      
      // Se não encontrou resultados no CGC ou houve erro, tentar no OFCC.txt
      if ((!result || result.error || !result.results || result.results.length === 0) && ofccFilePath) {
        console.log('Não encontrado no CGC, buscando no OFCC...')
        result = await (window as any).api.economia.searchCGC(ofccFilePath, searchTerm)
        usedFile = ofccFilePath.split(/[/\\]/).pop() || 'OFCC.txt'
      }
      
      setSearchedInFile(usedFile)
      
      if (!result || result.error) {
        console.error('Erro na busca:', result?.error || 'Nenhum resultado')
        setSearchResults([])
      } else if (!result.results || result.results.length === 0) {
        setSearchResults([])
      } else {
        // Converter para o formato esperado pela tabela
        const currentPeriod = `${new Date().getFullYear()}/${String(new Date().getMonth()+1).padStart(2,'0')}`
        const formattedResults = result.results.map((r: any, idx: number) => {
          // Verificar se existe dados salvos no banco usando chave composta (material + cor_espessura)
          const key = `${r.material || ''}|${r.cor_espessura || ''}`
          const savedData = dbRowsByKey[key]
          
          return {
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
              // Se existe no banco, usar o valor salvo de Encaixe; senão usar o do arquivo
              'Encaixe': savedData?.encaixe?.toString() || r.encaixe?.toString() || '',
              'Dif': savedData?.dif?.toString() || r.dif?.toString() || '',
              '%': savedData?.porcent?.toString() || r.porcent?.toString() || '',
              'Economia (R$)': '',
              'Periodo (Ano/Mês)': currentPeriod ?? `${r.data.split('-')[0]}/${r.data.split('-')[1]}`,
              // Flag para indicar se veio do banco
              '_fromDb': !!savedData,
              '_dbId': savedData?.id
            }
          }
        })
        setSearchResults(formattedResults)

        // make sure the results container is scrolled to top and the first row is padded so it's visible below the sticky header
        requestAnimationFrame(() => {
          const cont = document.querySelector<HTMLDivElement>(".busca-table-container")
          if (!cont) return

          // scroll to top
          cont.scrollTop = 0

          // compute heights of header areas above the table (controls + status + optional sticky header)
          const controls = document.querySelector<HTMLDivElement>('.busca-controls')
          const status = document.querySelector<HTMLDivElement>('.busca-status-bar')
          const controlsH = Math.ceil(controls?.getBoundingClientRect().height || 0)
          const statusH = Math.ceil(status?.getBoundingClientRect().height || 0)

          // Compute raw offset (controls + status) and add small gap.
          // We intentionally do NOT include the table's own sticky thead height here
          // because the thead is positioned inside the scroll container.
          const rawOffset = controlsH + statusH + 8

          // Clamp to a sane maximum to avoid very large empty gaps on small viewports
          // Reduced MAX_SPACER to keep the header closer to the controls and avoid large empty areas
          const MAX_SPACER = 32
          const totalOffset = Math.min(rawOffset, MAX_SPACER)

          // create or update a spacer element above the table so the header/status doesn't overlap rows
          let spacer = cont.querySelector<HTMLDivElement>('.busca-table-spacer')
          if (!spacer) {
            spacer = document.createElement('div')
            spacer.className = 'busca-table-spacer'
            cont.insertBefore(spacer, cont.firstChild)
          }
          spacer.style.height = `${totalOffset}px`

          // clear any inline padding applied previously to first row cells (we rely on spacer now)
          const firstCells = Array.from(cont.querySelectorAll('tbody tr:first-child td')) as HTMLTableCellElement[]
          firstCells.forEach(c => { c.style.paddingTop = '' })
        })

        // Atualizar filtros de período com os períodos presentes nos resultados (ex.: 2026/01)
        const srPeriods = Array.from(new Set(formattedResults.map(fr => fr.parsed?.['Periodo (Ano/Mês)']).filter(Boolean) as string[])).filter((p)=>isValidPeriod(p)) as string[]
        if (srPeriods.length > 0) {
          // mesclar com os períodos já disponíveis e selecionar apenas os períodos dos resultados
          setAvailablePeriods(prev => Array.from(new Set([...prev, ...srPeriods])).filter((p)=>isValidPeriod(p)).sort().reverse() as string[])
          setSelectedPeriods(srPeriods)
        }

        // Prefill local Encaixe inputs with parsed Encaixe when available
        const initialEncaixe: Record<number,string> = {}
        formattedResults.forEach((fr, i) => { initialEncaixe[i] = fr.parsed?.['Encaixe'] || '' })
        setEncaixeValues(initialEncaixe)

        // Prefill header fields from first result (Data Fase, Modelo, Data, Período)
        // NOTE: overwrite previous header values so each search reflects the file's metadata
        if (formattedResults.length > 0) {
          const first = formattedResults[0].parsed || {}
          const derivedPeriodo = first['Periodo (Ano/Mês)'] || getPeriodFromDateString(first['Data'] || first['DATA FASE'] || '')
          setHeaderFields({
            dataFase: formatISOToDisplay(first['DATA FASE'] || first['Data'] || '') || getTodayDisplay(),
            modelo: first['Modelo'] || '',
            artigo: first['Artigo'] || '',
            // Always use today's date for `data` when populating from a search result
            data: getTodayDisplay(),
            periodo: derivedPeriodo || getTodayPeriod()
          })
          setHeaderId(null)
          // Tentar focar o primeiro input de `Encaixe` assim que os resultados forem renderizados.
          // Usamos dupla requestAnimationFrame para esperar o render/commit do React e um pequeno
          // fallback com setTimeout caso o layout precise de mais tempo.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              try {
                const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.encaixe-input')) as HTMLInputElement[]
                const firstEnabled = inputs.find(i => !i.disabled)
                if (firstEnabled) {
                  firstEnabled.focus()
                  if (typeof firstEnabled.select === 'function') firstEnabled.select()
                  firstEnabled.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  return
                }
              } catch (e) {
                console.warn('Erro ao focar input de encaixe (rAF):', e)
              }
              // fallback: tentar após 50ms
              setTimeout(() => {
                try {
                  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.encaixe-input')) as HTMLInputElement[]
                  const firstEnabled = inputs.find(i => !i.disabled)
                  if (firstEnabled) {
                    firstEnabled.focus()
                    if (typeof firstEnabled.select === 'function') firstEnabled.select()
                    firstEnabled.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                } catch (e) {
                  console.warn('Erro ao focar input de encaixe (fallback):', e)
                }
              }, 50)
            })
          })
        }
      }
    } catch (err) {
      console.error('Erro ao buscar:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Salva cabeçalho (insere economia_headers e guarda id)
  // Manual save/clear removed — header is saved automatically when user starts editing Encaixe

  // Ensure header is saved (create automatically) — uses headerFields if present otherwise tries to build from rowParsed
  const ensureHeaderSaved = async (rowParsed?: Record<string,string>, idx?: number) => {
    if (headerId) return headerId

    // If there's already an in-flight promise for this idx, await it
    if (idx !== undefined && headerSavedPromiseRef.current[idx]) {
      return await headerSavedPromiseRef.current[idx]
    }

    const maybe = {
      dataFase: headerFields.dataFase || rowParsed?.['DATA FASE'] || rowParsed?.['Data'] || '',
      modelo: headerFields.modelo || rowParsed?.['Modelo'] || '',
      artigo: headerFields.artigo || rowParsed?.['Artigo'] || '',
      data: headerFields.data || rowParsed?.['Data'] || '',
      periodo: headerFields.periodo || rowParsed?.['Periodo (Ano/Mês)'] || getPeriodFromDateString(rowParsed?.['Data'] || rowParsed?.['DATA FASE'] || '') || getTodayPeriod()
    }

    // if nothing to save, don't create
    if (!maybe.dataFase && !maybe.modelo && !maybe.data && !maybe.periodo) return null

    const p = (async () => {
      try {
        // convert display date (DD-MM-YYYY) to ISO (YYYY-MM-DD) for storage
        const toInsert = { ...maybe, data: formatDisplayToISO(maybe.data) }
        const res = await (window as any).api.economia.insertHeader(toInsert)
        if (res && res.result && res.result.id) {
          setHeaderId(res.result.id)
          // merge only non-empty values so we don't overwrite user's defaults with empty strings
          const toApply: Record<string,string> = {}
          Object.entries(maybe).forEach(([k,v]) => { if (v !== undefined && v !== null && String(v).trim() !== '') (toApply as any)[k] = v })
          setHeaderFields(prev => ({ ...prev, ...toApply }))
          toast({ title: 'Cabeçalho criado automaticamente', description: `ID ${res.result.id}` })
          return res.result.id
        }
      } catch (e) {
        console.warn('Erro ao criar cabeçalho automaticamente', e)
      }
      return null
    })()

    if (idx !== undefined) headerSavedPromiseRef.current[idx] = p
    const id = await p
    if (idx !== undefined) delete headerSavedPromiseRef.current[idx]
    return id
  }

  // Função para carregar dados do dashboard
  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [list, sum, modelos, materiais] = await Promise.all([
        (window as any).api.economia.list(1000),
        (window as any).api.economia.summary(),
        (window as any).api.economia.byModelo(12),
        (window as any).api.economia.byMaterial(12),
      ])

      console.log('[DEBUG] economia summary (backend):', sum)
      console.log('[DEBUG] economia list length:', Array.isArray(list) ? list.length : 0)
      setRows(Array.isArray(list) ? list : [])
      setSummary(sum || { totalDif: 0, ordemCount: 0, avgDif: 0, totalEconomiaAll: sum?.totalEconomiaAll ?? 0, totalEconomiaPos: sum?.totalEconomiaPos ?? 0, totalEconomiaNeg: sum?.totalEconomiaNeg ?? 0 })
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
            if (isValidPeriod(p)) periodsSet.add(p)
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
      setLoading(false)
    }
  }

  // Carrega dados iniciais
  useEffect(() => {
    loadDashboardData()
  }, [])

  // Recarrega dados quando volta para a aba dashboard
  useEffect(() => {
    if (tab === 'dashboard') {
      loadDashboardData()
    }
  }, [tab])

  // Apply filters client-side and recompute aggregates
  const applyFilters = () => {
    // helper to derive period YYYY/MM from banco row (supports header_periodo fallback)
    const getRowPeriod = (r:any) => {
      const hp = r.header_periodo || r.header_periodo === 0 ? String(r.header_periodo) : ''
      if (hp) {
        const m = /^(\d{4})\/(\d{1,2})$/.exec(hp.trim())
        if (m) return `${m[1]}/${m[2].padStart(2,'0')}`
        if (isValidPeriod(hp.trim())) return hp.trim()
      }
      if (r.data) {
        try {
          const dt = new Date(r.data)
          return `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}`
        } catch (e) {}
      }
      return ''
    }

    const filtered = rows.filter((r:any) => {
      let okPeriod = true
      let okModel = true
      // If there are period filters but none selected, treat as 'no period selected' => exclude all rows
      if (selectedPeriods && selectedPeriods.length === 0) {
        okPeriod = false
      } else if (selectedPeriods && selectedPeriods.length > 0) {
        const p = getRowPeriod(r)
        okPeriod = p ? selectedPeriods.includes(p) : false
      }
      if (selectedModels && selectedModels.length > 0) {
        okModel = selectedModels.includes(r.modelo)
      }
      return okPeriod && okModel
    })

    // summary: totalDif, ordemCount (distinct), avgDif per order
    const totalDif = filtered.reduce((s:any,r:any)=>s + (Number(r.dif)||0), 0)
    // totals over filtered rows (not overwriting backend totals returned by economia.summary())
    const filteredTotalEconomiaAll = filtered.reduce((s:any,r:any)=> s + ((Number(r.dif)||0) * (Number(r.preco)||0)), 0)
    const filteredTotalEconomiaPos = filtered.reduce((s:any,r:any)=> { const e = (Number(r.dif)||0) * (Number(r.preco)||0); return s + (e > 0 ? e : 0) }, 0)
    const filteredTotalEconomiaNeg = filtered.reduce((s:any,r:any)=> { const e = (Number(r.dif)||0) * (Number(r.preco)||0); return s + (e < 0 ? e : 0) }, 0)
    const ordSet = new Set(filtered.map((r:any)=>r.ordem))
    const ordemCount = ordSet.size
    const avgDif = ordemCount > 0 ? totalDif / ordemCount : 0
    console.log('[DEBUG] applyFilters (filtered totals):', { filteredTotalEconomiaAll, filteredTotalEconomiaPos, filteredTotalEconomiaNeg })
    setSummary(prev => ({ ...(prev || {}), totalDif, ordemCount, avgDif, filteredTotalEconomiaAll, filteredTotalEconomiaPos, filteredTotalEconomiaNeg }))

    // byModelo and byMaterial from filtered
    // accumulate dif, previsto and economia (dif * preco)
    const modeloMap = new Map<string,{ totalDif:number, totalPrev:number, totalEcon:number }>()
    const materialMap = new Map<string,{ totalDif:number, totalPrev:number, totalEcon:number }>()
    filtered.forEach((r:any)=>{
      const m = r.modelo || 'N/A'
      const mat = r.material || 'N/A'
      const dif = Number(r.dif)||0
      const prev = Number(r.previsto)||0
      const econ = dif * (Number(r.preco)||0)

      const cur = modeloMap.get(m) || { totalDif: 0, totalPrev: 0, totalEcon: 0 }
      modeloMap.set(m, { totalDif: cur.totalDif + dif, totalPrev: cur.totalPrev + prev, totalEcon: cur.totalEcon + econ })

      const cm = materialMap.get(mat) || { totalDif: 0, totalPrev: 0, totalEcon: 0 }
      materialMap.set(mat, { totalDif: cm.totalDif + dif, totalPrev: cm.totalPrev + prev, totalEcon: cm.totalEcon + econ })
    })

    // convert to arrays and split negative/positive based on totalDif (performance direction)
    const allModels = Array.from(modeloMap.entries()).map(([name,totals])=>({ name, totalDif: totals.totalDif, totalPrev: totals.totalPrev, totalEcon: totals.totalEcon }))
    const bm = allModels.filter(item => item.totalDif < 0).sort((a,b)=>Math.abs(b.totalDif)-Math.abs(a.totalDif)).slice(0,20)
    const bmPos = allModels.filter(item => item.totalDif > 0).sort((a,b)=>Math.abs(b.totalDif)-Math.abs(a.totalDif)).slice(0,20)

    const allMaterials = Array.from(materialMap.entries()).map(([name, totals]) => ({ name, totalDif: totals.totalDif, totalPrev: totals.totalPrev, totalEcon: totals.totalEcon }))
    const bmat = allMaterials.filter(item => item.totalDif < 0).slice(0)
    const bmatPos = allMaterials.filter(item => item.totalDif > 0).slice(0)

    // when sorting for BRL use absolute totalEcon; when sorting for pct we'll sort later when building chart data
    bmat.sort((a,b)=>Math.abs(b.totalEcon)-Math.abs(a.totalEcon))
    bmat.splice(20)
    bmatPos.sort((a,b)=>Math.abs(b.totalEcon)-Math.abs(a.totalEcon))
    bmatPos.splice(20)

    setByModelo(bm)
    setByModeloPos(bmPos)
    setByMaterial(bmat)
    setByMaterialPos(bmatPos)
  }

  // rerun applyFilters when rows or selections change
  useEffect(()=>{ applyFilters() }, [rows, selectedPeriods, selectedModels])

  // Fetch persisted economia rows for the "Banco de Dados" tab
  const fetchBancoRows = async () => {
    setBancoLoading(true)
    try {
      const res = await (window as any).api.economia.list(1000)
      if (Array.isArray(res)) setBancoRows(res)
    } catch (err) {
      console.error('Erro ao carregar banco de dados (economia):', err)
      setBancoRows([])
    } finally {
      setBancoLoading(false)
    }
  }

  // Export current banco rows as CSV (opens save dialog)
  const exportBancoCsv = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await (window as any).api.economia.exportCSV()
      if (res && res.success) {
        toast({ title: 'Exportado', description: `Arquivo salvo: ${res.path}` })
      } else if (res && res.canceled) {
        // usuário cancelou
      } else {
        toast({ title: 'Erro', description: String(res?.error || 'Não foi possível exportar') })
      }
    } catch (e) {
      toast({ title: 'Erro', description: String(e) })
    } finally {
      setExporting(false)
    }
  }

  // Export current banco rows as XLSX (opens save dialog)
  const exportBancoXlsx = async () => {
    if (exportingXlsx) return
    setExportingXlsx(true)
    try {
      const res = await (window as any).api.economia.exportXLSX()
      if (res && res.success) {
        toast({ title: 'Exportado', description: `Arquivo salvo: ${res.path}` })
      } else if (res && res.canceled) {
        // usuário cancelou
      } else {
        toast({ title: 'Erro', description: String(res?.error || 'Não foi possível exportar') })
      }
    } catch (e) {
      toast({ title: 'Erro', description: String(e) })
    } finally {
      setExportingXlsx(false)
    }
  }

  // clear any inline padding applied to first row when there are no search results
  useEffect(() => {
    if (searchResults.length === 0) {
      requestAnimationFrame(() => {
        const cont = document.querySelector<HTMLDivElement>(".busca-table-container")
        if (!cont) return
        // remove spacer if present
        const spacer = cont.querySelector<HTMLDivElement>('.busca-table-spacer')
        if (spacer) spacer.remove()
        const firstCells = Array.from(cont.querySelectorAll('tbody tr:first-child td')) as HTMLTableCellElement[]
        firstCells.forEach(c => { c.style.paddingTop = '' })
      })
    }
  }, [searchResults.length])

  // Fetch banco rows when user opens the Banco tab
  useEffect(() => {
    if (tab === 'banco') fetchBancoRows()
  }, [tab])

  // derived model counters (use POSITIVE dif = excesso/red for the dashboard cards)
  const modelCountNeg = byModeloPos ? byModeloPos.length : 0
  // total monetary impact across positive models (soma absoluta de totalEcon)
  const modelTotalNeg = (byModeloPos || []).reduce((s:any,i:any)=>s + Math.abs(Number(i.totalEcon)||0),0)

  // derived material counters (use POSITIVE dif = excesso/red for the dashboard cards)
  const materialCountNeg = byMaterialPos ? byMaterialPos.length : 0
  const materialTotalNeg = (byMaterialPos || []).reduce((s:any,i:any)=>s + Math.abs(Number(i.totalEcon)||0),0)

  return (
    <div className={`space-y-6 ${highContrast ? 'high-contrast' : ''}`}>
      <PageHeader
        title="Economia Dashboard"
        description="Corte - Economia de Encaixe"
        logo={images.logo}
        action={(
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <input type="checkbox" checked={highContrast} onChange={(e)=>setHighContrast(e.target.checked)} />
              <span>Alto contraste</span>
            </label>
            <small style={{ color: 'var(--ev-c-text-2)', fontSize: 12 }}>Alterna texto escuro / fundo claro</small>
          </div>
        )}
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
            <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-[#488fce] rounded-2xl flex flex-row justify-center items-center gap-10 px-10 py-6 text-white" style={{ minWidth: 360, maxWidth: 720, whiteSpace: 'nowrap' }}>
              <div className="card-icon"><span className="text-5xl md:text-6xl whitespace-nowrap">R$</span></div>
              <div className="value text-3xl md:text-4xl lg:text-4xl font-extrabold whitespace-nowrap" title="Soma de (dif × preco) sobre as linhas filtradas">{summary ? (Number(summary.totalEconomiaAll ?? summary.totalEconomia ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '0,00'}</div>
            </div>
            <div className="card-stats-economia">
              <div className="card-icon"><img src={shoeIcon} alt="modelos" className="rolls-icon"/></div>
              <div className="label">Modelos (performance negativa)</div>
              <div className="value">{modelCountNeg}</div>
            </div>
            <div className="card-stats-economia">
              <div className="card-icon"><img src={shoeIcon} alt="valor-modelos" className="rolls-icon fill-red-700"/></div>
              <div className="label">Valor Modelos (performance negativa)</div>
              <div className="value">{modelTotalNeg.toLocaleString(undefined, { style: 'currency', currency: 'BRL' })}</div>
            </div>

            <div className="card-stats-economia">
              <div className="card-icon"><img src={matirialIcon} alt="materias" className="rolls-icon fill-red-700"/></div>
              <div className="label">Materiais (performance negativa)</div>
              <div className="value">{materialCountNeg}</div>
            </div>

            {/* Matérias: soma dos valores com performance negativa (R$) */}
            <div className="card-stats-economia">
              <div className="card-icon"><img src={matirialIcon} alt="materias" className="rolls-icon fill-red-700"/></div>
              <div className="label">Valor Materiais (performance negativa)</div>
              <div className="value">{materialTotalNeg.toLocaleString(undefined, { style: 'currency', currency: 'BRL' })}</div>
            </div>

          </div>

          <div className="economia-charts-container">
            <div className="economia-filters">
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:12}}>
                <h3 className="font-semibold mb-2 filter-title">FILTROS</h3>
              </div> 
              <div className="mb-3" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,width:'100%'}}>
                <div style={{display:'flex',flexDirection:'column',gap:6,width:'100%'}}>
                  <div className="font-medium">Período</div>
                  <div className="h-44 overflow-auto border rounded mt-2 p-2 filter-box periodo-list">
                  {availablePeriods.map(p=> (
                    <label key={p} className="block text-sm period-row">
                      <input type="checkbox" checked={selectedPeriods.includes(p)} onChange={(e)=>{
                        if (e.target.checked) setSelectedPeriods(s=>Array.from(new Set([...s,p])))
                        else setSelectedPeriods(s=>s.filter(x=>x!==p))
                      }} /> <span className="ml-2 period-text">{p}</span>
                    </label>
                  ))}
                </div>

                {/* Alto contraste moved to header */}
                </div>
                {/* local buttons removed — moved to top for better layout */}
              </div>
              <div>
                <div className="font-medium">Modelo</div>
                <div className="h-44 overflow-auto border rounded mt-2 p-2 filter-box">
                  {availableModels.map(m=> (
                    <label key={m} className="block text-sm">
                      <input type="checkbox" checked={selectedModels.includes(m)} onChange={(e)=>{
                        if (e.target.checked) setSelectedModels(s=>Array.from(new Set([...s,m])))
                        else setSelectedModels(s=>s.filter(x=>x!==m))
                      }} /> <span className="ml-2">{m}</span>
                    </label>
                  ))}
                </div>
                {/* local buttons removed — moved to top for better layout */}
              </div>
            </div>
            <div className="charts-right">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold mb-2">Modelos - Performance Negativa</h3>
                  <div className="flex items-center space-x-2">
                    <button className={`px-2 py-1 text-sm rounded ${modelView==='brl' ? 'bg-blue-600 text-white' : 'bg-transparent border'}`} onClick={()=>setModelView('brl')} title="R$: soma absoluta do excesso por modelo (impacto financeiro)">R$</button>
                    <button className={`px-2 py-1 text-sm rounded ${modelView==='pct' ? 'bg-blue-600 text-white' : 'bg-transparent border'}`} onClick={()=>setModelView('pct')} title="%: excesso relativo ao previsto = (sum(dif)/sum(previsto))*100">%</button>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" min={0} max={10000} step={50} value={modelYMaxOverride ?? ''} onChange={(e)=>setModelYMaxFromInput(e.target.value)} placeholder="Auto" style={{ width: 90, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--color-border)' }} title="Máximo Y (0 = auto, 1-10000)" />
                      <button className="busca-btn busca-btn-ghost" onClick={()=>{ setModelYMaxOverride(null); try { localStorage.removeItem('economia:modelYMax') } catch(e){} }} title="Auto">Auto</button>
                    </div>
                  </div>
                </div>
                {byModelo && (byModelo.length > 0 || (byModeloPos && byModeloPos.length>0)) && chartsReady ? (
                  <ChartContainer config={{ total: { color: '#10b981' } }} className="h-[600px] aspect-auto">
                      {(() => {
                        // Prioritize RED items and limit total bars to maxItems (10)
                        const pos = (byModeloPos || []) // excesso (totalDif > 0) — prioritized
                        const neg = (byModelo || []) // economia (totalDif < 0)
                        const buildValue = (item:any) => {
                          const dif = Number(item.totalDif)||0
                          const prev = Number(item.totalPrev)||0
                          const econ = Number(item.totalEcon)||0
                          if (modelView === 'brl') return Math.abs(econ)
                          return prev === 0 ? 0 : Math.abs((dif / prev) * 100)
                        }
                        // RED items -> positive values
                        const posData = pos
                          .map((p:any) => ({ name: p.name, value: buildValue(p), sign: 'pos' }))
                          // maior -> menor em módulo (excesso) à esquerda
                          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                        // GREEN items -> negative values
                        const negData = neg
                          .map((n:any) => ({ name: n.name, value: -buildValue(n), sign: 'neg' }))
                          // menor -> maior em módulo (economia) à direita
                          .sort((a, b) => Math.abs(a.value) - Math.abs(b.value))
                        // Compose final dataset: limit total to maxItems (10) prioritizing REDs; if fewer REDs, fill with top GREENs until maxItems
                        const maxItems = 10
                        let sortedData:any[] = []
                        if (posData.length >= maxItems) {
                          sortedData = posData.slice(0, maxItems)
                        } else {
                          const remaining = maxItems - posData.length
                          const greensToTake = negData.slice(0, remaining)
                          sortedData = [...posData, ...greensToTake]
                        }
                        if (sortedData.length === 0) return <div className="chart-placeholder">Sem dados para exibir</div>
                        // compute symmetric Y axis domain based on max absolute value and add a small margin
                        const maxAbs = sortedData.length ? Math.max(...sortedData.map((s:any)=>Math.abs(s.value))) : 0
                        const multiplier = maxAbs < 1000 ? 1.5 : 1.15
                        const roundUpNice = (v:number) => (v < 1000 ? Math.ceil(v / 50) * 50 : Math.ceil(v / 100) * 100)
                        let computedMax = Math.ceil(maxAbs * multiplier)
                        computedMax = roundUpNice(computedMax)
                        // apply manual override when set (value between 1 and 10000). null = auto
                        const override = (typeof modelYMaxOverride === 'number' && modelYMaxOverride > 0) ? Math.min(10000, Math.max(1, modelYMaxOverride)) : null
                        const activeMax = override ?? computedMax
                        const yMax = Math.max(activeMax, Math.ceil(maxAbs))
                        return (
                          <BarChart data={sortedData} margin={{ left: 20, right: 20, top: 16, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" type="category" interval={0} tick={VerticalTick} height={200} />
                            <YAxis type="number" domain={[ -yMax, yMax ]} tickFormatter={(v:any) => modelView === 'brl' ? Math.abs(Number(v)).toLocaleString(undefined,{ style: 'currency', currency: 'BRL' }) : `${Math.abs(Number(v)).toFixed(1)}%`} />
                            <Tooltip formatter={(value: number | undefined) => {
                              if (value === undefined || value === null) return ''
                              return modelView === 'brl' 
                                ? Math.abs(value).toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })
                                : `${Math.abs(Number(value)).toFixed(1)}%`
                            }} />
                            <Bar dataKey="value">
                              {sortedData.map((entry:any, idx:number) => (
                                <Cell key={`c-${idx}`} fill={entry.sign==='neg' ? '#10b981' : '#ef4444'} />
                              ))}
                              <LabelList dataKey="value" content={TipModelValueLabel} />
                            </Bar>
                          </BarChart>
                        )
                      })()}
                  </ChartContainer>
                ) : (
                  <div className="chart-placeholder">Sem dados para exibir</div>
                )}
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold mb-2">Materiais - Performance Negativa</h3>
                  <div className="flex items-center space-x-2">
                    <button className={`px-2 py-1 text-sm rounded ${materialView==='brl' ? 'bg-red-600 text-white' : 'bg-transparent border'}`} onClick={()=>setMaterialView('brl')} title="R$: soma absoluta do excesso por material (impacto financeiro)">R$</button>
                    <button className={`px-2 py-1 text-sm rounded ${materialView==='pct' ? 'bg-red-600 text-white' : 'bg-transparent border'}`} onClick={()=>setMaterialView('pct')} title="%: excesso relativo ao previsto = (sum(dif)/sum(previsto))*100">%</button>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" min={0} max={10000} step={50} value={materialYMaxOverride ?? ''} onChange={(e)=>setMaterialYMaxFromInput(e.target.value)} placeholder="Auto" style={{ width: 90, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--color-border)' }} title="Máximo Y (0 = auto, 1-10000)" />
                      <button className="busca-btn busca-btn-ghost" onClick={()=>{ setMaterialYMaxOverride(null); try { localStorage.removeItem('economia:materialYMax') } catch(e){} }} title="Auto">Auto</button>
                    </div>
                  </div>
                </div>
                {byMaterial && (byMaterial.length > 0) && chartsReady ? (
                  <ChartContainer config={{ total: { color: '#10b981' } }} className="h-[600px] aspect-auto">
                      {(() => {
                        // For materials: prioritize RED items (excesso) — show up to 15 red items; if fewer, append ALL greens (no limit)
                        const pos = (byMaterialPos || []) // excesso (totalDif > 0) — prioritized
                        const neg = (byMaterial || [])   // economia (totalDif < 0) — no fixed limit
                        const buildValue = (item:any) => {
                          const dif = Number(item.totalDif)||0
                          const prev = Number(item.totalPrev)||0
                          const econ = Number(item.totalEcon)||0
                          if (materialView === 'brl') return Math.abs(econ)
                          return prev === 0 ? 0 : Math.abs((dif / prev) * 100)
                        }
                        // BAD items (excesso, totalDif > 0) -> red, keep as positive values
                        const posData = pos
                          .map((p:any) => ({ name: p.name, value: buildValue(p), sign: 'pos' }))
                          // maior -> menor em módulo (excesso) à esquerda
                          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                        // GOOD items (economia, totalDif < 0) -> green, keep as negative values
                        const negData = neg
                          .map((n:any) => ({ name: n.name, value: -buildValue(n), sign: 'neg' }))
                          // menor -> maior em módulo (economia) à direita
                          .sort((a, b) => Math.abs(a.value) - Math.abs(b.value))
                        // Compose final dataset: limit total to maxItems (15) prioritizing REDs; if fewer REDs, fill with top GREENs until maxItems
                        const maxItems = 15
                        let sortedData:any[] = []
                        if (posData.length >= maxItems) {
                          sortedData = posData.slice(0, maxItems)
                        } else {
                          const remaining = maxItems - posData.length
                          const greensToTake = negData.slice(0, remaining)
                          sortedData = [...posData, ...greensToTake]
                        }
                        if (sortedData.length === 0) return <div className="chart-placeholder">Sem dados para exibir</div>
                        // compute symmetric Y axis domain based on max absolute value and add a small margin
                        const maxAbs = sortedData.length ? Math.max(...sortedData.map((s:any)=>Math.abs(s.value))) : 0
                        const multiplier = maxAbs < 1000 ? 1.5 : 1.15
                        const roundUpNice = (v:number) => (v < 1000 ? Math.ceil(v / 50) * 50 : Math.ceil(v / 100) * 100)
                        let computedMax = Math.ceil(maxAbs * multiplier)
                        computedMax = roundUpNice(computedMax)
                        const override = (typeof materialYMaxOverride === 'number' && materialYMaxOverride > 0) ? Math.min(10000, Math.max(1, materialYMaxOverride)) : null
                        const activeMax = override ?? computedMax
                        const yMax = Math.max(activeMax, Math.ceil(maxAbs))
                        return (
                          <BarChart data={sortedData} margin={{ left: 20, right: 20, top: 16, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" type="category" interval={0} tick={VerticalTick} height={200} />
                            <YAxis type="number" domain={[ -yMax, yMax ]} tickFormatter={(v:any) => materialView === 'brl' ? Math.abs(Number(v)).toLocaleString(undefined,{ style: 'currency', currency: 'BRL' }) : `${Math.abs(Number(v)).toFixed(1)}%`} />
                            <Tooltip formatter={(value: number | undefined) => {
                              if (value === undefined || value === null) return ''
                              return materialView === 'brl'
                                ? Math.abs(value).toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })
                                : `${Math.abs(Number(value)).toFixed(1)}%`
                            }} />
                            <Bar dataKey="value">
                              {sortedData.map((entry:any, idx:number) => (
                                <Cell key={`c-m-${idx}`} fill={entry.sign==='neg' ? '#10b981' : '#ef4444'} />
                              ))}
                              <LabelList dataKey="value" content={TipMaterialValueLabel} />
                            </Bar>
                          </BarChart>
                        )
                      })()}
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
                    <TableHead>Economia (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10}>Carregando...</TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={10}>Nenhum registro</TableCell></TableRow>
                  ) : (
                    rows.slice(0, 200).map((r:any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.id}</TableCell>
                        <TableCell>{r.data ? formatISOToDisplay(r.data) : ''}</TableCell>
                        <TableCell>{r.artigo}</TableCell>
                        <TableCell>{r.ordem}</TableCell>
                        <TableCell>{r.modelo}</TableCell>
                        <TableCell>{r.material}</TableCell>
                        <TableCell>{r.encaixe?.toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>{r.previsto?.toLocaleString(undefined,{ style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>{r.dif != null ? Number(r.dif).toLocaleString('pt-BR',{ style: 'currency', currency: 'BRL' }) : '-'}</TableCell>
                        <TableCell>{(r.dif != null && r.preco != null) ? (Number(r.dif) * Number(r.preco)).toLocaleString('pt-BR',{ style: 'currency', currency: 'BRL' }) : '-'}</TableCell>
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
          <div className={`busca-controls ${searchResults && searchResults.length > 0 ? 'has-results' : ''}`} style={{alignItems:'flex-start', justifyContent:'space-between'}}>
            {/* Header box moved to the LEFT so it's visible before search */}
            <div className="busca-header-side">
              <div className="header-field">
                <label>Data Fase</label>
                <input className="header-input" value={headerFields.dataFase || ''} onChange={(e)=>setHeaderFields(h=>({ ...h, dataFase: e.target.value }))} placeholder="Ex: 2025-12-09" />
              </div>
              <div className="header-field">
                <label>Modelo</label>
                <input className="header-input" value={headerFields.modelo || ''} onChange={(e)=>setHeaderFields(h=>({ ...h, modelo: e.target.value }))} placeholder="Ex: Corte Corre" />
              </div>
              <div className="header-field">
                <label>Artigo</label>
                <input className="header-input" value={headerFields.artigo || ''} onChange={(e)=>setHeaderFields(h=>({ ...h, artigo: e.target.value }))} placeholder="Ex: COR43245330" />
              </div>
              <div className="header-field">
                <label>Data</label>
                <input className="header-input" value={headerFields.data || ''} onChange={(e)=>setHeaderFields(h=>({ ...h, data: e.target.value }))} placeholder="DD-MM-YYYY" />
              </div>
              <div className="header-field">
                <label>Período</label>
                <input className="header-input" value={headerFields.periodo || ''} onChange={(e)=>setHeaderFields(h=>({ ...h, periodo: e.target.value }))} placeholder="YYYY/MM" />
              </div>
              <div className="header-actions">
                {headerId ? <small style={{marginLeft:8}}>Cabeçalho ID: <strong>{headerId}</strong></small> : null}
              </div>
            </div>

            <div style={{display:'flex',gap:12,flex:1,justifyContent:'flex-end',alignItems:'center'}}>
              <div className="busca-input-group" style={{minWidth:220,maxWidth:420}}>
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
                {searchResults.length > 0 && (
                  <button 
                    className="busca-btn busca-btn-ghost" 
                    onClick={()=>{ setSearchResults([]); setSearchTerm(''); setSelectedPeriods(availablePeriods); setSearchedInFile('') }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="busca-status-bar">
            <div className="busca-status-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <span>
                {searchedInFile ? (
                  <>Encontrado em: <strong>{searchedInFile}</strong></>
                ) : (
                  <>Arquivos: {selectedFileName || 'CGC.txt'} → {ofccFilePath?.split(/[/\\]/).pop() || 'OFCC.txt'}</>
                )}
              </span>
            </div>
            <div className="busca-status-divider" />
            <div className="busca-status-item busca-status-results">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <span><strong>{searchResults.length}</strong> resultado(s) encontrado(s)</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="busca-results">
            {searchLoading ? (
              <div className="busca-loading">
                <svg className="busca-spinner-large" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Processando arquivos CGC / OFCC...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="busca-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <h3>Nenhum resultado</h3>
                <p>Selecione o arquivo CGC e digite o número da OF para buscar</p>
              </div>
                ) : (
                <div className="busca-table-container">
                  <table className="busca-table-pro">
                  <thead>
                    <tr>
                      <th className="col-num">#</th>
                      <th className="col-ordem">Ordem</th>
                      <th className="col-material">Material</th>
                      <th className="col-cor">Cor/Espessura</th>
                      <th className="col-preco">Preço</th>
                      <th className="col-previsto">Previsto</th>
                      <th className="col-encaixe">Encaixe</th>
                      <th className="col-dif">Dif</th>
                      <th className="col-percent">%</th>
                      <th className="col-economia">Economia</th> 
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((r, idx)=> {
                      const previsto = parseFloat(r.parsed?.['Previsto'] || '0') || 0
                      const preco = parseFloat(r.parsed?.['PREÇO'] || '0') || 0
                      const dif = calcDif(idx, previsto, r.parsed?.['Encaixe'])
                      const percent = calcPercent(dif, previsto)
                      const economia = calcEconomia(dif, preco)
                      
                      return (
                        <tr key={`${r.line}-${idx}`}>
                          <td className="col-num">{idx + 1}</td>
                          <td className="col-ordem">{r.parsed?.['Ordem'] || '-'}</td>
                          <td className="col-material">{r.parsed?.['Material'] || '-'}</td> 
                          <td className="col-cor">{r.parsed?.['Cor/Espessura'] || '-'}</td>
                          <td className="col-preco">{preco.toFixed(2)}</td>
                          <td className="col-previsto">{previsto.toFixed(2)}</td>
                          <td className="col-encaixe">
                            <input
                              type="number"
                              className={`encaixe-input ${encaixeLocked[idx] ? 'locked' : ''}`}
                              data-idx={idx}
                              value={encaixeValues[idx] ?? ''}
                              disabled={!!encaixeLocked[idx]}
                              onFocus={() => { tryUnlockEncaixeIndex(idx) }}
                              onChange={(e) => handleEncaixeChange(idx, e.target.value)}
                              onKeyDown={(e) => {
                                // Se estiver bloqueado, tentar desbloquear (evita delays por throttling); se ainda bloqueado, impedir entrada
                                if (encaixeLockedRef.current[idx]) {
                                  const unlocked = tryUnlockEncaixeIndex(idx)
                                  if (!unlocked) { e.preventDefault(); return }
                                }

                                // Navegação com setas: ArrowDown vai para próximo, ArrowUp vai para anterior
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault()
                                  const next = document.querySelector<HTMLInputElement>(`.encaixe-input[data-idx="${idx + 1}"]`)
                                  if (next) next.focus()
                                  return
                                }
                                if (e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  const prev = document.querySelector<HTMLInputElement>(`.encaixe-input[data-idx="${idx - 1}"]`)
                                  if (prev) prev.focus()
                                  return
                                }

                                // Marcar como "tocado" apenas quando o usuário de fato digita (números, vírgula, ponto, backspace, delete, sinal)
                                if (/^[0-9.,\-]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Delete') {
                                  setEncaixeTouched(prev => ({ ...prev, [idx]: true }))
                                  encaixeTouchedRef.current[idx] = true
                                }
                                if (e.key === 'Enter') { e.preventDefault(); saveEncaixeAndFocusNext(idx, r) }
                              }}
                              onPaste={() => { setEncaixeTouched(prev => ({ ...prev, [idx]: true })); encaixeTouchedRef.current[idx] = true }}
                              onBlur={() => {
                                // Se o próximo elemento focado for outro input de encaixe, não salvar imediatamente
                                const next = document.activeElement as HTMLElement | null
                                if (next && next.classList && next.classList.contains('encaixe-input')) {
                                  return
                                }
                                saveEncaixeAndFocusNext(idx, r)
                              }}
                              placeholder="0.00"
                              step="0.01"
                            />
                          </td>
                          <td className={`col-dif ${dif > 0 ? 'positive' : dif < 0 ? 'negative' : ''}`}>
                            {dif !== 0 ? dif.toFixed(2) : '-'}
                          </td>
                          <td className={`col-percent ${percent > 0 ? 'positive' : percent < 0 ? 'negative' : ''}`}>
                            {percent !== 0 ? `${percent.toFixed(1)}%` : '-'}
                          </td>
                          <td className={`col-economia ${economia > 0 ? 'positive' : economia < 0 ? 'negative' : ''}`}>
                            {economia !== 0 ? economia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                          </td>
                        </tr>
                      )
                    })}
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
          <div style={{marginTop: 18}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {permissions?.canRefreshBancoDados && !hideBancoButtons && (
                  <button className="busca-btn busca-btn-secondary" onClick={fetchBancoRows} disabled={bancoLoading}>Atualizar</button>
                )}
                {permissions?.canClearBancoDados && !hideBancoButtons && (
                  <button className="busca-btn busca-btn-ghost" onClick={async ()=>{ if (await askConfirm('Limpar todo o banco de economia?')) { await (window as any).api.economia.clear(); fetchBancoRows() } }}>Limpar banco</button>
                )}
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {permissions?.canSelectAllBancoDados && !hideBancoButtons && (
                  <button className="busca-btn" onClick={()=>{ setBancoSelected(filteredBancoRows.map(r=>r.id)); }}>Selecionar todos</button>
                )}
                {permissions?.canDeleteBancoDados && !hideBancoButtons && (
                  <button className="busca-btn busca-btn-ghost" onClick={async ()=>{
                    if (bancoSelected.length === 0) { alert('Nenhuma linha selecionada'); return }
                    if (!(await askConfirm(`Apagar ${bancoSelected.length} linha(s) selecionada(s)?`))) return
                    const res = await (window as any).api.economia.deleteRows(bancoSelected)
                    if (res && res.success) {
                      toast({ title: 'Linhas apagadas', description: `${res.result?.deleted || 0} registros removidos` })
                      setBancoSelected([])
                      fetchBancoRows()
                    } else {
                      toast({ title: 'Erro', description: String(res?.error || 'Não foi possível apagar') })
                    }
                  }}>Apagar selecionadas</button>
                )}
                {permissions?.canSaveBancoDados && !hideBancoButtons && (
                  <button className="busca-btn busca-btn-secondary" onClick={async ()=>{
                    // salvar todas as edições locais
                    const ids = Object.keys(bancoEdits).map(k=>Number(k))
                    if (ids.length === 0) { toast({ title: 'Nada para salvar', description: 'Nenhuma alteração encontrada' }); return }
                    try {
                      await Promise.all(ids.map(id => (window as any).api.economia.updateRow(id, { encaixe: Number(bancoEdits[id]) })))
                      toast({ title: 'Alterações salvas', description: `${ids.length} linha(s) atualizadas` })
                      setBancoEdits({})
                      fetchBancoRows()
                    } catch (e) {
                      toast({ title: 'Erro ao salvar', description: String(e) })
                    }
                  }}>Salvar alterações</button>
                )}
                {(permissions?.canSaveBancoDados || (permissions as any)?.canExportBancoDados) && (
                  <>
                    <button className="busca-btn" onClick={exportBancoCsv} disabled={exporting}>{exporting ? 'Exportando...' : 'Exportar CSV'}</button>
                    <button className="busca-btn" onClick={exportBancoXlsx} disabled={exportingXlsx} style={{marginLeft:8}}>{exportingXlsx ? 'Exportando...' : 'Exportar Excel'}</button>
                  </>
                )}
              </div>
            </div>

            {bancoLoading ? (
              <div className="busca-loading"><span>Carregando registros do banco...</span></div>
            ) : bancoRows.length === 0 ? (
              <div className="busca-empty"><h3>Nenhum registro salvo</h3><p>Salve um encaixe na aba "Busca Dados" para persistir aqui.</p></div>
            ) : (
              <div className="busca-table-container">
                <table className="busca-table-pro">
                  <thead>
                    <tr>
                      <th style={{width:40}}><input type="checkbox" checked={bancoSelected.length === filteredBancoRows.length && filteredBancoRows.length>0} onChange={(e)=>{ if (e.target.checked) setBancoSelected(filteredBancoRows.map(r=>r.id)) ; else setBancoSelected([]) }} /></th>
                      <th className="col-num">#</th>
                      <th className="col-data">Data</th>
                      <FilterableTh colKey="artigo" className="col-artigo">Artigo</FilterableTh>
                      <FilterableTh colKey="dataFase" className="col-datafase">Data Fase</FilterableTh>
                      <FilterableTh colKey="ordem" className="col-ordem">Ordem</FilterableTh>
                      <FilterableTh colKey="modelo" className="col-modelo">Modelo</FilterableTh>
                      <FilterableTh colKey="material" className="col-material">Material</FilterableTh>
                      <FilterableTh colKey="cor" className="col-cor">Cor/Espessura</FilterableTh>
                      <th className="col-preco">Preço</th>
                      <th className="col-previsto">Previsto</th>
                      <th className="col-encaixe">Encaixe</th>
                      <th className="col-dif">Dif</th>
                      <th className="col-percent">%</th>
                      <FilterableTh colKey="periodo" className="col-periodo">Período</FilterableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBancoRows.map((r, i) => (
                      <tr key={r.id || `${i}`}>
                        <td><input type="checkbox" checked={bancoSelected.includes(r.id)} onChange={(e)=>{ if (e.target.checked) setBancoSelected(s=>Array.from(new Set([...s, r.id]))) ; else setBancoSelected(s=>s.filter(x=>x!==r.id)) }} /></td>
                        <td className="col-num">{i + 1}</td>
                        <td className="col-data">{r.data ? formatISOToDisplay(r.data) : '-'}</td>
                        <td className="col-artigo">{r.artigo || '-'}</td>
                        <td className="col-datafase">{r.header_data_fase || r.data ? (r.header_data_fase || (r.data ? formatISOToDisplay(r.data) : '-')) : '-'}</td>
                        <td className="col-ordem">{r.ordem || '-'}</td>
                        <td className="col-modelo">{r.header_modelo || r.modelo || '-'}</td>
                        <td className="col-material">{r.material || '-'}</td>
                        <td className="col-cor">{r.cor_espessura || '-'}</td>
                        <td className="col-preco">{r.preco != null ? Number(r.preco).toFixed(2) : '-'}</td>
                        <td className="col-previsto">{r.previsto != null ? Number(r.previsto).toFixed(2) : '-'}</td>
                        <td className="col-encaixe">
                          <input
                            className={`encaixe-input ${bancoLocked[r.id] ? 'locked' : ''}`}
                            data-rowid={r.id}
                            value={ bancoEdits[r.id] !== undefined ? bancoEdits[r.id] : (r.encaixe != null ? Number(r.encaixe).toFixed(2) : '') }
                            disabled={!!bancoLocked[r.id]}
                            onFocus={() => { tryUnlockBancoIndex(r.id) }}
                            onChange={(e) => {
                              if (bancoLockedRef.current[r.id]) {
                                if (!tryUnlockBancoIndex(r.id)) return
                              }
                              const val = e.target.value
                              // permitir edição imediata se marcado por cancelamento
                              if (bancoAllowEditRef.current[r.id]) {
                                setBancoEdits(prevState => ({ ...prevState, [r.id]: val }))
                                bancoAllowEditRef.current[r.id] = false
                                return
                              }
                              const prev = bancoEdits[r.id] !== undefined ? bancoEdits[r.id] : (r.encaixe != null ? Number(r.encaixe).toFixed(2) : '')
                              // Ignorar alterações vindas de spinner/scroll quando campo vazio e usuário não digitou
                              const touchedNow = !!bancoTouchedRef.current[r.id] || !!bancoTouched[r.id]
                              if ((prev === '' || prev === undefined) && val !== '' && !touchedNow) return
                              setBancoEdits(prevState => ({ ...prevState, [r.id]: val }))
                            }}
                            onBlur={async (e) => {
                              const vRaw = String(e.target.value)
                              // se usuário não digitou nada e valor anterior é nulo, não salva
                              if (vRaw.trim() === '' && (r.encaixe == null || r.encaixe === undefined)) return
                              const v = parseFloat(vRaw.replace(',', '.')) || 0
                              const prev = r.encaixe != null ? Number(r.encaixe) : null
                              if (prev !== null && prev === v) return

                              // Verificação percentual: se diferir >= 30% do Previsto, pedir confirmação
                              const previstoNum = r.previsto != null ? Number(r.previsto) : (r.previsto ? parseFloat(String(r.previsto)) : 0)
                              if (previstoNum > 0) {
                                const pct = Math.abs(v - previstoNum) / previstoNum
                                if (pct >= 0.3) {
                                  const dir = v > previstoNum ? 'maior' : 'menor'
                                  const ok = await askConfirm(`Valor de Encaixe (${v.toFixed(2)}) é ${(pct * 100).toFixed(1)}% ${dir} que o Previsto (${previstoNum.toFixed(2)}). Deseja confirmar?`)
                                  if (!ok) {
                                    // reverter valor visível e bloquear temporariamente a edição
                                    setBancoEdits(prevState => ({ ...prevState, [r.id]: prev !== null ? prev.toFixed(2) : '' }))
                                    setBancoTouched(prev => ({ ...prev, [r.id]: true }))
                                    bancoTouchedRef.current[r.id] = true

                                    const now = Date.now()
                                    setBancoLocked(prev => ({ ...prev, [r.id]: true }))
                                    bancoLockedRef.current[r.id] = true
                                    bancoLockedAtRef.current[r.id] = now

                                    toast({ title: 'Alteração cancelada', description: 'Encaixe não foi alterado — campo liberado em instantes' })

                                    // fallback para liberar quando o timer rodar normalmente
                                    setTimeout(() => {
                                      unlockBancoIndex(r.id)
                                    }, LOCK_DURATION_MS)

                                    return
                                  }
                                }
                              }

                              try {
                                const res = await (window as any).api.economia.updateRow(r.id, { encaixe: v })
                                if (res && res.success) {
                                  toast({ title: 'Encaixe salvo', description: `Linha ${i+1} atualizada` })
                                  // marcar como não tocado após salvar
                                  setBancoTouched(prev => ({ ...prev, [r.id]: false }))
                                  bancoTouchedRef.current[r.id] = false
                                  fetchBancoRows()
                                }
                              } catch (err) {
                                toast({ title: 'Erro', description: String(err) })
                              }
                            }}
                            onKeyDown={(e) => {
                              if (bancoLockedRef.current[r.id]) {
                                if (!tryUnlockBancoIndex(r.id)) { e.preventDefault(); return }
                              }
                              if (/^[0-9.,\-]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Delete') {
                                setBancoTouched(prev => ({ ...prev, [r.id]: true }))
                                bancoTouchedRef.current[r.id] = true
                              }
                              if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() }
                            }}
                            onPaste={() => { setBancoTouched(prev => ({ ...prev, [r.id]: true })); bancoTouchedRef.current[r.id] = true }}
                          />
                        </td>
                        <td className={`col-dif ${r.dif > 0 ? 'positive' : r.dif < 0 ? 'negative' : ''}`}>{r.dif != null ? Number(r.dif).toFixed(2) : '-'}</td>
                        <td className={`col-percent ${r.porcent > 0 ? 'positive' : r.porcent < 0 ? 'negative' : ''}`}>{r.porcent != null ? `${(Number(r.porcent) * 100).toFixed(1)}%` : '-'}</td>
                        <td className="col-periodo">{r.header_periodo || (r.data ? `${new Date(r.data).getFullYear()}/${String(new Date(r.data).getMonth()+1).padStart(2,'0')}` : '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    {/* Confirm dialog (non-blocking) */}
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmação</AlertDialogTitle>
          <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => confirmResolveRef.current && confirmResolveRef.current(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => confirmResolveRef.current && confirmResolveRef.current(true)}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  )
}
