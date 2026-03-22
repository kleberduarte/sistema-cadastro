(function () {
    var API = typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080/api';
    var pollTimer = null;

    function idEmpresaPadrao() {
        return typeof window.EMPRESA_ID_PADRAO_SISTEMA === 'number' ? window.EMPRESA_ID_PADRAO_SISTEMA : 1;
    }

    /** Contexto da empresa; se vazio, usa o mesmo ID do Restaurar em Parâmetros (um único padrão). */
    function getActiveEmpresaId() {
        var EP = idEmpresaPadrao();
        try {
            var cu = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            if (cu && normalizeUserRole(cu.role) === 'ADMIN_EMPRESA' && cu.empresaId != null && cu.empresaId >= 1) {
                return cu.empresaId;
            }
        } catch (x) {}
        var id = localStorage.getItem('selectedEmpresaId') || localStorage.getItem('selectedClienteId');
        var n = id ? parseInt(id, 10) : NaN;
        if (!isNaN(n) && n >= 1) return n;
        return EP;
    }

    function normalizeUserRole(role) {
        if (role == null || role === '') return '';
        if (typeof role === 'string') return role.trim().toUpperCase();
        if (typeof role === 'object' && role !== null && typeof role.name === 'string') {
            return role.name.trim().toUpperCase();
        }
        return String(role).trim().toUpperCase();
    }

    function isAdminEmpresaProfile() {
        try {
            var cu = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            return cu && normalizeUserRole(cu.role) === 'ADMIN_EMPRESA';
        } catch (x) {
            return false;
        }
    }

    function getContextEmpresaNome() {
        var eid = getActiveEmpresaId();
        if (!eid) return '';
        try {
            var raw = localStorage.getItem('empresaParams');
            if (!raw) return '';
            var j = JSON.parse(raw);
            if (j && parseInt(j.empresaId, 10) === eid && j.nomeEmpresa) return j.nomeEmpresa;
        } catch (x) {}
        return '';
    }

    function updateContextoUI() {
        var EP = idEmpresaPadrao();
        var eid = getActiveEmpresaId();
        var el = document.getElementById('pdvEmpresaContextoTexto');
        var btnNovo = document.getElementById('btnNovoPdv');
        if (!el) return;
        var nome = getContextEmpresaNome();
        var semNomeSalvo = !nome && eid === EP;
        if (!isAdminEmpresaProfile() && eid === EP && (semNomeSalvo || nome === 'Sistema de Cadastro')) {
            el.innerHTML = '<strong>ID ' + eid + '</strong> — <em>parâmetros padrão</em> (mesmo ID após <strong>Restaurar</strong> em Parâmetros). <span style="opacity:.85">PDVs só desta empresa.</span>';
        } else {
            el.innerHTML = '<strong>ID ' + eid + '</strong>' + (nome ? ' — ' + escapeHtml(nome) : '') + ' <span style="opacity:.85">(só PDVs desta empresa)</span>';
        }
        if (btnNovo) {
            btnNovo.disabled = false;
            btnNovo.title = '';
        }
    }

    function normalizeLogoUrl(logoUrl) {
        if (!logoUrl || !String(logoUrl).trim()) return '';
        var u = String(logoUrl).trim();
        if (/^[A-Z]:/i.test(u) || u.indexOf(':\\') >= 0) {
            u = u.split(/[/\\]/).pop();
        }
        return u;
    }

    function temaPadraoMonitor() {
        return window.SISTEMA_THEME_PADRAO || {
            nomeEmpresa: 'Sistema de Cadastro',
            corPrimaria: '#667eea',
            corSecundaria: '#764ba2',
            corFundo: '#ffffff',
            corTexto: '#333333',
            corBotao: '#667eea',
            corBotaoTexto: '#ffffff'
        };
    }

    function applyDefaultPdvMonitorTheme() {
        var P = temaPadraoMonitor();
        applyPdvMonitorBranding({
            empresaId: 0,
            nomeEmpresa: P.nomeEmpresa,
            corPrimaria: P.corPrimaria,
            corSecundaria: P.corSecundaria,
            corFundo: P.corFundo,
            corTexto: P.corTexto,
            corBotao: P.corBotao,
            corBotaoTexto: P.corBotaoTexto,
            logoUrl: null
        });
        var t = document.getElementById('pdvPageTitle');
        if (t) t.textContent = '🖥️ PDVs por empresa';
        document.title = 'PDVs por empresa';
        var logo = document.getElementById('pdvMonitorLogo');
        if (logo) logo.innerHTML = '';
        var mt = document.getElementById('modalPdvTitle');
        if (mt) mt.textContent = 'Novo terminal PDV';
    }

    function applyPdvMonitorBranding(b) {
        var P0 = temaPadraoMonitor();
        var prim = (b.corPrimaria && b.corPrimaria.trim()) || P0.corPrimaria;
        var sec = (b.corSecundaria && b.corSecundaria.trim()) || P0.corSecundaria;
        var fundo = (b.corFundo && b.corFundo.trim()) || P0.corFundo;
        var texto = (b.corTexto && b.corTexto.trim()) || P0.corTexto;
        var btn = (b.corBotao && b.corBotao.trim()) || P0.corBotao;
        var btnTxt = (b.corBotaoTexto && b.corBotaoTexto.trim()) || P0.corBotaoTexto;
        var nome = (b.nomeEmpresa && b.nomeEmpresa.trim()) || ('Empresa #' + b.empresaId);

        /** Gradiente dos botões (cor primária da marca → cor secundária), como nos parâmetros da empresa */
        var gradBtn = 'linear-gradient(90deg, ' + btn + ' 0%, ' + sec + ' 100%)';

        var st = document.getElementById('pdv-monitor-empresa-theme');
        if (!st) {
            st = document.createElement('style');
            st.id = 'pdv-monitor-empresa-theme';
            document.head.appendChild(st);
        }

        var css =
            'body.page-pdvs-monitor { background: linear-gradient(135deg, ' + prim + ' 0%, ' + sec + ' 100%) !important; }' +
            'body.page-pdvs-monitor .container > header { background: linear-gradient(135deg, ' + prim + ' 0%, ' + sec + ' 100%) !important; }' +
            'body.page-pdvs-monitor .pdv-monitor-main { background: ' + fundo + ' !important; color: ' + texto + ' !important; }' +
            'body.page-pdvs-monitor #pdvEmpty { color: ' + texto + ' !important; opacity: 0.65; }' +
            'body.page-pdvs-monitor .pdv-monitor-toolbar label { color: ' + texto + ' !important; }' +
            'body.page-pdvs-monitor .pdv-monitor-contexto-box { border-color: ' + prim + '40 !important; background: ' + prim + '0d !important; }' +
            'body.page-pdvs-monitor .pdv-monitor-contexto-hint { color: ' + texto + ' !important; opacity: 0.75; }' +
            'body.page-pdvs-monitor .pdv-monitor-link-parametros { color: ' + prim + ' !important; font-weight: 700; }' +
            'body.page-pdvs-monitor .pdv-legend { color: ' + texto + ' !important; opacity: 0.9; }' +
            'body.page-pdvs-monitor .pdv-card { border-color: ' + prim + '40 !important; background: linear-gradient(180deg, ' + prim + '12 0%, #fff 100%) !important; box-shadow: 0 4px 16px ' + prim + '18 !important; }' +
            'body.page-pdvs-monitor .pdv-card__title { color: ' + prim + ' !important; }' +
            'body.page-pdvs-monitor .pdv-card__sub, body.page-pdvs-monitor .pdv-card__op { color: ' + texto + ' !important; opacity: 0.75; }' +
            'body.page-pdvs-monitor .pdv-monitor-toolbar-actions .btn.btn-primary:not(:disabled),' +
            'body.page-pdvs-monitor .pdv-card .btn.btn-primary:not(:disabled),' +
            'body.page-pdvs-monitor .modal-pdv .btn.btn-primary:not(:disabled) {' +
            '  background: ' + gradBtn + ' !important;' +
            '  color: ' + btnTxt + ' !important;' +
            '  border: none !important;' +
            '  border-radius: 12px !important;' +
            '  font-weight: 700 !important;' +
            '  box-shadow: 0 4px 14px rgba(0,0,0,0.12), 0 2px 8px ' + prim + '40 !important;' +
            '}' +
            'body.page-pdvs-monitor .btn.btn-primary.btn-small:not(:disabled) {' +
            '  padding: 10px 18px !important;' +
            '  font-size: 0.92rem !important;' +
            '}' +
            'body.page-pdvs-monitor .pdv-monitor-toolbar-actions .btn.btn-primary:not(:disabled) {' +
            '  padding: 12px 22px !important;' +
            '  font-size: 1rem !important;' +
            '}' +
            'body.page-pdvs-monitor .pdv-card__actions .btn { margin-top: 0 !important; }' +
            'body.page-pdvs-monitor .btn.btn-primary:disabled { opacity: 0.45 !important; cursor: not-allowed !important; }' +
            'body.page-pdvs-monitor .btn.btn-primary:hover:not(:disabled) {' +
            '  filter: brightness(1.06) saturate(1.05) !important;' +
            '  transform: translateY(-1px) !important;' +
            '  box-shadow: 0 6px 18px rgba(0,0,0,0.15), 0 3px 10px ' + prim + '55 !important;' +
            '}' +
            'body.page-pdvs-monitor .btn.btn-primary:active:not(:disabled) { transform: translateY(0) !important; }' +
            'body.page-pdvs-monitor .pdv-monitor-main .btn.btn-secondary,' +
            'body.page-pdvs-monitor .modal-pdv .btn.btn-secondary {' +
            '  background: rgba(0,0,0,0.08) !important; color: ' + texto + ' !important; border: 2px solid ' + prim + '44 !important; border-radius: 10px !important;' +
            '}' +
            'body.page-pdvs-monitor .pdv-monitor-main .btn.btn-secondary:hover,' +
            'body.page-pdvs-monitor .modal-pdv .btn.btn-secondary:hover { background: ' + prim + '18 !important; }' +
            'body.page-pdvs-monitor #modalPdvBox { border-top: 4px solid ' + prim + ' !important; background: ' + fundo + ' !important; color: ' + texto + ' !important; border-radius: 16px !important; }' +
            'body.page-pdvs-monitor #modalPdvTitle { color: ' + prim + ' !important; }' +
            'body.page-pdvs-monitor #modalEditPdv .modal-pdv__box { border-top: 4px solid ' + prim + ' !important; background: ' + fundo + ' !important; color: ' + texto + ' !important; border-radius: 16px !important; }' +
            'body.page-pdvs-monitor #modalEditPdv .modal-pdv__box h3 { color: ' + prim + ' !important; }' +
            'body.page-pdvs-monitor .modal-pdv-label { color: ' + texto + ' !important; font-weight: 600; display: block; margin-bottom: 6px; }' +
            'body.page-pdvs-monitor #modalPdvBox input, body.page-pdvs-monitor #modalEditPdv .modal-pdv__box input { border-color: #e0e0e0 !important; color: ' + texto + ' !important; }' +
            'body.page-pdvs-monitor #modalPdvBox input:focus, body.page-pdvs-monitor #modalEditPdv .modal-pdv__box input:focus { border-color: ' + prim + ' !important; }' +
            'body.page-pdvs-monitor .nav-sidebar { background: linear-gradient(180deg, ' + prim + ' 0%, ' + sec + ' 38%, #0d0d12 92%, #08080b 100%) !important; border-right: 4px solid ' + prim + ' !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06) !important; }' +
            'body.page-pdvs-monitor .nav-sidebar__header { background: rgba(0,0,0,0.22) !important; border-bottom-color: rgba(255,255,255,0.14) !important; }' +
            'body.page-pdvs-monitor .nav-sidebar__title { color: #fff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.35) !important; }' +
            'body.page-pdvs-monitor .nav-sidebar__user, body.page-pdvs-monitor .nav-sidebar__user span { color: rgba(255,255,255,0.9) !important; }' +
            'body.page-pdvs-monitor .nav-sidebar__close { border-color: rgba(255,255,255,0.35) !important; color: #fff !important; background: rgba(0,0,0,0.2) !important; }' +
            'body.page-pdvs-monitor .nav-links a { color: #fff !important; }' +
            'body.page-pdvs-monitor .nav-links a:hover { background: rgba(255,255,255,0.14) !important; }' +
            'body.page-pdvs-monitor .nav-links a.is-active { background: rgba(0,0,0,0.35) !important; border-left: 4px solid ' + prim + ' !important; }' +
            'body.page-pdvs-monitor .nav-sidebar__footer { border-top-color: rgba(255,255,255,0.14) !important; background: rgba(0,0,0,0.18) !important; }' +
            'body.page-pdvs-monitor .nav-sidebar__footer .btn.btn-secondary { background: rgba(255,255,255,0.12) !important; color: #fff !important; border: 2px solid rgba(255,255,255,0.35) !important; border-radius: 10px !important; }' +
            'body.page-pdvs-monitor .nav-sidebar__footer .btn.btn-secondary:hover { background: rgba(255,255,255,0.2) !important; }' +
            'body.page-pdvs-monitor .nav-burger { border-color: rgba(255,255,255,0.35) !important; background: rgba(255,255,255,0.12) !important; color: #fff !important; }' +
            'body.page-pdvs-monitor .pdv-quick-empresa { border-top-color: ' + prim + '35 !important; }' +
            'body.page-pdvs-monitor .pdv-quick-empresa label { color: ' + texto + ' !important; }' +
            'body.page-pdvs-monitor .pdv-quick-empresa-row input { border-color: #e0e0e0 !important; }' +
            'body.page-pdvs-monitor .pdv-quick-empresa-row input:focus { border-color: ' + prim + ' !important; }' +
            'body.page-pdvs-monitor .pdv-quick-empresa-hint { color: ' + texto + ' !important; opacity: 0.8; }';

        st.textContent = css;

        document.getElementById('pdvPageTitle').textContent = '🖥️ PDVs — ' + nome;
        document.title = nome + ' — PDVs';
        document.getElementById('modalPdvTitle').textContent = 'Novo PDV — ' + nome;

        var logoEl = document.getElementById('pdvMonitorLogo');
        var logo = normalizeLogoUrl(b.logoUrl);
        if (logo) {
            var src = (logo.indexOf('http') === 0 || logo.indexOf('data:') === 0) ? logo : ('../' + logo);
            logoEl.innerHTML = '<img src="' + src.replace(/"/g, '&quot;') + '" alt="" onerror="this.parentNode.innerHTML=\'\'">';
        } else {
            logoEl.innerHTML = '';
        }
    }

    function mapParametroDtoToBranding(data, empresaIdFallback) {
        if (!data) return null;
        return {
            empresaId: data.empresaId != null ? data.empresaId : empresaIdFallback,
            nomeEmpresa: data.nomeEmpresa,
            corPrimaria: data.corPrimaria,
            corSecundaria: data.corSecundaria,
            corFundo: data.corFundo,
            corTexto: data.corTexto,
            corBotao: data.corBotao,
            corBotaoTexto: data.corBotaoTexto,
            logoUrl: data.logoUrl
        };
    }

    function syncBrandingForEmpresa(empresaId) {
        var id = parseInt(empresaId, 10);
        if (!id || id < 1) {
            applyDefaultPdvMonitorTheme();
            return;
        }
        var tok = token();
        var fetchAuth = tok
            ? fetch(API + '/parametros-empresa/empresa/' + id, { headers: { Authorization: 'Bearer ' + tok } })
            : Promise.resolve({ ok: false });
        fetchAuth
            .then(function (r) {
                if (r && r.ok) return r.json();
                return fetch(API + '/parametros-cliente/branding/' + id).then(function (r2) {
                    return r2.ok ? r2.json() : null;
                });
            })
            .then(function (data) {
                if (!data) {
                    applyDefaultPdvMonitorTheme();
                    return;
                }
                applyPdvMonitorBranding(mapParametroDtoToBranding(data, id));
            })
            .catch(function () {
                fetch(API + '/parametros-cliente/branding/' + id)
                    .then(function (r) { return r.ok ? r.json() : null; })
                    .then(function (data) {
                        if (data) applyPdvMonitorBranding(mapParametroDtoToBranding(data, id));
                        else applyDefaultPdvMonitorTheme();
                    })
                    .catch(function () { applyDefaultPdvMonitorTheme(); });
            });
    }

    function token() {
        return localStorage.getItem('authToken');
    }

    function headers() {
        return { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' };
    }

    async function loadPdvs(empresaId) {
        var r = await fetch(API + '/admin/pdv-terminais?empresaId=' + encodeURIComponent(empresaId), { headers: { Authorization: 'Bearer ' + token() } });
        if (!r.ok) return [];
        return r.json();
    }

    function escapeHtml(s) {
        if (!s) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function renderGrid(list, eid) {
        var grid = document.getElementById('pdvGrid');
        var empty = document.getElementById('pdvEmpty');
        var legend = document.querySelector('.pdv-legend');
        grid.innerHTML = '';
        list.forEach(function (p) {
            var card = document.createElement('div');
            card.className = 'pdv-card';
            var on = p.online === true;
            var st = (p.statusCaixa || 'LIVRE').toString().toUpperCase();
            var stLabel = st === 'PAUSADO' ? 'Pausado' : (st === 'FECHADO' ? 'Fechado' : 'Livre');
            var stClass = st === 'PAUSADO' ? 'pdv-caixa--pausado' : (st === 'FECHADO' ? 'pdv-caixa--fechado' : 'pdv-caixa--livre');
            card.innerHTML =
                '<div class="pdv-card__icon">🖥️' +
                '<span class="pdv-card__status ' + (on ? 'pdv-card__status--on' : 'pdv-card__status--off') + '" title="' + (on ? 'Conectado' : 'Desconectado') + '"></span></div>' +
                '<div class="pdv-card__title">PDV ' + escapeHtml(p.codigo) + '</div>' +
                '<div class="pdv-card__sub">Empresa ID: ' + eid + (p.nome ? ' · ' + escapeHtml(p.nome) : '') + '</div>' +
                '<div class="pdv-card__op">Caixa: <span class="pdv-caixa-badge ' + stClass + '">' + stLabel + '</span></div>' +
                '<div class="pdv-card__op">Último operador: ' + escapeHtml(p.ultimoOperador || '—') + '</div>' +
                '<div class="pdv-card__actions" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' +
                '<button type="button" class="btn btn-primary btn-small pdv-btn-edit" data-edit="' + p.id + '">Editar</button>' +
                '<button type="button" class="btn btn-secondary btn-small" data-del="' + p.id + '">Excluir</button></div>';
            grid.appendChild(card);
        });
        grid.querySelectorAll('.pdv-btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var pid = parseInt(btn.getAttribute('data-edit'), 10);
                var p = list.find(function (x) { return x.id === pid; });
                if (!p) return;
                document.getElementById('inpEditPdvId').value = String(p.id);
                document.getElementById('inpEditPdvCodigo').value = p.codigo || '';
                document.getElementById('inpEditPdvNome').value = p.nome || '';
                document.getElementById('chkEditPdvAtivo').checked = p.ativo !== false;
                document.getElementById('modalEditPdvErr').style.display = 'none';
                document.getElementById('modalEditPdv').classList.add('show');
            });
        });
        grid.querySelectorAll('[data-del]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-del');
                var msg = 'Excluir este PDV? O caixa não poderá mais logar até recadastrar.';
                var p =
                    typeof window.showSystemConfirm === 'function'
                        ? window.showSystemConfirm(msg, {
                              title: 'Excluir PDV',
                              confirmText: 'Sim, excluir',
                              cancelText: 'Cancelar',
                              type: 'warning'
                          })
                        : new Promise(function (res) {
                              res(confirm(msg));
                          });
                p.then(function (ok) {
                    if (!ok) return;
                    fetch(API + '/admin/pdv-terminais/' + id, {
                        method: 'DELETE',
                        headers: { Authorization: 'Bearer ' + token() }
                    }).then(async function (res) {
                        if (!res.ok) {
                            var msg = 'Não foi possível excluir o PDV.';
                            try {
                                var j = await res.json();
                                if (j && j.message) msg = j.message;
                            } catch (e) {}
                            if (typeof window.showSystemAlert === 'function') {
                                window.showSystemAlert(msg, 'error');
                            } else {
                                alert(msg);
                            }
                            return;
                        }
                        refresh();
                    });
                });
            });
        });
        if (!list.length) {
            empty.style.display = 'block';
            empty.textContent = 'Nenhum PDV cadastrado para esta empresa. Clique em Novo PDV.';
        } else {
            empty.style.display = 'none';
        }
        if (legend) legend.style.display = list.length || eid ? '' : 'none';
    }

    function clearGridNoContext() {
        var grid = document.getElementById('pdvGrid');
        var empty = document.getElementById('pdvEmpty');
        var legend = document.querySelector('.pdv-legend');
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.innerHTML = isAdminEmpresaProfile()
            ? 'Nenhuma empresa em contexto. Em <strong>Parâmetros</strong>, selecione a empresa no combo e <strong>carregue</strong> os dados (ou <strong>salve</strong>).'
            : 'Nenhuma empresa em contexto. Em <strong>Parâmetros</strong>, selecione a empresa no combo e <strong>carregue</strong> os dados (ou <strong>salve</strong>). Se usar <strong>Restaurar padrões</strong>, o contexto some e os PDVs deixam de aparecer até você carregar uma empresa de novo.';
        if (legend) legend.style.display = 'none';
    }

    async function refresh() {
        var eid = getActiveEmpresaId();
        updateContextoUI();
        var list = await loadPdvs(eid);
        renderGrid(list, eid);
    }

    function restartPoll() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        pollTimer = setInterval(refresh, 12000);
    }

    function reapplyFromStorage() {
        updateContextoUI();
        var eid = getActiveEmpresaId();
        syncBrandingForEmpresa(eid);
        refresh();
        restartPoll();
    }

    async function usarEmpresaPorId(id) {
        var errEl = document.getElementById('pdvQuickEmpresaErr');
        if (errEl) {
            errEl.style.display = 'none';
            errEl.textContent = '';
        }
        var n = parseInt(id, 10);
        if (!n || n < 1) {
            if (errEl) {
                errEl.textContent = 'Informe um ID de empresa válido (número ≥ 1).';
                errEl.style.display = 'block';
            }
            return;
        }
        try {
            var r = await fetch(API + '/parametros-empresa/empresa/' + n, { headers: { Authorization: 'Bearer ' + token() } });
            if (!r.ok) {
                if (r.status === 404) {
                    var gr = await fetch(API + '/parametros-empresa/garantir/' + n, {
                        method: 'POST',
                        headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }
                    });
                    if (gr.ok) {
                        var params = await gr.json();
                        localStorage.setItem('selectedEmpresaId', String(n));
                        localStorage.setItem('empresaParams', JSON.stringify(params));
                        localStorage.setItem('selectedClienteId', String(n));
                        if (errEl) errEl.style.display = 'none';
                        reapplyFromStorage();
                        return;
                    }
                }
                if (errEl) {
                    errEl.innerHTML = 'Não foi possível ativar a empresa <strong>' + n + '</strong>. Tente de novo ou salve os parâmetros em <a href="parametros.html">Parâmetros</a>.';
                    errEl.style.display = 'block';
                }
                return;
            }
            var params = await r.json();
            localStorage.setItem('selectedEmpresaId', String(n));
            localStorage.setItem('empresaParams', JSON.stringify(params));
            localStorage.setItem('selectedClienteId', String(n));
            if (errEl) errEl.style.display = 'none';
            reapplyFromStorage();
        } catch (e) {
            if (errEl) {
                errEl.textContent = 'Erro ao buscar parâmetros. Verifique a API.';
                errEl.style.display = 'block';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', async function () {
        if (typeof checkAuth === 'function' && !checkAuth()) return;
        if (typeof checkPermission === 'function' && !checkPermission('adm')) return;
        if (typeof syncCurrentUserFromApi === 'function') {
            var me = await syncCurrentUserFromApi();
            if (
                me &&
                normalizeUserRole(me.role) === 'ADMIN_EMPRESA' &&
                me.empresaId != null &&
                me.empresaId >= 1
            ) {
                localStorage.setItem('selectedEmpresaId', String(me.empresaId));
                localStorage.setItem('selectedClienteId', String(me.empresaId));
                var block = document.getElementById('pdvQuickEmpresaBlock');
                if (block) block.style.display = 'none';
                await usarEmpresaPorId(String(me.empresaId));
            }
        }
        if (typeof displayUserName === 'function') displayUserName();
        if (typeof setupMenuByRole === 'function') setupMenuByRole();
        if (typeof fillNavUser === 'function') fillNavUser();
        if (typeof setActiveNavLink === 'function') setActiveNavLink();

        updateContextoUI();
        syncBrandingForEmpresa(getActiveEmpresaId());
        await refresh();
        restartPoll();

        document.getElementById('btnAtualizar').addEventListener('click', refresh);

        document.getElementById('btnNovoPdv').addEventListener('click', function () {
            document.getElementById('inpCodigoPdv').value = '';
            document.getElementById('inpNomePdv').value = '';
            document.getElementById('modalPdvErr').style.display = 'none';
            document.getElementById('modalNovoPdv').classList.add('show');
        });

        document.getElementById('btnCancelarModal').addEventListener('click', function () {
            document.getElementById('modalNovoPdv').classList.remove('show');
        });

        document.getElementById('btnCancelarEditPdv').addEventListener('click', function () {
            document.getElementById('modalEditPdv').classList.remove('show');
        });

        document.getElementById('btnSalvarEditPdv').addEventListener('click', async function () {
            var err = document.getElementById('modalEditPdvErr');
            err.style.display = 'none';
            var id = document.getElementById('inpEditPdvId').value;
            var codigo = document.getElementById('inpEditPdvCodigo').value.trim();
            var nome = document.getElementById('inpEditPdvNome').value.trim();
            var ativo = document.getElementById('chkEditPdvAtivo').checked;
            var eid = getActiveEmpresaId();
            if (!codigo) {
                err.textContent = 'Código obrigatório.';
                err.style.display = 'block';
                return;
            }
            var r = await fetch(API + '/admin/pdv-terminais/' + id + '?empresaId=' + encodeURIComponent(eid), {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ codigo: codigo, nome: nome || null, ativo: ativo })
            });
            if (!r.ok) {
                try {
                    var j = await r.json();
                    err.textContent = j.message || 'Erro ao salvar.';
                } catch (x) {
                    err.textContent = 'Erro ao salvar.';
                }
                err.style.display = 'block';
                return;
            }
            document.getElementById('modalEditPdv').classList.remove('show');
            refresh();
        });

        document.getElementById('btnSalvarPdv').addEventListener('click', async function () {
            var err = document.getElementById('modalPdvErr');
            err.style.display = 'none';
            var eid = getActiveEmpresaId();
            var codigo = document.getElementById('inpCodigoPdv').value.trim();
            var nome = document.getElementById('inpNomePdv').value.trim();
            if (!codigo) {
                err.textContent = 'Informe o código do PDV.';
                err.style.display = 'block';
                return;
            }
            var r = await fetch(API + '/admin/pdv-terminais', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ empresaId: eid, codigo: codigo, nome: nome || null })
            });
            if (!r.ok) {
                try {
                    var j = await r.json();
                    err.textContent = j.message || 'Erro ao salvar.';
                } catch (x) {
                    err.textContent = 'Erro ao salvar.';
                }
                err.style.display = 'block';
                return;
            }
            document.getElementById('modalNovoPdv').classList.remove('show');
            refresh();
        });

        window.addEventListener('focus', reapplyFromStorage);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') reapplyFromStorage();
        });
        window.addEventListener('pageshow', function () {
            reapplyFromStorage();
        });
        window.addEventListener('storage', function (ev) {
            if (ev.key === 'selectedEmpresaId' || ev.key === 'empresaParams') reapplyFromStorage();
        });

        document.getElementById('btnUsarEmpresaId').addEventListener('click', function () {
            var v = document.getElementById('inpPdvEmpresaId').value;
            usarEmpresaPorId(v);
        });
        document.getElementById('btnUsarEmpresaPadrao').addEventListener('click', function () {
            var ep = idEmpresaPadrao();
            document.getElementById('inpPdvEmpresaId').value = String(ep);
            usarEmpresaPorId(ep);
        });
        var btnPad = document.getElementById('btnUsarEmpresaPadrao');
        if (btnPad) btnPad.textContent = '\uD83C\uDFE0 ID padrão (' + idEmpresaPadrao() + ')';
    });
})();
