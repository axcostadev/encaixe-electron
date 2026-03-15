import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/turno_history.db');

async function main() {
  const date = process.argv[2];
  if (!date) {
    console.log('Uso: node scripts/query_date.js YYYY-MM-DD');
    process.exit(1);
  }

  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const rows = await db.all(
    'SELECT data, turno, grupo, maquina, porcentagem FROM turno_history WHERE data = ? ORDER BY turno, maquina',
    [date]
  );

  if (!rows || rows.length === 0) {
    console.log(`Nenhum registro encontrado para ${date}`);
  } else {
    console.log(`\nRegistros para ${date}:\n`);
    rows.forEach(r => {
      console.log(`${r.data} | Turno ${r.turno + 1} | ${r.maquina} (${r.grupo}) | ${r.porcentagem}%`);
    });
  }

  await db.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});