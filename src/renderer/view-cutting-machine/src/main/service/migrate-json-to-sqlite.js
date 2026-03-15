// Script de migração: Migra dados do JSON para SQLite
import { getTurnoReport as getTurnoReportJSON } from './db-persistent.js';
import { saveTurnoDataBatch } from './db-sqlite.js';

export async function migrateJSONToSQLite() {
    try {
        console.log('[MIGRATION] Iniciando migração de dados JSON → SQLite...');
        
        // Buscar todos os dados do JSON
        const jsonData = await getTurnoReportJSON({});
        
        if (!jsonData || jsonData.length === 0) {
            console.log('[MIGRATION] Nenhum dado encontrado no JSON para migrar');
            return { success: true, migrated: 0, message: 'Nenhum dado para migrar' };
        }
        
        console.log(`[MIGRATION] Encontrados ${jsonData.length} registros no JSON`);
        
        // Transformar dados para o formato SQLite
        const sqliteRecords = jsonData.map(record => {
            // Turno no JSON é 1-indexed (1, 2, 3)
            // Turno no SQLite é 0-indexed (0, 1, 2)
            const turnoZeroIndexed = record.turno - 1;
            
            return {
                data: record.date,
                turno: turnoZeroIndexed,
                grupo: record.grupo || 'unknown',
                maquina: record.maquina || record.grupo || 'unknown',
                porcentagem: parseFloat(record.porcentagem) || 0
            };
        });
        
        // Salvar em lotes no SQLite
        console.log('[MIGRATION] Salvando dados no SQLite...');
        await saveTurnoDataBatch(sqliteRecords);
        
        console.log(`[MIGRATION] ✅ Migração concluída! ${sqliteRecords.length} registros migrados`);
        
        return { 
            success: true, 
            migrated: sqliteRecords.length, 
            message: `${sqliteRecords.length} registros migrados com sucesso` 
        };
        
    } catch (error) {
        console.error('[MIGRATION] ❌ Erro na migração:', error);
        return { 
            success: false, 
            migrated: 0, 
            error: error.message 
        };
    }
}

// Executar migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateJSONToSQLite()
        .then(result => {
            console.log('[MIGRATION] Resultado:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('[MIGRATION] Erro fatal:', error);
            process.exit(1);
        });
}
