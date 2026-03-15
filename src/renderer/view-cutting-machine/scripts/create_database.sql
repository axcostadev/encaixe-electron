-- Criação do banco de dados SQLite3 para histórico de turnos
-- Execute com: sqlite3 data/turno_history.db < scripts/create_database.sql

-- Tabela principal de histórico de turnos
CREATE TABLE IF NOT EXISTS turno_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data DATE NOT NULL,
    turno INTEGER NOT NULL CHECK(turno IN (0, 1, 2)),
    grupo TEXT NOT NULL,
    maquina TEXT NOT NULL,
    porcentagem REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data, turno, grupo, maquina)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_data ON turno_history(data);
CREATE INDEX IF NOT EXISTS idx_turno ON turno_history(turno);
CREATE INDEX IF NOT EXISTS idx_grupo ON turno_history(grupo);
CREATE INDEX IF NOT EXISTS idx_maquina ON turno_history(maquina);
CREATE INDEX IF NOT EXISTS idx_data_turno ON turno_history(data, turno);
CREATE INDEX IF NOT EXISTS idx_grupo_maquina ON turno_history(grupo, maquina);

-- Tabela para metadados/configurações
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir versão do schema
INSERT OR REPLACE INTO config (key, value) VALUES ('schema_version', '1.0.0');
