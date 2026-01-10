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
			// Parse mais detalhado da linha de material
			// Formato típico:
			// COR  I002  ETR1767       TRSF. CONSCIENCIA NEGRA   TERCTA 34/36       ,8173   208,080
			const parts = linha.trim().split(/\s{2,}/)

			if (parts.length >= 4) {
				// Primeira parte: "COR I002 ETR1767" ou similar
				const headerParts = parts[0].split(/\s+/)
				const codigo = headerParts[2] || ""

				// Segunda parte: nome do material
				const materialNome = parts[1] || ""

				// Terceira parte pode ser cor/espessura ou preço
				let corEspessura = ""
				let preco = 0
				let previsto = 0

				// Procurar o preço (número com vírgula decimal)
				for (let i = 2; i < parts.length; i++) {
					const part = parts[i].trim()

					// Se parece com preço (número decimal BR)
					if (/^[\d.,]+$/.test(part)) {
						if (preco === 0) {
							preco = parseNumberBR(part)
						} else if (previsto === 0) {
							previsto = parseNumberBR(part)
						}
					} else if (!corEspessura && part.length > 0) {
						// Cor/Espessura geralmente tem letras e números
						corEspessura = part
					}
				}

				// Se não encontrou cor/espessura, tentar extrair do nome do material
				const corMatch = materialNome.match(/\s+([A-Z0-9/]+\s+[\d,/]+(?:MM)?)$/i)
				if (!corEspessura && corMatch) {
					corEspessura = corMatch[1]
				}

				registros.push({
					data: ordemAtual.data,
					artigo: ordemAtual.artigo,
					ordem: ordemAtual.ordem,
					modelo: ordemAtual.modelo,
					material: materialNome.trim(),
					cor_espessura: corEspessura,
					preco: preco,
					previsto: previsto,
					encaixe: null,
					dif: null,
					porcent: null,
				})
			}
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
