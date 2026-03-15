// Script para verificar se os dados foram importados corretamente
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/turno_history.db');

async function verificarDados() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log('\n=== VERIFICAÇÃO DOS DADOS IMPORTADOS ===\n');

    // 1. Estatísticas gerais
    const stats = await db.get(`
        SELECT 
            COUNT(*) as total,
            MIN(data) as primeira_data,
            MAX(data) as ultima_data
        FROM turno_history
    `);

    console.log('📊 ESTATÍSTICAS GERAIS:');
    console.log(`   Total de registros: ${stats.total}`);
    console.log(`   Primeira data: ${stats.primeira_data}`);
    console.log(`   Última data: ${stats.ultima_data}\n`);

    // 2. Estatísticas por máquina e turno
    const porMaquina = await db.all(`
        SELECT 
            maquina,
            turno,
            COUNT(*) as total,
            MIN(porcentagem) as min_pct,
            MAX(porcentagem) as max_pct,
            CAST(AVG(porcentagem) AS INTEGER) as media
        FROM turno_history
        GROUP BY maquina, turno
        ORDER BY maquina, turno
    `);

    console.log('📈 ESTATÍSTICAS POR MÁQUINA E TURNO:');
    porMaquina.forEach(row => {
        console.log(`   ${row.maquina.padEnd(8)} | Turno ${row.turno + 1} | Registros: ${String(row.total).padStart(3)} | Min: ${String(row.min_pct).padStart(2)}% | Max: ${String(row.max_pct).padStart(2)}% | Média: ${String(row.media).padStart(2)}%`);
    });

    // 3. Verificar datas específicas das imagens
    console.log('\n🔍 VERIFICAÇÃO DE DADOS ESPECÍFICOS (comparando com planilha):\n');

    const datasParaVerificar = [
        { data: '2024-07-18', turno: 0, maquina: 'laser', esperado: 57 },
        { data: '2024-07-19', turno: 0, maquina: 'laser', esperado: 69 },
        { data: '2024-10-06', turno: 0, maquina: 'lectra', esperado: 65 },
        { data: '2024-10-07', turno: 0, maquina: 'lectra', esperado: 63 },
        { data: '2024-11-06', turno: 0, maquina: 'lectra', esperado: 71 },
        { data: '2024-11-07', turno: 0, maquina: 'lectra', esperado: 65 },
        { data: '2024-12-06', turno: 0, maquina: 'lectra', esperado: 79 },
    ];

    for (const teste of datasParaVerificar) {
        const row = await db.get(
            'SELECT * FROM turno_history WHERE data = ? AND turno = ? AND maquina = ?',
            [teste.data, teste.turno, teste.maquina]
        );

        if (row) {
            const status = row.porcentagem === teste.esperado ? '✅' : '❌';
            console.log(`   ${status} ${teste.data} | Turno ${teste.turno + 1} | ${teste.maquina} | Obtido: ${row.porcentagem}% | Esperado: ${teste.esperado}%`);
        } else {
            console.log(`   ❌ ${teste.data} | Turno ${teste.turno + 1} | ${teste.maquina} | NÃO ENCONTRADO (Esperado: ${teste.esperado}%)`);
        }
    }

    // 4. Mostrar alguns registros recentes
    console.log('\n📅 ÚLTIMOS 15 REGISTROS:');
    const ultimos = await db.all(`
        SELECT data, turno, maquina, porcentagem
        FROM turno_history
        ORDER BY data DESC, turno, maquina
        LIMIT 15
    `);

    ultimos.forEach(row => {
        console.log(`   ${row.data} | Turno ${row.turno + 1} | ${row.maquina.padEnd(8)} | ${row.porcentagem}%`);
    });

    // 5. Verificar se há dados para todas as máquinas
    console.log('\n🏭 CONTAGEM POR MÁQUINA:');
    const porMaquinaTotal = await db.all(`
        SELECT maquina, COUNT(*) as total
        FROM turno_history
        GROUP BY maquina
        ORDER BY maquina
    `);

    porMaquinaTotal.forEach(row => {
        console.log(`   ${row.maquina.padEnd(8)}: ${row.total} registros`);
    });

    await db.close();
    console.log('\n✅ Verificação concluída!\n');
}

verificarDados().catch(console.error);
