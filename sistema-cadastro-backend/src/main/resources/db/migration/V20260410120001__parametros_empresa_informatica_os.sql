-- Colunas de retaguarda / OS em parametros_empresa. Idempotente: só ALTER se a coluna não existir.

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'suporte_email') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN suporte_email VARCHAR(255) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'suporte_whatsapp') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN suporte_whatsapp VARCHAR(32) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'segmento') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN segmento VARCHAR(40) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'modulo_farmacia_ativo') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN modulo_farmacia_ativo BIT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'farmacia_lote_validade_obrigatorio') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN farmacia_lote_validade_obrigatorio BIT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'farmacia_controlados_ativo') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN farmacia_controlados_ativo BIT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'farmacia_antimicrobianos_ativo') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN farmacia_antimicrobianos_ativo BIT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'farmacia_pmc_ativo') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN farmacia_pmc_ativo BIT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'farmacia_pmc_modo') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN farmacia_pmc_modo VARCHAR(20) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'modulo_informatica_ativo') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN modulo_informatica_ativo BIT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'endereco_linha1_os') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN endereco_linha1_os VARCHAR(500) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'cidade_uf_os') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN cidade_uf_os VARCHAR(200) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'cnpj') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN cnpj VARCHAR(24) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'inscricao_municipal') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN inscricao_municipal VARCHAR(40) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'telefone_comercial') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN telefone_comercial VARCHAR(40) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'fax') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN fax VARCHAR(40) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'email_comercial') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN email_comercial VARCHAR(255) NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'texto_termos_os') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN texto_termos_os TEXT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametros_empresa' AND COLUMN_NAME = 'ativo') > 0,
 'SELECT 1',
 'ALTER TABLE parametros_empresa ADD COLUMN ativo BIT NULL'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE parametros_empresa SET modulo_farmacia_ativo = 0 WHERE modulo_farmacia_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_lote_validade_obrigatorio = 0 WHERE farmacia_lote_validade_obrigatorio IS NULL;
UPDATE parametros_empresa SET farmacia_controlados_ativo = 0 WHERE farmacia_controlados_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_antimicrobianos_ativo = 0 WHERE farmacia_antimicrobianos_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_pmc_ativo = 0 WHERE farmacia_pmc_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_pmc_modo = 'ALERTA' WHERE farmacia_pmc_modo IS NULL OR TRIM(farmacia_pmc_modo) = '';

UPDATE parametros_empresa SET modulo_informatica_ativo = 0 WHERE modulo_informatica_ativo IS NULL;

UPDATE parametros_empresa SET ativo = 1 WHERE ativo IS NULL;
