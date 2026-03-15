import fs from 'fs';
import readline from 'readline';

/**
 * Lê um arquivo linha por linha usando streaming (baixo uso de memória)
 * @param {string} filePath - Caminho do arquivo
 * @param {Function} lineHandler - Função chamada para cada linha: (line, lineNumber) => void
 * @returns {Promise<number>} - Número total de linhas processadas
 */
export async function readFileByLines(filePath, lineHandler) {
    return new Promise((resolve, reject) => {
        let lineNumber = 0;
        
        const stream = fs.createReadStream(filePath, {
            encoding: 'utf8',
            highWaterMark: 64 * 1024, // 64KB por chunk - uso constante de memória
        });

        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity, // Suporte \r\n (Windows)
        });

        rl.on('line', (line) => {
            lineNumber++;
            try {
                lineHandler(line, lineNumber);
            } catch (err) {
                console.error(`[STREAM] Erro ao processar linha ${lineNumber}:`, err.message);
                rl.close();
                reject(err);
            }
        });

        rl.on('error', (err) => {
            console.error('[STREAM] Erro ao ler arquivo:', err);
            reject(err);
        });

        rl.on('close', () => {
            resolve(lineNumber);
        });
    });
}

/**
 * Processa múltiplos arquivos em streaming com controle de concorrência
 * @param {Array<{filePath: string, handler: Function}>} files - Array de objetos com filePath e handler
 * @param {number} maxConcurrency - Máximo de arquivos processados simultaneamente
 * @returns {Promise<Array<{filePath: string, linesProcessed: number, success: boolean}>>}
 */
export async function processMultipleFiles(files, maxConcurrency = 4) {
    let index = 0;
    const results = [];
    
    const workers = Array(Math.min(maxConcurrency, files.length))
        .fill(null)
        .map(async () => {
            while (index < files.length) {
                const currentIndex = index++;
                const { filePath, handler } = files[currentIndex];
                
                const fileName = filePath.split('\\').pop();
                console.log(`[STREAM] Processando ${currentIndex + 1}/${files.length}: ${fileName}`);
                
                try {
                    const start = Date.now();
                    const linesProcessed = await readFileByLines(filePath, handler);
                    const elapsed = Date.now() - start;
                    
                    console.log(`[STREAM] ✓ ${fileName}: ${linesProcessed} linhas em ${elapsed}ms`);
                    results[currentIndex] = { filePath, linesProcessed, success: true, elapsed };
                } catch (err) {
                    console.error(`[STREAM] ✗ Erro em ${fileName}:`, err.message);
                    results[currentIndex] = { filePath, linesProcessed: 0, success: false, error: err.message };
                }
            }
        });
    
    await Promise.all(workers);
    return results;
}

/**
 * Lê arquivo de forma síncrona com fallback (para compatibilidade)
 * Use apenas quando streaming não for possível
 * @param {string} filePath - Caminho do arquivo
 * @returns {string} - Conteúdo do arquivo
 */
export function readFileSyncSafe(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8').trim();
    } catch (err) {
        console.error(`[FILE] Erro ao ler ${filePath}:`, err.message);
        return '';
    }
}
