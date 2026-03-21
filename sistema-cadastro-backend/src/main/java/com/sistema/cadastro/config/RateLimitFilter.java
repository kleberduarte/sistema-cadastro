package com.sistema.cadastro.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Filter para Rate Limiting - Limita tentativas de requisição para prevenir ataques
 * Usa cache em memória (em produção, considere Redis)
 */
@Component
public class RateLimitFilter implements Filter {

    // Configurações de rate limiting
    private static final int MAX_REQUESTS_PER_MINUTE = 60; // Máximo de requisições por janela
    /** Janela do rate limit geral (mesmo valor usado na mensagem de espera). */
    private static final long GENERAL_RATE_LIMIT_WINDOW_MS = 60_000L;
    /** Máximo de tentativas de login por janela ({@link #LOGIN_BLOCK_TIME}). */
    private static final int MAX_LOGIN_ATTEMPTS_PER_WINDOW = 5;
    /** Janela de contagem e tempo até poder tentar de novo após exceder o limite (60 s). */
    private static final long LOGIN_BLOCK_TIME = 60_000L;

    // Armazena contadores por IP
    private final Map<String, RateLimitData> requestCounts = new ConcurrentHashMap<>();
    // Armazena tentativas de login por IP
    private final Map<String, LoginAttemptData> loginAttempts = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String clientIp = getClientIP(httpRequest);
        String endpoint = httpRequest.getRequestURI();

        // Verifica se é uma tentativa de login
        if (endpoint.contains("/api/auth/login")) {
            if (isLoginBlocked(clientIp)) {
                int segundos = (int) (LOGIN_BLOCK_TIME / 1000L);
                writeRateLimitJson(httpResponse, String.format(Locale.ROOT,
                        "Muitas tentativas de login. Tente novamente em %d segundos.", segundos));
                return;
            }
            recordLoginAttempt(clientIp);
        }

        // Rate limiting geral
        if (isRateLimited(clientIp)) {
            int segundos = (int) (GENERAL_RATE_LIMIT_WINDOW_MS / 1000L);
            writeRateLimitJson(httpResponse, String.format(Locale.ROOT,
                    "Muitas requisições. Tente novamente em %d segundos.", segundos));
            return;
        }

        recordRequest(clientIp);
        chain.doFilter(request, response);
    }

    /** Resposta 429 em JSON com UTF-8 (evita caracteres corrompidos no cliente). */
    private static void writeRateLimitJson(HttpServletResponse httpResponse, String message) throws IOException {
        httpResponse.setStatus(429);
        httpResponse.setCharacterEncoding("UTF-8");
        httpResponse.setContentType("application/json;charset=UTF-8");
        String escaped = message.replace("\\", "\\\\").replace("\"", "\\\"");
        httpResponse.getWriter().write("{\"message\":\"" + escaped + "\"}");
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void recordRequest(String clientIp) {
        long now = System.currentTimeMillis();
        RateLimitData data = requestCounts.computeIfAbsent(clientIp, k -> new RateLimitData());
        
        // Reset a cada janela (GENERAL_RATE_LIMIT_WINDOW_MS)
        if (now - data.windowStart > GENERAL_RATE_LIMIT_WINDOW_MS) {
            data.windowStart = now;
            data.count.set(0);
        }
        data.count.incrementAndGet();
    }

    private boolean isRateLimited(String clientIp) {
        RateLimitData data = requestCounts.get(clientIp);
        if (data == null) return false;
        
        long now = System.currentTimeMillis();
        // Reset se passou a janela (GENERAL_RATE_LIMIT_WINDOW_MS)
        if (now - data.windowStart > GENERAL_RATE_LIMIT_WINDOW_MS) {
            data.windowStart = now;
            data.count.set(0);
            return false;
        }
        
        return data.count.get() >= MAX_REQUESTS_PER_MINUTE;
    }

    private void recordLoginAttempt(String clientIp) {
        long now = System.currentTimeMillis();
        LoginAttemptData data = loginAttempts.computeIfAbsent(clientIp, k -> new LoginAttemptData());
        
        // Reset a cada janela (LOGIN_BLOCK_TIME)
        if (now - data.windowStart > LOGIN_BLOCK_TIME) {
            data.windowStart = now;
            data.attempts.set(0);
            data.blocked = false;
        }
        data.attempts.incrementAndGet();
    }

    private boolean isLoginBlocked(String clientIp) {
        LoginAttemptData data = loginAttempts.get(clientIp);
        if (data == null) return false;
        
        long now = System.currentTimeMillis();
        
        // Reset se passou a janela (LOGIN_BLOCK_TIME)
        if (now - data.windowStart > LOGIN_BLOCK_TIME) {
            data.windowStart = now;
            data.attempts.set(0);
            data.blocked = false;
        }
        
        if (data.attempts.get() >= MAX_LOGIN_ATTEMPTS_PER_WINDOW) {
            data.blocked = true;
            return true;
        }
        
        return false;
    }

    // Classes auxiliares para armazenar dados de rate limiting
    private static class RateLimitData {
        long windowStart = System.currentTimeMillis();
        AtomicInteger count = new AtomicInteger(0);
    }

    private static class LoginAttemptData {
        long windowStart = System.currentTimeMillis();
        AtomicInteger attempts = new AtomicInteger(0);
        boolean blocked = false;
    }
}

