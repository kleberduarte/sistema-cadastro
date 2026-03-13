// Sistema de Cadastro de Produtos - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

// Array para armazenar os produtos
let products = [];
let productIdToDelete = null;
let editingProductId = null;
let isProductCodeDuplicate = false;

// Carregar produtos ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkPermission('adm')) return;
    displayUserName();
    loadProducts();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Formulário de cadastro
    const form = document.getElementById('productForm');
    form.addEventListener('submit', handleSubmit);
    
    // Campo leitor de código de barras (scanner / teclado)
    const barcodeInputProduct = document.getElementById('barcodeInputProduct');
    if (barcodeInputProduct) {
        barcodeInputProduct.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleProductBarcodeFill();
            }
        });
    }
    
    // Validação imediata do código digitado manualmente
    const productCodeInput = document.getElementById('productCode');
    if (productCodeInput) {
        productCodeInput.addEventListener('blur', async function() {
            await validateProductCodeUniqueness(this.value);
        });
    }

    // Campo de busca
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', searchProducts);
    
    // Botão de busca
    const searchBtn = document.getElementById('searchBtn');
    searchBtn.addEventListener('click', searchProducts);
    
    // Máscara para preço (formato monetário brasileiro)
    const priceInput = document.getElementById('price');
    priceInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            // Converter para centavos
            value = parseInt(value) / 100;
            // Formatar como moeda brasileira
            value = value.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        e.target.value = value;
    });
    
    // Validar quantidade mínima
    const quantityInput = document.getElementById('quantity');
    quantityInput.addEventListener('input', function(e) {
        if (e.target.value < 0) {
            e.target.value = 0;
        }
    });
}

// Normalizar código de barras (remove espaços/hífens)
function normalizeBarcode(value) {
    return String(value || '').replace(/\s+/g, '').replace(/-/g, '').trim();
}

// Preencher campo de código do produto a partir da leitura
async function fillProductCodeFromBarcode(codigoLido) {
    const codigo = normalizeBarcode(codigoLido);
    if (!codigo) {
        showAlert('Informe um código de barras válido', 'error');
        return;
    }

    const productCodeInput = document.getElementById('productCode');
    productCodeInput.value = codigo;
    productCodeInput.focus();

    const isValid = await validateProductCodeUniqueness(codigo);
    if (!isValid) {
        productCodeInput.value = '';
        productCodeInput.focus();
        return;
    }

    showAlert('Código de barras preenchido no campo de código do produto', 'success');
}

// Handler acionado por Enter ou botão
async function handleProductBarcodeFill() {
    const barcodeInputProduct = document.getElementById('barcodeInputProduct');
    if (!barcodeInputProduct) return;

    await fillProductCodeFromBarcode(barcodeInputProduct.value);
    barcodeInputProduct.value = '';
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
            console.log('Produtos carregados:', products);
        } else {
            console.error('Erro ao carregar produtos');
            showAlert('Erro ao carregar produtos', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showAlert('Erro de conexão', 'error');
    }
    renderProducts();
}

// Validar código duplicado localmente e no backend
async function validateProductCodeUniqueness(codigoInformado) {
    const codigo = normalizeBarcode(codigoInformado);
    const productCodeInput = document.getElementById('productCode');
    const productCodeError = document.getElementById('productCodeError');

    // limpar estado anterior
    isProductCodeDuplicate = false;
    if (productCodeInput) productCodeInput.classList.remove('error');
    if (productCodeError) productCodeError.textContent = '';

    if (!codigo) return true;

    // 1) validação local (rápida)
    const duplicateLocal = products.find(p =>
        normalizeBarcode(p.codigoProduto) === codigo &&
        (!editingProductId || p.id !== editingProductId)
    );

    if (duplicateLocal) {
        isProductCodeDuplicate = true;
        if (productCodeInput) productCodeInput.classList.add('error');
        if (productCodeError) productCodeError.textContent = `Código já cadastrado para: ${duplicateLocal.nome}`;
        showAlert(`Código já cadastrado para o produto "${duplicateLocal.nome}"`, 'error');
        return false;
    }

    // 2) validação backend (fonte da verdade)
    try {
        const response = await fetch(`http://localhost:8080/api/produtos/codigo/${encodeURIComponent(codigo)}`, {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });

        if (response.ok) {
            const produtoEncontrado = await response.json();
            if (!editingProductId || produtoEncontrado.id !== editingProductId) {
                isProductCodeDuplicate = true;
                if (productCodeInput) productCodeInput.classList.add('error');
                if (productCodeError) productCodeError.textContent = `Código já cadastrado para: ${produtoEncontrado.nome}`;
                showAlert(`Código já cadastrado para o produto "${produtoEncontrado.nome}"`, 'error');
                return false;
            }
        }
    } catch (error) {
        console.warn('Não foi possível validar código no backend neste momento:', error);
    }

    return true;
}

// Validar formulário
function validateForm(formData) {
    const errors = {};
    
    // Validar nome (simples)
    if (!formData.nome || formData.nome.trim().length < 3) {
        errors.name = 'Nome do produto deve ter pelo menos 3 caracteres';
    }
    
    // Validar descrição (simples)
    if (!formData.descricao || formData.descricao.trim().length < 3) {
        errors.description = 'Descrição deve ter pelo menos 3 caracteres';
    }
    
    // Validar preço
    if (!formData.preco || formData.preco <= 0) {
        errors.price = 'Preço deve ser maior que zero';
    }
    
    // Validar quantidade
    if (formData.quantidadeEstoque < 0) {
        errors.quantity = 'Quantidade não pode ser negativa';
    }
    
    // Validar categoria (simples)
    if (!formData.categoria || formData.categoria === '') {
        errors.category = 'Selecione uma categoria';
    }
    
    // Validar tipo
    if (!formData.tipo || formData.tipo === '') {
        errors.tipo = 'Selecione o tipo';
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
    const inputs = document.querySelectorAll('.form-group input, .form-group textarea, .form-group select');
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
    const priceInput = document.getElementById('price').value;
    
    // Parse Brazilian price format (1.250,50 -> 1250.50)
    let priceValue = priceInput.replace(/\./g, '').replace(',', '.');
    priceValue = parseFloat(priceValue);
    
    const formData = {
        nome: document.getElementById('name').value.trim(),
        descricao: document.getElementById('description').value.trim(),
        preco: isNaN(priceValue) ? 0 : priceValue,
        quantidadeEstoque: parseInt(document.getElementById('quantity').value) || 0,
        categoria: document.getElementById('category').value,
        codigoProduto: document.getElementById('productCode').value.trim(),
        tipo: document.getElementById('tipo').value
    };
    
    // Revalidar unicidade do código (digitado manualmente ou por leitor)
    const codeIsUnique = await validateProductCodeUniqueness(formData.codigoProduto);
    if (!codeIsUnique || isProductCodeDuplicate) {
        return;
    }

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
        if (editingProductId) {
            // Atualizar produto existente
            const response = await fetch(`http://localhost:8080/api/produtos/${editingProductId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                await loadProducts();
                cancelEdit();
                showAlert('Produto atualizado com sucesso!', 'success');
            } else {
                const errorData = await response.json();
                showAlert(errorData.message || 'Erro ao atualizar produto', 'error');
            }
        } else {
            // Criar novo produto
            const response = await fetch('http://localhost:8080/api/produtos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                await loadProducts();
                form.reset();
                showAlert('Produto cadastrado com sucesso!', 'success');
            } else {
                const errorData = await response.json();
                showAlert(errorData.message || 'Erro ao cadastrar produto', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showAlert('Erro de conexão', 'error');
    }
}

// Renderizar lista de produtos
function renderProducts(productList = products) {
    const productListElement = document.getElementById('productList');
    const noProductsMessage = document.getElementById('noProductsMessage');
    const productCount = document.getElementById('productCount');
    
    // Atualizar contador
    productCount.textContent = `(${productList.length})`;
    
    // Limpar lista
    productListElement.innerHTML = '';
    
    if (productList.length === 0) {
        noProductsMessage.style.display = 'block';
        return;
    }
    
    noProductsMessage.style.display = 'none';
    
    // Criar linhas da tabela
    productList.forEach(product => {
        const row = document.createElement('tr');
        
        // Formatar preço
        const formattedPrice = parseFloat(product.preco).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        // Verificar estoque baixo
        const stockClass = product.quantidadeEstoque <= 5 ? 'low-stock' : '';
        const stockIcon = product.quantidadeEstoque <= 5 ? '⚠️ ' : '';
        
        row.innerHTML = `
            <td>${escapeHtml(product.nome)}</td>
            <td>${escapeHtml(product.codigoProduto || '-')}</td>
            <td>${escapeHtml((product.descricao || '').substring(0, 50))}${(product.descricao || '').length > 50 ? '...' : ''}</td>
            <td>${formattedPrice}</td>
            <td class="${stockClass}">${stockIcon}${product.quantidadeEstoque}</td>
            <td>${escapeHtml(product.categoria || 'Sem categoria')}</td>
            <td>
                <button class="btn btn-edit btn-small" onclick="editProduct(${product.id})">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteProduct(${product.id})">
                    🗑️ Excluir
                </button>
            </td>
        `;
        productListElement.appendChild(row);
    });
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        const descricao = product.descricao || '';
        const categoria = product.categoria || '';
        const codigoProduto = product.codigoProduto || '';
        return nome.toLowerCase().includes(searchTerm) ||
               descricao.toLowerCase().includes(searchTerm) ||
               categoria.toLowerCase().includes(searchTerm) ||
               codigoProduto.toLowerCase().includes(searchTerm);
    });
    
    renderProducts(filteredProducts);
}

// Excluir produto
function deleteProduct(id) {
    const product = products.find(p => p.id === id);
    
    if (product) {
        productIdToDelete = id;
        document.getElementById('productToDelete').textContent = product.nome;
        document.getElementById('confirmModal').classList.add('show');
    }
}

// Confirmar exclusão
async function confirmDelete() {
    if (productIdToDelete) {
        try {
            const response = await fetch(`http://localhost:8080/api/produtos/${productIdToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + getToken()
                }
            });
            
            if (response.ok) {
                products = products.filter(p => p.id !== productIdToDelete);
                renderProducts();
                closeModal();
                showAlert('Produto excluído com sucesso!', 'success');
            } else {
                showAlert('Erro ao excluir produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            showAlert('Erro de conexão', 'error');
        }
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('confirmModal').classList.remove('show');
    productIdToDelete = null;
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

// Editar produto - carregar dados no formulário
function editProduct(id) {
    const product = products.find(p => p.id === id);
    
    if (product) {
        editingProductId = id;
        
        // Preencher formulário com dados do produto
        document.getElementById('name').value = product.nome;
        document.getElementById('description').value = product.descricao || '';
        document.getElementById('price').value = parseFloat(product.preco).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.getElementById('quantity').value = product.quantidadeEstoque;
        document.getElementById('category').value = product.categoria || '';
        document.getElementById('productCode').value = product.codigoProduto || '';
        document.getElementById('tipo').value = product.tipo || '';
        
        // Alterar modo do formulário
        document.getElementById('submitBtn').textContent = '💾 Salvar Alterações';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        
        // Atualizar título do formulário
        document.querySelector('.form-section h2').textContent = '✏️ Editar Produto';
        
        // Rolar até o formulário
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// Cancelar edição
function cancelEdit() {
    editingProductId = null;
    
    // Limpar formulário
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    
    // Restaurar modo do formulário
    document.getElementById('submitBtn').textContent = '💾 Cadastrar Produto';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Restaurar título do formulário
    document.querySelector('.form-section h2').textContent = '📝 Novo Produto';
    
    // Limpar erros
    clearErrors();
}

// Resetar formulário
function resetForm() {
    if (editingProductId) {
        cancelEdit();
    }
}

