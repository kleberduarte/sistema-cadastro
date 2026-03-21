// Sistema de Cadastro de Clientes
// Autor: Sistema de Cadastro
// Data: 2024

// Array para armazenar os clientes
let clients = [];
let clientIdToDelete = null;
let editingClientId = null;
let editingOriginalCpfDigits = '';
let currentSearchField = 'all';
let currentSortField = 'nome';
let currentSortDir = 'asc';

function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function formatCPF(value) {
    let v = onlyDigits(value).slice(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return v.slice(0, 3) + '.' + v.slice(3);
    if (v.length <= 9) return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6);
    return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6, 9) + '-' + v.slice(9);
}

function formatPhone(value) {
    let v = onlyDigits(value).slice(0, 11);
    if (!v) return '';
    if (v.length <= 2) return '(' + v;
    if (v.length <= 6) return '(' + v.slice(0, 2) + ') ' + v.slice(2);
    if (v.length <= 10) return '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
    return '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
}

function formatCEP(value) {
    let v = onlyDigits(value).slice(0, 8);
    if (v.length > 5) return v.slice(0, 5) + '-' + v.slice(5);
    return v;
}

function buildEnderecoCompleto(baseAddress, numero, complemento) {
    const base = String(baseAddress || '').trim();
    const num = String(numero || '').trim();
    const comp = String(complemento || '').trim();
    const numeroPart = num ? ('Nº ' + num) : '';
    const compPart = comp ? ('Compl: ' + comp) : '';
    return [base, numeroPart, compPart].filter(Boolean).join(' - ');
}

function splitEndereco(enderecoCompleto) {
    const raw = String(enderecoCompleto || '').trim();
    if (!raw) return { base: '', numero: '', complemento: '' };

    const numMatch = raw.match(/(?:^|[\s,-])n[ºo]?\s*[:\-]?\s*([A-Za-z0-9\/\-]+)/i);
    const compMatch = raw.match(/compl(?:emento)?\s*[:\-]?\s*(.+)$/i);

    const numero = numMatch ? String(numMatch[1] || '').trim() : '';
    const complemento = compMatch ? String(compMatch[1] || '').trim() : '';

    let base = raw
        .replace(/(?:^|[\s,-])n[ºo]?\s*[:\-]?\s*[A-Za-z0-9\/\-]+/ig, '')
        .replace(/(?:-|,)?\s*compl(?:emento)?\s*[:\-]?\s*.+$/i, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*[-,]\s*$/g, '')
        .trim();

    if (!base) base = raw;
    return { base: base, numero: numero, complemento: complemento };
}

// checkAuth / displayUserName vêm de auth.js (não duplicar aqui — duplicata sobrescrevia e mostrava usuário antigo)

// Carregar clientes do localStorage ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    // Evita 403 e chamadas desnecessárias quando o perfil não tem acesso a esta tela
    if (typeof checkPermission === 'function' && !checkPermission('adm')) return;
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

    const searchField = document.getElementById('searchField');
    if (searchField) {
        searchField.addEventListener('change', function () {
            currentSearchField = this.value || 'all';
            searchClients();
        });
    }
    
    // Botão de busca
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchClients);
    }

    setupSortHeaders();
    
    // Máscara para telefone + validação em tempo real
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            e.target.value = formatPhone(e.target.value);
            validateFieldRealtime('phone');
        });
        phoneInput.addEventListener('blur', function () { validateFieldRealtime('phone'); });
    }
    
    // Máscara para CPF + validação em tempo real
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            e.target.value = formatCPF(e.target.value);
            validateFieldRealtime('cpf');
        });
        cpfInput.addEventListener('blur', function () { validateFieldRealtime('cpf'); });
    }

    // Máscara para CEP + validação em tempo real
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', function (e) {
            e.target.value = formatCEP(e.target.value);
            validateFieldRealtime('cep');
        });
        cepInput.addEventListener('blur', function () { validateFieldRealtime('cep'); });
    }

    // Validação em tempo real dos demais campos
    ['name', 'email', 'address', 'addressNumber'].forEach(function (fieldId) {
        const el = document.getElementById(fieldId);
        if (!el) return;
        el.addEventListener('input', function () { validateFieldRealtime(fieldId); });
        el.addEventListener('blur', function () { validateFieldRealtime(fieldId); });
    });
}

function setupSortHeaders() {
    const headers = document.querySelectorAll('th.sortable-col[data-sort]');
    headers.forEach(function (th) {
        th.style.cursor = 'pointer';
        th.setAttribute('title', 'Clique para ordenar');
        th.addEventListener('click', function () {
            const field = th.getAttribute('data-sort');
            if (!field) return;
            if (currentSortField === field) {
                currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = field;
                currentSortDir = 'asc';
            }
            searchClients();
            updateSortHeaderUI();
        });
    });
    updateSortHeaderUI();
}

function updateSortHeaderUI() {
    const headers = document.querySelectorAll('th.sortable-col[data-sort]');
    headers.forEach(function (th) {
        const field = th.getAttribute('data-sort');
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) return;
        if (field === currentSortField) {
            indicator.textContent = currentSortDir === 'asc' ? '▲' : '▼';
            th.classList.add('is-active-sort');
        } else {
            indicator.textContent = '';
            th.classList.remove('is-active-sort');
        }
    });
}

function normalizeSortValue(value, field) {
    if (value == null) return '';
    if (field === 'cpf' || field === 'telefone') return onlyDigits(value);
    return String(value).toLowerCase();
}

function sortClientList(list) {
    const field = currentSortField || 'nome';
    const dirFactor = currentSortDir === 'desc' ? -1 : 1;
    return list.slice().sort(function (a, b) {
        const av = normalizeSortValue(a[field] || '', field);
        const bv = normalizeSortValue(b[field] || '', field);
        if (av < bv) return -1 * dirFactor;
        if (av > bv) return 1 * dirFactor;
        return 0;
    });
}

// Carregar clientes da API
async function loadClients() {
    try {
        const response = await fetch(appendEmpresaIdToApiUrl('http://localhost:8080/api/clientes'), {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            clients = await response.json();
            console.log('Clientes carregados da API:', clients);
        } else if (response.status === 403) {
            showAlert('Sem permissão para acessar clientes nesta conta.', 'error');
            setTimeout(function () {
                window.location.href = localStorage.getItem('pdvTerminalId') ? 'pdv/' : 'relatorios.html';
            }, 700);
            return;
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
function validateForm(formData, options = {}) {
    const errors = {};
    const allowLegacyCpfUnchanged = !!options.allowLegacyCpfUnchanged;
    
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
        const cpfDigits = onlyDigits(formData.cpf || '');
        const unchangedLegacyCpf =
            allowLegacyCpfUnchanged &&
            editingOriginalCpfDigits &&
            cpfDigits === editingOriginalCpfDigits;

        if (!unchangedLegacyCpf) {
            errors.cpf = 'CPF inválido';
        }
    }
    
    // Validar endereço (API field: endereco)
    if (!formData.endereco || formData.endereco.trim().length < 5) {
        errors.address = 'Endereço deve ter pelo menos 5 caracteres';
    }

    // Validar número do endereço (obrigatório)
    if (!formData.numeroEndereco || formData.numeroEndereco.trim().length < 1) {
        errors.addressNumber = 'Informe o número do endereço';
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

function clearError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorSpan = document.getElementById(fieldId + 'Error');
    if (input) input.classList.remove('error');
    if (errorSpan) errorSpan.textContent = '';
}

function validateFieldRealtime(fieldId) {
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const address = document.getElementById('address');
    const addressNumber = document.getElementById('addressNumber');
    const cpf = document.getElementById('cpf');
    const cep = document.getElementById('cep');

    if (fieldId === 'name' && name) {
        const v = name.value.trim();
        if (!v) return clearError('name');
        if (v.length < 3) return showError('name', 'Nome deve ter pelo menos 3 caracteres');
        return clearError('name');
    }

    if (fieldId === 'email' && email) {
        const v = email.value.trim();
        if (!v) return clearError('email');
        if (!validateEmail(v)) return showError('email', 'E-mail inválido');
        return clearError('email');
    }

    if (fieldId === 'phone' && phone) {
        const v = phone.value.trim();
        if (!v) return clearError('phone');
        if (!validatePhone(v)) return showError('phone', 'Telefone inválido');
        return clearError('phone');
    }

    if (fieldId === 'address' && address) {
        const v = address.value.trim();
        if (!v) return clearError('address');
        if (v.length < 5) return showError('address', 'Endereço deve ter pelo menos 5 caracteres');
        return clearError('address');
    }

    if (fieldId === 'addressNumber' && addressNumber) {
        const v = addressNumber.value.trim();
        if (!v) return clearError('addressNumber');
        if (v.length < 1) return showError('addressNumber', 'Informe o número do endereço');
        return clearError('addressNumber');
    }

    if (fieldId === 'cpf' && cpf) {
        const v = cpf.value.trim();
        if (!v) return clearError('cpf');
        if (!validateCPF(v)) return showError('cpf', 'CPF inválido');
        return clearError('cpf');
    }

    if (fieldId === 'cep' && cep) {
        const v = onlyDigits(cep.value);
        if (!v) return clearError('cep');
        if (v.length !== 8) return showError('cep', 'CEP deve ter 8 dígitos');
        return clearError('cep');
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
    const enderecoBase = document.getElementById('address').value.trim();
    const numeroEndereco = document.getElementById('addressNumber').value.trim();
    const complementoEndereco = document.getElementById('addressComplement').value.trim();
    const formData = {
        nome: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefone: document.getElementById('phone').value.trim(),
        endereco: buildEnderecoCompleto(enderecoBase, numeroEndereco, complementoEndereco),
        cpf: document.getElementById('cpf').value.trim(),
        numeroEndereco: numeroEndereco,
        complementoEndereco: complementoEndereco
    };
    
    // Validar formulário
    const errors = validateForm(formData, {
        allowLegacyCpfUnchanged: !!editingClientId
    });
    
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
            const response = await fetch(appendEmpresaIdToApiUrl(`http://localhost:8080/api/clientes/${editingClientId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({
                    nome: formData.nome,
                    email: formData.email,
                    telefone: formData.telefone,
                    endereco: formData.endereco,
                    cpf: formData.cpf
                })
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
            const response = await fetch(appendEmpresaIdToApiUrl('http://localhost:8080/api/clientes'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({
                    nome: formData.nome,
                    email: formData.email,
                    telefone: formData.telefone,
                    endereco: formData.endereco,
                    cpf: formData.cpf
                })
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
    const clientCardsList = document.getElementById('clientCardsList');
    const noClientsMessage = document.getElementById('noClientsMessage');
    const clientCount = document.getElementById('clientCount');
    
    // Verificar se os elementos existem (pode não existir em todas as páginas)
    if (!clientListElement || !noClientsMessage || !clientCount || !clientCardsList) {
        return;
    }
    
    const sortedClients = sortClientList(clientList);

    // Atualizar contador
    clientCount.textContent = `(${sortedClients.length})`;
    
    // Limpar lista
    clientListElement.innerHTML = '';
    clientCardsList.innerHTML = '';
    
    if (sortedClients.length === 0) {
        noClientsMessage.style.display = 'block';
        return;
    }
    
    noClientsMessage.style.display = 'none';
    
    // Criar linhas da tabela
    sortedClients.forEach(client => {
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

    renderClientCards(sortedClients, clientCardsList);
}

function renderClientCards(clientList, targetElement) {
    targetElement.innerHTML = '';
    clientList.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-mobile-card';
        card.innerHTML = `
            <div class="client-mobile-card__header">
                <strong>${escapeHtml(client.nome)}</strong>
                <span>${escapeHtml(client.cpf || '-')}</span>
            </div>
            <div class="client-mobile-card__body">
                <div><b>E-mail:</b> ${escapeHtml(client.email || '-')}</div>
                <div><b>Telefone:</b> ${escapeHtml(client.telefone || '-')}</div>
                <div><b>Endereço:</b> ${escapeHtml(client.endereco || '-')}</div>
            </div>
            <div class="client-mobile-card__actions">
                <button class="btn btn-edit btn-small" onclick="editClient(${client.id})">✏️ Editar</button>
                <button class="btn btn-danger btn-small" onclick="deleteClient(${client.id})">🗑️ Excluir</button>
            </div>
        `;
        targetElement.appendChild(card);
    });
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Buscar clientes (local), com filtro por campo
function searchClients() {
    const searchInput = document.getElementById('searchInput');
    const searchField = document.getElementById('searchField');
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const field = searchField ? searchField.value : currentSearchField;
    currentSearchField = field || 'all';

    if (!searchTerm) {
        renderClients(clients);
        return;
    }

    const filteredClients = clients.filter(client => {
        const nome = (client.nome || '').toLowerCase();
        const email = (client.email || '').toLowerCase();
        const cpf = String(client.cpf || '');
        const cpfDigits = onlyDigits(cpf);
        const telefone = String(client.telefone || '');
        const telefoneDigits = onlyDigits(telefone);
        const endereco = (client.endereco || '').toLowerCase();
        const termDigits = onlyDigits(searchTerm);

        switch (currentSearchField) {
            case 'nome':
                return nome.includes(searchTerm);
            case 'email':
                return email.includes(searchTerm);
            case 'cpf':
                return cpf.includes(searchTerm) || (termDigits && cpfDigits.includes(termDigits));
            case 'telefone':
                return telefone.toLowerCase().includes(searchTerm) || (termDigits && telefoneDigits.includes(termDigits));
            case 'endereco':
                return endereco.includes(searchTerm);
            case 'all':
            default:
                return nome.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    cpf.includes(searchTerm) ||
                    (termDigits && cpfDigits.includes(termDigits)) ||
                    telefone.toLowerCase().includes(searchTerm) ||
                    (termDigits && telefoneDigits.includes(termDigits)) ||
                    endereco.includes(searchTerm);
        }
    });

    renderClients(filteredClients);
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
            const response = await fetch(appendEmpresaIdToApiUrl(`http://localhost:8080/api/clientes/${clientIdToDelete}`), {
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
    if (typeof window.showSystemAlert === 'function') {
        window.showSystemAlert(message, type);
        return;
    }

    // Fallback (caso a tela não carregue o config.js)
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    const main = document.querySelector('main');
    if (main && main.firstChild) main.insertBefore(alert, main.firstChild);

    setTimeout(() => alert.remove(), 3000);
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
        document.getElementById('phone').value = formatPhone(client.telefone || '');
        const enderecoParts = splitEndereco(client.endereco || '');
        document.getElementById('address').value = enderecoParts.base || '';
        var numEl = document.getElementById('addressNumber');
        if (numEl) numEl.value = enderecoParts.numero || '';
        var compEl = document.getElementById('addressComplement');
        if (compEl) compEl.value = enderecoParts.complemento || '';
        document.getElementById('cpf').value = formatCPF(client.cpf || '');
        document.getElementById('clientId').value = client.id;
        editingOriginalCpfDigits = onlyDigits(client.cpf || '');
        
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
    editingOriginalCpfDigits = '';
    
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
    let cep = onlyDigits(cepInput.value);
    
    // Validar CEP
    if (cep.length !== 8) {
        showError('cep', 'CEP deve ter 8 dígitos');
        showAlert('CEP inválido. Digite 8 dígitos.', 'error');
        return;
    }
    
    try {
        clearError('cep');
        
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        
        if (!response.ok) {
            throw new Error('Erro na requisição');
        }
        
        const data = await response.json();

        // Evita falso negativo: só considera "não encontrado"
        // quando realmente não vier nenhum dado de endereço.
        const hasEnderecoUtil =
            !!(data && (
                data.logradouro ||
                data.bairro ||
                data.localidade ||
                data.uf
            ));

        if (data && data.erro === true && !hasEnderecoUtil) {
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
        
        const enderecoTexto = addressParts.join(', ').trim();
        if (!enderecoTexto) {
            showAlert('CEP não encontrado.', 'error');
            return;
        }

        document.getElementById('address').value = enderecoTexto;
        validateFieldRealtime('address');

        showAlert('Endereço encontrado!', 'success');
        
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        showAlert('Erro ao buscar CEP. Tente novamente.', 'error');
    }
}

