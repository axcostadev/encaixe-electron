// Script de debug para ver o que está sendo lido do CSV
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, 'Ocupação.csv');

const TURNO_MAP = {
    '1': 0,
    '2': 1,
    '3': 2
};

const MACHINE_GROUP_MAP = {
    'Lectra': 'lectra',
    'Comelz': 'comelz',
    'Emma': 'emma',
    'Laser': 'laser'
};

console.log('\n=== DEBUG DO CSV ===\n');

const content = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n');

console.log(`Total de linhas no CSV: ${lines.length}\n`);

let currentTurno = null;
let turnoCount = { 0: 0, 1: 0, 2: 0 };

for (let lineIdx = 2; lineIdx < Math.min(15, lines.length); lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;
    
    const cells = line.split(';');
    
    const turnoStr = cells[0]?.trim();
    const machineName = cells[1]?.trim();
    
    console.log(`Linha ${lineIdx}: Turno="${turnoStr}" | Máquina="${machineName}"`);
    
    if (turnoStr && TURNO_MAP.hasOwnProperty(turnoStr)) {
        currentTurno = TURNO_MAP[turnoStr];
        console.log(`  -> Definindo currentTurno = ${currentTurno} (Turno ${parseInt(turnoStr)})`);
    }
    
    console.log(`  -> currentTurno = ${currentTurno}, machineName = "${machineName}"`);
    
    if (currentTurno !== null && machineName && MACHINE_GROUP_MAP[machineName]) {
        turnoCount[currentTurno]++;
        console.log(`  -> ✓ Processando: Turno ${currentTurno + 1} | ${machineName}`);
    } else {
        if (currentTurno === null) console.log(`  -> ✗ Pulando: currentTurno é null`);
        if (!machineName) console.log(`  -> ✗ Pulando: machineName vazio`);
        if (machineName && !MACHINE_GROUP_MAP[machineName]) console.log(`  -> ✗ Pulando: máquina não mapeada`);
    }
}

console.log('\n=== Contagem por Turno (primeiras linhas) ===');
console.log(`Turno 1 (0): ${turnoCount[0]} linhas`);
console.log(`Turno 2 (1): ${turnoCount[1]} linhas`);
console.log(`Turno 3 (2): ${turnoCount[2]} linhas`);
