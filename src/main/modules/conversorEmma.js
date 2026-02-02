// Converte parsed results para estrutura completa de exportação Emma
// Implementa a lógica do ConversorEmma Java com constantes
// parsedCTF/parsedCTC: arrays de blocos { of, linhas }
// cadastro: objeto { artigo, cor, material, customer, id, model, pastaArtigo, componente }
// options: objeto opcional { customer, date, id, model, mirror, pastaArtigo, componente }

import { getEmmaModelBasePath } from "../settings.js"

// Caminho base configurável para modelos Emma
const EMMA_BASE_PATH = getEmmaModelBasePath()

/**
 * Formata a data atual no formato YYYYMMDD
 */
function formatDateEmma(date = new Date()) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}${month}${day}`
}

/**
 * Constrói o caminho completo do modelo Emma
 * Formato: O:\Lectra\Calcado\Modelos\EMMA\{pastaArtigo}\{componente}.emp
 * @param {string} pastaArtigo - Nome da pasta do artigo (ex: "COR3025911 - UA SPAWN 3")
 * @param {string} componente - Nome do componente (ex: "PLACA PUXADOR TRASEIRO ENFEITE LATERAL")
 * @returns {string} Caminho completo do modelo
 */
export function buildModelPath(pastaArtigo, componente) {
	if (!pastaArtigo || !componente) return ""

	// Remove extensão .emp se já existir no componente
	const nomeComponente = componente.replace(/\.emp$/i, "")

	return `${EMMA_BASE_PATH}\\${pastaArtigo}\\${nomeComponente}.emp`
}

/**
 * Cria um item qty com valores padrão
 */
function createQtyItem(
	partName,
	partSize,
	parts,
	materialName,
	mirror = false,
	materialY = 10,
	materialPliesUp = 12,
) {
	const partSizeFormatted = (() => {
		const n = Number(partSize)
		if (!isNaN(n)) return n.toFixed(2)
		return String(partSize)
	})()

	return {
		part_name: partName,
		part_size: partSizeFormatted,
		mirror: mirror,
		parts: parts,
		angle: 90,
		toler: 10,
		material_name: materialName,
		material_x: 1.41,
		material_y: materialY,
		material_unit: "m",
		part_space: 1.5,
		material_plies_up: materialPliesUp,
		material_plies_down: 0,
		material_margin: 0,
	}
}

/**
 * Converte dados parseados para estrutura completa Emma
 * @param {Array} parsedCTF - Blocos CTF parseados
 * @param {Array} parsedCTC - Blocos CTC parseados
 * @param {Object} cadastro - Dados de cadastro { artigo, cor, material }
 * @param {Object} options - Opções adicionais { customer, date, id, pastaArtigo, componente, generateMirror }
 * @returns {Array} Array com objeto(s) no formato Emma
 */
export function converterParaEmma(
	parsedCTF = [],
	parsedCTC = [],
	cadastro = {},
	options = {},
) {
	const {
		customer = "",
		date = formatDateEmma(),
		id = "",
		pastaArtigo = "", // Ex: "COR3025911 - UA SPAWN 3"
		componente = "", // Ex: "PLACA PUXADOR TRASEIRO ENFEITE LATERAL"
		generateMirror = false, // Se true, gera entradas duplicadas com mirror: true
	} = options

	const listaQty = []

	// Nome do componente para usar no part_name
	const nomeComponente = componente || (cadastro && cadastro.componente) || ""
	console.log("[conversorEmma] options.componente:", componente)
	console.log(
		"[conversorEmma] cadastro.componente:",
		cadastro && cadastro.componente,
	)
	console.log("[conversorEmma] nomeComponente final:", nomeComponente)

	// Helper: for matching CTC lines by artigo+codigoCor
	const mapCTCByKey = new Map()
	for (const bloco of parsedCTC) {
		for (const l of bloco.linhas || []) {
			const key =
				(l.artigo || "").toString().trim() +
				"|" +
				(l.codigoCor || l.grade || "").toString().trim()
			if (!mapCTCByKey.has(key)) mapCTCByKey.set(key, l)
		}
	}

	// If there are CTF blocks, process them (prioridade)
	if (Array.isArray(parsedCTF) && parsedCTF.length > 0) {
		for (const bloco of parsedCTF) {
			for (const linha of bloco.linhas || []) {
				let artigo = (linha.artigo || "").toString().trim()
				let codigoCor = (linha.codigoCor || linha.grade || linha.modelo || "")
					.toString()
					.trim()
				const quantidadePares = Number(linha.pares || 0)

				let materialNome =
					cadastro && cadastro.material ? String(cadastro.material) : ""
				const key = artigo + "|" + codigoCor
				const lctc = mapCTCByKey.get(key)
				if (lctc && lctc.especificacaoTecnica) {
					materialNome =
						(materialNome ? materialNome + " - " : "") +
						String(lctc.especificacaoTecnica).trim()
				}

				if (!artigo) artigo = (cadastro && cadastro.artigo) || ""
				if (!codigoCor) codigoCor = (cadastro && cadastro.cor) || ""

				// Usa o nome do componente como part_name
				const partName = nomeComponente || artigo

				// Adiciona item normal (mirror: false)
				listaQty.push(
					createQtyItem(
						partName,
						codigoCor,
						quantidadePares,
						materialNome,
						false,
					),
				)

				// Se generateMirror, adiciona item espelhado (mirror: true)
				if (generateMirror) {
					listaQty.push(
						createQtyItem(
							partName,
							codigoCor,
							quantidadePares,
							materialNome,
							true,
						),
					)
				}
			}
		}
	}
	// else use CTC blocks
	else if (Array.isArray(parsedCTC) && parsedCTC.length > 0) {
		for (const bloco of parsedCTC) {
			for (const linha of bloco.linhas || []) {
				let artigo = (linha.artigo || "").toString().trim()
				let codigoCor = (linha.codigoCor || linha.grade || linha.modelo || "")
					.toString()
					.trim()
				const quantidadePares = Number(linha.pares || 0)

				let materialNome =
					cadastro && cadastro.material ? String(cadastro.material) : ""
				if (linha.especificacaoTecnica) {
					materialNome =
						(materialNome ? materialNome + " - " : "") +
						String(linha.especificacaoTecnica).trim()
				}

				if (!artigo) artigo = (cadastro && cadastro.artigo) || ""
				if (!codigoCor) codigoCor = (cadastro && cadastro.cor) || ""

				// Usa o nome do componente como part_name
				const partName = nomeComponente || artigo

				// Adiciona item normal (mirror: false)
				listaQty.push(
					createQtyItem(
						partName,
						codigoCor,
						quantidadePares,
						materialNome,
						false,
					),
				)

				// Se generateMirror, adiciona item espelhado (mirror: true)
				if (generateMirror) {
					listaQty.push(
						createQtyItem(
							partName,
							codigoCor,
							quantidadePares,
							materialNome,
							true,
						),
					)
				}
			}
		}
	}
	// else fallback to cadastro-only
	else {
		const artigo = (cadastro && cadastro.artigo) || ""
		const codigoCor = (cadastro && cadastro.cor) || ""
		const materialNome = (cadastro && cadastro.material) || ""
		const partName = nomeComponente || artigo

		listaQty.push(createQtyItem(partName, codigoCor, 0, materialNome, false))

		if (generateMirror) {
			listaQty.push(createQtyItem(partName, codigoCor, 0, materialNome, true))
		}
	}

	// Monta o caminho do modelo automaticamente
	const modelPath = buildModelPath(
		pastaArtigo || (cadastro && cadastro.pastaArtigo) || "",
		componente || (cadastro && cadastro.componente) || "",
	)

	// Monta estrutura completa Emma
	const emmaObject = {
		customer: customer || (cadastro && cadastro.customer) || "",
		date: date,
		id: id || (cadastro && cadastro.id) || "",
		model: modelPath,
		qty: listaQty,
	}

	// Retorna como array (padrão Emma)
	return [emmaObject]
}

/**
 * Função legada - retorna apenas o array qty para compatibilidade
 * @deprecated Use converterParaEmma para estrutura completa
 */
export function converterParaQtyEmma(
	parsedCTF = [],
	parsedCTC = [],
	cadastro = {},
	options = {},
) {
	const result = converterParaEmma(parsedCTF, parsedCTC, cadastro, options)
	return result[0]?.qty || []
}
