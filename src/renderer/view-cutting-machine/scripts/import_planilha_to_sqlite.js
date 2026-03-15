// Script para importar dados históricos de planilha para SQLite3
// Uso: node scripts/import_planilha_to_sqlite.js <caminho_da_planilha.xlsx>

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, '../data/turno_history.db');

// Conecta ao banco SQLite3
async function connectDB() {
    return await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
}

// Inicializa o banco de dados
async function initDatabase() {
    const db = await connectDB();
    
    // Criar tabela se não existir
    await db.exec(`
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
    `);
    
    console.log('✅ Banco de dados inicializado');
    return db;
}

// Importa dados de CSV
async function importCSV(csvPath) {
    const db = await initDatabase();
    
    // Ler arquivo CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Remover cabeçalho
    const header = lines[0].split(',').map(h => h.trim());
    console.log('📋 Cabeçalhos:', header);
    
    let imported = 0;
    let skipped = 0;
    
    // Processar cada linha
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        // Formato esperado: data,turno,grupo,maquina,porcentagem
        // Exemplo: 06/12/2025,0,Laser,02-2010,80
        const [dataStr, turnoStr, grupo, maquina, porcentagemStr] = values;
        
        if (!dataStr || !turnoStr || !grupo || !maquina || !porcentagemStr) {
            console.warn(`⚠️  Linha ${i + 1} ignorada (dados incompletos):`, lines[i]);
            skipped++;
            continue;
        }
        
        // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
        const [dia, mes, ano] = dataStr.split('/');
        const data = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        
        const turno = parseInt(turnoStr);
        const porcentagem = parseFloat(porcentagemStr);
        
        try {
            await db.run(
                'INSERT OR REPLACE INTO turno_history (data, turno, grupo, maquina, porcentagem) VALUES (?, ?, ?, ?, ?)',
                [data, turno, grupo, maquina, porcentagem]
            );
            imported++;
            
            if (imported % 100 === 0) {
                console.log(`📊 Importados ${imported} registros...`);
            }
        } catch (error) {
            console.error(`❌ Erro na linha ${i + 1}:`, error.message);
            skipped++;
        }
    }
    
    await db.close();
    
    console.log('\n✅ Importação concluída!');
    console.log(`   - Registros importados: ${imported}`);
    console.log(`   - Registros ignorados: ${skipped}`);
}

// Importa dados de JSON antigo
async function importJSON(jsonPath) {
    const db = await initDatabase();
    
    // Ler arquivo JSON
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    let imported = 0;
    let skipped = 0;
    
    // Processar estrutura JSON
    for (const [date, turnos] of Object.entries(data)) {
        if (!turnos || typeof turnos !== 'object') continue;
        
        for (const [turnoKey, grupos] of Object.entries(turnos)) {
            const turno = parseInt(turnoKey.replace('turno', '')) - 1; // turno1 = 0, turno2 = 1, turno3 = 2
            
            if (!grupos || typeof grupos !== 'object') continue;
            
            for (const [grupo, maquinas] of Object.entries(grupos)) {
                if (!maquinas || typeof maquinas !== 'object') continue;
                
                for (const [maquina, porcentagem] of Object.entries(maquinas)) {
                    try {
                        await db.run(
                            'INSERT OR REPLACE INTO turno_history (data, turno, grupo, maquina, porcentagem) VALUES (?, ?, ?, ?, ?)',
                            [date, turno, grupo, maquina, parseFloat(porcentagem)]
                        );
                        imported++;
                        
                        if (imported % 100 === 0) {
                            console.log(`📊 Importados ${imported} registros...`);
                        }
                    } catch (error) {
                        console.error(`❌ Erro ao importar ${date}/${turno}/${grupo}/${maquina}:`, error.message);
                        skipped++;
                    }
                }
            }
        }
    }
    
    await db.close();
    
    console.log('\n✅ Importação concluída!');
    console.log(`   - Registros importados: ${imported}`);
    console.log(`   - Registros ignorados: ${skipped}`);
}

// Execução principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
📥 Script de Importação para SQLite3

Uso:
  node scripts/import_planilha_to_sqlite.js <arquivo>

Formatos suportados:
  - CSV: data,turno,grupo,maquina,porcentagem
  - JSON: estrutura do turno_report.json

Exemplos:
  node scripts/import_planilha_to_sqlite.js planilha.csv
  node scripts/import_planilha_to_sqlite.js data/turno_report.json
        `);
        process.exit(1);
    }
    
    const filePath = args[0];
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Arquivo não encontrado: ${filePath}`);
        process.exit(1);
    }
    
    const ext = path.extname(filePath).toLowerCase();
    
    console.log(`\n📂 Importando dados de: ${filePath}\n`);
    
    if (ext === '.csv') {
        await importCSV(filePath);
    } else if (ext === '.json') {
        await importJSON(filePath);
    } else {
        console.error(`❌ Formato não suportado: ${ext}`);
        console.log('   Use .csv ou .json');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
