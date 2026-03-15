// Script para importar dados de ocupação do CSV para o banco de dados
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, '../data/turno_history.db');
const CSV_PATH = path.join(__dirname, 'Ocupação.csv');

// Aceita --year=YYYY para forçar o ano das datas no CSV (padrão 2025)
const argv = process.argv.slice(2);
let YEAR_OVERRIDE = 2025;
for (const a of argv) {
    if (a && a.startsWith('--year=')) {
        const v = parseInt(a.split('=')[1], 10);
        if (!isNaN(v)) YEAR_OVERRIDE = v;
    }
}

// Mapeamento de turnos
const TURNO_MAP = {
    '1': 0,  // Turno 1 -> 0 no banco
    '2': 1,  // Turno 2 -> 1 no banco
    '3': 2   // Turno 3 -> 2 no banco
};

// Mapeamento de máquinas para grupos
const MACHINE_GROUP_MAP = {
    'Lectra': 'lectra',
    'Comelz': 'comelz',
    'Emma': 'emma',
    'Laser': 'laser'
};

/**
 * Conecta ao banco de dados SQLite
 */
async function getDB() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    return db;
}

// Garante que as tabelas existam
async function ensureTables(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS turno_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            turno INTEGER NOT NULL CHECK(turno IN (0,1,2)),
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
    `);
}

/**
 * Parse do CSV considerando o formato específico
 */
function parseCSV(content, yearOverride = YEAR_OVERRIDE) {
    const lines = content.split('\n');
    const data = [];
    
    // Linha 0: Dias da semana (ignorar)
    // Linha 1: Datas
    const dateRow = lines[1].split(';');
    
    // Encontrar onde começam as datas (após "Data")
    let dateStartIndex = -1;
    for (let i = 0; i < dateRow.length; i++) {
        if (dateRow[i] && dateRow[i].match(/\d{2}\/\d{2}/)) {
            dateStartIndex = i;
            break;
        }
    }
    
    if (dateStartIndex === -1) {
        throw new Error('Não foi possível encontrar as datas no CSV');
    }
    
    // Extrair datas
    const dates = [];
    for (let i = dateStartIndex; i < dateRow.length; i++) {
        if (dateRow[i] && dateRow[i].match(/\d{2}\/\d{2}/)) {
            dates.push(dateRow[i].trim());
        }
    }
    
    console.log(`Encontradas ${dates.length} datas no CSV`);
    
    // Processar linhas de dados (a partir da linha 2)
    let currentTurno = null;
    let turnoLineCount = { 0: 0, 1: 0, 2: 0 };
    
    for (let lineIdx = 2; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        if (!line.trim()) continue;
        
        const cells = line.split(';');
        
        // Primeira coluna: turno (1, 2 ou 3) ou vazio (mantém turno anterior)
        const turnoStr = cells[0]?.trim();
        // Verificar existência da chave no mapa (0 é valor válido)
        if (turnoStr && Object.prototype.hasOwnProperty.call(TURNO_MAP, turnoStr)) {
            currentTurno = TURNO_MAP[turnoStr];
        }
        
        // Se não temos turno definido, pular
        if (currentTurno === null) continue;
        
        const turno = currentTurno;
        
        // Segunda coluna: nome da máquina
        const machineName = cells[1]?.trim();
        if (!machineName || !MACHINE_GROUP_MAP[machineName]) continue;
        
        turnoLineCount[turno]++;
        
        const grupo = MACHINE_GROUP_MAP[machineName];
        const maquina = machineName.toLowerCase();
        
        // Processar porcentagens
        for (let i = 0; i < dates.length; i++) {
            const cellIdx = dateStartIndex + i;
            const cellValue = cells[cellIdx]?.trim();
            
            if (cellValue && cellValue.includes('%')) {
                // Remover % e converter para número
                const porcentagem = parseFloat(cellValue.replace('%', '').replace(',', '.'));
                
                if (!isNaN(porcentagem)) {
                    // Converter data DD/MM para YYYY-MM-DD usando yearOverride
                    const [day, month] = dates[i].split('/');
                    const year = String(yearOverride);
                    const dataFormatada = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    
                    data.push({
                        data: dataFormatada,
                        turno: turno,
                        grupo: grupo,
                        maquina: maquina,
                        porcentagem: porcentagem
                    });
                }
            }
        }
    }
    
    // Log de linhas processadas por turno
    console.log('\nLinhas processadas por turno:');
    console.log(`  Turno 1: ${turnoLineCount[0]} linhas`);
    console.log(`  Turno 2: ${turnoLineCount[1]} linhas`);
    console.log(`  Turno 3: ${turnoLineCount[2]} linhas`);
    
    // Log de contagem por turno
    const turnoCount = { 0: 0, 1: 0, 2: 0 };
    data.forEach(record => {
        turnoCount[record.turno]++;
    });
    
    console.log('\nRegistros com porcentagens encontradas:');
    console.log(`  Turno 1: ${turnoCount[0]} registros`);
    console.log(`  Turno 2: ${turnoCount[1]} registros`);
    console.log(`  Turno 3: ${turnoCount[2]} registros`);
    
    return data;
}

/**
 * Insere dados no banco
 */
async function insertData(db, records) {
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (const record of records) {
        try {
            await db.run(`
                INSERT INTO turno_history (data, turno, grupo, maquina, porcentagem)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(data, turno, grupo, maquina) 
                DO UPDATE SET porcentagem = excluded.porcentagem
            `, [record.data, record.turno, record.grupo, record.maquina, record.porcentagem]);
            
            // Verificar se foi insert ou update
            const result = await db.get('SELECT changes() as changes');
            if (result.changes > 0) {
                inserted++;
            } else {
                updated++;
            }
        } catch (error) {
            console.error(`Erro ao inserir registro:`, record, error.message);
            errors++;
        }
    }
    
    return { inserted, updated, errors };
}

/**
 * Função principal
 */
async function main() {
    console.log('=== Importação de Dados de Ocupação ===\n');
    
    // Verificar se CSV existe
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`Arquivo CSV não encontrado: ${CSV_PATH}`);
        process.exit(1);
    }
    
    console.log(`Lendo CSV: ${CSV_PATH}`);
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    
    console.log('Processando dados...');
    const records = parseCSV(csvContent, YEAR_OVERRIDE);
    console.log(`\nTotal de registros processados: ${records.length}`);
    
    // Mostrar alguns exemplos
    console.log('\nExemplos de dados processados:');
    records.slice(0, 5).forEach(r => {
        console.log(`  ${r.data} | Turno ${r.turno + 1} | ${r.maquina} | ${r.porcentagem}%`);
    });
    
    // Conectar ao banco
    console.log('\nConectando ao banco de dados...');
    const db = await getDB();
    // Garantir que tabela exista
    await ensureTables(db);
    
    // Inserir dados
    console.log('Inserindo dados no banco...');
    const result = await insertData(db, records);
    
    console.log('\n=== Resultado da Importação ===');
    console.log(`Registros inseridos: ${result.inserted}`);
    console.log(`Registros atualizados: ${result.updated}`);
    console.log(`Erros: ${result.errors}`);
    
    // Verificar alguns dados no banco
    console.log('\n=== Verificação dos dados (últimos 10 registros) ===');
    const samples = await db.all(`
        SELECT data, turno, grupo, maquina, porcentagem 
        FROM turno_history 
        ORDER BY data DESC, turno, maquina 
        LIMIT 10
    `);
    
    samples.forEach(r => {
        console.log(`${r.data} | Turno ${r.turno + 1} | ${r.maquina} | ${r.porcentagem}%`);
    });
    
    await db.close();
    console.log('\n✅ Importação concluída com sucesso!');
}

// Executar
main().catch(error => {
    console.error('❌ Erro durante a importação:', error);
    process.exit(1);
});
