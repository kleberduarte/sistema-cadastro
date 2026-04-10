// Sistema de Cadastro de Produtos - Integração com Backend REST API
// Autor: Sistema de Cadastro
// Data: 2024

// Array para armazenar os produtos
let products = [];
let productIdToDelete = null;
let editingProductId = null;
let isProductCodeDuplicate = false;
let importPreviewPayload = null;
let currentPage = 0;
const pageSize = 25;
let totalPages = 0;
let totalElements = 0;
let currentSearchTerm = '';
let bulkDeletePending = false;

// Carregar produtos ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    if (!checkPermission('adm')) return;
    displayUserName();
    atualizarVisibilidadeBlocoFarmaciaProdutos();
    window.addEventListener('focus', atualizarVisibilidadeBlocoFarmaciaProdutos);
    loadProducts(0);
    setupEventListeners();
    updatePromoToggleVisual();
});

function updatePromoToggleVisual() {
    var card = document.querySelector('.promo-toggle-card');
    var checkbox = document.getElementById('promoEnabled');
    if (!card || !checkbox) return;
    if (checkbox.checked) card.classList.add('is-active');
    else card.classList.remove('is-active');
}

function readEmpresaParamsFromStorage() {
    try {
        var raw = localStorage.getItem('empresaParams') || localStorage.getItem('clientParams');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

/** Bloco Farmácia / PMC no formulário de produto só para empresas com módulo farmácia ativo (Parâmetros). */
function empresaTemModuloFarmacia() {
    var p = readEmpresaParamsFromStorage();
    return !!(p && p.moduloFarmaciaAtivo);
}

function atualizarVisibilidadeBlocoFarmaciaProdutos() {
    var card = document.getElementById('productFormFarmaciaCard');
    if (!card) return;
    if (empresaTemModuloFarmacia()) {
        card.removeAttribute('hidden');
    } else {
        card.setAttribute('hidden', 'hidden');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Remove dica antiga de importação (compatibilidade com HTML/cache legado)
    (function removeLegacyImportHint() {
        var wrap = document.getElementById('importCsvFile');
        if (!wrap || !wrap.parentElement) return;
        var hints = wrap.parentElement.querySelectorAll('small');
        hints.forEach(function (el) {
            var txt = (el.textContent || '').toLowerCase();
            if (txt.indexOf('colunas mínimas') >= 0 || txt.indexOf('arquivo de exemplo') >= 0) {
                el.remove();
            }
        });
    })();

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
    searchInput.addEventListener('input', function () {
        currentSearchTerm = (searchInput.value || '').trim();
        loadProducts(0);
    });
    
    // Botão de busca
    const searchBtn = document.getElementById('searchBtn');
    searchBtn.addEventListener('click', function () {
        currentSearchTerm = (searchInput.value || '').trim();
        loadProducts(0);
    });

    const prevBtn = document.getElementById('productsPrevPage');
    const nextBtn = document.getElementById('productsNextPage');
    const prevBtnTop = document.getElementById('productsPrevPageTop');
    const nextBtnTop = document.getElementById('productsNextPageTop');
    if (prevBtn) prevBtn.addEventListener('click', function () { if (currentPage > 0) loadProducts(currentPage - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (currentPage + 1 < totalPages) loadProducts(currentPage + 1); });
    if (prevBtnTop) prevBtnTop.addEventListener('click', function () { if (currentPage > 0) loadProducts(currentPage - 1); });
    if (nextBtnTop) nextBtnTop.addEventListener('click', function () { if (currentPage + 1 < totalPages) loadProducts(currentPage + 1); });

    const importPreviewBtn = document.getElementById('importPreviewBtn');
    if (importPreviewBtn) importPreviewBtn.addEventListener('click', handleImportPreview);
    const importConfirmBtn = document.getElementById('importConfirmBtn');
    if (importConfirmBtn) importConfirmBtn.addEventListener('click', handleImportConfirm);
    const deleteAllBtn = document.getElementById('deleteAllProductsBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllProducts);
    
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

    // Máscara para preço promocional (formato monetário brasileiro)
    const promoPriceInput = document.getElementById('promoPrice');
    if (promoPriceInput) {
        promoPriceInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 0) {
                value = parseInt(value) / 100;
                value = value.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }

            e.target.value = value;
        });
    }
    const pmcInput = document.getElementById('pmc');
    if (pmcInput) {
        pmcInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = parseInt(value, 10) / 100;
                value = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            e.target.value = value;
        });
    }
    
    // Validar quantidade mínima
    const quantityInput = document.getElementById('quantity');
    quantityInput.addEventListener('input', function(e) {
        if (e.target.value < 0) {
            e.target.value = 0;
        }
    });

    // Estado visual do toggle de promoção
    const promoEnabledInput = document.getElementById('promoEnabled');
    if (promoEnabledInput) {
        promoEnabledInput.addEventListener('change', updatePromoToggleVisual);
    }
}

function getApiBase() {
    return (typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function')
        ? window.getApiBaseUrl()
        : 'http://localhost:8080/api';
}

function normalizeCategoryValue(value) {
    return String(value || '').trim().toLowerCase();
}

async function syncCategoryOptions() {
    var categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    try {
        var response = await fetch(appendEmpresaIdToApiUrl(getApiBase() + '/produtos/categorias'), {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!response.ok) return;
        var categories = await response.json().catch(function () { return []; });
        if (!Array.isArray(categories)) return;

        var existingValues = new Set();
        Array.from(categorySelect.options).forEach(function (opt) {
            existingValues.add(normalizeCategoryValue(opt.value));
        });

        var selectedBefore = categorySelect.value;
        categories.forEach(function (cat) {
            var txt = String(cat || '').trim();
            if (!txt) return;
            var key = normalizeCategoryValue(txt);
            if (existingValues.has(key)) return;
            var option = document.createElement('option');
            option.value = txt;
            option.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
            categorySelect.appendChild(option);
            existingValues.add(key);
        });
        categorySelect.value = selectedBefore;
    } catch (e) {
        console.warn('Não foi possível sincronizar categorias:', e);
    }
}

function setImportLoading(loading) {
    var p = document.getElementById('importPreviewBtn');
    var c = document.getElementById('importConfirmBtn');
    if (p) p.disabled = !!loading;
    if (c) c.disabled = !!loading || !importPreviewPayload;
}

/** Extrai mensagem legível de respostas de erro JSON do Spring / API. */
function messageFromApiErrorBody(body) {
    if (body == null) return '';
    if (typeof body === 'string') return body;
    if (typeof body === 'object') {
        var m = body.message || body.detail || body.error;
        if (m != null && String(m).trim()) return String(m).trim();
    }
    return '';
}

var importConfirmCreepTimer = null;

/**
 * Nome e ID da empresa (tenant) para personalizar o modal de importação — alinhado ao localStorage / getClienteId.
 */
function getImportProgressEmpresaContext() {
    var empresaId = 1;
    try {
        if (typeof getClienteId === 'function') {
            var g = parseInt(getClienteId(), 10);
            if (!isNaN(g) && g >= 1) empresaId = g;
        } else {
            var raw = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || '1';
            var p = parseInt(raw, 10);
            if (!isNaN(p) && p >= 1) empresaId = p;
        }
    } catch (e) {}
    var nomeEmpresa = '';
    try {
        var stored = localStorage.getItem('empresaParams') || localStorage.getItem('clientParams');
        if (stored) {
            var par = JSON.parse(stored);
            if (par && par.nomeEmpresa != null) {
                nomeEmpresa = String(par.nomeEmpresa).trim();
            }
        }
    } catch (e2) {}
    return { empresaId: empresaId, nomeEmpresa: nomeEmpresa };
}

function applyImportProgressModalBranding() {
    var ctx = getImportProgressEmpresaContext();
    var titleEl = document.getElementById('importProgressTitle');
    var lineEl = document.getElementById('importProgressEmpresaLine');
    if (titleEl) {
        if (ctx.nomeEmpresa) {
            titleEl.textContent = '📥 Importando produtos — ' + ctx.nomeEmpresa;
        } else {
            titleEl.textContent = '📥 Importando produtos — Empresa ID ' + ctx.empresaId;
        }
    }
    if (lineEl) {
        if (ctx.nomeEmpresa) {
            lineEl.textContent = 'ID da empresa: ' + ctx.empresaId;
            lineEl.style.display = 'block';
        } else {
            lineEl.textContent = '';
            lineEl.style.display = 'none';
        }
    }
}

function stopImportConfirmCreep() {
    if (importConfirmCreepTimer) {
        clearInterval(importConfirmCreepTimer);
        importConfirmCreepTimer = null;
    }
}

function updateImportProgressUI(percent, statusText) {
    var fill = document.getElementById('importProgressFill');
    var label = document.getElementById('importProgressPercent');
    var statusEl = document.getElementById('importProgressStatus');
    var track = document.getElementById('importProgressTrack');
    var p = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
    if (fill) fill.style.width = p + '%';
    if (label) label.textContent = p + '%';
    if (track) {
        track.setAttribute('aria-valuenow', String(p));
    }
    if (statusEl && statusText != null) {
        statusEl.textContent = statusText;
    }
}

function showImportProgressModal(initialStatus) {
    var modal = document.getElementById('importProgressModal');
    if (!modal) return;
    stopImportConfirmCreep();
    applyImportProgressModalBranding();
    updateImportProgressUI(0, initialStatus || 'Enviando arquivo…');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function hideImportProgressModal() {
    var modal = document.getElementById('importProgressModal');
    if (!modal) return;
    stopImportConfirmCreep();
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}

/**
 * Envia o CSV de confirmação com barra de progresso: upload (parcialmente mensurável) + processamento no servidor (estimado).
 */
function postImportConfirmWithProgress(url, formData, onProgress) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        var lastUploadPct = 3;

        function startCreep(fromPct) {
            stopImportConfirmCreep();
            var cur = Math.max(fromPct, 35);
            importConfirmCreepTimer = setInterval(function () {
                if (cur < 94) {
                    cur += cur < 75 ? 1.8 : 0.45;
                    if (cur > 94) cur = 94;
                    onProgress(cur, 'Processando no servidor…');
                }
            }, 130);
        }

        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable && e.total > 0) {
                lastUploadPct = Math.max(3, Math.round(52 * e.loaded / e.total));
                onProgress(lastUploadPct, 'Enviando arquivo…');
            }
        });
        xhr.upload.addEventListener('load', function () {
            startCreep(lastUploadPct);
        });

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            stopImportConfirmCreep();
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(100, 'Concluindo importação…');
                try {
                    resolve(JSON.parse(xhr.responseText || '{}'));
                } catch (err) {
                    resolve({});
                }
            } else {
                try {
                    reject(JSON.parse(xhr.responseText || '{}'));
                } catch (err2) {
                    reject({ message: xhr.statusText || 'Falha ao confirmar importação.' });
                }
            }
        };
        xhr.onerror = function () {
            stopImportConfirmCreep();
            reject({ message: 'Erro de rede ao confirmar importação.' });
        };
        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + getToken());
        xhr.send(formData);
        onProgress(2, 'Conectando…');
    });
}

function renderImportSummary(payload, confirmed) {
    var box = document.getElementById('importSummary');
    if (!box) return;
    var text;
    if (confirmed) {
        text = 'Importação concluída — Criados: ' + (payload.criados || 0) +
            ', Atualizados: ' + (payload.atualizados || 0) +
            ', Erros: ' + (payload.erros || 0) + '.';
    } else {
        text = 'Prévia — Linhas: ' + (payload.totalLinhas || 0) +
            ', Válidas: ' + (payload.validas || 0) +
            ', Inválidas: ' + (payload.invalidas || 0) +
            ', Criar: ' + (payload.criar || 0) +
            ', Atualizar: ' + (payload.atualizar || 0) + '.';
    }
    box.textContent = text;
    box.style.display = 'block';
}

/**
 * @param {Array} items linhas da prévia / detalhes
 * @param {number} [maxRows=2] quantidade máxima de linhas na tabela
 * @param {{ skipTruncationNote?: boolean }} [opts]
 */
function renderImportTable(items, maxRows, opts) {
    var body = document.getElementById('importPreviewList');
    var wrap = document.getElementById('importTableWrap');
    var summary = document.getElementById('importSummary');
    if (!body || !wrap) return;
    opts = opts || {};
    body.innerHTML = '';
    if (!items || !items.length) {
        wrap.style.display = 'none';
        return;
    }
    var limit = typeof maxRows === 'number' && maxRows > 0 ? maxRows : 2;
    var visibleItems = items.slice(0, limit);
    wrap.style.display = 'block';
    visibleItems.forEach(function (it) {
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + escapeHtml(String(it.linha || '')) + '</td>' +
            '<td>' + escapeHtml(it.codigoProduto || '-') + '</td>' +
            '<td>' + escapeHtml(it.nome || '-') + '</td>' +
            '<td>' + escapeHtml(it.acao || '-') + '</td>' +
            '<td>' + escapeHtml(it.motivo || '-') + '</td>';
        body.appendChild(tr);
    });
    if (!opts.skipTruncationNote && items.length > limit && summary) {
        summary.textContent += ' Exibindo apenas ' + limit + ' itens para facilitar a visualização.';
    }
}

async function buildImportFormData() {
    var fileInput = document.getElementById('importCsvFile');
    var file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file) {
        showAlert('Selecione um arquivo CSV para importar.', 'info');
        return null;
    }
    var fd = new FormData();
    fd.append('file', file);
    return fd;
}

async function handleImportPreview() {
    var fd = await buildImportFormData();
    if (!fd) return;
    setImportLoading(true);
    try {
        var url = appendEmpresaIdToApiUrl(getApiBase() + '/produtos/importacao/preview');
        var resp = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + getToken() },
            body: fd
        });
        var data = await resp.json().catch(function () { return {}; });
        if (!resp.ok) {
            var prevErr = messageFromApiErrorBody(data) || 'Falha ao processar prévia do CSV.';
            showAlert(prevErr, 'error');
            return;
        }
        importPreviewPayload = data;
        renderImportSummary(data, false);
        renderImportTable(data.itens || []);
        var c = document.getElementById('importConfirmBtn');
        if (c) c.disabled = false;
        showAlert('Pré-visualização gerada com sucesso.', 'success');
    } catch (e) {
        console.error(e);
        showAlert('Erro de conexão ao gerar pré-visualização.', 'error');
    } finally {
        setImportLoading(false);
    }
}

async function handleImportConfirm() {
    var fd = await buildImportFormData();
    if (!fd) return;
    if (!importPreviewPayload) {
        showAlert('Execute a pré-visualização antes de confirmar.', 'info');
        return;
    }
    setImportLoading(true);
    showImportProgressModal('Iniciando…');
    try {
        var url = appendEmpresaIdToApiUrl(getApiBase() + '/produtos/importacao/confirmar');
        var data = await postImportConfirmWithProgress(url, fd, function (pct, msg) {
            updateImportProgressUI(pct, msg);
        });
        renderImportSummary(data, true);
        importPreviewPayload = null;
        var c = document.getElementById('importConfirmBtn');
        if (c) c.disabled = true;
        var erros = data.erros || 0;
        var invalidRows = (data.detalhes || []).filter(function (it) {
            return String(it.acao || '').toUpperCase() === 'INVALID';
        });
        var s = document.getElementById('importSummary');
        if (erros > 0) {
            renderImportTable(invalidRows, 12, { skipTruncationNote: false });
            if (s) s.style.display = 'block';
        } else {
            renderImportTable([]);
            if (s) s.style.display = 'none';
        }
        updateImportProgressUI(100, 'Atualizando lista de produtos…');
        await refreshProductsAfterImport();
        if (erros > 0) {
            var amostra = invalidRows.slice(0, 5).map(function (x) {
                return 'Linha ' + x.linha + ': ' + (x.motivo || '—');
            }).join(' ');
            showAlert(
                'Importação concluída com ' + erros + ' linha(s) com problema. ' + (amostra ? amostra : ''),
                'warning'
            );
        } else {
            showAlert('Importação finalizada com sucesso.', 'success');
        }
    } catch (err) {
        console.error(err);
        var msg = messageFromApiErrorBody(err);
        if (!msg && err && err.message) msg = String(err.message);
        if (!msg) msg = 'Falha ao confirmar importação.';
        showAlert(msg, 'error');
    } finally {
        hideImportProgressModal();
        setImportLoading(false);
    }
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
function updatePaginationControls() {
    var wrap = document.getElementById('productsPagination');
    var wrapTop = document.getElementById('productsPaginationTop');
    var info = document.getElementById('productsPageInfo');
    var infoTop = document.getElementById('productsPageInfoTop');
    var prev = document.getElementById('productsPrevPage');
    var next = document.getElementById('productsNextPage');
    var prevTop = document.getElementById('productsPrevPageTop');
    var nextTop = document.getElementById('productsNextPageTop');
    if (!wrap || !info || !prev || !next) return;
    wrap.style.display = 'flex';
    if (wrapTop) wrapTop.style.display = 'flex';
    var pages = totalPages > 0 ? totalPages : 1;
    info.textContent = 'Página ' + (currentPage + 1) + ' de ' + pages;
    if (infoTop) infoTop.textContent = info.textContent;
    prev.disabled = currentPage <= 0;
    next.disabled = currentPage + 1 >= pages;
    if (prevTop) prevTop.disabled = prev.disabled;
    if (nextTop) nextTop.disabled = next.disabled;
}

async function refreshProductsAfterImport() {
    currentSearchTerm = '';
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    await loadProducts(0);
    await syncCategoryOptions();
    var listSection = document.querySelector('.list-section');
    if (listSection) {
        listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function refreshProductsListAndHighlight() {
    await refreshProductsAfterImport();
}

async function loadProducts(page) {
    if (typeof page !== 'number' || page < 0) page = 0;
    try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('size', String(pageSize));
        if (currentSearchTerm) params.set('q', currentSearchTerm);
        const base = getApiBase() + '/produtos/paginado?' + params.toString();
        const response = await fetch(appendEmpresaIdToApiUrl(base), {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            const payload = await response.json();
            products = payload.content || [];
            currentPage = payload.number || 0;
            totalPages = payload.totalPages || 0;
            totalElements = payload.totalElements || 0;
            console.log('Produtos carregados (paginado):', products.length, 'pagina', currentPage + 1, '/', totalPages);
        } else {
            console.error('Erro ao carregar produtos');
            showAlert('Erro ao carregar produtos', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showAlert('Erro de conexão', 'error');
    }
    renderProducts();
    updatePaginationControls();
    await syncCategoryOptions();
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
        const response = await fetch(appendEmpresaIdToApiUrl((typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api') + `/produtos/codigo/${encodeURIComponent(codigo)}`), {
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

function parseIsoDateToLocalMidnight(dateValue) {
    if (!dateValue) return null;
    var s = String(dateValue).trim();
    if (!s) return null;
    if (s.includes('T')) s = s.split('T')[0];
    if (s.includes(' ')) s = s.split(' ')[0];
    var d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

function isPromocaoAtiva(product) {
    if (!product) return false;

    var precoPromo = product.precoPromocional != null ? Number(product.precoPromocional) : null;
    if (precoPromo == null || isNaN(precoPromo) || precoPromo <= 0) return false;

    if (product.emPromocao === true) return true;

    var ini = parseIsoDateToLocalMidnight(product.promocaoInicio);
    var fim = parseIsoDateToLocalMidnight(product.promocaoFim);
    if (!ini && !fim) return false;

    var now = new Date();
    now.setHours(0, 0, 0, 0);

    if (ini && now < ini) return false;
    if (fim && now > fim) return false;
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

    // Validar promoção (campos opcionais)
    const promoEnabled = !!formData.emPromocao;
    const promoPrice = formData.precoPromocional;
    const promoStart = formData.promocaoInicio;
    const promoEnd = formData.promocaoFim;

    if (promoEnabled) {
        if (promoPrice == null || promoPrice <= 0) {
            errors.promoPrice = 'Informe o preço promocional quando "Em promoção" estiver ligado';
        }
    }

    if (promoPrice != null && promoPrice <= 0) {
        errors.promoPrice = 'Preço promocional deve ser maior que zero';
    }

    if ((promoStart || promoEnd) && (promoPrice == null || promoPrice <= 0)) {
        errors.promoPrice = 'Informe o preço promocional quando usar datas de promoção';
    }

    if (promoStart && promoEnd && promoStart > promoEnd) {
        errors.promoEnd = 'A data de fim deve ser igual ou posterior à data de início';
    }

    // Validar promo por quantidade (opcional)
    const qtdLevar = formData.promoQtdLevar;
    const qtdPagar = formData.promoQtdPagar;
    if (qtdLevar != null || qtdPagar != null) {
        if (qtdLevar == null || qtdPagar == null) {
            errors.promoQtdLevar = 'Informe "Levar" e "Pagar" juntos';
            errors.promoQtdPagar = 'Informe "Levar" e "Pagar" juntos';
        } else if (qtdPagar >= qtdLevar) {
            errors.promoQtdPagar = '"Pagar" deve ser menor que "Levar" (ex.: 2 < 3)';
        }
    }
    
    // Validar quantidade
    if (formData.quantidadeEstoque < 0) {
        errors.quantity = 'Quantidade não pode ser negativa';
    }

    const min = formData.estoqueMinimo != null ? formData.estoqueMinimo : 0;
    if (min < 0) {
        errors.stockMin = 'Estoque mínimo não pode ser negativo';
    }
    
    // Validar categoria (simples)
    if (!formData.categoria || formData.categoria === '') {
        errors.category = 'Selecione uma categoria';
    }
    
    // Validar tipo
    if (!formData.tipo || formData.tipo === '') {
        errors.tipo = 'Selecione o tipo';
    }
    if (empresaTemModuloFarmacia() && formData.pmc != null && formData.pmc < 0) {
        errors.pmc = 'PMC não pode ser negativo';
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

    const promoEnabledEl = document.getElementById('promoEnabled');
    const promoEnabled = promoEnabledEl ? !!promoEnabledEl.checked : false;

    const promoPriceInput = document.getElementById('promoPrice');
    let promoPriceValue = null;
    if (promoPriceInput && String(promoPriceInput.value || '').trim() !== '') {
        let rawPromo = String(promoPriceInput.value).replace(/\./g, '').replace(',', '.');
        let parsed = parseFloat(rawPromo);
        promoPriceValue = isNaN(parsed) ? null : parsed;
    }

    const promoStart = document.getElementById('promoStart') ? document.getElementById('promoStart').value : '';
    const promoEnd = document.getElementById('promoEnd') ? document.getElementById('promoEnd').value : '';
    const promoStartValue = promoStart ? promoStart : null;
    const promoEndValue = promoEnd ? promoEnd : null;

    const qtdLevarEl = document.getElementById('promoQtdLevar');
    const qtdPagarEl = document.getElementById('promoQtdPagar');
    const qtdLevarRaw = qtdLevarEl ? String(qtdLevarEl.value || '').trim() : '';
    const qtdPagarRaw = qtdPagarEl ? String(qtdPagarEl.value || '').trim() : '';
    const promoQtdLevarValue = qtdLevarRaw ? parseInt(qtdLevarRaw, 10) : null;
    const promoQtdPagarValue = qtdPagarRaw ? parseInt(qtdPagarRaw, 10) : null;

    var farmaciaOn = empresaTemModuloFarmacia();
    var tipoControle;
    var exigeReceita;
    var exigeLote;
    var exigeValidade;
    var registroMs;
    var gtinEan;
    var pmcVal;
    if (farmaciaOn) {
        var pmcRaw = (document.getElementById('pmc').value || '').trim();
        var pmcParsed = pmcRaw ? parseFloat(pmcRaw.replace(/\./g, '').replace(',', '.')) : null;
        tipoControle = document.getElementById('tipoControle').value || 'COMUM';
        exigeReceita = !!document.getElementById('exigeReceita').checked;
        exigeLote = !!document.getElementById('exigeLote').checked;
        exigeValidade = !!document.getElementById('exigeValidade').checked;
        registroMs = (document.getElementById('registroMs').value || '').trim() || null;
        gtinEan = (document.getElementById('gtinEan').value || '').trim() || null;
        pmcVal = isNaN(pmcParsed) ? null : pmcParsed;
    } else if (editingProductId) {
        var prev = products.find(function (p) { return p.id === editingProductId; });
        if (prev) {
            tipoControle = prev.tipoControle || 'COMUM';
            exigeReceita = !!prev.exigeReceita;
            exigeLote = !!prev.exigeLote;
            exigeValidade = !!prev.exigeValidade;
            registroMs = prev.registroMs != null && String(prev.registroMs).trim() !== '' ? String(prev.registroMs).trim() : null;
            gtinEan = prev.gtinEan != null && String(prev.gtinEan).trim() !== '' ? String(prev.gtinEan).trim() : null;
            pmcVal = prev.pmc != null && !isNaN(Number(prev.pmc)) ? Number(prev.pmc) : null;
        } else {
            tipoControle = 'COMUM';
            exigeReceita = false;
            exigeLote = false;
            exigeValidade = false;
            registroMs = null;
            gtinEan = null;
            pmcVal = null;
        }
    } else {
        tipoControle = 'COMUM';
        exigeReceita = false;
        exigeLote = false;
        exigeValidade = false;
        registroMs = null;
        gtinEan = null;
        pmcVal = null;
    }

    const formData = {
        nome: document.getElementById('name').value.trim(),
        descricao: document.getElementById('description').value.trim(),
        preco: isNaN(priceValue) ? 0 : priceValue,
        quantidadeEstoque: parseInt(document.getElementById('quantity').value) || 0,
        estoqueMinimo: parseInt(document.getElementById('stockMin').value) || 0,
        categoria: document.getElementById('category').value,
        codigoProduto: document.getElementById('productCode').value.trim(),
        tipo: document.getElementById('tipo').value,

        // Promoções
        emPromocao: promoEnabled,
        precoPromocional: promoPriceValue,
        promocaoInicio: promoStartValue,
        promocaoFim: promoEndValue,

        promoQtdLevar: promoQtdLevarValue,
        promoQtdPagar: promoQtdPagarValue,
        tipoControle: tipoControle,
        exigeReceita: exigeReceita,
        exigeLote: exigeLote,
        exigeValidade: exigeValidade,
        registroMs: registroMs,
        gtinEan: gtinEan,
        pmc: pmcVal
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
            const response = await fetch(appendEmpresaIdToApiUrl((typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api') + `/produtos/${editingProductId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                await loadProducts(currentPage);
                cancelEdit();
                showAlert('Produto atualizado com sucesso!', 'success');
                logAction('PRODUCT_UPDATE_SUCCESS', { id: editingProductId, nome: formData.nome });
            } else {
                const errorData = await response.json();
                showAlert(errorData.message || 'Erro ao atualizar produto', 'error');
            }
        } else {
            // Criar novo produto
            const response = await fetch(appendEmpresaIdToApiUrl((typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api') + '/produtos'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                await loadProducts(0);
                form.reset();
                showAlert('Produto cadastrado com sucesso!', 'success');
                logAction('PRODUCT_CREATE_SUCCESS', { nome: formData.nome, codigo: formData.codigoProduto });
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
    productCount.textContent = `(${totalElements})`;
    
    // Limpar lista
    productListElement.innerHTML = '';
    
    if (productList.length === 0) {
        noProductsMessage.style.display = 'block';
        return;
    }
    
    noProductsMessage.style.display = 'none';
    
    // Criar linhas da tabela
    productList.forEach(product => {
        const min = product.estoqueMinimo != null ? product.estoqueMinimo : 5;
        const row = document.createElement('tr');
        
        const promoAtiva = isPromocaoAtiva(product);
        const precoNormal = parseFloat(product.preco);
        const precoPromo = product.precoPromocional != null ? parseFloat(product.precoPromocional) : null;
        const qtdPromoAtiva = product.promoQtdLevar != null && product.promoQtdPagar != null && Number(product.promoQtdPagar) < Number(product.promoQtdLevar);

        const formattedPrice = (promoAtiva && precoPromo != null)
            ? precoPromo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : precoNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const promoExtraHtml = (promoAtiva && precoPromo != null && !isNaN(precoNormal))
            ? `<div style="font-size:12px;opacity:.7;text-decoration:line-through;margin-top:2px;">${precoNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>`
            : '';

        const promoBadgeHtml = promoAtiva ? ' <span style="font-size:12px;font-weight:900;color:#d97706;">PROMO</span>' : '';
        const qtdPromoBadgeHtml = qtdPromoAtiva
            ? `<div style="font-size:12px;font-weight:900;color:#0f766e;margin-top:4px;">Leve ${product.promoQtdLevar}, pague ${product.promoQtdPagar}</div>`
            : '';
        
        // Verificar estoque baixo (quantidade <= estoque mínimo)
        const stockClass = product.quantidadeEstoque <= min ? 'low-stock' : '';
        const stockIcon = product.quantidadeEstoque <= min ? '⚠️ ' : '';
        
        row.innerHTML = `
            <td>${escapeHtml(product.codigoProduto || '-')}</td>
            <td>${escapeHtml(product.nome)}</td>
            <td>${escapeHtml((product.descricao || '').substring(0, 50))}${(product.descricao || '').length > 50 ? '...' : ''}</td>
            <td>
                ${formattedPrice}${promoBadgeHtml}
                ${promoExtraHtml}
                ${qtdPromoBadgeHtml}
            </td>
            <td class="${stockClass}">${stockIcon}${product.quantidadeEstoque}</td>
            <td>${escapeHtml(product.categoria || 'Sem categoria')}</td>
            <td>
                <div class="product-actions">
                    <button class="btn btn-edit btn-small" onclick="editProduct(${product.id})">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteProduct(${product.id})">
                        🗑️ Excluir
                    </button>
                </div>
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

// Busca agora é server-side (loadProducts com q/page).

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
            const response = await fetch(appendEmpresaIdToApiUrl((typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api') + `/produtos/${productIdToDelete}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + getToken()
                }
            });
            
            if (response.ok) {
                await loadProducts(currentPage);
                closeModal();
                showAlert('Produto excluído com sucesso!', 'success');
                logAction('PRODUCT_DELETE_SUCCESS', { id: productIdToDelete });
            } else {
                showAlert('Erro ao excluir produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            showAlert('Erro de conexão', 'error');
        }
    }
}

async function deleteAllProducts() {
    if (!totalElements || totalElements <= 0) {
        showAlert('Não há produtos para excluir.', 'info');
        return;
    }
    var modal = document.getElementById('bulkDeleteModal');
    var text = document.getElementById('bulkDeleteCountText');
    if (!modal || !text) return;
    text.textContent = 'Total atual: ' + totalElements + ' produto(s).';
    bulkDeletePending = true;
    modal.classList.add('show');
}

function closeBulkDeleteModal() {
    var modal = document.getElementById('bulkDeleteModal');
    if (modal) modal.classList.remove('show');
    bulkDeletePending = false;
}

async function confirmDeleteAllProducts() {
    if (!bulkDeletePending) return;
    bulkDeletePending = false;
    closeBulkDeleteModal();

    try {
        var response = await fetch(appendEmpresaIdToApiUrl(getApiBase() + '/produtos'), {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });

        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) {
            showAlert(data.message || 'Erro ao excluir todos os produtos.', 'error');
            return;
        }

        await refreshProductsListAndHighlight();
        var removed = data && typeof data.removed === 'number' ? data.removed : 0;
        showAlert('Exclusão em lote concluída. Removidos: ' + removed + '. Lista atualizada com sucesso.', 'success');
        logAction('PRODUCT_DELETE_ALL_SUCCESS', { removed: removed });
    } catch (error) {
        console.error('Erro ao excluir todos os produtos:', error);
        showAlert('Erro de conexão ao excluir todos os produtos.', 'error');
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('confirmModal').classList.remove('show');
    productIdToDelete = null;
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

var bulkDeleteModalEl = document.getElementById('bulkDeleteModal');
if (bulkDeleteModalEl) {
    bulkDeleteModalEl.addEventListener('click', function (e) {
        if (e.target === this) {
            closeBulkDeleteModal();
        }
    });
}

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
        document.getElementById('stockMin').value = product.estoqueMinimo != null ? product.estoqueMinimo : 0;
        document.getElementById('category').value = product.categoria || '';
        document.getElementById('productCode').value = product.codigoProduto || '';
        document.getElementById('tipo').value = product.tipo || '';
        if (empresaTemModuloFarmacia()) {
            document.getElementById('tipoControle').value = product.tipoControle || 'COMUM';
            document.getElementById('exigeReceita').checked = !!product.exigeReceita;
            document.getElementById('exigeLote').checked = !!product.exigeLote;
            document.getElementById('exigeValidade').checked = !!product.exigeValidade;
            document.getElementById('registroMs').value = product.registroMs || '';
            document.getElementById('gtinEan').value = product.gtinEan || '';
            document.getElementById('pmc').value = product.pmc != null
                ? parseFloat(product.pmc).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '';
        } else {
            document.getElementById('tipoControle').value = 'COMUM';
            document.getElementById('exigeReceita').checked = false;
            document.getElementById('exigeLote').checked = false;
            document.getElementById('exigeValidade').checked = false;
            document.getElementById('registroMs').value = '';
            document.getElementById('gtinEan').value = '';
            document.getElementById('pmc').value = '';
        }

        // Promoções
        const promoEnabledEl = document.getElementById('promoEnabled');
        if (promoEnabledEl) promoEnabledEl.checked = product.emPromocao === true;
        const promoPriceEl = document.getElementById('promoPrice');
        if (promoPriceEl) {
            promoPriceEl.value = product.precoPromocional != null ? parseFloat(product.precoPromocional).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) : '';
        }
        const promoStartEl = document.getElementById('promoStart');
        if (promoStartEl) promoStartEl.value = product.promocaoInicio || '';
        const promoEndEl = document.getElementById('promoEnd');
        if (promoEndEl) promoEndEl.value = product.promocaoFim || '';

        updatePromoToggleVisual();

        // Promo por quantidade
        const qtdLevarEl = document.getElementById('promoQtdLevar');
        if (qtdLevarEl) qtdLevarEl.value = product.promoQtdLevar != null ? product.promoQtdLevar : '';
        const qtdPagarEl = document.getElementById('promoQtdPagar');
        if (qtdPagarEl) qtdPagarEl.value = product.promoQtdPagar != null ? product.promoQtdPagar : '';
        
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
    updatePromoToggleVisual();
}

// Resetar formulário
function resetForm() {
    if (editingProductId) {
        cancelEdit();
    }
}
