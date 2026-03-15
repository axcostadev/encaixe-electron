// Script para verificar se há porcentagens no Turno 1
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, 'Ocupação.csv');

console.log('\n=== VERIFICANDO PORCENTAGENS DO TURNO 1 ===\n');

const content = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n');

// Linha 1: Datas
const dateRow = lines[1].split(';');

// Encontrar onde começam as datas
let dateStartIndex = -1;
for (let i = 0; i < dateRow.length; i++) {
    if (dateRow[i] && dateRow[i].match(/\d{2}\/\d{2}/)) {
        dateStartIndex = i;
        break;
    }
}

console.log(`Índice inicial das datas: ${dateStartIndex}`);
console.log(`Primeira data: ${dateRow[dateStartIndex]}`);
console.log(`10ª data: ${dateRow[dateStartIndex + 9]}\n`);

// Linha 2: Turno 1, Lectra
const lectraLine = lines[2].split(';');
console.log('=== TURNO 1 - LECTRA ===');
console.log(`Total de colunas na linha: ${lectraLine.length}`);

let countComDados = 0;
let primeiraComDados = -1;

for (let i = dateStartIndex; i < Math.min(dateStartIndex + 149, lectraLine.length); i++) {
    const cell = lectraLine[i]?.trim();
    if (cell && cell.includes('%')) {
        countComDados++;
        if (primeiraComDados === -1) {
            primeiraComDados = i;
            const dataIdx = i - dateStartIndex;
            console.log(`\nPrimeira célula com dados:`);
            console.log(`  Índice da coluna: ${i}`);
            console.log(`  Data: ${dateRow[i]}`);
            console.log(`  Valor: ${cell}`);
        }
    }
}

console.log(`\nTotal de células com porcentagem no Turno 1 (Lectra): ${countComDados}`);

if (countComDados > 0) {
    console.log(`\nPrimeiras 10 porcentagens do Turno 1 (Lectra):`);
    let count = 0;
    for (let i = dateStartIndex; i < lectraLine.length && count < 10; i++) {
        const cell = lectraLine[i]?.trim();
        if (cell && cell.includes('%')) {
            console.log(`  ${dateRow[i]} = ${cell}`);
            count++;
        }
    }
} else {
    console.log('\n❌ Nenhuma porcentagem encontrada no Turno 1!');
}
