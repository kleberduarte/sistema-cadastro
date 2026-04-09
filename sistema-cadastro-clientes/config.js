// Configurações do Cliente
// Gerencia a aplicação de estilos personalizados por cliente
// theme-defaults.js deve ser carregado antes deste arquivo (define SISTEMA_THEME_PADRAO).

/**
 * URL de logo segura para exibir no navegador (rejeita C:\\, file:, barras \\).
 * Relativos (ex.: logo.png) e http(s):// mantidos.
 */
function sanitizeLogoUrlForDisplay(logoUrl) {
    if (!logoUrl || !String(logoUrl).trim()) return '';
    var u = String(logoUrl).trim();
    if (u.indexOf('./') === 0) u = u.substring(2);
    var lower = u.toLowerCase();
    if (lower.indexOf('file:') === 0) return '';
    if (/^[a-z]:\\/i.test(u) || /^[a-z]:\//i.test(u)) return '';
    if (u.indexOf('\\\\') === 0) return '';
    if (u.indexOf('\\') >= 0) return '';
    if (lower.indexOf('javascript:') === 0 || lower.indexOf('vbscript:') === 0) return '';
    if (u.indexOf('\n') >= 0 || u.indexOf('\r') >= 0) return '';
    // Erro comum: salvar "pagina.html/logo.png" → o browser pede /pagina.html/logo.png (404).
    if (lower.indexOf('http://') !== 0 && lower.indexOf('https://') !== 0 && lower.indexOf('data:') !== 0 && lower.indexOf('//') !== 0) {
        u = u.replace(/(^|\/)[^/#?]+\.html\//gi, '$1');
    }
    return u;
}

/** Caminho absoluto para img src (relativos resolvem contra a URL da página). */
function resolveLogoUrlForBrowser(sanitized) {
    if (!sanitized) return '';
    var lower = String(sanitized).toLowerCase();
    if (lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0 || lower.indexOf('data:') === 0 || lower.indexOf('//') === 0) {
        return sanitized;
    }
    if (typeof window === 'undefined' || !window.location) return sanitized;
    try {
        return new URL(sanitized, window.location.href).href;
    } catch (_) {
        return sanitized;
    }
}

/** URL está na pasta do caixa /pdv/... (favicon pode usar logo da loja). Não usar substring /pdv — casaria com /pdvs-monitor. */
function isPathUnderPdvFolder() {
    try {
        var p = String(window.location.pathname || '').toLowerCase().replace(/\\/g, '/');
        return p === '/pdv' || p.endsWith('/pdv') || p.indexOf('/pdv/') !== -1;
    } catch (_) {
        return false;
    }
}

function sistemaFaviconFallbackHrefType() {
    if (!isPathUnderPdvFolder() && typeof window !== 'undefined' && window.SISTEMA_FAVICON_SVG_DATA) {
        return { href: window.SISTEMA_FAVICON_SVG_DATA, type: 'image/svg+xml' };
    }
    var fb = (typeof window !== 'undefined' && window.__defaultFaviconHref) || 'data:;base64,iVBORw0KGgo=';
    var tp = (typeof window !== 'undefined' && window.__defaultFaviconType) || '';
    return { href: fb, type: tp };
}

/**
 * Atualiza o favicon da aba usando o logo da empresa.
 * Sem logo válido, restaura o favicon original da página.
 */
function applyCompanyFavicon(logoUrl) {
    if (typeof document === 'undefined') return;

    // Evita corrida: load assíncrono de um logo antigo (ex. Drogasil) não pode sobrescrever um reset posterior.
    if (typeof window !== 'undefined') {
        window.__faviconApplySeq = (window.__faviconApplySeq || 0) + 1;
    }
    var faviconSeq = typeof window !== 'undefined' ? window.__faviconApplySeq : 0;

    function findPrimaryIcon() {
        return document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    }

    function ensureIcon(relValue) {
        var el = document.querySelector('link[rel="' + relValue + '"]');
        if (el) return el;
        el = document.createElement('link');
        el.setAttribute('rel', relValue);
        document.head.appendChild(el);
        return el;
    }

    function setIcons(href, type) {
        var icons = [ensureIcon('icon'), ensureIcon('shortcut icon')];
        try {
            document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(function (el) {
                icons.push(el);
            });
        } catch (_) {}
        icons.forEach(function (el) {
            el.setAttribute('href', href);
            if (type) el.setAttribute('type', type);
            else el.removeAttribute('type');
        });
    }

    if (typeof window !== 'undefined' && window.__defaultFaviconHref == null) {
        var initialIcon = findPrimaryIcon();
        window.__defaultFaviconHref = initialIcon && initialIcon.getAttribute('href')
            ? initialIcon.getAttribute('href')
            : 'data:;base64,iVBORw0KGgo=';
        window.__defaultFaviconType = initialIcon && initialIcon.getAttribute('type')
            ? initialIcon.getAttribute('type')
            : '';
    }

    function guessFaviconMime(u) {
        if (!u) return '';
        var base = String(u).split('?')[0].split('#')[0].toLowerCase();
        if (base.endsWith('.svg')) return 'image/svg+xml';
        if (base.endsWith('.png')) return 'image/png';
        if (base.endsWith('.jpg') || base.endsWith('.jpeg')) return 'image/jpeg';
        if (base.endsWith('.webp')) return 'image/webp';
        if (base.endsWith('.ico')) return 'image/x-icon';
        if (base.indexOf('data:image/svg+xml') === 0) return 'image/svg+xml';
        if (base.indexOf('data:image/png') === 0) return 'image/png';
        if (base.indexOf('data:image/jpeg') === 0) return 'image/jpeg';
        if (base.indexOf('data:image/webp') === 0) return 'image/webp';
        if (base.indexOf('data:image/x-icon') === 0 || base.indexOf('data:image/vnd.microsoft.icon') === 0) return 'image/x-icon';
        return '';
    }

    var clean = sanitizeLogoUrlForDisplay(logoUrl);
    if (!clean) {
        var ftEmpty = sistemaFaviconFallbackHrefType();
        setIcons(ftEmpty.href, ftEmpty.type);
        return;
    }

    var faviconSrc = clean;
    try {
        if (clean.indexOf('http://') !== 0 &&
            clean.indexOf('https://') !== 0 &&
            clean.indexOf('data:') !== 0 &&
            clean.indexOf('//') !== 0) {
            faviconSrc = new URL(clean, window.location.href).href;
        }
    } catch (_) {}

    var mime = guessFaviconMime(faviconSrc);
    // Bust cache para forçar o browser a trocar o ícone da aba.
    var finalHref = faviconSrc;
    if (faviconSrc.indexOf('data:') !== 0) {
        var sep = faviconSrc.indexOf('?') >= 0 ? '&' : '?';
        finalHref = faviconSrc + sep + 'v=' + encodeURIComponent(String(Date.now()));
    }

    // Evita globo quando a URL do logo estiver quebrada em produção.
    // Só troca o favicon após confirmar que a imagem responde.
    if (finalHref.indexOf('data:') === 0) {
        setIcons(finalHref, mime);
        return;
    }
    var probe = new Image();
    probe.onload = function () {
        if (typeof window !== 'undefined' && window.__faviconApplySeq !== faviconSeq) return;
        setIcons(finalHref, mime);
    };
    probe.onerror = function () {
        if (typeof window !== 'undefined' && window.__faviconApplySeq !== faviconSeq) return;
        var ftErr = sistemaFaviconFallbackHrefType();
        setIcons(ftErr.href, ftErr.type);
    };
    probe.src = finalHref;
}

/** Mensagem de erro em PT ou null se ok (para formulário Parâmetros). */
function validateLogoUrlForForm(raw) {
    var s = (raw == null) ? '' : String(raw).trim();
    if (!s) return null;
    if (s.length > 500) return 'URL do logo muito longa (máx. 500 caracteres).';
    if (!sanitizeLogoUrlForDisplay(s)) {
        return 'URL do logo inválida: não use caminho local (C:\\...) nem file://. Use https://... ou um arquivo no seu site (caminho relativo).';
    }
    var lower = s.toLowerCase();
    if (lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0) {
        if (s.length < 12 || s.indexOf(' ') >= 0) return 'URL http(s) do logo inválida.';
        return null;
    }
    if (s.indexOf('//') === 0) {
        if (s.length < 5) return 'URL do logo inválida.';
        return null;
    }
    if (lower.indexOf('data:image/') === 0) return null;
    if (s.indexOf(':') >= 0) {
        return 'URL do logo: use https://, //... ou caminho sem esquema (ex.: imagens/logo.png).';
    }
    return null;
}

function temaPadrao() {
    var p = typeof window !== 'undefined' && window.SISTEMA_THEME_PADRAO;
    return p || {
        nomeEmpresa: 'Sistema de Cadastro',
        corPrimaria: '#667eea',
        corSecundaria: '#764ba2',
        corFundo: '#ffffff',
        corTexto: '#333333',
        corBotao: '#667eea',
        corBotaoTexto: '#ffffff'
    };
}

function getEmpresaIdFromUrl() {
    try {
        if (typeof window === 'undefined' || !window.location || !window.location.search) return null;
        var params = new URLSearchParams(window.location.search);
        var raw = params.get('empresaId');
        if (!raw) return null;
        var parsed = parseInt(raw, 10);
        if (isNaN(parsed) || parsed < 1) return null;
        return parsed;
    } catch (_) {
        return null;
    }
}

function getEmpresaPadraoSistemaId() {
    return (typeof window !== 'undefined' && typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number')
        ? window.EMPRESA_ID_PADRAO_SISTEMA
        : 1;
}

/** URL do login da retaguarda com tenant explícito (super ADM / empresa padrão). */
function loginRetaguardaUrlComEmpresaPadrao() {
    return 'login.html?empresaId=' + encodeURIComponent(String(getEmpresaPadraoSistemaId()));
}

function applyEmpresaIdFromUrlIfPresent() {
    var empresaIdFromUrl = getEmpresaIdFromUrl();
    var path = '';
    try {
        path = (window.location && window.location.pathname) ? String(window.location.pathname).toLowerCase() : '';
    } catch (_) {}
    var isRetaguardaLogin = path.endsWith('/login.html') || path === '/login.html' || path === 'login.html';

    if (empresaIdFromUrl) {
        localStorage.setItem('selectedEmpresaId', String(empresaIdFromUrl));
        localStorage.setItem('selectedClienteId', String(empresaIdFromUrl));
        // Evita reaplicar tema antigo de outra empresa quando o link vier com tenant explicito.
        localStorage.removeItem('empresaParams');
        localStorage.removeItem('clientParams');
        return;
    }

    // Sem ?empresaId= na retaguarda: bloquear tela de login (somente link com tenant ou empresa padrão).
    if (isRetaguardaLogin) {
        // Fluxo PDV → cadastro na retaguarda: redireciona para login com tenant em vez de bloquear.
        try {
            if (sessionStorage.getItem('abrirCadastroRetaguarda') === '1') {
                var eidPdv = parseInt(sessionStorage.getItem('cadastroEmpresaIdPdv') || '0', 10);
                if (eidPdv >= 1) {
                    window.location.replace('login.html?empresaId=' + encodeURIComponent(String(eidPdv)));
                    return;
                }
            }
        } catch (_) {}
        try {
            window.__LOGIN_RETAGUARDA_BLOQUEADO_SEM_TENANT = true;
        } catch (_) {}
        try {
            localStorage.removeItem('selectedEmpresaId');
            localStorage.removeItem('selectedClienteId');
            localStorage.removeItem('empresaParams');
            localStorage.removeItem('clientParams');
        } catch (_) {}
        return;
    }
}

applyEmpresaIdFromUrlIfPresent();

// ID do cliente configurado manualmente no sistema
// Altere este valor para mudar o visual do sistema
// Ex: 1 = Adidas, 2 = Nike, 3 = Adidas (Novo), etc.
let CLIENTE_ID;
if (typeof window !== 'undefined' && window.__LOGIN_RETAGUARDA_BLOQUEADO_SEM_TENANT) {
    CLIENTE_ID = 0;
} else {
    // Priorizar empresaId da URL, depois localStorage, depois padrão 1
    var empresaIdFromUrl = getEmpresaIdFromUrl();
    if (empresaIdFromUrl) {
        CLIENTE_ID = empresaIdFromUrl;
    } else {
        CLIENTE_ID = parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '1', 10);
    }
}

// Função para alterar o cliente atual (pode ser chamada via console ou botão)
function setClienteId(id) {
    CLIENTE_ID = parseInt(id);
    localStorage.setItem('selectedClienteId', CLIENTE_ID);
    console.log('Cliente alterado para ID:', CLIENTE_ID);
    // Recarregar parâmetros com o novo ID
    loadClientParams();
}

// Função para definir o empresaId selecionado (usado na tela de parâmetros)
function setSelectedEmpresaId(id) {
    CLIENTE_ID = parseInt(id);
    localStorage.setItem('selectedEmpresaId', CLIENTE_ID);
    console.log('Empresa alterada para ID:', CLIENTE_ID);
    // Recarregar parâmetros com o novo ID
    loadClientParams();
}

// Função para obter o ID do cliente atual
function getClienteId() {
    return CLIENTE_ID;
}

function effectiveClienteIdForTenant() {
    if (typeof CLIENTE_ID !== 'undefined' && CLIENTE_ID != null && !isNaN(CLIENTE_ID) && CLIENTE_ID >= 1) {
        return CLIENTE_ID;
    }
    var ep = getEmpresaPadraoSistemaId();
    var ls = parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || String(ep), 10);
    if (!isNaN(ls) && ls >= 1) return ls;
    return ep;
}

/**
 * Tenant atual é a empresa padrão do sistema (theme-defaults.js → EMPRESA_ID_PADRAO_SISTEMA).
 */
function isTenantEmpresaPadraoSistema() {
    return effectiveClienteIdForTenant() === getEmpresaPadraoSistemaId();
}

function isPdvPath() {
    return isPathUnderPdvFolder();
}

/**
 * Retaguarda com nome institucional (igual ao tema padrão) ou tenant ID padrão: não usa logo de marca na aba/header.
 * Cobre API com nome "Sistema de Cadastro" e logo de teste (ex. Drogasil) em outro campo.
 */
function deveSuprimirLogoMarcaCliente(params) {
    if (isTenantEmpresaPadraoSistema()) return true;
    if (!isPdvPath()) {
        var nomeParam = (params && params.nomeEmpresa != null ? String(params.nomeEmpresa) : '').trim();
        var nomePadrao = (temaPadrao().nomeEmpresa || '').trim();
        if (nomeParam && nomePadrao && nomeParam === nomePadrao) return true;
    }
    return false;
}

/**
 * Anexa ?empresaId= ou &empresaId= à URL da API conforme o tenant (CLIENTE_ID / selectedEmpresaId).
 * Usado pelas telas que chamam endpoints com escopo por empresa.
 */
function appendEmpresaIdToApiUrl(url) {
    if (typeof url !== 'string' || !url) return url;
    var role = '';
    try {
        var cuRaw = localStorage.getItem('currentUser');
        if (cuRaw) {
            var cu = JSON.parse(cuRaw);
            role = String(cu && cu.role ? cu.role : '').trim().toUpperCase();
        }
    } catch (_) {}

    var rawSelected = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId');
    if (role === 'ADM') {
        // Para ADM: sem seleção explícita de empresa => sem filtro (backend retorna todas).
        var adminSelected = parseInt(rawSelected || '0', 10);
        if (isNaN(adminSelected) || adminSelected < 1) return url;
        var sepAdmin = url.indexOf('?') >= 0 ? '&' : '?';
        return url + sepAdmin + 'empresaId=' + encodeURIComponent(adminSelected);
    }

    var raw = typeof getClienteId === 'function'
        ? getClienteId()
        : parseInt(rawSelected || '0', 10);
    var id = parseInt(raw, 10);
    if (isNaN(id) || id < 1) return url;
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'empresaId=' + encodeURIComponent(id);
}

/**
 * Grava uma ação do usuário no log do sistema de forma assíncrona.
 * Implementado como "fire and forget" para não impactar a performance.
 */
function logAction(acao, detalhes = {}) {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    // Formato ISO local sem o 'Z' para não forçar conversão para UTC
    const localTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const logEntry = {
        timestamp: localTime,
        usuario: localStorage.getItem('username') || 'Desconhecido',
        acao: acao,
        detalhes: detalhes,
        url: window.location.href,
        userAgent: navigator.userAgent
    };

    // Log estilizado no console para facilitar a depuração
    const color = acao.includes('ERROR') ? 'color: red; font-weight: bold' : 'color: #2196F3; font-weight: bold';
    console.groupCollapsed(`%c[SYSTEM-LOG] ${acao}`, color);
    console.log('Horário:', logEntry.timestamp);
    console.log('Usuário:', logEntry.usuario);
    console.log('Detalhes:', detalhes);
    console.log('URL:', logEntry.url);
    console.groupEnd();

    // Envio assíncrono para o backend
    fetch((typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api') + '/logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || localStorage.getItem('token') || '')
        },
        body: JSON.stringify(logEntry)
    })
    .then(response => {
        if (!response.ok) console.warn(`%c[LOG-SERVER] Erro ao salvar no banco: ${response.status}`, 'color: orange');
        else console.log('%c[LOG-SERVER] Gravado no servidor ✓', 'color: green; font-size: 8pt');
    })
    .catch(err => {
        console.warn('%c[LOG-SERVER] Servidor de logs offline', 'color: orange; font-size: 8pt');
    });
}

// Cache dos parâmetros do cliente
let clientParams = null;

// Carregar parâmetros do cliente ao iniciar
async function loadClientParams() {
    if (typeof window !== 'undefined' && window.__LOGIN_RETAGUARDA_BLOQUEADO_SEM_TENANT) {
        applyDefaultStyles();
        return;
    }
    // Primeiro verificar localStorage - verificar ambas as chaves
    const storedParams = localStorage.getItem('empresaParams') || localStorage.getItem('clientParams');
    const selectedEmpresaId = localStorage.getItem('selectedEmpresaId');
    const selectedClienteId = localStorage.getItem('selectedClienteId');
    
    // Atualizar CLIENTE_ID se existir no localStorage (verifica ambas as chaves)
    if (selectedEmpresaId) {
        CLIENTE_ID = parseInt(selectedEmpresaId);
    } else if (selectedClienteId) {
        CLIENTE_ID = parseInt(selectedClienteId);
    }
    
    let hadStored = false;
    if (storedParams) {
        try {
            clientParams = JSON.parse(storedParams);
            applyClientStyles(clientParams);
            hadStored = true;
            console.log('Parâmetros carregados do localStorage:', clientParams);
        } catch (e) {
            console.log('Erro ao analisar localStorage, buscando do servidor');
        }
    }

    // Sem cache válido: tema padrão até a API responder
    if (!hadStored) {
        applyDefaultStyles();
    }

    // Sempre buscar no servidor quando possível (cache antigo não tinha mensagemBoasVindas etc.)
    const token = localStorage.getItem('token');
    try {
        const apiBase = typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api';
        const endpoint = token
            ? `${apiBase}/parametros-empresa/empresa/${CLIENTE_ID}`
            : `${apiBase}/parametros-cliente/branding/${CLIENTE_ID}`;
        const response = await fetch(endpoint, {
            headers: token ? {
                'Authorization': 'Bearer ' + token
            } : {}
        }).catch(function (err) {
            return null;
        });

        if (response && response.ok) {
            const fresh = await response.json();
            // Merge: branding retorna só parte dos campos; não apagar chavePix etc. do cache
            clientParams = Object.assign({}, clientParams || {}, fresh);
            localStorage.setItem('empresaParams', JSON.stringify(clientParams));
            applyClientStyles(clientParams);
            console.log('Parâmetros do cliente carregados:', clientParams);
        }
    } catch (error) {
        // Mantém o que já foi aplicado (cache ou padrão)
    }
}

// Aplicar estilos personalizados do cliente
function applyClientStyles(params) {
    if (!params) return;
    // Capacidades por tenant (farmácia, PMC etc.) para telas como PDV/produtos.
    window.__tenantFeatures = {
        segmento: params.segmento || '',
        moduloFarmaciaAtivo: !!params.moduloFarmaciaAtivo,
        farmaciaLoteValidadeObrigatorio: !!params.farmaciaLoteValidadeObrigatorio,
        farmaciaControladosAtivo: !!params.farmaciaControladosAtivo,
        farmaciaAntimicrobianosAtivo: !!params.farmaciaAntimicrobianosAtivo,
        farmaciaPmcAtivo: !!params.farmaciaPmcAtivo,
        farmaciaPmcModo: String(params.farmaciaPmcModo || 'ALERTA').toUpperCase(),
        moduloInformaticaAtivo: !!params.moduloInformaticaAtivo
    };
    try {
        window.dispatchEvent(new CustomEvent('tenantFeaturesUpdated', { detail: window.__tenantFeatures }));
    } catch (_) {}

    // Aplicar nome da empresa ao título da página
    if (params.nomeEmpresa) {
        document.title = params.nomeEmpresa;
        
        // Atualizar título no header (se existir)
        const titleElement = document.querySelector('header h1');
        if (titleElement) {
            titleElement.textContent = params.nomeEmpresa;
        }
        
        // Atualizar título na tela de login
        const loginTitle = document.querySelector('.login-header h1');
        if (loginTitle) {
            loginTitle.textContent = params.nomeEmpresa;
        }
    }

    // Definir chave PIX global da empresa (usada no PDV)
    if (params.chavePix) {
        window.PIX_STORE_KEY = params.chavePix;
    }

    // Aplicar logo - múltiplas posições (ignora caminhos locais inúteis na nuvem)
    var logoUrl = params.logoUrl ? sanitizeLogoUrlForDisplay(params.logoUrl) : '';
    var usarLogoMarcaCliente = !!(logoUrl && !deveSuprimirLogoMarcaCliente(params));
    // Retaguarda: ícone da aba sempre o institucional; logo da empresa só na página (header/login) e no PDV na aba.
    if (isPathUnderPdvFolder()) {
        applyCompanyFavicon(usarLogoMarcaCliente ? logoUrl : '');
    } else {
        applyCompanyFavicon('');
    }
    if (usarLogoMarcaCliente) {
        var esc = resolveLogoUrlForBrowser(logoUrl).replace(/"/g, '&quot;');
        var logoContainer = document.querySelector('.header-logo');
        if (!logoContainer) {
            var header = document.querySelector('header .header-content');
            if (header) {
                logoContainer = document.createElement('div');
                logoContainer.className = 'header-logo';
                header.appendChild(logoContainer);
            }
        }
        if (logoContainer) {
            logoContainer.innerHTML = '<img src="' + esc + '" alt="Logo" style="max-height: 50px; margin-right: 15px;" onerror="this.style.display=\'none\';">';
        }
        var loginLogoContainer = document.querySelector('.login-logo');
        if (!loginLogoContainer) {
            var loginHeader = document.querySelector('.login-header');
            if (loginHeader) {
                loginLogoContainer = document.createElement('div');
                loginLogoContainer.className = 'login-logo';
                loginHeader.insertBefore(loginLogoContainer, loginHeader.firstChild);
            }
        }
        if (loginLogoContainer) {
            loginLogoContainer.innerHTML = '<img src="' + esc + '" alt="Logo" style="max-width: 150px; margin-bottom: 20px;" onerror="this.style.display=\'none\';">';
        }
    } else {
        try {
            var h = document.querySelector('.header-logo');
            if (h) h.innerHTML = '';
            var lg = document.querySelector('.login-logo');
            if (lg) lg.innerHTML = '';
        } catch (_) {}
    }


    const P0 = temaPadrao();
    const corPrimaria = params.corPrimaria || P0.corPrimaria;
    const corSecundaria = params.corSecundaria || P0.corSecundaria;
    const corFundo = params.corFundo || P0.corFundo;
    const corTexto = params.corTexto || P0.corTexto;
    const corBotao = params.corBotao || P0.corBotao;
    const corBotaoTexto = params.corBotaoTexto || P0.corBotaoTexto;

    // Criar/Injetar tag de estilos com !important
    let styleTag = document.getElementById('custom-client-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'custom-client-styles';
        document.head.appendChild(styleTag);
    }

    // CSS com !important para sobrescrever o styles.css
    const corBotaoFinal = corBotao !== P0.corBotao ? corBotao : corPrimaria;
    
    styleTag.textContent = `
        body {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
            background-image: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
            color: ${corTexto} !important;
        }
        
        header {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
        }
        
        .login-header h1 {
            color: ${corPrimaria} !important;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, ${corBotaoFinal} 0%, ${corSecundaria} 100%) !important;
            color: ${corBotaoTexto} !important;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, ${corSecundaria} 0%, ${corBotaoFinal} 100%) !important;
        }
        
        .btn {
            background: ${corBotaoFinal} !important;
            color: ${corBotaoTexto} !important;
            border: none !important;
        }

        /* Importação CSV: botão de arquivo acompanha identidade da empresa */
        #importCsvFile {
            border-color: ${corPrimaria}55 !important;
        }
        #importCsvFile::file-selector-button {
            background: linear-gradient(135deg, ${corBotaoFinal} 0%, ${corSecundaria} 100%) !important;
            color: ${corBotaoTexto} !important;
        }
        #importCsvFile::file-selector-button:hover {
            background: linear-gradient(135deg, ${corSecundaria} 0%, ${corBotaoFinal} 100%) !important;
        }

        /* Modal de progresso da importação CSV — cores da empresa (todos os IDs) */
        #importProgressModal .import-progress-fill {
            background: linear-gradient(90deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
        }
        #importProgressModal .import-progress-percent {
            color: ${corPrimaria} !important;
        }
        #importProgressModal #importProgressTitle {
            color: ${corTexto} !important;
        }
        #importProgressModal .import-progress-empresa {
            color: ${corTexto} !important;
            opacity: 0.82;
        }
        #importProgressModal .import-progress-status {
            color: ${corTexto} !important;
            opacity: 0.9;
        }
        
        section h2 {
            border-bottom-color: ${corPrimaria} !important;
            color: ${corTexto} !important;
        }
        
        thead {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
        }
        
        .summary-icon {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
        }
        
        .product-category {
            color: ${corPrimaria} !important;
            background: ${corPrimaria}20 !important;
        }
        
        .btn-quantity {
            background: ${corBotaoFinal} !important;
        }
        
        .btn-quantity:hover {
            background: ${corSecundaria} !important;
        }
        
        #clientCount {
            color: ${corPrimaria} !important;
        }
        
        .product-price {
            color: ${corBotaoFinal} !important;
        }
        
        .cart-total span:last-child {
            color: ${corBotaoFinal} !important;
        }
        
        .sale-item-total {
            color: ${corBotaoFinal} !important;
        }
        
        .today-total span:last-child {
            color: ${corBotaoFinal} !important;
        }
        
        .user-info span {
            color: ${corPrimaria} !important;
        }
        
        .client-name {
            color: ${corPrimaria} !important;
        }
        
        .login-box {
            border-top: 5px solid ${corPrimaria} !important;
        }
        
        .container, main, .form-section, .list-section, .search-section {
            background-color: ${corFundo} !important;
            color: ${corTexto} !important;
        }

        /* Menu lateral - identidade visual da empresa (ID / parâmetros) */
        .nav-burger {
            border-color: rgba(255,255,255,0.35) !important;
            background: rgba(255,255,255,0.12) !important;
        }
        .nav-burger:hover {
            background: rgba(255,255,255,0.2) !important;
        }
        .nav-sidebar {
            background: linear-gradient(180deg, ${corPrimaria} 0%, ${corSecundaria} 38%, #0d0d12 92%, #08080b 100%) !important;
            border-right: 4px solid ${corPrimaria} !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06) !important;
        }
        .nav-sidebar__header {
            background: rgba(0,0,0,0.22) !important;
            border-bottom-color: rgba(255,255,255,0.14) !important;
        }
        .nav-sidebar__title { color: #fff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.35) !important; }
        .nav-sidebar__user, .nav-sidebar__user span { color: rgba(255,255,255,0.9) !important; }
        .nav-sidebar__close {
            border-color: rgba(255,255,255,0.35) !important;
            color: #fff !important;
            background: rgba(0,0,0,0.2) !important;
        }
        .nav-sidebar__close:hover { background: rgba(255,255,255,0.12) !important; }
        .nav-links a {
            color: #fff !important;
            border-color: transparent !important;
        }
        .nav-links a:hover {
            background: rgba(255,255,255,0.14) !important;
            border-color: rgba(255,255,255,0.2) !important;
        }
        .nav-links a.is-active {
            background: rgba(0,0,0,0.35) !important;
            border-left: 4px solid ${corPrimaria} !important;
            padding-left: 8px !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08) !important;
        }
        .nav-sidebar__footer {
            border-top-color: rgba(255,255,255,0.14) !important;
            background: rgba(0,0,0,0.18) !important;
        }
        .nav-sidebar__footer .btn {
            background: ${corBotaoFinal} !important;
            color: ${corBotaoTexto} !important;
        }
        .nav-sidebar__footer .btn:hover {
            filter: brightness(1.08) !important;
        }

        /* Cupom Fiscal - estilização por empresa */
        .cupom-header {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
            color: #fff !important;
        }
        .cupom-header__line { color: rgba(255,255,255,0.9) !important; }
        .cupom-header__title { color: #fff !important; }
        .cupom-header__empresa { color: #fff !important; }
        .cupom-paper {
            border-color: ${corPrimaria} !important;
            box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06), 2px 4px 12px ${corPrimaria}40 !important;
        }
        .cupom-body__cabecalho { color: ${corTexto} !important; border-bottom-color: ${corPrimaria}40 !important; }
        .cupom-body__separator { border-bottom-color: ${corPrimaria}30 !important; }
        .cupom-table tbody tr { border-bottom-color: ${corPrimaria}20 !important; }
        .cupom-table td { border-left-color: ${corPrimaria}20 !important; }
        .cupom-footer { border-top-color: ${corPrimaria} !important; }
        .cupom-footer__total span:last-child { color: ${corPrimaria} !important; }
        .cupom-footer__separator { border-bottom-color: ${corPrimaria}50 !important; }
    `;

    // ================================================================
    // Sistema de Alertas (layout único)
    // ================================================================
    styleTag.textContent += `
        .system-alert-dialog {
            border-top-color: ${corPrimaria} !important;
            box-shadow: 0 20px 50px ${corPrimaria}2B !important;
        }
        .system-alert-icon {
            background: linear-gradient(135deg, ${corPrimaria}20, ${corSecundaria}14) !important;
            color: ${corPrimaria} !important;
        }
        .system-alert-title {
            color: ${corTexto} !important;
        }
        .system-alert-ok {
            background: linear-gradient(135deg, ${corBotaoFinal} 0%, ${corSecundaria} 100%) !important;
            color: ${corBotaoTexto} !important;
        }
        .system-alert-confirm {
            background: linear-gradient(135deg, ${corBotaoFinal} 0%, ${corSecundaria} 100%) !important;
            color: ${corBotaoTexto} !important;
        }
        .modal-content {
            border-top-color: ${corPrimaria} !important;
            box-shadow: 0 20px 50px ${corPrimaria}2B !important;
        }
    `;

    // Cupom Fiscal: preencher nome e logo da empresa (quando na tela do PDV)
    const cupomEmpresaNome = document.getElementById('cupom-empresa-nome');
    const cupomEmpresaLogo = document.getElementById('cupom-empresa-logo');
    if (cupomEmpresaNome) {
        cupomEmpresaNome.textContent = params.nomeEmpresa || '';
        cupomEmpresaNome.style.display = params.nomeEmpresa ? 'block' : 'none';
    }
    if (cupomEmpresaLogo) {
        var cupomLogo = params.logoUrl ? sanitizeLogoUrlForDisplay(params.logoUrl) : '';
        if (cupomLogo) {
            var alt = (params.nomeEmpresa || 'Logo').replace(/"/g, '&quot;');
            var src = resolveLogoUrlForBrowser(cupomLogo).replace(/"/g, '&quot;');
            cupomEmpresaLogo.innerHTML = '<img src="' + src + '" alt="' + alt + '" onerror="this.style.display=\'none\'">';
            cupomEmpresaLogo.style.display = 'block';
        } else {
            cupomEmpresaLogo.innerHTML = '';
            cupomEmpresaLogo.style.display = 'none';
        }
    }

    // Mensagem de boas-vindas (login + cabeçalhos com #welcomeMessage)
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        const msg = (params.mensagemBoasVindas && String(params.mensagemBoasVindas).trim()) || '';
        const hasExplicitDefault = welcomeElement.hasAttribute('data-welcome-default');
        const defaultText = hasExplicitDefault ? (welcomeElement.getAttribute('data-welcome-default') || '') : 'Acesse sua conta para continuar';
        if (msg) {
            welcomeElement.textContent = msg;
            welcomeElement.removeAttribute('hidden');
        } else {
            welcomeElement.textContent = defaultText;
            if (defaultText === '') {
                welcomeElement.setAttribute('hidden', '');
            } else {
                welcomeElement.removeAttribute('hidden');
            }
        }
    }

    console.log('Estilos aplicados com sucesso!', params);
}

// Atualizar estilos dinâmicos (gradients, etc)
function updateDynamicStyles(params) {
    const P0 = temaPadrao();
    const corPrimaria = params.corPrimaria || P0.corPrimaria;
    const corSecundaria = params.corSecundaria || P0.corSecundaria;
    
    // Gradient correto
    const gradient = `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`;
    
    // Aplicar ao body
    document.body.style.background = `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Aplicar ao header
    const header = document.querySelector('header');
    if (header) {
        header.style.background = gradient;
    }

    // Aplicar gradient aos botões primários
    const buttons = document.querySelectorAll('.btn-primary');
    buttons.forEach(btn => {
        btn.style.background = gradient;
    });

    // Aplicar cor aos elementos de destaque
    const headings = document.querySelectorAll('section h2');
    headings.forEach(h2 => {
        h2.style.borderBottomColor = corPrimaria;
    });

    // Aplicar cor de fundo aos containers
    const containers = document.querySelectorAll('.container, main, .form-section, .list-section, .search-section');
    containers.forEach(el => {
        if (el.style.backgroundColor === 'rgb(255, 255, 255)' || !el.style.backgroundColor) {
            el.style.backgroundColor = params.corFundo || P0.corFundo;
        }
    });

    document.body.style.color = params.corTexto || P0.corTexto;
}

// Aplicar estilos padrão do sistema
function applyDefaultStyles() {
    const p = temaPadrao();
    applyClientStyles({
        nomeEmpresa: p.nomeEmpresa,
        corPrimaria: p.corPrimaria,
        corSecundaria: p.corSecundaria,
        corFundo: p.corFundo,
        corTexto: p.corTexto,
        corBotao: p.corBotao,
        corBotaoTexto: p.corBotaoTexto
    });
}

// Função para salvar parâmetros (para uso futuro via admin)
async function saveClientParams(params) {
    try {
        const apiBase = typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api';
        const response = await fetch(apiBase + '/parametros-empresa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify({
                clienteId: CLIENTE_ID,
                ...params
            })
        });

        if (response.ok) {
            const savedParams = await response.json();
            applyClientStyles(savedParams);
            return savedParams;
        }
    } catch (error) {
        console.error('Erro ao salvar parâmetros:', error);
    }
    return null;
}

// Uma única execução: antes rodava 2x (DOMContentLoaded + interactive), causando piscar no login.
(function initLoadClientParamsOnce() {
    if (window.__loadClientParamsScheduled) return;
    window.__loadClientParamsScheduled = true;
    function run() {
        loadClientParams();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
        run();
    }
})();

// ================================================================
// Sistema de Alertas (layout único) - showSystemAlert(message, type, title?)
// ================================================================
(function registerSystemAlerts() {
    if (typeof window === 'undefined') return;

    var OVERLAY_ID = 'systemAlertOverlay';
    var timer = null;

    function typeTitle(t) {
        switch (String(t || '').toLowerCase()) {
            case 'success':
                return 'Sucesso';
            case 'error':
                return 'Erro';
            case 'warning':
                return 'Atenção';
            case 'info':
            default:
                return 'Informação';
        }
    }

    function iconSvg(t) {
        var k = String(t || '').toLowerCase();
        // SVGs simples, usando stroke="currentColor" para herdar cor do tema.
        if (k === 'success') {
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>';
        }
        if (k === 'error') {
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2 2 2M12 9v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        }
        if (k === 'warning') {
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.3 4.8l-8.1 14A2 2 0 004 21h16a2 2 0 001.8-2.2l-8.1-14a2 2 0 00-3.4 0z"/></svg>';
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 22a10 10 0 110-20 10 10 0 010 20z"/></svg>';
    }

    function ensureOverlay() {
        var ov = document.getElementById(OVERLAY_ID);
        if (ov) return ov;

        ov = document.createElement('div');
        ov.id = OVERLAY_ID;
        ov.className = 'system-alert-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-live', 'polite');

        ov.innerHTML =
            '<div class="system-alert-dialog">' +
            '  <div class="system-alert-icon" aria-hidden="true"></div>' +
            '  <h3 class="system-alert-title"></h3>' +
            '  <p class="system-alert-text"></p>' +
            '  <div class="system-alert-actions">' +
            '    <button type="button" class="system-alert-ok">OK</button>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(ov);

        // Fechar ao clicar fora do diálogo
        ov.addEventListener('click', function (e) {
            if (e.target === ov) window.hideSystemAlert();
        });

        // Fechar pelo botão OK
        var btn = ov.querySelector('.system-alert-ok');
        if (btn) {
            btn.addEventListener('click', function () {
                window.hideSystemAlert();
            });
        }

        return ov;
    }

    window.hideSystemAlert = function () {
        var ov = document.getElementById(OVERLAY_ID);
        if (!ov) return;
        ov.classList.remove('show');
    };

    window.showSystemAlert = function (message, type, title) {
        if (promptResolve) finishSystemPrompt(null);
        var ov = ensureOverlay();
        var k = String(type || 'info').toLowerCase();

        var iconEl = ov.querySelector('.system-alert-icon');
        var titleEl = ov.querySelector('.system-alert-title');
        var textEl = ov.querySelector('.system-alert-text');

        if (iconEl) iconEl.innerHTML = iconSvg(k);
        if (titleEl) titleEl.textContent = title ? String(title) : typeTitle(k);
        if (textEl) textEl.textContent = (message == null) ? '' : String(message);

        ov.classList.add('show');

        // Auto-fechar após alguns segundos (mantém comportamento similar aos alertas antigos)
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
            window.hideSystemAlert();
        }, 3000);
    };

    var CONFIRM_ID = 'systemConfirmOverlay';
    var confirmResolve = null;
    var confirmEscHandler = null;

    function ensureConfirmOverlay() {
        var ov = document.getElementById(CONFIRM_ID);
        if (ov) return ov;
        ov = document.createElement('div');
        ov.id = CONFIRM_ID;
        ov.className = 'system-alert-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.innerHTML =
            '<div class="system-alert-dialog">' +
            '  <div class="system-alert-icon" aria-hidden="true"></div>' +
            '  <h3 class="system-alert-title"></h3>' +
            '  <p class="system-alert-text"></p>' +
            '  <div class="system-alert-actions system-alert-actions--dual">' +
            '    <button type="button" class="system-alert-cancel"></button>' +
            '    <button type="button" class="system-alert-confirm"></button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) {
            if (e.target === ov) finishSystemConfirm(false);
        });
        ov.querySelector('.system-alert-cancel').addEventListener('click', function () {
            finishSystemConfirm(false);
        });
        ov.querySelector('.system-alert-confirm').addEventListener('click', function () {
            finishSystemConfirm(true);
        });
        return ov;
    }

    function finishSystemConfirm(yes) {
        var ov = document.getElementById(CONFIRM_ID);
        if (ov) ov.classList.remove('show');
        if (confirmEscHandler) {
            document.removeEventListener('keydown', confirmEscHandler);
            confirmEscHandler = null;
        }
        var r = confirmResolve;
        confirmResolve = null;
        if (r) r(!!yes);
    }

    /** Fecha o modal de confirmação como “Cancelar” (ex.: chamado pelo PDV antes de stopPropagation no window). */
    window.dismissSystemConfirm = function () {
        finishSystemConfirm(false);
    };

    /**
     * Modal de confirmação estilizado (substitui window.confirm).
     * Retorna Promise resolvida com true/false.
     */
    window.showSystemConfirm = function (message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            if (promptResolve) finishSystemPrompt(null);
            if (confirmResolve) finishSystemConfirm(false);
            window.hideSystemAlert();
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            confirmResolve = resolve;
            var ov = ensureConfirmOverlay();
            var k = String(opts.type || 'warning').toLowerCase();
            var iconEl = ov.querySelector('.system-alert-icon');
            if (iconEl) iconEl.innerHTML = iconSvg(k);
            ov.querySelector('.system-alert-title').textContent =
                opts.title != null ? String(opts.title) : 'Confirmação';
            ov.querySelector('.system-alert-text').textContent = message == null ? '' : String(message);
            ov.querySelector('.system-alert-confirm').textContent = opts.confirmText || 'OK';
            ov.querySelector('.system-alert-cancel').textContent = opts.cancelText || 'Cancelar';
            ov.classList.add('show');
            confirmEscHandler = function (e) {
                if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) finishSystemConfirm(false);
            };
            document.addEventListener('keydown', confirmEscHandler);
        });
    };

    var PROMPT_ID = 'systemPromptOverlay';
    var promptResolve = null;
    var promptEscHandler = null;
    var promptEnterHandler = null;

    function finishSystemPrompt(value) {
        var ov = document.getElementById(PROMPT_ID);
        if (ov) ov.classList.remove('show');
        if (promptEscHandler) {
            document.removeEventListener('keydown', promptEscHandler);
            promptEscHandler = null;
        }
        var inp = document.getElementById('systemPromptInput');
        if (inp && promptEnterHandler) {
            inp.removeEventListener('keydown', promptEnterHandler);
            promptEnterHandler = null;
        }
        var r = promptResolve;
        promptResolve = null;
        if (r) r(value);
    }

    function ensurePromptOverlay() {
        var ov = document.getElementById(PROMPT_ID);
        if (ov) return ov;
        ov = document.createElement('div');
        ov.id = PROMPT_ID;
        ov.className = 'system-alert-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.innerHTML =
            '<div class="system-alert-dialog">' +
            '  <div class="system-alert-icon" aria-hidden="true"></div>' +
            '  <h3 class="system-alert-title"></h3>' +
            '  <p class="system-alert-text"></p>' +
            '  <div class="system-alert-field">' +
            '    <label class="system-alert-label" for="systemPromptInput"></label>' +
            '    <input type="text" id="systemPromptInput" class="system-alert-input" autocomplete="off" spellcheck="false" />' +
            '  </div>' +
            '  <div class="system-alert-actions system-alert-actions--dual">' +
            '    <button type="button" class="system-alert-cancel"></button>' +
            '    <button type="button" class="system-alert-confirm"></button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) {
            if (e.target === ov) finishSystemPrompt(null);
        });
        ov.querySelector('.system-alert-cancel').addEventListener('click', function () {
            finishSystemPrompt(null);
        });
        ov.querySelector('.system-alert-confirm').addEventListener('click', function () {
            var el = document.getElementById('systemPromptInput');
            finishSystemPrompt(el ? el.value : '');
        });
        return ov;
    }

    /**
     * Modal de entrada de texto (substitui window.prompt).
     * Resolve com string (pode ser vazia) ou null se cancelar / fechar.
     */
    window.showSystemPrompt = function (message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            if (promptResolve) finishSystemPrompt(null);
            window.hideSystemAlert();
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            if (confirmResolve) finishSystemConfirm(false);
            promptResolve = resolve;
            var ov = ensurePromptOverlay();
            var k = String(opts.type || 'info').toLowerCase();
            var iconEl = ov.querySelector('.system-alert-icon');
            if (iconEl) iconEl.innerHTML = iconSvg(k);
            ov.querySelector('.system-alert-title').textContent =
                opts.title != null ? String(opts.title) : 'Informação';
            ov.querySelector('.system-alert-text').textContent = message == null ? '' : String(message);
            var lbl = ov.querySelector('.system-alert-label');
            var inp = document.getElementById('systemPromptInput');
            if (lbl) lbl.textContent = opts.inputLabel != null ? String(opts.inputLabel) : 'Resposta';
            if (inp) {
                inp.value = opts.defaultValue != null ? String(opts.defaultValue) : '';
                inp.placeholder = opts.placeholder != null ? String(opts.placeholder) : '';
                inp.type = opts.inputType === 'password' ? 'password' : 'text';
            }
            ov.querySelector('.system-alert-confirm').textContent = opts.confirmText || 'OK';
            ov.querySelector('.system-alert-cancel').textContent = opts.cancelText || 'Cancelar';
            ov.classList.add('show');
            promptEscHandler = function (e) {
                if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) finishSystemPrompt(null);
            };
            document.addEventListener('keydown', promptEscHandler);
            if (inp) {
                promptEnterHandler = function (e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        finishSystemPrompt(inp.value);
                    }
                };
                inp.addEventListener('keydown', promptEnterHandler);
                setTimeout(function () {
                    try {
                        inp.focus();
                        inp.select();
                    } catch (err) {}
                }, 0);
            }
        });
    };
})();
