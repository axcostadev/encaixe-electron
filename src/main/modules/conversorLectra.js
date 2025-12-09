// Converte parsed results para uma estrutura ModelData simplificada para Lectra
export function converterParaModelData(parsedCTF = [], parsedCTC = [], options = {}) {
  const modelos = []

  for (const bloco of parsedCTF) {
    for (const linha of bloco.linhas) {
      modelos.push({
        codigo: linha.artigo || linha.modelo || '',
        tamanho: linha.grade || '',
        a: linha.pares || 0,
        b: 0,
        c: 0,
        d: 0
      })
    }
  }

  const seen = new Set(modelos.map(m => m.codigo + '|' + m.tamanho))
  for (const bloco of parsedCTC) {
    for (const linha of bloco.linhas) {
      const key = (linha.artigo || linha.modelo || '') + '|' + (linha.grade || '')
      if (!seen.has(key)) {
        modelos.push({
          codigo: linha.artigo || linha.modelo || '',
          tamanho: linha.grade || '',
          a: linha.pares || 0,
          b: 0,
          c: 0,
          d: 0
        })
        seen.add(key)
      }
    }
  }

  return modelos
}
