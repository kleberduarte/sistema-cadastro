package com.sistema.cadastro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Índices adicionais em {@code produtos} para listagem paginada e categorias por empresa,
 * sem alterar regras de negócio. Execução idempotente: se o índice já existir, ignora.
 * <p>
 * Já existem (via entidade / migration multi-tenant): {@code uk_produto_empresa_codigo},
 * {@code idx_produtos_empresa}.
 */
@Configuration
public class ProdutoIndexSchemaMigration {

    private static final Logger log = LoggerFactory.getLogger(ProdutoIndexSchemaMigration.class);

    private static void createIndexIfPossible(JdbcTemplate jdbc, String indexName, String createSql) {
        try {
            jdbc.execute(createSql);
            log.info("Índice {} criado ou já presente.", indexName);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("Duplicate key name")
                    || msg.contains("already exists")
                    || msg.contains("Duplicate")) {
                log.debug("Índice {} já existe — ignorando.", indexName);
            } else {
                log.warn("Não foi possível criar índice {}: {}", indexName, msg);
            }
        }
    }

    @Bean
    @Order(3)
    ApplicationRunner criarIndicesProdutosPerformance(JdbcTemplate jdbc) {
        return args -> {
            // Paginação: WHERE empresa_id = ? ORDER BY id DESC — composite cobre filtro + ordenação
            createIndexIfPossible(jdbc, "idx_produtos_empresa_id",
                    "CREATE INDEX idx_produtos_empresa_id ON produtos (empresa_id, id)");

            // Categoria por empresa: DISTINCT categoria, filtros futuros
            createIndexIfPossible(jdbc, "idx_produtos_empresa_categoria",
                    "CREATE INDEX idx_produtos_empresa_categoria ON produtos (empresa_id, categoria)");

            log.info("Índices de performance em produtos verificados.");
        };
    }
}
