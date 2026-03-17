// Configurações do Cliente
// Gerencia a aplicação de estilos personalizados por cliente

// ID do cliente configurado manualmente no sistema
// Altere este valor para mudar o visual do sistema
// Ex: 1 = Adidas, 2 = Nike, 3 = Adidas (Novo), etc.
let CLIENTE_ID = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId') || 1;

// Função para alterar o cliente atual (pode ser chamada via console ou botão)
function setClienteId(id) {
    CLIENTE_ID = parseInt(id);
    localStorage.setItem('selectedClienteId', CLIENTE_ID);
    console.log('Cliente alterado para ID:', CLIENTE_ID);
    // Recarregar parâmetros com o novo ID
    loadClientParams();
}

// Função para definir o empresaId selecionado (usado na tela de parâmetros)
function setSelectedEmpresaId(id) {
    CLIENTE_ID = parseInt(id);
    localStorage.setItem('selectedEmpresaId', CLIENTE_ID);
    console.log('Empresa alterada para ID:', CLIENTE_ID);
    // Recarregar parâmetros com o novo ID
    loadClientParams();
}

// Função para obter o ID do cliente atual
function getClienteId() {
    return CLIENTE_ID;
}

/**
 * Grava uma ação do usuário no log do sistema de forma assíncrona.
 * Implementado como "fire and forget" para não impactar a performance.
 */
function logAction(acao, detalhes = {}) {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    // Formato ISO local sem o 'Z' para não forçar conversão para UTC
    const localTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const logEntry = {
        timestamp: localTime,
        usuario: localStorage.getItem('username') || 'Desconhecido',
        acao: acao,
        detalhes: detalhes,
        url: window.location.href,
        userAgent: navigator.userAgent
    };

    // Log estilizado no console para facilitar a depuração
    const color = acao.includes('ERROR') ? 'color: red; font-weight: bold' : 'color: #2196F3; font-weight: bold';
    console.groupCollapsed(`%c[SYSTEM-LOG] ${acao}`, color);
    console.log('Horário:', logEntry.timestamp);
    console.log('Usuário:', logEntry.usuario);
    console.log('Detalhes:', detalhes);
    console.log('URL:', logEntry.url);
    console.groupEnd();

    // Envio assíncrono para o backend
    fetch('http://localhost:8080/api/logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || localStorage.getItem('token') || '')
        },
        body: JSON.stringify(logEntry)
    })
    .then(response => {
        if (!response.ok) console.warn(`%c[LOG-SERVER] Erro ao salvar no banco: ${response.status}`, 'color: orange');
        else console.log('%c[LOG-SERVER] Gravado no servidor ✓', 'color: green; font-size: 8pt');
    })
    .catch(err => {
        console.warn('%c[LOG-SERVER] Servidor de logs offline', 'color: orange; font-size: 8pt');
    });
}

// Cache dos parâmetros do cliente
let clientParams = null;

// Carregar parâmetros do cliente ao iniciar
async function loadClientParams() {
    // Primeiro verificar localStorage - verificar ambas as chaves
    const storedParams = localStorage.getItem('empresaParams') || localStorage.getItem('clientParams');
    const selectedEmpresaId = localStorage.getItem('selectedEmpresaId');
    const selectedClienteId = localStorage.getItem('selectedClienteId');
    
    // Atualizar CLIENTE_ID se existir no localStorage (verifica ambas as chaves)
    if (selectedEmpresaId) {
        CLIENTE_ID = parseInt(selectedEmpresaId);
    } else if (selectedClienteId) {
        CLIENTE_ID = parseInt(selectedClienteId);
    }
    
    if (storedParams) {
        try {
            clientParams = JSON.parse(storedParams);
            applyClientStyles(clientParams);
            console.log('Parâmetros carregados do localStorage:', clientParams);
            return;
        } catch (e) {
            console.log('Erro ao analisar localStorage, buscando do servidor');
        }
    }

    // Verificar se há um token (usuário logado)
    const token = localStorage.getItem('token');
    
    // Se não tem token, ainda tenta carregar do servidor usando o empresaId do localStorage
    try {
        // Usar o CLIENTE_ID atual - buscar por empresaId
        const response = await fetch(`http://localhost:8080/api/parametros-empresa/empresa/${CLIENTE_ID}`, {
            headers: token ? {
                'Authorization': 'Bearer ' + token
            } : {}
        });

        if (response.ok) {
            clientParams = await response.json();
            // Salvar no localStorage para próximas cargas
            localStorage.setItem('empresaParams', JSON.stringify(clientParams));
            applyClientStyles(clientParams);
            console.log('Parâmetros do cliente carregados:', clientParams);
        } else if (response.status === 404) {
            // 404 é esperado quando não há parâmetros salvos - usar padrão
            console.log('Nenhum parâmetro encontrado para empresa ID ' + CLIENTE_ID + '. Usando estilos padrão.');
            applyDefaultStyles();
        } else {
            console.log('Erro ao carregar parâmetros, usando estilos padrão');
            applyDefaultStyles();
        }
    } catch (error) {
        console.error('Erro ao carregar parâmetros do cliente:', error);
        applyDefaultStyles();
    }
}

// Aplicar estilos personalizados do cliente
function applyClientStyles(params) {
    if (!params) return;

    // Aplicar nome da empresa ao título da página
    if (params.nomeEmpresa) {
        document.title = params.nomeEmpresa;
        
        // Atualizar título no header (se existir)
        const titleElement = document.querySelector('header h1');
        if (titleElement) {
            titleElement.textContent = params.nomeEmpresa;
        }
        
        // Atualizar título na tela de login
        const loginTitle = document.querySelector('.login-header h1');
        if (loginTitle) {
            loginTitle.textContent = params.nomeEmpresa;
        }
    }

    // Definir chave PIX global da empresa (usada no PDV)
    if (params.chavePix) {
        window.PIX_STORE_KEY = params.chavePix;
    }

    // Aplicar logo - múltiplas posições
    if (params.logoUrl) {
        console.log('Aplicando logo (original):', params.logoUrl);
        
        // Verificar se é URL absoluta ou caminho relativo
        let logoUrl = params.logoUrl.trim();
        
        // Limpar caminhos do Windows que podem ter sido salvos no banco
        // Ex: "C:/Users/klebe/Desktop/sistema-cadastro-clientes/download.png" -> "download.png"
        if (logoUrl.match(/^[A-Z]:/i) || logoUrl.includes(':\\') || logoUrl.includes(':/')) {
            // É um caminho absoluto do Windows ou URL, extrair apenas o nome do arquivo
            const fileName = logoUrl.split(/[/\\]/).pop();
            logoUrl = fileName;
            console.log('Caminho limpo para:', logoUrl);
        }
        
        // Agora verificar se é URL absoluta ou caminho relativo
        if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
            // É um caminho relativo, usar apenas o nome do arquivo
            console.log('Logo será carregado de:', logoUrl);
        }
        
        // Container no header
        let logoContainer = document.querySelector('.header-logo');
        if (!logoContainer) {
            const header = document.querySelector('header .header-content');
            if (header) {
                logoContainer = document.createElement('div');
                logoContainer.className = 'header-logo';
                header.appendChild(logoContainer);
            }
        }
        if (logoContainer) {
            logoContainer.innerHTML = `<img src="${logoUrl}" alt="Logo" style="max-height: 50px; margin-right: 15px;" onerror="this.style.display='none';">`;
            console.log('Logo adicionado ao header');
        }

        // Logo na tela de login
        let loginLogoContainer = document.querySelector('.login-logo');
        if (!loginLogoContainer) {
            const loginHeader = document.querySelector('.login-header');
            if (loginHeader) {
                loginLogoContainer = document.createElement('div');
                loginLogoContainer.className = 'login-logo';
                loginHeader.insertBefore(loginLogoContainer, loginHeader.firstChild);
            }
        }
        if (loginLogoContainer) {
            loginLogoContainer.innerHTML = `<img src="${logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 20px;" onerror="this.src='https://via.placeholder.com/150x50?text=Logo+Missing';">`;
            console.log('Logo adicionado ao login');
        }
    } else {
        console.log('Nenhuma URL de logo definida');
    }


    const corPrimaria = params.corPrimaria || '#667eea';
    const corSecundaria = params.corSecundaria || '#764ba2';
    const corFundo = params.corFundo || '#ffffff';
    const corTexto = params.corTexto || '#333333';
    const corBotao = params.corBotao || '#667eea';
    const corBotaoTexto = params.corBotaoTexto || '#ffffff';

    // Criar/Injetar tag de estilos com !important
    let styleTag = document.getElementById('custom-client-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'custom-client-styles';
        document.head.appendChild(styleTag);
    }

    // CSS com !important para sobrescrever o styles.css
    // Usa corBotao quando especificada, senão usa corPrimaria
    const corBotaoFinal = corBotao !== '#667eea' ? corBotao : corPrimaria;
    
    styleTag.textContent = `
        body {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
            background-image: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
            color: ${corTexto} !important;
        }
        
        header {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
        }
        
        .login-header h1 {
            color: ${corPrimaria} !important;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, ${corBotaoFinal} 0%, ${corSecundaria} 100%) !important;
            color: ${corBotaoTexto} !important;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, ${corSecundaria} 0%, ${corBotaoFinal} 100%) !important;
        }
        
        .btn {
            background: ${corBotaoFinal} !important;
            color: ${corBotaoTexto} !important;
            border: none !important;
        }
        
        section h2 {
            border-bottom-color: ${corPrimaria} !important;
            color: ${corTexto} !important;
        }
        
        thead {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
        }
        
        .summary-icon {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
        }
        
        .product-category {
            color: ${corPrimaria} !important;
            background: ${corPrimaria}20 !important;
        }
        
        .btn-quantity {
            background: ${corBotaoFinal} !important;
        }
        
        .btn-quantity:hover {
            background: ${corSecundaria} !important;
        }
        
        #clientCount {
            color: ${corPrimaria} !important;
        }
        
        .product-price {
            color: ${corBotaoFinal} !important;
        }
        
        .cart-total span:last-child {
            color: ${corBotaoFinal} !important;
        }
        
        .sale-item-total {
            color: ${corBotaoFinal} !important;
        }
        
        .today-total span:last-child {
            color: ${corBotaoFinal} !important;
        }
        
        .user-info span {
            color: ${corPrimaria} !important;
        }
        
        .client-name {
            color: ${corPrimaria} !important;
        }
        
        .login-box {
            border-top: 5px solid ${corPrimaria} !important;
        }
        
        .container, main, .form-section, .list-section, .search-section {
            background-color: ${corFundo} !important;
            color: ${corTexto} !important;
        }

        /* Cupom Fiscal - estilização por empresa */
        .cupom-header {
            background: linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%) !important;
            color: #fff !important;
        }
        .cupom-header__line { color: rgba(255,255,255,0.9) !important; }
        .cupom-header__title { color: #fff !important; }
        .cupom-header__empresa { color: #fff !important; }
        .cupom-paper {
            border-color: ${corPrimaria} !important;
            box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06), 2px 4px 12px ${corPrimaria}40 !important;
        }
        .cupom-body__cabecalho { color: ${corTexto} !important; border-bottom-color: ${corPrimaria}40 !important; }
        .cupom-body__separator { border-bottom-color: ${corPrimaria}30 !important; }
        .cupom-table tbody tr { border-bottom-color: ${corPrimaria}20 !important; }
        .cupom-table td { border-left-color: ${corPrimaria}20 !important; }
        .cupom-footer { border-top-color: ${corPrimaria} !important; }
        .cupom-footer__total span:last-child { color: ${corPrimaria} !important; }
        .cupom-footer__separator { border-bottom-color: ${corPrimaria}50 !important; }
    `;

    // Cupom Fiscal: preencher nome e logo da empresa (quando na tela do PDV)
    const cupomEmpresaNome = document.getElementById('cupom-empresa-nome');
    const cupomEmpresaLogo = document.getElementById('cupom-empresa-logo');
    if (cupomEmpresaNome) {
        cupomEmpresaNome.textContent = params.nomeEmpresa || '';
        cupomEmpresaNome.style.display = params.nomeEmpresa ? 'block' : 'none';
    }
    if (cupomEmpresaLogo) {
        if (params.logoUrl) {
            let logoUrl = params.logoUrl.trim();
            if (logoUrl.match(/^[A-Z]:/i) || logoUrl.includes(':\\') || logoUrl.includes(':/')) {
                const fileName = logoUrl.split(/[/\\]/).pop();
                logoUrl = fileName;
            }
            cupomEmpresaLogo.innerHTML = `<img src="${logoUrl}" alt="${params.nomeEmpresa || 'Logo'}" onerror="this.style.display='none'">`;
            cupomEmpresaLogo.style.display = 'block';
        } else {
            cupomEmpresaLogo.innerHTML = '';
            cupomEmpresaLogo.style.display = 'none';
        }
    }

    // Aplicar mensagem de boas-vindas
    if (params.mensagemBoasVindas) {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement) {
            welcomeElement.textContent = params.mensagemBoasVindas;
        }
    }

    console.log('Estilos aplicados com sucesso!', params);
}

// Atualizar estilos dinâmicos (gradients, etc)
function updateDynamicStyles(params) {
    const corPrimaria = params.corPrimaria || '#667eea';
    const corSecundaria = params.corSecundaria || '#764ba2';
    
    // Gradient correto
    const gradient = `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`;
    
    // Aplicar ao body
    document.body.style.background = `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Aplicar ao header
    const header = document.querySelector('header');
    if (header) {
        header.style.background = gradient;
    }

    // Aplicar gradient aos botões primários
    const buttons = document.querySelectorAll('.btn-primary');
    buttons.forEach(btn => {
        btn.style.background = gradient;
    });

    // Aplicar cor aos elementos de destaque
    const headings = document.querySelectorAll('section h2');
    headings.forEach(h2 => {
        h2.style.borderBottomColor = corPrimaria;
    });

    // Aplicar cor de fundo aos containers
    const containers = document.querySelectorAll('.container, main, .form-section, .list-section, .search-section');
    containers.forEach(el => {
        if (el.style.backgroundColor === 'rgb(255, 255, 255)' || !el.style.backgroundColor) {
            el.style.backgroundColor = params.corFundo || '#ffffff';
        }
    });

    // Aplicar cor do texto
    document.body.style.color = params.corTexto || '#333333';
}

// Aplicar estilos padrão do sistema
function applyDefaultStyles() {
    const defaultParams = {
        nomeEmpresa: 'Sistema de Cadastro',
        corPrimaria: '#667eea',
        corSecundaria: '#764ba2',
        corFundo: '#ffffff',
        corTexto: '#333333',
        corBotao: '#667eea',
        corBotaoTexto: '#ffffff'
    };
    applyClientStyles(defaultParams);
}

// Função para salvar parâmetros (para uso futuro via admin)
async function saveClientParams(params) {
    try {
        const response = await fetch('http://localhost:8080/api/parametros-empresa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify({
                clienteId: CLIENTE_ID,
                ...params
            })
        });

        if (response.ok) {
            const savedParams = await response.json();
            applyClientStyles(savedParams);
            return savedParams;
        }
    } catch (error) {
        console.error('Erro ao salvar parâmetros:', error);
    }
    return null;
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    loadClientParams();
});

// Também carregar imediatamente (para páginas como login que carregam scripts no final)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadClientParams();
} else {
    window.addEventListener('DOMContentLoaded', loadClientParams);
}
