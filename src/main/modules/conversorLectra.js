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

export function gerarMKX(modelos = [], options = {}) {
  const lines = []
  const add = (k, v) => lines.push(`${k}=${v}`)

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
  add('marker_global_space', options.marker_global_space ?? 1.5)
  add('marker_global_space_top', options.marker_global_space_top ?? 1.5)
  add('marker_global_space_bottom', options.marker_global_space_bottom ?? 1.5)
  add('marker_global_space_right', options.marker_global_space_right ?? 1.5)
  add('marker_global_space_left', options.marker_global_space_left ?? 1.5)
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
  add('fabric_constraint_name', options.fabric_constraint_name ?? 'S-SENTIDO')
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

  for (const m of modelos) {
    lines.push('begin_of_model')
    add('model_format', options.model_format ?? 'xch')
    add('model_file_name_extension', options.model_file_name_extension ?? 'xch')
    add('model_variant', m.codigo || '')
    add('model_size', m.tamanho || '')
    add('model_direction_reverse', options.model_direction_reverse ?? 'normal')
    add('model_group', options.model_group ?? 1)
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
 * @param {Object} cadastro - { artigo, cor, material, id }
 * @param {Object} options - override de campos MKX
 * @returns {string} conteúdo MKX
 */
export function converterParaMKX(parsedCTF = [], parsedCTC = [], cadastro = {}, options = {}) {
  // Gera array de modelos usando a função existente
  const modelos = converterParaModelData(parsedCTF, parsedCTC, options)

  // Monta marker_name padrão: artigo_cor ou id
  const artigo = (cadastro && cadastro.artigo) || ''
  const cor = (cadastro && cadastro.cor) || ''
  const cadId = (cadastro && cadastro.id) || ''
  const markerNameDefault = artigo ? (artigo + (cor ? '_' + cor : '')) : cadId

  const mkxOptions = Object.assign(
    {
      marker_name: options.marker_name ?? markerNameDefault,
      marker_code: options.marker_code ?? (cadastro && cadastro.id) ?? '',
      // permite sobrescrever meta-dados importantes pelo options
      width_value: options.width_value ?? 1350,
      width_max_length: options.width_max_length ?? 3900,
      fabric_constraint_name: options.fabric_constraint_name ?? 'S-SENTIDO',
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
