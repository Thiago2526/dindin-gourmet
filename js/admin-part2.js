// ============================================================
// PARTE 2 - FUNÇÕES RESTANTES (CORRIGIDO COM sb)
// ============================================================

// ============================================================
// FINANCEIRO
// ============================================================
async function carregarFinanceiro() {
    try {
        const { data } = await sb.from('todospedidos').select('*');
        State.cache.pedidos = data || [];
        const total = State.cache.pedidos.filter(x => x.pagamentostatus === 'pago').reduce((s, x) => s + (x.total || 0), 0);
        const pend = State.cache.pedidos.filter(x => x.pagamentostatus !== 'pago').reduce((s, x) => s + (x.total || 0), 0);
        document.getElementById('listaFinanceiro').innerHTML = `
            <div class="resumo-financeiro">
                <div class="resumo-card"><div class="destaque">R$ ${total.toFixed(2)}</div><div class="label">💰 Recebido</div></div>
                <div class="resumo-card"><div class="destaque" style="color:#fcd34d;">R$ ${pend.toFixed(2)}</div><div class="label">⏳ Pendente</div></div>
                <div class="resumo-card"><div class="valor">${State.cache.pedidos.length}</div><div class="label">📦 Pedidos</div></div>
                <div class="resumo-card"><div class="valor">${State.cache.pedidos.filter(x => x.pagamentostatus === 'pago').length}</div><div class="label">✅ Pagos</div></div>
            </div>`;
    } catch (e) { tratarErro(e); }
}
window.carregarFinanceiro = carregarFinanceiro;

function aplicarFiltroFinanceiro() { carregarFinanceiro(); }
function limparFiltroFinanceiro() {
    ['filtroFinanceiroCliente', 'filtroFinanceiroInicio', 'filtroFinanceiroFim'].forEach(i => document.getElementById(i).value = '');
    carregarFinanceiro();
}
window.aplicarFiltroFinanceiro = aplicarFiltroFinanceiro;
window.limparFiltroFinanceiro = limparFiltroFinanceiro;

// ============================================================
// RANKING
// ============================================================
async function carregarRanking() {
    try {
        const { data } = await sb.from('todospedidos').select('*');
        const cnt = {};
        (data || []).forEach(x => (x.itens || []).forEach(i => { cnt[i.nome] = (cnt[i.nome] || 0) + (i.quantidade || 0); }));
        const rk = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
        const l = document.getElementById('listaRanking');
        if (rk.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">🏆</span><div>Sem vendas</div></div>'; return; }
        l.innerHTML = rk.map((r, i) => {
            const m = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + 'º';
            return `<div class="ranking-item"><span class="ranking-posicao">${m}</span><span class="ranking-nome">${Utils.escapeHtml(r[0])}</span><span class="ranking-qtd">${r[1]}</span></div>`;
        }).join('');
    } catch (e) { tratarErro(e); }
}
window.carregarRanking = carregarRanking;

function aplicarFiltroRanking() { carregarRanking(); }
function limparFiltroRanking() {
    ['filtroRankingInicio', 'filtroRankingFim'].forEach(i => document.getElementById(i).value = '');
    carregarRanking();
}
window.aplicarFiltroRanking = aplicarFiltroRanking;
window.limparFiltroRanking = limparFiltroRanking;

// ============================================================
// HISTÓRICO
// ============================================================
function renderizarTabelaHistorico(dados) {
    const l = document.getElementById('listaHistorico');
    if (!dados || dados.length === 0) {
        l.innerHTML = '<div class="empty-state"><span class="empty-icon">📜</span><div>Nenhum registro</div></div>';
        return;
    }
    let html = '<div class="table-responsive"><table><thead><tr>';
    html += '<th>Data</th><th>Tipo</th><th>Item</th><th>Qtd</th><th>Obs</th>';
    html += '</tr></thead><tbody>';
    dados.forEach(function(x) {
        const badgeClass = x.tipo === 'entrada' ? 'badge-pago' : x.tipo === 'saida' ? 'badge-baixo' : 'badge-pendente';
        const tipoLabel = x.tipo === 'entrada' ? '🟢 Entrada' : x.tipo === 'saida' ? '🔴 Saída' : '📤 Alocação';
        html += `<tr><td>${Utils.escapeHtml(x.data || '')}</td><td><span class="badge ${badgeClass}">${tipoLabel}</span></td><td>${Utils.escapeHtml(x.item || '')}</td><td>${x.quantidade || 0}</td><td>${Utils.escapeHtml(x.obs || '')}</td></tr>`;
    });
    html += '</tbody></table></div>';
    l.innerHTML = html;
}

async function carregarHistorico() {
    try {
        mostrarSkeleton('listaHistorico', 5);
        const { data } = await sb.from('historicoestoque').select('*').order('id', { ascending: false }).limit(200);
        State.cache.historico = data || [];
        renderizarTabelaHistorico(State.cache.historico);
    } catch (e) { tratarErro(e); }
}
window.carregarHistorico = carregarHistorico;

function aplicarFiltroHistorico() {
    const tipo = document.getElementById('filtroHistoricoTipo').value;
    const item = document.getElementById('filtroHistoricoItem').value.toLowerCase().trim();
    const filtrados = State.cache.historico.filter(function(reg) {
        if (tipo !== 'todos' && reg.tipo !== tipo) return false;
        if (item && !(reg.item || '').toLowerCase().includes(item)) return false;
        return true;
    });
    renderizarTabelaHistorico(filtrados);
}
window.aplicarFiltroHistorico = aplicarFiltroHistorico;

function limparFiltroHistorico() {
    ['filtroHistoricoTipo', 'filtroHistoricoItem'].forEach(i => document.getElementById(i).value = i === 'filtroHistoricoTipo' ? 'todos' : '');
    renderizarTabelaHistorico(State.cache.historico);
}
window.limparFiltroHistorico = limparFiltroHistorico;

// ============================================================
// INSUMOS
// ============================================================
async function carregarInsumos() {
    try {
        mostrarSkeleton('listaInsumos', 3);
        const { data } = await sb.from('insumos').select('*').order('nome');
        State.cache.insumos = data || [];
        renderizarInsumos(State.cache.insumos);
        document.getElementById('insumosCount').textContent = State.cache.insumos.length;
    } catch (e) { tratarErro(e); }
}
window.carregarInsumos = carregarInsumos;

function renderizarInsumos(ins) {
    const l = document.getElementById('listaInsumos');
    if (ins.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">🧪</span><div>Nenhum insumo</div></div>'; return; }
    l.innerHTML = ins.map(i => {
        const e = i.quantidade_estoque || 0, m = i.quantidade_minima || 0;
        let cls = '', b = '<span class="badge badge-ativo">✅ OK</span>';
        if (e <= 0) { cls = 'estoque-critico'; b = '<span class="badge badge-inativo">🔴 Crítico</span>'; }
        else if (e <= m) { cls = 'estoque-baixo'; b = '<span class="badge badge-pendente">⚠️ Baixo</span>'; }
        return `<div class="insumo-card ${cls}"><div class="insumo-info"><div class="insumo-nome">🧪 ${Utils.escapeHtml(i.nome)}</div><div class="insumo-detalhes"><span class="insumo-preco">R$ ${(i.preco_por_unidade || 0).toFixed(4)}/${i.unidade}</span> | Estoque: ${e}${i.unidade} | Mín: ${m}${i.unidade} ${b}</div></div><div class="card-item-actions"><button class="btn btn-info btn-sm" onclick="abrirModalInsumo(${i.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirInsumo(${i.id})">🗑️</button></div></div>`;
    }).join('');
}

function filtrarInsumos() {
    const b = document.getElementById('filtroInsumos').value.toLowerCase().trim();
    const s = document.getElementById('filtroInsumosStatus').value;
    const f = State.cache.insumos.filter(i => {
        if (b && !i.nome.toLowerCase().includes(b)) return false;
        const e = i.quantidade_estoque || 0, m = i.quantidade_minima || 0;
        if (s === 'ok' && e <= m) return false;
        if (s === 'baixo' && (e > m || e <= 0)) return false;
        if (s === 'critico' && e > 0) return false;
        return true;
    });
    renderizarInsumos(f);
}
window.filtrarInsumos = filtrarInsumos;

function abrirModalInsumo(id) {
    document.getElementById('modalInsumo').classList.add('active');
    if (id) {
        const i = State.cache.insumos.find(x => x.id === id);
        if (!i) return;
        document.getElementById('modalInsumoTitulo').textContent = '✏️ Editar';
        document.getElementById('insumoId').value = i.id;
        document.getElementById('insumoNome').value = i.nome || '';
        document.getElementById('insumoUnidade').value = i.unidade || 'g';
        document.getElementById('insumoPreco').value = i.preco_por_unidade || 0;
        document.getElementById('insumoEstoque').value = i.quantidade_estoque || 0;
        document.getElementById('insumoMinimo').value = i.quantidade_minima || 0;
        document.getElementById('insumoFornecedor').value = i.fornecedor || '';
        document.getElementById('insumoObs').value = i.observacoes || '';
    } else {
        document.getElementById('modalInsumoTitulo').textContent = '➕ Novo Insumo';
        ['insumoId', 'insumoNome', 'insumoPreco', 'insumoFornecedor', 'insumoObs'].forEach(i => document.getElementById(i).value = '');
        document.getElementById('insumoUnidade').value = 'g';
        document.getElementById('insumoEstoque').value = '0';
        document.getElementById('insumoMinimo').value = '0';
    }
}
window.abrirModalInsumo = abrirModalInsumo;

function fecharModalInsumo() { document.getElementById('modalInsumo').classList.remove('active'); }
window.fecharModalInsumo = fecharModalInsumo;

async function salvarInsumo() {
    const btn = document.querySelector('#modalInsumo .btn-success');
    await executarComLoading(btn, '⏳ Salvando...', async () => {
        const id = document.getElementById('insumoId').value;
        const d = {
            nome: document.getElementById('insumoNome').value.trim(),
            unidade: document.getElementById('insumoUnidade').value,
            preco_por_unidade: parseFloat(document.getElementById('insumoPreco').value) || 0,
            quantidade_estoque: parseFloat(document.getElementById('insumoEstoque').value) || 0,
            quantidade_minima: parseFloat(document.getElementById('insumoMinimo').value) || 0,
            fornecedor: document.getElementById('insumoFornecedor').value.trim() || null,
            observacoes: document.getElementById('insumoObs').value.trim() || null
        };
        if (!d.nome) { mostrarToast('Digite o nome', 'warning'); return; }
        if (id) await sb.from('insumos').update(d).eq('id', id);
        else await sb.from('insumos').insert([d]);
        fecharModalInsumo();
        await carregarInsumos();
        mostrarToast('✅ Salvo!', 'success');
    });
}
window.salvarInsumo = salvarInsumo;

async function excluirInsumo(id) {
    if (!confirm('Excluir?')) return;
    try {
        await sb.from('insumos').delete().eq('id', id);
        await carregarInsumos();
        mostrarToast('Excluído!');
    } catch (e) { tratarErro(e); }
}
window.excluirInsumo = excluirInsumo;

// ============================================================
// CALCULADORA DE RECEITAS
// ============================================================
async function carregarReceitas() {
    try {
        const { data } = await sb.from('receitas').select('*').order('nome_produto');
        State.cache.receitas = data || [];
        renderizarReceitas(State.cache.receitas);
    } catch (e) { tratarErro(e); }
}
window.carregarReceitas = carregarReceitas;

function renderizarReceitas(rec) {
    const l = document.getElementById('listaReceitas');
    if (rec.length === 0) { l.innerHTML = '<div class="empty-state"><span class="empty-icon">💰</span><div>Nenhuma receita</div></div>'; return; }
    l.innerHTML = rec.map(r => {
        const p = r.preco_venda_manual || r.preco_venda_calculado || 0;
        return `<div class="card-item" style="flex-direction:column;align-items:stretch;"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;"><div><strong style="color:var(--dourado);font-size:1.15em;">💰 ${Utils.escapeHtml(r.nome_produto)}</strong><br><small>Rend: ${r.rendimento || 1} un | Margem: ${r.margem_lucro || 0}%</small></div><div style="text-align:right;"><small>Custo Unit: R$ ${(r.custo_por_unidade || 0).toFixed(2)}</small><br><strong style="color:var(--dourado);font-size:1.2em;">Venda: R$ ${p.toFixed(2)}</strong></div></div><div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;"><button class="btn btn-info btn-sm" onclick="abrirModalReceita(${r.id})">✏️</button><button class="btn btn-warning btn-sm" onclick="recalcularReceita(${r.id})">🔄</button><button class="btn btn-danger btn-sm" onclick="excluirReceita(${r.id})">🗑️</button></div></div>`;
    }).join('');
}

async function abrirModalReceita(id) {
    if (State.cache.insumos.length === 0) await carregarInsumos();
    document.getElementById('modalReceita').classList.add('active');
    if (id) {
        const r = State.cache.receitas.find(x => x.id === id);
        if (!r) return;
        document.getElementById('modalReceitaTitulo').textContent = '✏️ Editar Receita';
        document.getElementById('receitaId').value = r.id;
        document.getElementById('receitaNome').value = r.nome_produto || '';
        document.getElementById('receitaRendimento').value = r.rendimento || 10;
        document.getElementById('receitaMargem').value = r.margem_lucro || 150;
        document.getElementById('receitaDescricao').value = r.descricao || '';
        const { data } = await sb.from('receita_ingredientes').select('*').eq('receita_id', id);
        State.ingredientesTemporarios = (data || []).map(i => ({ insumo_id: i.insumo_id, quantidade: i.quantidade }));
    } else {
        document.getElementById('modalReceitaTitulo').textContent = '💰 Nova Receita';
        ['receitaId', 'receitaNome', 'receitaDescricao'].forEach(i => document.getElementById(i).value = '');
        document.getElementById('receitaRendimento').value = '10';
        document.getElementById('receitaMargem').value = '150';
        State.ingredientesTemporarios = [];
    }
    renderizarIngredientesTemporarios();
    calcularReceitaPreview();
}
window.abrirModalReceita = abrirModalReceita;

function fecharModalReceita() {
    document.getElementById('modalReceita').classList.remove('active');
    State.ingredientesTemporarios = [];
}
window.fecharModalReceita = fecharModalReceita;

function renderizarIngredientesTemporarios() {
    const c = document.getElementById('ingredientesList');
    if (State.ingredientesTemporarios.length === 0) {
        c.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:12px;">Nenhum ingrediente</p>';
        return;
    }
    c.innerHTML = State.ingredientesTemporarios.map((ing, idx) => {
        const ins = State.cache.insumos.find(i => i.id == ing.insumo_id);
        const custo = ins ? (ing.quantidade * ins.preco_por_unidade) : 0;
        let opts = '<option value="">Selecione...</option>';
        State.cache.insumos.forEach(i => {
            opts += `<option value="${i.id}" ${i.id == ing.insumo_id ? 'selected' : ''}>${Utils.escapeHtml(i.nome)} (${i.unidade})</option>`;
        });
        return `<div class="ingrediente-linha"><div class="form-group" style="flex:2;"><label>Ingrediente</label><select onchange="atualizarIngrediente(${idx},'insumo_id',this.value)">${opts}</select></div><div class="form-group" style="flex:0.5;"><label>Qtd</label><input type="number" step="0.01" value="${ing.quantidade || 0}" onchange="atualizarIngrediente(${idx},'quantidade',this.value)"></div><div class="ingrediente-custo">R$ ${custo.toFixed(4)}</div><button class="btn btn-danger btn-sm" onclick="removerIngrediente(${idx})">✕</button></div>`;
    }).join('');
}

function adicionarIngrediente() {
    if (State.cache.insumos.length === 0) { mostrarToast('Cadastre insumos primeiro!', 'warning'); return; }
    State.ingredientesTemporarios.push({ insumo_id: '', quantidade: 0 });
    renderizarIngredientesTemporarios();
    calcularReceitaPreview();
}
window.adicionarIngrediente = adicionarIngrediente;

function atualizarIngrediente(idx, campo, v) {
    if (!State.ingredientesTemporarios[idx]) return;
    if (campo === 'quantidade') v = parseFloat(v) || 0;
    State.ingredientesTemporarios[idx][campo] = v;
    renderizarIngredientesTemporarios();
    calcularReceitaPreview();
}
window.atualizarIngrediente = atualizarIngrediente;

function removerIngrediente(idx) {
    State.ingredientesTemporarios.splice(idx, 1);
    renderizarIngredientesTemporarios();
    calcularReceitaPreview();
}
window.removerIngrediente = removerIngrediente;

function calcularReceitaPreview() {
    const r = parseInt(document.getElementById('receitaRendimento').value) || 1;
    const m = parseFloat(document.getElementById('receitaMargem').value) || 0;
    let ct = 0;
    State.ingredientesTemporarios.forEach(ing => {
        const i = State.cache.insumos.find(x => x.id == ing.insumo_id);
        if (i) ct += (ing.quantidade || 0) * (i.preco_por_unidade || 0);
    });
    const cu = ct / r;
    const pv = cu * (1 + m / 100);
    document.getElementById('resultadoReceita').style.display = 'block';
    document.getElementById('resCustoTotal').textContent = `R$ ${ct.toFixed(2)}`;
    document.getElementById('resCustoUnit').textContent = `R$ ${cu.toFixed(2)}`;
    document.getElementById('resMargem').textContent = `${m}%`;
    document.getElementById('resPrecoVenda').textContent = `R$ ${pv.toFixed(2)}`;
}

async function salvarReceita() {
    const btn = document.querySelector('#modalReceita .btn-success');
    await executarComLoading(btn, '⏳ Salvando...', async () => {
        const id = document.getElementById('receitaId').value;
        const nome = document.getElementById('receitaNome').value.trim();
        const r = parseInt(document.getElementById('receitaRendimento').value) || 1;
        const m = parseFloat(document.getElementById('receitaMargem').value) || 0;
        if (!nome) { mostrarToast('Nome obrigatório', 'warning'); return; }
        if (State.ingredientesTemporarios.length === 0) { mostrarToast('Adicione ingredientes', 'warning'); return; }
        for (const ing of State.ingredientesTemporarios) {
            if (!ing.insumo_id || ing.quantidade <= 0) { mostrarToast('Preencha todos os ingredientes', 'warning'); return; }
        }
        let ct = 0;
        State.ingredientesTemporarios.forEach(ing => {
            const i = State.cache.insumos.find(x => x.id == ing.insumo_id);
            if (i) ct += ing.quantidade * i.preco_por_unidade;
        });
        const cu = ct / r;
        const pv = cu * (1 + m / 100);
        const d = {
            nome_produto: nome,
            descricao: document.getElementById('receitaDescricao').value.trim() || null,
            rendimento: r,
            margem_lucro: m,
            custo_total: ct,
            custo_por_unidade: cu,
            preco_venda_calculado: pv
        };
        let rid = id;
        if (id) {
            await sb.from('receitas').update(d).eq('id', id);
            await sb.from('receita_ingredientes').delete().eq('receita_id', id);
        } else {
            const { data } = await sb.from('receitas').insert([d]).select().single();
            rid = data.id;
        }
        await sb.from('receita_ingredientes').insert(State.ingredientesTemporarios.map(i => ({ receita_id: rid, insumo_id: i.insumo_id, quantidade: i.quantidade })));
        fecharModalReceita();
        await carregarReceitas();
        mostrarToast(`✅ Salvo! Venda: R$ ${pv.toFixed(2)}`, 'success');
    });
}
window.salvarReceita = salvarReceita;

async function recalcularReceita(id) {
    try {
        await sb.rpc('calcular_custo_receita', { p_receita_id: id });
        await carregarReceitas();
        mostrarToast('Recalculado');
    } catch (e) { tratarErro(e); }
}
window.recalcularReceita = recalcularReceita;

async function excluirReceita(id) {
    if (!confirm('Excluir?')) return;
    try {
        await sb.from('receitas').delete().eq('id', id);
        await carregarReceitas();
        mostrarToast('Excluído');
    } catch (e) { tratarErro(e); }
}
window.excluirReceita = excluirReceita;

// ============================================================
// SETORES
// ============================================================
async function carregarSetores() {
    try {
        const { data } = await sb.from('setores').select('*').order('nome');
        State.cache.setores = data || [];
        const l = document.getElementById('listaSetores');
        if (State.cache.setores.length === 0) {
            l.innerHTML = '<div class="empty-state"><span class="empty-icon">📍</span><div>Nenhum setor</div></div>';
            return;
        }
        l.innerHTML = State.cache.setores.map(s => `<div class="setor-card"><div>📍 ${Utils.escapeHtml(s.nome)} <span style="color:var(--dourado);">💰 R$ ${(s.taxa_entrega || 0).toFixed(2)}</span> ${s.ativo ? '<span class="badge badge-ativo">✅</span>' : '<span class="badge badge-inativo">⛔</span>'}</div><div class="card-item-actions"><button class="btn btn-warning btn-sm" onclick="editarSetor(${s.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirSetor(${s.id})">🗑️</button></div></div>`).join('');
    } catch (e) { tratarErro(e); }
}
window.carregarSetores = carregarSetores;

async function cadastrarSetor() {
    const btn = document.querySelector('#conteudo-setores .btn-success');
    await executarComLoading(btn, '⏳ Adicionando...', async () => {
        const nome = document.getElementById('setorNome').value.trim();
        const taxa = parseFloat(document.getElementById('setorTaxa').value) || 0;
        if (!nome) { mostrarToast('Digite o nome', 'warning'); return; }
        const { data: ex } = await sb.from('setores').select('*').eq('nome', nome).maybeSingle();
        if (ex) { mostrarToast('Já existe', 'warning'); return; }
        await sb.from('setores').insert([{ nome, taxa_entrega: taxa, ativo: true }]);
        document.getElementById('setorNome').value = '';
        await carregarSetores();
        mostrarToast('✅ Cadastrado!');
    });
}
window.cadastrarSetor = cadastrarSetor;

async function editarSetor(id) {
    try {
        const s = State.cache.setores.find(x => x.id === id);
        if (!s) return;
        const n = prompt('Nome:', s.nome);
        if (!n) return;
        const t = parseFloat(prompt('Taxa:', s.taxa_entrega || 0));
        if (isNaN(t)) return;
        const a = confirm('Ativo?');
        await sb.from('setores').update({ nome: n, taxa_entrega: t, ativo: a }).eq('id', id);
        await carregarSetores();
        mostrarToast('Atualizado');
    } catch (e) { tratarErro(e); }
}
window.editarSetor = editarSetor;

async function excluirSetor(id) {
    if (!confirm('Excluir?')) return;
    try {
        await sb.from('setores').delete().eq('id', id);
        await carregarSetores();
        mostrarToast('Excluído');
    } catch (e) { tratarErro(e); }
}
window.excluirSetor = excluirSetor;

// ============================================================
// CONFIG
// ============================================================
async function carregarConfig() {
    try {
        const { data } = await sb.from('config').select('*').eq('chave', 'admin').maybeSingle();
        State.cache.config = data ? (data.dados || {}) : {};
        document.getElementById('configWhatsapp').value = State.cache.config.whatsapp || '';
        document.getElementById('configPix').value = State.cache.config.pix || '';
        document.getElementById('configInfinitePay').value = State.cache.config.infinitePay || '';
        document.getElementById('configEndereco').value = State.cache.config.endereco || '';
        document.getElementById('configGrupoWhatsapp').value = State.cache.config.grupoWhatsapp || '';
    } catch (e) { tratarErro(e); }
}
window.carregarConfig = carregarConfig;

async function salvarConfig() {
    const btn = document.querySelector('#conteudo-config .btn-success');
    await executarComLoading(btn, '⏳ Salvando...', async () => {
        const d = {
            whatsapp: document.getElementById('configWhatsapp').value.trim(),
            pix: document.getElementById('configPix').value.trim(),
            infinitePay: document.getElementById('configInfinitePay').value.trim(),
            endereco: document.getElementById('configEndereco').value.trim(),
            grupoWhatsapp: document.getElementById('configGrupoWhatsapp').value.trim()
        };
        await sb.from('config').upsert({ chave: 'admin', dados: d });
        State.cache.config = d;
        mostrarToast('✅ Salvo!', 'success');
    });
}
window.salvarConfig = salvarConfig;

// ============================================================
// AUDITORIA
// ============================================================
async function carregarAuditoria(page = 1) {
    try {
        State.pagination.auditoria.page = page;
        const limit = 10, from = (page - 1) * limit, to = from + limit - 1;
        mostrarSkeleton('listaAuditoria', 3);
        let q = sb.from('audit_log').select('*', { count: 'exact' }).order('criado_em', { ascending: false }).range(from, to);
        const a = document.getElementById('filtroAuditoriaAcao')?.value;
        const t = document.getElementById('filtroAuditoriaTabela')?.value;
        const u = document.getElementById('filtroAuditoriaUsuario')?.value?.trim();
        if (a && a !== 'todos') q = q.eq('acao', a);
        if (t && t !== 'todos') q = q.eq('tabela', t);
        if (u) q = q.ilike('usuario_email', `%${u}%`);
        const { data, count } = await q;
        State.cache.audit = data || [];
        const l = document.getElementById('listaAuditoria');
        if (State.cache.audit.length === 0) {
            l.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><div>Nada</div></div>';
            return;
        }
        let h = '<table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Tabela</th></tr></thead><tbody>';
        State.cache.audit.forEach(x => {
            const icon = x.acao === 'INSERT' ? '➕' : x.acao === 'UPDATE' ? '✏️' : '🗑️';
            h += `<tr><td>${Utils.formatarDataHora(x.criado_em)}</td><td>${Utils.escapeHtml(x.usuario_email || 'Sis')}</td><td>${icon} ${x.acao}</td><td>${Utils.escapeHtml(x.tabela || '')}</td></tr>`;
        });
        h += '</tbody></table>';
        l.innerHTML = h;
        renderPagination('paginacaoAuditoria', page, Math.ceil((count || 0) / limit), count || 0, p => carregarAuditoria(p));
    } catch (e) { tratarErro(e); }
}
window.carregarAuditoria = carregarAuditoria;

function aplicarFiltroAuditoria() { carregarAuditoria(1); }
function limparFiltroAuditoria() {
    ['filtroAuditoriaAcao', 'filtroAuditoriaTabela', 'filtroAuditoriaUsuario'].forEach(i => document.getElementById(i).value = i === 'filtroAuditoriaUsuario' ? '' : 'todos');
    carregarAuditoria(1);
}
window.aplicarFiltroAuditoria = aplicarFiltroAuditoria;
window.limparFiltroAuditoria = limparFiltroAuditoria;

console.log('✅ Admin parte 2 carregada!');
console.log('🎉 Sistema completo!');
