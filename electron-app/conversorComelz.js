// Reproduz a lógica do ConversorComelz Java: retorna lista de QtyRule
// parsedCTF/parsedCTC: arrays de blocos { of, linhas: [...] }
// cadastro: { artigo, cor, material }
export function converterParaQtyRules(parsedCTF = [], parsedCTC = [], cadastro = {}) {
  const lista = []

  // Helper: criar mapa OF -> blocos
  const mapCTF = new Map()
  for (const bloco of parsedCTF) {
    mapCTF.set(String(bloco.of || bloco.ofNumber || bloco.of || ''), bloco)
  }
  const mapCTC = new Map()
  for (const bloco of parsedCTC) {
    mapCTC.set(String(bloco.of || bloco.ofNumber || bloco.of || ''), bloco)
  }

  // Processa OFs do CTF primeiro
  for (const bloco of parsedCTF) {
    const of = bloco.of || bloco.ofNumber || bloco.of || ''
    const dadosCTC = mapCTC.get(String(of))
    for (const linha of bloco.linhas || []) {
      const partName = (linha.artigo || linha.artigo || '').toString().trim()
      const partSize = (linha.codigoCor || linha.grade || linha.modelo || '').toString().trim()
      const items = Number(linha.pares || 0)

      let material = (cadastro && cadastro.material) ? String(cadastro.material) : ''
      // Enriquecer material com especificacaoTecnica do CTC quando artigo+cor combinarem
      if (dadosCTC && Array.isArray(dadosCTC.linhas)) {
        for (const l of dadosCTC.linhas) {
          if (String(l.artigo || '').trim() === partName && String(l.codigoCor || l.grade || '').trim() === partSize) {
            if (l.especificacaoTecnica) material = (material ? material + ' - ' : '') + String(l.especificacaoTecnica).trim()
            break
          }
        }
      }

      lista.push({
        partName: partName || (cadastro && cadastro.artigo) || '',
        partSize: partSize || (cadastro && cadastro.cor) || '',
        fitting: null,
        mirror: null,
        parts: null,
        material: material || '',
        items: items
      })
    }
  }

  // Processa OFs que estão somente no CTC
  for (const bloco of parsedCTC) {
    const of = bloco.of || bloco.ofNumber || ''
    if (mapCTF.has(String(of))) continue
    for (const linha of bloco.linhas || []) {
      const partName = (linha.artigo || '').toString().trim()
      const partSize = (linha.codigoCor || linha.grade || linha.modelo || '').toString().trim()
      const items = Number(linha.pares || 0)

      let material = (cadastro && cadastro.material) ? String(cadastro.material) : ''
      if (linha.especificacaoTecnica) material = (material ? material + ' - ' : '') + String(linha.especificacaoTecnica).trim()

      lista.push({
        partName: partName || (cadastro && cadastro.artigo) || '',
        partSize: partSize || (cadastro && cadastro.cor) || '',
        fitting: null,
        mirror: null,
        parts: null,
        material: material || '',
        items: items
      })
    }
  }

  return lista
}
