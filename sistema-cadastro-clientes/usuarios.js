// Sistema de Gerenciamento de Usuários - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

// Array para armazenar os usuários
let users = [];
let userIdToDelete = null;

// Carregar usuários ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkPermission('adm')) return;
    displayUserName();
    loadUsers();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Campo de busca
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', searchUsers);
    
    // Botão de busca
    const searchBtn = document.getElementById('searchBtn');
    searchBtn.addEventListener('click', searchUsers);
    
    // Formulário de cadastro de usuário
    const registerForm = document.getElementById('registerUserForm');
    registerForm.addEventListener('submit', registerUser);
}

// Cadastrar novo usuário
async function registerUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const confirmPassword = document.getElementById('confirmUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const errorElement = document.getElementById('registerUserError');
    const successElement = document.getElementById('registerUserSuccess');
    
    // Limpar mensagens anteriores
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    successElement.textContent = '';
    successElement.classList.remove('show');
    
    // Validar senhas
    if (password !== confirmPassword) {
        errorElement.textContent = 'As senhas não conferem!';
        errorElement.classList.add('show');
        return;
    }
    
    // Validar tamanho da senha
    if (password.length < 4) {
        errorElement.textContent = 'A senha deve ter pelo menos 4 caracteres!';
        errorElement.classList.add('show');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: role
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            successElement.textContent = 'Usuário cadastrado com sucesso!';
            successElement.classList.add('show');
            document.getElementById('registerUserForm').reset();
            
            // Recarregar lista de usuários
            loadUsers();
            
            // Remover mensagem de sucesso após 3 segundos
            setTimeout(() => {
                successElement.classList.remove('show');
            }, 3000);
        } else {
            errorElement.textContent = data.message || 'Erro ao cadastrar usuário';
            errorElement.classList.add('show');
        }
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        errorElement.textContent = 'Erro de conexão. Tente novamente.';
        errorElement.classList.add('show');
    }
}

// Carregar usuários da API
async function loadUsers() {
    try {
        const response = await fetch('http://localhost:8080/api/auth/users', {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            users = await response.json();
            console.log('Usuários carregados:', users);
        } else {
            console.error('Erro ao carregar usuários');
            showAlert('Erro ao carregar usuários', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showAlert('Erro de conexão', 'error');
    }
    renderUsers();
}

// Renderizar lista de usuários
function renderUsers(userList = users) {
    const userListElement = document.getElementById('userList');
    const noUsersMessage = document.getElementById('noUsersMessage');
    const userCount = document.getElementById('userCount');
    const currentUser = getCurrentUser();
    
    // Atualizar contador
    userCount.textContent = `(${userList.length})`;
    
    // Limpar lista
    userListElement.innerHTML = '';
    
    if (userList.length === 0) {
        noUsersMessage.style.display = 'block';
        return;
    }
    
    noUsersMessage.style.display = 'none';
    
    // Criar linhas da tabela
    userList.forEach(user => {
        const row = document.createElement('tr');
        
        // Verificar se é o usuário atual
        const isCurrentUser = currentUser && currentUser.username === user.username;
        
        // Traduzir perfil
        const roleText = user.role === 'ADM' ? '👑 Administrador' : '🛒 Vendedor';
        
        row.innerHTML = `
            <td>${escapeHtml(user.username)}</td>
            <td>${roleText}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                ${!isCurrentUser ? `
                <button class="btn btn-edit btn-small" onclick="editUser(${user.id})">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteUser(${user.id})">
                    🗑️ Excluir
                </button>
                ` : '<span style="color: #667eea; font-size: 0.85rem;">(Você)</span>'}
            </td>
        `;
        userListElement.appendChild(row);
    });
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Formatar data
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Buscar usuários
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderUsers(users);
        return;
    }
    
    const filteredUsers = users.filter(user => {
        return user.username.toLowerCase().includes(searchTerm);
    });
    
    renderUsers(filteredUsers);
}

// Excluir usuário
function deleteUser(id) {
    const user = users.find(u => u.id === id);
    const currentUser = getCurrentUser();
    
    if (user && currentUser && user.username !== currentUser.username) {
        userIdToDelete = id;
        document.getElementById('userToDelete').textContent = user.username;
        document.getElementById('confirmModal').classList.add('show');
    }
}

// Confirmar exclusão
async function confirmDelete() {
    if (userIdToDelete) {
        try {
            const response = await fetch(`http://localhost:8080/api/auth/users/${userIdToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + getToken()
                }
            });
            
            if (response.ok) {
                users = users.filter(u => u.id !== userIdToDelete);
                renderUsers();
                closeModal();
                showAlert('Usuário excluído com sucesso!', 'success');
            } else {
                showAlert('Erro ao excluir usuário', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            showAlert('Erro de conexão', 'error');
        }
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('confirmModal').classList.remove('show');
    userIdToDelete = null;
}

// Mostrar alerta
function showAlert(message, type) {
    // Remover alertas existentes
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Criar novo alerta
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Inserir após o header
    const main = document.querySelector('main');
    main.insertBefore(alert, main.firstChild);
    
    // Remover após 3 segundos
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// Fechar modal ao clicar fora
document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Editar usuário - abrir modal
function editUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editPassword').value = '';
    document.getElementById('editUserError').textContent = '';
    document.getElementById('editUserError').classList.remove('show');
    
    document.getElementById('editUserModal').classList.add('show');
}

// Fechar modal de edição
function closeEditModal() {
    document.getElementById('editUserModal').classList.remove('show');
}

// Configurar event listener para o formulário de edição
document.getElementById('editUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value.trim();
    const role = document.getElementById('editUserRole').value;
    const password = document.getElementById('editPassword').value;
    const errorElement = document.getElementById('editUserError');
    
    // Limpar erro anterior
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    
    // Validar senha se fornecida
    if (password && password.length < 4) {
        errorElement.textContent = 'A senha deve ter pelo menos 4 caracteres!';
        errorElement.classList.add('show');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:8080/api/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify({
                username: username,
                role: role,
                password: password || null
            })
        });
        
        if (response.ok) {
            closeEditModal();
            showAlert('Usuário atualizado com sucesso!', 'success');
            loadUsers();
        } else {
            const data = await response.json();
            errorElement.textContent = data.message || 'Erro ao atualizar usuário';
            errorElement.classList.add('show');
        }
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        errorElement.textContent = 'Erro de conexão. Tente novamente.';
        errorElement.classList.add('show');
    }
});

// Fechar modal de edição ao clicar fora
document.getElementById('editUserModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditModal();
    }
});

