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

/** Entrada de texto estilizada (mesmo layout do sistema); fallback em prompt nativo. */
function pdvPrompt(message, opts) {
    opts = opts || {};
    if (typeof window.showSystemPrompt === 'function') {
        return window.showSystemPrompt(message, opts);
    }
    return new Promise(function (res) {
        var def = opts.defaultValue != null ? String(opts.defaultValue) : '';
        var v = prompt(message, def);
        res(v === null ? null : String(v));
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

function isTouchPdvDevice() {
    try {
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    } catch (e) { /* ignore */ }
    return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
}

function focusInputForMobile(el) {
    if (!el || typeof el.focus !== 'function') return;
    try { el.focus(); } catch (e) { /* ignore */ }
    if (!isTouchPdvDevice()) return;
    setTimeout(function () {
        try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch (e) { /* ignore */ }
    }, 120);
}

function setupMobileKeyboardAssist() {
    if (!isTouchPdvDevice()) return;
    try {
        document.body.classList.add('pdv-touch');
    } catch (e) { /* ignore */ }
    document.addEventListener('focusin', function (ev) {
        var target = ev.target;
        if (!target || !target.tagName) return;
        var tag = String(target.tagName).toUpperCase();
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
        focusInputForMobile(target);
    });
}

let pdvMobileActionsExpanded = false;
let pdvMobileActionsContextReady = false;

function isCompactPdvActionsViewport() {
    if (!isTouchPdvDevice()) return false;
    try {
        return !!(window.matchMedia && window.matchMedia('(max-width: 1180px)').matches);
    } catch (e) {
        return false;
    }
}

function getPdvMobileActionsMode() {
    if (!isCompactPdvActionsViewport()) return 'full';
    if (pdvMobileActionsExpanded) return 'full';
    if (Array.isArray(cart) && cart.length > 0) return 'cart';
    var activeId = (document.activeElement && document.activeElement.id) ? String(document.activeElement.id) : '';
    if (activeId === 'pdv-barcode' || activeId === 'pdv-order-code' || activeId === 'discountValue') return 'entry';
    return 'base';
}

function getVisibleMobileActionsByMode(mode) {
    var base = { barcode: true, finalizar: true, sair: true, mais: true };
    if (mode === 'entry') {
        base.produto = true;
        base.pedido = true;
        base.qtd = true;
        base.cliente = true;
    } else if (mode === 'cart') {
        base.produto = true;
        base.qtd = true;
        base.cliente = true;
        base.nova = true;
    } else if (mode === 'full') {
        return {
            barcode: true, produto: true, finalizar: true, pedido: true, cliente: true, qtd: true,
            nova: true, vendas: true, caixa: true, mais: true, sair: true
        };
    }
    return base;
}

function updatePdvMobileActionsContext() {
    var actionsRoot = document.getElementById('pdv-mobile-actions');
    if (!actionsRoot) return;

    var compact = isCompactPdvActionsViewport();
    actionsRoot.classList.toggle('pdv-mobile-actions--compact', compact);
    pdvMobileActionsExpanded = compact ? pdvMobileActionsExpanded : false;

    var mode = getPdvMobileActionsMode();
    var visible = getVisibleMobileActionsByMode(mode);
    actionsRoot.querySelectorAll('.pdv-mobile-actions__btn[data-action]').forEach(function (btn) {
        var action = btn.getAttribute('data-action');
        var isVisible = !!visible[action];
        btn.classList.toggle('is-hidden-action', !isVisible);
    });

    var moreBtn = actionsRoot.querySelector('.pdv-mobile-actions__btn[data-action="mais"] .pdv-mobile-actions__txt');
    if (moreBtn) moreBtn.textContent = pdvMobileActionsExpanded ? 'Menos' : 'Mais';

    // Altura real da barra fixa (medir depois do layout; "Menos" muda a altura).
    function applyBarHeight() {
        try {
            if (!compact) return;
            var h = Math.ceil(actionsRoot.getBoundingClientRect().height || actionsRoot.offsetHeight || 0);
            h = Math.max(220, h);
            document.documentElement.style.setProperty('--pdv-actions-h', String(h) + 'px');
        } catch (e) { /* ignore */ }
    }
    applyBarHeight();
    if (compact) {
        requestAnimationFrame(function () {
            requestAnimationFrame(applyBarHeight);
        });
    } else {
        try {
            document.documentElement.style.removeProperty('--pdv-actions-h');
        } catch (e) { /* ignore */ }
    }
}

/** Mobile/tablet: traz o bloco de desconto para a área útil acima da barra fixa. */
function scrollPdvDiscountIntoView() {
    if (!isCompactPdvActionsViewport()) return;
    var el = document.querySelector('.discount-section');
    if (!el) return;
    setTimeout(function () {
        try {
            el.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'nearest' });
        } catch (e) {
            try { el.scrollIntoView(true); } catch (e2) { /* ignore */ }
        }
    }, 80);
}

function setupPdvMobileActionsContext() {
    if (pdvMobileActionsContextReady) return;
    pdvMobileActionsContextReady = true;
    updatePdvMobileActionsContext();
    window.addEventListener('resize', updatePdvMobileActionsContext);
    document.addEventListener('focusin', updatePdvMobileActionsContext);
    document.addEventListener('focusout', function () {
        setTimeout(updatePdvMobileActionsContext, 60);
    });
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
    loadProducts({ quiet: true });
    /* Vendas: carregadas sob demanda em openSaleSearchModal (F7) — evita GET /vendas pesado na abertura do PDV */
    setupEventListeners();
    setupMobileKeyboardAssist();
    setupPdvMobileActionsContext();
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
        barcodeInput.addEventListener('focus', updatePdvMobileActionsContext);
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

    const orderInput = document.getElementById('pdv-order-code');
    if (orderInput) {
        orderInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof openSaleSearchModal === 'function') {
                    void openSaleSearchModal();
                    setTimeout(function () {
                        var s = document.getElementById('saleSearchInput');
                        if (s) {
                            s.value = String(orderInput.value || '');
                            if (typeof renderSaleSearchResults === 'function') renderSaleSearchResults();
                            focusInputForMobile(s);
                        }
                    }, 80);
                }
            }
        });
        orderInput.addEventListener('focus', updatePdvMobileActionsContext);
    }

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
        discountTypeSelect.addEventListener('focus', scrollPdvDiscountIntoView);
        discountTypeSelect.addEventListener('click', scrollPdvDiscountIntoView);
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
    /** Atalhos globais do PDV que devem funcionar mesmo com foco em input dentro de .modal */
    function isPdvReservedShortcut(key, keyCode, ctrl, alt) {
        if (keyCode === 27) return true;
        if (keyCode >= 112 && keyCode <= 123) return true;
        if (key && /^F([1-9]|1[0-2])$/.test(key)) return true;
        if (key === 'Escape' || key === 'p' || key === 'P') return true;
        if (ctrl && (keyCode === 68 || keyCode === 80 || keyCode === 82)) return true;
        if (ctrl && key && /^[dpr]$/i.test(String(key))) return true;
        if (alt && (keyCode === 70 || (key && /^f$/i.test(String(key))))) return true;
        if (!ctrl && keyCode === 80 && (!key || key === 'Unidentified' || key === 'p' || key === 'P')) return true;
        return false;
    }

    function handleShortcut(e) {
        var keyCode = e.keyCode || e.which;
        var key = e.key;
        if (!key || key === 'Unidentified') {
            if (keyCode >= 112 && keyCode <= 123) {
                key = 'F' + (keyCode - 111);
            } else if (e.code && /^F(1[0-2]?|[1-9])$/.test(e.code)) {
                key = e.code;
            }
        }
        if (keyCode === 27 || key === 'Esc') {
            key = 'Escape';
        }

        var ctrl = e.ctrlKey;
        var alt = e.altKey;
        if (ctrl && (!key || key === 'Unidentified')) {
            if (keyCode === 68) key = 'd';
            else if (keyCode === 80) key = 'p';
            else if (keyCode === 82) key = 'r';
        }
        if (!ctrl && (!key || key === 'Unidentified') && keyCode === 80) {
            key = 'p';
        }

        var tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
        var isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
        var inModal = e.target && e.target.closest && e.target.closest('.modal');
        var isModalInput = inModal && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
        var isFKey = key && String(key).match(/^F([1-9]|1[0-2])$/);
        var isFKeyCode = keyCode >= 112 && keyCode <= 123;
        var isAltF = alt && (keyCode === 70 || key === 'f' || key === 'F');

        if (isModalInput && !isPdvReservedShortcut(key, keyCode, ctrl, alt)) {
            return;
        }

        // Em campos editáveis fora de modal, não sequestrar teclas de digitação comum.
        if (isEditable && !ctrl && !alt && key !== 'Escape' && !isFKey && !isFKeyCode) {
            return;
        }

        /* showSystemConfirm / showSystemAlert usam listener no document; este handler está no window em capture
         * e faz stopPropagation, então ESC nunca fechava o modal em PRD. Tratar antes. */
        if (key === 'Escape') {
            var ovConf = document.getElementById('systemConfirmOverlay');
            if (ovConf && ovConf.classList.contains('show')) {
                if (typeof window.dismissSystemConfirm === 'function') {
                    window.dismissSystemConfirm();
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            var ovAlert = document.getElementById('systemAlertOverlay');
            if (ovAlert && ovAlert.classList.contains('show')) {
                if (typeof window.hideSystemAlert === 'function') {
                    window.hideSystemAlert();
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }

        var isShortcut = isFKey || isFKeyCode || key === 'p' || key === 'P' || key === 'Escape' || (ctrl && key && /^[dpr]$/i.test(key)) || (ctrl && (keyCode === 68 || keyCode === 80 || keyCode === 82)) || isAltF;
        if (isShortcut) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (currentCaixaStatus !== 'LIVRE') {
            var allowedWhenNotLivre =
                key === 'F5' ||
                key === 'F11' ||
                key === 'Escape' ||
                isAltF;
            if (!allowedWhenNotLivre) {
                return;
            }
        }

        if (isAltF) {
            openFechamentoCaixaModal();
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
                if (typeof openSaleSearchModal === 'function') void openSaleSearchModal();
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
                pdvRequestExit();
                break;
        }

        if (ctrl && (keyCode === 68 || keyCode === 80 || keyCode === 82)) {
            if (keyCode === 68 && typeof addCpfToSale === 'function') addCpfToSale();
            else if (keyCode === 80) alert('Função "Preço Produto (Ctrl+P)" não implementada.');
            else if (keyCode === 82) alert('Função "Contas a Receber (Ctrl+R)" não implementada.');
        }
    }

    window.addEventListener('keydown', handleShortcut, true);
}

function pdvMobileAction(action) {
    switch (String(action || '')) {
        case 'barcode': {
            var b = document.getElementById('pdv-barcode');
            focusInputForMobile(b);
            break;
        }
        case 'pedido': {
            var p = document.getElementById('pdv-order-code');
            focusInputForMobile(p);
            break;
        }
        case 'produto':
            if (typeof openProductSearchModal === 'function') openProductSearchModal();
            break;
        case 'cliente':
            if (typeof openClientModal === 'function') openClientModal();
            break;
        case 'qtd':
            if (typeof changeQuantity === 'function') changeQuantity();
            break;
        case 'finalizar':
            if (typeof finalizeSale === 'function') finalizeSale();
            break;
        case 'nova':
            if (typeof novaVenda === 'function') novaVenda();
            break;
        case 'vendas':
            if (typeof openSaleSearchModal === 'function') void openSaleSearchModal();
            break;
        case 'caixa':
            if (typeof openFechamentoCaixaModal === 'function') void openFechamentoCaixaModal();
            break;
        case 'sair':
            if (typeof pdvRequestExit === 'function') pdvRequestExit();
            break;
        case 'mais':
            pdvMobileActionsExpanded = !pdvMobileActionsExpanded;
            updatePdvMobileActionsContext();
            break;
        default:
            break;
    }
}

window.pdvMobileAction = pdvMobileAction;

/**
 * @param {{ quiet?: boolean }} [opts] quiet=true na abertura do PDV (sem toast de sucesso; menos trabalho na UI)
 */
async function loadProducts(opts) {
    opts = opts || {};
    try {
        const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
        
        var apiRoot = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
        const response = await fetch(appendEmpresaIdToApiUrl(apiRoot + '/produtos'), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            products = await response.json();
            if (opts.quiet) {
                console.log('PDV: ' + products.length + ' produtos em cache.');
                if (products.length === 0) {
                    var eidLog = '';
                    try {
                        var sel = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId');
                        if (sel) eidLog = ' empresaId=' + sel + '.';
                    } catch (e) {}
                    console.warn(
                        'PDV: nenhum produto retornado pela API.' + eidLog +
                        ' Em DES o MySQL local costuma estar vazio ou sem itens para essa empresa; no PRD os dados são outro banco. Cadastre/importe produtos na retaguarda (DES) ou restaure um dump.'
                    );
                }
            } else {
                showAlert(`${products.length} produtos carregados.`, 'success');
            }
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
        var apiRoot2 = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
        const response = await fetch(appendEmpresaIdToApiUrl(apiRoot2 + '/vendas'), {
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

    await addToCart(foundProduct.id);
    var barcodeInput = document.getElementById('pdv-barcode');
    if (barcodeInput) { barcodeInput.value = ''; barcodeInput.focus(); }
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

function getPrecoProdutoAtual(product) {
    var promoAtiva = isPromocaoAtiva(product);
    var precoPromo = product.precoPromocional != null ? Number(product.precoPromocional) : null;
    if (promoAtiva && precoPromo != null && !isNaN(precoPromo)) return precoPromo;
    return product.preco != null ? Number(product.preco) : 0;
}

function getFarmaciaFeatures() {
    var f = (typeof window !== 'undefined' && window.__tenantFeatures) ? window.__tenantFeatures : {};
    return {
        on: !!f.moduloFarmaciaAtivo,
        pmcOn: !!f.farmaciaPmcAtivo,
        pmcModo: String(f.farmaciaPmcModo || 'ALERTA').toUpperCase(),
        exigeLoteGlobal: !!f.farmaciaLoteValidadeObrigatorio
    };
}

function requiresReceita(product) {
    if (!product) return false;
    return !!product.exigeReceita || product.tipoControle === 'ANTIMICROBIANO' || product.tipoControle === 'CONTROLADO';
}

function requiresLote(product) {
    if (!product) return false;
    var f = getFarmaciaFeatures();
    return !!f.exigeLoteGlobal || !!product.exigeLote || !!product.exigeValidade || requiresReceita(product);
}

function shouldForceFarmaciaPrompts(product) {
    if (!product) return false;
    var tc = String(product.tipoControle || '').toUpperCase();
    return tc === 'CONTROLADO' || tc === 'ANTIMICROBIANO' || !!product.exigeReceita || !!product.exigeLote || !!product.exigeValidade;
}

function calcItemSubtotal(item) {
    // `item.price` é o preço unitário atual (normal ou promocional por data/flag).
    // Se houver promo por quantidade (leve X, pague Y), ajusta o total para refletir a quantidade pagável.
    var unit = Number(item && item.price != null ? item.price : 0);
    var qty = Math.max(0, Math.floor(Number(item && item.quantity != null ? item.quantity : 0)));
    if (!unit || qty <= 0) return 0;

    var levar = item && item.promoQtdLevar != null ? Number(item.promoQtdLevar) : null;
    var pagar = item && item.promoQtdPagar != null ? Number(item.promoQtdPagar) : null;

    if (levar && pagar && levar > 0 && pagar > 0 && pagar < levar && qty >= levar) {
        var sets = Math.floor(qty / levar);
        var remainder = qty % levar;
        var payableQty = (sets * pagar) + remainder; // resto paga cheio
        return payableQty * unit;
    }

    return qty * unit;
}

function getPromoQtdInfo(item) {
    if (!item) return null;
    var levar = item.promoQtdLevar != null ? Number(item.promoQtdLevar) : null;
    var pagar = item.promoQtdPagar != null ? Number(item.promoQtdPagar) : null;
    if (!levar || !pagar || pagar >= levar) return null;

    var qty = Math.max(0, Math.floor(Number(item.quantity || 0)));
    var unit = Number(item.price || 0);
    var totalSemPromo = qty * unit;
    var totalComPromo = calcItemSubtotal(item);
    var economia = Math.max(0, totalSemPromo - totalComPromo);

    return {
        levar: levar,
        pagar: pagar,
        economia: economia
    };
}

async function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showAlert('Produto não encontrado', 'error');
        return;
    }

    // Estoque mínimo: alerta quando o estoque restante estiver abaixo ou igual ao mínimo
    var min = product.estoqueMinimo != null ? product.estoqueMinimo : 0;
    var estoqueAtual = product.quantidadeEstoque != null ? Number(product.quantidadeEstoque) : null;
    if (estoqueAtual != null && estoqueAtual <= min && min > 0) {
        showAlert(
            'Estoque baixo: ' +
                product.nome +
                ' (min: ' +
                min +
                ', estoque: ' +
                estoqueAtual +
                ').',
            'warning'
        );
    } else if (estoqueAtual != null && min === 0 && estoqueAtual <= 5) {
        // compatibilidade: se não houver mínimo configurado, mantém comportamento antigo <= 5
        showAlert('Estoque baixo: ' + product.nome + ' (estoque: ' + estoqueAtual + ').', 'warning');
    }

    const existingItem = cart.find(item => item.productId === productId);
    const farm = getFarmaciaFeatures();

    let loteCodigo = null;
    let receitaTipo = null;
    let receitaNumero = null;
    let receitaPrescritor = null;
    let receitaData = null;

    var farmPromptOn = !!farm.on || shouldForceFarmaciaPrompts(product);

    if (farmPromptOn && requiresLote(product)) {
        var loteRaw = await pdvPrompt('Informe o código do lote para incluir no cupom desta venda.', {
            title: 'Lote obrigatório',
            inputLabel: 'Código do lote',
            placeholder: 'Ex.: LOT-CTL-001',
            defaultValue: '',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            type: 'info'
        });
        if (loteRaw === null) return;
        loteCodigo = String(loteRaw).trim();
        if (!loteCodigo) {
            showAlert('Lote obrigatório para este item.', 'error');
            return;
        }
    }
    if (farmPromptOn && requiresReceita(product)) {
        var rt = await pdvPrompt('Informe o tipo de receita (ex.: A, B, C ou Outro).', {
            title: 'Dados da receita',
            inputLabel: 'Tipo de receita',
            placeholder: 'A / B / C / Outro',
            confirmText: 'Próximo',
            cancelText: 'Cancelar',
            type: 'info'
        });
        if (rt === null) return;
        receitaTipo = String(rt).trim();
        var rn = await pdvPrompt('Informe o número da receita.', {
            title: 'Dados da receita',
            inputLabel: 'Número da receita',
            placeholder: 'Número / série',
            confirmText: 'Próximo',
            cancelText: 'Cancelar',
            type: 'info'
        });
        if (rn === null) return;
        receitaNumero = String(rn).trim();
        var rp = await pdvPrompt('Informe o nome do prescritor.', {
            title: 'Dados da receita',
            inputLabel: 'Prescritor',
            placeholder: 'Nome completo',
            confirmText: 'Próximo',
            cancelText: 'Cancelar',
            type: 'info'
        });
        if (rp === null) return;
        receitaPrescritor = String(rp).trim();
        var rd = await pdvPrompt('Informe a data da receita no formato AAAA-MM-DD.', {
            title: 'Dados da receita',
            inputLabel: 'Data da receita',
            placeholder: '2026-03-31',
            defaultValue: '',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            type: 'info'
        });
        if (rd === null) return;
        receitaData = String(rd).trim();
        if (!receitaTipo || !receitaNumero || !receitaPrescritor || !receitaData) {
            showAlert('Dados da receita são obrigatórios para este item.', 'error');
            return;
        }
    }

    if (farm.on && farm.pmcOn && product.pmc != null) {
        var precoAtual = Number(getPrecoProdutoAtual(product) || 0);
        var pmc = Number(product.pmc || 0);
        if (!isNaN(precoAtual) && !isNaN(pmc) && precoAtual > pmc) {
            if (farm.pmcModo === 'BLOQUEIO') {
                showAlert('Venda bloqueada: preço acima do PMC para ' + product.nome + '.', 'error');
                return;
            }
            showAlert('Atenção: preço acima do PMC para ' + product.nome + '.', 'warning');
        }
    }

    if (existingItem) {
        existingItem.quantity = parseFloat(existingItem.quantity) + parseFloat(quantity);
        // Recalcula o preço para refletir promoção ativa (se o operador mudar a data/uso no mesmo dia)
        existingItem.price = getPrecoProdutoAtual(product);
        // Mantém regras de quantidade do produto
        existingItem.promoQtdLevar = product.promoQtdLevar != null ? Number(product.promoQtdLevar) : null;
        existingItem.promoQtdPagar = product.promoQtdPagar != null ? Number(product.promoQtdPagar) : null;
        if (loteCodigo) existingItem.loteCodigo = loteCodigo;
        if (receitaTipo) existingItem.receitaTipo = receitaTipo;
        if (receitaNumero) existingItem.receitaNumero = receitaNumero;
        if (receitaPrescritor) existingItem.receitaPrescritor = receitaPrescritor;
        if (receitaData) existingItem.receitaData = receitaData;
    } else {
        cart.push({
            productId: product.id,
            name: product.nome,
            price: getPrecoProdutoAtual(product),
            quantity: quantity,
            code: product.codigoProduto,
            promoQtdLevar: product.promoQtdLevar != null ? Number(product.promoQtdLevar) : null,
            promoQtdPagar: product.promoQtdPagar != null ? Number(product.promoQtdPagar) : null,
            loteCodigo: loteCodigo || null,
            receitaTipo: receitaTipo || null,
            receitaNumero: receitaNumero || null,
            receitaPrescritor: receitaPrescritor || null,
            receitaData: receitaData || null
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
            const itemTotal = calcItemSubtotal(item);
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
    updatePdvMobileActionsContext();
}

function updateDisplayInfo() {
    const promoMsgEl = document.getElementById('pdv-promo-qtd-msg');

    if (currentItem) {
        document.getElementById('pdv-unit-price').textContent = currentItem.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('pdv-quantity').textContent = currentItem.quantity;
        const itemTotal = calcItemSubtotal(currentItem);
        document.getElementById('pdv-item-total').textContent = itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (promoMsgEl) {
            const promoInfo = getPromoQtdInfo(currentItem);
            if (promoInfo) {
                const eco = promoInfo.economia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                promoMsgEl.textContent = `Promocao ativa: leve ${promoInfo.levar}, pague ${promoInfo.pagar}. Economia atual: ${eco}`;
                promoMsgEl.style.display = 'block';
            } else {
                promoMsgEl.style.display = 'none';
                promoMsgEl.textContent = '';
            }
        }
    } else {
        document.getElementById('pdv-unit-price').textContent = 'R$ 0,00';
        document.getElementById('pdv-quantity').textContent = '0';
        document.getElementById('pdv-item-total').textContent = 'R$ 0,00';
        if (promoMsgEl) {
            promoMsgEl.style.display = 'none';
            promoMsgEl.textContent = '';
        }
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

    var totalFmt = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('pdv-total').textContent = totalFmt;
    var totalMob = document.getElementById('pdv-total-mobile');
    if (totalMob) totalMob.textContent = totalFmt;
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
        scrollPdvDiscountIntoView();
        discountValueInput.style.display = 'block';
        applyDiscountBtn.style.display = 'inline-block';
        discountValueInput.placeholder = discountType === 'percent' ? '%' : 'R$';
        discountValueInput.focus();
        scrollPdvDiscountIntoView();
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
    openQuantityChangeModal();
}

async function addCpfToSale() {
    var def = saleCpf || (saleCustomer ? saleCustomer.cpf : '') || '';
    const cpf = await pdvPrompt('Informe o CPF do cliente para constar na nota (ou deixe em branco para remover).', {
        title: 'CPF na nota',
        inputLabel: 'CPF',
        placeholder: '000.000.000-00',
        defaultValue: def,
        confirmText: 'Salvar',
        cancelText: 'Cancelar',
        type: 'info'
    });
    if (cpf === null) return;
    saleCpf = String(cpf).trim() || null;
    if (!saleCpf) saleCustomer = null;
    updateClienteIndicadoDisplay();
    showAlert(saleCpf ? `CPF ${saleCpf} associado à venda.` : 'CPF removido da venda.', 'success');
}

function openQuantityChangeModal() {
    if (!currentItem) return;
    var inp = document.getElementById('quantityChangeInput');
    if (!inp) return;
    inp.value = String(currentItem.quantity != null ? currentItem.quantity : 1);
    try { inp.focus(); inp.select(); } catch (e) {}
    openModal('quantityChangeModal');
}

function confirmarQuantidadeChange() {
    if (!currentItem) return;
    var inp = document.getElementById('quantityChangeInput');
    if (!inp) return;
    var raw = String(inp.value || '').trim();
    var newQty = parseFloat(raw);
    if (isNaN(newQty) || newQty <= 0) {
        showAlert('Quantidade inválida.', 'error');
        return;
    }

    var itemInCart = cart.find(function (item) { return item.productId === currentItem.productId; });
    if (itemInCart) {
        itemInCart.quantity = newQty;
        renderCart();
        showAlert('Quantidade de "' + itemInCart.name + '" alterada para ' + itemInCart.quantity + '.', 'success');
    }
    closeModal('quantityChangeModal');
}

// --- Indicar Cliente (F12) ---
var API_BASE = (typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function' ? window.getApiBaseUrl() : 'http://localhost:8080/api');

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
    const url = appendEmpresaIdToApiUrl(API_BASE + '/clientes/search?q=' + encodeURIComponent(q));
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

/** Mesma lógica do Esc: fecha modal ou pergunta saída (retaguarda / logout conforme perfil). */
function pdvRequestExit() {
    if (activeModal) {
        closeModal(activeModal);
        return;
    }
    if (window.__pdvEscLeavePending) return;
    window.__pdvEscLeavePending = true;
    resolvePdvUserRole()
        .then(function (roleNorm) {
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
        })
        .catch(function () {
            window.__pdvEscLeavePending = false;
        });
}

window.pdvRequestExit = pdvRequestExit;

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

    const filtered = products.filter(p => {
        var nome = (p.nome != null ? String(p.nome) : '').toLowerCase();
        var cod = (p.codigoProduto != null ? String(p.codigoProduto) : '').toLowerCase();
        return nome.includes(searchTerm) || cod.includes(searchTerm);
    });

    if (filtered.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum produto encontrado.</td></tr>';
        return;
    }

    filtered.slice(0, 50).forEach(p => { // Limita a 50 resultados para performance
        const row = document.createElement('tr');
        var min = p.estoqueMinimo != null ? p.estoqueMinimo : 5;
        var estoqueAtual = p.quantidadeEstoque != null ? Number(p.quantidadeEstoque) : null;
        var low = estoqueAtual != null ? (estoqueAtual <= min && min > 0 ? true : (min === 0 ? estoqueAtual <= 5 : false)) : false;
        var lowBadge = low ? ' <span style="color:#d97706;font-weight:800;">⚠️</span>' : '';
        var promoAtiva = isPromocaoAtiva(p);
        var precoAtual = getPrecoProdutoAtual(p);
        var precoNormal = p.preco != null ? Number(p.preco) : 0;
        var precoHtml = promoAtiva
            ? `${precoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<div style="font-size:12px;opacity:.7;text-decoration:line-through;margin-top:2px;">${precoNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>`
            : `${Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        row.innerHTML = `
            <td>${p.codigoProduto}</td>
            <td>${p.nome}${lowBadge}</td>
            <td>${precoHtml}</td>
            <td><button class="btn btn-primary btn-small" onclick="selectProductFromSearch(${p.id})">Adicionar</button></td>
        `;
        resultsBody.appendChild(row);
    });
}

async function selectProductFromSearch(productId) {
    await addToCart(productId);
    closeModal('productSearchModal');
}

// --- Modal de Pesquisa de Venda (F7) ---
async function openSaleSearchModal() {
    // Sempre busca vendas atualizadas no servidor (última venda aparece sem F5 na página)
    await loadAllSales();
    var inp = document.getElementById('saleSearchInput');
    if (inp) inp.value = '';
    renderSaleSearchResults();
    openModal('saleSearchModal');
}

function renderSaleSearchResults() {
    const searchTerm = document.getElementById('saleSearchInput').value.toLowerCase();
    const resultsBody = document.getElementById('sale-search-results-body');
    resultsBody.innerHTML = '';

    // Ordena as vendas da mais recente para a mais antiga (sem mutar o array global)
    const sortedSales = [...sales].sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));

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
        const linePreco = item.preco != null ? parseFloat(item.preco) : 0;
        const lineSubtotal = item.subtotal != null
            ? parseFloat(item.subtotal)
            : linePreco * Number(item.quantidade || 0);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>${linePreco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${lineSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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

    const total = sale.total !== undefined
        ? sale.total
        : itens.reduce((sum, i) => sum + (i.subtotal != null ? Number(i.subtotal) : (i.preco * i.quantidade)), 0);
    document.getElementById('detailTotal').textContent = parseFloat(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    openModal('saleDetailModal');
}

function printLastSale() {
    if (!lastSale) {
        showAlert('Nenhuma venda finalizada para imprimir.', 'warning');
        return;
    }
    openSaleDetailModal(lastSale);
    // Em alguns navegadores móveis/embarcados, fechar imediatamente após print gera página em branco.
    // Mantém o modal aberto até afterprint (com fallback por timeout).
    setTimeout(() => {
        const onAfterPrint = () => {
            try { window.removeEventListener('afterprint', onAfterPrint); } catch (_) { /* ignore */ }
            closeModal('saleDetailModal');
        };
        try { window.addEventListener('afterprint', onAfterPrint, { once: true }); } catch (_) { /* ignore */ }
        window.print();
        setTimeout(onAfterPrint, 1800);
    }, 350);
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

function fmtMoedaBr(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoedaBr(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (!s) return null;
    s = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    if (!s) return null;
    var n = Number(s);
    return isNaN(n) ? null : n;
}

async function openFechamentoCaixaModal() {
    var token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
    if (!token) {
        showAlert('Sessão inválida. Faça login novamente.', 'error');
        return;
    }
    try {
        var api = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
        var r = await fetch(api + '/pdv/fechamentos/resumo-hoje', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!r.ok) {
            showAlert('Não foi possível carregar o resumo de fechamento.', 'error');
            return;
        }
        var resumo = await r.json();
        document.getElementById('fcQtdVendas').textContent = String(resumo.quantidadeVendas || 0);
        document.getElementById('fcTotalDinheiro').textContent = fmtMoedaBr(resumo.totalDinheiro);
        document.getElementById('fcTotalCartao').textContent = fmtMoedaBr(resumo.totalCartao);
        document.getElementById('fcTotalPix').textContent = fmtMoedaBr(resumo.totalPix);
        document.getElementById('fcTotalGeral').textContent = fmtMoedaBr(resumo.totalGeral);
        var inp = document.getElementById('fcValorCaixa');
        var pv = document.getElementById('fcPreviewDiferenca');
        if (inp) inp.value = '';
        if (pv) pv.textContent = '';

        if (inp) {
            inp.oninput = function () {
                var n = parseMoedaBr(inp.value);
                if (n == null) {
                    pv.textContent = '';
                    return;
                }
                var diff = n - Number(resumo.totalDinheiro || 0);
                var tipo = diff > 0 ? 'Sobra' : (diff < 0 ? 'Falta' : 'Conferência exata');
                pv.textContent = tipo + ': ' + fmtMoedaBr(Math.abs(diff));
            };
        }
        openModal('fechamentoCaixaModal');
    } catch (e) {
        showAlert('Erro ao abrir fechamento de caixa.', 'error');
    }
}

async function confirmarFechamentoCaixa() {
    var token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
    if (!token) {
        showAlert('Sessão inválida. Faça login novamente.', 'error');
        return;
    }
    var raw = document.getElementById('fcValorCaixa').value;
    var valor = parseMoedaBr(raw);
    var tid = localStorage.getItem('pdvTerminalId');
    var body = { terminalId: tid ? parseInt(tid, 10) : null };
    if (valor != null) body.valorInformadoDinheiro = Number(valor.toFixed(2));
    try {
        var api = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
        var r = await fetch(api + '/pdv/fechamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(body)
        });
        var data = await r.json().catch(function () { return {}; });
        if (!r.ok) {
            showAlert((data && data.message) ? data.message : 'Não foi possível registrar o fechamento.', 'error');
            return;
        }
        closeModal('fechamentoCaixaModal');
        setCaixaStatus('FECHADO');
        if (data.diferencaDinheiro != null) {
            var d = Number(data.diferencaDinheiro || 0);
            if (d > 0) showAlert('Caixa FECHADO. Sobra em dinheiro: ' + fmtMoedaBr(d), 'success');
            else if (d < 0) showAlert('Caixa FECHADO. Falta em dinheiro: ' + fmtMoedaBr(Math.abs(d)), 'warning');
            else showAlert('Caixa FECHADO. Conferência exata.', 'success');
        } else {
            showAlert('Caixa FECHADO e fechamento registrado.', 'success');
        }
    } catch (e) {
        showAlert('Erro ao registrar fechamento.', 'error');
    }
}

function cycleCaixaStatus() {
    // Regra de negócio alterada: O clique simples alterna apenas entre LIVRE e PAUSADO (Almoço/Intervalo)
    // Para FECHAR (Fim de expediente), deve-se usar Alt+F ou Ctrl+Clique
    
    const evt = window.event;
    // Permite fechar clicando com Ctrl pressionado
    if (evt && (evt.ctrlKey || evt.altKey)) {
        openFechamentoCaixaModal();
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

    if (method !== 'CREDITO') {
        const installmentsInfo = document.getElementById('installments-info');
        if (installmentsInfo) { installmentsInfo.style.display = 'none'; installmentsInfo.innerHTML = ''; }
    }

    // Preenche o valor restante automaticamente
    const remaining = Math.max(0, getCartTotal() - currentPayments.reduce((sum, p) => sum + p.valor, 0));
    const paymentValueInput = document.getElementById('payment-value-input');
    
    if(paymentValueInput) {
        paymentValueInput.value = remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '';
        paymentValueInput.focus();
        paymentValueInput.select();
    }

    // Parcelas dependem do valor do campo: atualizar depois de preencher o input
    if (method === 'CREDITO' && typeof updateInstallmentsInfo === 'function') {
        updateInstallmentsInfo();
    }

    if (method === 'PIX') {
        void generatePixQRCode();
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
        let details = '';
        if (p.forma === 'CREDITO' && p.parcelas > 1) {
            const valorParcela = valor / p.parcelas;
            details = `${p.parcelas}x de ${fmt(valorParcela)}`;
        }
        paymentDiv.innerHTML = `
            <div class="added-payment-main">
                <span class="added-payment-method">${p.forma}</span>
                <span class="added-payment-value">${fmt(valor)}</span>
            </div>
            ${details ? `<span class="added-payment-details">${details}</span>` : ''}
            <button onclick="removePayment(${index})" class="btn-remove-payment" title="Remover pagamento" aria-label="Remover pagamento ${p.forma}">&times;</button>
        `;
        listDiv.appendChild(paymentDiv);
    });
}

function getCartSubtotal() { return cart.reduce((sum, item) => sum + calcItemSubtotal(item), 0); }
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
                quantidade: Math.floor(Number(item.quantity || 0)),
            nome: item.name,
            preco: item.price,
                subtotal: calcItemSubtotal(item),
            loteCodigo: item.loteCodigo || null,
            receitaTipo: item.receitaTipo || null,
            receitaNumero: item.receitaNumero || null,
            receitaPrescritor: item.receitaPrescritor || null,
            receitaData: item.receitaData || null
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
        var apiRootPost = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
        const response = await fetch(appendEmpresaIdToApiUrl(apiRootPost + '/vendas'), {
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
                loadAllSales(); // Atualiza lista do F7 / pesquisa de vendas
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

function getPaymentValueInputAmount() {
    const valueInput = document.getElementById('payment-value-input');
    if (!valueInput) return 0;
    return parseFloat(String(valueInput.value).replace(',', '.')) || 0;
}

/** Atualiza textos do select (Nx de R$ …) conforme valor a pagar no campo. */
function refreshInstallmentSelectLabels() {
    const installmentsSelect = document.getElementById('installments');
    if (!installmentsSelect) return;
    const valor = getPaymentValueInputAmount();
    const prev = installmentsSelect.value;
    const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    for (let i = 0; i < installmentsSelect.options.length; i++) {
        const opt = installmentsSelect.options[i];
        const n = parseInt(opt.value, 10);
        if (isNaN(n) || n < 1) continue;
        if (valor > 0) {
            opt.textContent = n + 'x de ' + fmt(valor / n);
        } else {
            opt.textContent = n + 'x';
        }
    }
    if (prev) installmentsSelect.value = prev;
}

function updateInstallmentsInfo() {
    if (activePaymentMethod !== 'CREDITO') return;
    const installmentsSelect = document.getElementById('installments');
    const infoEl = document.getElementById('installments-info');
    if (!installmentsSelect) return;
    refreshInstallmentSelectLabels();
    if (infoEl) {
        infoEl.style.display = 'none';
        infoEl.innerHTML = '';
    }
}

// =================================================================
// ========================== LÓGICA PIX ===========================
// =================================================================

function getPixStoreKey() {
    // Prioridade: valor exposto pelo config.js
    if (window.PIX_STORE_KEY && String(window.PIX_STORE_KEY).trim()) {
        return String(window.PIX_STORE_KEY).trim();
    }
    // Fallback seguro: parâmetros persistidos no navegador
    try {
        const raw = localStorage.getItem('empresaParams') || localStorage.getItem('clientParams');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.chavePix && String(parsed.chavePix).trim()) {
                return String(parsed.chavePix).trim();
            }
        }
    } catch (_) {}
    return '';
}

function getPixMerchantName() {
    const fallback = 'Sua Loja';
    try {
        const raw = localStorage.getItem('empresaParams') || localStorage.getItem('clientParams');
        if (raw) {
            const parsed = JSON.parse(raw);
            const fromStorage = parsed && parsed.nomeEmpresa ? String(parsed.nomeEmpresa).trim() : '';
            if (fromStorage) return fromStorage.substring(0, 25);
        }
    } catch (_) {}
    const fromWindow = window.clientParams && window.clientParams.nomeEmpresa
        ? String(window.clientParams.nomeEmpresa).trim()
        : '';
    return (fromWindow || fallback).substring(0, 25);
}

function isPixKeyPlaceholder(pixKey) {
    const key = String(pixKey || '').trim().toLowerCase();
    // Não bloquear e-mails de exemplo válidos como chave PIX (ex.: padrão do cadastro).
    return !key
        || key === 'seu-email-ou-chave-pix-padrao'
        || key === 'chave pix'
        || key === 'sua-chave-pix';
}

/** Atualiza chave PIX a partir da API (evita cache/localStorage desatualizado no PDV). */
async function refreshPixKeyFromServer() {
    try {
        const token = (typeof getToken === 'function') ? getToken() : localStorage.getItem(AUTH_TOKEN_KEY_LOCAL);
        if (!token) return;
        const eid = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId');
        if (!eid || parseInt(eid, 10) < 1) return;
        const apiBase = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
        const url = apiBase + '/parametros-empresa/empresa/' + encodeURIComponent(String(eid).trim());
        const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        if (!r.ok) return;
        const p = await r.json();
        if (!p || !p.chavePix) return;
        const ck = String(p.chavePix).trim();
        if (!ck) return;
        window.PIX_STORE_KEY = ck;
        try {
            let prev = {};
            const rawEp = localStorage.getItem('empresaParams');
            if (rawEp) prev = JSON.parse(rawEp);
            localStorage.setItem('empresaParams', JSON.stringify(Object.assign({}, prev, p)));
        } catch (_) { /* ignore */ }
        if (typeof window.clientParams !== 'undefined') {
            window.clientParams = Object.assign({}, window.clientParams || {}, p);
        }
    } catch (_) { /* rede / CORS */ }
}

function formatCopiaECola(id, value) {
    const valueStr = String(value);
    const len = valueStr.length.toString().padStart(2, '0');
    return `${id}${len}${valueStr}`;
}

async function generatePixQRCode() {
    await refreshPixKeyFromServer();
    const pixKey = getPixStoreKey();
    // O valor do PIX deve ser o que falta pagar, não necessariamente o total
    const totalPaid = currentPayments.reduce((sum, p) => sum + p.valor, 0);
    const amountToPay = Math.max(0, getCartTotal() - totalPaid);
    
    if (amountToPay <= 0) {
        document.getElementById('pix-qrcode').innerHTML = '<p>Erro ao gerar QR Code (valor inválido).</p>';
        document.getElementById('copy-pix-btn').style.display = 'none';
        return;
    }
    if (isPixKeyPlaceholder(pixKey)) {
        document.getElementById('pix-qrcode').innerHTML = '<p>Configure a Chave PIX em Parâmetros para gerar o QR Code.</p>';
        document.getElementById('copy-pix-btn').style.display = 'none';
        return;
    }
    
    const merchantName = getPixMerchantName();
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
