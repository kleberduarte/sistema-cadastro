package com.sistema.cadastro.util;

import java.util.Locale;

/**
 * Valida URLs de logo para uso na web. Rejeita caminhos locais (Windows, file://)
 * e esquemas perigosos; aceita http(s), protocolo-relativo, data:image curto e
 * caminhos relativos sem ":" (ex.: {@code logo.png}, {@code /assets/x.png}).
 */
public final class LogoUrlSanitizer {

    private static final int MAX_COLUMN_LENGTH = 500;

    private LogoUrlSanitizer() {
    }

    /**
     * Normaliza para persistência: trim, vazio → null. Valor inválido → exceção com mensagem em PT-BR.
     */
    public static String normalizeForPersistence(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        if (t.length() > MAX_COLUMN_LENGTH) {
            throw new IllegalArgumentException("URL do logo excede " + MAX_COLUMN_LENGTH + " caracteres.");
        }
        validateTokens(t);
        String lower = t.toLowerCase(Locale.ROOT);
        if (lower.startsWith("javascript:") || lower.startsWith("vbscript:")) {
            throw new IllegalArgumentException("URL do logo não permitida.");
        }
        if (lower.startsWith("file:")) {
            throw new IllegalArgumentException(
                    "URL do logo inválida: caminhos file:// não funcionam na internet. Use https://... ou um arquivo publicado no seu site.");
        }
        if (t.length() >= 2 && Character.isLetter(t.charAt(0)) && t.charAt(1) == ':') {
            throw new IllegalArgumentException(
                    "URL do logo inválida: caminhos como C:\\... não funcionam em produção. Use uma URL https:// pública.");
        }
        if (t.startsWith("\\\\")) {
            throw new IllegalArgumentException("URL do logo inválida: caminhos de rede (\\\\...) não são aceitos.");
        }
        if (t.indexOf('\\') >= 0) {
            throw new IllegalArgumentException(
                    "URL do logo inválida: não use barras invertidas (\\). Use https://... ou caminho relativo ao site.");
        }
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            if (t.length() < "https://a.b".length() || t.contains(" ")) {
                throw new IllegalArgumentException("URL do logo http(s) inválida.");
            }
            return t;
        }
        if (t.startsWith("//")) {
            if (t.length() < "//a.b".length()) {
                throw new IllegalArgumentException("URL do logo inválida.");
            }
            return t;
        }
        if (lower.startsWith("data:image/")) {
            return t;
        }
        if (t.indexOf(':') >= 0) {
            throw new IllegalArgumentException(
                    "URL do logo: use http(s)://, //..., caminho relativo (sem esquema) ou data:image/...");
        }
        return t;
    }

    /**
     * Para API pública / branding: remove valores que o navegador não carregaria na nuvem.
     */
    public static String forPublicResponse(String stored) {
        if (stored == null) {
            return null;
        }
        String t = stored.trim();
        if (t.isEmpty()) {
            return null;
        }
        try {
            normalizeForPersistence(t);
            return t;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static void validateTokens(String t) {
        if (t.indexOf('\r') >= 0 || t.indexOf('\n') >= 0) {
            throw new IllegalArgumentException("URL do logo não pode conter quebras de linha.");
        }
    }
}
