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

document.addEventListener('DOMContentLoaded', function() {
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
    } catch (_) {}
    checkLoggedInUser();
});

// Verificar se há usuário logado
function checkLoggedInUser() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            redirectAfterLogin(normalizeRole(user && user.role));
        } catch (_) {
            window.location.href = 'pdv/login.html';
        }
    }
}

// Função para mostrar o modal de cadastro
function showRegister() {
    document.getElementById('registerModal').classList.add('show');
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
            // Login falhou
            loginError.textContent = data.message || 'Usuário ou senha incorretos!';
            loginError.classList.add('show');
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
                role: 'VENDEDOR'
            })
        });
        
        const data = await response.json();
        
        if (data.token) {
            // Cadastro bem-sucedido
            closeRegisterModal();
            alert('Usuário cadastrado com sucesso! Agora você pode fazer login.');
            document.getElementById('username').value = newUsername;
            document.getElementById('password').value = '';
            document.getElementById('username').focus();
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

