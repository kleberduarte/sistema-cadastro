

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

// Verificar se o usuário é Administrador
function isAdmin() {
    const user = getCurrentUser();
    return user && normalizeUserRole(user.role) === 'ADM';
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
            alert('Acesso restrito apenas para administradores!');
            window.location.href = localStorage.getItem('pdvTerminalId') ? 'pdv/' : 'pdv/login.html';
            return false;
        }
    }
    
    return true;
}

// Exibir nome do usuário logado
function displayUserName() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (currentUser) {
        const user = JSON.parse(currentUser);
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            let roleText = user.role === 'ADM' ? ' (Admin)' : ' (Vendedor)';
            userDisplay.textContent = 'Olá, ' + user.username + roleText;
        }
    }
}

// Função de logout - agora invalida o token
function logout() {
    const token = getToken();
    if (token) {
        // Adicionar token à blacklist
        invalidatedTokens.add(token);
    }
    
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== 'undefined' && window.IS_PDV_APP) {
        localStorage.removeItem('pdvTerminalId');
        localStorage.removeItem('pdvTerminalCodigo');
    }
    window.location.href = 'login.html';
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


