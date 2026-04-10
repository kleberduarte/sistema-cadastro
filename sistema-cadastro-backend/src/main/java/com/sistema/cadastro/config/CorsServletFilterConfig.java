package com.sistema.cadastro.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Registra o {@link CorsFilter} no servlet container com prioridade máxima, antes do Spring Security.
 * Assim o preflight OPTIONS recebe os cabeçalhos CORS mesmo quando a cadeia de segurança ou proxies
 * atrapalhariam o {@code HttpSecurity#cors} padrão.
 */
@Configuration
public class CorsServletFilterConfig {

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration(CorsConfigurationSource corsConfigurationSource) {
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new CorsFilter(corsConfigurationSource));
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.setName("corsServletFilter");
        return registration;
    }
}
