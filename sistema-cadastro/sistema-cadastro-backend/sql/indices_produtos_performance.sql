-- Opcional: aplicar manualmente no MySQL se não quiser depender do startup.
-- Seguro repetir: se o índice já existir, o comando falhará — ignore o erro ou use sua ferramenta com "IF NOT EXISTS" (MySQL 8.0.13+).

CREATE INDEX idx_produtos_empresa_id ON produtos (empresa_id, id);
CREATE INDEX idx_produtos_empresa_categoria ON produtos (empresa_id, categoria);
