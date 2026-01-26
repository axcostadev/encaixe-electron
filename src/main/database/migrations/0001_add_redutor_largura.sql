-- Migration 0001: adiciona coluna redutor_largura na tabela componentes
-- Ajuste o tipo/default conforme sua necessidade
BEGIN TRANSACTION;
ALTER TABLE componentes ADD COLUMN redutor_largura NUMERIC DEFAULT 0;
COMMIT;
