-- =====================================================================
-- RESET COMERCIAL DO AMBIENTE
-- Objetivo:
--   1) Zerar dados operacionais/transacionais
--   2) Manter APENAS um usuário administrador: adm.super
--   3) Preservar configurações da empresa (parametros_empresa)
--
-- ATENÇÃO:
-- - Execute somente com backup em mãos.
-- - Script pensado para MySQL/MariaDB.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Limpeza de dados transacionais/operacionais
TRUNCATE TABLE athos.venda_itens;
TRUNCATE TABLE athos.vendas;
TRUNCATE TABLE athos.fechamentos_caixa;
TRUNCATE TABLE athos.ordens_servico;
TRUNCATE TABLE athos.produto_lotes;
TRUNCATE TABLE athos.produtos;
TRUNCATE TABLE athos.clientes;
TRUNCATE TABLE athos.pdv_terminais;
TRUNCATE TABLE athos.pdv_convite_por_empresa;
TRUNCATE TABLE athos.pmc_referencias;
TRUNCATE TABLE athos.farmacia_auditoria_eventos;

-- 2) Localiza usuário a ser preservado (prioridade: adm.super -> primeiro ADM -> primeiro usuário)
SET @admin_id := (
  SELECT id
  FROM athos.usuarios
  WHERE LOWER(username) = 'adm.super'
  ORDER BY id
  LIMIT 1
);

SET @admin_id := COALESCE(
  @admin_id,
  (SELECT id FROM athos.usuarios WHERE role = 'ADM' ORDER BY id LIMIT 1),
  (SELECT id FROM athos.usuarios ORDER BY id LIMIT 1)
);

-- 3) Normaliza usuário preservado como super administrador padrão
-- Se não houver usuário algum na base, este UPDATE não afetará linhas.
UPDATE athos.usuarios
SET
  username = 'adm.super',
  role = 'ADM',
  empresa_id_pdv = NULL,
  pdv_terminal_id = NULL,
  must_change_password = 0
WHERE id = @admin_id;

-- 4) Remove todos os outros usuários, mantendo somente o super admin
DELETE FROM athos.usuarios
WHERE @admin_id IS NOT NULL
  AND id <> @admin_id;

SET FOREIGN_KEY_CHECKS = 1;

-- Resultado esperado:
-- - Tabelas operacionais zeradas
-- - Tabela usuarios com apenas 1 usuário (adm.super) quando já existir ao menos um usuário
