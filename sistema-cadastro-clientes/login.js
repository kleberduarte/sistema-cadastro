// Sistema de Login - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

const API_URL = '/api';
const CURRENT_USER_KEY = 'currentUser';
const TOKEN_KEY = 'authToken';

// Carregar usuários do localStorage ao iniciar (fallback)
let users = [];

document.addEventListener('DOMContentLoaded', function() {
    checkLoggedInUser();
});

// Verificar se há usuário logado
function checkLoggedInUser() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (currentUser) {
        window.location.href = 'vendas.html';
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
            // Login bem-sucedido
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
                id: data.id,
                username: data.username,
                role: data.role
            }));
            window.location.href = 'vendas.html';
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

