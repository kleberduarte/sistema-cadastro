-- Execute no MySQL/MariaDB se POST /api/clientes/{id}/codigo-convite-pdv falhar
-- (código criptografado é maior que VARCHAR curto antigo).

ALTER TABLE clientes
    MODIFY COLUMN codigo_convite_pdv VARCHAR(512) NULL;

ALTER TABLE pdv_convite_por_empresa
    MODIFY COLUMN codigo VARCHAR(512) NOT NULL;

-- Se a coluna ainda não existir (Hibernate update pode não ter rodado):
-- ALTER TABLE pdv_convite_por_empresa ADD COLUMN descricao_empresa VARCHAR(200) NULL;
