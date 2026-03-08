// Sistema de PDV - Ponto de Venda - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

// Variáveis globais
let products = [];
let cart = [];
let sales = [];
let currentDiscount = 0;
let discountType = 'none';

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    displayUserName();
    setupMenuByRole();
    loadProducts();
    loadSales();
    setupEventListeners();
    renderTodaySales();
});

// Configurar event listeners
function setupEventListeners() {
    // Campo de busca
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', searchProducts);
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

// Carregar vendas do localStorage
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

// Buscar produtos
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product => {
        const nome = product.nome || '';
        const categoria = product.categoria || '';
        return nome.toLowerCase().includes(searchTerm) || 
               categoria.toLowerCase().includes(searchTerm);
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
    
    // Atualizar total
    cartTotal.textContent = total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
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

// Finalizar venda
async function finalizeSale() {
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
    
    // Calcular total (com desconto)
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const total = Math.max(0, subtotal - currentDiscount);
    
    // Obter dados do usuário
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    const user = currentUser ? JSON.parse(currentUser) : { username: 'Operador' };
    
    // Criar registro de venda
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
        total: total
    };
    
    try {
        // Atualizar estoque de cada produto na API
        for (const item of cart) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const newStock = product.quantidadeEstoque - item.quantity;
                
                const response = await fetch(`http://localhost:8080/api/produtos/${item.productId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({
                        nome: product.nome,
                        descricao: product.descricao,
                        preco: product.preco,
                        categoria: product.categoria,
                        quantidadeEstoque: newStock
                    })
                });
                
                if (!response.ok) {
                    console.error('Erro ao atualizar estoque do produto:', product.nome);
                }
            }
        }
        
        showAlert('Estoque atualizado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        showAlert('Erro ao atualizar estoque. A venda foi registrada localmente.', 'error');
    }
    
    // Adicionar venda ao histórico
    sales.push(sale);
    saveSales();
    
    // Mostrar comprovante
    showReceipt(sale);
    
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
            <div class="receipt-total-final"><strong>TOTAL:</strong> ${sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        `;
    } else {
        receiptTotal.innerHTML = `<strong>TOTAL:</strong> ${sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    }
    
    // Mostrar modal
    document.getElementById('receiptModal').classList.add('show');
}

// Fechar modal do comprovante
function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('show');
}

// Imprimir comprovante
function printReceipt() {
    window.print();
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
    const discountValue = parseFloat(document.getElementById('discountValue').value);
    
    if (discountType === 'none') {
        currentDiscount = 0;
    } else if (isNaN(discountValue) || discountValue < 0) {
        showAlert('Valor de desconto inválido', 'error');
        return;
    } else {
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

