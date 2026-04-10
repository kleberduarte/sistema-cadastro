-- Ordem de serviço (módulo informática). Em prod (ddl-auto=validate) a tabela precisa existir
-- antes do Hibernate; migrations JDBC (ApplicationRunner) executam após o EMF e não resolvem.

CREATE TABLE IF NOT EXISTS ordens_servico (
    id BIGINT NOT NULL AUTO_INCREMENT,
    empresa_id BIGINT NOT NULL,
    numero_os BIGINT NOT NULL,
    cliente_id BIGINT NULL,
    nome_cliente VARCHAR(180) NULL,
    contato_cliente VARCHAR(120) NULL,
    codigo_cliente VARCHAR(40) NULL,
    telefone_cliente VARCHAR(40) NULL,
    setor_cliente VARCHAR(80) NULL,
    nome_contato VARCHAR(120) NULL,
    equipamento VARCHAR(140) NOT NULL,
    marca VARCHAR(80) NULL,
    modelo VARCHAR(120) NULL,
    numero_serie VARCHAR(120) NULL,
    patrimonio VARCHAR(120) NULL,
    acessorios TEXT NULL,
    tipo_ordem_servico VARCHAR(40) NULL,
    defeito_relatado TEXT NULL,
    diagnostico TEXT NULL,
    servico_executado TEXT NULL,
    tecnico_responsavel VARCHAR(120) NULL,
    observacao TEXT NULL,
    contrato_identificacao VARCHAR(120) NULL,
    nf_compra VARCHAR(60) NULL,
    data_compra DATE NULL,
    loja_compra VARCHAR(120) NULL,
    numero_certificado VARCHAR(80) NULL,
    senha_equipamento VARCHAR(120) NULL,
    os_externa VARCHAR(80) NULL,
    valor_servico DECIMAL(10,2) NULL,
    desconto DECIMAL(10,2) NULL,
    valor_total DECIMAL(10,2) NULL,
    status VARCHAR(30) NOT NULL,
    data_abertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_previsao_entrega TIMESTAMP NULL,
    data_conclusao TIMESTAMP NULL,
    data_entrega TIMESTAMP NULL,
    venda_id BIGINT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordens_servico' AND INDEX_NAME = 'uk_os_empresa_numero') > 0,
 'SELECT 1',
 'CREATE UNIQUE INDEX uk_os_empresa_numero ON ordens_servico (empresa_id, numero_os)'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordens_servico' AND INDEX_NAME = 'idx_os_empresa_status_data') > 0,
 'SELECT 1',
 'CREATE INDEX idx_os_empresa_status_data ON ordens_servico (empresa_id, status, data_abertura)'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordens_servico' AND INDEX_NAME = 'idx_os_empresa_cliente') > 0,
 'SELECT 1',
 'CREATE INDEX idx_os_empresa_cliente ON ordens_servico (empresa_id, nome_cliente)'));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
