-- Script para zerar o contador da tabela parametros_empresa

-- Opção 1: Alterar o AUTO_INCREMENT para 1
ALTER TABLE parametros_empresa AUTO_INCREMENT = 1;

-- Opção 2: Se quiser verificar o valor atual do contador
-- SELECT AUTO_INCREMENT 
-- FROM information_schema.TABLES 
-- WHERE TABLE_SCHEMA = 'athos' 
-- AND TABLE_NAME = 'parametros_empresa';

-- Opção 3: Para apagar todos os registros e zerar o contador
-- TRUNCATE TABLE parametros_empresa;

