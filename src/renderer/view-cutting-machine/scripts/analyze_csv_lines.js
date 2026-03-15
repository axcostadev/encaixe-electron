// Verificar linhas do CSV
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, 'Ocupação.csv');

const content = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n');

console.log(`\n=== ANÁLISE DO CSV ===`);
console.log(`Total de linhas: ${lines.length}\n`);

for (let i = 0; i < Math.min(15, lines.length); i++) {
    const cells = lines[i].split(';');
    const turno = cells[0]?.trim();
    const machine = cells[1]?.trim();
    const hasData = lines[i].trim().length > 0;
    console.log(`Linha ${i}: turno="${turno}" machine="${machine}" hasData=${hasData}`);
}
