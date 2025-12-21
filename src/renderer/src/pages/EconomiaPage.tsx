import { useEffect, useState } from "react"
import { PageHeader } from "@renderer/components/common/PageHeader"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@renderer/components/ui/table"
import { Button } from "@renderer/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@renderer/components/ui/dialog"
import { Input } from "@renderer/components/ui/input"
import { ChartContainer } from "@renderer/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"

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
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<CadastroInfo>>({ artigo: "", modelo: "", componente: "", material: "", cor: "", largura: "" })

  const [summary, setSummary] = useState<any>(null)
  const [byModelo, setByModelo] = useState<any[]>([])
  const [byMaterial, setByMaterial] = useState<any[]>([])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [list, sum, modelos, materiais] = await Promise.all([
        (window as any).api.economia.list(1000),
        (window as any).api.economia.summary(),
        (window as any).api.economia.byModelo(12),
        (window as any).api.economia.byMaterial(12),
      ])

      setRows(Array.isArray(list) ? list : [])
      setSummary(sum || { totalDif: 0, ordemCount: 0, avgDif: 0 })
      setByModelo(Array.isArray(modelos) ? modelos : [])
      setByMaterial(Array.isArray(materiais) ? materiais : [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const importFile = async () => {
    if (!confirm("Importar dados do arquivo Excel para o banco? Isso pode duplicar dados se já importado.")) return
    try {
      setLoading(true)
      const res = await (window as any).api.economia.importFile()
      console.log('import result', res)
      await loadAll()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Economia Dashboard"
        description="Corte - Economia de Encaixe"
        action={<div className="flex gap-2"><Button onClick={importFile}>Importar Excel</Button><Button onClick={loadAll}>Atualizar</Button></div>}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="card-stats">
          <p className="text-sm text-muted-foreground">Total Economia (R$)</p>
          <p className="text-2xl font-bold mt-1">{summary ? (summary.totalDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : '—'}</p>
        </div>
        <div className="card-stats">
          <p className="text-sm text-muted-foreground">Pedidos</p>
          <p className="text-2xl font-bold mt-1">{summary ? summary.ordemCount : '—'}</p>
        </div>
        <div className="card-stats">
          <p className="text-sm text-muted-foreground">Média por pedido</p>
          <p className="text-2xl font-bold mt-1">{summary ? (summary.avgDif || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : '—'}</p>
        </div>
        <div className="card-stats">
          <p className="text-sm text-muted-foreground">Linhas</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-2">Modelos - Performance Negativa</h3>
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
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-2">Materiais - Performance Negativa</h3>
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

    </div>
  )
}
