/**
 * Padrão visual único do sistema (retaguarda, login retaguarda, login PDV, monitor PDV, cupom).
 * Carregue antes de config.js / auth. Ao mudar cores, atualize também o gradiente em styles.css (body).
 */
(function (w) {
    /** Mesmo ID após Restaurar em Parâmetros e no monitor de PDVs (um único cadastro padrão). */
    w.EMPRESA_ID_PADRAO_SISTEMA = 1;

    w.SISTEMA_THEME_PADRAO = Object.freeze({
        nomeEmpresa: 'Sistema de Cadastro',
        corPrimaria: '#667eea',
        corSecundaria: '#764ba2',
        corFundo: '#ffffff',
        corTexto: '#333333',
        corBotao: '#667eea',
        corBotaoTexto: '#ffffff'
    });
})(typeof window !== 'undefined' ? window : this);
