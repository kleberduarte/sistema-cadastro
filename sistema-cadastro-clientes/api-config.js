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
    var DEFAULT = 'http://localhost:8080/api';
    if (!w.API_URL) {
        w.API_URL = DEFAULT;
    }
    w.API_URL = String(w.API_URL).replace(/\s/g, '');
    w.getApiBaseUrl = function () {
        return String(w.API_URL || DEFAULT).replace(/\/$/, '');
    };
})(typeof window !== 'undefined' ? window : undefined);
