/**
 * Padrão visual único do sistema (retaguarda, login retaguarda, login PDV, monitor PDV, cupom).
 * Carregue antes de config.js / auth. Ao mudar cores, atualize também o gradiente em styles.css (body).
 */
(function (w) {
    /** Mesmo ID após Restaurar em Parâmetros e no monitor de PDVs (um único cadastro padrão). */
    w.EMPRESA_ID_PADRAO_SISTEMA = 1;

    w.SISTEMA_THEME_PADRAO = Object.freeze({
        nomeEmpresa: 'Veltrix',
        corPrimaria: '#667eea',
        corSecundaria: '#764ba2',
        corFundo: '#ffffff',
        corTexto: '#333333',
        corBotao: '#667eea',
        corBotaoTexto: '#ffffff'
    });

    /** Favicon institucional (aba da retaguarda); mesmo desenho dos HTML. Não usar logo de tenant na aba fora do PDV. */
    w.SISTEMA_FAVICON_SVG_DATA = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Cdefs%3E%3ClinearGradient id=\'g\' x1=\'0\' y1=\'0\' x2=\'1\' y2=\'1\'%3E%3Cstop offset=\'0\' stop-color=\'%23667eea\'/%3E%3Cstop offset=\'1\' stop-color=\'%23764ba2\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x=\'4\' y=\'4\' width=\'56\' height=\'56\' rx=\'12\' fill=\'url(%23g)\'/%3E%3Cpath d=\'M20 34l8 8 16-16\' stroke=\'white\' stroke-width=\'6\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E';
})(typeof window !== 'undefined' ? window : this);
