// ============================================================
// SUPABASE CLIENT
// ============================================================
const SUPABASE_URL = 'https://khgkneegpxcgufslupby.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yiQJTpp-mB2sD3QGtSBrOA_euX6346G';

if (SUPABASE_KEY.startsWith('eyJ') || SUPABASE_KEY.startsWith('sb_secret_')) {
    alert('🚨 ERRO CRÍTICO DE SEGURANÇA.');
    throw new Error('Chave secreta no cliente');
}
console.log('%c🔒 Segurança OK', 'color: #22c55e; font-weight: bold;');

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage: window.localStorage, flowType: 'pkce' }
});

sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        const painel = document.getElementById('painelAdmin');
        if (painel && painel.classList.contains('active')) {
            setTimeout(() => window.location.reload(), 2000);
        }
    }
});

// ============================================================
// ESTADO GLOBAL
// ============================================================
window.State = {
    user: null, adminData: null, session: null,
    isMaster: false,
    pagination: { pedidos: { page: 1, limit: 10, total: 0 }, auditoria: { page: 1, limit: 10, total: 0 } },
    cache: { estoque: [], c2: [], pedidos: [], historico: [], setores: [], insumos: [], receitas: [], config: {}, audit: [] },
    loading: {},
    fotoEmBase64: null,
    realtimeChannel: null,
    ingredientesTemporarios: [],
    clientesPendentes: [],
    clientesFiltrados: []
};
const State = window.State;

// ============================================================
// UTILITÁRIOS
// ============================================================
window.Utils = {
    validarTelefone: t => t && /^[0-9]{10,11}$/.test(t.replace(/\D/g, '')),
    validarPreco: v => { const n = parseFloat(v); return !isNaN(n) && n >= 0; },
    validarEmail: e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
    mascararTelefone: v => {
        const n = v.replace(/\D/g, '');
        return n.length <= 10 ? n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3') : n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    },
    formatarData: d => {
        if (!d) return '';
        try { const dt = new Date(d); if (isNaN(dt.getTime())) return '';
            return dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    },
    formatarDataHora: d => {
        if (!d) return '';
        try { const dt = new Date(d); if (isNaN(dt.getTime())) return '';
            return dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        } catch { return ''; }
    },
    escapeHtml: t => { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
};
const Utils = window.Utils;

// ============================================================
// MAPA DE PERMISSÕES
// ============================================================
function getPermissaoMap() {
    const p = State.adminData?.permissoes || {};
    return {
        estoque: p.estoque === true,
        c1: p.cardapio1 === true,
        c2: p.cardapio2 === true,
        pedidos: p.pedidos === true,
        pagamentos: p.pagamentos === true,
        financeiro: p.financeiro === true,
        ranking: p.pedidos === true,
        historico: p.estoque === true,
        insumos: p.insumos === true,
        calculadora: p.calculadora === true,
        setores: p.setores === true,
        admins: p.admins === true,
        auditoria: (p.auditoria === true) || (p.admins === true)
    };
}
window.getPermissaoMap = getPermissaoMap;

function temPermissao(tab) {
    if (State.isMaster) return true;
    if (['dashboard', 'config'].includes(tab)) return true;
    const map = getPermissaoMap();
    return map[tab] === true;
}
window.temPermissao = temPermissao;

// ============================================================
// FUNÇÃO AUXILIAR - EXECUTAR COM LOADING
// ============================================================
async function executarComLoading(btn, textoLoading, fn) {
    if (!btn) return await fn();
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = textoLoading;
    try { await fn(); } finally { btn.disabled = false; btn.textContent = textoOriginal; }
}
window.executarComLoading = executarComLoading;

// ============================================================
// TOAST
// ============================================================
function mostrarToast(msg, tipo = 'success') {
    const c = document.getElementById('toastContainer'); if (!c) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = 'toast toast-' + tipo;
    t.innerHTML = `<span>${icons[tipo]}</span><span>${Utils.escapeHtml(msg)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;margin-left:auto;">×</button>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4500);
}
window.mostrarToast = mostrarToast;

// ============================================================
// SKELETON
// ============================================================
function mostrarSkeleton(id, qtd = 3) {
    const el = document.getElementById(id); if (!el) return;
    let h = '';
    for (let i = 0; i < qtd; i++) h += `<div class="skeleton"><div class="skeleton-line"></div><div class="skeleton-line medium"></div><div class="skeleton-line short"></div></div>`;
    el.innerHTML = h;
}
window.mostrarSkeleton = mostrarSkeleton;

// ============================================================
// PAGINAÇÃO
// ============================================================
function renderPagination(cid, cp, tp, ti, cb) {
    const c = document.getElementById(cid);
    if (!c || tp <= 1) { if (c) c.innerHTML = ''; return; }
    let h = '<div class="pagination">';
    h += `<span style="padding:0 12px;color:var(--text-secondary);">${ti} itens</span>`;
    if (cp > 1) h += `<button class="btn btn-sm" onclick="window._goto(${cp - 1})">◀</button>`;
    const sp = Math.max(1, cp - 2), ep = Math.min(tp, cp + 2);
    for (let i = sp; i <= ep; i++) h += `<button class="btn btn-sm ${i === cp ? 'active' : ''}" onclick="window._goto(${i})">${i}</button>`;
    if (cp < tp) h += `<button class="btn btn-sm" onclick="window._goto(${cp + 1})">▶</button>`;
    h += '</div>';
    c.innerHTML = h;
    window._goto = page => cb && cb(page);
}
window.renderPagination = renderPagination;

// ============================================================
// TEMA
// ============================================================
const THEME_KEY = 'theme_admin';
function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
    const i = document.getElementById('themeIcon');
    if (i) i.textContent = t === 'dark' ? '🌙' : '☀️';
}
function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }
setTheme(getTheme());
window.toggleTheme = toggleTheme;

// ============================================================
// CONEXÃO
// ============================================================
async function verificarConexao() {
    const s = document.getElementById('statusConexao'); if (!s) return;
    try {
        const { error } = await sb.from('estoquecentral').select('*').limit(1);
        s.innerHTML = error ? '🔴 ' + Utils.escapeHtml(error.message) : '🟢 Conectado!';
    } catch (e) { s.innerHTML = '🔴 Sem conexão'; }
}

// ============================================================
// PREVIEW FOTO
// ============================================================
async function previewFotoAdmin(input) {
    if (input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = e => {
            State.fotoEmBase64 = e.target.result;
            const c = document.getElementById('previewFotoContainer');
            const i = document.getElementById('previewFotoAdmin');
            if (c && i) { c.style.display = 'block'; i.src = e.target.result; }
        };
        r.readAsDataURL(input.files[0]);
    }
}
window.previewFotoAdmin = previewFotoAdmin;

// ============================================================
// LOGIN
// ============================================================
async function fazerLogin() {
    const email = document.getElementById('campoEmail').value.trim();
    const senha = document.getElementById('campoSenha').value;
    const erroEl = document.getElementById('erroLogin');
    const btn = document.getElementById('btnLogin');
    const loading = document.getElementById('loginLoading');
    const bar = document.getElementById('loginProgressBar');

    erroEl.style.display = 'none';

    if (!email || !Utils.validarEmail(email)) { erroEl.textContent = 'E-mail inválido'; erroEl.style.display = 'block'; return; }
    if (!senha || senha.length < 6) { erroEl.textContent = 'Senha mínima 6 caracteres'; erroEl.style.display = 'block'; return; }

    btn.disabled = true;
    btn.textContent = '⏳ Verificando...';
    loading.style.display = 'block';
    bar.style.width = '30%';

    try {
        const { data: rateCheck, error: rateError } = await sb.rpc('check_login_rate_limit', { p_email: email });

        if (rateError) {
            console.warn('Erro ao verificar rate limit:', rateError);
        } else if (rateCheck && rateCheck.allowed === false) {
            erroEl.textContent = '❌ ' + (rateCheck.mensagem || 'Muitas tentativas. Aguarde 15 minutos.');
            erroEl.style.display = 'block';
            mostrarToast('Muitas tentativas. Aguarde.', 'error');
            return;
        }

        bar.style.width = '60%';

        const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });

        try {
            await sb.rpc('registrar_tentativa_login', { p_email: email, p_sucesso: !error });
        } catch (e) { console.warn('Erro ao registrar tentativa:', e); }

        if (error) throw error;

        bar.style.width = '100%';

        if (!data.user.email_confirmed_at) { await sb.auth.signOut(); throw new Error('E-mail não confirmado.'); }

        const { data: adminData, error: adminErr } = await sb.from('admin_usuarios').select('*').eq('user_id', data.user.id).maybeSingle();

        if (adminErr) throw adminErr;
        if (!adminData) throw new Error('Sem permissões.');
        if (!adminData.ativo) throw new Error('Usuário desativado.');

        State.user = data.user;
        State.adminData = adminData;
        State.session = data.session;
        State.isMaster = adminData.is_master === true;

        entrarPainel();
        mostrarToast('Bem-vindo, ' + adminData.nome + (State.isMaster ? ' (MASTER)' : '') + '!', 'success');

    } catch (error) {
        erroEl.textContent = '❌ ' + (error.message || 'Credenciais inválidas');
        erroEl.style.display = 'block';
        mostrarToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Entrar';
        loading.style.display = 'none';
        bar.style.width = '0%';
    }
}
window.fazerLogin = fazerLogin;

async function esqueciSenha() {
    const email = document.getElementById('campoEmail').value.trim();
    if (!email || !Utils.validarEmail(email)) { mostrarToast('Digite um e-mail válido', 'warning'); return; }
    try {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password.html' });
        if (error) throw error;
        mostrarToast('📧 E-mail enviado!', 'success');
    } catch (e) { mostrarToast(e.message, 'error'); }
}
window.esqueciSenha = esqueciSenha;

function entrarPainel() {
    document.getElementById('telaLogin').classList.add('hidden');
    document.getElementById('painelAdmin').classList.add('active');
    document.getElementById('userLogado').textContent = '👤 ' + Utils.escapeHtml(State.adminData.nome) + (State.isMaster ? ' 👑' : '');
    aplicarPermissoes();
    iniciarRealtime();
    carregarTudo();
}

async function sair() {
    try {
        await sb.auth.signOut();
        if (State.realtimeChannel) await sb.removeChannel(State.realtimeChannel);
        State.user = null; State.adminData = null; State.isMaster = false;
        document.getElementById('telaLogin').classList.remove('hidden');
        document.getElementById('painelAdmin').classList.remove('active');
    } catch (e) { mostrarToast(e.message, 'error'); }
}
window.sair = sair;

async function verificarSessao() {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            const { data: adminData } = await sb.from('admin_usuarios').select('*').eq('user_id', session.user.id).maybeSingle();
            if (adminData && adminData.ativo) {
                State.user = session.user;
                State.adminData = adminData;
                State.session = session;
                State.isMaster = adminData.is_master === true;
                entrarPainel();
                return true;
            }
        }
        return false;
    } catch { return false; }
}

// ============================================================
// PERMISSÕES
// ============================================================
function aplicarPermissoes() {
    if (!State.adminData) return;
    const map = getPermissaoMap();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        if (State.isMaster) { btn.style.display = 'flex'; return; }
        if (['dashboard', 'config'].includes(tab)) { btn.style.display = 'flex'; return; }
        btn.style.display = (map[tab] === true) ? 'flex' : 'none';
    });

    document.querySelectorAll('.conteudo').forEach(el => {
        const tab = el.id.replace('conteudo-', '');
        if (State.isMaster) return;
        if (['dashboard', 'config'].includes(tab)) return;
        if (map[tab] !== true) {
            el.classList.remove('active');
        }
    });
}
window.aplicarPermissoes = aplicarPermissoes;

function reaplicarPermissoes() {
    if (!State.adminData || State.isMaster) return;
    aplicarPermissoes();
}
window.reaplicarPermissoes = reaplicarPermissoes;

// ============================================================
// MODAL TROCA SENHA
// ============================================================
function verificarForcaSenhaModal(s) {
    const b = document.getElementById('modalSenhaBarra'), t = document.getElementById('modalSenhaTexto');
    if (!s || s.length === 0) { b.style.width = '0%'; t.textContent = 'Digite uma senha forte'; return; }
    let sc = 0;
    if (s.length >= 8) sc++;
    if (s.length >= 12) sc++;
    if (/[a-z]/.test(s) && /[A-Z]/.test(s)) sc++;
    if (/\d/.test(s)) sc++;
    if (/[^a-zA-Z0-9]/.test(s)) sc++;
    const cores = ['', '#ef4444', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
    const txts = ['', 'Fraca', 'Fraca', 'Média', 'Forte', 'Muito forte!'];
    b.style.width = (sc / 5 * 100) + '%';
    b.style.background = cores[sc];
    t.textContent = txts[sc];
}

function abrirModalTrocaSenha() {
    document.getElementById('modalTrocaSenha').classList.add('active');
    ['modalSenhaAtual', 'modalNovaSenha', 'modalConfirmaSenha'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('modalMensagem').textContent = '';
}
function fecharModalTrocaSenha() { document.getElementById('modalTrocaSenha').classList.remove('active'); }
window.abrirModalTrocaSenha = abrirModalTrocaSenha;
window.fecharModalTrocaSenha = fecharModalTrocaSenha;

async function trocarSenhaModal() {
    const a = document.getElementById('modalSenhaAtual').value;
    const n = document.getElementById('modalNovaSenha').value;
    const c = document.getElementById('modalConfirmaSenha').value;
    const m = document.getElementById('modalMensagem');
    m.textContent = '';
    if (!a || !n || !c) { m.textContent = 'Preencha tudo!'; m.style.color = '#f59e0b'; return; }
    if (n.length < 8) { m.textContent = 'Mínimo 8 caracteres!'; m.style.color = '#f59e0b'; return; }
    if (n !== c) { m.textContent = 'Senhas não coincidem!'; m.style.color = '#ef4444'; return; }
    try {
        const { error: ve } = await sb.auth.signInWithPassword({ email: State.user.email, password: a });
        if (ve) { m.textContent = 'Senha atual incorreta!'; m.style.color = '#ef4444'; return; }
        const { error: ue } = await sb.auth.updateUser({ password: n });
        if (ue) throw ue;
        m.textContent = '✅ Alterada!';
        m.style.color = '#22c55e';
        setTimeout(() => { fecharModalTrocaSenha(); mostrarToast('Senha alterada!'); }, 1500);
    } catch (e) { m.textContent = e.message; m.style.color = '#ef4444'; }
}
window.trocarSenhaModal = trocarSenhaModal;

// ============================================================
// NAVEGAÇÃO
// ============================================================
function mudarTab(tab) {
    if (!temPermissao(tab)) {
        mostrarToast('⛔ Você não tem permissão para acessar esta aba.', 'error');
        return;
    }

    document.querySelectorAll('.conteudo').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const c = document.getElementById('conteudo-' + tab);
    if (c) c.classList.add('active');
    const t = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (t) t.classList.add('active');

    setTimeout(reaplicarPermissoes, 50);

    const loaders = {
        dashboard: carregarDashboard, estoque: carregarEstoque, c1: carregarC1, c2: carregarC2,
        pedidos: carregarPedidos, pagamentos: carregarPagamentos, financeiro: carregarFinanceiro,
        ranking: carregarRanking, historico: carregarHistorico, insumos: carregarInsumos,
        calculadora: carregarReceitas, setores: carregarSetores, admins: carregarListaAdmins,
        config: carregarConfig, auditoria: carregarAuditoria
    };
    if (loaders[tab]) loaders[tab]();
}
window.mudarTab = mudarTab;

function tratarErro(e, msg = 'Erro') { console.error(e); mostrarToast(e.message || msg, 'error'); }
window.tratarErro = tratarErro;

// ============================================================
// EDGE FUNCTION
// ============================================================
async function chamarEdgeFunction(action, dados) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Não autenticado');
    const r = await fetch(SUPABASE_URL + '/functions/v1/manage-admin', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...dados })
    });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || 'Erro');
    return res;
}

// ============================================================
// ADMINS
// ============================================================
async function cadastrarAdminSupabase() {
    const btn = document.querySelector('#conteudo-admins .btn-success');
    await executarComLoading(btn, '⏳ Cadastrando...', async () => {
        const nome = document.getElementById('adminNome').value.trim();
        const email = document.getElementById('adminEmail').value.trim();
        const senha = document.getElementById('adminSenha').value;
        if (!nome || !email || !senha || senha.length < 8) { mostrarToast('Preencha tudo (senha 8+)', 'warning'); return; }
        const perms = {
            estoque: document.getElementById('permEstoque').checked,
            cardapio1: document.getElementById('permC1').checked,
            cardapio2: document.getElementById('permC2').checked,
            pedidos: document.getElementById('permPedidos').checked,
            pagamentos: document.getElementById('permPagamentos').checked,
            financeiro: document.getElementById('permFinanceiro').checked,
            insumos: document.getElementById('permInsumos').checked,
            calculadora: document.getElementById('permCalculadora').checked,
            setores: document.getElementById('permSetores').checked,
            admins: document.getElementById('permAdmins').checked,
            auditoria: document.getElementById('permAuditoria').checked
        };
        await chamarEdgeFunction('create_user', { email, password: senha, nome, permissoes: perms });
        ['adminNome', 'adminEmail', 'adminSenha'].forEach(i => document.getElementById(i).value = '');
        await carregarListaAdmins();
        mostrarToast('Admin cadastrado!', 'success');
    });
}
window.cadastrarAdminSupabase = cadastrarAdminSupabase;

async function carregarListaAdmins() {
    try {
        const { data } = await sb.from('admin_usuarios').select('*').order('criado_em', { ascending: false });
        const l = document.getElementById('listaAdmins');
        if (!data || data.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">👤</span><div>Nenhum admin</div></div>'; return; }
        l.innerHTML = data.map(a => {
            const p = a.permissoes || {};
            const perms = [];
            if (p.estoque) perms.push('📦');
            if (p.cardapio1) perms.push('📋');
            if (p.cardapio2) perms.push('🔥');
            if (p.pedidos) perms.push('📋P');
            if (p.pagamentos) perms.push('💳');
            if (p.financeiro) perms.push('💰');
            if (p.insumos) perms.push('🧪');
            if (p.calculadora) perms.push('💰C');
            if (p.setores) perms.push('📍');
            if (p.admins) perms.push('👥');
            if (p.auditoria) perms.push('📋A');
            const isCurrent = a.user_id === State.user?.id;
            const ehMaster = a.is_master === true;

            let botaoMaster = '';
            if (State.isMaster && !isCurrent) {
                if (ehMaster) {
                    botaoMaster = `<button class="btn btn-warning btn-sm" onclick="rebaixarMaster('${a.user_id}')" title="Rebaixar master">⬇️👑</button>`;
                } else {
                    botaoMaster = `<button class="btn btn-info btn-sm" onclick="promoverMaster('${a.user_id}')" title="Promover a master">⬆️👑</button>`;
                }
            }

            return `<div class="card-item"><div class="card-item-info"><div><strong>👤 ${Utils.escapeHtml(a.nome)}</strong> ${ehMaster ? '<span class="badge badge-pago">👑 MASTER</span>' : ''}<br><small>${Utils.escapeHtml(a.email)} | ${a.ativo ? '✅' : '⛔'} ${isCurrent ? '(Você)' : ''}<br>Perm: ${perms.join(' ') || '(nenhuma)'}</small></div></div><div class="card-item-actions">${botaoMaster}${!isCurrent ? `<button class="btn btn-warning btn-sm" onclick="toggleAdminStatus('${a.user_id}')">🔒</button><button class="btn btn-danger btn-sm" onclick="excluirAdminSupabase('${a.user_id}')">🗑️</button>` : ''}</div></div>`;
        }).join('');
    } catch (e) { tratarErro(e); }
}
window.carregarListaAdmins = carregarListaAdmins;

async function toggleAdminStatus(userId) {
    try {
        const { data: a } = await sb.from('admin_usuarios').select('*').eq('user_id', userId).single();
        if (!a) return;
        if (!confirm(`Alterar status de "${a.nome}"?`)) return;
        await sb.from('admin_usuarios').update({ ativo: !a.ativo }).eq('user_id', userId);
        await carregarListaAdmins();
        mostrarToast('Status alterado!');
    } catch (e) { tratarErro(e); }
}
window.toggleAdminStatus = toggleAdminStatus;

async function excluirAdminSupabase(userId) {
    try {
        const { data: a } = await sb.from('admin_usuarios').select('*').eq('user_id', userId).single();
        if (a?.is_master) {
            mostrarToast('⛔ Não é possível excluir o master. Rebaixe-o antes.', 'error');
            return;
        }
        if (!confirm('Excluir permanentemente?')) return;
        await chamarEdgeFunction('delete_user', { userId });
        await carregarListaAdmins();
        mostrarToast('Excluído!');
    } catch (e) { tratarErro(e); }
}
window.excluirAdminSupabase = excluirAdminSupabase;

async function promoverMaster(userId) {
    if (!State.isMaster) { mostrarToast('⛔ Só o master atual pode promover.', 'error'); return; }
    try {
        const { data: a } = await sb.from('admin_usuarios').select('nome').eq('user_id', userId).single();
        if (!a) return;
        if (!confirm(`Promover "${a.nome}" a MASTER?\n\nEle terá acesso total ao sistema.`)) return;
        const { error } = await sb.from('admin_usuarios').update({ is_master: true }).eq('user_id', userId);
        if (error) throw error;
        await carregarListaAdmins();
        mostrarToast(`👑 ${a.nome} agora é master!`, 'success');
    } catch (e) { tratarErro(e); }
}
window.promoverMaster = promoverMaster;

async function rebaixarMaster(userId) {
    if (!State.isMaster) { mostrarToast('⛔ Só o master atual pode rebaixar.', 'error'); return; }
    if (userId === State.user.id) { mostrarToast('⛔ Você não pode rebaixar a si mesmo.', 'error'); return; }

    try {
        const { data: a } = await sb.from('admin_usuarios').select('nome').eq('user_id', userId).single();
        if (!a) return;
        if (!confirm(`Rebaixar "${a.nome}" de MASTER?\n\nEle perderá o acesso total e passará a respeitar as permissões individuais.`)) return;

        const { data: masters } = await sb.from('admin_usuarios').select('user_id').eq('is_master', true);
        if (!masters || masters.length <= 1) {
            mostrarToast('⛔ Não é possível rebaixar o último master.', 'error');
            return;
        }

        const { error } = await sb.from('admin_usuarios').update({ is_master: false }).eq('user_id', userId);
        if (error) throw error;
        await carregarListaAdmins();
        mostrarToast(`⬇️ ${a.nome} não é mais master.`, 'success');
    } catch (e) { tratarErro(e); }
}
window.rebaixarMaster = rebaixarMaster;

// ============================================================
// DASHBOARD
// ============================================================
async function carregarDashboard() {
    try {
        mostrarSkeleton('dashboardCards', 4);
        const [e, p, i] = await Promise.all([
            sb.from('estoquecentral').select('*'),
            sb.from('todospedidos').select('*'),
            sb.from('insumos').select('*').then(r => r.error ? { data: [] } : r)
        ]);
        const estoque = e.data || [], pedidos = p.data || [], insumos = i.data || [];
        const totalEstoque = estoque.reduce((s, x) => s + (x.quantidadetotal || 0), 0);

        const hoje = new Date();
        const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const data7diasAtras = new Date(dataHoje.getTime() - 6 * 24 * 60 * 60 * 1000);
        const data30diasAtras = new Date(dataHoje.getTime() - 29 * 24 * 60 * 60 * 1000);

        function dataDoPedido(x) {
            try {
                const d = new Date(x.data);
                return new Date(d.getFullYear(), d.getMonth(), d.getDate());
            } catch { return null; }
        }

        const pedidosHoje = pedidos.filter(x => {
            const d = dataDoPedido(x);
            return d && d.getTime() === dataHoje.getTime();
        });

        const vendasHoje = pedidosHoje.filter(x => x.pagamentostatus === 'pago').reduce((s, x) => s + (x.total || 0), 0);
        const vendas7d = pedidos.filter(x => {
            const d = dataDoPedido(x);
            return d && d >= data7diasAtras && x.pagamentostatus === 'pago';
        }).reduce((s, x) => s + (x.total || 0), 0);
        const vendas30d = pedidos.filter(x => {
            const d = dataDoPedido(x);
            return d && d >= data30diasAtras && x.pagamentostatus === 'pago';
        }).reduce((s, x) => s + (x.total || 0), 0);

        const pedidosPagos30d = pedidos.filter(x => {
            const d = dataDoPedido(x);
            return d && d >= data30diasAtras && x.pagamentostatus === 'pago';
        });
        const ticketMedio = pedidosPagos30d.length > 0 ? (vendas30d / pedidosPagos30d.length) : 0;

        const insumosCriticos = insumos.filter(x => (x.quantidade_estoque || 0) <= (x.quantidade_minima || 0)).length;

        document.getElementById('dashboardCards').innerHTML = `
            <div class="dash-card"><div class="icon">📦</div><div class="valor">${totalEstoque}</div><div class="label">Estoque</div></div>
            <div class="dash-card"><div class="icon">📋</div><div class="valor">${pedidosHoje.length}</div><div class="label">Pedidos Hoje</div></div>
            <div class="dash-card"><div class="icon">💰</div><div class="valor">R$ ${vendasHoje.toFixed(2)}</div><div class="label">Faturamento Hoje</div></div>
            <div class="dash-card"><div class="icon">🧪</div><div class="valor">${insumosCriticos}</div><div class="label">Insumos Críticos</div></div>`;

        const elVendas = document.getElementById('dashboardVendas');
        if (elVendas) {
            elVendas.innerHTML = `
                <div class="dashboard-cards" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
                    <div class="dash-card" style="border-left:4px solid var(--success);">
                        <div class="icon">💵</div>
                        <div class="valor">R$ ${vendasHoje.toFixed(2)}</div>
                        <div class="label">Vendas Hoje</div>
                    </div>
                    <div class="dash-card" style="border-left:4px solid var(--info);">
                        <div class="icon">📈</div>
                        <div class="valor">R$ ${vendas7d.toFixed(2)}</div>
                        <div class="label">Últimos 7 Dias</div>
                    </div>
                    <div class="dash-card" style="border-left:4px solid var(--roxo);">
                        <div class="icon">📉</div>
                        <div class="valor">R$ ${vendas30d.toFixed(2)}</div>
                        <div class="label">Últimos 30 Dias</div>
                    </div>
                    <div class="dash-card" style="border-left:4px solid var(--dourado);">
                        <div class="icon">🎯</div>
                        <div class="valor">R$ ${ticketMedio.toFixed(2)}</div>
                        <div class="label">Ticket Médio (30d)</div>
                    </div>
                </div>`;
        }

        const elGrafico = document.getElementById('graficoBarras');
        if (elGrafico) {
            const dias = [];
            for (let i = 6; i >= 0; i--) {
                const dia = new Date(dataHoje.getTime() - i * 24 * 60 * 60 * 1000);
                const total = pedidos.filter(x => {
                    const d = dataDoPedido(x);
                    return d && d.getTime() === dia.getTime() && x.pagamentostatus === 'pago';
                }).reduce((s, x) => s + (x.total || 0), 0);
                const qtd = pedidos.filter(x => {
                    const d = dataDoPedido(x);
                    return d && d.getTime() === dia.getTime();
                }).length;
                dias.push({
                    data: dia,
                    label: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    labelDia: dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
                    total: total,
                    qtd: qtd
                });
            }

            const maiorTotal = Math.max(...dias.map(d => d.total), 1);
            elGrafico.innerHTML = dias.map(d => {
                const altura = Math.max(20, (d.total / maiorTotal) * 160);
                const cor = d.total > 0 ? 'linear-gradient(180deg,var(--dourado),var(--laranja))' : 'var(--bg-secondary)';
                return `
                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;" title="${d.qtd} pedidos • R$ ${d.total.toFixed(2)}">
                        <div style="font-size:0.7em;color:var(--dourado);font-weight:700;">R$ ${d.total.toFixed(0)}</div>
                        <div style="width:100%;background:${cor};border-radius:6px 6px 0 0;height:${altura}px;min-height:20px;transition:var(--transition);"></div>
                        <div style="font-size:0.7em;color:var(--text-muted);text-align:center;line-height:1.1;">
                            <div style="font-weight:700;color:var(--text-secondary);">${d.labelDia}</div>
                            <div>${d.label}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (e) { tratarErro(e); }
}
window.carregarDashboard = carregarDashboard;

// ============================================================
// ESTOQUE
// ============================================================
async function carregarEstoque() {
    try {
        mostrarSkeleton('listaEstoque', 3);
        const { data, error } = await sb.from('estoquecentral').select('*').order('nome');
        if (error) throw error;
        State.cache.estoque = data || [];
        renderizarEstoque(State.cache.estoque);

        const sel = document.getElementById('alocarSabor');
        if (sel) {
            sel.innerHTML = '<option value="">Selecione...</option>';
            State.cache.estoque.forEach(i => {
                const d = (i.quantidadetotal || 0) - (i.alocadocardapio2 || 0);
                if (d > 0) sel.innerHTML += `<option value="${i.id}">${Utils.escapeHtml(i.nome)} - ${d}</option>`;
            });
        }
    } catch (e) { tratarErro(e); }
}
window.carregarEstoque = carregarEstoque;

function renderizarEstoque(data) {
    const l = document.getElementById('listaEstoque');
    if (!l) return;

    if (data.length === 0) {
        l.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span><div>Estoque vazio</div></div>';
        return;
    }

    l.innerHTML = data.map(i => {
        const total = i.quantidadetotal || 0;
        const c2 = i.alocadocardapio2 || 0;
        const dispC1 = total - c2;
        const preco = i.preco || 0;
        const valorEstoque = total * preco;

        let badgeC1, badgeC1Class;
        if (dispC1 <= 0) { badgeC1Class = 'badge-baixo'; badgeC1 = '🔴 Esgotado'; }
        else if (dispC1 <= 5) { badgeC1Class = 'badge-pendente'; badgeC1 = '⚠️ Poucas unid.'; }
        else { badgeC1Class = 'badge-pago'; badgeC1 = '✅ Disponível'; }

        let badgeC2, badgeC2Class;
        if (c2 <= 0) { badgeC2Class = 'badge-inativo'; badgeC2 = '⚪ Não alocado'; }
        else if (c2 <= 5) { badgeC2Class = 'badge-pendente'; badgeC2 = '⚠️ Poucas unid.'; }
        else { badgeC2Class = 'badge-pago'; badgeC2 = '✅ Disponível'; }

        const fotoHtml = i.foto
            ? `<img src="${i.foto}" class="item-foto" alt="${Utils.escapeHtml(i.nome)}">`
            : `<div class="foto-placeholder">${i.emoji || '🍦'}</div>`;

        return `
            <div class="card-item" style="flex-direction:column;align-items:stretch;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:200px;">
                        ${fotoHtml}
                        <div>
                            <strong style="color:var(--dourado);font-size:1.15em;">${i.emoji || '🍦'} ${Utils.escapeHtml(i.nome)}</strong>
                            <br>
                            <small style="color:var(--text-secondary);font-size:1em;">💰 R$ ${preco.toFixed(2)} por unidade</small>
                        </div>
                    </div>
                    <div class="card-item-actions">
                        <button class="btn btn-warning btn-sm" onclick="editarItem(${i.id})">✏️ Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="excluirItem(${i.id})">🗑️</button>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:14px;">
                    <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;border-left:4px solid var(--dourado);">
                        <div style="font-size:0.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">📦 Estoque Total</div>
                        <div style="font-size:1.4em;font-weight:800;color:var(--dourado);">${total} <span style="font-size:0.5em;">unid.</span></div>
                    </div>

                    <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;border-left:4px solid var(--info);">
                        <div style="font-size:0.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">📋 Cardápio 1</div>
                        <div style="font-size:1.4em;font-weight:800;color:${dispC1 > 5 ? 'var(--success)' : dispC1 > 0 ? '#f59e0b' : 'var(--danger)'};">${dispC1} <span style="font-size:0.5em;">unid.</span></div>
                        <span class="badge ${badgeC1Class}" style="margin-top:6px;">${badgeC1}</span>
                    </div>

                    <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;border-left:4px solid #ef4444;">
                        <div style="font-size:0.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">🔥 Cardápio 2</div>
                        <div style="font-size:1.4em;font-weight:800;color:${c2 > 5 ? 'var(--success)' : c2 > 0 ? '#f59e0b' : 'var(--text-muted)'};">${c2} <span style="font-size:0.5em;">unid.</span></div>
                        <span class="badge ${badgeC2Class}" style="margin-top:6px;">${badgeC2}</span>
                    </div>

                    <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;border-left:4px solid var(--success);">
                        <div style="font-size:0.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">💰 Valor em Estoque</div>
                        <div style="font-size:1.4em;font-weight:800;color:var(--success);">R$ ${valorEstoque.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function cadastrarItem() {
    const btn = document.querySelector('#conteudo-estoque .btn-primary');
    await executarComLoading(btn, '⏳ Cadastrando...', async () => {
        const nome = document.getElementById('estoqueNome').value.trim();
        const emoji = document.getElementById('estoqueEmoji').value.trim() || '🍦';
        const preco = parseFloat(document.getElementById('estoquePreco').value);
        const qtd = parseInt(document.getElementById('estoqueQtd').value) || 0;
        if (!nome || !Utils.validarPreco(preco)) { mostrarToast('Preencha corretamente', 'warning'); return; }
        const { data: ex } = await sb.from('estoquecentral').select('*').eq('nome', nome).maybeSingle();
        if (ex) {
            await sb.from('estoquecentral').update({ quantidadetotal: (ex.quantidadetotal || 0) + qtd, preco, emoji, foto: State.fotoEmBase64 || ex.foto }).eq('id', ex.id);
            mostrarToast('Atualizado!');
        } else {
            await sb.from('estoquecentral').insert([{ nome, emoji, preco, quantidadetotal: qtd || 50, alocadocardapio2: 0, foto: State.fotoEmBase64 }]);
            mostrarToast('Cadastrado!');
        }
        State.fotoEmBase64 = null;
        document.getElementById('previewFotoContainer').style.display = 'none';
        document.getElementById('estoqueNome').value = '';
        document.getElementById('estoquePreco').value = '';
        await carregarEstoque();
        await carregarC1();
        await carregarDashboard();
    });
}
window.cadastrarItem = cadastrarItem;

function editarItem(id) { abrirModalEditarEstoque(id); }
window.editarItem = editarItem;

async function excluirItem(id) {
    if (!confirm('Excluir?')) return;
    try {
        await sb.from('estoquecentral').delete().eq('id', id);
        await carregarEstoque();
        await carregarC1();
        await carregarDashboard();
        mostrarToast('Excluído!');
    } catch (e) { tratarErro(e); }
}
window.excluirItem = excluirItem;

// ============================================================
// MODAL EDITAR ESTOQUE
// ============================================================
function abrirModalEditarEstoque(id) {
    const item = State.cache.estoque.find(x => x.id === id);
    if (!item) return;
    document.getElementById('editarEstoqueId').value = item.id;
    document.getElementById('editarEstoqueNome').value = item.nome || '';
    document.getElementById('editarEstoquePreco').value = item.preco || 0;
    document.getElementById('editarEstoqueQtd').value = item.quantidadetotal || 0;
    document.getElementById('modalEditarEstoque').classList.add('active');
    document.getElementById('editarEstoqueNome').focus();
}
window.abrirModalEditarEstoque = abrirModalEditarEstoque;

function fecharModalEditarEstoque() { document.getElementById('modalEditarEstoque').classList.remove('active'); }
window.fecharModalEditarEstoque = fecharModalEditarEstoque;

async function salvarEdicaoEstoque() {
    const btn = document.querySelector('#modalEditarEstoque .btn-success');
    await executarComLoading(btn, '⏳ Salvando...', async () => {
        const id = document.getElementById('editarEstoqueId').value;
        const nome = document.getElementById('editarEstoqueNome').value.trim();
        const preco = parseFloat(document.getElementById('editarEstoquePreco').value);
        const qtd = parseInt(document.getElementById('editarEstoqueQtd').value);
        if (!nome) { mostrarToast('Digite o nome', 'warning'); return; }
        if (isNaN(preco) || preco < 0) { mostrarToast('Preço inválido', 'warning'); return; }
        if (isNaN(qtd) || qtd < 0) { mostrarToast('Quantidade inválida', 'warning'); return; }
        const item = State.cache.estoque.find(x => x.id == id);
        const dif = qtd - (item?.quantidadetotal || 0);
        const { error } = await sb.from('estoquecentral').update({ nome, preco, quantidadetotal: qtd }).eq('id', id);
        if (error) throw error;
        if (dif !== 0) {
            try {
                await sb.from('historicoestoque').insert([{ data: new Date().toLocaleString('pt-BR'), tipo: dif > 0 ? 'entrada' : 'saida', item: nome, quantidade: Math.abs(dif), obs: 'Ajuste via modal' }]);
            } catch (e) {}
        }
        fecharModalEditarEstoque();
        await carregarEstoque();
        await carregarC1();
        await carregarDashboard();
        mostrarToast('✅ Item atualizado!', 'success');
    });
}
window.salvarEdicaoEstoque = salvarEdicaoEstoque;

// ============================================================
// CARDÁPIO 1
// ============================================================
async function carregarC1() {
    try {
        const { data } = await sb.from('estoquecentral').select('*').order('nome');
        const c1 = (data || []).map(i => ({
            nome: i.nome, emoji: i.emoji || '🍦', foto: i.foto, preco: i.preco,
            qtd: (i.quantidadetotal || 0) - (i.alocadocardapio2 || 0)
        })).filter(i => i.qtd > 0);
        const l = document.getElementById('listaC1');
        if (c1.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><div>Vazio</div></div>'; return; }
        l.innerHTML = c1.map(i => `<div class="card-item"><div class="card-item-info">${i.foto ? `<img src="${i.foto}" class="item-foto">` : `<div class="foto-placeholder">${i.emoji}</div>`}<div><strong>${i.emoji} ${Utils.escapeHtml(i.nome)}</strong><br><small>R$ ${i.preco.toFixed(2)} | Disp: ${i.qtd}</small></div></div></div>`).join('');
    } catch (e) { tratarErro(e); }
}
window.carregarC1 = carregarC1;

// ============================================================
// CARDÁPIO 2
// ============================================================
async function alocarC2() {
    const btn = document.querySelector('#conteudo-c2 .btn-success');
    await executarComLoading(btn, '⏳ Alocando...', async () => {
        const id = document.getElementById('alocarSabor').value;
        const q = parseInt(document.getElementById('alocarQtd').value);
        if (!id || !q || q < 1) { mostrarToast('Selecione', 'warning'); return; }
        const { data: it } = await sb.from('estoquecentral').select('*').eq('id', id).single();
        const disp = (it.quantidadetotal || 0) - (it.alocadocardapio2 || 0);
        if (q > disp) { mostrarToast('Máx: ' + disp, 'warning'); return; }
        await sb.from('estoquecentral').update({ alocadocardapio2: (it.alocadocardapio2 || 0) + q }).eq('id', id);
        await carregarEstoque();
        await carregarC1();
        await carregarC2();
        await carregarDashboard();
        mostrarToast('Alocado!');
    });
}
window.alocarC2 = alocarC2;

async function carregarC2() {
    try {
        const { data } = await sb.from('estoquecentral').select('*').gt('alocadocardapio2', 0).order('nome');
        State.cache.c2 = data || [];
        const l = document.getElementById('listaC2');
        if (State.cache.c2.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">🔥</span><div>Vazio</div></div>'; return; }
        l.innerHTML = State.cache.c2.map(i => `<div class="card-item"><div class="card-item-info">${i.foto ? `<img src="${i.foto}" class="item-foto">` : `<div class="foto-placeholder">${i.emoji || '🔥'}</div>`}<div><strong>${i.emoji || '🔥'} ${Utils.escapeHtml(i.nome)}</strong><br><small>R$ ${(i.preco || 0).toFixed(2)} | Qtd: ${i.alocadocardapio2 || 0}</small></div></div><div class="card-item-actions"><button class="btn btn-warning btn-sm" onclick="editarAlocacao(${i.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirC2(${i.id})">🗑️</button></div></div>`).join('');
    } catch (e) { tratarErro(e); }
}
window.carregarC2 = carregarC2;

async function editarAlocacao(id) {
    const item = State.cache.c2.find(x => x.id === id);
    if (!item) return;
    const atual = item.alocadocardapio2 || 0;
    const novaQtd = prompt(`Quantidade alocada no Cardápio 2:\n(Atual: ${atual})`, atual);
    if (novaQtd === null) return;
    const q = parseInt(novaQtd);
    if (isNaN(q) || q < 0) { mostrarToast('Quantidade inválida', 'warning'); return; }
    try {
        await sb.from('estoquecentral').update({ alocadocardapio2: q }).eq('id', id);
        await carregarEstoque();
        await carregarC2();
        await carregarC1();
        mostrarToast('Alocação atualizada!', 'success');
    } catch (e) { tratarErro(e); }
}
window.editarAlocacao = editarAlocacao;

async function excluirC2(id) {
    if (!confirm('Remover alocação do Cardápio 2?')) return;
    try {
        await sb.from('estoquecentral').update({ alocadocardapio2: 0 }).eq('id', id);
        await carregarEstoque();
        await carregarC2();
        await carregarC1();
        mostrarToast('Alocação removida!');
    } catch (e) { tratarErro(e); }
}
window.excluirC2 = excluirC2;

// ============================================================
// PEDIDOS
// ============================================================
async function carregarPedidos(page = 1) {
    try {
        State.pagination.pedidos.page = page;
        const limit = 10, from = (page - 1) * limit, to = from + limit - 1;
        mostrarSkeleton('listaPedidos', 3);
        let q = sb.from('todospedidos').select('*', { count: 'exact' }).order('id', { ascending: false }).range(from, to);
        const s = document.getElementById('filtroPedidosStatus')?.value;
        const c = document.getElementById('filtroPedidosCliente')?.value?.trim();
        const tel = document.getElementById('filtroPedidosTelefone')?.value?.trim();
        const i = document.getElementById('filtroPedidosInicio')?.value;
        const f = document.getElementById('filtroPedidosFim')?.value;
        if (s && s !== 'todos') q = q.eq('status', s);
        if (c) q = q.ilike('cliente', `%${c}%`);
        if (tel) {
            const telLimpo = tel.replace(/\D/g, '');
            if (telLimpo) q = q.ilike('telefone', `%${telLimpo}%`);
        }
        if (i) q = q.gte('data', i);
        if (f) q = q.lte('data', f);
        const { data, count } = await q;
        State.cache.pedidos = data || [];
        State.pagination.pedidos.total = count || 0;
        State.pagination.pedidos.totalPages = Math.ceil((count || 0) / limit);
        renderizarPedidos(State.cache.pedidos);
        document.getElementById('pedidosCount').textContent = count || 0;
        renderPagination('paginacaoPedidos', page, State.pagination.pedidos.totalPages, count || 0, p => carregarPedidos(p));
    } catch (e) { tratarErro(e); }
}
window.carregarPedidos = carregarPedidos;

function renderizarPedidos(p) {
    const l = document.getElementById('listaPedidos');
    if (p.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><div>Nenhum pedido</div></div>'; return; }

    function fmtPagamento(valor) {
        if (!valor) return '—';
        const v = String(valor).toLowerCase().trim();
        if (v.includes('pix')) return '📱 PIX';
        if (v.includes('cartao') || v.includes('cartão')) return '💳 Cartão (Crédito ou Débito)';
        if (v.includes('dinheiro')) return '💵 Dinheiro';
        if (v.includes('credito') || v.includes('crédito')) return '💳 Crédito';
        return valor;
    }

    l.innerHTML = p.map(x => {
        const obs = x.obs || '';

        let origem = '❓ Não identificado';
        if (obs.includes('Cardápio 1')) origem = '🍦 Cardápio 1';
        else if (obs.includes('Cardápio 2')) origem = '🔥 Cardápio 2';

        const formaPagamento = fmtPagamento(x.pagamentostatus);

        let localTexto = '—';
        const matchSetor = obs.match(/Entrega:\s*([^|]+)/);
        if (matchSetor) {
            localTexto = `📍 Entrega: ${matchSetor[1].trim()}`;
        } else if (obs.includes('Retirada no local')) {
            localTexto = '📍 Retirada no local';
        }

        const matchTaxa = obs.match(/taxa=([\d.]+)/);
        const taxa = matchTaxa ? parseFloat(matchTaxa[1]) || 0 : 0;

        let ih = '';
        let subtotal = 0;
        if (x.itens && x.itens.length > 0) {
            ih = '<div class="pedido-itens"><strong>🛒 ITENS:</strong>';
            x.itens.forEach(it => {
                const qtd = it.quantidade || 0;
                const preco = it.preco || 0;
                const sub = qtd * preco;
                subtotal += sub;
                ih += `<div class="pedido-item-linha"><span>• ${qtd}x ${Utils.escapeHtml(it.nome || '')}</span><span>R$ ${sub.toFixed(2)}</span></div>`;
            });
            ih += '</div>';
        }

        const sp = x.pagamentostatus === 'pago' ? '<span class="badge badge-pago">✅ PAGO</span>' : '<span class="badge badge-pendente">⏳ PENDENTE</span>';
        const st = (x.status || 'novo').toLowerCase();
        const map = {
            entregue: '<span class="badge badge-entregue">✅ Entregue</span>',
            entrega: '<span class="badge badge-entrega">🛵 Entrega</span>',
            preparo: '<span class="badge badge-preparo">👨‍🍳 Preparo</span>',
            cancelado: '<span class="badge badge-cancelado">❌ Cancelado</span>'
        };
        const spd = map[st] || '<span class="badge badge-novo">🆕 Novo</span>';

        let be = '';
        if (st !== 'entregue' && st !== 'cancelado') be = `<button class="btn btn-deliver btn-sm" onclick="marcarEntregue(${x.id})">✅ Entregue</button>`;
        else if (st === 'entregue') be = '<span style="color:#6ee7b7;font-weight:bold;background:#064e3b;padding:4px 14px;border-radius:20px;font-size:12px;">✔ Entregue</span>';
        const bw = x.telefone ? `<button class="btn btn-whatsapp btn-sm" onclick="abrirWhatsapp('${x.telefone}','${Utils.escapeHtml(x.cliente)}',${x.total || 0})">📱</button>` : '';

        const pedidoId = x.pedido_id || `#${x.id}`;
        const descontoTag = x.desconto ? `<span class="badge badge-pendente" style="background:#8b5cf6;color:white;">🎁 ${Utils.escapeHtml(x.desconto)}</span>` : '';

        return `
            <div class="card-item" style="flex-direction:column;align-items:stretch;">
                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                    <div>
                        <strong style="color:var(--dourado);font-size:1.1em;">📦 ${pedidoId}</strong>
                        <br>
                        <strong>👤 ${Utils.escapeHtml(x.cliente)}</strong> ${descontoTag}
                        <br>
                        <small>📱 ${x.telefone ? Utils.mascararTelefone(x.telefone) : 'N/A'} | 📅 ${Utils.formatarData(x.data)}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:var(--dourado);font-size:1.2em;">R$ ${(x.total || 0).toFixed(2)}</strong>
                        <br>
                        ${sp} ${spd}
                    </div>
                </div>

                <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:10px;margin-top:10px;font-size:0.9em;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;">
                        <div><strong>📋 Origem:</strong> ${origem}</div>
                        <div><strong>💳 Pagamento:</strong> ${formaPagamento}</div>
                        <div><strong>${localTexto}</strong></div>
                        ${taxa > 0 ? `<div><strong>🛵 Taxa:</strong> R$ ${taxa.toFixed(2)}</div>` : ''}
                    </div>
                </div>

                ${ih}

                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border-color);">
                    <div style="font-size:0.9em;color:var(--text-secondary);">
                        💰 Subtotal: <strong>R$ ${subtotal.toFixed(2)}</strong>
                        ${taxa > 0 ? `<br>🛵 Taxa: <strong>R$ ${taxa.toFixed(2)}</strong>` : ''}
                    </div>
                    <div style="font-size:1.1em;color:var(--dourado);font-weight:800;">
                        💵 TOTAL: R$ ${(x.total || 0).toFixed(2)}
                    </div>
                </div>

                <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
                    ${be} ${bw} <button class="btn btn-danger btn-sm" onclick="excluirPedido(${x.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

async function marcarEntregue(id) {
    if (!confirm(`Marcar pedido #${id} como entregue?`)) return;
    try {
        await sb.from('todospedidos').update({ status: 'entregue' }).eq('id', id);
        await carregarPedidos(State.pagination.pedidos.page);
        mostrarToast('Entregue!');
    } catch (e) { tratarErro(e); }
}
window.marcarEntregue = marcarEntregue;

function aplicarFiltroPedidos() { carregarPedidos(1); }
function limparFiltroPedidos() {
    ['filtroPedidosStatus', 'filtroPedidosCliente', 'filtroPedidosTelefone', 'filtroPedidosInicio', 'filtroPedidosFim'].forEach(i => document.getElementById(i).value = i === 'filtroPedidosStatus' ? 'todos' : '');
    carregarPedidos(1);
}
window.aplicarFiltroPedidos = aplicarFiltroPedidos;
window.limparFiltroPedidos = limparFiltroPedidos;

// ============================================================
// EXCLUIR PEDIDO (DEVOLVE ESTOQUE)
// ============================================================
async function excluirPedido(id) {
    const pedido = State.cache.pedidos.find(p => p.id === id);
    if (!pedido) { mostrarToast('Pedido não encontrado', 'error'); return; }

    if (!confirm('🗑️ Excluir este pedido?\n\nO estoque dos itens será DEVOLVIDO automaticamente.')) return;

    try {
        if (pedido.itens && pedido.itens.length > 0) {
            for (const item of pedido.itens) {
                const nome = item.nome;
                const qtd = item.quantidade || 0;
                if (!nome || qtd <= 0) continue;

                const { data: prod } = await sb
                    .from('estoquecentral')
                    .select('*')
                    .ilike('nome', nome)
                    .maybeSingle();

                if (prod) {
                    const novoTotal = (prod.quantidadetotal || 0) + qtd;
                    await sb
                        .from('estoquecentral')
                        .update({ quantidadetotal: novoTotal })
                        .eq('id', prod.id);

                    try {
                        await sb.from('historicoestoque').insert([{
                            data: new Date().toLocaleString('pt-BR'),
                            tipo: 'entrada',
                            item: nome,
                            quantidade: qtd,
                            obs: `Devolução - Pedido ${pedido.pedido_id || '#' + id} excluído`
                        }]);
                    } catch (e) { }
                }
            }
        }

        const { error } = await sb.from('todospedidos').delete().eq('id', id);
        if (error) throw error;

        await carregarPedidos(State.pagination.pedidos.page);
        await carregarDashboard();
        await carregarEstoque();
        await carregarC1();
        await carregarC2();

        mostrarToast('🗑️ Pedido excluído e estoque devolvido!', 'success');

    } catch (e) { tratarErro(e, 'Erro ao excluir pedido'); }
}
window.excluirPedido = excluirPedido;

function abrirWhatsapp(tel, nome, total) {
    const n = tel.replace(/\D/g, '');
    if (!Utils.validarTelefone(n)) { mostrarToast('Tel inválido', 'error'); return; }
    const w = State.cache.config?.whatsapp || n;
    const m = `🍦 Olá ${nome}!\n\nSeu pedido está sendo preparado.\nValor: R$ ${total.toFixed(2)}\n\nPIX: ${State.cache.config?.pix || ''}`;
    window.open(`https://wa.me/55${w}?text=${encodeURIComponent(m)}`, '_blank');
}
window.abrirWhatsapp = abrirWhatsapp;

// ============================================================
// CSV
// ============================================================
function exportarPedidosCSV() {
    const p = State.cache.pedidos || [];
    if (p.length === 0) { mostrarToast('Sem pedidos', 'warning'); return; }
    let c = 'ID,Cliente,Telefone,Total,Status,Data\n';
    p.forEach(x => c += `${x.pedido_id || x.id},"${x.cliente}","${x.telefone || ''}",${(x.total || 0).toFixed(2)},${x.status || 'novo'},${Utils.formatarData(x.data)}\n`);
    const blob = new Blob(['\uFEFF' + c], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarToast('Exportado!');
}
window.exportarPedidosCSV = exportarPedidosCSV;

// ============================================================
// REALTIME
// ============================================================
async function iniciarRealtime() {
    if (State.realtimeChannel) await sb.removeChannel(State.realtimeChannel);
    State.realtimeChannel = sb.channel('pedidos-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'todospedidos' }, (p) => {
            mostrarToast(`🆕 Novo pedido de ${p.new.cliente}!`, 'info');
            if (document.getElementById('conteudo-dashboard').classList.contains('active')) carregarDashboard();
            if (document.getElementById('conteudo-pedidos').classList.contains('active')) carregarPedidos(1);
        }).subscribe();
}

// ============================================================
// CARREGAR TUDO
// ============================================================
async function carregarTudo() {
    try {
        const tarefas = [
            carregarDashboard(),
            carregarEstoque(),
            carregarC1(),
            carregarC2()
        ];
        if (temPermissao('setores')) tarefas.push(carregarSetores());
        if (temPermissao('insumos')) tarefas.push(carregarInsumos());
        await Promise.all(tarefas);
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
    } finally {
        setTimeout(reaplicarPermissoes, 200);
    }
}
window.carregarTudo = carregarTudo;

// ============================================================
// EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    verificarConexao();

    ['filtroPedidosTelefone', 'filtroPagamentosTelefone', 'filtroFinanceiroTelefone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', function() {
            let v = this.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
            if (v.length > 10) v = v.slice(0, 10) + '-' + v.slice(10);
            this.value = v;
        });
    });

    document.querySelectorAll('.tab-btn').forEach(b => {
        b.addEventListener('click', function() {
            mudarTab(this.getAttribute('data-tab'));
        });
    });

    document.getElementById('campoEmail').focus();

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            fecharModalTrocaSenha();
            if (typeof fecharModalInsumo === 'function') fecharModalInsumo();
            if (typeof fecharModalReceita === 'function') fecharModalReceita();
            fecharModalEditarEstoque();
            if (typeof fecharModalLembrete === 'function') fecharModalLembrete();
            if (typeof fecharModalDesconto === 'function') fecharModalDesconto();
            if (typeof fecharModalValorPago === 'function') fecharModalValorPago();
        }
    });

    document.getElementById('modalTrocaSenha').addEventListener('click', function(e) { if (e.target === this) fecharModalTrocaSenha(); });
    document.getElementById('modalEditarEstoque').addEventListener('click', function(e) { if (e.target === this) fecharModalEditarEstoque(); });

    document.getElementById('modalNovaSenha').addEventListener('input', function() { verificarForcaSenhaModal(this.value); });
    document.getElementById('campoSenha').addEventListener('keypress', e => { if (e.key === 'Enter') fazerLogin(); });

    verificarSessao();

    // 🛡️ PROTEÇÃO CONTÍNUA: monitora as abas por 60 segundos
    let _protecaoTentativas = 0;
    const _protecaoIntervalo = setInterval(() => {
        if (State.adminData && !State.isMaster) {
            const map = getPermissaoMap();
            let precisaCorrigir = false;
            document.querySelectorAll('.tab-btn').forEach(btn => {
                const tab = btn.getAttribute('data-tab');
                if (['dashboard', 'config'].includes(tab)) return;
                const permitido = map[tab] === true;
                const visivel = btn.style.display !== 'none';
                if (permitido !== visivel) precisaCorrigir = true;
            });
            if (precisaCorrigir) aplicarPermissoes();
        }
        _protecaoTentativas++;
        if (_protecaoTentativas >= 120) clearInterval(_protecaoIntervalo);
    }, 500);

    // 🛡️ BLOQUEIO de clique em abas proibidas
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn || !State.adminData || State.isMaster) return;
        const tab = btn.getAttribute('data-tab');
        if (['dashboard', 'config'].includes(tab)) return;
        const map = getPermissaoMap();
        if (map[tab] !== true) {
            e.preventDefault();
            e.stopPropagation();
            mostrarToast('⛔ Você não tem permissão para acessar esta aba.', 'error');
            aplicarPermissoes();
            return false;
        }
    }, true);
});

console.log('✅ Admin parte 1 carregado! v20.1 (MASTER POR FLAG + PROTEÇÃO)');
console.log('👑 is_master lido direto do banco');
console.log('🛡️ Sistema de permissões BLINDADO');
console.log('🔒 Abas proibidas são escondidas e bloqueadas no clique');
