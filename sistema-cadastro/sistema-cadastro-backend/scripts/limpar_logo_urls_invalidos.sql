-- =============================================================================
-- Opcional: zera logo_url inválida para a internet (caminho Windows, file://).
-- Rode o SELECT antes; em produção, faça backup ou transação.
-- =============================================================================

-- Pré-visualização:
-- SELECT id, empresa_id, nome_empresa, logo_url
-- FROM parametros_empresa
-- WHERE logo_url IS NOT NULL
--   AND (
--     logo_url REGEXP '^[A-Za-z]:'
--     OR LOWER(logo_url) LIKE 'file:%'
--   );

UPDATE parametros_empresa
SET logo_url = NULL
WHERE logo_url IS NOT NULL
  AND (
    logo_url REGEXP '^[A-Za-z]:'
    OR LOWER(logo_url) LIKE 'file:%'
  );
