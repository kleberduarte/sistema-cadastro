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
     * Padrões + origens extras. Usamos {@link CorsConfiguration#setAllowedOriginPatterns} para incluir
     * qualquer front no Render (ex.: static em {@code *.onrender.com}) chamando a API em outro host
     * ({@code sistema-cadastro-kfd8.onrender.com}). Com {@code setAllowedOrigins} fixo isso falhava no CORS.
     */
    private static final List<String> DEFAULT_ORIGIN_PATTERNS = List.of(
            "https://*.onrender.com",
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:8080",
            "http://localhost",
            "http://127.0.0.1"
    );

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cors.allowed-origins:}") String allowedOriginsProperty) {
        CorsConfiguration configuration = new CorsConfiguration();
        LinkedHashSet<String> patterns = new LinkedHashSet<>(DEFAULT_ORIGIN_PATTERNS);
        if (allowedOriginsProperty != null && !allowedOriginsProperty.isBlank()) {
            for (String part : allowedOriginsProperty.split(",")) {
                String o = part.trim();
                if (!o.isEmpty()) {
                    patterns.add(o);
                }
            }
        }

        configuration.setAllowedOriginPatterns(new ArrayList<>(patterns));
        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With",
                "Cache-Control",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
