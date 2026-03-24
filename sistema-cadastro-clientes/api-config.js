/**
 * URL base da API REST (único ponto para ajustar em produção).
 *
 * Deploy: altere o default abaixo OU defina antes deste script:
 *   <script>window.API_URL = 'https://seu-backend.com/api';</script>
 *   <script src="api-config.js"></script>
 *
 * Deve ser o primeiro script nas páginas que chamam a API.
 */
(function (w) {
    if (!w) return;
    /** Produção (Render); usado quando o front não roda em localhost. */
    var PROD = 'https://sistema-cadastro-kfd8.onrender.com/api';
    /** Live Server (ex.: http://127.0.0.1:5500) + Spring local em 8080. */
    var LOCAL = 'http://127.0.0.1:8080/api';
    var inferred = PROD;
    try {
        var h = w.location && w.location.hostname ? String(w.location.hostname) : '';
        if (/^(127\.0\.0\.1|localhost)$/i.test(h)) {
            inferred = LOCAL;
        }
    } catch (_) {}
    if (!w.API_URL) {
        w.API_URL = inferred;
    }
    w.API_URL = String(w.API_URL).replace(/\s/g, '');
    w.getApiBaseUrl = function () {
        return String(w.API_URL || inferred).replace(/\/$/, '');
    };

    /**
     * Suporte (suporte.html): fallback global quando Parâmetros da empresa não define e-mail/WhatsApp.
     * Por empresa: configure em Parâmetros (campos suporte). Pode sobrescrever antes deste script:
     *   <script>window.SUPORTE_EMAIL = 'atendimento@minhaempresa.com.br';</script>
     *   <script>window.SUPORTE_WHATSAPP_E164 = '5511999998888';</script>  // só dígitos; vazio = oculta WhatsApp
     */
    if (w.SUPORTE_EMAIL === undefined || w.SUPORTE_EMAIL === null) {
        w.SUPORTE_EMAIL = 'suporte@seudominio.com';
    }
    if (w.SUPORTE_WHATSAPP_E164 === undefined || w.SUPORTE_WHATSAPP_E164 === null) {
        w.SUPORTE_WHATSAPP_E164 = '';
    }
})(typeof window !== 'undefined' ? window : undefined);
