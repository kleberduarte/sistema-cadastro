package com.sistema.cadastro.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Criptografia reversível (AES-GCM) para permitir:
 * - guardar o convite criptografado nas tabelas
 * - recuperar o código em texto aberto apenas quando o ADM solicita
 */
@Component
public class CodigoConvitePdvCryptoService {

    private static final String VERSION = "v1";
    private static final String PREFIX = VERSION + "$";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_BITS = 128;

    @Value("${jwt.secret}")
    private String jwtSecret;

    private SecretKey getAesKey() {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(jwtSecret.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(hash, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao derivar chave de criptografia do convite.", e);
        }
    }

    public String encrypt(String plain) {
        if (plain == null) return null;
        String p = plain.trim();
        if (p.isEmpty()) return p;

        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getAesKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(p.getBytes(StandardCharsets.UTF_8));

            String ivB64 = Base64.getEncoder().encodeToString(iv);
            String ctB64 = Base64.getEncoder().encodeToString(ct);
            return PREFIX + ivB64 + "$" + ctB64;
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao criptografar convite.", e);
        }
    }

    /**
     * Se o valor estiver criptografado (v1$...), tenta descriptografar.
     * Se não estiver no formato esperado (ex.: dados antigos plaintext), retorna o valor original.
     */
    public String decryptOrPlain(String stored) {
        if (stored == null) return null;
        String s = stored.trim();
        if (s.isEmpty()) return s;
        if (!s.startsWith(PREFIX)) return stored;

        try {
            // v1$<ivB64>$<ctB64>
            String[] parts = s.split("\\$");
            if (parts.length != 3) return stored;
            byte[] iv = Base64.getDecoder().decode(parts[1]);
            byte[] ct = Base64.getDecoder().decode(parts[2]);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getAesKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] plainBytes = cipher.doFinal(ct);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // Se não der pra descriptografar (ex.: formato legado), não bloqueia o ADM.
            return stored;
        }
    }
}

