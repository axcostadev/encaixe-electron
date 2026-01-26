import fs from "fs"

/**
 * Parser para arquivos CGC.txt
 * Extrai informações de Ordem de Fabrico para o Dashboard de Economia
 *
 * Campos extraídos:
 * - Artigo (preto): código do artigo
 * - Ordem Fabrico (vermelho): número da OF
 * - Modelo (verde): descrição do modelo
 * - Data Prevista (azul): data prevista início/fim
 * - Material (marrom): nome do componente/material
 * - Cor/Espessura (amarelo): cor e espessura do material
 * - Preço (lilás): preço do material
 * - Previsto: quantidade prevista
 */

function toLines(content) {
	return content.split(/\r?\n/)
}

function parseNumberBR(str) {
	if (!str) return 0
	// Remove pontos de milhar e troca vírgula por ponto
	return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0
}

function extractField(linha, campo) {
	const regex = new RegExp(`${campo}\\s*:\\s*(.+?)(?=\\s{2,}|$)`, "i")
	const match = regex.exec(linha)
	return match ? match[1].trim() : null
}

/**
 * Parse do arquivo CGC.txt
 * @param {string} caminho - Caminho do arquivo CGC.txt
 * @returns {Promise<Array>} Array de registros para economia
 */
export async function parseCGC(caminho) {
	const raw = fs.readFileSync(caminho, { encoding: "latin1" })
	const lines = toLines(raw)

	const registros = []
	let ordemAtual = null

	// Patterns para header da OF
	const patternArtigo = /Artigo\s*:\s*(\S+)\s+(.+?)(?=\s{2,}Ordem|$)/i
	const patternOrdem = /Ordem\s+Fabrico\s*:\s*(\d+)/i
	const patternData = /Dt\s+Prv\s+Ini\/Fim\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i

	// Pattern para linhas de material
	// Formato: COR  I002  CODIGO       MATERIAL                    COR/ESP       PRECO      QTD.PREV ...
	const patternMaterial =
		/^\s*(COR|MAT)\s+\S+\s+(\S+)\s{2,}(.+?)\s{2,}(\S+)\s+(\S+)\s+(\d+[\d.,]*)\s+(\d+[\d.,]*)/

	for (const linha of lines) {
		// Detectar início de nova OF
		const mArtigo = patternArtigo.exec(linha)
		if (mArtigo) {
			const artigo = mArtigo[1]
			const modelo = mArtigo[2].trim()

			// Buscar ordem na mesma linha ou próxima
			const mOrdem = patternOrdem.exec(linha)
			const ordem = mOrdem ? mOrdem[1] : null

			ordemAtual = {
				artigo,
				modelo,
				ordem,
				data: null,
			}
			continue
		}

		// Capturar ordem se não veio na linha do artigo
		if (ordemAtual && !ordemAtual.ordem) {
			const mOrdem = patternOrdem.exec(linha)
			if (mOrdem) {
				ordemAtual.ordem = mOrdem[1]
			}
		}

		// Capturar data prevista
		if (ordemAtual) {
			const mData = patternData.exec(linha)
			if (mData) {
				// Converter data BR para ISO
				const [dia, mes, ano] = mData[1].split("/")
				ordemAtual.data = `${ano}-${mes}-${dia}`
			}
		}

		// Detectar linhas de material (começam com COR ou MAT seguido de local)
		if (ordemAtual && /^\s*(COR|MAT)\s+[A-Z]\d{3}\s+\S+/.test(linha)) {
			// Parse usando posições fixas
			// Formato fixo:
			// 1-3: Tipo (COR/MAT)
			// 5-8: Local
			// 10-16: Código
			// 13-23: Componente
			// 43-56: Cor/Espessura
			// 58-65: Preço
			// 67-75: Qtd Prev
			// 77-85: Tot Prev
			// 87-94: Qtd Serv
			// 96-104: Tot Serv
			// 106-108: % Ser
			// 110-112: Um
			// 114-115: Trm

			const tipo = linha.substring(0, 3).trim()
			const local = linha.substring(4, 8).trim()
			const codigo = linha.substring(9, 16).trim()
			const componente = linha.substring(12, 23).trim() // Col 13-23 (0-based 12-23)
			const corEspessura = linha.substring(52, 66).trim()  // Usuário especificou col 53-66 (0-based 52-65)
			const precoStr = linha.substring(68, 77).trim()  // Col 69-77 (0-based 68-76)
			const qtdPrevStr = linha.substring(79, 87).trim()  // Col 80-87 (0-based 79-86)
			const totPrevStr = linha.substring(76, 85).trim()
			const qtdServStr = linha.substring(86, 94).trim()
			const totServStr = linha.substring(95, 104).trim()
			const percentSerStr = linha.substring(105, 108).trim()
			const unidade = linha.substring(109, 112).trim()
			const trm = linha.substring(113, 115).trim()

			// Filtrar: aceitar apenas materiais com 'L' na coluna 136 ou 137 (1-based)
			const col136 = linha.substring(135, 136).trim().toUpperCase()
			const col137 = linha.substring(136, 137).trim().toUpperCase()
			if (col136 !== 'L' && col137 !== 'L') continue

			const preco = parseNumberBR(precoStr)
			const previsto = parseNumberBR(qtdPrevStr)

			registros.push({
				data: ordemAtual.data,
				artigo: ordemAtual.artigo,
				ordem: ordemAtual.ordem,
				modelo: ordemAtual.modelo,
				material: componente.trim(),
				cor_espessura: corEspessura,
				preco: preco,
				previsto: previsto,
				encaixe: null,
				dif: null,
				porcent: null,
			})
		}
	}

	return registros
}

/**
 * Parse simplificado - retorna apenas headers das OFs (sem materiais)
 */
export async function parseCGCHeaders(caminho) {
	const raw = fs.readFileSync(caminho, { encoding: "latin1" })
	const lines = toLines(raw)

	const ordens = []
	let ordemAtual = null

	const patternArtigo = /Artigo\s*:\s*(\S+)\s+(.+?)(?=\s{2,}Ordem|$)/i
	const patternOrdem = /Ordem\s+Fabrico\s*:\s*(\d+)/i
	const patternData = /Dt\s+Prv\s+Ini\/Fim\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i
	const patternCor = /Cor\s*:\s*(\S+)\s+(.+?)(?=\s{2,}|$)/i

	for (const linha of lines) {
		const mArtigo = patternArtigo.exec(linha)
		if (mArtigo) {
			// Salvar ordem anterior se existir
			if (ordemAtual && ordemAtual.ordem) {
				ordens.push({ ...ordemAtual })
			}

			const artigo = mArtigo[1]
			const modelo = mArtigo[2].trim()
			const mOrdem = patternOrdem.exec(linha)

			ordemAtual = {
				artigo,
				modelo,
				ordem: mOrdem ? mOrdem[1] : null,
				data: null,
				cor: null,
			}
			continue
		}

		if (ordemAtual) {
			if (!ordemAtual.ordem) {
				const mOrdem = patternOrdem.exec(linha)
				if (mOrdem) ordemAtual.ordem = mOrdem[1]
			}

			const mData = patternData.exec(linha)
			if (mData) {
				const [dia, mes, ano] = mData[1].split("/")
				ordemAtual.data = `${ano}-${mes}-${dia}`
			}

			const mCor = patternCor.exec(linha)
			if (mCor) {
				ordemAtual.cor = `${mCor[1]} ${mCor[2]}`.trim()
			}
		}
	}

	// Adicionar última ordem
	if (ordemAtual && ordemAtual.ordem) {
		ordens.push({ ...ordemAtual })
	}

	return ordens
}

export default { parseCGC, parseCGCHeaders }
