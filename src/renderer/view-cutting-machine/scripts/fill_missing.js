// Script para preencher no DB os registros marcados como MISSING_IN_DB em compare_report.json
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.join(__dirname, 'compare_report.json');
const DB_PATH = path.join(__dirname, '../data/turno_history.db');

async function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Relatório compare_report.json não encontrado. Rode scripts/compare_csv_db.js primeiro.');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  const diffs = report.allDiffs || [];
  const missing = diffs.filter(d => d.type === 'MISSING_IN_DB');

  if (missing.length === 0) {
    console.log('Nenhum registro faltante identificado no relatório. Nada a fazer.');
    return;
  }

  console.log(`Encontrados ${missing.length} registros faltantes. Preparando inserção...`);

  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  const insertStmt = await db.prepare(`
    INSERT INTO turno_history (data, turno, grupo, maquina, porcentagem, created_at)
    VALUES (?, ?, ?, ?, ? , CURRENT_TIMESTAMP)
    ON CONFLICT(data, turno, grupo, maquina) DO UPDATE SET porcentagem = excluded.porcentagem
  `);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const item of missing) {
    // key format: 'YYYY-MM-DD|turno|maquina'
    const [data, turnoStr, maquina] = item.key.split('|');
    const turno = parseInt(turnoStr, 10);
    const porcentagem = item.csv;
    const grupo = maquina; // usamos o mesmo nome do grupo (lectra/comelz/emma/laser)

    try {
      await insertStmt.run(data, turno, grupo, maquina, porcentagem);
      const r = await db.get('SELECT changes() as c');
      if (r.c > 0) inserted++;
      else updated++;
    } catch (err) {
      console.error('Erro inserindo', item.key, err.message);
      errors++;
    }
  }

  await insertStmt.finalize();
  await db.close();

  console.log(`\nResultado: inserted=${inserted}, updated=${updated}, errors=${errors}`);
  console.log('Recomendo rodar novamente scripts/compare_csv_db.js para confirmar que restam 0 faltantes.');
}

main().catch(err => { console.error(err); process.exit(1); });