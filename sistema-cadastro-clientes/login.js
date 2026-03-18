// Sistema de Login - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

const API_URL = 'http://localhost:8080/api';
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

function redirectAfterLogin(roleNorm) {
    if (roleNorm === 'ADM') {
        window.location.href = 'relatorios.html';
    } else if (localStorage.getItem('pdvTerminalId')) {
        window.location.href = 'pdv/';
    } else {
        window.location.href = 'pdv/login.html';
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
            var userEl = document.getElementById('sessaoAtivaUser');
            var roleNorm = normalizeRole(me.role);
            if (userEl) userEl.textContent = (me.username || '') + ' (' + roleNorm + ')';
            banner.classList.add('show');
            var ir = document.getElementById('sessaoIrSistema');
            var sair = document.getElementById('sessaoSairConta');
            if (ir) {
                ir.onclick = function () {
                    redirectAfterLogin(roleNorm);
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

// Event listener para o formulário de login
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');
    
    // Limpar erro anterior
    loginError.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
            let id = data.id;
            let username = data.username;
            let roleNorm = normalizeRole(data.role);
            try {
                const meRes = await fetch(`${API_URL}/auth/me`, {
                    headers: { 'Authorization': 'Bearer ' + data.token }
                });
                if (meRes.ok) {
                    const me = await meRes.json();
                    if (me && typeof me === 'object' && me.id != null) {
                        id = me.id;
                        if (me.username) username = me.username;
                        roleNorm = normalizeRole(me.role);
                    }
                }
            } catch (e) {
                console.warn('Não foi possível confirmar perfil em /auth/me, usando resposta do login.', e);
            }
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
                id: id,
                username: username,
                role: roleNorm
            }));
            redirectAfterLogin(roleNorm);
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
});

// Event listener para o formulário de cadastro
document.getElementById('registerForm').addEventListener('submit', async function(e) {
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
            window.location.href = 'pdv/login.html';
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
document.getElementById('registerModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeRegisterModal();
    }
});

// Função de logout (para ser chamada desde o sistema principal)
function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = 'login.html';
}

