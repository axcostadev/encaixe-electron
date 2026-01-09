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

/**
 * Converte o sentido do material para o formato fabric_constraint_name do Lectra
 * @param {string} sentido - 'S', 'N' ou 'U'
 * @returns {string} fabric_constraint_name
 */
function sentidoParaFabricConstraint(sentido) {
  switch ((sentido || '').toUpperCase()) {
    case 'S':
      return 'S-SENTIDO'
    case 'N':
      return 'N-SEM SENTIDO'
    case 'U':
      return 'U-UNICO'
    default:
      return 'S-SENTIDO'
  }
}

export function gerarMKX(modelos = [], options = {}) {
  const lines = []
  const add = (k, v) => lines.push(`${k}=${v}`)

  // Espaçamento - usa o valor do cadastro ou padrão 1.5
  const espacamento = options.espacamento ?? options.marker_global_space ?? 1.5
  const espacamentoFormatado = Number(espacamento).toFixed(4)

  // Sentido do material - converte para fabric_constraint_name
  const fabricConstraint = options.fabric_constraint_name ?? sentidoParaFabricConstraint(options.sentidoMaterial)

  lines.push('begin_of_marker')
  add('unit_number_in_meter', options.unit_number_in_meter ?? 1000)
  add('unit_number_in_degree', options.unit_number_in_degree ?? 60)
  add('format_marker', options.format_marker ?? 'plx')
  add('format_model', options.format_model ?? 'xch')
  add('format_part', options.format_part ?? 'stg')
  add('marker_name', options.marker_name ?? '')
  add('marker_code', options.marker_code ?? '')
  add('marker_criticity', options.marker_criticity ?? 'undefined')
  add('marker_criticity_percentage', options.marker_criticity_percentage ?? 0.0)
  add('marker_quality', options.marker_quality ?? 'undefined')
  // Espaçamento das peças - todos usam o mesmo valor do cadastro
  add('marker_global_space', espacamentoFormatado)
  add('marker_global_space_top', espacamentoFormatado)
  add('marker_global_space_bottom', espacamentoFormatado)
  add('marker_global_space_right', espacamentoFormatado)
  add('marker_global_space_left', espacamentoFormatado)
  add('marker_move_tolerance', options.marker_move_tolerance ?? 0.0)
  add('marker_number_overlaps', options.marker_number_overlaps ?? 0)
  add('marker_fine_rotation', options.marker_fine_rotation ?? 0)
  add('marker_targeted_efficiency', options.marker_targeted_efficiency ?? 0.0)
  add('width_value', options.width_value ?? 1350)
  add('width_max_length', options.width_max_length ?? 3900)
  add('width_border', options.width_border ?? 0.0)
  add('width_spacing_start', options.width_spacing_start ?? 0)
  add('width_spacing_end', options.width_spacing_end ?? 0)
  add('width_spacing_bottom', options.width_spacing_bottom ?? 0)
  add('width_spacing_top', options.width_spacing_top ?? 0)
  add('fabric_packaging', options.fabric_packaging ?? 'simple_ply')
  // Sentido do material
  add('fabric_constraint_name', fabricConstraint)
  add('fabric_type', options.fabric_type ?? 9)
  add('oversewing', options.oversewing ?? 0.0)
  add('weft_origin', options.weft_origin ?? 0.0)
  add('weft_step_vertical', options.weft_step_vertical ?? 0.0)
  add('weft_step_horizontal', options.weft_step_horizontal ?? 0.0)

  add('marker_length', options.marker_length ?? 0)
  add('marker_efficiency', options.marker_efficiency ?? 0.0)
  add('perimeter_marked_pieces', options.perimeter_marked_pieces ?? 0)
  add('straight_lines_marked_pieces', options.straight_lines_marked_pieces ?? 0.0)
  add('curves_marked_pieces', options.curves_marked_pieces ?? 0)
  add('marked_pieces_area', options.marked_pieces_area ?? 0)
  add('cut_perimeter', options.cut_perimeter ?? 0)
  add('notch_number', options.notch_number ?? 0)
  add('angle_number', options.angle_number ?? 0)
  add('internal_points_number', options.internal_points_number ?? 0)

  // Data e hora de criação - mesmo valor para criação e modificação
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = String(now.getFullYear())
  const dateStr = dd + mm + yyyy
  const timeStr = now.toTimeString().split(' ')[0]

  add('marker_creation_date', options.marker_creation_date ?? dateStr)
  add('marker_creation_time', options.marker_creation_time ?? timeStr)
  add('marker_last_modification_date', options.marker_last_modification_date ?? dateStr)
  add('marker_last_modification_time', options.marker_last_modification_time ?? timeStr)
  add('marker_realisation_type', options.marker_realisation_type ?? 'manual')

  const markedPiecesNumber = modelos.reduce((s, m) => s + Number(m.a || 0), 0)
  add('marked_pieces_number', options.marked_pieces_number ?? markedPiecesNumber)
  add('non_marked_pieces_number', options.non_marked_pieces_number ?? 0)

  // Seção de modelos - cada tamanho/pares gera um bloco
  for (const m of modelos) {
    lines.push('begin_of_model')
    add('model_format', options.model_format ?? 'xch')
    add('model_file_name_extension', options.model_file_name_extension ?? 'xch')
    // model_variant: artigo (ex: COR43245330)
    add('model_variant', m.codigo || '')
    // model_size: numeração/tamanho (ex: 38)
    add('model_size', m.tamanho || '')
    add('model_direction_reverse', options.model_direction_reverse ?? 'normal')
    add('model_group', options.model_group ?? 1)
    // model_quantity e model_fully_marked_number: pares (mesmo valor)
    add('model_quantity', m.a ?? 0)
    add('model_type', options.model_type ?? 'normal')
    add('model_fully_marked_number', m.a ?? 0)
    add('model_partly_marked_number', 0)
    add('model_non_marked_number', 0)
    lines.push('end_of_model')
  }

  lines.push('end_of_marker')
  return lines.join('\n')
}

/**
 * Converte parsedCTF/parsedCTC + cadastro/options para o conteúdo .mkx
 * @param {Array} parsedCTF
 * @param {Array} parsedCTC
 * @param {Object} cadastro - { artigo, cor, material, id, of, apelido, espacamento, sentidoMaterial }
 * @param {Object} options - override de campos MKX
 * @returns {string} conteúdo MKX
 */
export function converterParaMKX(parsedCTF = [], parsedCTC = [], cadastro = {}, options = {}) {
  // Gera array de modelos usando a função existente
  const modelos = converterParaModelData(parsedCTF, parsedCTC, options)

  // Monta marker_name: OF + _ + apelido (ex: 435020476_PLACA_DO_FORRO_DA_ESPUMA)
  const of = (cadastro && cadastro.of) || (cadastro && cadastro.id) || ''
  const apelido = (cadastro && cadastro.apelido) || (cadastro && cadastro.componente) || ''
  // Formata o apelido: substitui espaços por underscore e converte para maiúsculo
  const apelidoFormatado = apelido.replace(/\s+/g, '_').toUpperCase()
  const markerNameDefault = of ? (of + (apelidoFormatado ? '_' + apelidoFormatado : '')) : apelidoFormatado

  // Espaçamento do cadastro
  const espacamento = (cadastro && cadastro.espacamento) || options.espacamento || 1.5

  // Sentido do material - vem do material associado ao componente
  const sentidoMaterial = (cadastro && cadastro.sentidoMaterial) || options.sentidoMaterial || 'S'

  // Largura do material
  const largura = (cadastro && cadastro.largura) || options.width_value || 1350

  const mkxOptions = Object.assign(
    {
      marker_name: options.marker_name ?? markerNameDefault,
      marker_code: options.marker_code ?? '',
      // Espaçamento das peças do cadastro
      espacamento: espacamento,
      // Sentido do material
      sentidoMaterial: sentidoMaterial,
      // Largura do material
      width_value: largura,
      width_max_length: options.width_max_length ?? 3900,
    },
    options,
  )

  // Chamamos gerarMKX para montar o arquivo .mkx
  return gerarMKX(modelos, mkxOptions)
}

/**
 * Função legada - compatibilidade rápida que retorna string .mkx
 */
export function converterParaMkxLectra(parsedCTF = [], parsedCTC = [], cadastro = {}, options = {}) {
  return converterParaMKX(parsedCTF, parsedCTC, cadastro, options)
}
