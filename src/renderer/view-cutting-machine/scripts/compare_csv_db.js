import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, 'Ocupação.csv');
const DB_PATH = path.join(__dirname, '../data/turno_history.db');

const TURNO_MAP = { '1': 0, '2': 1, '3': 2 };
const MACHINE_GROUP_MAP = { 'Lectra': 'lectra', 'Comelz': 'comelz', 'Emma': 'emma', 'Laser': 'laser' };

function parseCSV(content) {
  const lines = content.split('\n');
  const dateRow = (lines[1] || '').split(';');
  let dateStartIndex = -1;
  for (let i = 0; i < dateRow.length; i++) {
    if (dateRow[i] && dateRow[i].match(/\d{2}\/\d{2}/)) {
      dateStartIndex = i;
      break;
    }
  }
  if (dateStartIndex === -1) throw new Error('Não foi possível encontrar o início das datas no CSV');

  const dates = [];
  for (let i = dateStartIndex; i < dateRow.length; i++) {
    if (dateRow[i] && dateRow[i].match(/\d{2}\/\d{2}/)) dates.push(dateRow[i].trim());
  }

  const expected = [];
  let currentTurno = null;

  for (let lineIdx = 2; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line) continue;
    const cells = line.split(';');
    const turnoStr = (cells[0] || '').trim();
    if (turnoStr && Object.prototype.hasOwnProperty.call(TURNO_MAP, turnoStr)) {
      currentTurno = TURNO_MAP[turnoStr];
    }
    if (currentTurno === null) continue;
    const machineName = (cells[1] || '').trim();
    if (!machineName || !MACHINE_GROUP_MAP[machineName]) continue;
    const maquina = MACHINE_GROUP_MAP[machineName];

    for (let i = 0; i < dates.length; i++) {
      const cellIdx = dateStartIndex + i;
      const cellValue = (cells[cellIdx] || '').trim();
      if (cellValue && cellValue.includes('%')) {
        const porcentagem = parseFloat(cellValue.replace('%', '').replace(',', '.'));
        if (!Number.isNaN(porcentagem)) {
          const [day, month] = dates[i].split('/');
          const year = parseInt(month, 10) >= 7 ? '2024' : '2025';
          const dataFormatada = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          expected.push({ data: dataFormatada, turno: currentTurno, maquina, porcentagem });
        }
      }
    }
  }

  return expected;
}

async function loadDbMap() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const rows = await db.all('SELECT data, turno, maquina, porcentagem FROM turno_history');
  await db.close();
  const map = new Map();
  for (const r of rows) {
    const key = `${r.data}|${r.turno}|${r.maquina}`;
    map.set(key, r.porcentagem);
  }
  return map;
}

async function compareAll() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV não encontrado:', CSV_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error('DB não encontrado:', DB_PATH);
    process.exit(1);
  }

  console.log('Lendo CSV...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const expected = parseCSV(content);
  console.log(`Registros esperados no CSV: ${expected.length}`);

  console.log('Carregando dados do banco...');
  const dbMap = await loadDbMap();
  console.log(`Registros no DB: ${dbMap.size}`);

  let matches = 0;
  let mismatches = 0;
  let missing = 0;
  const diffs = [];

  for (const rec of expected) {
    const key = `${rec.data}|${rec.turno}|${rec.maquina}`;
    if (dbMap.has(key)) {
      const dbVal = dbMap.get(key);
      if (Number(dbVal) === Number(rec.porcentagem)) {
        matches++;
      } else {
        mismatches++;
        diffs.push({ type: 'DIFFER', key, csv: rec.porcentagem, db: dbVal });
      }
    } else {
      missing++;
      diffs.push({ type: 'MISSING_IN_DB', key, csv: rec.porcentagem });
    }
  }

  const summary = { expected: expected.length, dbRecords: dbMap.size, matches, mismatches, missing };
  console.log('\n=== RESUMO ===');
  console.log(summary);

  const out = { summary, sampleDiffs: diffs.slice(0, 100), allDiffs: diffs };
  const outPath = path.join(__dirname, 'compare_report.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log('\nRelatório salvo em:', outPath);
  if (diffs.length > 0) console.log(`Primeiras ${Math.min(10, diffs.length)} diferenças:`);
  diffs.slice(0, 10).forEach(d => console.log(d));
}

compareAll().catch(err => {
  console.error(err);
  process.exit(1);
});