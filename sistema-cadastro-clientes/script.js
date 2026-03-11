// Sistema de Cadastro de Clientes
// Autor: Sistema de Cadastro
// Data: 2024

// Array para armazenar os clientes
let clients = [];
let clientIdToDelete = null;
let editingClientId = null;

// Verificar se o usuário está logado
function checkAuth() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Exibir nome do usuário logado
function displayUserName() {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (currentUser) {
        const user = JSON.parse(currentUser);
        const userDisplayElement = document.getElementById('userDisplay') || document.getElementById('userName');
        if (userDisplayElement) {
            userDisplayElement.textContent = 'Olá, ' + user.username;
        }
    }
}

// Carregar clientes do localStorage ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    displayUserName();
    loadClients();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Formulário de cadastro
    const form = document.getElementById('clientForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // Campo de busca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchClients);
    }
    
    // Botão de busca
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchClients);
    }
    
    // Máscara para telefone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value.length <= 2) {
                    value = '(' + value;
                } else if (value.length <= 6) {
                    value = '(' + value.substring(0, 2) + ') ' + value.substring(2);
                } else {
                    value = '(' + value.substring(0, 2) + ') ' + value.substring(2, 7) + '-' + value.substring(7, 11);
                }
            }
            e.target.value = value;
        });
    }
    
    // Máscara para CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value.length <= 3) {
                    value = value;
                } else if (value.length <= 6) {
                    value = value.substring(0, 3) + '.' + value.substring(3);
                } else if (value.length <= 9) {
                    value = value.substring(0, 3) + '.' + value.substring(3, 6) + '.' + value.substring(6);
                } else {
                    value = value.substring(0, 3) + '.' + value.substring(3, 6) + '.' + value.substring(6, 9) + '-' + value.substring(9, 11);
                }
            }
            e.target.value = value;
        });
    }
}

// Carregar clientes da API
async function loadClients() {
    try {
        const response = await fetch('http://localhost:8080/api/clientes', {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            clients = await response.json();
            console.log('Clientes carregados da API:', clients);
        } else {
            console.error('Erro ao carregar clientes');
            showAlert('Erro ao carregar clientes', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showAlert('Erro de conexão', 'error');
    }
    renderClients();
}

// Salvar clientes no localStorage
function saveClients() {
    localStorage.setItem('clients', JSON.stringify(clients));
}

// Validar CPF - simplified (only check length)
function validateCPF(cpf) {
    // Remove non-digits
    cpf = cpf.replace(/\D/g, '');
    
    // Check if it has 11 digits
    return cpf.length === 11;
}

// Validar email
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validar telefone
function validatePhone(phone) {
    const phoneDigits = phone.replace(/\D/g, '');
    return phoneDigits.length >= 10 && phoneDigits.length <= 11;
}

// Validar formulário
function validateForm(formData) {
    const errors = {};
    
    // Validar nome (API field: nome)
    if (!formData.nome || formData.nome.trim().length < 3) {
        errors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    // Validar email
    if (!formData.email || !validateEmail(formData.email)) {
        errors.email = 'E-mail inválido';
    }
    
    // Validar telefone (API field: telefone)
    if (!formData.telefone || !validatePhone(formData.telefone)) {
        errors.phone = 'Telefone inválido';
    }
    
    // Validar CPF
    if (!formData.cpf || !validateCPF(formData.cpf)) {
        errors.cpf = 'CPF inválido';
    }
    
    // Validar endereço (API field: endereco)
    if (!formData.endereco || formData.endereco.trim().length < 5) {
        errors.address = 'Endereço deve ter pelo menos 5 caracteres';
    }
    
    return errors;
}

// Mostrar erro
function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorSpan = document.getElementById(fieldId + 'Error');
    
    if (input && errorSpan) {
        input.classList.add('error');
        errorSpan.textContent = message;
    }
}

// Limpar erros
function clearErrors() {
    const inputs = document.querySelectorAll('.form-group input');
    inputs.forEach(input => {
        input.classList.remove('error');
    });
    
    const errorSpans = document.querySelectorAll('.error-message');
    errorSpans.forEach(span => {
        span.textContent = '';
    });
}

// Tratar submissão do formulário
async function handleSubmit(e) {
    e.preventDefault();
    
    clearErrors();
    
    const form = e.target;
    const formData = {
        nome: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefone: document.getElementById('phone').value.trim(),
        endereco: document.getElementById('address').value.trim(),
        cpf: document.getElementById('cpf').value.trim()
    };
    
    // Validar formulário
    const errors = validateForm(formData);
    
    if (Object.keys(errors).length > 0) {
        // Mostrar erros
        for (const [field, message] of Object.entries(errors)) {
            showError(field, message);
        }
        return;
    }
    
    try {
        if (editingClientId) {
            // Atualizar cliente existente via API
            const response = await fetch(`http://localhost:8080/api/clientes/${editingClientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                await loadClients();
                cancelEdit();
                showAlert('Cliente atualizado com sucesso!', 'success');
            } else {
                const errorData = await response.json();
                showAlert(errorData.message || 'Erro ao atualizar cliente', 'error');
            }
        } else {
            // Criar novo cliente via API
            const response = await fetch('http://localhost:8080/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                await loadClients();
                form.reset();
                showAlert('Cliente cadastrado com sucesso!', 'success');
            } else {
                const errorData = await response.json();
                showAlert(errorData.message || 'Erro ao cadastrar cliente', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        showAlert('Erro de conexão', 'error');
    }
}

// Renderizar lista de clientes
function renderClients(clientList = clients) {
    const clientListElement = document.getElementById('clientList');
    const noClientsMessage = document.getElementById('noClientsMessage');
    const clientCount = document.getElementById('clientCount');
    
    // Verificar se os elementos existem (pode não existir em todas as páginas)
    if (!clientListElement || !noClientsMessage || !clientCount) {
        return;
    }
    
    // Atualizar contador
    clientCount.textContent = `(${clientList.length})`;
    
    // Limpar lista
    clientListElement.innerHTML = '';
    
    if (clientList.length === 0) {
        noClientsMessage.style.display = 'block';
        return;
    }
    
    noClientsMessage.style.display = 'none';
    
    // Criar linhas da tabela
    clientList.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(client.nome)}</td>
            <td>${escapeHtml(client.email)}</td>
            <td>${escapeHtml(client.telefone)}</td>
            <td>${escapeHtml(client.endereco || '-')}</td>
            <td>${escapeHtml(client.cpf)}</td>
            <td>
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn btn-edit btn-small" onclick="editClient(${client.id})">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteClient(${client.id})">
                        🗑️ Excluir
                    </button>
                </div>
            </td>
        `;
        clientListElement.appendChild(row);
    });
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Buscar clientes via API
async function searchClients() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        await loadClients();
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:8080/api/clientes/search?q=${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            const filteredClients = await response.json();
            renderClients(filteredClients);
        } else {
            // Fallback: filtrar localmente
            const filteredClients = clients.filter(client => {
                const nome = client.nome || '';
                const email = client.email || '';
                const cpf = client.cpf || '';
                const endereco = client.endereco || '';
                return nome.toLowerCase().includes(searchTerm) ||
                       email.toLowerCase().includes(searchTerm) ||
                       cpf.includes(searchTerm) ||
                       endereco.toLowerCase().includes(searchTerm);
            });
            renderClients(filteredClients);
        }
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        // Fallback: filtrar localmente
        const filteredClients = clients.filter(client => {
            const nome = client.nome || '';
            const email = client.email || '';
            const cpf = client.cpf || '';
            const endereco = client.endereco || '';
            return nome.toLowerCase().includes(searchTerm) ||
                   email.toLowerCase().includes(searchTerm) ||
                   cpf.includes(searchTerm) ||
                   endereco.toLowerCase().includes(searchTerm);
        });
        renderClients(filteredClients);
    }
}

// Excluir cliente - mostrar modal de confirmação
function deleteClient(id) {
    const client = clients.find(c => c.id === id);
    
    if (client) {
        clientIdToDelete = id;
        document.getElementById('clientToDelete').textContent = client.nome;
        document.getElementById('confirmModal').classList.add('show');
    }
}

// Confirmar exclusão via API
async function confirmDelete() {
    if (clientIdToDelete) {
        try {
            const response = await fetch(`http://localhost:8080/api/clientes/${clientIdToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + getToken()
                }
            });
            
            if (response.ok) {
                await loadClients();
                closeModal();
                showAlert('Cliente excluído com sucesso!', 'success');
            } else {
                showAlert('Erro ao excluir cliente', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            showAlert('Erro de conexão', 'error');
        }
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('confirmModal').classList.remove('show');
    clientIdToDelete = null;
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
const confirmModal = document.getElementById('confirmModal');
if (confirmModal) {
    confirmModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Editar cliente - carregar dados no formulário
function editClient(id) {
    const client = clients.find(c => c.id === id);
    
    if (client) {
        editingClientId = id;
        
        // Preencher formulário com dados do cliente (usar nomes da API)
        document.getElementById('name').value = client.nome || '';
        document.getElementById('email').value = client.email || '';
        document.getElementById('phone').value = client.telefone || '';
        document.getElementById('address').value = client.endereco || '';
        document.getElementById('cpf').value = client.cpf || '';
        document.getElementById('clientId').value = client.id;
        
        // Alterar modo do formulário
        document.getElementById('submitBtn').textContent = '💾 Salvar Alterações';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        
        // Atualizar título do formulário
        document.querySelector('.form-section h2').textContent = '✏️ Editar Cliente';
        
        // Rolar até o formulário
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// Cancelar edição
function cancelEdit() {
    editingClientId = null;
    
    // Limpar formulário
    document.getElementById('clientForm').reset();
    document.getElementById('clientId').value = '';
    
    // Restaurar modo do formulário
    document.getElementById('submitBtn').textContent = '💾 Cadastrar Cliente';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Restaurar título do formulário
    document.querySelector('.form-section h2').textContent = '📝 Novo Cliente';
    
    // Limpar erros
    clearErrors();
}

// Resetar formulário
function resetForm() {
    if (editingClientId) {
        cancelEdit();
    }
}

// ========== FUNÇÕES DE BUSCA POR CEP ==========

// Buscar CEP usando API ViaCEP
async function searchCEP() {
    const cepInput = document.getElementById('cep');
    let cep = cepInput.value.replace(/\D/g, '');
    
    // Validar CEP
    if (cep.length !== 8) {
        showAlert('CEP inválido. Digite 8 dígitos.', 'error');
        return;
    }
    
    try {
        showAlert('Buscando CEP...', 'success');
        
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        
        if (!response.ok) {
            throw new Error('Erro na requisição');
        }
        
        const data = await response.json();
        
        if (data.erro) {
            showAlert('CEP não encontrado.', 'error');
            return;
        }
        
        // Preencher o campo de endereço com os dados retornados
        const addressParts = [];
        
        if (data.logradouro) {
            addressParts.push(data.logradouro);
        }
        
        if (data.bairro) {
            addressParts.push(data.bairro);
        }
        
        if (data.localidade) {
            addressParts.push(data.localidade);
        }
        
        if (data.uf) {
            addressParts.push(data.uf);
        }
        
        document.getElementById('address').value = addressParts.join(', ');
        
        showAlert('Endereço encontrado!', 'success');
        
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        showAlert('Erro ao buscar CEP. Tente novamente.', 'error');
    }
}

// Máscara para CEP
document.addEventListener('DOMContentLoaded', function() {
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
                value = value.substring(0, 5) + '-' + value.substring(5, 8);
            }
            e.target.value = value;
        });
    }
});

