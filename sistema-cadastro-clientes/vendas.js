// Sistema de PDV - Ponto de Venda - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

// Variáveis globais
let products = [];
let cart = [];
let sales = [];
let currentDiscount = 0;
let discountType = 'none';
let partialPayments = []; // Array para armazenar pagamentos parciais
let currentPixPayload = ''; // Armazena o payload do PIX "Copia e Cola"

// Chave PIX da loja: pode vir dos parâmetros da empresa (config.js) ou cair em um padrão
function getPixStoreKey() {
    if (window.PIX_STORE_KEY && typeof window.PIX_STORE_KEY === 'string') {
        return window.PIX_STORE_KEY;
    }
    // Valor padrão caso não esteja configurado nos parâmetros
    return 'pix@lojapdv.com';
}

// Limpar dados antigos do localStorage (deve ser definida antes do uso)
function clearOldLocalStorage() {
    localStorage.removeItem('sales');
}

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    displayUserName();
    setupMenuByRole();
    clearOldLocalStorage(); // Limpar dados antigos do localStorage
    injectPrintStyles(); // Prepara estilos para impressão em impressora térmica
    loadProducts();
    loadTodaySales();  // Carrega vendas de hoje da API
    setupEventListeners();

    // Focar automaticamente no campo de código de barras ao carregar a página
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.focus();
    }
});

// Configurar event listeners
function setupEventListeners() {
    // Campo de busca
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', searchProducts);

    // Campo de código de barras (scanner/teclado)
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleBarcodeAdd();
            }
        });
    }
}

// Carregar produtos da API
async function loadProducts() {
    try {
        const response = await fetch('http://localhost:8080/api/produtos', {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            products = await response.json();
            console.log('Produtos carregados da API:', products);
        } else {
            console.error('Erro ao carregar produtos');
            // Fallback para localStorage
            const storedProducts = localStorage.getItem('products');
            if (storedProducts) {
                products = JSON.parse(storedProducts);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        // Fallback para localStorage
        const storedProducts = localStorage.getItem('products');
        if (storedProducts) {
            products = JSON.parse(storedProducts);
        }
    }
    renderProducts();
}

// Carregar vendas de hoje da API
async function loadTodaySales() {
    try {
        const response = await fetch('http://localhost:8080/api/vendas/hoje', {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            const vendas = await response.json();
            // Converter formato da API para formato local
            sales = vendas.map(venda => ({
                id: venda.id,
                date: venda.dataVenda,
                operator: venda.nomeOperador,
                items: venda.itens.map(item => ({
                    productId: item.produtoId,
                    name: item.nome,
                    price: parseFloat(item.preco),
                    quantity: item.quantidade,
                    subtotal: parseFloat(item.subtotal)
                })),
                subtotal: parseFloat(venda.subtotal),
                discount: parseFloat(venda.desconto || 0),
                total: parseFloat(venda.total)
            }));
            console.log('Vendas de hoje carregadas da API:', sales);
        } else {
            console.error('Erro ao carregar vendas de hoje da API');
            // Fallback para localStorage
            loadSalesFromLocalStorage();
        }
    } catch (error) {
        console.error('Erro ao carregar vendas de hoje:', error);
        // Fallback para localStorage
        loadSalesFromLocalStorage();
    }
    renderTodaySales();
}

// Carregar vendas do localStorage (fallback)
function loadSalesFromLocalStorage() {
    const storedSales = localStorage.getItem('sales');
    if (storedSales) {
        sales = JSON.parse(storedSales);
    }
}

// Carregar vendas do localStorage (para uso geral)
function loadSales() {
    const storedSales = localStorage.getItem('sales');
    if (storedSales) {
        sales = JSON.parse(storedSales);
    }
}

// Salvar vendas no localStorage
function saveSales() {
    localStorage.setItem('sales', JSON.stringify(sales));
}

// Renderizar produtos disponíveis
function renderProducts(productList = products) {
    const productsGrid = document.getElementById('productsGrid');
    const noProductsMessage = document.getElementById('noProductsMessage');
    const productCount = document.getElementById('productCount');
    
    // Atualizar contador (apenas produtos com estoque > 0)
    const availableProducts = productList.filter(p => p.quantidadeEstoque > 0);
    productCount.textContent = `(${availableProducts.length})`;
    
    // Limpar grid
    productsGrid.innerHTML = '';
    
    if (availableProducts.length === 0) {
        noProductsMessage.style.display = 'block';
        return;
    }
    
    noProductsMessage.style.display = 'none';
    
    // Criar cards de produtos
    availableProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Formatar preço
        const formattedPrice = parseFloat(product.preco).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        card.innerHTML = `
            <div class="product-card-header">
                <h3>${escapeHtml(product.nome)}</h3>
                <span class="product-category">${escapeHtml(product.categoria || 'Sem categoria')}</span>
            </div>
            <div class="product-card-body">
                <p class="product-description">${escapeHtml((product.descricao || '').substring(0, 50))}${(product.descricao || '').length > 50 ? '...' : ''}</p>
                <p class="product-price">${formattedPrice}</p>
                <p class="product-stock">Estoque: ${product.quantidadeEstoque}</p>
            </div>
            <div class="product-card-footer">
                <button class="btn btn-primary btn-small" onclick="addToCart(${product.id})">
                    ➕ Adicionar
                </button>
            </div>
        `;
        
        productsGrid.appendChild(card);
    });
}

// Buscar produtos (por nome, categoria ou código EAN)
function normalizeBarcode(value) {
    return String(value || '').replace(/\s+/g, '').replace(/-/g, '').trim();
}

async function addProductByBarcode(codigoLido) {
    const codigo = normalizeBarcode(codigoLido);

    if (!codigo) {
        showAlert('Informe um código de barras válido', 'error');
        return;
    }

    let foundProduct = null;

    // 1) Tenta backend por código
    try {
        const response = await fetch(`http://localhost:8080/api/produtos/codigo/${encodeURIComponent(codigo)}`, {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });

        if (response.ok) {
            foundProduct = await response.json();
        }
    } catch (error) {
        console.warn('Falha ao buscar produto por código na API, tentando fallback local.', error);
    }

    // 2) Fallback local
    if (!foundProduct) {
        foundProduct = products.find(p => normalizeBarcode(p.codigoProduto) === codigo);
    }

    if (!foundProduct) {
        showAlert('Produto não encontrado para o código informado', 'error');
        return;
    }

    addToCart(foundProduct.id);
    showAlert(`Produto "${foundProduct.nome}" adicionado por código`, 'success');
}

function handleBarcodeAdd() {
    const barcodeInput = document.getElementById('barcodeInput');
    if (!barcodeInput) return;

    const codigo = barcodeInput.value;
    addProductByBarcode(codigo);
    barcodeInput.value = '';
    barcodeInput.focus();
}

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product => {
        const nome = product.nome || '';
        const categoria = product.categoria || '';
        const codigoProduto = product.codigoProduto || '';
        return nome.toLowerCase().includes(searchTerm) || 
               categoria.toLowerCase().includes(searchTerm) ||
               codigoProduto.toLowerCase().includes(searchTerm);
    });
    
    renderProducts(filteredProducts);
}

// Adicionar produto ao carrinho
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showAlert('Produto não encontrado', 'error');
        return;
    }
    
    if (product.quantidadeEstoque <= 0) {
        showAlert('Produto sem estoque', 'error');
        return;
    }
    
    // Verificar se produto já está no carrinho
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        // Verificar se há estoque suficiente
        if (existingItem.quantity >= product.quantidadeEstoque) {
            showAlert('Estoque insuficiente', 'error');
            return;
        }
        existingItem.quantity++;
    } else {
        // Adicionar novo item ao carrinho
        cart.push({
            productId: product.id,
            name: product.nome,
            price: parseFloat(product.preco),
            quantity: 1,
            maxStock: product.quantidadeEstoque
        });
    }
    
    renderCart();
}

// Remover produto do carrinho
function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    renderCart();
}

// Aumentar quantidade
function increaseQuantity(productId) {
    const item = cart.find(i => i.productId === productId);
    const product = products.find(p => p.id === productId);
    
    if (item && product) {
        if (item.quantity >= product.quantidadeEstoque) {
            showAlert('Estoque insuficiente', 'error');
            return;
        }
        item.quantity++;
    }
    
    renderCart();
}

// Diminuir quantidade
function decreaseQuantity(productId) {
    const item = cart.find(i => i.productId === productId);
    
    if (item) {
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            // Se quantidade for 1, remove do carrinho
            removeFromCart(productId);
            return;
        }
    }
    
    renderCart();
}

// Renderizar carrinho
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    // Limpar carrinho
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <p>Seu carrinho está vazio</p>
                <p>Clique em um produto para adicionar</p>
            </div>
        `;
        cartTotal.textContent = 'R$ 0,00';
        return;
    }
    
    // Calcular total
    let total = 0;
    
    // Criar itens do carrinho
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        
        const formattedPrice = item.price.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        const formattedSubtotal = subtotal.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${escapeHtml(item.name)}</h4>
                <p class="cart-item-price">${formattedPrice} cada</p>
            </div>
            <div class="cart-item-quantity">
                <button class="btn-quantity" onclick="decreaseQuantity(${item.productId})">➖</button>
                <span>${item.quantity}</span>
                <button class="btn-quantity" onclick="increaseQuantity(${item.productId})">➕</button>
            </div>
            <div class="cart-item-subtotal">
                <p>${formattedSubtotal}</p>
                <button class="btn-remove" onclick="removeFromCart(${item.productId})">🗑️</button>
            </div>
        `;
        
        cartItems.appendChild(cartItem);
    });
    
    // Atualizar total usando função que considera desconto
    updateCartTotal();
}

// Limpar carrinho
function clearCart() {
    if (cart.length === 0) {
        showAlert('Carrinho já está vazio', 'error');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar o carrinho?')) {
        cart = [];
        // Resetar desconto
        currentDiscount = 0;
        document.getElementById('discountType').value = 'none';
        document.getElementById('discountValue').value = '';
        document.getElementById('discountValue').style.display = 'none';
        document.getElementById('discountInfo').style.display = 'none';
        renderCart();
        showAlert('Carrinho limpo', 'success');
    }
}

// Finalizar venda - abre o modal de pagamento
function finalizeSale() {
    if (cart.length === 0) {
        showAlert('Adicione produtos ao carrinho primeiro', 'error');
        return;
    }
    
    // Verificar estoque novamente
    for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (!product || product.quantidadeEstoque < item.quantity) {
            showAlert(`Estoque insuficiente para: ${item.name}`, 'error');
            return;
        }
    }
    
    // Mostrar modal de pagamento
    showPaymentModal();
}

// Mostrar modal de pagamento
function showPaymentModal() {
    const total = getCartTotalWithDiscount();
    
    // Resetar pagamentos parciais e estado visual de troco/falta
    partialPayments = [];
    
    // Atualizar total no modal
    document.getElementById('paymentTotal').textContent = total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    
    // Resetar campos
    document.querySelector('input[name="paymentMethod"][value="DINHEIRO"]').checked = true;
    document.getElementById('cashReceived').value = '';
    document.getElementById('parcelas').value = '1';
    const changeAmountEl = document.getElementById('changeAmount');
    if (changeAmountEl) {
        changeAmountEl.style.color = '#28a745';
        changeAmountEl.textContent = 'Troco: R$ 0,00';
    }
    // Preencher chave PIX (vinda dos parâmetros da empresa) e impedir edição manual
    const pixKeyInput = document.getElementById('pixKey');
    pixKeyInput.value = getPixStoreKey();
    pixKeyInput.readOnly = true;
    document.getElementById('parcelasInfo').innerHTML = '';
    document.getElementById('pixQRCode').innerHTML = '';
    document.getElementById('copyPixBtn').style.display = 'none';
    
    // Renderizar lista de pagamentos
    renderPartialPayments();
    
    // Atualizar status do pagamento
    updatePaymentStatus();
    
    // Mostrar campos de dinheiro por padrão
    updatePaymentFields();
    
    // Mostrar modal
    document.getElementById('paymentModal').classList.add('show');
}

// Renderizar lista de pagamentos parciais
function renderPartialPayments() {
    const paymentList = document.getElementById('partialPaymentList');
    const total = getCartTotalWithDiscount();
    
    // Calcular total pago
    const totalPaid = partialPayments.reduce((sum, p) => sum + p.valor, 0);
    const remaining = Math.max(0, total - totalPaid);
    
    paymentList.innerHTML = '';
    
    if (partialPayments.length === 0) {
        paymentList.innerHTML = '<p class="no-payments">Nenhum pagamento adicionado</p>';
    } else {
        partialPayments.forEach((payment, index) => {
            const paymentItem = document.createElement('div');
            paymentItem.className = 'partial-payment-item';
            
            let methodLabel = '';
            let icon = '';
            switch(payment.metodo) {
                case 'DINHEIRO':
                    methodLabel = 'Dinheiro';
                    icon = '💵';
                    break;
                case 'DEBITO':
                    methodLabel = 'Débito';
                    icon = '💳';
                    break;
                case 'CREDITO':
                    methodLabel = 'Crédito ' + payment.parcelas + 'x';
                    icon = '💳';
                    break;
                case 'PIX':
                    methodLabel = 'PIX';
                    icon = '📱';
                    break;
            }
            
            paymentItem.innerHTML = `
                <div class="payment-item-info">
                    <span class="payment-icon">${icon}</span>
                    <span class="payment-method">${methodLabel}</span>
                </div>
                <div class="payment-item-value">
                    <span>${payment.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <button class="btn-remove" onclick="removePartialPayment(${index})">🗑️</button>
                </div>
            `;
            paymentList.appendChild(paymentItem);
        });
    }
    
    // Atualizar valor restante
    document.getElementById('remainingAmount').textContent = remaining.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    
    // Atualizar cor do valor restante
    const remainingEl = document.getElementById('remainingAmount');
    if (remaining > 0) {
        remainingEl.style.color = '#dc3545';
    } else {
        remainingEl.style.color = '#28a745';
    }
}

// Atualizar status do pagamento
function updatePaymentStatus() {
    const total = getCartTotalWithDiscount();
    const totalPaid = partialPayments.reduce((sum, p) => sum + p.valor, 0);
    const remaining = Math.max(0, total - totalPaid);

    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value || '';
    const confirmBtn = document.querySelector('#paymentModal .btn-primary');
    const addPaymentBtn = document.getElementById('addPaymentBtn');

    // PIX: jornada direta (sem "Adicionar pagamento")
    if (method === 'PIX') {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.textContent = '✅ Confirmar Pagamento';

        addPaymentBtn.disabled = true;
        addPaymentBtn.style.opacity = '0.5';
        addPaymentBtn.style.display = 'none';
        return;
    }

    // Mostrar botão nos outros métodos
    addPaymentBtn.style.display = 'inline-block';

    // Para pagamento direto (sem partials) habilitar se método validado
    const directPaymentValid = remaining === total && (
        method === 'DEBITO' ||
        method === 'CREDITO'
    );

    if (remaining > 0 && !directPaymentValid) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        confirmBtn.textContent = '✅ Confirmar Pagamento';
        addPaymentBtn.disabled = false;
        addPaymentBtn.style.opacity = '1';
    } else {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.textContent = '✅ Confirmar Pagamento';
        addPaymentBtn.disabled = true;
        addPaymentBtn.style.opacity = '0.5';
    }
}

// Adicionar pagamento parcial
function addPartialPayment() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const total = getCartTotalWithDiscount();
    const totalPaid = partialPayments.reduce((sum, p) => sum + p.valor, 0);
    const remaining = Math.max(0, total - totalPaid);

    if (remaining <= 0) {
        showAlert('Pagamento já está completo', 'warning');
        return;
    }

    let valor = 0;
    let parcelas = 1;
    let chavePix = null;

    // Obter valor baseado no método
    if (method === 'DINHEIRO') {
        valor = parseCurrency(document.getElementById('cashReceived').value);
        if (valor <= 0) {
            showAlert('Digite um valor em dinheiro maior que zero', 'error');
            return;
        }
    } else if (method === 'DEBITO') {
        valor = remaining;
    } else if (method === 'CREDITO') {
        valor = remaining;
        parcelas = parseInt(document.getElementById('parcelas').value);
    } else if (method === 'PIX') {
        showAlert('Para PIX use apenas "Confirmar Pagamento"', 'warning');
        return;
    }

    valor = Math.max(0, Math.min(valor, remaining));
    if (valor <= 0) {
        showAlert('Valor inválido para adicionar pagamento', 'error');
        return;
    }

    // Consolidar pagamentos em dinheiro em uma única linha (sem acumular entradas repetidas)
    if (method === 'DINHEIRO') {
        const cashIndex = partialPayments.findIndex(p => p.metodo === 'DINHEIRO');
        if (cashIndex >= 0) {
            const novoValor = Math.max(0, Math.min(partialPayments[cashIndex].valor + valor, remaining + partialPayments[cashIndex].valor));
            partialPayments[cashIndex].valor = novoValor;
        } else {
            partialPayments.push({
                metodo: method,
                valor: valor,
                parcelas: parcelas,
                chavePix: chavePix
            });
        }
    } else {
        partialPayments.push({
            metodo: method,
            valor: valor,
            parcelas: parcelas,
            chavePix: chavePix
        });
    }

    document.getElementById('cashReceived').value = '';
    if (method !== 'PIX') {
        document.getElementById('pixKey').value = '';
        document.getElementById('pixQRCode').innerHTML = '';
        document.getElementById('copyPixBtn').style.display = 'none';
    }

    renderPartialPayments();
    updatePaymentStatus();

    showAlert('Pagamento adicionado!', 'success');
}

// Remover pagamento parcial
function removePartialPayment(index) {
    partialPayments.splice(index, 1);
    renderPartialPayments();
    updatePaymentStatus();
}

// Fechar modal de pagamento
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
}

// Atualizar campos de acordo com método de pagamento
function updatePaymentFields() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const addPaymentBtn = document.getElementById('addPaymentBtn');
    const confirmBtn = document.querySelector('#paymentModal .btn-primary');

    // Esconder todos os campos
    document.getElementById('cashFields').style.display = 'none';
    document.getElementById('creditFields').style.display = 'none';
    document.getElementById('pixFields').style.display = 'none';

    // Defaults visuais dos botões
    addPaymentBtn.style.display = 'inline-block';
    addPaymentBtn.disabled = false;
    addPaymentBtn.style.opacity = '1';

    // Mostrar campos do método selecionado
    switch(method) {
        case 'DINHEIRO':
            document.getElementById('cashFields').style.display = 'block';
            break;
        case 'DEBITO':
            // Débito não precisa de campos extras
            break;
        case 'CREDITO':
            document.getElementById('creditFields').style.display = 'block';
            updateParcelasInfo();
            break;
        case 'PIX':
            document.getElementById('pixFields').style.display = 'block';
            // PIX: esconder adicionar e liberar confirmar imediatamente
            addPaymentBtn.style.display = 'none';
            addPaymentBtn.disabled = true;
            addPaymentBtn.style.opacity = '0.5';
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.textContent = '✅ Confirmar Pagamento';

            // Garantir chave PIX preenchida (parâmetros da empresa) e gerar QR automaticamente
            // sempre para o valor restante quando houver pagamento parcial
            const pixKeyInput = document.getElementById('pixKey');
            pixKeyInput.value = getPixStoreKey();
            pixKeyInput.readOnly = true;
            const totalPix = getCartTotalWithDiscount();
            const totalPaidPix = partialPayments.reduce((sum, p) => sum + p.valor, 0);
            const remainingPix = Math.max(0, totalPix - totalPaidPix);
            generatePixQRCode(remainingPix > 0 ? remainingPix : totalPix);
            return;
    }

    updatePaymentStatus();
}

// Calcular troco
function calculateChange() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value || '';
    if (method !== 'DINHEIRO') {
        updatePaymentStatus();
        return;
    }

    const total = getCartTotalWithDiscount();
    const cashReceived = parseCurrency(document.getElementById('cashReceived').value);

    const change = Math.max(0, cashReceived - total);
    const falta = Math.max(0, total - cashReceived);

    const changeAmount = document.getElementById('changeAmount');
    if (!changeAmount) return;
    const confirmBtn = document.querySelector('#paymentModal .btn-primary');

    if (cashReceived < total) {
        changeAmount.style.color = '#dc3545';
        changeAmount.textContent = `Falta: ${falta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        confirmBtn.textContent = 'Aguardando pagamento completo';
    } else {
        changeAmount.style.color = '#28a745';
        changeAmount.textContent = `Troco: ${change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.textContent = '✅ Confirmar Pagamento';
    }
}

// Adicionar mais dinheiro ao valor recebido
function addCash(amount) {
    const cashInput = document.getElementById('cashReceived');
    const currentValue = parseCurrency(cashInput.value) || 0;
    const newValue = (currentValue + amount);
    cashInput.value = newValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    calculateChange();
    
    // Auto-adicionar se >= total
    if (newValue >= getCartTotalWithDiscount()) {
        addPartialPayment();
    }
}

// Adicionar pagamento complementar (outra forma de pagamento)
function addComplementaryPayment() {
    const total = getCartTotalWithDiscount();
    const cashReceived = parseCurrency(document.getElementById('cashReceived').value);
    const falta = Math.max(0, total - cashReceived);
    
    // Perguntar quanto será adicionado
    const adicional = prompt(`Quanto será adicionado em dinheiro? Faltam: R$ ${falta.toFixed(2).replace('.', ',')}`);
    
    if (adicional) {
        const valorAdicional = parseCurrency(adicional);
        if (valorAdicional > 0) {
            addCash(valorAdicional);
            showAlert(`Adicionado R$ ${valorAdicional.toFixed(2).replace('.', ',')}`, 'success');
        }
    }
}

// Atualizar informações de parcelas
function updateParcelasInfo() {
    const parcelas = parseInt(document.getElementById('parcelas').value);
    const total = getCartTotalWithDiscount();
    const totalPaid = partialPayments.reduce((sum, p) => sum + p.valor, 0);
    const remaining = Math.max(0, total - totalPaid);
    const base = remaining > 0 ? remaining : total;

    const infoDiv = document.getElementById('parcelasInfo');

    if (base <= 0) {
        infoDiv.innerHTML = '<p><strong>Pagamento já está completo.</strong></p>';
        return;
    }

    const valorParcela = base / parcelas;

    if (parcelas === 1) {
        infoDiv.innerHTML = `<p>${parcelas}x de <strong>${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> (sem juros)</p>`;
    } else if (parcelas <= 6) {
        infoDiv.innerHTML = `<p>${parcelas}x de <strong>${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> (sem juros)</p>`;
    } else {
        // Com juros (exemplo: 2% ao mês)
        const taxaJuros = 0.02;
        const valorComJuros = base * Math.pow(1 + taxaJuros, parcelas);
        const novaParcela = valorComJuros / parcelas;
        const totalComJuros = novaParcela * parcelas;

        infoDiv.innerHTML = `<p>${parcelas}x de <strong>${novaParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> (com juros)</p>
                             <p class="juros-info">Total com juros: <strong>${totalComJuros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>`;
    }
}

// Helper para formatar campos do BR Code (ID, Tamanho, Valor)
function formatCopiaECola(id, value) {
    const valueStr = String(value);
    const len = valueStr.length.toString().padStart(2, '0');
    return `${id}${len}${valueStr}`;
}

// Gerar QR Code PIX
function generatePixQRCode(amountOverride = null) {
    const pixKey = getPixStoreKey();
    const total = amountOverride !== null ? amountOverride : getCartTotalWithDiscount();
    
    if (!pixKey) {
        showAlert('Chave PIX da loja não configurada', 'error');
        return;
    }

    if (total === null || total <= 0) {
        showAlert('Valor PIX inválido para gerar QR Code', 'error');
        return;
    }
    
    const qrContainer = document.getElementById('pixQRCode');
    qrContainer.innerHTML = '<p>Gerando QR Code PIX...</p>';
    
    // Dados do comerciante. O nome pode vir dos parâmetros da empresa.
    const merchantNameParam = (window.clientParams && window.clientParams.nomeEmpresa) ? window.clientParams.nomeEmpresa : 'Loja PDV';
    // Normaliza o nome: remove acentos e caracteres especiais, limita a 25 chars.
    const merchantName = merchantNameParam.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
    const merchantCity = 'SAO PAULO'; // Cidade com até 15 caracteres

    // Monta o payload BR Code
    let payload = '';
    
    // ID 00: Payload Format Indicator
    payload += formatCopiaECola('00', '01');
    
    // ID 26: Merchant Account Information
    const gui = formatCopiaECola('00', 'br.gov.bcb.pix');
    const key = formatCopiaECola('01', pixKey);
    payload += formatCopiaECola('26', gui + key);
    
    // ID 52: Merchant Category Code (0000 para não especificado)
    payload += formatCopiaECola('52', '0000');
    
    // ID 53: Transaction Currency (986 para BRL)
    payload += formatCopiaECola('53', '986');
    
    // ID 54: Transaction Amount
    payload += formatCopiaECola('54', total.toFixed(2));
    
    // ID 58: Country Code (BR)
    payload += formatCopiaECola('58', 'BR');
    
    // ID 59: Merchant Name
    payload += formatCopiaECola('59', merchantName);
    
    // ID 60: Merchant City
    payload += formatCopiaECola('60', merchantCity);
    
    // ID 62: Additional Data Field (txid)
    // Para um QR Code estático com valor, o txid '***' é suficiente.
    const txidField = formatCopiaECola('05', '***');
    payload += formatCopiaECola('62', txidField);
    
    // ID 63: CRC16 - Adiciona o campo e o tamanho
    payload += '6304';
    
    // Calcula o CRC16 sobre o payload atual
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    
    // Converte o CRC para hexadecimal e anexa ao payload
    const crcString = crc.toString(16).toUpperCase().padStart(4, '0');
    const fullPayload = payload + crcString;
    currentPixPayload = fullPayload; // Armazena para o "Copia e Cola"
    
    // Gera o QR Code
    qrContainer.innerHTML = '';
    const qrDiv = document.createElement('div');
    qrContainer.appendChild(qrDiv);
    
    try {
        new QRCode(qrDiv, {
            text: fullPayload,
            width: 200,
            height: 200,
            correctLevel: QRCode.CorrectLevel.H // Aumenta a correção de erros
        });
        
        const info = document.createElement('div');
        info.innerHTML = `
            <small>Total: ${total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</small><br>
            <small>Escaneie para pagar</small>
        `;
        info.style.fontSize = '0.8rem';
        info.style.color = '#666';
        info.style.textAlign = 'center';
        qrContainer.appendChild(info);
        document.getElementById('copyPixBtn').style.display = 'inline-block';
        showAlert('QR Code PIX gerado! Escaneie para pagar.', 'success');
    } catch (e) {
        console.error("Erro ao gerar QRCode:", e);
        qrContainer.innerHTML = '<p style="color: red;">Erro ao gerar QR Code. Verifique a biblioteca QRCode.</p>';
        showAlert('Erro ao gerar QR Code. Tente novamente.', 'error');
    }
}

// Copiar o payload "Copia e Cola" do PIX
function copyPixKey() {
    if (currentPixPayload) {
        navigator.clipboard.writeText(currentPixPayload).then(() => {
            showAlert('PIX Copia e Cola copiado!', 'success');
        }).catch(() => {
            showAlert('Erro ao copiar. Tente novamente.', 'error');
        });
    } else {
        showAlert('Gere um QR Code PIX primeiro.', 'error');
    }
}

// Processar pagamento e finalizar venda
async function processPayment() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const total = getCartTotalWithDiscount();
    
    // Validações específicas por método
    const cashInputNow = parseCurrency(document.getElementById('cashReceived').value);
    const totalDinheiroParcialAtual = partialPayments
        .filter(p => p.metodo === 'DINHEIRO')
        .reduce((sum, p) => sum + p.valor, 0);
    const cashReceivedTotalAtual = partialPayments.length > 0
        ? (totalDinheiroParcialAtual + cashInputNow)
        : cashInputNow;

    if (method === 'DINHEIRO') {
        if (cashReceivedTotalAtual < total) {
            showAlert('Valor insuficiente!', 'error');
            return;
        }
    } else if (method === 'PIX') {
        // PIX direto no valor restante quando houver parcial
        const totalPaidPix = partialPayments.reduce((sum, p) => sum + p.valor, 0);
        const remainingPix = Math.max(0, total - totalPaidPix);
        generatePixQRCode(remainingPix > 0 ? remainingPix : total);
    }
    
    // Obter dados do usuário
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    const user = currentUser ? JSON.parse(currentUser) : { username: 'Operador', id: null };
    
    // Calcular subtotal
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    // Obter parcelas se for cartão de crédito
    let parcelas = 1;
    if (method === 'CREDITO') {
        parcelas = parseInt(document.getElementById('parcelas').value);
    }
    
    // Obter chave PIX se for PIX
    let chavePix = null;
    if (method === 'PIX') {
        // Usar sempre a chave PIX da empresa (parâmetros)
        chavePix = getPixStoreKey();
    }
    
    let valorRecebido = null;
    let troco = 0;

    if (method === 'DINHEIRO') {
        const cashInputEl = document.getElementById('cashReceived');
        const rawInputValue = cashInputEl ? String(cashInputEl.value || '').trim() : '';
        const parsedInputValue = parseCurrency(rawInputValue);

        let inferredFromChangeLabel = 0;
        const changeAmountEl = document.getElementById('changeAmount');
        if (changeAmountEl) {
            const label = String(changeAmountEl.textContent || '').trim();
            if (label.startsWith('Troco:')) {
                inferredFromChangeLabel = parseCurrency(label.replace('Troco:', '').trim()) + total;
            } else if (label.startsWith('Falta:')) {
                const falta = parseCurrency(label.replace('Falta:', '').trim());
                inferredFromChangeLabel = Math.max(0, total - falta);
            }
        }

        const effectiveCashInput = parsedInputValue > 0 ? parsedInputValue : inferredFromChangeLabel;
        valorRecebido = partialPayments.length > 0
            ? (totalDinheiroParcialAtual + effectiveCashInput)
            : effectiveCashInput;
        troco = Math.max(0, valorRecebido - total);
    } else if (method === 'PIX') {
        // PIX direto: sem valor recebido/troco em dinheiro
        valorRecebido = null;
        troco = 0;
    } else if (totalDinheiroParcialAtual > 0) {
        valorRecebido = totalDinheiroParcialAtual;
        troco = Math.max(0, valorRecebido - total);
    }

    // Criar registro de venda para API com dados de pagamento
    const vendaRequest = {
        usuarioId: user.id,
        itens: cart.map(item => ({
            produtoId: item.productId,
            nome: item.name,
            preco: item.price,
            quantidade: item.quantity,
            subtotal: item.price * item.quantity
        })),
        desconto: currentDiscount,
        formaPagamento: method,
        parcelas: method === 'CREDITO' ? parcelas : null,
        chavePix: chavePix,
        valorRecebido: valorRecebido,
        troco: valorRecebido !== null ? troco : null
    };
    
    // Criar registro de venda local (para fallback)
    const sale = {
        id: Date.now(),
        date: new Date().toISOString(),
        operator: user.username,
        items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
        })),
        subtotal: subtotal,
        discount: currentDiscount,
        total: total,
        formaPagamento: method,
        parcelas: method === 'CREDITO' ? parcelas : null,
        chavePix: chavePix,
        valorRecebido: valorRecebido,
        troco: valorRecebido !== null ? troco : null
    };
    
    // Fechar modal de pagamento
    closePaymentModal();
    
    // Salvar venda na API
    try {
        const response = await fetch('http://localhost:8080/api/vendas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify(vendaRequest)
        });
        
        if (response.ok) {
            const vendaResponse = await response.json();
            sale.id = vendaResponse.id;
            sale.date = vendaResponse.dataVenda;
            showAlert('Venda salva com sucesso!', 'success');
        } else {
            console.error('Erro ao salvar venda na API, salvando localmente');
            showAlert('Erro ao salvar na API. Venda salva localmente.', 'warning');
        }
    } catch (error) {
        console.error('Erro ao salvar venda na API:', error);
        showAlert('Erro ao salvar na API. Venda salva localmente.', 'warning');
    }
    
    // Adicionar venda ao histórico local
    sales.push(sale);
    saveSales();
    
    // Mostrar comprovante (forçar valores numéricos para exibição correta)
    const saleForReceipt = {
        ...sale,
        valorRecebido: Number(valorRecebido ?? 0),
        troco: Number(valorRecebido !== null ? troco : 0)
    };
    console.log('[PDV][RECEIPT]', { method, total, valorRecebido, troco, saleForReceipt });
    showReceipt(saleForReceipt);
    
    // Limpar carrinho
    cart = [];
    // Resetar desconto
    currentDiscount = 0;
    document.getElementById('discountType').value = 'none';
    document.getElementById('discountValue').value = '';
    document.getElementById('discountValue').style.display = 'none';
    document.getElementById('discountInfo').style.display = 'none';
    renderCart();
    
    // Recarregar produtos (para atualizar estoque)
    loadProducts();
    
    // Atualizar vendas de hoje
    renderTodaySales();
    
    showAlert('Venda finalizada com sucesso!', 'success');
}

// Função auxiliar para converter string de moeda para número
function parseCurrency(value) {
    if (!value) return 0;
    // Remove R$, espaços e substitui vírgula por ponto
    return parseFloat(value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

// Adicionar event listener para fechar modal de pagamento ao clicar fora
document.getElementById('paymentModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePaymentModal();
    }
});

// Mostrar comprovante
function showReceipt(sale) {
    const now = new Date(sale.date);
    
    document.getElementById('receiptDate').textContent = now.toLocaleDateString('pt-BR');
    document.getElementById('receiptTime').textContent = now.toLocaleTimeString('pt-BR');
    document.getElementById('receiptOperator').textContent = sale.operator;
    
    // Itens do comprovante
    const receiptItems = document.getElementById('receiptItems');
    receiptItems.innerHTML = '';
    
    sale.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        `;
        receiptItems.appendChild(row);
    });
    
    // Mostrar subtotal e desconto se houver
    const receiptTotal = document.getElementById('receiptTotal');
    if (sale.discount && sale.discount > 0) {
        receiptTotal.innerHTML = `
            <div class="receipt-subtotal">Subtotal: ${sale.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div class="receipt-discount">Desconto: -${sale.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div class="receipt-total-final"><strong>${sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
        `;
    } else {
        receiptTotal.innerHTML = `<strong>${sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
    }
    
    const paymentMethodMap = {
        DINHEIRO: 'DINHEIRO',
        DEBITO: 'DÉBITO',
        CREDITO: 'CRÉDITO',
        PIX: 'PIX'
    };
    document.getElementById('receiptPaymentMethod').textContent = paymentMethodMap[sale.formaPagamento] || '-';

    const receiptCashReceivedRow = document.getElementById('receiptCashReceivedRow');
    const receiptChangeRow = document.getElementById('receiptChangeRow');
    const valorRecebidoNum = Number(sale.valorRecebido ?? 0);
    const trocoNum = Number(sale.troco ?? 0);
    const hasValorRecebido = Number.isFinite(valorRecebidoNum) && valorRecebidoNum > 0;
    const hasTroco = Number.isFinite(trocoNum) && trocoNum >= 0 && hasValorRecebido;

    if (hasValorRecebido) {
        receiptCashReceivedRow.style.display = 'block';
        document.getElementById('receiptCashReceived').textContent = valorRecebidoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
        receiptCashReceivedRow.style.display = 'none';
        document.getElementById('receiptCashReceived').textContent = '';
    }

    if (hasTroco) {
        receiptChangeRow.style.display = 'block';
        document.getElementById('receiptChange').textContent = trocoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
        receiptChangeRow.style.display = 'none';
        document.getElementById('receiptChange').textContent = '';
    }

    // Mostrar modal
    document.getElementById('receiptModal').classList.add('show');
}

// Fechar modal do comprovante
function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('show');
    // Retorna o foco para o campo de código de barras para a próxima venda
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.focus();
    }
}

// Imprimir comprovante
function printReceipt() {
    window.print();
    // Fecha o modal automaticamente após a impressão para agilizar a próxima venda
    closeReceiptModal();
}

/**
 * Injeta estilos CSS específicos para garantir que o comprovante 
 * seja impresso corretamente em impressoras térmicas (80mm).
 */
function injectPrintStyles() {
    const style = document.createElement('style');
    style.id = 'thermal-print-styles';
    style.textContent = `
        @page {
            margin: 0;
            size: auto;
        }
        @media print {
            /* Ocultar elementos da interface que não devem sair no papel */
            body * { visibility: hidden; }
            header, main, footer, .modal-header, .modal-footer, button, .no-print, .btn-close, .modal-buttons { 
                display: none !important; 
            }
            
            body {
                background: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* Posicionar o modal de recibo para impressão */
            #receiptModal, #receiptModal * { 
                visibility: visible; 
            }
            #receiptModal {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
            }
            
            /* Formatação estilo cupom PDV */
            .modal-content, .receipt, #receiptModal .modal-content {
                border: none !important;
                width: 72mm !important;
                max-width: 72mm !important;
                margin: 0 auto !important;
                padding: 2mm !important;
                font-family: 'Courier New', Courier, monospace !important;
                font-size: 9pt !important;
                line-height: 1.2 !important;
                color: #000 !important;
                box-shadow: none !important;
                background: white !important;
            }
            
            table { 
                width: 100% !important; 
                border-collapse: collapse !important; 
            }
            th, td { 
                text-align: left; 
                padding: 3px 0; 
                border-bottom: 1px dashed #ccc; 
            }
            
            /* Evita que os títulos e valores quebrem linha */
            th { white-space: nowrap; }
            
            /* Alinha colunas numéricas à direita e impede quebra */
            th:nth-child(2), td:nth-child(2),
            th:nth-child(3), td:nth-child(3),
            th:nth-child(4), td:nth-child(4) {
                text-align: right;
                white-space: nowrap;
                padding-left: 5px;
            }

            /* Coluna do nome do produto pode ocupar o resto do espaço */
            th:nth-child(1), td:nth-child(1) { 
                width: auto; 
                word-wrap: break-word;
            }
        }
    `;
    document.head.appendChild(style);
}

// Renderizar vendas de hoje
function renderTodaySales() {
    const todaySales = document.getElementById('todaySales');
    const todaySalesCount = document.getElementById('todaySalesCount');
    const todayTotal = document.getElementById('todayTotal');
    
    // Filtrar vendas de hoje
    const today = new Date().toDateString();
    const todaySalesList = sales.filter(sale => 
        new Date(sale.date).toDateString() === today
    );
    
    // Atualizar contador
    todaySalesCount.textContent = `(${todaySalesList.length})`;
    
    // Calcular total do dia
    let dayTotal = 0;
    todaySalesList.forEach(sale => {
        dayTotal += sale.total;
    });
    
    todayTotal.textContent = dayTotal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    
    // Limpar lista
    todaySales.innerHTML = '';
    
    if (todaySalesList.length === 0) {
        todaySales.innerHTML = '<p class="no-sales">Nenhuma venda hoje</p>';
        return;
    }
    
    // Ordenar por hora (mais recente primeiro)
    todaySalesList.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Criar itens (mostrar apenas as 5 mais recentes)
    todaySalesList.slice(0, 5).forEach(sale => {
        const now = new Date(sale.date);
        const timeString = now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const saleItem = document.createElement('div');
        saleItem.className = 'sale-item';
        saleItem.innerHTML = `
            <div class="sale-item-info">
                <span class="sale-time">${timeString}</span>
                <span class="sale-items-count">${sale.items.length} item(s)</span>
            </div>
            <div class="sale-item-total">
                ${sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
        `;
        
        todaySales.appendChild(saleItem);
    });
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

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fechar modal ao clicar fora
document.getElementById('receiptModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeReceiptModal();
    }
});

// ========== FUNÇÕES DE DESCONTO ==========

// Alternar campo de entrada de desconto
function toggleDiscountInput() {
    const discountType = document.getElementById('discountType').value;
    const discountValue = document.getElementById('discountValue');
    
    if (discountType === 'none') {
        discountValue.style.display = 'none';
        discountValue.value = '';
        currentDiscount = 0;
    } else {
        discountValue.style.display = 'inline-block';
        discountValue.value = '';
        discountValue.placeholder = discountType === 'percent' ? '0-100' : '0.00';
        discountValue.focus();
    }
    
    updateCartTotal();
}

// Aplicar desconto
function applyDiscount() {
    const discountType = document.getElementById('discountType').value;
    const discountValueInput = document.getElementById('discountValue').value;
    const discountValue = parseFloat(discountValueInput);
    
    // Verificar se o carrinho está vazio
    if (cart.length === 0) {
        showAlert('Adicione produtos ao carrinho primeiro', 'error');
        return;
    }
    
    // Verificar se o tipo de desconto é 'none'
    if (discountType === 'none') {
        currentDiscount = 0;
        document.getElementById('discountInfo').style.display = 'none';
        showAlert('Nenhum desconto selecionado', 'error');
        return;
    }
    
    // Verificar se o valor de desconto está vazio ou é inválido
    if (!discountValueInput || isNaN(discountValue) || discountValue < 0) {
        showAlert('Digite um valor de desconto válido', 'error');
        return;
    }
    
    // Calcular total atual do carrinho
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    if (discountType === 'percent') {
        if (discountValue > 100) {
            showAlert('Porcentagem não pode exceder 100%', 'error');
            return;
        }
        currentDiscount = (subtotal * discountValue) / 100;
    } else {
        if (discountValue > subtotal) {
            showAlert('Desconto não pode exceder o total', 'error');
            return;
        }
        currentDiscount = discountValue;
    }
    
    // Mostrar informações do desconto
    const discountInfo = document.getElementById('discountInfo');
    const discountAmount = document.getElementById('discountAmount');
    
    if (currentDiscount > 0) {
        discountInfo.style.display = 'flex';
        discountAmount.textContent = '- ' + currentDiscount.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    } else {
        discountInfo.style.display = 'none';
    }
    
    updateCartTotal();
    showAlert('Desconto aplicado!', 'success');
}

// Remover desconto
function removeDiscount() {
    document.getElementById('discountType').value = 'none';
    document.getElementById('discountValue').value = '';
    document.getElementById('discountValue').style.display = 'none';
    document.getElementById('discountInfo').style.display = 'none';
    currentDiscount = 0;
    discountType = 'none';
    updateCartTotal();
}

// Atualizar total do carrinho com desconto
function updateCartTotal() {
    const cartTotal = document.getElementById('cartTotal');
    
    // Calcular subtotal
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    // Aplicar desconto
    const total = Math.max(0, subtotal - currentDiscount);
    
    cartTotal.textContent = total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Calcular total com desconto (para uso na finalização)
function getCartTotalWithDiscount() {
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    return Math.max(0, subtotal - currentDiscount);
}
