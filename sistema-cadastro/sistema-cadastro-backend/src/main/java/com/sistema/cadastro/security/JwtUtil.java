package com.sistema.cadastro.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;

@Component
public class JwtUtil {
    private final Environment environment;

    public JwtUtil(Environment environment) {
        this.environment = environment;
    }

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    private SecretKey getSigningKey() {
        String normalizedSecret = secret == null ? "" : secret.trim();
        byte[] keyBytes = normalizedSecret.getBytes(StandardCharsets.UTF_8);

        // RFC 7518 exige >= 256 bits para HS256.
        // Em producao, exigimos explicitamente >= 32 bytes.
        if (keyBytes.length < 32 && environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("JWT_SECRET invalido em producao: minimo de 32 bytes para HS256.");
        }

        // Fora de producao, se o secret configurado for curto, derivamos uma chave SHA-256
        // para manter compatibilidade local/homologacao legada.
        if (keyBytes.length >= 32) {
            return Keys.hmacShaKeyFor(keyBytes);
        }

        try {
            byte[] derivedKey = MessageDigest.getInstance("SHA-256").digest(keyBytes);
            return Keys.hmacShaKeyFor(derivedKey);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao derivar chave JWT segura (>= 256 bits).", e);
        }
    }

    public String generateToken(String username, String role) {
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return extractClaims(token).get("role", String.class);
    }

    public boolean validateToken(String token, String username) {
        try {
            final String extractedUsername = extractUsername(token);
            return (extractedUsername.equals(username) && !isTokenExpired(token));
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
