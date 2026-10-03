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

supabase.auth.onAuthStateChange((event, session) => {
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
    pagination: { pedidos: { page: 1, limit: 10, total: 0 }, auditoria: { page: 1, limit: 10, total: 0 } },
    cache: { estoque: [], c2: [], pedidos: [], historico: [], setores: [], insumos: [], receitas: [], config: {}, audit: [] },
    loading: {},
    fotoEmBase64: null,
    realtimeChannel: null,
    ingredientesTemporarios: []
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
        const { error } = await supabase.from('estoquecentral').select('*').limit(1);
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
        const { data: rateCheck, error: rateError } = await supabase.rpc('check_login_rate_limit', { p_email: email });

        if (rateError) {
            console.warn('Erro ao verificar rate limit:', rateError);
        } else if (rateCheck && rateCheck.allowed === false) {
            erroEl.textContent = '❌ ' + (rateCheck.mensagem || 'Muitas tentativas. Aguarde 15 minutos.');
            erroEl.style.display = 'block';
            mostrarToast('Muitas tentativas. Aguarde.', 'error');
            return;
        }

        bar.style.width = '60%';

        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

        try {
            await supabase.rpc('registrar_tentativa_login', { p_email: email, p_sucesso: !error });
        } catch (e) { console.warn('Erro ao registrar tentativa:', e); }

        if (error) throw error;

        bar.style.width = '100%';

        if (!data.user.email_confirmed_at) { await supabase.auth.signOut(); throw new Error('E-mail não confirmado.'); }

        const { data: adminData, error: adminErr } = await supabase.from('admin_usuarios').select('*').eq('user_id', data.user.id).maybeSingle();

        if (adminErr) throw adminErr;
        if (!adminData) throw new Error('Sem permissões.');
        if (!adminData.ativo) throw new Error('Usuário desativado.');

        State.user = data.user;
        State.adminData = adminData;
        State.session = data.session;

        entrarPainel();
        mostrarToast('Bem-vindo, ' + adminData.nome + '!', 'success');

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
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password.html' });
        if (error) throw error;
        mostrarToast('📧 E-mail enviado!', 'success');
    } catch (e) { mostrarToast(e.message, 'error'); }
}
window.esqueciSenha = esqueciSenha;

function entrarPainel() {
    document.getElementById('telaLogin').classList.add('hidden');
    document.getElementById('painelAdmin').classList.add('active');
    document.getElementById('userLogado').textContent = '👤 ' + Utils.escapeHtml(State.adminData.nome);
    aplicarPermissoes();
    iniciarRealtime();
    carregarTudo();
}

async function sair() {
    try {
        await supabase.auth.signOut();
        if (State.realtimeChannel) await supabase.removeChannel(State.realtimeChannel);
        State.user = null; State.adminData = null;
        document.getElementById('telaLogin').classList.remove('hidden');
        document.getElementById('painelAdmin').classList.remove('active');
    } catch (e) { mostrarToast(e.message, 'error'); }
}
window.sair = sair;

async function verificarSessao() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: adminData } = await supabase.from('admin_usuarios').select('*').eq('user_id', session.user.id).maybeSingle();
            if (adminData && adminData.ativo) {
                State.user = session.user;
                State.adminData = adminData;
                State.session = session;
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
    const p = State.adminData.permissoes || {};
    const isMaster = State.adminData.user_id === State.user?.id;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        if (isMaster || ['dashboard', 'config'].includes(tab)) { btn.style.display = 'flex'; return; }
        const map = {
            estoque: p.estoque, c1: p.cardapio1, c2: p.cardapio2,
            pedidos: p.pedidos, pagamentos: p.pagamentos, financeiro: p.financeiro,
            ranking: p.pedidos, historico: p.estoque, insumos: p.insumos,
            calculadora: p.calculadora, setores: p.setores,
            admins: p.admins, auditoria: p.auditoria || p.admins
        };
        btn.style.display = map[tab] ? 'flex' : 'none';
    });
}

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
        const { error: ve } = await supabase.auth.signInWithPassword({ email: State.user.email, password: a });
        if (ve) { m.textContent = 'Senha atual incorreta!'; m.style.color = '#ef4444'; return; }
        const { error: ue } = await supabase.auth.updateUser({ password: n });
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
    document.querySelectorAll('.conteudo').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const c = document.getElementById('conteudo-' + tab);
    if (c) c.classList.add('active');
    const t = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (t) t.classList.add('active');
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
    const { data: { session } } = await supabase.auth.getSession();
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
        const { data } = await supabase.from('admin_usuarios').select('*').order('criado_em', { ascending: false });
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
            const isCurrent = a.user_id === State.user?.id;
            return `<div class="card-item"><div class="card-item-info"><div><strong>👤 ${Utils.escapeHtml(a.nome)}</strong><br><small>${Utils.escapeHtml(a.email)} | ${a.ativo ? '✅' : '⛔'} ${isCurrent ? '(Você)' : ''}<br>Perm: ${perms.join(' ')}</small></div></div><div class="card-item-actions">${!isCurrent ? `<button class="btn btn-warning btn-sm" onclick="toggleAdminStatus('${a.user_id}')">🔒</button><button class="btn btn-danger btn-sm" onclick="excluirAdminSupabase('${a.user_id}')">🗑️</button>` : ''}</div></div>`;
        }).join('');
    } catch (e) { tratarErro(e); }
}
window.carregarListaAdmins = carregarListaAdmins;

async function toggleAdminStatus(userId) {
    try {
        const { data: a } = await supabase.from('admin_usuarios').select('*').eq('user_id', userId).single();
        if (!a) return;
        if (!confirm(`Alterar status de "${a.nome}"?`)) return;
        await supabase.from('admin_usuarios').update({ ativo: !a.ativo }).eq('user_id', userId);
        await carregarListaAdmins();
        mostrarToast('Status alterado!');
    } catch (e) { tratarErro(e); }
}
window.toggleAdminStatus = toggleAdminStatus;

async function excluirAdminSupabase(userId) {
    try {
        if (!confirm('Excluir permanentemente?')) return;
        await chamarEdgeFunction('delete_user', { userId });
        await carregarListaAdmins();
        mostrarToast('Excluído!');
    } catch (e) { tratarErro(e); }
}
window.excluirAdminSupabase = excluirAdminSupabase;

// ============================================================
// DASHBOARD
// ============================================================
async function carregarDashboard() {
    try {
        mostrarSkeleton('dashboardCards', 4);
        const [e, p, i] = await Promise.all([
            supabase.from('estoquecentral').select('*'),
            supabase.from('todospedidos').select('*'),
            supabase.from('insumos').select('*').then(r => r.error ? { data: [] } : r)
        ]);
        const estoque = e.data || [], pedidos = p.data || [], insumos = i.data || [];
        const totalEstoque = estoque.reduce((s, x) => s + (x.quantidadetotal || 0), 0);
        const hoje = new Date().toDateString();
        const pedidosHoje = pedidos.filter(x => { try { return new Date(x.data).toDateString() === hoje; } catch { return false; } });
        const fatHoje = pedidosHoje.filter(x => x.pagamentostatus === 'pago').reduce((s, x) => s + (x.total || 0), 0);
        const insumosCriticos = insumos.filter(x => (x.quantidade_estoque || 0) <= (x.quantidade_minima || 0)).length;
        document.getElementById('dashboardCards').innerHTML = `
            <div class="dash-card"><div class="icon">📦</div><div class="valor">${totalEstoque}</div><div class="label">Estoque</div></div>
            <div class="dash-card"><div class="icon">📋</div><div class="valor">${pedidosHoje.length}</div><div class="label">Pedidos Hoje</div></div>
            <div class="dash-card"><div class="icon">💰</div><div class="valor">R$ ${fatHoje.toFixed(2)}</div><div class="label">Faturamento</div></div>
            <div class="dash-card"><div class="icon">🧪</div><div class="valor">${insumosCriticos}</div><div class="label">Insumos Críticos</div></div>`;
    } catch (e) { tratarErro(e); }
}
window.carregarDashboard = carregarDashboard;

// ============================================================
// ESTOQUE
// ============================================================
async function carregarEstoque() {
    try {
        mostrarSkeleton('listaEstoque', 3);
        const { data, error } = await supabase.from('estoquecentral').select('*').order('nome');
        if (error) throw error;
        State.cache.estoque = data || [];
        const l = document.getElementById('listaEstoque');
        if (State.cache.estoque.length === 0) {
            l.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span><div>Estoque vazio</div></div>';
        } else {
            l.innerHTML = State.cache.estoque.map(i => {
                const d = (i.quantidadetotal || 0) - (i.alocadocardapio2 || 0);
                const b = d <= 5 ? 'badge-baixo' : 'badge-normal';
                const f = i.foto ? `<img src="${i.foto}" class="item-foto">` : `<div class="foto-placeholder">${i.emoji || '🍦'}</div>`;
                return `<div class="card-item"><div class="card-item-info">${f}<div><strong>${i.emoji || '🍦'} ${Utils.escapeHtml(i.nome)}</strong><br><small>R$ ${(i.preco || 0).toFixed(2)} | Total: ${i.quantidadetotal || 0} | C2: ${i.alocadocardapio2 || 0} | <span class="badge ${b}">Disp: ${d}</span></small></div></div><div class="card-item-actions"><button class="btn btn-warning btn-sm" onclick="editarItem(${i.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirItem(${i.id})">🗑️</button></div></div>`;
            }).join('');
        }
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

async function cadastrarItem() {
    const btn = document.querySelector('#conteudo-estoque .btn-primary');
    await executarComLoading(btn, '⏳ Cadastrando...', async () => {
        const nome = document.getElementById('estoqueNome').value.trim();
        const emoji = document.getElementById('estoqueEmoji').value.trim() || '🍦';
        const preco = parseFloat(document.getElementById('estoquePreco').value);
        const qtd = parseInt(document.getElementById('estoqueQtd').value) || 0;
        if (!nome || !Utils.validarPreco(preco)) { mostrarToast('Preencha corretamente', 'warning'); return; }
        const { data: ex } = await supabase.from('estoquecentral').select('*').eq('nome', nome).maybeSingle();
        if (ex) {
            await supabase.from('estoquecentral').update({ quantidadetotal: (ex.quantidadetotal || 0) + qtd, preco, emoji, foto: State.fotoEmBase64 || ex.foto }).eq('id', ex.id);
            mostrarToast('Atualizado!');
        } else {
            await supabase.from('estoquecentral').insert([{ nome, emoji, preco, quantidadetotal: qtd || 50, alocadocardapio2: 0, foto: State.fotoEmBase64 }]);
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
        await supabase.from('estoquecentral').delete().eq('id', id);
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
        const { error } = await supabase.from('estoquecentral').update({ nome, preco, quantidadetotal: qtd }).eq('id', id);
        if (error) throw error;
        if (dif !== 0) {
            try {
                await supabase.from('historicoestoque').insert([{ data: new Date().toLocaleString('pt-BR'), tipo: dif > 0 ? 'entrada' : 'saida', item: nome, quantidade: Math.abs(dif), obs: 'Ajuste via modal' }]);
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
        const { data } = await supabase.from('estoquecentral').select('*').order('nome');
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
        const { data: it } = await supabase.from('estoquecentral').select('*').eq('id', id).single();
        const disp = (it.quantidadetotal || 0) - (it.alocadocardapio2 || 0);
        if (q > disp) { mostrarToast('Máx: ' + disp, 'warning'); return; }
        await supabase.from('estoquecentral').update({ alocadocardapio2: (it.alocadocardapio2 || 0) + q }).eq('id', id);
        const { data: ex } = await supabase.from('cardapio2').select('*').eq('nome', it.nome).maybeSingle();
        if (ex) await supabase.from('cardapio2').update({ quantidade: (ex.quantidade || 0) + q }).eq('id', ex.id);
        else await supabase.from('cardapio2').insert([{ nome: it.nome, emoji: it.emoji, preco: it.preco, quantidade: q, foto: it.foto }]);
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
        const { data } = await supabase.from('cardapio2').select('*').order('nome');
        State.cache.c2 = data || [];
        const l = document.getElementById('listaC2');
        if (State.cache.c2.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">🔥</span><div>Vazio</div></div>'; return; }
        l.innerHTML = State.cache.c2.map(i => `<div class="card-item"><div class="card-item-info">${i.foto ? `<img src="${i.foto}" class="item-foto">` : `<div class="foto-placeholder">${i.emoji || '🔥'}</div>`}<div><strong>${i.emoji || '🔥'} ${Utils.escapeHtml(i.nome)}</strong><br><small>R$ ${(i.preco || 0).toFixed(2)} | Qtd: ${i.quantidade || 0}</small></div></div><div class="card-item-actions"><button class="btn btn-danger btn-sm" onclick="excluirC2(${i.id})">🗑️</button></div></div>`).join('');
    } catch (e) { tratarErro(e); }
}
window.carregarC2 = carregarC2;

async function excluirC2(id) {
    if (!confirm('Excluir?')) return;
    try {
        await supabase.from('cardapio2').delete().eq('id', id);
        await carregarC2();
        mostrarToast('Excluído!');
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
        let q = supabase.from('todospedidos').select('*', { count: 'exact' }).order('id', { ascending: false }).range(from, to);
        const s = document.getElementById('filtroPedidosStatus')?.value;
        const c = document.getElementById('filtroPedidosCliente')?.value?.trim();
        const i = document.getElementById('filtroPedidosInicio')?.value;
        const f = document.getElementById('filtroPedidosFim')?.value;
        if (s && s !== 'todos') q = q.eq('status', s);
        if (c) q = q.ilike('cliente', `%${c}%`);
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
    l.innerHTML = p.map(x => {
        let ih = '';
        if (x.itens && x.itens.length > 0) {
            ih = '<div class="pedido-itens"><strong>📋 ITENS:</strong>';
            x.itens.forEach(it => { ih += `<div class="pedido-item-linha"><span>• ${it.quantidade || 0}x ${Utils.escapeHtml(it.nome || '')}</span><span>R$ ${((it.preco || 0) * (it.quantidade || 0)).toFixed(2)}</span></div>`; });
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
        return `<div class="card-item" style="flex-direction:column;align-items:stretch;"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;"><div><strong style="color:var(--dourado);">👤 ${Utils.escapeHtml(x.cliente)}</strong><br><small>📱 ${x.telefone ? Utils.mascararTelefone(x.telefone) : 'N/A'} | 📅 ${Utils.formatarData(x.data)}</small></div><div style="text-align:right;"><strong style="color:var(--dourado);font-size:1.2em;">R$ ${(x.total || 0).toFixed(2)}</strong><br>${sp} ${spd}</div></div>${ih}<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">${be} ${bw} <button class="btn btn-danger btn-sm" onclick="excluirPedido(${x.id})">🗑️</button></div></div>`;
    }).join('');
}

async function marcarEntregue(id) {
    if (!confirm(`Marcar pedido #${id} como entregue?`)) return;
    try {
        await supabase.from('todospedidos').update({ status: 'entregue' }).eq('id', id);
        await carregarPedidos(State.pagination.pedidos.page);
        mostrarToast('Entregue!');
    } catch (e) { tratarErro(e); }
}
window.marcarEntregue = marcarEntregue;

function aplicarFiltroPedidos() { carregarPedidos(1); }
function limparFiltroPedidos() {
    ['filtroPedidosStatus', 'filtroPedidosCliente', 'filtroPedidosInicio', 'filtroPedidosFim'].forEach(i => document.getElementById(i).value = i === 'filtroPedidosStatus' ? 'todos' : '');
    carregarPedidos(1);
}
window.aplicarFiltroPedidos = aplicarFiltroPedidos;
window.limparFiltroPedidos = limparFiltroPedidos;

async function excluirPedido(id) {
    if (!confirm('Excluir?')) return;
    try {
        await supabase.from('todospedidos').delete().eq('id', id);
        await carregarPedidos(State.pagination.pedidos.page);
        await carregarDashboard();
        mostrarToast('Excluído!');
    } catch (e) { tratarErro(e); }
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
// PAGAMENTOS
// ============================================================
async function carregarPagamentos() {
    try {
        const { data } = await supabase.from('todospedidos').select('*').order('id', { ascending: false });
        State.cache.pedidos = data || [];
        renderizarPagamentos(State.cache.pedidos);
        document.getElementById('pagamentosCount').textContent = State.cache.pedidos.filter(p => p.pagamentostatus === 'pendente').length;
    } catch (e) { tratarErro(e); }
}
window.carregarPagamentos = carregarPagamentos;

function renderizarPagamentos(p) {
    const l = document.getElementById('listaPagamentos');
    if (p.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">💳</span><div>Nenhum</div></div>'; return; }
    l.innerHTML = p.map(x => {
        const s = x.pagamentostatus === 'pago' ? '<span class="badge badge-pago">✅</span>' : '<span class="badge badge-pendente">⏳</span>';
        const b = x.pagamentostatus !== 'pago' ? `<button class="btn btn-success btn-sm" onclick="confirmarPag(${x.id})">✅</button>` : '';
        const lem = x.pagamentostatus !== 'pago' && x.telefone ? `<button class="btn btn-whatsapp btn-sm" onclick="lembrar('${x.telefone}','${Utils.escapeHtml(x.cliente)}',${x.total || 0})">📱</button>` : '';
        return `<div class="card-item"><div class="card-item-info"><div><strong>${Utils.escapeHtml(x.cliente)}</strong> ${s}<br><small>${x.telefone ? Utils.mascararTelefone(x.telefone) : ''} | R$ ${(x.total || 0).toFixed(2)}</small></div></div><div class="card-item-actions">${b} ${lem}</div></div>`;
    }).join('');
}

function aplicarFiltroPagamentos() {
    const s = document.getElementById('filtroPagamentosStatus').value;
    const c = document.getElementById('filtroPagamentosCliente').value.toLowerCase().trim();
    const filtered = State.cache.pedidos.filter(p => {
        if (s !== 'todos' && (p.pagamentostatus || 'pendente') !== s) return false;
        if (c && !p.cliente.toLowerCase().includes(c)) return false;
        return true;
    });
    renderizarPagamentos(filtered);
}
function limparFiltroPagamentos() {
    ['filtroPagamentosStatus', 'filtroPagamentosCliente', 'filtroPagamentosInicio', 'filtroPagamentosFim'].forEach(i => document.getElementById(i).value = i === 'filtroPagamentosStatus' ? 'todos' : '');
    renderizarPagamentos(State.cache.pedidos);
}
window.aplicarFiltroPagamentos = aplicarFiltroPagamentos;
window.limparFiltroPagamentos = limparFiltroPagamentos;

async function confirmarPag(id) {
    try {
        await supabase.from('todospedidos').update({ pagamentostatus: 'pago' }).eq('id', id);
        await carregarPagamentos();
        await carregarDashboard();
        mostrarToast('Confirmado!');
    } catch (e) { tratarErro(e); }
}
window.confirmarPag = confirmarPag;

function lembrar(tel, nome, total) {
    const m = `🍦 LEMBRETE\n\nOlá ${nome}!\nPedido aguarda pagamento.\nR$ ${total.toFixed(2)}\n\nPIX: ${State.cache.config?.pix || ''}`;
    window.open(`https://wa.me/55${tel.replace(/\D/g, '')}?text=${encodeURIComponent(m)}`, '_blank');
}
window.lembrar = lembrar;

async function lembrarTodosPendentes() {
    try {
        const { data } = await supabase.from('todospedidos').select('*').eq('pagamentostatus', 'pendente');
        if (!data || data.length === 0) { mostrarToast('Sem pendentes'); return; }
        const cli = {};
        data.forEach(p => {
            if (p.telefone) {
                const t = p.telefone.replace(/\D/g, '');
                if (!cli[t]) cli[t] = { nome: p.cliente, tel: t, total: 0 };
                cli[t].total += p.total || 0;
            }
        });
        const tels = Object.keys(cli);
        if (tels.length === 0) { mostrarToast('Nenhum com telefone', 'warning'); return; }
        if (tels.length === 1) { enviarLembreteCli(cli[tels[0]]); return; }
        let m = 'Clientes:\n';
        tels.forEach((t, i) => m += `${i + 1}. ${cli[t].nome}\n`);
        m += '\nNúmero:';
        const e = prompt(m);
        if (!e) return;
        const idx = parseInt(e) - 1;
        if (idx >= 0 && idx < tels.length) enviarLembreteCli(cli[tels[idx]]);
    } catch (e) { tratarErro(e); }
}
window.lembrarTodosPendentes = lembrarTodosPendentes;

function enviarLembreteCli(c) {
    const m = `🍦 LEMBRETE\n\nOlá ${c.nome}!\nTotal: R$ ${c.total.toFixed(2)}\n\nPIX: ${State.cache.config?.pix || ''}`;
    window.open(`https://wa.me/55${c.tel}?text=${encodeURIComponent(m)}`, '_blank');
}

// ============================================================
// CSV
// ============================================================
function exportarPedidosCSV() {
    const p = State.cache.pedidos || [];
    if (p.length === 0) { mostrarToast('Sem pedidos', 'warning'); return; }
    let c = 'ID,Cliente,Telefone,Total,Status,Data\n';
    p.forEach(x => c += `${x.id},"${x.cliente}","${x.telefone || ''}",${(x.total || 0).toFixed(2)},${x.status || 'novo'},${Utils.formatarData(x.data)}\n`);
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
    if (State.realtimeChannel) await supabase.removeChannel(State.realtimeChannel);
    State.realtimeChannel = supabase.channel('pedidos-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'todospedidos' }, (p) => {
            mostrarToast(`🆕 Novo pedido de ${p.new.cliente}!`, 'info');
            if (document.getElementById('conteudo-dashboard').classList.contains('active')) carregarDashboard();
            if (document.getElementById('conteudo-pedidos').classList.contains('active')) carregarPedidos(1);
        }).subscribe();
}

// ============================================================
// CARREGAR TUDO
// ============================================================
function carregarTudo() {
    Promise.all([
        carregarDashboard(),
        carregarEstoque(),
        carregarC1(),
        carregarC2(),
        carregarSetores(),
        carregarInsumos()
    ]).catch(err => console.error('Erro ao carregar dados:', err));
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    verificarConexao();

    document.querySelectorAll('.tab-btn').forEach(b => {
        b.addEventListener('click', function() {
            mudarTab(this.getAttribute('data-tab'));
        });
    });

    document.getElementById('campoEmail').focus();

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            fecharModalTrocaSenha();
            fecharModalInsumo();
            fecharModalReceita();
            fecharModalEditarEstoque();
        }
    });

    document.getElementById('modalTrocaSenha').addEventListener('click', function(e) { if (e.target === this) fecharModalTrocaSenha(); });
    document.getElementById('modalInsumo').addEventListener('click', function(e) { if (e.target === this) fecharModalInsumo(); });
    document.getElementById('modalReceita').addEventListener('click', function(e) { if (e.target === this) fecharModalReceita(); });
    document.getElementById('modalEditarEstoque').addEventListener('click', function(e) { if (e.target === this) fecharModalEditarEstoque(); });

    document.getElementById('modalNovaSenha').addEventListener('input', function() { verificarForcaSenhaModal(this.value); });
    document.getElementById('receitaRendimento').addEventListener('input', calcularReceitaPreview);
    document.getElementById('receitaMargem').addEventListener('input', calcularReceitaPreview);
    document.getElementById('campoSenha').addEventListener('keypress', e => { if (e.key === 'Enter') fazerLogin(); });

    verificarSessao();
});

console.log('✅ Admin parte 1 carregado!');
