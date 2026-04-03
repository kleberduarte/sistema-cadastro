-- Garante coluna de 1º acesso (senha provisória). Rode em PRD se a coluna não existir.
-- MySQL 8+ (Aiven): se der erro "Duplicate column", a coluna já existe — ignore.

ALTER TABLE usuarios
    ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0
    AFTER telefone;
