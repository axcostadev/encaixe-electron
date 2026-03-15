// Script para verificar se há dados do Turno 1
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/turno_history.db');

async function verificarTurno1() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log('\n=== VERIFICANDO TURNO 1 ===\n');

    const turno1 = await db.all(`
        SELECT COUNT(*) as total, MIN(data) as primeira_data, MAX(data) as ultima_data
        FROM turno_history
        WHERE turno = 0
    `);

    console.log(`Total de registros do Turno 1: ${turno1[0].total}`);
    console.log(`Primeira data: ${turno1[0].primeira_data || 'N/A'}`);
    console.log(`Última data: ${turno1[0].ultima_data || 'N/A'}\n`);

    if (turno1[0].total > 0) {
        console.log('📋 Primeiros 10 registros do Turno 1:');
        const primeiros = await db.all(`
            SELECT data, maquina, porcentagem
            FROM turno_history
            WHERE turno = 0
            ORDER BY data, maquina
            LIMIT 10
        `);

        primeiros.forEach(row => {
            console.log(`   ${row.data} | ${row.maquina.padEnd(8)} | ${row.porcentagem}%`);
        });

        console.log('\n📋 Últimos 10 registros do Turno 1:');
        const ultimos = await db.all(`
            SELECT data, maquina, porcentagem
            FROM turno_history
            WHERE turno = 0
            ORDER BY data DESC, maquina
            LIMIT 10
        `);

        ultimos.forEach(row => {
            console.log(`   ${row.data} | ${row.maquina.padEnd(8)} | ${row.porcentagem}%`);
        });
    } else {
        console.log('❌ Nenhum registro do Turno 1 encontrado!');
        console.log('\nVerificando estrutura do CSV...');
    }

    await db.close();
}

verificarTurno1().catch(console.error);
