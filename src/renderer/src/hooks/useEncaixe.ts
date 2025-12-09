import { useState, useCallback } from 'react'
import type { DadosCTF, DadosCTC, PedidoComelz, PedidoEmma, ModelDataLectra } from '@renderer/types'

interface CadastroInfo {
  artigo: string
  modelo: string
  componente: string
  material: string
  cor: string
  largura: string
  tipoTecido: string
  paresCriac: string
  conjugNavalha: string
  placaPorPar: string
  camada: string
  espacamento: string
  comprimentoMax: string
}

interface GradePar {
  artigo: string
  modelo: string
  codigoCor: string
  grade: string
  pares: number
}

export function useEncaixe() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedCTF, setParsedCTF] = useState<DadosCTF[]>([])
  const [parsedCTC, setParsedCTC] = useState<DadosCTC[]>([])

  // Buscar OF e retornar grade/pares
  const buscarOF = useCallback(async (of: string): Promise<GradePar[]> => {
    setLoading(true)
    setError(null)
    try {
      const result = await (window as any).api.electronAPI.buscarOF(of)
      return result || []
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar artigo e retornar cadastros
  const buscarArtigo = useCallback(async (artigo: string): Promise<CadastroInfo[]> => {
    setLoading(true)
    setError(null)
    try {
      const result = await (window as any).api.cadastroAPI.getByArtigo(artigo)
      if (!result) return []
      return Array.isArray(result) ? result : [result]
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Parse arquivos CTF/CTC
  const parseArquivos = useCallback(async (ctfPath?: string, ctcPath?: string) => {
    setLoading(true)
    setError(null)
    try {
      const ctfData = ctfPath ? await (window as any).api.electronAPI.parseCTF(ctfPath) : []
      const ctcData = ctcPath ? await (window as any).api.electronAPI.parseCTC(ctcPath) : []
      
      setParsedCTF(ctfData)
      setParsedCTC(ctcData)
      
      return { ctfData, ctcData }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return { ctfData: [], ctcData: [] }
    } finally {
      setLoading(false)
    }
  }, [])

  // Converter para formato Comelz
  const converterParaComelz = useCallback(async (
    cadastro?: CadastroInfo
  ): Promise<PedidoComelz | null> => {
    setLoading(true)
    setError(null)
    try {
      const options = cadastro ? {
        artigo: cadastro.artigo,
        componente: cadastro.componente,
        material: cadastro.material,
        cor: cadastro.cor
      } : {}

      const qtyRules = await (window as any).api.conversorAPI.toComelz(parsedCTF, parsedCTC, options)
      
      // Criar pedido Comelz
      const pedido: PedidoComelz = {
        id: 'ord1',
        date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        note: 'Pedido teste',
        customer: 'ClienteX',
        split_materials: false,
        model: cadastro?.modelo || '\\\\modserver\\models\\esempio.cmz',
        qty: qtyRules
      }
      
      return pedido
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [parsedCTF, parsedCTC])

  // Converter para formato Emma
  const converterParaEmma = useCallback(async (
    cadastro?: CadastroInfo,
    modelPath?: string
  ): Promise<PedidoEmma | null> => {
    setLoading(true)
    setError(null)
    try {
      const options = cadastro ? {
        artigo: cadastro.artigo,
        componente: cadastro.componente,
        material: cadastro.material,
        cor: cadastro.cor
      } : {}

      const qtyEmma = await (window as any).api.conversorAPI.toEmma(parsedCTF, parsedCTC, options)
      
      // Criar pedido Emma
      const pedido: PedidoEmma = {
        customer: 'VULCABRAS',
        date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        id: cadastro?.artigo || '433015115',
        model: modelPath || cadastro?.modelo || '',
        qty: qtyEmma
      }
      
      return pedido
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [parsedCTF, parsedCTC])

  // Converter para formato Lectra
  const converterParaLectra = useCallback(async (
    cadastro?: CadastroInfo
  ): Promise<ModelDataLectra[]> => {
    setLoading(true)
    setError(null)
    try {
      const options = cadastro ? {
        artigo: cadastro.artigo,
        componente: cadastro.componente,
        material: cadastro.material,
        cor: cadastro.cor
      } : {}

      const modelos = await (window as any).api.conversorAPI.toLectra(parsedCTF, parsedCTC, options)
      return modelos || []
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [parsedCTF, parsedCTC])

  // Exportar arquivo
  const exportarArquivo = useCallback(async (
    formato: 'comelz' | 'emma' | 'lectra',
    dados: any,
    markerName?: string
  ): Promise<string | null> => {
    setLoading(true)
    setError(null)
    try {
      const filters = formato === 'lectra'
        ? [{ name: 'MKX', extensions: ['mkx'] }]
        : [{ name: 'JSON', extensions: ['json'] }]

      const savePath = await (window as any).api.exportAPI.showSaveDialog({
        title: `Exportar ${formato.toUpperCase()}`,
        filters
      })

      if (!savePath) return null

      if (formato === 'comelz') {
        await (window as any).api.exportAPI.exportComelz(dados, savePath)
      } else if (formato === 'emma') {
        await (window as any).api.exportAPI2.exportEmma(dados, savePath)
      } else if (formato === 'lectra') {
        await (window as any).api.exportAPI2.exportLectra(dados, savePath, markerName || 'MARKER_' + Date.now())
      }

      return savePath
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Cadastrar apelido
  const cadastrarApelido = useCallback(async (componente: string, apelido: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await (window as any).api.apelidoAPI.save(componente, apelido)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar apelido
  const buscarApelido = useCallback(async (componente: string): Promise<string> => {
    try {
      return await (window as any).api.apelidoAPI.get(componente)
    } catch (err) {
      return ''
    }
  }, [])

  return {
    loading,
    error,
    parsedCTF,
    parsedCTC,
    buscarOF,
    buscarArtigo,
    parseArquivos,
    converterParaComelz,
    converterParaEmma,
    converterParaLectra,
    exportarArquivo,
    cadastrarApelido,
    buscarApelido
  }
}

export type UseEncaixeReturn = ReturnType<typeof useEncaixe>
