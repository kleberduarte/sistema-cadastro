// vendas.js - Adaptado para a nova interface de PDV com foco em teclado

// Variáveis globais
let products = [];
let cart = []; 
let sales = [];
let currentItem = null; // Item sendo adicionado/visualizado
let saleCustomer = null; // Cliente associado à venda
let saleCpf = null; // CPF na nota
let currentDiscount = 0;
let lastSale = null; // Armazena a última venda finalizada
let currentPixPayload = ''; // Armazena o payload do PIX "Copia e Cola"
let currentPayments = []; // Armazena os pagamentos mistos
let activeModal = null; // Controla qual modal está ativo
let activePaymentMethod = 'DINHEIRO'; // Método selecionado pelos botões
let currentCaixaStatus = 'LIVRE'; // LIVRE, PAUSADO, FECHADO

// Chaves do LocalStorage
const CURRENT_USER_KEY_LOCAL = 'currentUser';
const AUTH_TOKEN_KEY_LOCAL = 'authToken';

/** Confirmação estilizada (mesmo layout do sistema); fallback em confirm nativo. */
function pdvConfirm(message, opts) {
    opts = opts || {};
    if (typeof window.showSystemConfirm === 'function') {
        return window.showSystemConfirm(message, opts);
    }
    return new Promise(function (res) {
        res(confirm(message));
    });
}

/** Links da retaguarda a partir da pasta /pdv/ */
function pdvAppHref(file) {
    if (typeof window !== 'undefined' && window.IS_PDV_APP) {
        if (file === 'relatorios.html' || file === 'index.html') return '../' + file;
    }
    return file;
}

/** Evita loop PDV ↔ login quando o JWT expira mas o terminal ainda está no localStorage */
function pdvRedirecionarParaLoginCaixa() {
    try {
        localStorage.removeItem('pdvTerminalId');
        localStorage.removeItem('pdvTerminalCodigo');
    } catch (e) { /* ignore */ }
    window.location.href = 'login.html';
}

function startPdvHeartbeat() {
    var tid = localStorage.getItem('pdvTerminalId');
    if (!tid) return;
    var api = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
    function beatOnce() {
        var token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
        if (!token) return;
        fetch(api + '/pdv/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                terminalId: parseInt(tid, 10),
                statusCaixa: currentCaixaStatus
            })
        }).catch(function () {});
    }
    function beat() {
        beatOnce();
    }
    beat();
    setInterval(beat, 25000);
    // expõe para setCaixaStatus disparar batida imediata ao mudar o status
    window._pdvBeatOnce = beatOnce;
}

function normalizePdvRole(role) {
    if (role == null || role === '') return '';
    if (typeof role === 'string') return role.trim().toUpperCase();
    if (typeof role === 'object' && role !== null && typeof role.name === 'string') {
        return role.name.trim().toUpperCase();
    }
    return String(role).trim().toUpperCase();
}

/** Perfil real: API /auth/me (igual ao login); fallback localStorage */
/** ADM no PDV: ESC encerra sessão no caixa e volta à retaguarda (mantém login JWT). */
function pdvAdminSairParaRetaguarda() {
    var apiBase = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
    var token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
    var tid = localStorage.getItem('pdvTerminalId');
    function limparPdvERedirecionar() {
        localStorage.removeItem('pdvTerminalId');
        localStorage.removeItem('pdvTerminalCodigo');
        window.location.href = pdvAppHref('index.html');
    }
    if (tid && token) {
        fetch(apiBase + '/pdv/sair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ terminalId: parseInt(tid, 10) })
        }).catch(function () {}).finally(limparPdvERedirecionar);
    } else {
        limparPdvERedirecionar();
    }
}

async function resolvePdvUserRole() {
    var apiBase = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
    var token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
    if (token) {
        try {
            var r = await fetch(apiBase + '/auth/me', {
                headers: { Authorization: 'Bearer ' + token }
            });
            if (r.ok) {
                var me = await r.json();
                if (me && me.role != null) return normalizePdvRole(me.role);
            }
        } catch (err) { /* rede / CORS */ }
    }
    try {
        var raw = localStorage.getItem(CURRENT_USER_KEY_LOCAL);
        if (raw) {
            var u = JSON.parse(raw);
            if (u && u.role != null) return normalizePdvRole(u.role);
        }
    } catch (e) { /* ignore */ }
    return '';
}

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    // Atalhos de teclado sempre registrados (em window, fase capture), para funcionar em qualquer foco
    setupKeyboardShortcuts();

    if (typeof checkAuth === 'function' && !checkAuth()) return;
    if (typeof displayUserNameOnPdv === 'function') displayUserNameOnPdv();
    if (typeof loadClientParams === 'function') loadClientParams();

    updateClienteIndicadoDisplay();
    loadProducts();
    loadAllSales();
    setupEventListeners();
    setCaixaStatus('LIVRE');
    startPdvHeartbeat();
});

function displayUserNameOnPdv() {
    var codEl = document.getElementById('pdv-terminal-codigo');
    if (codEl) {
        var cod = (localStorage.getItem('pdvTerminalCodigo') || '').trim();
        if (!cod) {
            var tid = localStorage.getItem('pdvTerminalId');
            cod = tid ? ('#' + tid) : '—';
        }
        codEl.textContent = cod.toUpperCase();
    }
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (user && user.username) {
        document.getElementById('pdv-operator-name').textContent = user.username;
    }
}

function setupEventListeners() {
    const barcodeInput = document.getElementById('pdv-barcode');
    if (barcodeInput) {
        barcodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addProductByBarcode(barcodeInput.value);
            }
        });
    }

    const productSearchInput = document.getElementById('productSearchInput');
    if(productSearchInput) {
        productSearchInput.addEventListener('input', renderSearchResults);
    }

    // --- Listeners do Modal de Pagamento ---
    const addPaymentBtn = document.getElementById('add-payment-btn');
    if(addPaymentBtn) addPaymentBtn.addEventListener('click', addPayment);

    const paymentValueInput = document.getElementById('payment-value-input');
    if(paymentValueInput) paymentValueInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addPayment();
    });

    const saleSearchInput = document.getElementById('saleSearchInput');
    if(saleSearchInput) {
        saleSearchInput.addEventListener('input', renderSaleSearchResults);
    }
    const installmentsSelect = document.getElementById('installments');
    if (installmentsSelect) {
        installmentsSelect.addEventListener('change', function() {
            if (typeof updateInstallmentsInfo === 'function') updateInstallmentsInfo();
        });
    }

    const discountTypeSelect = document.getElementById('discountType');
    if (discountTypeSelect) {
        discountTypeSelect.addEventListener('change', toggleDiscountInput);
    }
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');
    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', applyDiscount);
    }

    var clientSearchInput = document.getElementById('clientSearchInput');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); searchClients(); }
        });
    }
    var clientModalForm = document.getElementById('clientModalForm');
    if (clientModalForm) {
        clientModalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (typeof saveNewClientAndSelect === 'function') saveNewClientAndSelect();
        });
    }
}

function setupKeyboardShortcuts() {
    function handleShortcut(e) {
        var keyCode = e.keyCode || e.which;
        var key = e.key;
        if (!key && keyCode >= 112 && keyCode <= 123) {
            key = 'F' + (keyCode - 111);
        }

        var ctrl = e.ctrlKey;
        var alt = e.altKey;
        var tag = e.target && e.target.tagName ? e.target.tagName : '';
        var inModal = e.target && e.target.closest && e.target.closest('.modal');
        var isModalInput = inModal && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

        if (isModalInput && key !== 'Escape') {
            return;
        }

        var isFKey = key && String(key).match(/^F([1-9]|1[0-2])$/);
        var isShortcut = isFKey || key === 'p' || key === 'P' || key === 'Escape' || (ctrl && /^[dpr]$/i.test(key)) || (alt && key === 'f');
        if (isShortcut) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (currentCaixaStatus !== 'LIVRE' && key !== 'F5' && key !== 'F11' && key !== 'Escape') {
            return;
        }

        if (alt && (key === 'f' || key === 'F')) {
            pdvConfirm('Deseja realmente FECHAR o caixa (Final de Expediente)?', {
                title: 'Fechar caixa',
                confirmText: 'Sim, fechar',
                cancelText: 'Cancelar',
                type: 'warning'
            }).then(function (ok) {
                if (ok) {
                    setCaixaStatus('FECHADO');
                    showAlert('Caixa FECHADO.', 'warning');
                }
            });
            return;
        }

        switch (key) {
            case 'F2':
                var b = document.getElementById('pdv-barcode');
                if (b) { b.focus(); showAlert('Foco no campo de código.', 'info'); }
                break;
            case 'F3':
                var o = document.getElementById('pdv-order-code');
                if (o) { o.focus(); showAlert('Foco no campo de pedido.', 'info'); }
                break;
            case 'F4':
                if (typeof changeQuantity === 'function') changeQuantity();
                break;
            case 'F5':
                if (typeof novaVenda === 'function') novaVenda();
                break;
            case 'F7':
                if (typeof openSaleSearchModal === 'function') openSaleSearchModal();
                break;
            case 'F8':
                if (typeof openProductSearchModal === 'function') openProductSearchModal();
                break;
            case 'F9':
                alert('Função "Alterar Venda (F9)" não implementada.');
                break;
            case 'F10':
                if (typeof finalizeSale === 'function') finalizeSale();
                break;
            case 'F11':
                pdvConfirm('Tem certeza que deseja cancelar esta venda?', {
                    title: 'Cancelar venda',
                    confirmText: 'Sim, cancelar',
                    cancelText: 'Não',
                    type: 'warning'
                }).then(function (ok) {
                    if (ok && typeof novaVenda === 'function') novaVenda();
                });
                break;
            case 'F12':
                if (typeof openClientModal === 'function') openClientModal();
                break;
            case 'p':
            case 'P':
                if (!ctrl && typeof printLastSale === 'function') printLastSale();
                break;
            case 'Escape':
                if (activeModal) {
                    closeModal(activeModal);
                } else {
                    if (window.__pdvEscLeavePending) break;
                    window.__pdvEscLeavePending = true;
                    resolvePdvUserRole().then(function (roleNorm) {
                        window.__pdvEscLeavePending = false;
                        if (roleNorm === 'ADM') {
                            pdvAdminSairParaRetaguarda();
                        } else if (roleNorm === 'VENDEDOR') {
                            pdvConfirm('Deseja sair do PDV e fazer logout?', {
                                title: 'Sair do PDV',
                                confirmText: 'Sim, sair',
                                cancelText: 'Cancelar',
                                type: 'warning'
                            }).then(function (ok) {
                                if (ok && typeof logout === 'function') logout();
                            });
                        } else {
                            pdvConfirm('Deseja sair do PDV e voltar para a retaguarda do sistema?', {
                                title: 'Retaguarda',
                                confirmText: 'Sim',
                                cancelText: 'Cancelar',
                                type: 'info'
                            }).then(function (ok) {
                                if (ok) window.location.href = pdvAppHref('index.html');
                            });
                        }
                    }).catch(function () {
                        window.__pdvEscLeavePending = false;
                    });
                }
                break;
        }

        if (ctrl && key) {
            var k = key.toLowerCase();
            if (k === 'd' && typeof addCpfToSale === 'function') addCpfToSale();
            else if (k === 'p') alert('Função "Preço Produto (Ctrl+P)" não implementada.');
            else if (k === 'r') alert('Função "Contas a Receber (Ctrl+R)" não implementada.');
        }
    }

    window.addEventListener('keydown', handleShortcut, true);
}

async function loadProducts() {
    try {
        const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
        
        const response = await fetch('http://localhost:8080/api/produtos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            products = await response.json();
            showAlert(`${products.length} produtos carregados.`, 'success');
        } else {
            showAlert('Erro ao carregar produtos da API.', 'error');
        }
    } catch (error) {
        showAlert('Falha na comunicação com a API de produtos.', 'error');
    }
}

async function loadAllSales() {
    try {
        const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
        const response = await fetch('http://localhost:8080/api/vendas', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            sales = await response.json();
            console.log(`${sales.length} registros de vendas carregados para pesquisa.`);
        } else {
            showAlert('Erro ao carregar histórico de vendas.', 'error');
        }
    } catch (error) {
        showAlert('Falha de comunicação ao buscar histórico de vendas.', 'error');
    }
}

async function addProductByBarcode(codigoLido) {
    // REGRA DE NEGÓCIO: Bloquear entrada se caixa não estiver livre
    if (currentCaixaStatus !== 'LIVRE') {
        showAlert(`Caixa ${currentCaixaStatus}. Operação não permitida.`, 'warning');
        document.getElementById('pdv-barcode').value = '';
        return;
    }

    const codigo = String(codigoLido || '').trim();
    if (!codigo) return;

    // 1) Busca por código de barras (codigoProduto) – uso com leitor
    let foundProduct = products.find(function(p) {
        return p.codigoProduto != null && String(p.codigoProduto).trim() === codigo;
    });

    // 2) Fallback: busca por ID (código interno) – digitação manual do número do produto
    if (!foundProduct && /^\d+$/.test(codigo)) {
        var id = parseInt(codigo, 10);
        foundProduct = products.find(function(p) { return p.id === id; });
    }

    if (!foundProduct) {
        showAlert('Produto com código "' + codigo + '" não encontrado.', 'error');
        var barcodeInput = document.getElementById('pdv-barcode');
        if (barcodeInput) { barcodeInput.value = ''; barcodeInput.focus(); }
        return;
    }

    addToCart(foundProduct.id);
    var barcodeInput = document.getElementById('pdv-barcode');
    if (barcodeInput) { barcodeInput.value = ''; barcodeInput.focus(); }
}

function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showAlert('Produto não encontrado', 'error');
        return;
    }

    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        existingItem.quantity = parseFloat(existingItem.quantity) + parseFloat(quantity);
    } else {
        cart.push({
            productId: product.id,
            name: product.nome,
            price: parseFloat(product.preco),
            quantity: quantity,
            code: product.codigoProduto
        });
    }
    
    currentItem = existingItem || cart.find(item => item.productId === productId);
    const wasNewItem = !existingItem;
    renderCart(wasNewItem);
}

function removeFromCart(productId) {
    // Encontra o item para mostrar o nome no alerta
    const itemToRemove = cart.find(item => item.productId === productId);
    if (!itemToRemove) return;

    // Filtra o carrinho, removendo o item com o ID correspondente
    cart = cart.filter(item => item.productId !== productId);

    // Se o item removido era o item atual em exibição, limpa a exibição
    if (currentItem && currentItem.productId === productId) {
        currentItem = null;
    }

    // Renderiza o carrinho novamente para atualizar a tela
    renderCart();
    showAlert(`Produto "${itemToRemove.name}" removido da venda.`, 'info');
}

function renderCart(highlightNewLine) {
    const tbody = document.getElementById('pdv-item-list-body');
    tbody.innerHTML = '';

    if (cart.length === 0) {
        tbody.innerHTML = '<tr class="placeholder-row"><td colspan="7">Aguardando itens...</td></tr>';
    } else {
        cart.forEach((item, index) => {
            const row = document.createElement('tr');
            const itemTotal = item.price * item.quantity;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.code || '-'}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td><button class="btn-remove-item" title="Remover Item" onclick="removeFromCart(${item.productId})">🗑️</button></td>
            `;
            tbody.appendChild(row);
        });
        if (highlightNewLine && tbody.lastElementChild) {
            tbody.lastElementChild.classList.add('receipt-line-new');
            setTimeout(function() {
                if (tbody.lastElementChild) tbody.lastElementChild.classList.remove('receipt-line-new');
            }, 500);
        }
    }
    updateDisplayInfo();
    updateTotalsFooter();
}

function updateDisplayInfo() {
    if (currentItem) {
        document.getElementById('pdv-unit-price').textContent = currentItem.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('pdv-quantity').textContent = currentItem.quantity;
        const itemTotal = currentItem.price * currentItem.quantity;
        document.getElementById('pdv-item-total').textContent = itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
        document.getElementById('pdv-unit-price').textContent = 'R$ 0,00';
        document.getElementById('pdv-quantity').textContent = '0';
        document.getElementById('pdv-item-total').textContent = 'R$ 0,00';
    }
}

function updateTotalsFooter() {
    const subtotal = getCartSubtotal();
    const total = getCartTotal();
    const discountDisplay = document.getElementById('discount-display');
    const discountValueSpan = document.getElementById('pdv-discount');

    document.getElementById('pdv-subtotal').textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    if (currentDiscount > 0) {
        discountValueSpan.textContent = `- ${currentDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        discountDisplay.style.display = 'block';
    } else {
        discountDisplay.style.display = 'none';
    }

    document.getElementById('pdv-total').textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function novaVenda() {
    cart = [];
    currentItem = null;
    saleCustomer = null;
    saleCpf = null;
    currentDiscount = 0;
    const discountType = document.getElementById('discountType');
    if (discountType) discountType.value = 'none';

    toggleDiscountInput();
    renderCart();
    
    // Reseta o status para LIVRE ao iniciar nova venda (ou mantém a lógica de setCaixaStatus)
    setCaixaStatus('LIVRE');

    console.log('Nova venda iniciada.');
    showAlert('Nova venda iniciada.', 'success');
}

// Finalizar venda (chama o modal de pagamento)
function finalizeSale() {
    if (currentCaixaStatus !== 'LIVRE') {
        showAlert(`Caixa ${currentCaixaStatus}. Não é possível finalizar vendas.`, 'warning');
        return;
    }

    if (cart.length === 0) {
        showAlert('Carrinho vazio. Adicione produtos para finalizar a venda.', 'warning');
        return;
    }
    openPaymentModal();
}

function showAlert(message, type = 'info') {
    if (typeof window.showSystemAlert === 'function') {
        window.showSystemAlert(message, type);
        return;
    }

    // Fallback (caso a tela não carregue o config.js)
    const existingAlert = document.querySelector('.pdv-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.className = `pdv-alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => alert.classList.add('show'), 10);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            if (alert.parentElement) alert.remove();
        }, 500);
    }, 3000);
}

// =================================================================
// ======================= FUNÇÕES DE ATALHO =======================
// =================================================================

function toggleDiscountInput() {
    const discountType = document.getElementById('discountType').value;
    const discountValueInput = document.getElementById('discountValue');
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');

    if (discountType === 'none') {
        discountValueInput.style.display = 'none';
        applyDiscountBtn.style.display = 'none';
        discountValueInput.value = '';
        applyDiscount(); // Aplica desconto zero para resetar
    } else {
        discountValueInput.style.display = 'block';
        applyDiscountBtn.style.display = 'inline-block';
        discountValueInput.placeholder = discountType === 'percent' ? '%' : 'R$';
        discountValueInput.focus();
    }
}

function applyDiscount() {
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value.replace(',', '.')) || 0;
    const subtotal = getCartSubtotal();

    if (discountType === 'none' || discountValue <= 0) {
        currentDiscount = 0;
    } else if (discountType === 'percent') {
        if (discountValue > 100) {
            showAlert('Desconto percentual não pode ser maior que 100%.', 'error');
            return;
        }
        currentDiscount = (subtotal * discountValue) / 100;
    } else if (discountType === 'fixed') {
        if (discountValue > subtotal) {
            showAlert('Desconto fixo não pode ser maior que o subtotal.', 'error');
            return;
        }
        currentDiscount = discountValue;
    }

    updateTotalsFooter();
    showAlert('Desconto aplicado!', 'success');
}

function changeQuantity() {
    if (!currentItem) {
        showAlert('Nenhum item selecionado para alterar a quantidade.', 'warning');
        return;
    }
    const newQty = prompt(`Digite a nova quantidade para "${currentItem.name}":`, currentItem.quantity);
    if (newQty !== null && !isNaN(newQty) && parseFloat(newQty) > 0) {
        const itemInCart = cart.find(item => item.productId === currentItem.productId);
        if (itemInCart) {
            itemInCart.quantity = parseFloat(newQty);
            renderCart();
            showAlert(`Quantidade de "${itemInCart.name}" alterada para ${itemInCart.quantity}.`, 'success');
        }
    } else if (newQty !== null) {
        showAlert('Quantidade inválida.', 'error');
    }
}

function addCpfToSale() {
    const cpf = prompt('Digite o CPF do cliente para a nota:', saleCpf || (saleCustomer ? saleCustomer.cpf : ''));
    if (cpf !== null) {
        saleCpf = cpf.trim() || null;
        if (!saleCpf) saleCustomer = null;
        updateClienteIndicadoDisplay();
        showAlert(saleCpf ? `CPF ${saleCpf} associado à venda.` : 'CPF removido da venda.', 'success');
    }
}

// --- Indicar Cliente (F12) ---
const API_BASE = 'http://localhost:8080/api';

function updateClienteIndicadoDisplay() {
    const block = document.getElementById('pdv-cliente-indicado');
    const nomeEl = document.getElementById('pdv-cliente-nome');
    const cpfEl = document.getElementById('pdv-cliente-cpf');
    if (!block || !nomeEl || !cpfEl) return;
    if (saleCustomer && (saleCustomer.nome || saleCpf)) {
        block.style.display = 'block';
        nomeEl.textContent = saleCustomer.nome || '—';
        cpfEl.textContent = saleCpf ? `CPF: ${saleCpf}` : '';
    } else if (saleCpf) {
        block.style.display = 'block';
        nomeEl.textContent = 'CPF na nota';
        cpfEl.textContent = saleCpf;
    } else {
        block.style.display = 'none';
    }
}

function clearClienteIndicado() {
    saleCustomer = null;
    saleCpf = null;
    updateClienteIndicadoDisplay();
    showAlert('Cliente removido da venda.', 'success');
}

function openClientModal() {
    var inp = document.getElementById('clientSearchInput');
    if (inp) inp.value = '';
    openModal('clientModal');
    setTimeout(function() {
        if (inp) inp.focus();
        searchClients(); // Lista todos ao abrir (busca com string vazia)
    }, 100);
}

function searchClients() {
    const q = (document.getElementById('clientSearchInput') || {}).value.trim();
    const tbody = document.getElementById('client-search-results-body');
    if (!tbody) return;
    const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
    const url = API_BASE + '/clientes/search?q=' + encodeURIComponent(q);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Buscando...</td></tr>';
    fetch(url, { headers: token ? { 'Authorization': 'Bearer ' + token } : {} })
        .then(function(res) {
            if (!res.ok) throw new Error('Erro ao buscar clientes');
            return res.json();
        })
        .then(function(list) {
            if (!list || list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum cliente encontrado.</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            list.forEach(function(c) {
                var row = document.createElement('tr');
                var nome = (c.nome || '').replace(/"/g, '&quot;');
                var cpf = (c.cpf || '').replace(/"/g, '&quot;');
                row.innerHTML = '<td>' + (c.nome || '—') + '</td><td>' + (c.cpf || '—') + '</td><td>' + (c.email || '—') + '</td><td><button type="button" class="btn btn-primary btn-small" data-id="' + c.id + '" data-nome="' + nome + '" data-cpf="' + cpf + '" onclick="selectClientFromRow(this)">Usar na nota</button></td>';
                tbody.appendChild(row);
            });
        })
        .catch(function() {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Erro ao buscar clientes. Tente novamente.</td></tr>';
        });
}

function selectClientFromRow(btn) {
    var id = btn.getAttribute('data-id');
    var nome = btn.getAttribute('data-nome') || '';
    var cpf = btn.getAttribute('data-cpf') || '';
    selectClientForSale(id, nome, cpf);
}

function selectClientForSale(id, nome, cpf) {
    saleCustomer = { id: id, nome: nome, cpf: cpf };
    saleCpf = cpf || null;
    updateClienteIndicadoDisplay();
    closeModal('clientModal');
    showAlert('Cliente indicado para a nota: ' + (nome || cpf || 'CPF ' + cpf), 'success');
}

function saveNewClientAndSelect() {
    const nome = (document.getElementById('clientModalNome') || {}).value.trim();
    const cpf = (document.getElementById('clientModalCpf') || {}).value.trim().replace(/\D/g, '');
    const email = (document.getElementById('clientModalEmail') || {}).value.trim();
    const telefone = (document.getElementById('clientModalTelefone') || {}).value.trim();
    const endereco = (document.getElementById('clientModalEndereco') || {}).value.trim();
    if (!nome || !cpf || !email || !telefone) {
        showAlert('Preencha Nome, CPF, E-mail e Telefone.', 'error');
        return;
    }
    const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
    if (!token) {
        showAlert('Sessão expirada. Faça login novamente.', 'error');
        return;
    }
    fetch(API_BASE + '/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ nome: nome, cpf: cpf, email: email, telefone: telefone, endereco: endereco || null })
    })
        .then(function(res) {
            if (!res.ok) return res.json().then(function(d) { throw new Error(d.message || 'Erro ao cadastrar'); });
            return res.json();
        })
        .then(function(created) {
            selectClientForSale(created.id, created.nome, created.cpf);
            document.getElementById('clientModalForm').reset();
        })
        .catch(function(e) {
            showAlert(e.message || 'Erro ao cadastrar cliente.', 'error');
        });
}

// =================================================================
// ===================== CONTROLE DE MODAIS ========================
// =================================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        activeModal = modalId;
        const input = modal.querySelector('input');
        if (input) {
            input.focus();
            input.select();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        activeModal = null;
        document.getElementById('pdv-barcode').focus(); // Foco de volta no principal
    }
}

// --- Modal de Pesquisa de Produto (F8) ---
function openProductSearchModal() {
    document.getElementById('productSearchInput').value = '';
    renderSearchResults();
    openModal('productSearchModal');
}

function renderSearchResults() {
    const searchTerm = document.getElementById('productSearchInput').value.toLowerCase();
    const resultsBody = document.getElementById('product-search-results-body');
    resultsBody.innerHTML = '';

    const filtered = products.filter(p => 
        p.nome.toLowerCase().includes(searchTerm) || 
        p.codigoProduto.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum produto encontrado.</td></tr>';
        return;
    }

    filtered.slice(0, 50).forEach(p => { // Limita a 50 resultados para performance
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.codigoProduto}</td>
            <td>${p.nome}</td>
            <td>${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td><button class="btn btn-primary btn-small" onclick="selectProductFromSearch(${p.id})">Adicionar</button></td>
        `;
        resultsBody.appendChild(row);
    });
}

function selectProductFromSearch(productId) {
    addToCart(productId);
    closeModal('productSearchModal');
}

// --- Modal de Pesquisa de Venda (F7) ---
function openSaleSearchModal() {
    document.getElementById('saleSearchInput').value = '';
    renderSaleSearchResults();
    openModal('saleSearchModal');
}

function renderSaleSearchResults() {
    const searchTerm = document.getElementById('saleSearchInput').value.toLowerCase();
    const resultsBody = document.getElementById('sale-search-results-body');
    resultsBody.innerHTML = '';

    // Ordena as vendas da mais recente para a mais antiga
    const sortedSales = sales.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));

    const filtered = sortedSales.filter(s => 
        String(s.id).includes(searchTerm) || 
        (s.nomeOperador && s.nomeOperador.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma venda encontrada.</td></tr>';
        return;
    }

    filtered.slice(0, 100).forEach(s => { // Limita a 100 resultados para performance
        const saleDate = new Date(s.dataVenda);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${s.id}</td>
            <td>${saleDate.toLocaleString('pt-BR')}</td>
            <td>${s.nomeOperador || 'N/A'}</td>
            <td>${s.itens.length}</td>
            <td>${s.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td><button class="btn btn-primary btn-small" onclick="viewSaleDetails(${s.id})">Ver</button></td>
        `;
        resultsBody.appendChild(row);
    });
}

function viewSaleDetails(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) {
        showAlert('Venda não encontrada.', 'error');
        return;
    }
    openSaleDetailModal(sale);
}

function openSaleDetailModal(sale) {
    const saleDate = new Date(sale.dataVenda || new Date());
    
    document.getElementById('detailId').textContent = sale.id || 'N/A';
    document.getElementById('detailDate').textContent = saleDate.toLocaleString('pt-BR');
    document.getElementById('detailOperator').textContent = sale.nomeOperador || 'N/A';
    document.getElementById('detailCpf').textContent = sale.cpf || sale.clienteCpf || '';
    
    const itemsBody = document.getElementById('detailItems');
    itemsBody.innerHTML = '';
    
    const itens = sale.itens || [];
    itens.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>${parseFloat(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        `;
        itemsBody.appendChild(row);
    });

    const detailDiscountInfo = document.getElementById('detailDiscountInfo');
    const detailSubtotalSpan = document.getElementById('detailSubtotal');
    const detailDiscountSpan = document.getElementById('detailDiscount');

    if (sale.desconto && sale.desconto > 0) {
        const subtotal = (sale.total || 0) + (sale.desconto || 0);
        detailSubtotalSpan.textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        detailDiscountSpan.textContent = `- ${parseFloat(sale.desconto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        detailDiscountInfo.style.display = 'block';
    } else {
        detailDiscountInfo.style.display = 'none';
    }

    // Preenchimento das Formas de Pagamento
    const paymentsContainer = document.getElementById('detailPayments');
    paymentsContainer.innerHTML = '';
    
    const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (sale.pagamentos && sale.pagamentos.length > 0) {
        sale.pagamentos.forEach(p => {
             const pDiv = document.createElement('div');
             pDiv.style.display = 'flex';
             pDiv.style.justifyContent = 'space-between';
             pDiv.style.flexWrap = 'wrap';
             const valor = parseFloat(p.valor || 0);
             let left = p.forma;
             let right = fmtMoney(valor);
             if (p.forma === 'CREDITO' && p.parcelas > 1) {
                 const valorParcela = valor / p.parcelas;
                 right = `${fmtMoney(valor)} (${p.parcelas}x de ${fmtMoney(valorParcela)})`;
             }
             pDiv.innerHTML = `<span>${left}</span><span>${right}</span>`;
             paymentsContainer.appendChild(pDiv);
        });
    } else if (sale.formaPagamento) {
         // Suporte legado para venda com pagamento único
         const pDiv = document.createElement('div');
         pDiv.style.display = 'flex';
         pDiv.style.justifyContent = 'space-between';
         const valorLegado = parseFloat(sale.valorRecebido || sale.total || 0);
         let rightLegado = fmtMoney(valorLegado);
         if (sale.formaPagamento.toUpperCase() === 'CREDITO' && sale.parcelas > 1) {
             const valorParcelaLegado = valorLegado / sale.parcelas;
             rightLegado = `${fmtMoney(valorLegado)} (${sale.parcelas}x de ${fmtMoney(valorParcelaLegado)})`;
         }
         pDiv.innerHTML = `<span>${sale.formaPagamento}</span><span>${rightLegado}</span>`;
         paymentsContainer.appendChild(pDiv);
    }
    
    const changeDiv = document.getElementById('detailChange');
    if (sale.troco && sale.troco > 0) {
        document.getElementById('detailChangeValue').textContent = parseFloat(sale.troco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        changeDiv.style.display = 'block';
    } else {
        changeDiv.style.display = 'none';
    }

    const total = sale.total !== undefined ? sale.total : itens.reduce((sum, i) => sum + (i.preco * i.quantidade), 0);
    document.getElementById('detailTotal').textContent = parseFloat(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    openModal('saleDetailModal');
}

function printLastSale() {
    if (!lastSale) {
        showAlert('Nenhuma venda finalizada para imprimir.', 'warning');
        return;
    }
    openSaleDetailModal(lastSale);
    // Atraso para garantir que o modal renderize antes de imprimir
    setTimeout(() => {
        window.print();
        closeModal('saleDetailModal'); // Fecha o modal após a impressão
    }, 500);
}

// =================================================================
// ==================== CONTROLE DE STATUS CAIXA ===================
// =================================================================

function setCaixaStatus(status) {
    currentCaixaStatus = status;
    const statusEl = document.getElementById('status-caixa');
    const barcodeInput = document.getElementById('pdv-barcode');
    const header = document.querySelector('.pdv-header');

    if (!statusEl) return;

    // Remove classes anteriores
    statusEl.classList.remove('livre', 'pausado', 'fechado');
    // Remove classes de cor do header se houver
    header.style.backgroundColor = ''; 

    if (status === 'LIVRE') {
        statusEl.textContent = 'CAIXA LIVRE';
        statusEl.classList.add('livre');
        header.style.backgroundColor = '#28a745'; // Verde
        if (barcodeInput) {
            barcodeInput.disabled = false;
            barcodeInput.focus();
        }
    } else if (status === 'PAUSADO') {
        statusEl.textContent = 'CAIXA PAUSADO';
        statusEl.classList.add('pausado');
        header.style.backgroundColor = '#ffc107'; // Amarelo
        header.style.color = '#333';
        if (barcodeInput) barcodeInput.disabled = true;
    } else if (status === 'FECHADO') {
        statusEl.textContent = 'CAIXA FECHADO';
        statusEl.classList.add('fechado');
        header.style.backgroundColor = '#dc3545'; // Vermelho
        header.style.color = '#fff';
        if (barcodeInput) {
            barcodeInput.value = '';
            barcodeInput.disabled = true;
        }
    }

    try {
        if (typeof window._pdvBeatOnce === 'function') window._pdvBeatOnce();
    } catch (e) {}
}

function cycleCaixaStatus() {
    // Regra de negócio alterada: O clique simples alterna apenas entre LIVRE e PAUSADO (Almoço/Intervalo)
    // Para FECHAR (Fim de expediente), deve-se usar Alt+F ou Ctrl+Clique
    
    const evt = window.event;
    // Permite fechar clicando com Ctrl pressionado
    if (evt && (evt.ctrlKey || evt.altKey)) {
        pdvConfirm('Deseja realmente FECHAR o caixa (Final de Expediente)?', {
            title: 'Fechar caixa',
            confirmText: 'Sim, fechar',
            cancelText: 'Cancelar',
            type: 'warning'
        }).then(function (ok) {
            if (ok) {
                setCaixaStatus('FECHADO');
                showAlert('Caixa FECHADO.', 'warning');
            }
        });
        return;
    }

    if (currentCaixaStatus === 'LIVRE') {
        setCaixaStatus('PAUSADO');
        showAlert('Caixa PAUSADO (Intervalo/Almoço).', 'warning');
    } else {
        // Se estiver PAUSADO ou FECHADO, volta para LIVRE
        setCaixaStatus('LIVRE');
        showAlert('Caixa LIVRE (Retorno).', 'success');
    }
}

// --- Modal de Pagamento (F10) ---
function openPaymentModal() {
    currentPayments = []; // Limpa pagamentos anteriores
    renderAddedPayments();
    selectPaymentMethod('DINHEIRO'); // Define padrão e foca
    updatePaymentSummary();
    openModal('paymentModal');
}

function selectPaymentMethod(method) {
    activePaymentMethod = method;
    
    // Atualiza visual dos botões
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`pay-${method.toLowerCase()}`);
    if(activeBtn) activeBtn.classList.add('active');

    // Mostra/esconde opções extras
    const creditOptions = document.getElementById('credit-options');
    const pixFields = document.getElementById('pix-fields');
    
    if(creditOptions) creditOptions.style.display = (method === 'CREDITO') ? 'block' : 'none';
    if(pixFields) pixFields.style.display = (method === 'PIX') ? 'block' : 'none';

    if (method === 'CREDITO') {
        updateInstallmentsInfo();
    } else {
        const installmentsInfo = document.getElementById('installments-info');
        if (installmentsInfo) { installmentsInfo.style.display = 'none'; installmentsInfo.innerHTML = ''; }
    }

    if (method === 'PIX') {
        // Gera QR Code com o valor restante
        generatePixQRCode();
    }

    // Preenche o valor restante automaticamente
    const remaining = Math.max(0, getCartTotal() - currentPayments.reduce((sum, p) => sum + p.valor, 0));
    const paymentValueInput = document.getElementById('payment-value-input');
    
    if(paymentValueInput) {
        paymentValueInput.value = remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '';
        paymentValueInput.focus();
        paymentValueInput.select();
    }
}

function addPayment() {
    const valueInput = document.getElementById('payment-value-input');
    if (!valueInput) return;
    
    const value = parseFloat(valueInput.value.replace(',', '.')) || 0;

    if (value <= 0) {
        showAlert('O valor do pagamento deve ser maior que zero.', 'error');
        return;
    }

    const payment = {
        forma: activePaymentMethod,
        valor: value
    };

    if (activePaymentMethod === 'CREDITO') {
        payment.parcelas = parseInt(document.getElementById('installments').value);
    }

    currentPayments.push(payment);
    renderAddedPayments();
    updatePaymentSummary();

    // Limpa e foca para o próximo pagamento
    valueInput.value = '';
    
    // Se ainda faltar valor, mantém o foco, senão foca no botão de confirmar
    const remaining = getCartTotal() - currentPayments.reduce((sum, p) => sum + p.valor, 0);
    if (remaining > 0.01) {
        selectPaymentMethod(activePaymentMethod); // Recalcula restante
    } else {
        document.getElementById('confirm-payment-btn').focus();
    }
}

function removePayment(index) {
    currentPayments.splice(index, 1);
    renderAddedPayments();
    updatePaymentSummary();
    selectPaymentMethod(activePaymentMethod);
}

function renderAddedPayments() {
    const listDiv = document.getElementById('added-payments-list');
    if (!listDiv) return; // Proteção contra erro se o HTML estiver desatualizado
    
    listDiv.innerHTML = '';

    if (currentPayments.length === 0) {
        listDiv.innerHTML = '<p class="empty-list">Nenhum pagamento adicionado.</p>';
        return;
    }

    const fmt = (v) => (typeof v === 'number' ? v : parseFloat(v || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    currentPayments.forEach((p, index) => {
        const paymentDiv = document.createElement('div');
        paymentDiv.className = 'added-payment-item';
        const valor = typeof p.valor === 'number' ? p.valor : parseFloat(p.valor || 0);
        let text = `${p.forma}: ${fmt(valor)}`;
        if (p.forma === 'CREDITO' && p.parcelas > 1) {
            const valorParcela = valor / p.parcelas;
            text += ` (${p.parcelas}x de ${fmt(valorParcela)})`;
        }
        paymentDiv.innerHTML = `
            <span>${text}</span>
            <button onclick="removePayment(${index})" class="btn-remove-item" title="Remover Pagamento">&times;</button>
        `;
        listDiv.appendChild(paymentDiv);
    });
}

function getCartSubtotal() { return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); }
function getCartTotal() { return Math.max(0, getCartSubtotal() - currentDiscount); }

function updatePaymentSummary() {
    const total = getCartTotal();
    const totalPaid = currentPayments.reduce((sum, p) => sum + p.valor, 0);
    const remaining = total - totalPaid;
    const change = totalPaid > total ? totalPaid - total : 0;

    document.getElementById('summary-total').textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-paid').textContent = totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-remaining').textContent = Math.max(0, remaining).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-change').textContent = change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const confirmBtn = document.getElementById('confirm-payment-btn');
    // Regra:
    // - Se não houver nenhum pagamento adicionado, permitir confirmar (pagamento único pela forma selecionada)
    // - Se houver pagamentos, exigir que o total seja pago ou ultrapassado
    if (currentPayments.length === 0) {
        confirmBtn.disabled = total <= 0.001;
    } else {
        confirmBtn.disabled = remaining > 0.001; // pequena tolerância para ponto flutuante
    }
}

async function processPayment() {
    const total = getCartTotal();

    // Se o usuário não adicionou pagamentos manualmente,
    // assume-se pagamento único com a forma atualmente selecionada
    if (currentPayments.length === 0) {
        const payment = {
            forma: activePaymentMethod,
            valor: total
        };
        if (activePaymentMethod === 'CREDITO') {
            const installmentsSelect = document.getElementById('installments');
            payment.parcelas = installmentsSelect ? parseInt(installmentsSelect.value) : 1;
        }
        currentPayments.push(payment);
    }

    const totalPaid = currentPayments.reduce((sum, p) => sum + p.valor, 0);

    if (totalPaid < total) {
        showAlert('O valor pago é inferior ao total da venda.', 'error');
        return;
    }

    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : { id: null, username: 'Caixa' };

    const saleRequest = {
        usuarioId: user.id,
        cpfCliente: saleCpf || null, // CPF na nota (do cliente indicado ou Ctrl+D)
        itens: cart.map(item => ({
            produtoId: item.productId,
            quantidade: item.quantity,
            nome: item.name,
            preco: item.price,
            subtotal: item.price * item.quantity
        })),
        desconto: currentDiscount,
        pagamentos: currentPayments.map(p => ({
            forma: p.forma,
            valor: p.valor,
            parcelas: p.parcelas
        }))
    };

    try {
        const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
        if (!token) {
            showAlert('Sessão expirada. Faça login novamente.', 'error');
            setTimeout(pdvRedirecionarParaLoginCaixa, 1500);
            return;
        }
        const response = await fetch('http://localhost:8080/api/vendas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(saleRequest)
        });

        if (response.ok) {
            lastSale = await response.json(); // O backend agora precisa retornar a venda completa
            showAlert('Venda finalizada com sucesso!', 'success');
            
            // Opcional: Adicionar detalhes de pagamento ao `lastSale` para o recibo, se o backend não os retornar
            lastSale.pagamentos = saleRequest.pagamentos;
            lastSale.troco = totalPaid > total ? totalPaid - total : 0;
            lastSale.cpf = saleCpf; // Garante que o CPF apareça no recibo imediato
            lastSale.cpfCliente = saleCpf;

            setTimeout(() => {
                closeModal('paymentModal');
                printLastSale(); // Mostra o comprovante e abre a janela de impressão
                novaVenda();
                loadProducts();
            }, 1500);
        } else {
            let msg = response.statusText;
            try {
                const errorData = await response.json();
                msg = errorData.message || msg;
            } catch (_) { /* body vazio ou não JSON */ }
            if (response.status === 401) {
                showAlert('Sessão expirada. Faça login novamente.', 'error');
                setTimeout(pdvRedirecionarParaLoginCaixa, 1500);
            } else if (response.status === 403) {
                showAlert('Sem permissão para registrar vendas. Contate o administrador.', 'error');
            } else {
                showAlert('Erro ao finalizar venda: ' + msg, 'error');
            }
        }
    } catch (error) {
        showAlert('Falha de comunicação ao finalizar a venda.', 'error');
        console.error('Erro ao processar pagamento:', error);
    }
}

function updateInstallmentsInfo() {
    if (activePaymentMethod !== 'CREDITO') return;
    const valueInput = document.getElementById('payment-value-input');
    const installmentsSelect = document.getElementById('installments');
    const infoEl = document.getElementById('installments-info');
    if (!infoEl || !valueInput || !installmentsSelect) return;
    const valor = parseFloat(String(valueInput.value).replace(',', '.')) || 0;
    const n = parseInt(installmentsSelect.value, 10) || 1;
    if (valor <= 0 || n <= 1) {
        infoEl.style.display = 'none';
        infoEl.innerHTML = '';
        return;
    }
    const valorParcela = valor / n;
    infoEl.innerHTML = `<p><strong>Valor por parcela:</strong> ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>`;
    infoEl.style.display = 'block';
}

// =================================================================
// ========================== LÓGICA PIX ===========================
// =================================================================

function getPixStoreKey() {
    // Integrar com config.js
    if (window.clientParams && window.clientParams.chavePix) {
        return window.clientParams.chavePix;
    }
    return 'seu-email-ou-chave-pix-padrao'; // Chave padrão
}

function formatCopiaECola(id, value) {
    const valueStr = String(value);
    const len = valueStr.length.toString().padStart(2, '0');
    return `${id}${len}${valueStr}`;
}

function generatePixQRCode() {
    const pixKey = getPixStoreKey();
    // O valor do PIX deve ser o que falta pagar, não necessariamente o total
    const totalPaid = currentPayments.reduce((sum, p) => sum + p.valor, 0);
    const amountToPay = Math.max(0, getCartTotal() - totalPaid);
    
    if (!pixKey || amountToPay <= 0) {
        document.getElementById('pix-qrcode').innerHTML = '<p>Erro ao gerar QR Code (verifique valor e chave PIX).</p>';
        return;
    }
    
    const merchantName = (window.clientParams?.nomeEmpresa || 'Sua Loja').substring(0, 25);
    const merchantCity = 'SAO PAULO';

    let payload = '';
    payload += formatCopiaECola('00', '01');
    payload += formatCopiaECola('26', formatCopiaECola('00', 'br.gov.bcb.pix') + formatCopiaECola('01', pixKey));
    payload += formatCopiaECola('52', '0000');
    payload += formatCopiaECola('53', '986');
    payload += formatCopiaECola('54', amountToPay.toFixed(2));
    payload += formatCopiaECola('58', 'BR');
    payload += formatCopiaECola('59', merchantName);
    payload += formatCopiaECola('60', merchantCity);
    payload += formatCopiaECola('62', formatCopiaECola('05', '***'));
    payload += '6304';
    
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        }
        crc &= 0xFFFF;
    }
    
    const crcString = crc.toString(16).toUpperCase().padStart(4, '0');
    currentPixPayload = payload + crcString;
    
    const qrContainer = document.getElementById('pix-qrcode');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: currentPixPayload,
        width: 200,
        height: 200,
    });

    document.getElementById('pix-payload-display').value = currentPixPayload;
    document.getElementById('copy-pix-btn').style.display = 'inline-block';
}

function copyPixPayload() {
    const payloadInput = document.getElementById('pix-payload-display');
    payloadInput.select();
    document.execCommand('copy');
    showAlert('Código PIX copiado!', 'success');
}
