

// Sistema de Autenticação e Autorização - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

// Constantes de configuração
const CURRENT_USER_KEY = 'currentUser';
const TOKEN_KEY = 'authToken';
const API_URL = 'http://localhost:8080/api';

// Lista de tokens invalidados (simple blacklist em memória)
let invalidatedTokens = new Set();

// Obter token atual
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Verificar se o usuário está logado
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar se token foi invalidado
    if (invalidatedTokens.has(token)) {
        logout();
        return false;
    }
    
    return true;
}

// Obter usuário atual
function getCurrentUser() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (currentUser) {
        return JSON.parse(currentUser);
    }
    return null;
}

function normalizeUserRole(role) {
    if (role == null || role === '') return '';
    if (typeof role === 'string') return role.trim().toUpperCase();
    if (typeof role === 'object' && role !== null && typeof role.name === 'string') {
        return role.name.trim().toUpperCase();
    }
    return String(role).trim().toUpperCase();
}

async function syncCurrentUserFromApi() {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        });
        if (res.status === 401) {
            localStorage.removeItem(CURRENT_USER_KEY);
            localStorage.removeItem(TOKEN_KEY);
            return null;
        }
        if (!res.ok) return null;
        const me = await res.json();
        if (!me || me.id == null) return null;
        const eidNorm = resolveEmpresaIdFromUserLike(me);
        const normalized = {
            id: me.id,
            username: me.username || '',
            role: normalizeUserRole(me.role),
            empresaId: eidNorm
        };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized));
        return normalized;
    } catch (_) {
        return null;
    }
}

// Verificar se o usuário é Administrador
function isAdmin() {
    const user = getCurrentUser();
    const role = user ? normalizeUserRole(user.role) : '';
    return role === 'ADM' || role === 'ADMIN_EMPRESA';
}

// Verificar se o usuário é Vendedor
function isVendedor() {
    const user = getCurrentUser();
    return user && normalizeUserRole(user.role) === 'VENDEDOR';
}

// Verificar permissão para acessar a página
function checkPermission(requiredRole) {
    if (!checkAuth()) return false;
    
    const user = getCurrentUser();
    
    if (requiredRole === 'adm') {
        if (!isAdmin()) {
            if (typeof window.showSystemAlert === 'function') {
                window.showSystemAlert('Acesso restrito apenas para administradores!', 'error');
            } else {
                alert('Acesso restrito apenas para administradores!');
            }
            window.location.href = localStorage.getItem('pdvTerminalId')
                ? 'pdv/'
                : (function () {
                      try {
                          const eid = parseInt(
                              localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0',
                              10
                          );
                          if (eid >= 1) {
                              return 'pdv/login.html?empresaId=' + encodeURIComponent(String(eid));
                          }
                      } catch (_) {}
                      const ep =
                          typeof window !== 'undefined' && typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number'
                              ? window.EMPRESA_ID_PADRAO_SISTEMA
                              : 1;
                      return 'pdv/login.html?empresaId=' + encodeURIComponent(String(ep));
                  })();
            return false;
        }
    }
    
    return true;
}

// Exibir nome do usuário logado (sempre confirma com /auth/me para não mostrar conta anterior)
function displayUserName() {
    const userDisplay = document.getElementById('userDisplay');
    const userName = document.getElementById('userName');
    if (userDisplay) userDisplay.textContent = 'Olá, …';
    if (userName) userName.textContent = 'Olá, …';
    syncCurrentUserFromApi().then((user) => {
        if (!user) return;
        const roleText =
            user.role === 'ADM'
                ? ' (Super Admin)'
                : user.role === 'ADMIN_EMPRESA'
                  ? ' (Admin Empresa)'
                  : ' (Vendedor)';
        const line = 'Olá, ' + user.username + roleText;
        if (userDisplay) userDisplay.textContent = line;
        if (userName) userName.textContent = line;
    });
}

/**
 * Extrai empresaId do objeto usuario (/auth/me ou currentUser em cache).
 */
function resolveEmpresaIdFromUserLike(me) {
    if (!me || typeof me !== 'object') return null;
    const raw = me.empresaId != null ? me.empresaId : me.empresa_id_pdv;
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (isNaN(n) || n < 1) return null;
    return n;
}

/**
 * URL do login após logout: mantém branding da empresa para ADMIN_EMPRESA/VENDEDOR.
 * ADM global volta ao login sem query (default empresa 1 via config.js).
 */
function buildLoginUrlAfterLogoutFromUserLike(me) {
    try {
        const role = me ? normalizeUserRole(me.role) : '';
        if (role === 'ADM') {
            const ep =
                typeof window !== 'undefined' && typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number'
                    ? window.EMPRESA_ID_PADRAO_SISTEMA
                    : 1;
            return 'login.html?empresaId=' + encodeURIComponent(String(ep));
        }
        let eid = resolveEmpresaIdFromUserLike(me);
        if (eid == null && role && role !== 'ADM') {
            const sel = parseInt(
                localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '0',
                10
            );
            if (sel >= 1) eid = sel;
        }
        if (eid != null && eid >= 1) {
            return 'login.html?empresaId=' + encodeURIComponent(String(eid));
        }
    } catch (_) {}
    return 'login.html';
}

function getLoginUrlForLogout() {
    return buildLoginUrlAfterLogoutFromUserLike(getCurrentUser());
}

/**
 * Confirma empresa no servidor antes de limpar cache (localStorage pode estar sem empresaId).
 */
async function resolveLogoutLoginUrl() {
    const token = getToken();
    if (token) {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: 'Bearer ' + token },
                cache: 'no-store'
            });
            if (res.ok) {
                const me = await res.json();
                return buildLoginUrlAfterLogoutFromUserLike(me);
            }
        } catch (_) {}
    }
    return getLoginUrlForLogout();
}

// Função de logout - invalida o token e redireciona com tenant correto
async function logout() {
    const token = getToken();
    let loginTarget = 'login.html';
    try {
        loginTarget = await resolveLogoutLoginUrl();
    } catch (_) {
        loginTarget = getLoginUrlForLogout();
    }
    if (token) {
        invalidatedTokens.add(token);
    }

    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== 'undefined' && window.IS_PDV_APP) {
        localStorage.removeItem('pdvTerminalId');
        localStorage.removeItem('pdvTerminalCodigo');
    }
    window.location.href = loginTarget;
}

// Ocultar elementos baseados no perfil
function setupMenuByRole() {
    if (!isAdmin()) {
        // Ocultar itens de menu que só admins podem ver
        const menuItems = document.querySelectorAll('.menu-item-admin');
        menuItems.forEach(item => {
            item.style.display = 'none';
        });
        
        // Ocultar seções que só admins podem ver
        const adminSections = document.querySelectorAll('.admin-only');
        adminSections.forEach(section => {
            section.style.display = 'none';
        });
    }
}

// Funções utilitárias para chamadas API
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (token) {
        // Verificar se token foi invalidado antes de fazer chamada
        if (invalidatedTokens.has(token)) {
            logout();
            return null;
        }
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (response.status === 401) {
        logout();
        return null;
    }
    
    return response;
}

async function getJSON(endpoint) {
    const response = await apiCall(endpoint);
    if (response && response.ok) {
        return await response.json();
    }
    return null;
}

async function postJSON(endpoint, data) {
    const response = await apiCall(endpoint, 'POST', data);
    if (response && response.ok) {
        return await response.json();
    }
    return null;
}

async function putJSON(endpoint, data) {
    const response = await apiCall(endpoint, 'PUT', data);
    if (response && response.ok) {
        return await response.json();
    }
    return null;
}

async function deleteRequest(endpoint) {
    const response = await apiCall(endpoint, 'DELETE');
    return response && response.ok;
}

// Exponibiliza para outras telas (ex.: nav.js) sincronizarem cabeçalho.
if (typeof window !== 'undefined') {
    window.syncCurrentUserFromApi = syncCurrentUserFromApi;
}


