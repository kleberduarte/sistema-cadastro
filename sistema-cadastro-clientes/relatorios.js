
// Sistema de Relatórios de Vendas
// Autor: Sistema de Cadastro
// Data: 2024

let sales = [];
let filteredSales = [];

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    displayUserName();
    loadSales();
    initializeFilters();
    applyFilter();
});

// Carregar vendas da API
async function loadSales() {
    try {
        const response = await fetch('http://localhost:8080/api/vendas', {
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
            console.log('Vendas carregadas da API:', sales);
        } else {
            console.error('Erro ao carregar vendas da API');
            // Fallback para localStorage
            const storedSales = localStorage.getItem('sales');
            if (storedSales) {
                sales = JSON.parse(storedSales);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        // Fallback para localStorage
        const storedSales = localStorage.getItem('sales');
        if (storedSales) {
            sales = JSON.parse(storedSales);
        }
    }
}

// Inicializar filtros
function initializeFilters() {
    // Preencher anos disponíveis
    const yearSelect = document.getElementById('filterYear');
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Configurar data de hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterDay').value = today;
    document.getElementById('filterMonth').value = today.substring(0, 7);
}

// Alternar campos de filtro
function toggleFilterFields() {
    const filterType = document.getElementById('filterType').value;
    
    document.getElementById('dayFilter').style.display = filterType === 'day' ? 'block' : 'none';
    document.getElementById('monthFilter').style.display = filterType === 'month' ? 'block' : 'none';
    document.getElementById('yearFilter').style.display = filterType === 'year' ? 'block' : 'none';
    document.getElementById('startDateFilter').style.display = filterType === 'period' ? 'block' : 'none';
    document.getElementById('endDateFilter').style.display = filterType === 'period' ? 'block' : 'none';
}

// Aplicar filtro
function applyFilter() {
    const filterType = document.getElementById('filterType').value;
    
    let startDate, endDate;
    let title = '';
    
    switch (filterType) {
        case 'today':
            // Usar datas no formato YYYY-MM-DD para evitar problemas de fuso horário
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            
            startDate = new Date(todayStr + 'T00:00:00');
            endDate = new Date(todayStr + 'T23:59:59.999');
            title = '(Hoje)';
            break;
            
        case 'day':
            const dayInput = document.getElementById('filterDay').value;
            if (!dayInput) {
                showAlert('Selecione uma data', 'error');
                return;
            }
            // Usar formato YYYY-MM-DD local para evitar problema com UTC
            const dayParts = dayInput.split('-');
            const dayYear = parseInt(dayParts[0]);
            const dayMonth = parseInt(dayParts[1]) - 1;
            const dayDay = parseInt(dayParts[2]);
            startDate = new Date(dayYear, dayMonth, dayDay, 0, 0, 0, 0);
            endDate = new Date(dayYear, dayMonth, dayDay, 23, 59, 59, 999);
            title = '(' + formatDateBR(dayInput) + ')';
            break;
            
        case 'month':
            const monthInput = document.getElementById('filterMonth').value;
            if (!monthInput) {
                showAlert('Selecione um mês', 'error');
                return;
            }
            const [filterYear, filterMonth] = monthInput.split('-');
            startDate = new Date(filterYear, filterMonth - 1, 1);
            endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            title = '(' + monthNames[parseInt(filterMonth) - 1] + ' de ' + filterYear + ')';
            break;
            
        case 'year':
            const yearInput = document.getElementById('filterYear').value;
            if (!yearInput) {
                showAlert('Selecione um ano', 'error');
                return;
            }
            startDate = new Date(yearInput, 0, 1);
            endDate = new Date(yearInput, 11, 31, 23, 59, 59, 999);
            title = '(Ano: ' + yearInput + ')';
            break;
            
        case 'period':
            const startDateInput = document.getElementById('startDate').value;
            const endDateInput = document.getElementById('endDate').value;
            
            if (!startDateInput || !endDateInput) {
                showAlert('Selecione as datas corretamente', 'error');
                return;
            }
            
            // Usar fuso horário local para evitar problema com UTC
            startDate = new Date(startDateInput + 'T00:00:00');
            endDate = new Date(endDateInput + 'T23:59:59.999');
            
            if (startDate > endDate) {
                showAlert('Data inicial não pode ser maior que a final', 'error');
                return;
            }
            
            title = '(' + formatDateBR(startDateInput) + ' a ' + formatDateBR(endDateInput) + ')';
            break;
    }
    
    // Filtrar vendas - comparar apenas a data (ignorando horário e fuso horário)
    filteredSales = sales.filter(sale => {
        // Converter a data da venda para data local usando o construtor Date
        const saleDateStr = sale.date.split('T')[0];
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        return saleDateStr >= startDateStr && saleDateStr <= endDateStr;
    });
    
    // Ordenar por data (mais recente primeiro)
    filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Atualizar título
    document.getElementById('reportTitle').textContent = title;
    
    // Renderizar dados
    renderSummary();
    renderSalesList();
    renderTopProducts();
}

// Limpar filtros
function clearFilter() {
    document.getElementById('filterType').value = 'today';
    document.getElementById('filterDay').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterYear').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    toggleFilterFields();
    applyFilter();
}

// Renderizar resumo
function renderSummary() {
    let totalSales = 0;
    let itemsCount = 0;
    
    filteredSales.forEach(sale => {
        totalSales += sale.total;
        sale.items.forEach(item => {
            itemsCount += item.quantity;
        });
    });
    
    const salesCount = filteredSales.length;
    const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;
    
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('salesCount').textContent = salesCount;
    document.getElementById('itemsCount').textContent = itemsCount;
    document.getElementById('averageTicket').textContent = formatCurrency(averageTicket);
}

// Renderizar lista de vendas
function renderSalesList() {
    const salesList = document.getElementById('salesList');
    const noSalesMessage = document.getElementById('noSalesMessage');
    
    salesList.innerHTML = '';
    
    if (filteredSales.length === 0) {
        noSalesMessage.style.display = 'block';
        return;
    }
    
    noSalesMessage.style.display = 'none';
    
    filteredSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${saleDate.toLocaleDateString('pt-BR')} ${saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${escapeHtml(sale.operator)}</td>
            <td>${sale.items.length} item(s)</td>
            <td>${formatCurrency(sale.total)}</td>
            <td>
                <button class="btn btn-edit btn-small" onclick="viewSaleDetails(${sale.id})">
                    👁️ Ver
                </button>
            </td>
        `;
        salesList.appendChild(row);
    });
}

// Renderizar top produtos
function renderTopProducts() {
    const topProductsList = document.getElementById('topProductsList');
    const noProductsMessage = document.getElementById('noProductsMessage');
    
    // Contar produtos vendidos
    const productStats = {};
    
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            if (productStats[item.name]) {
                productStats[item.name].quantity += item.quantity;
                productStats[item.name].total += item.subtotal;
            } else {
                productStats[item.name] = {
                    name: item.name,
                    quantity: item.quantity,
                    total: item.subtotal
                };
            }
        });
    });
    
    // Converter para array e ordenar
    const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity);
    
    topProductsList.innerHTML = '';
    
    if (topProducts.length === 0) {
        noProductsMessage.style.display = 'block';
        return;
    }
    
    noProductsMessage.style.display = 'none';
    
    topProducts.slice(0, 10).forEach((product, index) => {
        const row = document.createElement('tr');
        
        let medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        
        row.innerHTML = `
            <td>${medal || (index + 1) + 'º'}</td>
            <td>${escapeHtml(product.name)}</td>
            <td>${product.quantity}</td>
            <td>${formatCurrency(product.total)}</td>
        `;
        topProductsList.appendChild(row);
    });
}

// Ver detalhes da venda
function viewSaleDetails(saleId) {
    const sale = filteredSales.find(s => s.id === saleId);
    
    if (!sale) {
        showAlert('Venda não encontrada', 'error');
        return;
    }
    
    const saleDate = new Date(sale.date);
    
    document.getElementById('detailDate').textContent = saleDate.toLocaleDateString('pt-BR');
    document.getElementById('detailTime').textContent = saleDate.toLocaleTimeString('pt-BR');
    document.getElementById('detailOperator').textContent = sale.operator;
    
    const detailItems = document.getElementById('detailItems');
    detailItems.innerHTML = '';
    
    sale.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.subtotal)}</td>
        `;
        detailItems.appendChild(row);
    });
    
    document.getElementById('detailTotal').textContent = formatCurrency(sale.total);
    
    document.getElementById('saleDetailModal').classList.add('show');
}

// Fechar modal de detalhes
function closeSaleDetailModal() {
    document.getElementById('saleDetailModal').classList.remove('show');
}

// Imprimir detalhes da venda
function printSaleDetails() {
    window.print();
}

// Funções utilitárias
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatDateBR(dateString) {
    // Usar fuso horário local para evitar problema com UTC
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(message, type) {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const main = document.querySelector('main');
    main.insertBefore(alert, main.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// Fechar modal ao clicar fora
document.getElementById('saleDetailModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeSaleDetailModal();
    }
});

// Exportar para CSV
function exportToCSV() {
    if (filteredSales.length === 0) {
        showAlert('Nenhuma venda para exportar', 'error');
        return;
    }
    
    // Obter título do relatório para o nome do arquivo
    const reportTitle = document.getElementById('reportTitle').textContent.replace(/[()]/g, '').trim();
    const date = new Date().toISOString().split('T')[0];
    
    // Criar conteúdo CSV
    let csvContent = '\uFEFF'; // BOM para UTF-8
    
    // Cabeçalho
    csvContent += 'Data/Hora;Operador;Itens;Total\n';
    
    // Linhas de vendas
    filteredSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const dateStr = saleDate.toLocaleString('pt-BR');
        const itemsStr = sale.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
        
        // Escapar ponto e vírgula nos valores
        const escapedItems = itemsStr.replace(/;/g, ',');
        
        csvContent += `${dateStr};${sale.operator};${escapedItems};${sale.total.toFixed(2).replace('.', ',')}\n`;
    });
    
    // Adicionar total geral
    let totalGeral = 0;
    filteredSales.forEach(sale => totalGeral += sale.total);
    csvContent += `\nTotal Geral;;;${totalGeral.toFixed(2).replace('.', ',')}\n`;
    
    // Criar blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, `relatorio_vendas_${date}.csv`);
    } else {
        // Outros navegadores
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_vendas_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showAlert('Relatório exportado com sucesso!', 'success');
}

