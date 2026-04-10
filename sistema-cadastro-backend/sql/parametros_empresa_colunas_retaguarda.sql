-- Colunas faltantes em parametros_empresa (retaguarda / OS / farmácia).
-- Preferir a migração Flyway V20260410120001 (idempotente via INFORMATION_SCHEMA).
-- Use este arquivo só para execução manual: se der "Duplicate column name",
-- pule a linha e siga.

ALTER TABLE parametros_empresa ADD COLUMN suporte_email VARCHAR(255) NULL;
ALTER TABLE parametros_empresa ADD COLUMN suporte_whatsapp VARCHAR(32) NULL;

ALTER TABLE parametros_empresa ADD COLUMN segmento VARCHAR(40) NULL;
ALTER TABLE parametros_empresa ADD COLUMN modulo_farmacia_ativo BIT NULL;
ALTER TABLE parametros_empresa ADD COLUMN farmacia_lote_validade_obrigatorio BIT NULL;
ALTER TABLE parametros_empresa ADD COLUMN farmacia_controlados_ativo BIT NULL;
ALTER TABLE parametros_empresa ADD COLUMN farmacia_antimicrobianos_ativo BIT NULL;
ALTER TABLE parametros_empresa ADD COLUMN farmacia_pmc_ativo BIT NULL;
ALTER TABLE parametros_empresa ADD COLUMN farmacia_pmc_modo VARCHAR(20) NULL;

ALTER TABLE parametros_empresa ADD COLUMN modulo_informatica_ativo BIT NULL;

ALTER TABLE parametros_empresa ADD COLUMN endereco_linha1_os VARCHAR(500) NULL;
ALTER TABLE parametros_empresa ADD COLUMN cidade_uf_os VARCHAR(200) NULL;
ALTER TABLE parametros_empresa ADD COLUMN cnpj VARCHAR(24) NULL;
ALTER TABLE parametros_empresa ADD COLUMN inscricao_municipal VARCHAR(40) NULL;
ALTER TABLE parametros_empresa ADD COLUMN telefone_comercial VARCHAR(40) NULL;
ALTER TABLE parametros_empresa ADD COLUMN fax VARCHAR(40) NULL;
ALTER TABLE parametros_empresa ADD COLUMN email_comercial VARCHAR(255) NULL;
ALTER TABLE parametros_empresa ADD COLUMN texto_termos_os TEXT NULL;

ALTER TABLE parametros_empresa ADD COLUMN ativo BIT NULL;

UPDATE parametros_empresa SET modulo_farmacia_ativo = 0 WHERE modulo_farmacia_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_lote_validade_obrigatorio = 0 WHERE farmacia_lote_validade_obrigatorio IS NULL;
UPDATE parametros_empresa SET farmacia_controlados_ativo = 0 WHERE farmacia_controlados_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_antimicrobianos_ativo = 0 WHERE farmacia_antimicrobianos_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_pmc_ativo = 0 WHERE farmacia_pmc_ativo IS NULL;
UPDATE parametros_empresa SET farmacia_pmc_modo = 'ALERTA' WHERE farmacia_pmc_modo IS NULL OR TRIM(farmacia_pmc_modo) = '';

UPDATE parametros_empresa SET modulo_informatica_ativo = 0 WHERE modulo_informatica_ativo IS NULL;

UPDATE parametros_empresa SET ativo = 1 WHERE ativo IS NULL;
