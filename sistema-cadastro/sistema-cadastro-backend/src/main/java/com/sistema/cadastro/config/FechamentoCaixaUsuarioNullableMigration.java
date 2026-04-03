package com.sistema.cadastro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Permite {@code usuario_id} nulo em fechamentos após exclusão do usuário (histórico mantém {@code nome_operador}).
 * Idempotente: se a coluna já aceita NULL, ignora.
 */
@Configuration
@ConditionalOnProperty(value = "app.startup.migrations.enabled", havingValue = "true", matchIfMissing = true)
public class FechamentoCaixaUsuarioNullableMigration {

    private static final Logger log = LoggerFactory.getLogger(FechamentoCaixaUsuarioNullableMigration.class);

    @Bean
    @Order(2)
    ApplicationRunner fechamentosCaixaUsuarioIdNullable(JdbcTemplate jdbc) {
        return args -> {
            try {
                String nullable = jdbc.queryForObject(
                        """
                                SELECT c.IS_NULLABLE FROM information_schema.COLUMNS c
                                WHERE c.TABLE_SCHEMA = DATABASE()
                                  AND c.TABLE_NAME = 'fechamentos_caixa'
                                  AND c.COLUMN_NAME = 'usuario_id'
                                """,
                        String.class);
                if ("YES".equalsIgnoreCase(nullable)) {
                    return;
                }
                jdbc.execute("ALTER TABLE fechamentos_caixa MODIFY usuario_id BIGINT NULL");
                log.info("fechamentos_caixa.usuario_id alterada para aceitar NULL (exclusão de usuário com fechamentos).");
            } catch (Exception e) {
                log.warn(
                        "Não foi possível ajustar fechamentos_caixa.usuario_id automaticamente. "
                                + "Se a exclusão de usuário falhar por FK, execute: sql/fechamentos_caixa_usuario_id_nullable.sql — {}",
                        e.getMessage() != null ? e.getMessage() : e);
            }
        };
    }
}
