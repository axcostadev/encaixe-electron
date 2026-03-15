import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, 'Ocupação.csv');
const DB_PATH = path.join(__dirname, '../data/turno_history.db');

const MACHINE_GROUP_MAP = { 'lectra': 'lectra', 'comelz': 'comelz', 'emma': 'emma', 'laser': 'laser' };

function loadCSVMap() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split('\n');
  const dateRow = (lines[1] || '').split(';');
  let dateStartIndex = -1;
  for (let i = 0; i < dateRow.length; i++) {
    if (dateRow[i] && dateRow[i].match(/\d{2}\/\d{2}/)) { dateStartIndex = i; break; }
  }
  if (dateStartIndex === -1) throw new Error('Não foi possível encontrar início das datas no CSV');

  const dates = [];
  for (let i = dateStartIndex; i < dateRow.length; i++) {
    if (dateRow[i] && dateRow[i].match(/\d{2}\/\d{2}/)) dates.push(dateRow[i].trim());
  }

  const map = new Map(); // key: YYYY-MM-DD|turno|maquina -> porcentagem
  let currentTurno = null;

  for (let li = 2; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const cells = line.split(';');
    const turnoCell = (cells[0] || '').trim();
    if (turnoCell && ['1','2','3'].includes(turnoCell)) currentTurno = { '1':0,'2':1,'3':2 }[turnoCell];
    if (currentTurno === null) continue;
    const machineName = (cells[1] || '').trim().toLowerCase();
    if (!machineName || !MACHINE_GROUP_MAP[machineName]) continue;
    const maquina = MACHINE_GROUP_MAP[machineName];

    for (let i = 0; i < dates.length; i++) {
      const cellIdx = dateStartIndex + i;
      const cellValue = (cells[cellIdx] || '').trim();
      if (cellValue && cellValue.includes('%')) {
        const pct = parseFloat(cellValue.replace('%','').replace(',','.'));
        const [day, month] = dates[i].split('/');
        const year = parseInt(month,10) >= 7 ? '2024' : '2025';
        const dateIso = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
        const key = `${dateIso}|${currentTurno}|${maquina}`;
        map.set(key, pct);
      }
    }
  }
  return map;
}

async function compareSamples(samples) {
  const csvMap = loadCSVMap();
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  console.log('\nComparando amostras CSV x DB:\n');
  for (const s of samples) {
    const parts = s.split(',').map(p => p.trim());
    if (parts.length < 3) { console.warn('Linha inválida (esperado: YYYY-MM-DD,turno,maquina):', s); continue; }
    const date = parts[0];
    const turno = parseInt(parts[1],10) - 1; // usuário indica 1/2/3
    const maquina = parts[2].toLowerCase();
    if (!MACHINE_GROUP_MAP[maquina]) { console.warn('Máquina inválida:', maquina); continue; }

    const key = `${date}|${turno}|${maquina}`;
    const expected = csvMap.has(key) ? csvMap.get(key) : null;
    const row = await db.get('SELECT porcentagem FROM turno_history WHERE data = ? AND turno = ? AND maquina = ?', [date, turno, maquina]);
    const dbVal = row ? row.porcentagem : null;

    if (expected === null && dbVal === null) {
      console.log(`${date} Turno ${turno+1} ${maquina}: NADA (não encontrado no CSV nem no DB)`);
    } else if (expected === null) {
      console.log(`${date} Turno ${turno+1} ${maquina}: CSV=N/A DB=${dbVal}%`);
    } else if (dbVal === null) {
      console.log(`${date} Turno ${turno+1} ${maquina}: CSV=${expected}% DB=N/A`);
    } else {
      const ok = Number(expected) === Number(dbVal);
      console.log(`${date} Turno ${turno+1} ${maquina}: CSV=${expected}% DB=${dbVal}% ${ok ? '✅' : '❌'}`);
    }
  }

  await db.close();
}

function loadSamplesFromFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith('#'));
  return raw;
}

async function main() {
  // If CLI args provided, use them as samples; otherwise read scripts/samples.txt
  const args = process.argv.slice(2);
  let samples = [];
  if (args.length > 0) {
    samples = args;
  } else {
    const samplesPath = path.join(__dirname, 'samples.txt');
    samples = loadSamplesFromFile(samplesPath);
    if (samples.length === 0) {
      console.log('Nenhuma amostra encontrada em scripts/samples.txt e sem args na linha de comando.');
      console.log('Formato de amostra: YYYY-MM-DD,turno,maquina (ex: 2024-10-07,1,lectra)');
      process.exit(1);
    }
  }

  await compareSamples(samples);
}

main().catch(err => { console.error(err); process.exit(1); });