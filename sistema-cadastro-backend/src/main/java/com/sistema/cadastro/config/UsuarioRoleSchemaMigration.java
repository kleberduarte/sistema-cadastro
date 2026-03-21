package com.sistema.cadastro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Garante compatibilidade do campo usuarios.role para novos perfis
 * (ex.: ADMIN_EMPRESA) mesmo quando o banco foi criado com ENUM antigo.
 */
@Configuration
public class UsuarioRoleSchemaMigration {

    private static final Logger log = LoggerFactory.getLogger(UsuarioRoleSchemaMigration.class);

    @Bean
    @Order(1)
    ApplicationRunner ajustarColunaRoleUsuarios(JdbcTemplate jdbc) {
        return args -> {
            try {
                jdbc.execute("ALTER TABLE usuarios MODIFY COLUMN role VARCHAR(20) NOT NULL");
                log.info("Schema: usuarios.role garantido como VARCHAR(20).");
            } catch (Exception e) {
                log.warn("Nao foi possivel ajustar usuarios.role: {}", e.getMessage());
            }
        };
    }
}

