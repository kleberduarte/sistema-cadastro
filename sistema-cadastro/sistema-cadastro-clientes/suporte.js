(function () {
    var supportState = {
        nomeEmpresa: '',
        empresaId: '',
        /** Pelo menos um contato preenchido em Parâmetros (antes do fallback global). */
        empresaDefined: false,
        rawSuporteEmail: '',
        rawSuporteWhatsapp: '',
        email: '',
        whatsapp: ''
    };

    function apiRoot() {
        return typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function'
            ? window.getApiBaseUrl()
            : 'http://localhost:8080/api';
    }

    function onlyDigits(s) {
        return String(s || '').replace(/\D/g, '');
    }

    function normalizeWhatsAppDigits(phone) {
        var d = onlyDigits(phone);
        if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) d = '55' + d;
        return d;
    }

    function fallbackEmailGlobal() {
        var e = typeof window !== 'undefined' ? window.SUPORTE_EMAIL : '';
        return String(e || '').trim();
    }

    function fallbackWhatsappGlobal() {
        var w = typeof window !== 'undefined' ? window.SUPORTE_WHATSAPP_E164 : '';
        return String(w || '').trim();
    }

    function resolveEmpresaIdForSupport() {
        try {
            var u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            if (
                u &&
                typeof normalizeUserRole === 'function' &&
                normalizeUserRole(u.role) === 'ADMIN_EMPRESA' &&
                u.empresaId != null &&
                u.empresaId >= 1
            ) {
                return String(u.empresaId);
            }
        } catch (x) {}
        try {
            var s = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId');
            if (s) {
                var n = parseInt(String(s).trim(), 10);
                if (!isNaN(n) && n >= 1) return String(n);
            }
        } catch (x) {}
        return '';
    }

    function loadEmpresaParamsFromCache() {
        try {
            var raw = localStorage.getItem('empresaParams');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (x) {
            return null;
        }
    }

    function applySupportStateFromParams(j) {
        if (!j || typeof j !== 'object') return;
        supportState.nomeEmpresa = j.nomeEmpresa || '';
        supportState.empresaId = j.empresaId != null ? String(j.empresaId) : '';
        var em = j.suporteEmail != null ? String(j.suporteEmail).trim() : '';
        var wa = j.suporteWhatsapp != null ? String(j.suporteWhatsapp).trim() : '';
        supportState.rawSuporteEmail = em;
        supportState.rawSuporteWhatsapp = wa;
        supportState.empresaDefined = !!(em || wa);
        supportState.email = em || fallbackEmailGlobal();
        supportState.whatsapp = wa || fallbackWhatsappGlobal();
    }

    function applyFallbackOnly() {
        supportState.nomeEmpresa = '';
        supportState.empresaId = '';
        supportState.rawSuporteEmail = '';
        supportState.rawSuporteWhatsapp = '';
        supportState.empresaDefined = false;
        supportState.email = fallbackEmailGlobal();
        supportState.whatsapp = fallbackWhatsappGlobal();
    }

    function loadSupportFromApi() {
        var eid = resolveEmpresaIdForSupport();
        supportState.empresaId = eid || '';
        if (!eid) {
            applyFallbackOnly();
            return Promise.resolve();
        }
        if (typeof getToken !== 'function') {
            applySupportStateFromParams(loadEmpresaParamsFromCache());
            return Promise.resolve();
        }
        return fetch(apiRoot() + '/parametros-empresa/empresa/' + encodeURIComponent(eid), {
            headers: { Authorization: 'Bearer ' + getToken() }
        })
            .then(function (r) {
                if (r.ok) return r.json();
                return null;
            })
            .then(function (j) {
                if (j) {
                    applySupportStateFromParams(j);
                    return;
                }
                var cached = loadEmpresaParamsFromCache();
                if (cached && String(cached.empresaId || '') === String(eid)) {
                    applySupportStateFromParams(cached);
                } else {
                    supportState.nomeEmpresa = '';
                    supportState.empresaDefined = false;
                    supportState.rawSuporteEmail = '';
                    supportState.rawSuporteWhatsapp = '';
                    supportState.email = fallbackEmailGlobal();
                    supportState.whatsapp = fallbackWhatsappGlobal();
                }
            })
            .catch(function (err) {
                console.warn('suporte: carregar parâmetros', err);
                var cached = loadEmpresaParamsFromCache();
                if (cached && String(cached.empresaId || '') === String(eid)) {
                    applySupportStateFromParams(cached);
                } else {
                    supportState.nomeEmpresa = '';
                    supportState.empresaDefined = false;
                    supportState.email = fallbackEmailGlobal();
                    supportState.whatsapp = fallbackWhatsappGlobal();
                }
            });
    }

    function getSupportEmail() {
        return String(supportState.email || '').trim();
    }

    function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function updateEmpresaContext() {
        var el = document.getElementById('suporteEmpresaContext');
        if (!el) return;
        if (!supportState.empresaId) {
            el.hidden = true;
            el.innerHTML = '';
            return;
        }
        el.hidden = false;
        var nome = supportState.nomeEmpresa ? ' — <strong>' + escapeHtml(supportState.nomeEmpresa) + '</strong>' : '';
        if (supportState.empresaDefined) {
            el.innerHTML =
                'Contatos da empresa <strong>ID ' +
                escapeHtml(supportState.empresaId) +
                '</strong>' +
                nome +
                ': definidos em <strong>Parâmetros</strong> (e-mail/WhatsApp).';
        } else {
            el.innerHTML =
                'Empresa em contexto <strong>ID ' +
                escapeHtml(supportState.empresaId) +
                '</strong>' +
                nome +
                ': nenhum suporte cadastrado em Parâmetros — usando o <strong>padrão global</strong> (<code>api-config.js</code>).';
        }
    }

    function buildSupportBody() {
        var user = '—';
        try {
            var u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            if (u && u.username) user = String(u.username);
        } catch (x) {}
        var eid = '';
        try {
            eid = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '';
        } catch (x) {}
        var origin = '';
        try {
            if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.protocol !== 'file:') {
                origin = window.location.origin;
            }
        } catch (x) {}
        var canal =
            supportState.empresaDefined
                ? 'Parâmetros da empresa (ID ' + (supportState.empresaId || eid || '—') + ')'
                : 'Padrão global (api-config)';
        var lines = [
            'Olá, preciso de ajuda com o sistema.',
            '',
            'Descrição do problema:',
            '- O que eu estava fazendo: ',
            '- Tela ou menu: ',
            '- Mensagem de erro (se houver): ',
            '',
            '--- contexto automático ---',
            'Usuário (login): ' + user,
            'Nome empresa (Parâmetros): ' + (supportState.nomeEmpresa || '—'),
            'ID empresa (contexto retaguarda): ' + (eid || '—'),
            'Canal de contato usado nesta tela: ' + canal,
            'URL: ' + (origin || '—'),
            'Data/hora: ' + new Date().toLocaleString('pt-BR')
        ];
        return lines.join('\n');
    }

    function buildMailtoHref() {
        var email = getSupportEmail();
        if (!email) return '#';
        var subject = encodeURIComponent('[Sistema] Suporte');
        var body = encodeURIComponent(buildSupportBody());
        return 'mailto:' + encodeURIComponent(email) + '?subject=' + subject + '&body=' + body;
    }

    function showToast() {
        var el = document.getElementById('suporteToast');
        if (!el) return;
        el.hidden = false;
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(function () {
            el.hidden = true;
        }, 2600);
    }

    function copyModel() {
        var ta = document.getElementById('suporteModeloTexto');
        var text = ta ? ta.value : buildSupportBody();
        function ok() {
            showToast();
        }
        function fail() {
            if (ta) {
                ta.focus();
                ta.select();
                try {
                    document.execCommand('copy');
                    ok();
                } catch (e) {
                    alert('Selecione o texto e use Ctrl+C para copiar.');
                }
            }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(ok).catch(fail);
        } else {
            fail();
        }
    }

    function initSuportePage() {
        var email = getSupportEmail();
        var emailLink = document.getElementById('suporteEmailDisplay');
        var mailtoBtn = document.getElementById('suporteMailtoBtn');
        var warn = document.getElementById('suporteEmailWarn');

        updateEmpresaContext();

        if (emailLink) {
            emailLink.textContent = email || '(defina em Parâmetros ou api-config.js)';
            emailLink.href = email ? 'mailto:' + encodeURIComponent(email) : '#';
        }
        if (mailtoBtn) {
            mailtoBtn.href = buildMailtoHref();
            mailtoBtn.setAttribute('aria-disabled', email ? 'false' : 'true');
            mailtoBtn.classList.toggle('btn-disabled', !email);
        }
        if (warn) warn.hidden = !!email;

        var ta = document.getElementById('suporteModeloTexto');
        if (ta) ta.value = buildSupportBody();

        var waBlock = document.getElementById('suporteWhatsappBlock');
        var waBtn = document.getElementById('suporteWaLink');
        var digits = normalizeWhatsAppDigits(supportState.whatsapp || '');
        if (waBlock && waBtn) {
            if (digits.length >= 12) {
                waBlock.hidden = false;
                waBtn.href = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(buildSupportBody());
            } else {
                waBlock.hidden = true;
            }
        }

        var btn = document.getElementById('btnCopiarModelo');
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', copyModel);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof checkAuth === 'function' && !checkAuth()) return;
        if (typeof checkPermission === 'function' && !checkPermission('adm')) return;
        if (typeof displayUserName === 'function') displayUserName();
        if (typeof setupMenuByRole === 'function') setupMenuByRole();

        var chain = Promise.resolve();
        if (typeof syncCurrentUserFromApi === 'function') {
            chain = syncCurrentUserFromApi().catch(function () {
                return null;
            });
        }
        chain
            .then(function () {
                return loadSupportFromApi();
            })
            .then(function () {
                initSuportePage();
            });
    });
})();
