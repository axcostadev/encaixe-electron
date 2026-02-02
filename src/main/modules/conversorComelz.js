// Reproduz a lógica do ConversorComelz Java: retorna lista de QtyRule
import { getComelzModelBasePath } from "../settings.js"
// parsedCTF/parsedCTC: arrays de blocos { of, linhas: [...] }
// cadastro: { artigo, cor, material }
//
// Formato Comelz JSON order file (v0.2):
// <qty-rule> ::= { "part_name": <string>,    // opt
//                  "part_size": <string>,    // opt (formato "XX.00" para tamanhos)
//                  "mirror": <bool>,         // opt (obrigatório se usar "parts")
//                  "parts": <number>         // opt (peças individuais - requer mirror)
//                }
// Nota: Quando usar "parts", o campo "mirror" é OBRIGATÓRIO (true ou false)
//       Quando usar "items" sem mirror, conta como pares completos

export function converterParaQtyRules(
	parsedCTF = [],
	parsedCTC = [],
	cadastro = {},
) {
	const lista = []

	// Helper: criar mapa OF -> blocos
	const mapCTF = new Map()
	for (const bloco of parsedCTF) {
		mapCTF.set(String(bloco.of || bloco.ofNumber || bloco.of || ""), bloco)
	}
	const mapCTC = new Map()
	for (const bloco of parsedCTC) {
		mapCTC.set(String(bloco.of || bloco.ofNumber || bloco.of || ""), bloco)
	}

	// Processa OFs do CTF primeiro
	for (const bloco of parsedCTF) {
		const of = bloco.of || bloco.ofNumber || bloco.of || ""
		const dadosCTC = mapCTC.get(String(of))
		for (const linha of bloco.linhas || []) {
			const partName = (linha.artigo || linha.artigo || "").toString().trim()
			const partSize = (linha.codigoCor || linha.grade || linha.modelo || "")
				.toString()
				.trim()
			// campos processados a partir da linha

			// Formato Comelz usa snake_case para os campos
			const qtyRule = {}
			if (partName || (cadastro && cadastro.artigo)) {
				qtyRule.part_name = partName || cadastro.artigo || ""
			}
			if (partSize || (cadastro && cadastro.cor)) {
				qtyRule.part_size = formatPartSize(partSize || cadastro.cor || "")
			}
			// não adiciona campos 'material', 'items' ou 'fitting'
			// adicionar campo 'extra' vazio para garantir vírgula após 'parts' no JSON
			qtyRule.extra = ""

			lista.push(qtyRule)
		}
	}

	// Processa OFs que estão somente no CTC
	for (const bloco of parsedCTC) {
		const of = bloco.of || bloco.ofNumber || ""
		if (mapCTF.has(String(of))) continue
		for (const linha of bloco.linhas || []) {
			const partName = (linha.artigo || "").toString().trim()
			const partSize = (linha.codigoCor || linha.grade || linha.modelo || "")
				.toString()
				.trim()
			// campos processados a partir da linha

			// Formato Comelz usa snake_case para os campos
			const qtyRule = {}
			if (partName || (cadastro && cadastro.artigo)) {
				qtyRule.part_name = partName || cadastro.artigo || ""
			}
			if (partSize || (cadastro && cadastro.cor)) {
				qtyRule.part_size = formatPartSize(partSize || cadastro.cor || "")
			}
			// não adiciona campos 'material', 'items' ou 'fitting'
			// adicionar campo 'extra' vazio para garantir vírgula após 'parts' no JSON
			qtyRule.extra = ""

			lista.push(qtyRule)
		}
	}

	return lista
}

/**
 * Formata o tamanho no padrão Comelz (ex: "39" -> "39.00")
 */
function formatPartSize(size) {
	const str = String(size).trim()
	// Se já está no formato XX.00, retorna como está
	if (/^\d+\.\d{2}$/.test(str)) {
		return str
	}
	// Se é um número, formata com .00
	const num = parseFloat(str)
	if (!isNaN(num)) {
		return num.toFixed(2)
	}
	return str
}

/**
 * Gera o arquivo JSON completo para ordem Comelz
 * @param {Object} options - Opções para geração do arquivo
 * @param {string} options.id - ID da ordem (opt)
 * @param {string} options.date - Data no formato YYYYMMDD (opt, default: data atual)
 * @param {string} options.note - Nota/descrição (opt)
 * @param {string} options.customer - Cliente (opt)
 * @param {string} options.model - Caminho do modelo .CMZ (obrigatório)
 * @param {boolean} options.split_materials - Dividir por materiais (opt)
 * @param {Array} options.qty - Lista de qty-rules
 * @returns {Object} Objeto JSON no formato Comelz
 */
export function gerarArquivoComelz(options = {}) {
	const arquivo = {}

	// Campos opcionais
	if (options.id) arquivo.id = String(options.id)
	if (options.date) {
		arquivo.date = String(options.date)
	} else {
		// Data atual no formato YYYYMMDD
		const hoje = new Date()
		arquivo.date =
			hoje.getFullYear().toString() +
			String(hoje.getMonth() + 1).padStart(2, "0") +
			String(hoje.getDate()).padStart(2, "0")
	}
	if (options.note) arquivo.note = String(options.note)
	if (options.customer) arquivo.customer = String(options.customer)
	if (options.split_materials !== undefined)
		arquivo.split_materials = Boolean(options.split_materials)

	// Campo obrigatório - model (caminho do arquivo .CMZ)
	// Nota: backslashes devem ser escapados no JSON
	// Usa o caminho configurado se `options.model` não for informado
	const baseModel = getComelzModelBasePath()
	const normalizedBase = baseModel.endsWith("\\") ? baseModel : `${baseModel}\\`
	arquivo.model = String(options.model || normalizedBase)

	// qty rules
	arquivo.qty = Array.isArray(options.qty) ? options.qty : []

	return arquivo
}

/**
 * Cria uma qty-rule para usar com "parts" (requer mirror obrigatório)
 * @param {Object} options
 * @param {string} options.part_name - Nome da peça
 * @param {string} options.part_size - Tamanho (ex: "39.00")
 * @param {boolean} options.mirror - true para espelhado, false para original
 * @param {number} options.parts - Quantidade de peças
 */
export function criarQtyRuleParts({
	part_name,
	part_size,
	mirror,
	parts,
} = {}) {
	if (mirror === undefined || mirror === null) {
		throw new Error('Campo "mirror" é obrigatório quando usando "parts"')
	}
	const rule = {}
	if (part_name) rule.part_name = String(part_name)
	if (part_size) rule.part_size = formatPartSize(part_size)
	rule.mirror = Boolean(mirror)
	rule.parts = Number(parts) || 0
	rule.extra = ""
	return rule
}

/**
 * Cria uma qty-rule para usar com "items" (pares completos)
 * @param {Object} options
 * @param {string} options.part_name - Nome da peça (opt)
 * @param {string} options.part_size - Tamanho (opt, ex: "39.00")
 * @param {boolean} options.mirror - Mirror (opt, para half-pairs)
 */
export function criarQtyRuleItems({
	part_name,
	part_size,
	mirror,
} = {}) {
	const rule = {}
	if (part_name) rule.part_name = String(part_name)
	if (part_size) rule.part_size = formatPartSize(part_size)
	if (mirror !== undefined && mirror !== null) rule.mirror = Boolean(mirror)
	rule.extra = ""
	return rule
}
