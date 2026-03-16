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
let activeModal = null; // Controla qual modal está ativo
let currentCaixaStatus = 'LIVRE'; // LIVRE, PAUSADO, FECHADO

// Chaves do LocalStorage
const CURRENT_USER_KEY_LOCAL = 'currentUser';
const AUTH_TOKEN_KEY_LOCAL = 'authToken';

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    // Integração com auth.js e config.js
    if (typeof checkAuth === 'function' && !checkAuth()) return;
    if (typeof displayUserNameOnPdv === 'function') displayUserNameOnPdv();
    if (typeof loadClientParams === 'function') loadClientParams();
    
    loadProducts();
    loadAllSales(); // Carrega o histórico de vendas para a pesquisa (F7)
    setupEventListeners();
    setupKeyboardShortcuts();
    // Inicializa o status
    setCaixaStatus('LIVRE');
});

function displayUserNameOnPdv() {
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

    const saleSearchInput = document.getElementById('saleSearchInput');
    if(saleSearchInput) {
        saleSearchInput.addEventListener('input', renderSaleSearchResults);
    }

    const installmentsSelect = document.getElementById('installments');
    if (installmentsSelect) {
        installmentsSelect.addEventListener('change', updateInstallmentInfo);
    }

    const discountTypeSelect = document.getElementById('discountType');
    if (discountTypeSelect) {
        discountTypeSelect.addEventListener('change', toggleDiscountInput);
    }
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');
    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', applyDiscount);
    }


}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        const isModalInput = e.target.closest('.modal') && e.target.tagName === 'INPUT';

        // REGRA DE NEGÓCIO: Se o caixa não estiver LIVRE, bloqueia a maioria dos atalhos
        // Permite apenas F5 (Recarregar/Nova Venda se necessário forçar) ou lógica especifica
        if (currentCaixaStatus !== 'LIVRE' && !['F5', 'F11', 'Escape'].includes(e.key)) {
            return; 
        }

        // Permite atalhos se o foco estiver no input principal ou se for a tecla Esc
        if (isModalInput && e.key !== 'Escape') {
            return;
        }

        const key = e.key;
        const ctrl = e.ctrlKey;

        // Prevenir ações padrão do navegador
        if (key.startsWith('F') || (ctrl && ['d', 'p', 'r'].includes(key.toLowerCase())) || key === 'p' || key === 'P') {
            e.preventDefault();
        }

        // Atalho para FECHAR CAIXA (Alt + F) - Fim de Expediente
        if (e.altKey && key.toLowerCase() === 'f') {
            e.preventDefault();
            if (confirm('Deseja realmente FECHAR o caixa (Final de Expediente)?')) {
                setCaixaStatus('FECHADO');
                showAlert('Caixa FECHADO.', 'warning');
            }
            return;
        }

        switch (key) {
            case 'F2':
                document.getElementById('pdv-barcode').focus();
                showAlert('Foco no campo de código.', 'info');
                break;
            case 'F3':
                document.getElementById('pdv-order-code').focus();
                showAlert('Foco no campo de pedido.', 'info');
                break;
            case 'F4':
                changeQuantity();
                break;
            case 'F5':
                novaVenda();
                break;
            case 'F7':
                openSaleSearchModal();
                break;
            case 'F8':
                openProductSearchModal();
                break;
            case 'F9':
                alert('Função "Alterar Venda (F9)" não implementada.');
                break;
            case 'F10':
                finalizeSale();
                break;
            case 'F11':
                if (confirm('Tem certeza que deseja cancelar esta venda?')) {
                    novaVenda();
                }
                break;
            case 'F12':
                alert('Função "Indicar Cliente (F12)" não implementada.');
                break;
            case 'p': // 'P' maiúsculo ou minúsculo
            case 'P':
                if (!ctrl) { // Garante que não é Ctrl+P
                     printLastSale();
                }
                break;
            case 'Escape':
                if (activeModal) {
                    closeModal(activeModal);
                } else {
                    // Verificar o perfil do usuário para decidir a ação de saída
                    if (typeof isVendedor === 'function' && isVendedor()) {
                        // Se for VENDEDOR, pergunta se quer fazer logout
                        if (confirm('Deseja sair do PDV e fazer logout?')) {
                            logout(); // Função do auth.js que redireciona para login.html
                        }
                    } else {
                        // Se for ADM ou outro perfil, volta para a retaguarda
                        if (confirm('Deseja sair do PDV e voltar para a retaguarda do sistema?')) {
                            window.location.href = 'index.html';
                        }
                    }
                }
                break;
        }

        // Atalhos com Ctrl
        if (ctrl) {
            switch (key.toLowerCase()) {
                case 'd':
                    addCpfToSale();
                    break;
                case 'p':
                    alert('Função "Preço Produto (Ctrl+P)" não implementada.');
                    break;
                case 'r':
                    alert('Função "Contas a Receber (Ctrl+R)" não implementada.');
                    break;
            }
        }
    });
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
        document.getElementById('pdv-barcode').value = ''; // Limpa o input
        return;
    }

    const codigo = String(codigoLido || '').trim();
    if (!codigo) return;

    let foundProduct = products.find(p => p.codigoProduto === codigo);

    if (!foundProduct) {
        showAlert(`Produto com código ${codigo} não encontrado.`, 'error');
        // Limpa o campo de código de barras em caso de erro e mantém o foco
        const barcodeInput = document.getElementById('pdv-barcode');
        barcodeInput.value = '';
        barcodeInput.focus();
        return;
    }

    addToCart(foundProduct.id);
    document.getElementById('pdv-barcode').value = '';
    document.getElementById('pdv-barcode').focus();
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
    renderCart();
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

function renderCart() {
    const tbody = document.getElementById('pdv-item-list-body');
    tbody.innerHTML = ''; // Limpa a tabela

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
    // Remover alertas existentes para não empilhar
    const existingAlert = document.querySelector('.pdv-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Criar o elemento do novo alerta
    const alert = document.createElement('div');
    alert.className = `pdv-alert alert-${type}`;
    alert.textContent = message;
    
    // Adicionar ao corpo da página
    document.body.appendChild(alert);
    
    // Forçar o aparecimento com uma pequena pausa para a transição funcionar
    setTimeout(() => {
        alert.classList.add('show');
    }, 10);

    // Agendar a remoção do alerta
    setTimeout(() => {
        alert.classList.remove('show');
        // Esperar a animação de saída antes de remover o elemento do DOM
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
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
    const cpf = prompt('Digite o CPF do cliente para a nota:', saleCpf || '');
    if (cpf !== null) {
        saleCpf = cpf.trim();
        showAlert(`CPF ${saleCpf ? saleCpf + ' associado' : 'removido'} à venda.`, 'success');
    }
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
    openReceiptModal(sale);
}

function openReceiptModal(sale) {
    const saleDate = new Date(sale.dataVenda || new Date());
    document.getElementById('detailDate').textContent = saleDate.toLocaleString('pt-BR');
    document.getElementById('detailOperator').textContent = sale.nomeOperador || 'N/A';
    
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

    const cashInfoDiv = document.getElementById('detailCashInfo');
    const valorRecebidoSpan = document.getElementById('detailValorRecebido');
    const trocoSpan = document.getElementById('detailTroco');

    // Mostra informações de troco apenas para vendas em dinheiro
    if (sale.formaPagamento === 'DINHEIRO' && sale.valorRecebido) {
        valorRecebidoSpan.textContent = parseFloat(sale.valorRecebido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        trocoSpan.textContent = parseFloat(sale.troco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        cashInfoDiv.style.display = 'block';
    } else {
        cashInfoDiv.style.display = 'none';
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
    openReceiptModal(lastSale);
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
}

function cycleCaixaStatus() {
    // Regra de negócio alterada: O clique simples alterna apenas entre LIVRE e PAUSADO (Almoço/Intervalo)
    // Para FECHAR (Fim de expediente), deve-se usar Alt+F ou Ctrl+Clique
    
    const evt = window.event;
    // Permite fechar clicando com Ctrl pressionado
    if (evt && (evt.ctrlKey || evt.altKey)) {
        if (confirm('Deseja realmente FECHAR o caixa (Final de Expediente)?')) {
            setCaixaStatus('FECHADO');
            showAlert('Caixa FECHADO.', 'warning');
        }
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
    selectPaymentMethod('DINHEIRO'); // Reseta para o padrão
    document.getElementById('cash-received').value = '';
    updatePaymentSummary();
    openModal('paymentModal');
}

function selectPaymentMethod(method) {
    // Remove a classe 'active' de todos os botões
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('active'));
    // Adiciona a classe 'active' ao botão clicado
    document.getElementById(`pay-${method.toLowerCase()}`).classList.add('active');

    // Mostra/esconde os campos específicos
    document.getElementById('cash-fields').style.display = (method === 'DINHEIRO') ? 'block' : 'none';
    document.getElementById('credit-fields').style.display = (method === 'CREDITO') ? 'block' : 'none';
    document.getElementById('pix-fields').style.display = (method === 'PIX') ? 'block' : 'none';

    if (method === 'CREDITO') {
        updateInstallmentInfo();
    } else if (method === 'PIX') {
        generatePixQRCode();
    }

    updatePaymentSummary();
}

function updateInstallmentInfo() {
    const total = getCartTotal(); // Já considera o desconto
    const cashReceivedInput = document.getElementById('cash-received').value;
    const cashReceived = parseFloat(cashReceivedInput.replace(',', '.')) || 0;
    
    // O valor a ser parcelado é o que resta após um possível pagamento em dinheiro
    const amountToFinance = Math.max(0, total - cashReceived);
    
    const installmentsSelect = document.getElementById('installments');
    const numInstallments = parseInt(installmentsSelect.value);
    
    const infoDiv = document.getElementById('installments-info');
    
    if (amountToFinance > 0 && numInstallments > 0) {
        const installmentValue = amountToFinance / numInstallments;
        infoDiv.innerHTML = `<strong>${numInstallments}x</strong> de <strong>${installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}

function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartTotal() {
    return Math.max(0, getCartSubtotal() - currentDiscount);
}

function updatePaymentSummary() {
    const total = getCartTotal();
    const method = document.querySelector('.payment-method-btn.active')?.id.replace('pay-', '').toUpperCase() || 'DINHEIRO';

    let paid = 0;
    let change = 0;
    let remaining = 0;

    if (method === 'DINHEIRO') {
        const cashReceivedInput = document.getElementById('cash-received').value;
        const cashReceived = parseFloat(cashReceivedInput.replace(',', '.')) || 0;
        paid = cashReceived;
        change = Math.max(0, paid - total);
        remaining = Math.max(0, total - paid);
    } else { // DEBITO, CREDITO, PIX
        paid = total;
        change = 0;
        remaining = 0;
    }

    // Se o método de pagamento for crédito, atualiza o valor das parcelas
    if (method === 'CREDITO') {
        updateInstallmentInfo();
    }

    document.getElementById('summary-total').textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-paid').textContent = paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-change').textContent = change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-remaining').textContent = remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function processPayment() {
    const total = getCartTotal();
    if (total <= 0) return;

    // VALIDAÇÃO: Verifica se há itens com preço inválido antes de enviar
    for (const item of cart) {
        // Number.isFinite() é uma verificação robusta que lida com null, undefined, NaN e Infinity.
        if (!Number.isFinite(item.price)) {
            showAlert(`Erro: O item "${item.name}" está com um preço inválido. Por favor, remova o item e tente novamente.`, 'error');
            closeModal('paymentModal'); // Fecha o modal de pagamento para corrigir o carrinho
            return; // Aborta o pagamento
        }
    }

    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : { id: null, username: 'Caixa' };
    // Correção: Pega o ID do botão (ex: pay-credito), remove 'pay-' e converte para maiúsculo
    const method = document.querySelector('.payment-method-btn.active').id.replace('pay-', '').toUpperCase();

    const saleRequest = {
        usuarioId: user.id,
        itens: cart.map(item => ({
            produtoId: item.productId,
            quantidade: item.quantity,
            nome: item.name,
            preco: item.price,
            subtotal: item.price * item.quantity
        })),
        formaPagamento: method,
        desconto: currentDiscount,
    };

    // Adiciona campos específicos com base no método de pagamento
    if (method === 'CREDITO') {
        saleRequest.parcelas = parseInt(document.getElementById('installments').value);
    } else if (method === 'DINHEIRO') {
        const cashReceivedInput = document.getElementById('cash-received').value;
        const cashReceived = parseFloat(cashReceivedInput.replace(',', '.')) || 0;
        if (cashReceived < total) {
            showAlert('Valor recebido em dinheiro é menor que o total da venda.', 'error');
            return;
        }
        saleRequest.valorRecebido = cashReceived;
        saleRequest.troco = cashReceived - total;
    }

    try {
        const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
        const response = await fetch('http://localhost:8080/api/vendas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(saleRequest)
        });

        if (response.ok) {
            lastSale = await response.json();
            showAlert('Venda finalizada com sucesso!', 'success');

            // SOLUÇÃO: Adiciona manualmente os detalhes de pagamento ao objeto 'lastSale'
            // Isso garante que o recibo tenha os dados, mesmo que o backend não os retorne.
            lastSale.formaPagamento = saleRequest.formaPagamento;
            lastSale.desconto = saleRequest.desconto;
            if (saleRequest.formaPagamento === 'DINHEIRO') {
                lastSale.valorRecebido = saleRequest.valorRecebido;
                lastSale.troco = saleRequest.troco;
            }
            
            // Atraso para garantir que o usuário veja a mensagem de sucesso
            setTimeout(() => {
                closeModal('paymentModal');
                printLastSale();
                novaVenda();
                loadProducts(); // Recarrega produtos para atualizar estoque
            }, 1500);
        } else {
            const errorData = await response.json();
            showAlert(`Erro ao finalizar venda: ${errorData.message || response.statusText}`, 'error');
        }
    } catch (error) {
        showAlert('Falha de comunicação ao finalizar a venda.', 'error');
        console.error('Erro ao processar pagamento:', error);
    }
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
    const total = getCartTotal();
    
    if (!pixKey || total <= 0) {
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
    payload += formatCopiaECola('54', total.toFixed(2));
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
