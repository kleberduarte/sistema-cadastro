package com.sistema.cadastro.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;

@Configuration
public class CorsConfig {

    /**
     * Sempre permitidas além de {@code cors.allowed-origins} (Live Server, testes locais).
     * Evita depender só de variável de ambiente no Render ao desenvolver com front em :5500.
     */
    private static final List<String> EXTRA_LOCAL_DEV_ORIGINS = List.of(
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost",
            "http://127.0.0.1",
            "http://localhost:8080"
    );

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cors.allowed-origins:}") String allowedOriginsProperty) {
        CorsConfiguration configuration = new CorsConfiguration();
        LinkedHashSet<String> origins = new LinkedHashSet<>();
        if (allowedOriginsProperty != null && !allowedOriginsProperty.isBlank()) {
            for (String part : allowedOriginsProperty.split(",")) {
                String o = part.trim();
                if (!o.isEmpty()) {
                    origins.add(o);
                }
            }
        }
        origins.addAll(EXTRA_LOCAL_DEV_ORIGINS);

        configuration.setAllowedOrigins(new ArrayList<>(origins));
        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
