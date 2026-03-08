import fs from 'fs';

function toLines(content) {
  return content.split(/\r?\n/);
}

function parseNumberFromPares(paresStr) {
  if (!paresStr) return 0;
  const cleaned = paresStr.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : Math.floor(n);
}

export async function parseCTF(caminho) {
  const mapa = new Map();

  // aceitar padrões antigos (ex: COR43927547) e novos (CRP8346B,
  // CRP8356, CRPMZ8590, CRPMZ8578I). permite prefixos de 2–6 letras
  // seguidos de 3–9 dígitos, com opcional letra no final, além de um
  // fallback genérico para qualquer outra sequência alfanumérica.
  // Tornar case-insensitive e permitir barras/pontos no grupo de modelo.
  const patternArtigoModelo = /([A-Z]{2,6}\d{3,9}[A-Z]?|[A-Z0-9]{6,12})\s+([A-Z0-9\-\/.]+)/i;
  const patternOF = /PAR\s*(\d{9})(?:\/[^\s]+)?(?:\s[A-Z])?/;
  const patternPares = /N\s*([\d\.]+,[\d]{3})/;

  const raw = fs.readFileSync(caminho, { encoding: 'latin1' });
  const lines = toLines(raw);

  for (let linha of lines) {
    if (!linha || linha.trim().length === 0 || linha.length < 50) continue;

    // tentar achar artigo+modelo via regex. Se falhar, tentar colunas fixas
    let artigo = null;
    let modelo = '';
    const mArtigoModelo = patternArtigoModelo.exec(linha);
    if (mArtigoModelo) {
      artigo = mArtigoModelo[1];
      modelo = mArtigoModelo[2];
    } else {
      // fallback: tentar extrair artigo a partir das colunas fixas (1-based):
      // as ordens antigas colocavam o código na coluna 43, mas em alguns
      // casos aparecem na coluna 53 (por exemplo CRP.../CRPMZ...). Vamos
      // tentar ambos os deslocamentos e tamanhos variados.
      if (linha) {
        const starts = [42, 52]; // índices 0-based para coluna 43 e 53
        for (const start of starts) {
          if (artigo) break; // já achou
          // tentar comprimentos 9,10 e 12 (colunas finais 51/52/54 ou 61/%)
          const lengths = [9, 10, 12];
          for (const len of lengths) {
            if (linha.length >= start + len) {
              const candidate = linha.substring(start, start + len).trim();
              if (candidate && /^[A-Z0-9]{4,12}$/.test(candidate)) {
                artigo = candidate.toUpperCase();
                const restStart = start + len;
                const rest = linha.substring(restStart).trim();
                const mModelo = /([A-Z0-9-]+)/.exec(rest);
                if (mModelo) modelo = mModelo[1];
                break;
              }
            }
          }
        }
      }
    }
    if (!artigo) continue;

    const mOF = patternOF.exec(linha);
    if (!mOF) continue;
    const numeroOff = mOF[1];

    const mPares = patternPares.exec(linha);
    let quantidadePares = 0;
    if (mPares) quantidadePares = parseNumberFromPares(mPares[1]);

    let codigoCor = '';
    let grade = '';
    const mCodGradeFromModel = /([A-Z]+)(\d+)/.exec(modelo);
    if (mCodGradeFromModel) {
      const letras = mCodGradeFromModel[1];  // "PTRL"
      const numeros = mCodGradeFromModel[2]; // "4739"
      // Código de cor = letras + números (exceto os 2 últimos que são a grade)
      codigoCor = letras + numeros.slice(0, -2); // "PTRL47"
      grade = mCodGradeFromModel[2]; // Manter grade original
    }
    // Tentar extrair código de cor a partir de colunas fixas (col 56, 6 caracteres)
    // Coluna 56 (1-based) corresponde ao índice 55 (0-based). Pegamos 6 caracteres.
    if (linha && linha.length >= 61) {
      const codigoCorCols = linha.substring(55, 55 + 6).trim();
      if (codigoCorCols) {
        codigoCor = codigoCorCols.toUpperCase();
      }
    }

    const linhaObj = { of: numeroOff, artigo, modelo, codigoCor, grade, pares: quantidadePares };

    if (!mapa.has(numeroOff)) mapa.set(numeroOff, []);
    mapa.get(numeroOff).push(linhaObj);
  }

  // transformar mapa em array de dados por OF
  const resultado = [];
  for (const [of, linhas] of mapa.entries()) {
    resultado.push({ of, linhas });
  }
  return resultado;
}

export async function parseCTC(caminho) {
  const mapa = new Map();

  // aceitar padrões antigos (ex: COR43927547) e novos (CRP8346B,
  // CRP8356, CRPMZ8590, CRPMZ8578I). permite prefixos de 2–6 letras
  // seguidos de 3–9 dígitos, com opcional letra no final, além de um
  // fallback genérico para qualquer outra sequência alfanumérica.
  // Tornar case-insensitive e permitir barras/pontos no grupo de modelo.
  const patternArtigoModelo = /([A-Z]{2,6}\d{3,9}[A-Z]?|[A-Z0-9]{6,12})\s+([A-Z0-9\-\/.]+)/i;
  const patternOF = /PAR\s*(\d{9}(?:\/[^\s]+)?(?:\s[A-Z])?)/;
  const patternPares = /N\s*([\d\.]+,[\d]{3})/;
  const patternEspecificacaoPrioridade = /Corte\s(.+?)(?:\s+PAR\s+\d{9}.*?)?(\s+PRIORIDADE\s*\S+)?$/;

  const raw = fs.readFileSync(caminho, { encoding: 'latin1' });
  const lines = toLines(raw);

  let dadosIniciados = false;

  for (let linha of lines) {
    if (!dadosIniciados) {
      if (linha.includes('PAR ') && linha.includes('N ') && /[A-Z]{3}\d{7,9}/.test(linha)) {
        dadosIniciados = true;
      } else {
        continue;
      }
    }

    if (!linha || linha.trim().length === 0 || linha.length < 50) continue;

    // tentar achar artigo+modelo via regex. Se falhar, tentar colunas fixas
    let artigo = null;
    let modelo = '';
    const mArtigoModelo = patternArtigoModelo.exec(linha);
    if (mArtigoModelo) {
      artigo = mArtigoModelo[1];
      modelo = mArtigoModelo[2];
    } else {
      // coluna 43 ou 53; mesma lógica usada em parseCTF acima
      if (linha) {
        const starts = [42, 52];
        for (const start of starts) {
          if (artigo) break;
          const lengths = [9, 10, 12];
          for (const len of lengths) {
            if (linha.length >= start + len) {
              const candidate = linha.substring(start, start + len).trim();
              if (candidate && /^[A-Z0-9]{4,12}$/.test(candidate)) {
                artigo = candidate.toUpperCase();
                const restStart = start + len;
                const rest = linha.substring(restStart).trim();
                const mModelo = /([A-Z0-9-]+)/.exec(rest);
                if (mModelo) modelo = mModelo[1];
                break;
              }
            }
          }
        }
      }
    }
    if (!artigo) continue;

    const mOF = patternOF.exec(linha);
    if (!mOF) continue;
    const numeroOff = mOF[1];

    const mPares = patternPares.exec(linha);
    let quantidadePares = 0;
    if (mPares) quantidadePares = parseNumberFromPares(mPares[1]);

    let codigoCor = '';
    let grade = '';
    const mCodGradeFromModel = /([A-Z]+)(\d+)/.exec(modelo);
    if (mCodGradeFromModel) {
      const letras = mCodGradeFromModel[1];  // "PTRL"
      const numeros = mCodGradeFromModel[2]; // "4739"
      // Código de cor = letras + números (exceto os 2 últimos que são a grade)
      codigoCor = letras + numeros.slice(0, -2); // "PTRL47"
      grade = mCodGradeFromModel[2]; // Manter grade original
    }

    // Tentar extrair código de cor a partir de colunas fixas (col 56, 6 caracteres)
    // Coluna 56 (1-based) corresponde ao índice 55 (0-based). Pegamos 6 caracteres.
    if (linha && linha.length >= 61) {
      const codigoCorCols = linha.substring(55, 55 + 6).trim();
      if (codigoCorCols) {
        codigoCor = codigoCorCols.toUpperCase();
      }
    }

    let especificacaoTecnica = '';
    let prioridade = '';
    const mEspecPrior = patternEspecificacaoPrioridade.exec(linha);
    if (mEspecPrior) {
      especificacaoTecnica = mEspecPrior[1].trim();
      if (mEspecPrior[2]) prioridade = mEspecPrior[2].replace('PRIORIDADE', '').trim();
    } else {
      // fallback similar ao Java
      especificacaoTecnica = linha.replace(/\d{2}\/\d{2}\/\d{4}/g, '').replace(/VULTS\/HORIZ/g, '').trim();
    }

    const linhaObj = { of: numeroOff, artigo, modelo, codigoCor, grade, pares: quantidadePares, especificacaoTecnica, prioridade };

    if (!mapa.has(numeroOff)) mapa.set(numeroOff, []);
    mapa.get(numeroOff).push(linhaObj);
  }

  const resultado = [];
  for (const [of, linhas] of mapa.entries()) resultado.push({ of, linhas });
  return resultado;
}
