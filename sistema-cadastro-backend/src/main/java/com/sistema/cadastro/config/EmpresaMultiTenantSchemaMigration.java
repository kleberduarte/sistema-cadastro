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
 * Adiciona {@code empresa_id} em produtos, clientes e vendas para isolamento multi-tenant.
 * Hibernate {@code ddl-auto=update} não altera índices únicos compostos; ajustes via JDBC.
 */
@Configuration
@ConditionalOnProperty(value = "app.startup.migrations.enabled", havingValue = "true", matchIfMissing = true)
public class EmpresaMultiTenantSchemaMigration {

    private static final Logger log = LoggerFactory.getLogger(EmpresaMultiTenantSchemaMigration.class);

    private static void safeExec(JdbcTemplate jdbc, String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            log.debug("SQL opcional ignorada: {} — {}", sql, e.getMessage());
        }
    }

    @Bean
    @Order(2)
    ApplicationRunner migrarEmpresaMultiTenant(JdbcTemplate jdbc) {
        return args -> {
            // --- produtos ---
            try {
                jdbc.execute("ALTER TABLE produtos ADD COLUMN empresa_id BIGINT NULL");
            } catch (Exception e) {
                if (!e.getMessage().contains("Duplicate column")) {
                    log.warn("produtos.empresa_id: {}", e.getMessage());
                }
            }
            try {
                jdbc.execute("UPDATE produtos SET empresa_id = 1 WHERE empresa_id IS NULL");
                jdbc.execute("ALTER TABLE produtos MODIFY COLUMN empresa_id BIGINT NOT NULL");
            } catch (Exception e) {
                log.warn("produtos.empresa_id NOT NULL: {}", e.getMessage());
            }
            // Remove UNIQUE global em codigo_produto (nome comum no MySQL)
            safeExec(jdbc, "ALTER TABLE produtos DROP INDEX codigo_produto");
            safeExec(jdbc, "ALTER TABLE produtos DROP INDEX UK_4s4tcog8k6a2h76y8378sdd8g");
            safeExec(jdbc, "ALTER TABLE produtos DROP INDEX uk_codigo_produto");
            try {
                jdbc.execute("CREATE UNIQUE INDEX uk_produto_empresa_codigo ON produtos (empresa_id, codigo_produto)");
            } catch (Exception e) {
                log.debug("uk_produto_empresa_codigo: {}", e.getMessage());
            }
            try {
                jdbc.execute("CREATE INDEX idx_produtos_empresa ON produtos (empresa_id)");
            } catch (Exception ignored) {
            }

            // --- clientes ---
            try {
                jdbc.execute("ALTER TABLE clientes ADD COLUMN empresa_id BIGINT NULL");
            } catch (Exception e) {
                if (!e.getMessage().contains("Duplicate column")) {
                    log.warn("clientes.empresa_id: {}", e.getMessage());
                }
            }
            try {
                jdbc.execute("UPDATE clientes SET empresa_id = 1 WHERE empresa_id IS NULL");
                jdbc.execute("ALTER TABLE clientes MODIFY COLUMN empresa_id BIGINT NOT NULL");
            } catch (Exception e) {
                log.warn("clientes.empresa_id NOT NULL: {}", e.getMessage());
            }
            safeExec(jdbc, "ALTER TABLE clientes DROP INDEX email");
            safeExec(jdbc, "ALTER TABLE clientes DROP INDEX cpf");
            safeExec(jdbc, "ALTER TABLE clientes DROP INDEX UK_xxx_email");
            safeExec(jdbc, "ALTER TABLE clientes DROP INDEX UK_xxx_cpf");
            try {
                jdbc.execute("CREATE UNIQUE INDEX uk_cliente_empresa_email ON clientes (empresa_id, email)");
            } catch (Exception e) {
                log.debug("uk_cliente_empresa_email: {}", e.getMessage());
            }
            try {
                jdbc.execute("CREATE UNIQUE INDEX uk_cliente_empresa_cpf ON clientes (empresa_id, cpf)");
            } catch (Exception e) {
                log.debug("uk_cliente_empresa_cpf: {}", e.getMessage());
            }
            try {
                jdbc.execute("CREATE INDEX idx_clientes_empresa ON clientes (empresa_id)");
            } catch (Exception ignored) {
            }

            // --- vendas ---
            try {
                jdbc.execute("ALTER TABLE vendas ADD COLUMN empresa_id BIGINT NULL");
            } catch (Exception e) {
                if (!e.getMessage().contains("Duplicate column")) {
                    log.warn("vendas.empresa_id: {}", e.getMessage());
                }
            }
            try {
                jdbc.execute("""
                        UPDATE vendas v
                        INNER JOIN usuarios u ON v.usuario_id = u.id
                        SET v.empresa_id = COALESCE(u.empresa_id_pdv, 1)
                        WHERE v.empresa_id IS NULL
                        """);
                jdbc.execute("UPDATE vendas SET empresa_id = 1 WHERE empresa_id IS NULL");
                jdbc.execute("ALTER TABLE vendas MODIFY COLUMN empresa_id BIGINT NOT NULL");
            } catch (Exception e) {
                log.warn("vendas.empresa_id: {}", e.getMessage());
            }
            try {
                jdbc.execute("CREATE INDEX idx_vendas_empresa ON vendas (empresa_id)");
            } catch (Exception ignored) {
            }

            log.info("Schema multi-tenant (empresa_id) verificado.");
        };
    }
}
