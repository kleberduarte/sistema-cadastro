package com.sistema.cadastro.config;

import org.springframework.boot.autoconfigure.flyway.FlywayConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Produção usa schema legado já populado; sem history table o Flyway precisa baselinar.
 */
@Configuration
@Profile("prod")
public class FlywayProdBaselineConfig {

    @Bean
    FlywayConfigurationCustomizer flywayProdBaselineCustomizer() {
        return configuration -> configuration.baselineOnMigrate(true);
    }
}
