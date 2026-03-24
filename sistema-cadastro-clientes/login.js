// Sistema de Login - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

var API_URL =
    typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function'
        ? window.getApiBaseUrl()
        : 'http://localhost:8080/api';
const CURRENT_USER_KEY = 'currentUser';
const TOKEN_KEY = 'authToken';

/** Normaliza o perfil vindo da API (string, enum JSON, etc.) */
function normalizeRole(role) {
    if (role == null || role === '') return 'VENDEDOR';
    if (typeof role === 'string') return role.trim().toUpperCase();
    if (typeof role === 'object' && role !== null && typeof role.name === 'string') {
        return role.name.trim().toUpperCase();
    }
    return String(role).trim().toUpperCase();
}

/**
 * Senha provisória (1º acesso): confirma flag vinda do login ou de /auth/me.
 * Aceita boolean, string ("true") ou número 1 (evita falha em PRD se o JSON variar).
 */
function mustForcarTrocaSenha(obj) {
    if (!obj || typeof obj !== 'object') return false;
    var v = obj.mustChangePassword;
    if (v === true) return true;
    if (v === false || v === null || v === undefined) return false;
    if (typeof v === 'string') {
        var s = v.trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'yes';
    }
    if (typeof v === 'number') return v === 1;
    return false;
}

/**
 * PDV exige ?empresaId= na URL (exceto sessão já válida no próprio PDV).
 * @param {number|null|undefined} empresaIdUsuario — empresa real do usuário (/auth/me). Prioridade sobre o tenant da URL de login (ex.: ?empresaId=1 do super ADM).
 */
function buildPdvLoginUrlComTenant(empresaIdUsuario) {
    var resolved = parseInt(empresaIdUsuario, 10);
    if (!isNaN(resolved) && resolved >= 1) {
        return 'pdv/login.html?empresaId=' + encodeURIComponent(String(resolved));
    }
    var eid = parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0', 10);
    if (eid >= 1) {
        return 'pdv/login.html?empresaId=' + encodeURIComponent(String(eid));
    }
    var ep = (typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number') ? window.EMPRESA_ID_PADRAO_SISTEMA : 1;
    return 'pdv/login.html?empresaId=' + encodeURIComponent(String(ep));
}

function redirectAfterLogin(roleNorm, empresaIdUsuario) {
    if (roleNorm === 'ADM' || roleNorm === 'ADMIN_EMPRESA') {
        window.location.href = 'relatorios.html';
    } else if (localStorage.getItem('pdvTerminalId')) {
        window.location.href = 'pdv/';
    } else {
        window.location.href = buildPdvLoginUrlComTenant(empresaIdUsuario);
    }
}

// Carregar usuários do localStorage ao iniciar (fallback)
let users = [];

var _confirmCadastroPending = null;
function finishConfirmCadastro(yes) {
    if (!_confirmCadastroPending) return;
    var r = _confirmCadastroPending;
    _confirmCadastroPending = null;
    var m = document.getElementById('confirmCadastroModal');
    if (m) m.classList.remove('show');
    r(yes);
}
function openConfirmCadastroModal(username) {
    return new Promise(function(resolve) {
        _confirmCadastroPending = resolve;
        var hint = document.getElementById('confirmCadastroUsernameHint');
        if (hint) hint.textContent = username ? '“' + username + '”' : '';
        var m = document.getElementById('confirmCadastroModal');
        if (m) m.classList.add('show');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var empresaPadrao = (typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number') ? window.EMPRESA_ID_PADRAO_SISTEMA : 1;
    var bloqueado = false;
    try {
        bloqueado = !!window.__LOGIN_RETAGUARDA_BLOQUEADO_SEM_TENANT;
    } catch (_) {}
    if (bloqueado) {
        var bp = document.getElementById('loginBlockedPanel');
        var np = document.getElementById('loginNormalPanel');
        if (bp) bp.style.display = 'block';
        if (np) np.style.display = 'none';
        var la = document.getElementById('loginLinkAdminPadrao');
        if (la) {
            la.href = 'login.html?empresaId=' + encodeURIComponent(String(empresaPadrao));
        }
    }

    // Foco inicial no campo de usuário para agilizar o login
    var usernameInput = document.getElementById('username');
    if (usernameInput && !bloqueado) {
        try {
            usernameInput.focus();
            usernameInput.select();
        } catch (_) {}
    }

    var cm = document.getElementById('confirmCadastroModal');
    var sim = document.getElementById('confirmCadastroSim');
    var nao = document.getElementById('confirmCadastroNao');
    if (sim) sim.addEventListener('click', function() { finishConfirmCadastro(true); });
    if (nao) nao.addEventListener('click', function() { finishConfirmCadastro(false); });
    if (cm) {
        cm.addEventListener('click', function(ev) {
            if (ev.target === cm) finishConfirmCadastro(false);
        });
    }
    document.addEventListener('keydown', function(ev) {
        if (ev.key !== 'Escape') return;
        if (cm && cm.classList.contains('show')) finishConfirmCadastro(false);
    });
    try {
        var mpl = sessionStorage.getItem('msgPosLogin');
        if (mpl) {
            sessionStorage.removeItem('msgPosLogin');
            var le0 = document.getElementById('loginError');
            if (le0) {
                le0.textContent = mpl;
                le0.style.color = '#1565c0';
                le0.classList.add('show');
            }
        }
        var aviso = sessionStorage.getItem('pdvAvisoRetaguarda');
        if (aviso) {
            sessionStorage.removeItem('pdvAvisoRetaguarda');
            var box = document.getElementById('pdvAvisoRetaguarda');
            if (box) {
                box.textContent = aviso;
                box.style.display = 'block';
            }
        }
        if (sessionStorage.getItem('abrirCadastroRetaguarda') === '1') {
            sessionStorage.removeItem('abrirCadastroRetaguarda');
            var sug = sessionStorage.getItem('cadastroUsernameSugerido') || '';
            sessionStorage.removeItem('cadastroUsernameSugerido');
            showRegister();
            if (sug && document.getElementById('newUsername')) {
                document.getElementById('newUsername').value = sug;
            }
            try {
                var empCad = sessionStorage.getItem('cadastroEmpresaIdPdv');
                if (empCad && document.getElementById('registerEmpresaId')) {
                    document.getElementById('registerEmpresaId').value = empCad;
                }
                sessionStorage.removeItem('cadastroEmpresaIdPdv');
            } catch (e) {}
            var box2 = document.getElementById('pdvAvisoRetaguarda');
            if (box2 && box2.style.display !== 'block') {
                box2.textContent = 'Complete o cadastro com o código de convite enviado pelo administrador. Depois: login do PDV.';
                box2.style.display = 'block';
            }
        }
    } catch (_) {}
    // Nunca redirecionar sozinho ao abrir a página (evita loop infinito entre telas).
    initBannerSessaoValida();
});

function limparSessaoArmazenada() {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem('pdvTerminalId');
        localStorage.removeItem('pdvTerminalCodigo');
    } catch (_) {}
}

/** Se o JWT for válido, mostra banner “Continuar” — sem redirect automático */
function initBannerSessaoValida() {
    var banner = document.getElementById('sessaoAtivaBanner');
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token || !banner) return;

    fetch(API_URL + '/auth/me', { headers: { Authorization: 'Bearer ' + token } })
        .then(function (r) {
            if (!r.ok) {
                limparSessaoArmazenada();
                return null;
            }
            return r.json();
        })
        .then(function (me) {
            if (!me || me.id == null) return;
            try {
                if (sessionStorage.getItem('skipAutoRedirectLoginRetaguarda') === '1') {
                    sessionStorage.removeItem('skipAutoRedirectLoginRetaguarda');
                    return;
                }
            } catch (_) {}
            if (mustForcarTrocaSenha(me)) {
                try {
                    var eBanner = me.empresaId != null && me.empresaId >= 1 ? me.empresaId : parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0', 10);
                    if (eBanner >= 1) sessionStorage.setItem('redefinirSenhaEmpresaId', String(eBanner));
                } catch (_) {}
                window.location.href = 'redefinir-senha-primeiro-acesso.html';
                return;
            }
            var userEl = document.getElementById('sessaoAtivaUser');
            var roleNorm = normalizeRole(me.role);
            if (userEl) userEl.textContent = (me.username || '') + ' (' + roleNorm + ')';
            banner.classList.add('show');
            var eidSess = null;
            try {
                if (me.empresaId != null && me.empresaId !== '' && Number(me.empresaId) >= 1) {
                    eidSess = Number(me.empresaId);
                }
            } catch (_) {}
            var ir = document.getElementById('sessaoIrSistema');
            var sair = document.getElementById('sessaoSairConta');
            if (ir) {
                ir.onclick = function () {
                    redirectAfterLogin(roleNorm, eidSess);
                };
            }
            if (sair) {
                sair.onclick = function () {
                    limparSessaoArmazenada();
                    banner.classList.remove('show');
                };
            }
        })
        .catch(function () {
            /* API offline: não apagar sessão; usuário pode tentar login */
        });
}

function obterEmpresaParaCadastro() {
    // Prioridade: vindo do PDV (quando o PDV te manda para a retaguarda)
    try {
        var empCad = sessionStorage.getItem('cadastroEmpresaIdPdv');
        var n1 = parseInt(empCad, 10);
        if (n1 && n1 >= 1) return n1;
    } catch (e) {}

    // Segundo: valor já pré-preenchido (hidden)
    try {
        var el = document.getElementById('registerEmpresaId');
        var raw = el ? el.value : '';
        var n2 = parseInt(raw, 10);
        if (n2 && n2 >= 1) return n2;
    } catch (e2) {}

    // Terceiro: “empresa vigente” do sistema (config.js)
    try {
        if (typeof getClienteId === 'function') {
            var n3 = parseInt(getClienteId(), 10);
            if (n3 && n3 >= 1) return n3;
        }
    } catch (e3) {}

    // Fallback: selecionado no localStorage (ou 1 como padrão)
    try {
        var selected = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '1';
        var n4 = parseInt(selected, 10);
        if (n4 && n4 >= 1) return n4;
    } catch (e4) {}

    return 1;
}

// Função para mostrar o modal de cadastro
function showRegister() {
    document.getElementById('registerModal').classList.add('show');
    // Garante que o hidden registerEmpresaId sempre tenha valor.
    try {
        var el = document.getElementById('registerEmpresaId');
        if (el) el.value = obterEmpresaParaCadastro();
    } catch (e) {}
}

// Função para fechar o modal de cadastro
function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('show');
    document.getElementById('registerForm').reset();
    document.getElementById('registerError').textContent = '';
    document.getElementById('registerError').classList.remove('show');
}

/** Inicia contador regressivo para mensagem de rate limit. */
function startRateLimitCountdown(errorElement, messageTemplate, totalSeconds) {
    var intervalId = null;
    var remaining = totalSeconds;
    // Extrair o padrão base da mensagem (substituir apenas o número de segundos)
    var baseText = messageTemplate.replace(/\d+\s+segundos?/i, '{SEGUNDOS}');
    function update() {
        if (remaining <= 0) {
            if (intervalId) clearInterval(intervalId);
            errorElement.classList.remove('show');
            return;
        }
        var msg = baseText.replace('{SEGUNDOS}', remaining + (remaining === 1 ? ' segundo' : ' segundos'));
        errorElement.textContent = msg;
        errorElement.classList.add('show');
        remaining--;
    }
    update();
    intervalId = setInterval(update, 1000);
    return intervalId;
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');
    
    // Limpar erro anterior e parar contador anterior se existir
    loginError.classList.remove('show');
    if (window._loginRateLimitInterval) {
        clearInterval(window._loginRateLimitInterval);
        window._loginRateLimitInterval = null;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        // Verificar rate limit (429) antes de parse JSON
        if (response.status === 429) {
            var rateLimitData = await response.json().catch(function() { return { message: 'Muitas tentativas. Aguarde um momento.' }; });
            var msg = (rateLimitData.message || '').toString();
            // Extrair número de segundos da mensagem (ex: "60 segundos" ou "Tente novamente em 60 segundos")
            var match = msg.match(/(\d+)\s+segundos?/i);
            var segundos = match ? parseInt(match[1], 10) : 60;
            window._loginRateLimitInterval = startRateLimitCountdown(loginError, msg, segundos);
            return;
        }
        
        const data = await response.json();
        
        if (data.token) {
            // Evita misturar token/usuário antigo com o novo login (ex.: troca de conta)
            limparSessaoArmazenada();
            if (mustForcarTrocaSenha(data)) {
                localStorage.setItem(TOKEN_KEY, data.token);
                let id0 = data.id;
                let user0 = data.username;
                let role0 = normalizeRole(data.role);
                var u0 = { id: id0, username: user0, role: role0 };
                if (data.empresaId != null && data.empresaId !== '' && Number(data.empresaId) >= 1) {
                    u0.empresaId = Number(data.empresaId);
                }
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(u0));
                try {
                    var eLogin = data.empresaId != null && data.empresaId >= 1 ? data.empresaId : parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0', 10);
                    if (eLogin >= 1) sessionStorage.setItem('redefinirSenhaEmpresaId', String(eLogin));
                } catch (_) {}
                window.location.href = 'redefinir-senha-primeiro-acesso.html';
                return;
            }
            localStorage.setItem(TOKEN_KEY, data.token);
            let id = data.id;
            let usernameResolved = data.username;
            let roleNorm = normalizeRole(data.role);
            var empresaIdResolved = null;
            try {
                const meRes = await fetch(`${API_URL}/auth/me`, {
                    headers: { 'Authorization': 'Bearer ' + data.token }
                });
                if (meRes.ok) {
                    const me = await meRes.json();
                    if (me && typeof me === 'object' && me.id != null) {
                        id = me.id;
                        if (me.username) usernameResolved = me.username;
                        roleNorm = normalizeRole(me.role);
                        if (me.empresaId != null && me.empresaId !== '') {
                            empresaIdResolved = Number(me.empresaId);
                        }
                        if (mustForcarTrocaSenha(me)) {
                            var uMc = { id: id, username: usernameResolved, role: roleNorm };
                            if (me.empresaId != null && Number(me.empresaId) >= 1) {
                                uMc.empresaId = Number(me.empresaId);
                                empresaIdResolved = Number(me.empresaId);
                            } else if (empresaIdResolved != null) {
                                uMc.empresaId = empresaIdResolved;
                            }
                            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(uMc));
                            try {
                                var eM = empresaIdResolved != null && empresaIdResolved >= 1
                                    ? empresaIdResolved
                                    : parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0', 10);
                                if (eM >= 1) sessionStorage.setItem('redefinirSenhaEmpresaId', String(eM));
                            } catch (_) {}
                            window.location.href = 'redefinir-senha-primeiro-acesso.html';
                            return;
                        }
                    }
                }
            } catch (e) {
                console.warn('Não foi possível confirmar perfil em /auth/me, usando resposta do login.', e);
            }
            if (empresaIdResolved == null && data.empresaId != null && data.empresaId !== '') {
                empresaIdResolved = Number(data.empresaId);
            }
            var userPayload = {
                id: id,
                username: usernameResolved,
                role: roleNorm
            };
            if (empresaIdResolved != null && !isNaN(empresaIdResolved) && empresaIdResolved >= 1) {
                userPayload.empresaId = empresaIdResolved;
                // Alinha tenant ao usuário real (evita PDV com empresaId=1 na URL enquanto o vendedor é da empresa 2).
                try {
                    localStorage.setItem('selectedEmpresaId', String(empresaIdResolved));
                    localStorage.setItem('selectedClienteId', String(empresaIdResolved));
                    localStorage.removeItem('empresaParams');
                    localStorage.removeItem('clientParams');
                } catch (_) {}
            }
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userPayload));
            redirectAfterLogin(roleNorm, empresaIdResolved);
        } else {
            var fail = (data.message || '').toString();
            var low = fail.toLowerCase();
            if (low.indexOf('não encontrado') >= 0 || low.indexOf('nao encontrado') >= 0) {
                var querCadastrar = await openConfirmCadastroModal(username);
                if (querCadastrar) {
                    showRegister();
                    if (document.getElementById('newUsername')) {
                        document.getElementById('newUsername').value = username;
                    }
                    loginError.textContent = 'Preencha os dados na janela Cadastre-se.';
                    loginError.classList.add('show');
                } else {
                    loginError.textContent = 'Usuário não cadastrado.';
                    loginError.classList.add('show');
                }
            } else {
                loginError.textContent = fail || 'Usuário ou senha incorretos!';
                loginError.classList.add('show');
            }
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        loginError.textContent = 'Erro de conexão. Tente novamente.';
        loginError.classList.add('show');
    }
}
window.handleLoginSubmit = handleLoginSubmit;

function bindLoginFormHandler() {
    var form = document.getElementById('loginForm');
    if (!form) return;
    if (form.dataset.loginBound === '1') return;
    form.dataset.loginBound = '1';
    form.addEventListener('submit', handleLoginSubmit);
}

// Event listener para o formulário de login
bindLoginFormHandler();
window.addEventListener('load', bindLoginFormHandler);

// Event listener para o formulário de cadastro
var registerFormEl = document.getElementById('registerForm');
if (registerFormEl) registerFormEl.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const newUsername = document.getElementById('newUsername').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const registerError = document.getElementById('registerError');
    
    // Limpar erro anterior
    registerError.textContent = '';
    registerError.classList.remove('show');
    
    // Validar senhas
    if (newPassword !== confirmPassword) {
        registerError.textContent = 'As senhas não conferem!';
        registerError.classList.add('show');
        return;
    }
    
    // Validar tamanho da senha
    if (newPassword.length < 4) {
        registerError.textContent = 'A senha deve ter pelo menos 4 caracteres!';
        registerError.classList.add('show');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: newUsername,
                password: newPassword,
                empresaId: obterEmpresaParaCadastro(),
                codigoConvite: document.getElementById('registerCodigoConvite').value.trim()
            })
        });
        
        const data = await response.json();
        
        if (data.token) {
            closeRegisterModal();
            try {
                sessionStorage.setItem('pdvPrefillUsername', newUsername);
                sessionStorage.setItem('pdvPosCadastroMsg', 'Cadastro realizado! Informe a senha e o ID da empresa para entrar no PDV.');
            } catch (e) {}
            var empCad = obterEmpresaParaCadastro();
            window.location.href = empCad >= 1
                ? ('pdv/login.html?empresaId=' + encodeURIComponent(String(empCad)))
                : buildPdvLoginUrlComTenant();
        } else {
            registerError.textContent = data.message || 'Erro ao cadastrar usuário';
            registerError.classList.add('show');
        }
    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        registerError.textContent = 'Erro de conexão. Tente novamente.';
        registerError.classList.add('show');
    }
});

// Fechar modal ao clicar fora
var registerModalEl = document.getElementById('registerModal');
if (registerModalEl) registerModalEl.addEventListener('click', function(e) {
    if (e.target === this) {
        closeRegisterModal();
    }
});

// Função de logout (para ser chamada desde o sistema principal)
async function logout() {
    var loginTarget = 'login.html';
    var token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        try {
            var res = await fetch(API_URL + '/auth/me', {
                headers: { Authorization: 'Bearer ' + token },
                cache: 'no-store'
            });
            if (res.ok) {
                var me = await res.json();
                var roleNorm = normalizeRole(me.role);
                if (roleNorm === 'ADM') {
                    var epAdm = (typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number') ? window.EMPRESA_ID_PADRAO_SISTEMA : 1;
                    loginTarget = 'login.html?empresaId=' + encodeURIComponent(String(epAdm));
                } else {
                    var eid = me.empresaId != null && me.empresaId !== '' ? parseInt(me.empresaId, 10) : NaN;
                    if (isNaN(eid) || eid < 1) {
                        eid = parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0', 10);
                    }
                    if (eid >= 1) {
                        loginTarget = 'login.html?empresaId=' + encodeURIComponent(String(eid));
                    }
                }
            }
        } catch (_) {}
    }
    if (loginTarget === 'login.html') {
        try {
            var raw = localStorage.getItem(CURRENT_USER_KEY);
            if (raw) {
                var u = JSON.parse(raw);
                var role = normalizeRole(u && u.role);
                if (role === 'ADM') {
                    var epAdm2 = (typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number') ? window.EMPRESA_ID_PADRAO_SISTEMA : 1;
                    loginTarget = 'login.html?empresaId=' + encodeURIComponent(String(epAdm2));
                } else if (u && u.empresaId != null && u.empresaId !== '' && parseInt(u.empresaId, 10) >= 1) {
                    loginTarget = 'login.html?empresaId=' + encodeURIComponent(String(u.empresaId));
                } else {
                    var sel = parseInt(localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0', 10);
                    if (sel >= 1 && role && role !== 'ADM') {
                        loginTarget = 'login.html?empresaId=' + encodeURIComponent(String(sel));
                    }
                }
            }
        } catch (_) {}
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = loginTarget;
}

