// Sistema de Autenticação e Autorização - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

const API_URL = 'http://localhost:8080/api';
const CURRENT_USER_KEY = 'currentUser';
const TOKEN_KEY = 'authToken';

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

// Verificar se o usuário é Administrador
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'ADM';
}

// Verificar se o usuário é Vendedor
function isVendedor() {
    const user = getCurrentUser();
    return user && user.role === 'VENDEDOR';
}

// Verificar permissão para acessar a página
function checkPermission(requiredRole) {
    if (!checkAuth()) return false;
    
    const user = getCurrentUser();
    
    if (requiredRole === 'adm') {
        if (!isAdmin()) {
            alert('Acesso restrito apenas para administradores!');
            window.location.href = 'vendas.html';
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

// Função de logout
function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
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

