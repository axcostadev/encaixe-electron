// Compat layer to expose the legacy db-persistent API backed by SQLite
import * as sqlite from './db-sqlite.js'
import { getDataPath as getJsonDataPath } from './db-persistent.js'

// initializeDatabase: ensure sqlite DB is ready
export async function initializeDatabase() {
    try {
        // call a lightweight op to ensure DB and tables are initialized
        await sqlite.getStats()
        return true
    } catch (e) {
        console.error('[DB-COMPAT] Falha ao inicializar SQLite:', e)
        throw e
    }
}

// insertTurnoReport compatibility (legacy signature)
export async function insertTurnoReport({ date, turno, maquina, periodo, porcentagem }) {
    if (!date || turno === undefined || !maquina) {
        throw new Error('Missing params for insertTurnoReport')
    }
    // Map grupo as empty for legacy callers; server typically calls per-group capture
    const grupo = ''
    await sqlite.saveTurnoData(date, turno, grupo, maquina, periodo || '', porcentagem || 0)
}

// getTurnoReport compatibility: returns array of records like legacy JSON loader
export async function getTurnoReport({ date, turno, maquinas } = {}) {
    // If date and turno specified, use getTurnoData which returns { maquina: { periodo: porcentagem } }
    if (date && (turno !== undefined && turno !== null)) {
        const data = await sqlite.getTurnoData(date, turno, null)
        const results = []
        for (const [maquina, periods] of Object.entries(data || {})) {
            for (const [periodo, porcentagem] of Object.entries(periods || {})) {
                results.push({ id: null, date, turno, maquina, periodo, porcentagem })
            }
        }
        // If maquinas filter provided, filter
        if (Array.isArray(maquinas) && maquinas.length > 0) {
            return results.filter(r => maquinas.includes(r.maquina))
        }
        return results
    }

    // Otherwise return range: use broad range query from sqlite
    const stats = await sqlite.getStats()
    if (!stats || !stats.primeira_data) return []
    const start = stats.primeira_data || stats.first_date || '1970-01-01'
    const end = stats.ultima_data || stats.last_date || start
    const rows = await sqlite.getTurnoDataRange(start, end, null)
    // rows contain id, data, turno, grupo, maquina, periodo, porcentagem
    return (rows || []).map(r => ({ id: r.id, date: r.data || r.date, turno: r.turno, maquina: r.maquina, periodo: r.periodo, porcentagem: r.porcentagem }))
}

// migrateMachineNames: rename maquina values in DB
export function migrateMachineNames(renameMap) {
    if (!renameMap || typeof renameMap !== 'object') return 0
    try {
        return sqlite.migrateMachineNames(renameMap)
    } catch (e) {
        console.warn('[DB-COMPAT] Erro ao migrar nomes de máquinas:', e)
        return 0
    }
}

export function flushSave() {
    // SQLite writes are immediate in this layer
}

export const dbStats = {
    // fill with basic stats wrapper
    asyncTotals: async () => await sqlite.getStats()
}

export function getDataPath() {
    // expose the JSON data path for tooling/UI; underlying DB path is different
    try {
        return getJsonDataPath()
    } catch (_) {
        try { return sqlite.getDBPathExport() } catch (e) { return null }
    }
}

export default {
    initializeDatabase,
    insertTurnoReport,
    getTurnoReport,
    migrateMachineNames,
    flushSave,
    dbStats,
    getDataPath
}
