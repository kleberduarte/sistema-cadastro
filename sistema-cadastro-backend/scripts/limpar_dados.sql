-- =====================================================================
-- SCRIPT PARA LIMPEZA DE DADOS (RESET DE AMBIENTE DE TESTE)
-- Banco de dados: athos
-- ATENÇÃO: ESTE SCRIPT APAGA DADOS TRANSACIONAIS PERMANENTEMENTE.
--          USE COM CUIDADO E APENAS EM AMBIENTE DE DESENVOLVIMENTO.
-- =====================================================================
-- OBS: Para preparacao comercial (manter somente adm.super), use:
--      scripts/reset_ambiente_comercial.sql
-- =====================================================================

-- Para executar este script sem erros de dependência (chaves estrangeiras),
-- desabilitamos temporariamente a verificação.
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- Tabela: venda_itens (Itens das Vendas)
-- Deve ser limpa ANTES da tabela 'vendas'.
-- =====================================================================

-- Método 1 (Recomendado): Limpa a tabela e reseta o contador de ID. É mais rápido.
TRUNCATE TABLE athos.venda_itens;

/*
-- Método 2 (Alternativo, como no seu exemplo):
SET SQL_SAFE_UPDATES = 0;
DELETE FROM athos.venda_itens;
SET SQL_SAFE_UPDATES = 1;
ALTER TABLE athos.venda_itens AUTO_INCREMENT = 1;
*/

-- =====================================================================
-- Tabela: vendas (Vendas)
-- =====================================================================

-- Método 1 (Recomendado):
TRUNCATE TABLE athos.vendas;

/*
-- Método 2 (Alternativo):
SET SQL_SAFE_UPDATES = 0;
DELETE FROM athos.vendas;
SET SQL_SAFE_UPDATES = 1;
ALTER TABLE athos.vendas AUTO_INCREMENT = 1;
*/

-- =====================================================================
-- Tabela: produtos
-- =====================================================================

-- Método 1 (Recomendado):
TRUNCATE TABLE athos.produtos;

-- =====================================================================
-- Tabela: clientes
-- =====================================================================

-- Método 1 (Recomendado):
TRUNCATE TABLE athos.clientes;


-- =====================================================================
-- TABELAS DE CONFIGURAÇÃO - CUIDADO AO LIMPAR
-- Limpar estas tabelas pode exigir um novo cadastro de usuário administrador
-- ou reconfiguração da empresa. Por segurança, estão comentadas.
-- =====================================================================

-- =====================================================================
-- Tabela: usuarios
-- ATENÇÃO: Apagar todos os usuários pode impedir o login no sistema.
-- =====================================================================

/*
-- Descomente para usar:
TRUNCATE TABLE athos.usuarios;
*/

-- =====================================================================
-- Tabela: parametros_empresa
-- ATENÇÃO: Apagar os parâmetros remove a identidade visual da empresa.
-- =====================================================================

/*
-- Descomente para usar:
TRUNCATE TABLE athos.parametros_empresa;
*/


-- Reabilita a checagem de chaves estrangeiras ao final do script.
SET FOREIGN_KEY_CHECKS = 1;