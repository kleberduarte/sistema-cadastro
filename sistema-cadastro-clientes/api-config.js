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
    var DEFAULT = 'https://sistema-cadastro-kfd8.onrender.com/api';
    if (!w.API_URL) {
        w.API_URL = DEFAULT;
    }
    w.API_URL = String(w.API_URL).replace(/\s/g, '');
    w.getApiBaseUrl = function () {
        return String(w.API_URL || DEFAULT).replace(/\/$/, '');
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
