// Sistema de Gerenciamento de Usuários - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

const API_BASE = (typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api').replace(/\/$/, '');

// Array para armazenar os usuários
let users = [];
let userIdToDelete = null;
let conviteAtual = { empresaId: null, nomeEmpresa: '', codigo: '' };

/** ID da empresa na retaguarda (Parâmetros / PDV / localStorage). */
function getEmpresaRetaguardaAtual() {
    var a = localStorage.getItem('selectedEmpresaId');
    var b = localStorage.getItem('selectedClienteId');
    var n = parseInt(a || b || '0', 10);
    if (n >= 1) return n;
    return window._empresaPadraoPdvId || 1;
}

/** Usuários da empresa atual: ID explícito = empresa; null = só na visão «empresa padrão». */
function usersFiltradosEmpresa() {
    var e = getEmpresaRetaguardaAtual();
    var padrao = window._empresaPadraoPdvId || 1;
    return users.filter(function (u) {
        var uid = u.empresaId;
        if (e === padrao) {
            return uid == null || uid === padrao;
        }
        return uid != null && uid === e;
    });
}

function aplicarEmpresaNoFormularioCadastro() {
    var inp = document.getElementById('newUserEmpresaPdv');
    if (inp) inp.value = String(getEmpresaRetaguardaAtual());
}

function getSelectedConviteUser() {
    var sel = document.getElementById('conviteUserSelect');
    if (!sel || !sel.value) return null;
    var id = parseInt(sel.value, 10);
    if (isNaN(id)) return null;
    return users.find(function (u) { return u.id === id; }) || null;
}

function getConviteEmpresaId() {
    return getEmpresaRetaguardaAtual();
}

async function loadPdvEmpresaPadrao() {
    window._empresaPadraoPdvId = 1;
    try {
        var r = await fetch(API_BASE + '/auth/pdv-empresa-padrao', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (r.ok) {
            var j = await r.json();
            if (j.empresaId != null) window._empresaPadraoPdvId = Number(j.empresaId);
        }
    } catch (e) {}
}

function populateConviteSelectFromUsers() {
    var sel = document.getElementById('conviteUserSelect');
    if (!sel) return;
    var prev = sel.value;
    var list = usersFiltradosEmpresa();
    sel.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— Ninguém (digite o WhatsApp) —';
    sel.appendChild(opt0);
    list.forEach(function (u) {
        var o = document.createElement('option');
        o.value = String(u.id);
        var t = '@' + u.username;
        if (u.telefone) t += ' — ' + u.telefone;
        o.textContent = t;
        sel.appendChild(o);
    });
    if (list.some(function (u) { return String(u.id) === prev; })) sel.value = prev;
    else sel.value = '';
}

function ocultarPainelConvite() {
    if (window._conviteTimer) {
        clearTimeout(window._conviteTimer);
        window._conviteTimer = null;
    }
    if (window._conviteInterval) {
        clearInterval(window._conviteInterval);
        window._conviteInterval = null;
    }
    var b = document.getElementById('conviteCodigoBox');
    if (b) b.style.display = 'none';
    var t = document.getElementById('conviteTimerText');
    if (t) t.textContent = '';
}

function iniciarOcultarCodigoAposUmMinuto() {
    if (window._conviteTimer) clearTimeout(window._conviteTimer);
    if (window._conviteInterval) clearInterval(window._conviteInterval);
    var sec = 60;
    var span = document.getElementById('conviteTimerText');
    if (span) span.textContent = 'Este código some automaticamente da tela em ' + sec + ' s.';
    window._conviteInterval = setInterval(function () {
        sec--;
        if (sec <= 0) {
            clearInterval(window._conviteInterval);
            window._conviteInterval = null;
            return;
        }
        if (span) span.textContent = 'Este código some automaticamente da tela em ' + sec + ' s.';
    }, 1000);
    window._conviteTimer = setTimeout(function () {
        if (window._conviteInterval) {
            clearInterval(window._conviteInterval);
            window._conviteInterval = null;
        }
        ocultarPainelConvite();
        conviteAtual = { empresaId: null, nomeEmpresa: '', codigo: '' };
    }, 60000);
}

function authHeaders() {
    return { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' };
}

function onlyDigitsPhone(s) {
    return (s || '').replace(/\D/g, '');
}

function whatsappE164BR(phone) {
    let d = onlyDigitsPhone(phone);
    if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) d = '55' + d;
    return d;
}

function textoConviteWhatsApp(empresaId, nomeEmpresa, codigo) {
    var origin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.protocol !== 'file:')
        ? window.location.origin
        : '';
    var loginHint = origin
        ? (origin + '/login.html — clique em «Cadastre-se».')
        : 'Acesse a tela de login do sistema e use «Cadastre-se».';
    return 'Olá! Segue o convite para criar seu acesso ao PDV:\n\n' +
        'Empresa: ' + (nomeEmpresa || '—') + '\nID da empresa: ' + empresaId + '\nCódigo de convite: ' + codigo + '\n\n' +
        loginHint + '\n\nInforme o ID da empresa e o código na tela de cadastro.';
}

function abrirWhatsAppComTexto(phone, texto) {
    var d = whatsappE164BR(phone);
    if (d.length < 12) {
        showAlert('Informe um celular válido com DDD (ex: 11999998888).', 'error');
        return;
    }
    window.open('https://wa.me/' + d + '?text=' + encodeURIComponent(texto), '_blank', 'noopener,noreferrer');
}

// Carregar usuários ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkPermission('adm')) return;
    aplicarRestricoesPorPerfilLogado();
    displayUserName();
    loadPdvEmpresaPadrao().then(function () { loadUsers(); });
    setupEventListeners();
    setupConviteListeners();
    window.addEventListener('storage', function (ev) {
        if (ev.key === 'selectedEmpresaId' || ev.key === 'selectedClienteId') loadUsers();
    });
    window.addEventListener('focus', function () {
        aplicarRestricoesPorPerfilLogado();
        loadUsers();
    });
    window.addEventListener('pageshow', function () {
        // Garante consistência ao voltar pelo histórico (bfcache) sem hard reload
        if (!checkPermission('adm')) return;
        aplicarRestricoesPorPerfilLogado();
        loadUsers();
    });
});

function aplicarRestricoesPorPerfilLogado() {
    try {
        const me = getCurrentUser();
        const roleNorm = me && me.role ? String(me.role).toUpperCase() : '';
        const isAdminEmpresa = roleNorm === 'ADMIN_EMPRESA';
        const allOptions = [
            { value: 'VENDEDOR', label: 'Vendedor' },
            { value: 'ADMIN_EMPRESA', label: 'Administrador (empresa)' },
            { value: 'ADM', label: 'Administrador' }
        ];
        const allowed = isAdminEmpresa
            ? allOptions.filter(function (o) { return o.value !== 'ADM'; })
            : allOptions;

        ['newUserRole', 'editUserRole'].forEach(function (id) {
            const sel = document.getElementById(id);
            if (!sel) return;

            const selected = sel.value;
            sel.innerHTML = '';
            allowed.forEach(function (opt) {
                const el = document.createElement('option');
                el.value = opt.value;
                el.textContent = opt.label;
                sel.appendChild(el);
            });

            const selectedStillAllowed = allowed.some(function (o) { return o.value === selected; });
            sel.value = selectedStillAllowed ? selected : 'VENDEDOR';
        });
    } catch (_) {}
}

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

    var chk = document.getElementById('gerarSenhaAutomatica');
    if (chk) {
        function syncSenhaAutoVisual() {
            var card = document.querySelector('.user-auto-pass-card');
            if (!card) return;
            if (chk.checked) card.classList.add('is-active');
            else card.classList.remove('is-active');
        }

        function syncSenhaRow() {
            var manual = !chk.checked;
            var row = document.getElementById('rowSenhasManual');
            if (row) row.style.display = manual ? '' : 'none';
            var p1 = document.getElementById('newUserPassword');
            var p2 = document.getElementById('confirmUserPassword');
            if (p1) { p1.required = manual; if (!manual) p1.value = ''; }
            if (p2) { p2.required = manual; if (!manual) p2.value = ''; }
            syncSenhaAutoVisual();
        }
        chk.addEventListener('change', syncSenhaRow);
        syncSenhaRow();
    }
    var btnCop = document.getElementById('btnCopiarSenhaGerada');
    if (btnCop) {
        btnCop.addEventListener('click', function () {
            var el = document.getElementById('senhaGeradaValor');
            var t = el && el.textContent ? el.textContent.trim() : '';
            if (!t) return;
            navigator.clipboard.writeText(t).then(function () {
                showAlert('Senha copiada.', 'success');
            }).catch(function () { showAlert('Copie manualmente.', 'error'); });
        });
    }
}

var _senhaGeradaTimer = null;
function ocultarBoxSenhaGerada() {
    if (_senhaGeradaTimer) {
        clearInterval(_senhaGeradaTimer);
        _senhaGeradaTimer = null;
    }
    var b = document.getElementById('boxSenhaGerada');
    var v = document.getElementById('senhaGeradaValor');
    if (b) b.style.display = 'none';
    if (v) v.textContent = '';
}
function mostrarSenhaGerada(plain) {
    ocultarBoxSenhaGerada();
    var b = document.getElementById('boxSenhaGerada');
    var v = document.getElementById('senhaGeradaValor');
    var span = document.getElementById('senhaGeradaTimer');
    if (!b || !v) return;
    v.textContent = plain;
    b.style.display = 'block';
    var sec = 120;
    if (span) span.textContent = 'Ocultando em ' + sec + ' s.';
    _senhaGeradaTimer = setInterval(function () {
        sec--;
        if (span) span.textContent = sec > 0 ? ('Ocultando em ' + sec + ' s.') : '';
        if (sec <= 0) {
            ocultarBoxSenhaGerada();
        }
    }, 1000);
}

// Cadastrar novo usuário
async function registerUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value.trim();
    const gerarAuto = document.getElementById('gerarSenhaAutomatica') && document.getElementById('gerarSenhaAutomatica').checked;
    const password = gerarAuto ? '' : document.getElementById('newUserPassword').value;
    const confirmPassword = gerarAuto ? '' : document.getElementById('confirmUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const empresaPdvRaw = document.getElementById('newUserEmpresaPdv').value.trim();
    const errorElement = document.getElementById('registerUserError');
    const successElement = document.getElementById('registerUserSuccess');
    const eCtx = getEmpresaRetaguardaAtual();
    let empresaId = null;
    if (role === 'ADM' && empresaPdvRaw === '') {
        empresaId = null;
    } else if (role === 'ADMIN_EMPRESA' && empresaPdvRaw === '') {
        errorElement.textContent = 'Para Admin Empresa, informe o ID da empresa.';
        errorElement.classList.add('show');
        return;
    } else {
        empresaId = empresaPdvRaw === '' ? eCtx : parseInt(empresaPdvRaw, 10);
        if (empresaId == null || isNaN(empresaId) || empresaId < 1) empresaId = eCtx;
    }

    // Limpar mensagens anteriores
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    successElement.textContent = '';
    successElement.classList.remove('show');
    
    if (!gerarAuto) {
        if (password !== confirmPassword) {
            errorElement.textContent = 'As senhas não conferem!';
            errorElement.classList.add('show');
            return;
        }
        if (password.length < 4) {
            errorElement.textContent = 'A senha deve ter pelo menos 4 caracteres!';
            errorElement.classList.add('show');
            return;
        }
    }
    
    const telefone = document.getElementById('newUserTelefone').value.trim();

    try {
        const response = await fetch(API_BASE + '/auth/users', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                username: username,
                password: gerarAuto ? '' : password,
                role: role,
                empresaId: empresaId != null && empresaId >= 1 ? empresaId : null,
                telefone: telefone || null
            })
        });

        const data = await response.json().catch(function () { return {}; });

        if (response.ok && data.id != null) {
            successElement.textContent = data.senhaTemporaria
                ? 'Usuário cadastrado. Copie a senha provisória abaixo e envie com segurança ao colaborador.'
                : 'Usuário cadastrado com sucesso!';
            successElement.classList.add('show');
            if (data.senhaTemporaria) {
                mostrarSenhaGerada(data.senhaTemporaria);
            } else {
                ocultarBoxSenhaGerada();
            }
            document.getElementById('registerUserForm').reset();
            var chk = document.getElementById('gerarSenhaAutomatica');
            if (chk) { chk.checked = true; chk.dispatchEvent(new Event('change')); }
            
            // Recarregar lista de usuários
            loadUsers();
            
            // Remover mensagem de sucesso após 3 segundos
            setTimeout(() => {
                successElement.classList.remove('show');
            }, 3000);
        } else {
            errorElement.textContent = data.message || ('Erro ao cadastrar: HTTP ' + response.status);
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
        const response = await fetch(API_BASE + '/auth/users', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
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
    aplicarEmpresaNoFormularioCadastro();
    renderUsers();
    populateConviteSelectFromUsers();
    ocultarPainelConvite();
    conviteAtual = { empresaId: null, nomeEmpresa: '', codigo: '' };
}

// Renderizar lista de usuários (filtrada pela empresa atual)
function renderUsers(userList) {
    const base = usersFiltradosEmpresa();
    const userListElement = document.getElementById('userList');
    const noUsersMessage = document.getElementById('noUsersMessage');
    const userCount = document.getElementById('userCount');
    const currentUser = getCurrentUser();
    const list = userList != null ? userList : base;

    userCount.textContent = '(' + list.length + ')';
    
    // Limpar lista
    userListElement.innerHTML = '';
    
    if (list.length === 0) {
        noUsersMessage.style.display = 'block';
        if (base.length === 0) {
            noUsersMessage.textContent = 'Nenhum usuário para a empresa ID ' + getEmpresaRetaguardaAtual() + '. Cadastre acima ou altere o ID da empresa nos Parâmetros.';
        } else {
            noUsersMessage.textContent = 'Nenhum resultado para a busca nesta empresa.';
        }
        return;
    }

    noUsersMessage.style.display = 'none';

    list.forEach(user => {
        const row = document.createElement('tr');
        
        // Verificar se é o usuário atual
        const isCurrentUser = currentUser && currentUser.username === user.username;
        
        // Traduzir perfil
        const roleNorm = String(user.role || '').toUpperCase();
        const roleText = roleNorm === 'ADM'
            ? '👑 Super Admin'
            : (roleNorm === 'ADMIN_EMPRESA' ? '🏢 Admin Empresa' : '🛒 Vendedor');
        const empPdvCell = (user.empresaId != null && user.empresaId >= 1)
            ? escapeHtml(String(user.empresaId))
            : '<span style="opacity:.75">Padrão</span>';
        const pdvVinc = user.pdvTerminalId != null ? ('#' + escapeHtml(String(user.pdvTerminalId))) : '—';
        const tel = user.telefone ? escapeHtml(user.telefone) : '—';
        const eid = user.empresaId != null && user.empresaId >= 1 ? user.empresaId : null;
        const waUserBtn = (!isCurrentUser && eid && user.telefone)
            ? `<button type="button" class="btn btn-small" style="background:#25D366;color:#fff;border:none;margin-left:4px;" title="Enviar convite por WhatsApp" onclick="whatsappConviteParaUsuario(${user.id})">📱</button>`
            : '';

        row.innerHTML = `
            <td>${escapeHtml(user.username)}</td>
            <td>${tel}${waUserBtn}</td>
            <td>${roleText}</td>
            <td>${empPdvCell}</td>
            <td>${pdvVinc}</td>
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

// Buscar usuários (só entre os da empresa atual)
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const base = usersFiltradosEmpresa();

    if (!searchTerm) {
        renderUsers(base);
        return;
    }

    const filteredUsers = base.filter(user => {
        var u = (user.username || '').toLowerCase();
        var t = (user.telefone || '').replace(/\D/g, '');
        return u.includes(searchTerm) || t.includes(searchTerm.replace(/\D/g, ''));
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
            const response = await fetch(API_BASE + '/auth/users/' + userIdToDelete, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + getToken()
                }
            });
            
            if (response.ok || response.status === 204) {
                users = users.filter(u => u.id !== userIdToDelete);
                renderUsers();
                populateConviteSelectFromUsers();
                ocultarPainelConvite();
                conviteAtual = { empresaId: null, nomeEmpresa: '', codigo: '' };
                closeModal();
                showAlert('Usuário excluído com sucesso!', 'success');
            } else {
                var msg = 'Erro ao excluir usuário.';
                try {
                    var j = await response.json();
                    if (j && j.message) msg = j.message;
                } catch (e) {}
                if (response.status === 404) msg = 'Usuário não encontrado.';
                showAlert(msg, 'error');
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
    document.getElementById('editEmpresaPdv').value = (user.empresaId != null && user.empresaId >= 1) ? user.empresaId : '';
    document.getElementById('editDesvincularPdv').checked = false;
    document.getElementById('editTelefone').value = user.telefone || '';
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
    const empresaPdvRaw = document.getElementById('editEmpresaPdv').value.trim();
    const empresaIdPdv = empresaPdvRaw === '' ? null : parseInt(empresaPdvRaw, 10);
    const desvincularPdv = document.getElementById('editDesvincularPdv').checked;
    const telefone = document.getElementById('editTelefone').value.trim();
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
        const response = await fetch(API_BASE + '/auth/users/' + userId, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({
                username: username,
                role: role,
                password: password || null,
                aplicarEmpresaPdv: true,
                empresaIdPdv: empresaIdPdv != null && !isNaN(empresaIdPdv) && empresaIdPdv >= 1 ? empresaIdPdv : null,
                desvincularPdv: desvincularPdv,
                aplicarTelefone: true,
                telefone: telefone || null
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

function setupConviteListeners() {
    var btnGerar = document.getElementById('btnGerarCodigoConvite');
    var btnWa = document.getElementById('btnWhatsAppConvite');
    var btnCopiar = document.getElementById('btnCopiarCodigo');
    var sel = document.getElementById('conviteUserSelect');
    if (btnGerar) btnGerar.addEventListener('click', async function () {
        var err = document.getElementById('conviteError');
        if (err) { err.textContent = ''; err.classList.remove('show'); }
        var empresaId = getConviteEmpresaId();
        try {
            var r = await fetch(API_BASE + '/clientes/' + empresaId + '/codigo-convite-pdv', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            var data;
            try {
                data = await r.json();
            } catch (_) {
                data = {};
            }
            if (!r.ok) {
                var msg = (data && data.message) ? data.message : ('Falha ao gerar (' + r.status + ')');
                throw new Error(msg);
            }
            conviteAtual = { empresaId: data.empresaId, nomeEmpresa: data.nomeEmpresa, codigo: data.codigo };
            document.getElementById('conviteCodigoValor').textContent = data.codigo;
            document.getElementById('conviteEmpresaNome').textContent = '(ID ' + data.empresaId + ')';
            document.getElementById('conviteCodigoBox').style.display = 'block';
            iniciarOcultarCodigoAposUmMinuto();
            showAlert('Código gerado. Visível por 1 minuto. O anterior deixou de valer.', 'success');
        } catch (e) {
            if (err) {
                err.textContent = (e && e.message) ? e.message : 'Não foi possível gerar o código.';
                err.classList.add('show');
            }
        }
    });
    if (btnCopiar) btnCopiar.addEventListener('click', function () {
        if (!conviteAtual.codigo) return;
        navigator.clipboard.writeText(conviteAtual.codigo).then(function () {
            showAlert('Código copiado.', 'success');
        }).catch(function () { showAlert('Copie manualmente.', 'error'); });
    });
    if (btnWa) btnWa.addEventListener('click', function () {
        var phone = document.getElementById('conviteWhatsAppPhone').value;
        if (!conviteAtual.codigo || !conviteAtual.empresaId) {
            showAlert('Gere o código primeiro.', 'error');
            return;
        }
        abrirWhatsAppComTexto(phone, textoConviteWhatsApp(conviteAtual.empresaId, conviteAtual.nomeEmpresa, conviteAtual.codigo));
    });
    if (sel) sel.addEventListener('change', function () {
        var phoneInp = document.getElementById('conviteWhatsAppPhone');
        var u = getSelectedConviteUser();
        if (phoneInp) phoneInp.value = (u && u.telefone) ? u.telefone : '';
    });
}

async function whatsappConviteParaUsuario(userId) {
    var user = users.find(function (u) { return u.id === userId; });
    if (!user || !user.telefone) {
        showAlert('Usuário sem telefone cadastrado.', 'error');
        return;
    }
    var eid = getEmpresaRetaguardaAtual();
    try {
        var r = await fetch(API_BASE + '/clientes/' + eid + '/codigo-convite-pdv', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!r.ok) {
            showAlert('Não foi possível obter o código.', 'error');
            return;
        }
        var data = await r.json();
        if (!data.codigo) {
            showAlert('Gere o código de convite para esta empresa em «Código de convite PDV» acima.', 'error');
            return;
        }
        abrirWhatsAppComTexto(user.telefone, textoConviteWhatsApp(data.empresaId, data.nomeEmpresa, data.codigo));
    } catch (e) {
        showAlert('Erro ao buscar código.', 'error');
    }
}

