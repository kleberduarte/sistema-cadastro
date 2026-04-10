/**
 * URL base da API REST (único ponto para ajustar em produção).
 *
 * Deploy: altere o default abaixo OU defina antes deste script:
 *   <script>window.API_URL = 'https://seu-backend.com/api';</script>
 *   <script src="api-config.js"></script>
 *
 * Desenvolvimento (Live Server em 127.0.0.1 / localhost): o padrão é o Spring local
 * em http://127.0.0.1:8080/api (evita CORS/502 do Render enquanto você testa em DES).
 * Para usar a API do Render sem subir o backend local:
 *   - antes deste script: <script>window.USE_RENDER_API = true;</script>, ou
 *   - na URL: ?remoteApi=1 (ou ?api=remote ou ?api=render)
 * Ainda é possível forçar local explicitamente: ?localApi=1 ou ?api=local
 *
 * Deve ser o primeiro script nas páginas que chamam a API.
 */
(function (w) {
    if (!w) return;
    /** Produção (Render); usado quando o front não roda em localhost. */
    var PROD = 'https://sistema-cadastro-kfd8.onrender.com/api';
    /** Spring Boot local (DES). */
    var LOCAL = 'http://127.0.0.1:8080/api';
    var inferred = PROD;
    try {
        var h = w.location && w.location.hostname ? String(w.location.hostname) : '';
        var onLoopback = /^(127\.0\.0\.1|localhost)$/i.test(h);
        if (onLoopback) {
            var sp = w.location && w.location.search ? new URLSearchParams(w.location.search) : null;
            var apiParam = sp ? String(sp.get('api') || '').toLowerCase() : '';
            var explicitLocal = w.USE_LOCAL_API === true
                    || (sp && sp.get('localApi') === '1')
                    || apiParam === 'local';
            var explicitRemote = w.USE_RENDER_API === true
                    || (sp && sp.get('remoteApi') === '1')
                    || apiParam === 'remote'
                    || apiParam === 'render';
            if (explicitLocal) {
                inferred = LOCAL;
            } else if (explicitRemote || w.USE_LOCAL_API === false) {
                inferred = PROD;
            } else {
                inferred = LOCAL;
            }
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
