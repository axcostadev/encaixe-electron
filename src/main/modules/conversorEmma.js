// Converte parsed results para estrutura simplificada para exportação Emma
// Implementa a lógica do ConversorEmma Java com constantes
// parsedCTF/parsedCTC: arrays de blocos { of, linhas }
// cadastro: objeto { artigo, cor, material }
export function converterParaQtyEmma(parsedCTF = [], parsedCTC = [], cadastro = {}) {
  const listaQty = []

  // Helper: for matching CTC lines by artigo+codigoCor
  const mapCTCByKey = new Map()
  for (const bloco of parsedCTC) {
    for (const l of bloco.linhas || []) {
      const key = (l.artigo || '').toString().trim() + '|' + (l.codigoCor || l.grade || '').toString().trim()
      if (!mapCTCByKey.has(key)) mapCTCByKey.set(key, l)
    }
  }

  // If there are CTF blocks, process them (prioridade)
  if (Array.isArray(parsedCTF) && parsedCTF.length > 0) {
    for (const bloco of parsedCTF) {
      for (const linha of bloco.linhas || []) {
        let artigo = (linha.artigo || '').toString().trim()
        let codigoCor = (linha.codigoCor || linha.grade || linha.modelo || '').toString().trim()
        const quantidadePares = Number(linha.pares || 0)

        let materialNome = (cadastro && cadastro.material) ? String(cadastro.material) : ''
        const key = artigo + '|' + codigoCor
        const lctc = mapCTCByKey.get(key)
        if (lctc && lctc.especificacaoTecnica) {
          materialNome = (materialNome ? materialNome + ' - ' : '') + String(lctc.especificacaoTecnica).trim()
        }

        if (!artigo) artigo = (cadastro && cadastro.artigo) || ''
        if (!codigoCor) codigoCor = (cadastro && cadastro.cor) || ''

        listaQty.push({
          part_name: artigo,
          part_size: codigoCor,
          mirror: false,
          parts: quantidadePares,
          angle: 90,
          toler: 10,
          material_name: materialNome,
          material_x: 1.41,
          material_y: 10.0,
          material_unit: 'm',
          part_space: 1.5,
          material_plies_up: 12,
          material_plies_down: 0,
          material_margin: 0
        })
      }
    }
  }
  // else use CTC blocks
  else if (Array.isArray(parsedCTC) && parsedCTC.length > 0) {
    for (const bloco of parsedCTC) {
      for (const linha of bloco.linhas || []) {
        let artigo = (linha.artigo || '').toString().trim()
        let codigoCor = (linha.codigoCor || linha.grade || linha.modelo || '').toString().trim()
        const quantidadePares = Number(linha.pares || 0)

        let materialNome = (cadastro && cadastro.material) ? String(cadastro.material) : ''
        if (linha.especificacaoTecnica) materialNome = (materialNome ? materialNome + ' - ' : '') + String(linha.especificacaoTecnica).trim()

        if (!artigo) artigo = (cadastro && cadastro.artigo) || ''
        if (!codigoCor) codigoCor = (cadastro && cadastro.cor) || ''

        listaQty.push({
          part_name: artigo,
          part_size: codigoCor,
          mirror: false,
          parts: quantidadePares,
          angle: 90,
          toler: 10,
          material_name: materialNome,
          material_x: 1.41,
          material_y: 10.0,
          material_unit: 'm',
          part_space: 1.5,
          material_plies_up: 12,
          material_plies_down: 0,
          material_margin: 0
        })
      }
    }
  }
  // else fallback to cadastro-only
  else {
    const artigo = (cadastro && cadastro.artigo) || ''
    const codigoCor = (cadastro && cadastro.cor) || ''
    const materialNome = (cadastro && cadastro.material) || ''
    listaQty.push({
      part_name: artigo,
      part_size: codigoCor,
      mirror: false,
      parts: 0,
      angle: 90,
      toler: 10,
      material_name: materialNome,
      material_x: 1.41,
      material_y: 10.0,
      material_unit: 'm',
      part_space: 1.5,
      material_plies_up: 12,
      material_plies_down: 0,
      material_margin: 0
    })
  }

  return listaQty
}
