// Serviço de banco de dados SQLite3 para histórico de turnos
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// Obter caminho do banco de dados baseado no ambiente
function getDBPath() {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    if (isDev) {
        // Em desenvolvimento, usa a pasta data no projeto
        const projectDataDir = path.join(process.cwd(), 'data');
        return path.join(projectDataDir, 'turno_history.db');
    } else {
        // Em produção, usa userData
        const userDataDir = path.join(app.getPath('userData'), 'data');
        return path.join(userDataDir, 'turno_history.db');
    }
}

const DB_PATH = getDBPath();

console.log('[DB-SQLITE] Caminho do banco:', DB_PATH);

let db = null;

// Conecta ao banco SQLite3
async function getDB() {
    if (db) return db;
    
    // Garantir que o diretório existe
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    
    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    // Inicializar tabelas se não existirem
    await initTables();
    
    return db;
}

// Inicializa as tabelas
async function initTables() {
    const database = await getDB();
    
    await database.exec(`
        CREATE TABLE IF NOT EXISTS turno_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            turno INTEGER NOT NULL CHECK(turno IN (0, 1, 2)),
            grupo TEXT NOT NULL,
            maquina TEXT NOT NULL,
            porcentagem REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(data, turno, grupo, maquina)
        );

        CREATE INDEX IF NOT EXISTS idx_data ON turno_history(data);
        CREATE INDEX IF NOT EXISTS idx_turno ON turno_history(turno);
        CREATE INDEX IF NOT EXISTS idx_grupo ON turno_history(grupo);
        CREATE INDEX IF NOT EXISTS idx_maquina ON turno_history(maquina);
        CREATE INDEX IF NOT EXISTS idx_data_turno ON turno_history(data, turno);
        CREATE INDEX IF NOT EXISTS idx_grupo_maquina ON turno_history(grupo, maquina);
    `);
}

// Salva dados de um turno
export async function saveTurnoData(data, turno, grupo, maquina, porcentagem) {
    const database = await getDB();
    
    await database.run(
        `INSERT OR REPLACE INTO turno_history (data, turno, grupo, maquina, porcentagem) 
         VALUES (?, ?, ?, ?, ?)`,
        [data, turno, grupo, maquina, porcentagem]
    );
    
    console.log(`[SQLite] Salvo: ${data} T${turno + 1} ${grupo}/${maquina} = ${porcentagem}%`);
}

// Salva múltiplos registros de uma vez (batch)
export async function saveTurnoDataBatch(registros) {
    const database = await getDB();
    
    await database.exec('BEGIN TRANSACTION');
    
    try {
        for (const reg of registros) {
            await database.run(
                `INSERT OR REPLACE INTO turno_history (data, turno, grupo, maquina, porcentagem) 
                 VALUES (?, ?, ?, ?, ?)`,
                [reg.data, reg.turno, reg.grupo, reg.maquina, reg.porcentagem]
            );
        }
        
        await database.exec('COMMIT');
        console.log(`[SQLite] Salvos ${registros.length} registros em batch`);
    } catch (error) {
        await database.exec('ROLLBACK');
        throw error;
    }
}

// Busca dados de um turno específico
export async function getTurnoData(data, turno, grupo = null) {
    const database = await getDB();
    
    let query = `
        SELECT maquina, porcentagem 
        FROM turno_history 
        WHERE data = ? AND turno = ?
    `;
    
    const params = [data, turno];
    
    if (grupo) {
        query += ' AND grupo = ?';
        params.push(grupo);
    }
    
    query += ' ORDER BY maquina';
    
    const rows = await database.all(query, params);
    
    // Converter para formato {maquina: porcentagem}
    const result = {};
    rows.forEach(row => {
        result[row.maquina] = row.porcentagem;
    });
    
    return result;
}

// Busca dados de múltiplos turnos (para dashboard/ranking)
export async function getTurnoDataRange(dataInicio, dataFim, grupo = null) {
    const database = await getDB();
    
    let query = `
        SELECT data, turno, grupo, maquina, porcentagem 
        FROM turno_history 
        WHERE data >= ? AND data <= ?
    `;
    
    const params = [dataInicio, dataFim];
    
    if (grupo) {
        // Comparação case-insensitive para o grupo
        query += ' AND LOWER(grupo) = LOWER(?)';
        params.push(grupo);
    }
    
    query += ' ORDER BY data DESC, turno, grupo, maquina';
    
    return await database.all(query, params);
}

// Busca ranking de máquinas por período
export async function getRankingByPeriod(dataInicio, dataFim, grupo = null) {
    const database = await getDB();
    
    let query = `
        SELECT 
            maquina,
            grupo,
            AVG(porcentagem) as media,
            COUNT(*) as total_turnos
        FROM turno_history 
        WHERE data >= ? AND data <= ?
    `;
    
    const params = [dataInicio, dataFim];
    
    if (grupo) {
        // Comparação case-insensitive para o grupo
        query += ' AND LOWER(grupo) = LOWER(?)';
        params.push(grupo);
    }
    
    query += `
        GROUP BY maquina, grupo
        ORDER BY media DESC
    `;
    
    return await database.all(query, params);
}

// Busca última data disponível no banco
export async function getLastDate() {
    const database = await getDB();
    
    const row = await database.get(`
        SELECT MAX(data) as last_date 
        FROM turno_history
    `);
    
    return row?.last_date || null;
}

// Verifica se existe dado para uma data/turno específico
export async function hasData(data, turno, grupo = null) {
    const database = await getDB();
    
    let query = `
        SELECT COUNT(*) as count 
        FROM turno_history 
        WHERE data = ? AND turno = ?
    `;
    
    const params = [data, turno];
    
    if (grupo) {
        query += ' AND grupo = ?';
        params.push(grupo);
    }
    
    const row = await database.get(query, params);
    
    return row.count > 0;
}

// Deleta dados de uma data específica (útil para reimportar)
export async function deleteTurnoData(data, turno = null, grupo = null) {
    const database = await getDB();
    
    let query = 'DELETE FROM turno_history WHERE data = ?';
    const params = [data];
    
    if (turno !== null) {
        query += ' AND turno = ?';
        params.push(turno);
    }
    
    if (grupo) {
        query += ' AND grupo = ?';
        params.push(grupo);
    }
    
    const result = await database.run(query, params);
    
    console.log(`[SQLite] Deletados ${result.changes} registros`);
    return result.changes;
}

// Estatísticas do banco
export async function getStats() {
    const database = await getDB();
    
    const stats = await database.get(`
        SELECT 
            COUNT(*) as total_registros,
            COUNT(DISTINCT data) as total_dias,
            COUNT(DISTINCT maquina) as total_maquinas,
            MIN(data) as primeira_data,
            MAX(data) as ultima_data
        FROM turno_history
    `);
    
    return stats;
}

// Fecha conexão com o banco
export async function closeDB() {
    if (db) {
        await db.close();
        db = null;
        console.log('[SQLite] Conexão fechada');
    }
}

// Exporta o caminho do banco (útil para backup)
export function getDBPathExport() {
    return DB_PATH;
}

export default {
    saveTurnoData,
    saveTurnoDataBatch,
    getTurnoData,
    getTurnoDataRange,
    getRankingByPeriod,
    getLastDate,
    hasData,
    deleteTurnoData,
    getStats,
    closeDB
};
