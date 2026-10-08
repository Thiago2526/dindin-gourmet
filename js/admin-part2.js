// ============================================================
// PARTE 2 - FUNÇÕES RESTANTES
// ============================================================

// ============================================================
// FINANCEIRO
// ============================================================
async function carregarFinanceiro() {
    try {
        const { data } = await sb.from('todospedidos').select('*');
        let pedidos = data || [];

        const cliente = document.getElementById('filtroFinanceiroCliente')?.value?.toLowerCase().trim() || '';
        const tel = document.getElementById('filtroFinanceiroTelefone')?.value?.replace(/\D/g, '') || '';
        const inicio = document.getElementById('filtroFinanceiroInicio')?.value || '';
        const fim = document.getElementById('filtroFinanceiroFim')?.value || '';

        if (cliente) pedidos = pedidos.filter(x => (x.cliente || '').toLowerCase().includes(cliente));
        if (tel) pedidos = pedidos.filter(x => (x.telefone || '').replace(/\D/g, '').includes(tel));
        if (inicio) pedidos = pedidos.filter(x => x.data && x.data >= inicio);
        if (fim) pedidos = pedidos.filter(x => x.data && x.data <= fim);

        State.cache.pedidos = pedidos;

        const total = pedidos.filter(x => x.pagamentostatus === 'pago').reduce((s, x) => s + (x.total || 0), 0);
        const pend = pedidos.filter(x => x.pagamentostatus !== 'pago').reduce((s, x) => s + (x.total || 0), 0);
        document.getElementById('listaFinanceiro').innerHTML = `
            <div class="resumo-financeiro">
                <div class="resumo-card"><div class="destaque">R$ ${total.toFixed(2)}</div><div class="label">💰 Recebido</div></div>
                <div class="resumo-card"><div class="destaque" style="color:#fcd34d;">R$ ${pend.toFixed(2)}</div><div class="label">⏳ Pendente</div></div>
                <div class="resumo-card"><div class="valor">${pedidos.length}</div><div class="label">📦 Pedidos</div></div>
                <div class="resumo-card"><div class="valor">${pedidos.filter(x => x.pagamentostatus === 'pago').length}</div><div class="label">✅ Pagos</div></div>
            </div>`;
    } catch (e) { tratarErro(e); }
}
window.carregarFinanceiro = carregarFinanceiro;

function aplicarFiltroFinanceiro() { carregarFinanceiro(); }
function limparFiltroFinanceiro() {
    ['filtroFinanceiroCliente', 'filtroFinanceiroTelefone', 'filtroFinanceiroInicio', 'filtroFinanceiroFim'].forEach(i => document.getElementById(i).value = '');
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
        try {
            const { data: updated, error: errUpdate } = await sb
                .from('config')
                .update({ dados: d })
                .eq('chave', 'admin')
                .select();
            if (errUpdate) throw errUpdate;
            if (!updated || updated.length === 0) {
                const { error: errInsert } = await sb
                    .from('config')
                    .insert([{ chave: 'admin', dados: d }]);
                if (errInsert) throw errInsert;
            }
            State.cache.config = d;
            mostrarToast('✅ Configurações salvas!', 'success');
        } catch (err) {
            console.error('❌ Erro ao salvar config:', err);
            mostrarToast('❌ Erro: ' + (err.message || 'Falha ao salvar'), 'error');
            throw err;
        }
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

// ============================================================
// PAGAMENTOS
// ============================================================
async function carregarPagamentos() {
    try {
        const { data } = await sb.from('todospedidos').select('*').order('id', { ascending: false });
        State.cache.pedidos = data || [];
        renderizarPagamentos(State.cache.pedidos);
        document.getElementById('pagamentosCount').textContent = State.cache.pedidos.filter(p => p.pagamentostatus === 'pendente').length;
    } catch (e) { tratarErro(e); }
}
window.carregarPagamentos = carregarPagamentos;

function formatarItensPedido(itens) {
    if (!itens || itens.length === 0) return 'Sem itens';
    return itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ');
}

function formatarPagamento(pagamento) {
    const mapa = {
        'pix': '📱 PIX',
        'cartao': '💳 Cartão',
        'dinheiro': '💵 Dinheiro',
        'credito': '💳 Crédito',
        'pendente': '⏳ Pendente',
        'pago': '✅ Pago'
    };
    return mapa[pagamento] || pagamento || '—';
}

function montarMensagemLembrete(pedidos) {
    const nome = pedidos[0].cliente || 'Cliente';
    const pix = State.cache.config?.pix || 'não configurado';

    if (pedidos.length === 1) {
        const p = pedidos[0];
        const itensTexto = (p.itens || []).map(i =>
            `• ${i.quantidade}x ${i.nome} — R$ ${((i.preco || 0) * (i.quantidade || 0)).toFixed(2)}`
        ).join('\n') || 'Sem itens';
        const pedidoId = p.pedido_id || `#${p.id}`;
        const dataFormatada = Utils.formatarData(p.data);
        const formaPgto = formatarPagamento(p.pagamentostatus);

        return `💳 *LEMBRETE DE PAGAMENTO*\n\n` +
            `Olá *${nome}*!\n\n` +
            `📦 *Pedido:* ${pedidoId}\n` +
            `🕐 ${dataFormatada}\n\n` +
            `📋 *Itens:*\n${itensTexto}\n\n` +
            `💳 *Forma:* ${formaPgto}\n` +
            `💰 *Total:* R$ ${(p.total || 0).toFixed(2)}\n\n` +
            `📱 *PIX:* ${pix}\n\n` +
            `_Por favor, envie o comprovante após o pagamento._`;
    }

    let msg = `💳 *LEMBRETE DE PAGAMENTO*\n\n` +
        `Olá *${nome}*!\n\n` +
        `Você tem *${pedidos.length} pedidos* aguardando pagamento:\n\n`;

    let totalGeral = 0;
    pedidos.forEach((p) => {
        const itensTexto = (p.itens || []).map(it =>
            `  • ${it.quantidade}x ${it.nome}`
        ).join('\n') || '  (sem itens)';
        const pedidoId = p.pedido_id || `#${p.id}`;
        const dataFormatada = Utils.formatarData(p.data);
        const formaPgto = formatarPagamento(p.pagamentostatus);
        totalGeral += p.total || 0;

        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📦 *${pedidoId}*\n`;
        msg += `🕐 ${dataFormatada}\n`;
        msg += `${itensTexto}\n`;
        msg += `💳 ${formaPgto}\n`;
        msg += `💰 R$ ${(p.total || 0).toFixed(2)}\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `💵 *TOTAL GERAL: R$ ${totalGeral.toFixed(2)}*\n\n`;
    msg += `📱 *PIX:* ${pix}\n\n`;
    msg += `_Por favor, envie o comprovante após o pagamento._`;

    return msg;
}

function renderizarPagamentos(p) {
    const l = document.getElementById('listaPagamentos');
    if (p.length === 0) {
        l.innerHTML = '<div class="empty-state"><span class="empty-icon">💳</span><div>Nenhum pagamento</div></div>';
        return;
    }
    l.innerHTML = p.map(x => {
        const s = x.pagamentostatus === 'pago'
            ? '<span class="badge badge-pago">✅ PAGO</span>'
            : '<span class="badge badge-pendente">⏳ PENDENTE</span>';
        const b = x.pagamentostatus !== 'pago'
            ? `<button class="btn btn-success btn-sm" onclick="confirmarPag(${x.id})" title="Confirmar pagamento total">✅</button>`
            : '';
        const lem = x.pagamentostatus !== 'pago' && x.telefone
            ? `<button class="btn btn-whatsapp btn-sm" onclick="lembrarIndividual(${x.id})" title="Enviar lembrete">📱</button>`
            : '';
        const desc = x.pagamentostatus !== 'pago'
            ? `<button class="btn btn-warning btn-sm" onclick="abrirModalDesconto(${x.id})" title="Aplicar desconto">🎁</button>`
            : '';
        const val = x.pagamentostatus !== 'pago'
            ? `<button class="btn btn-primary btn-sm" onclick="abrirModalValorPago(${x.id})" title="Registrar valor pago">💵</button>`
            : '';
        const itensTexto = formatarItensPedido(x.itens);
        const dataFormatada = Utils.formatarData(x.data);
        const pedidoId = x.pedido_id || `#${x.id}`;
        const formaPgto = formatarPagamento(x.pagamentostatus);
        const badgeDesconto = x.desconto ? `<span class="badge" style="background:#8b5cf6;color:white;">🎁 ${Utils.escapeHtml(x.desconto)}</span>` : '';

        return `<div class="card-item" style="flex-direction:column;align-items:stretch;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <strong style="color:var(--dourado);">👤 ${Utils.escapeHtml(x.cliente)}</strong> ${s} ${badgeDesconto}
                    <br>
                    <small>📱 ${x.telefone ? Utils.mascararTelefone(x.telefone) : 'N/A'}</small>
                </div>
                <div style="text-align:right;">
                    <strong style="color:var(--dourado);font-size:1.15em;">R$ ${(x.total || 0).toFixed(2)}</strong>
                    <br>
                    <small>💳 ${formaPgto}</small>
                </div>
            </div>
            <div style="background:var(--bg-secondary);padding:8px 12px;border-radius:8px;margin-top:8px;font-size:0.85em;">
                <strong>📦 ${pedidoId}</strong> — <small style="color:var(--text-secondary);">${dataFormatada}</small>
                <br>
                <span style="color:var(--text-secondary);">${Utils.escapeHtml(itensTexto)}</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                ${b} ${lem} ${desc} ${val}
            </div>
        </div>`;
    }).join('');
}

function lembrarIndividual(id) {
    const pedido = State.cache.pedidos.find(p => p.id === id);
    if (!pedido) { mostrarToast('Pedido não encontrado', 'error'); return; }

    const tel = (pedido.telefone || '').replace(/\D/g, '');
    if (!tel) { mostrarToast('Cliente sem telefone', 'warning'); return; }

    const outrosPendentes = State.cache.pedidos.filter(p =>
        p.pagamentostatus === 'pendente' &&
        (p.telefone || '').replace(/\D/g, '') === tel
    );

    let pedidosParaLembrar = [pedido];

    if (outrosPendentes.length > 1) {
        const totalTodos = outrosPendentes.reduce((s, p) => s + (p.total || 0), 0);
        const incluirTodos = confirm(
            `📱 ${pedido.cliente} tem ${outrosPendentes.length} pedidos pendentes.\n\n` +
            `OK = Enviar lembrete de TODOS os ${outrosPendentes.length} pedidos (Total: R$ ${totalTodos.toFixed(2)})\n` +
            `Cancelar = Enviar apenas deste pedido (R$ ${(pedido.total || 0).toFixed(2)})`
        );
        if (incluirTodos) {
            pedidosParaLembrar = outrosPendentes.sort((a, b) => a.id - b.id);
        }
    }

    const msg = montarMensagemLembrete(pedidosParaLembrar);
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    mostrarToast(`📱 WhatsApp aberto com o lembrete`, 'success');
}
window.lembrarIndividual = lembrarIndividual;

function aplicarFiltroPagamentos() {
    const s = document.getElementById('filtroPagamentosStatus').value;
    const c = document.getElementById('filtroPagamentosCliente').value.toLowerCase().trim();
    const tel = document.getElementById('filtroPagamentosTelefone')?.value?.replace(/\D/g, '') || '';
    const filtered = State.cache.pedidos.filter(p => {
        if (s !== 'todos' && (p.pagamentostatus || 'pendente') !== s) return false;
        if (c && !p.cliente.toLowerCase().includes(c)) return false;
        if (tel) {
            const telPedido = (p.telefone || '').replace(/\D/g, '');
            if (!telPedido.includes(tel)) return false;
        }
        return true;
    });

    mostrarResumoCliente(filtered, c, tel);
    renderizarPagamentos(filtered);
}
window.aplicarFiltroPagamentos = aplicarFiltroPagamentos;

// ============================================================
// RESUMO CONSOLIDADO DO CLIENTE FILTRADO
// ============================================================
function mostrarResumoCliente(pedidos, filtroCliente, filtroTelefone) {
    const container = document.getElementById('resumoClienteFiltrado');
    if (!container) return;

    if (!filtroCliente && !filtroTelefone) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    if (pedidos.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const pendentes = pedidos.filter(p => p.pagamentostatus !== 'pago');
    const pagos = pedidos.filter(p => p.pagamentostatus === 'pago');

    const totalPendente = pendentes.reduce((s, p) => s + (p.total || 0), 0);
    const totalPago = pagos.reduce((s, p) => s + (p.total || 0), 0);
    const totalGeral = totalPendente + totalPago;

    const primeiro = pedidos[0];
    const nomeCliente = primeiro.cliente || 'Cliente';
    const telefone = primeiro.telefone || '';

    let html = `
        <div style="background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(109,40,217,0.05));border:2px solid var(--roxo);border-radius:var(--radius);padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                <div>
                    <div style="font-size:0.8em;color:var(--roxo);font-weight:700;text-transform:uppercase;letter-spacing:1px;">📊 Resumo do Cliente</div>
                    <div style="font-size:1.3em;font-weight:800;color:var(--dourado);margin-top:4px;">👤 ${Utils.escapeHtml(nomeCliente)}</div>
                    ${telefone ? `<div style="color:var(--text-secondary);font-size:0.9em;">📱 ${Utils.mascararTelefone(telefone)}</div>` : ''}
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.85em;color:var(--text-secondary);">${pedidos.length} pedido(s) no filtro</div>
                    <div style="font-size:0.85em;color:var(--success);">✅ ${pagos.length} pago(s)</div>
                    <div style="font-size:0.85em;color:#f59e0b;">⏳ ${pendentes.length} pendente(s)</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px;">
                <div style="background:var(--bg-card);padding:12px;border-radius:10px;text-align:center;">
                    <div style="font-size:0.75em;color:var(--text-muted);text-transform:uppercase;">Total Pago</div>
                    <div style="font-size:1.3em;font-weight:800;color:var(--success);">R$ ${totalPago.toFixed(2)}</div>
                </div>
                <div style="background:var(--bg-card);padding:12px;border-radius:10px;text-align:center;">
                    <div style="font-size:0.75em;color:var(--text-muted);text-transform:uppercase;">Total Pendente</div>
                    <div style="font-size:1.3em;font-weight:800;color:#f59e0b;">R$ ${totalPendente.toFixed(2)}</div>
                </div>
                <div style="background:var(--bg-card);padding:12px;border-radius:10px;text-align:center;border:2px solid var(--roxo);">
                    <div style="font-size:0.75em;color:var(--text-muted);text-transform:uppercase;">💰 Total Geral</div>
                    <div style="font-size:1.4em;font-weight:900;color:var(--dourado);">R$ ${totalGeral.toFixed(2)}</div>
                </div>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${pendentes.length > 0 ? `
                    <button class="btn btn-whatsapp" onclick="lembrarClienteFiltrado()" style="flex:1;min-width:200px;">
                        📱 Lembrar Cliente (${pendentes.length} ${pendentes.length === 1 ? 'pedido' : 'pedidos'} — R$ ${totalPendente.toFixed(2)})
                    </button>
                    <button class="btn btn-success" onclick="confirmarTodosPendentesFiltrado()" style="flex:1;min-width:200px;">
                        ✅ Confirmar Todos Pendentes
                    </button>
                ` : `
                    <div style="background:var(--success);color:white;padding:12px 20px;border-radius:10px;font-weight:700;text-align:center;flex:1;">
                        🎉 Todos os pedidos deste filtro estão pagos!
                    </div>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';

    State.clientesFiltrados = pedidos;
}

window.lembrarClienteFiltrado = function() {
    const pedidos = State.clientesFiltrados || [];
    const pendentes = pedidos.filter(p => p.pagamentostatus !== 'pago');

    if (pendentes.length === 0) {
        mostrarToast('Nenhum pedido pendente neste filtro', 'info');
        return;
    }

    const telefone = (pendentes[0].telefone || '').replace(/\D/g, '');
    if (!telefone) {
        mostrarToast('Cliente sem telefone cadastrado', 'warning');
        return;
    }

    const msg = montarMensagemLembrete(pendentes);
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`, '_blank');
    mostrarToast(`📱 WhatsApp aberto com lembrete de ${pendentes.length} pedido(s)`, 'success');
};

window.confirmarTodosPendentesFiltrado = async function() {
    const pedidos = State.clientesFiltrados || [];
    const pendentes = pedidos.filter(p => p.pagamentostatus !== 'pago');

    if (pendentes.length === 0) {
        mostrarToast('Nenhum pedido pendente para confirmar', 'info');
        return;
    }

    const total = pendentes.reduce((s, p) => s + (p.total || 0), 0);
    if (!confirm(`Confirmar pagamento de ${pendentes.length} pedido(s) totalizando R$ ${total.toFixed(2)}?`)) return;

    try {
        for (const p of pendentes) {
            await sb.from('todospedidos').update({ pagamentostatus: 'pago' }).eq('id', p.id);
        }
        mostrarToast(`✅ ${pendentes.length} pedido(s) confirmados!`, 'success');
        await carregarPagamentos();
        await carregarDashboard();
        aplicarFiltroPagamentos();
    } catch (e) {
        console.error('Erro ao confirmar:', e);
        mostrarToast('❌ Erro: ' + e.message, 'error');
    }
};

function limparFiltroPagamentos() {
    ['filtroPagamentosStatus', 'filtroPagamentosCliente', 'filtroPagamentosTelefone', 'filtroPagamentosInicio', 'filtroPagamentosFim'].forEach(i => document.getElementById(i).value = i === 'filtroPagamentosStatus' ? 'todos' : '');
    const resumo = document.getElementById('resumoClienteFiltrado');
    if (resumo) { resumo.style.display = 'none'; resumo.innerHTML = ''; }
    State.clientesFiltrados = [];
    renderizarPagamentos(State.cache.pedidos);
}
window.limparFiltroPagamentos = limparFiltroPagamentos;

async function confirmarPag(id) {
    try {
        await sb.from('todospedidos').update({ pagamentostatus: 'pago' }).eq('id', id);
        await carregarPagamentos();
        await carregarDashboard();
        mostrarToast('✅ Pagamento confirmado!', 'success');
    } catch (e) { tratarErro(e); }
}
window.confirmarPag = confirmarPag;

// ============================================================
// VALOR PAGO (pagamento parcial)
// ============================================================
window.abrirModalValorPago = function(id) {
    const pedido = State.cache.pedidos.find(p => p.id === id);
    if (!pedido) { mostrarToast('Pedido não encontrado', 'error'); return; }

    document.getElementById('valorPagoPedidoId').value = id;
    document.getElementById('valorPagoPedidoInfo').value = `${pedido.pedido_id || '#' + pedido.id} — ${pedido.cliente}`;
    document.getElementById('valorPagoTotal').value = `R$ ${(pedido.total || 0).toFixed(2)}`;
    document.getElementById('valorPagoInput').value = '';
    document.getElementById('valorPagoPreview').style.display = 'none';
    document.getElementById('modalValorPago').classList.add('active');
    setTimeout(() => document.getElementById('valorPagoInput').focus(), 200);
};

window.fecharModalValorPago = function() {
    document.getElementById('modalValorPago').classList.remove('active');
};

window.atualizarPreviewValorPago = function() {
    const id = document.getElementById('valorPagoPedidoId').value;
    const pedido = State.cache.pedidos.find(p => p.id == id);
    if (!pedido) return;

    const valorInput = document.getElementById('valorPagoInput').value.trim();
    const total = pedido.total || 0;

    if (!valorInput) {
        document.getElementById('valorPagoPreview').style.display = 'none';
        return;
    }

    const valorPago = parseFloat(valorInput.replace(',', '.')) || 0;
    const falta = Math.max(0, total - valorPago);

    document.getElementById('vpTotal').textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('vpPago').textContent = `R$ ${valorPago.toFixed(2)}`;
    document.getElementById('vpFalta').textContent = `R$ ${falta.toFixed(2)}`;
    document.getElementById('valorPagoPreview').style.display = 'block';
};

window.salvarValorPago = async function() {
    const id = document.getElementById('valorPagoPedidoId').value;
    const pedido = State.cache.pedidos.find(p => p.id == id);
    if (!pedido) { mostrarToast('Pedido não encontrado', 'error'); return; }

    const valorInput = document.getElementById('valorPagoInput').value.trim();
    if (!valorInput) { mostrarToast('Digite o valor pago', 'warning'); return; }

    const valorPago = parseFloat(valorInput.replace(',', '.'));
    if (isNaN(valorPago) || valorPago < 0) { mostrarToast('Valor inválido', 'warning'); return; }

    const total = pedido.total || 0;
    const falta = Math.max(0, total - valorPago);
    const novoStatus = valorPago >= total ? 'pago' : 'pendente';

    let obsExtra = '';
    if (valorPago >= total) {
        obsExtra = `✅ Pago integralmente (R$ ${valorPago.toFixed(2)})`;
    } else if (valorPago > 0) {
        obsExtra = `⚠️ Pagamento parcial: R$ ${valorPago.toFixed(2)} de R$ ${total.toFixed(2)} (falta R$ ${falta.toFixed(2)})`;
    }

    const confirmMsg = valorPago >= total
        ? `Confirmar pagamento TOTAL de R$ ${valorPago.toFixed(2)}?`
        : `Registrar pagamento PARCIAL de R$ ${valorPago.toFixed(2)}?\nFalta: R$ ${falta.toFixed(2)}\n\nO pedido continua como PENDENTE.`;
    if (!confirm(confirmMsg)) return;

    const btn = document.querySelector('#modalValorPago .btn-success');
    await executarComLoading(btn, '⏳ Registrando...', async () => {
        try {
            const obsAtual = pedido.obs || '';
            const novaObs = obsExtra ? `${obsAtual} | ${obsExtra}` : obsAtual;

            const { error } = await sb.from('todospedidos')
                .update({ pagamentostatus: novoStatus, obs: novaObs })
                .eq('id', id);

            if (error) throw error;

            fecharModalValorPago();
            await carregarPagamentos();
            await carregarDashboard();

            if (valorPago >= total) {
                mostrarToast(`✅ Pagamento total registrado! R$ ${valorPago.toFixed(2)}`, 'success');
            } else {
                mostrarToast(`⚠️ Pagamento parcial: R$ ${valorPago.toFixed(2)} (falta R$ ${falta.toFixed(2)})`, 'warning');
            }
        } catch (e) {
            console.error('Erro ao registrar pagamento:', e);
            mostrarToast('❌ Erro: ' + e.message, 'error');
        }
    });
};

// ============================================================
// LEMBRAR TODOS PENDENTES
// ============================================================
async function lembrarTodosPendentes() {
    try {
        const { data, error } = await sb
            .from('todospedidos')
            .select('*')
            .eq('pagamentostatus', 'pendente')
            .order('cliente');
        if (error) throw error;

        if (!data || data.length === 0) {
            mostrarToast('✅ Não há pagamentos pendentes!', 'success');
            return;
        }

        const clientes = {};
        data.forEach(p => {
            const tel = (p.telefone || '').replace(/\D/g, '');
            if (!tel) return;
            const chave = `${p.cliente}|${tel}`;
            if (!clientes[chave]) {
                clientes[chave] = { nome: p.cliente, tel: tel, pedidos: [], total: 0 };
            }
            clientes[chave].pedidos.push(p);
            clientes[chave].total += p.total || 0;
        });

        const lista = Object.values(clientes).sort((a, b) => b.pedidos.length - a.pedidos.length);

        if (lista.length === 0) {
            mostrarToast('Nenhum cliente com telefone válido', 'warning');
            return;
        }

        State.clientesPendentes = lista;

        const container = document.getElementById('listaClientesPendentes');
        container.innerHTML = lista.map((c, i) => `
            <div class="card-item" style="flex-direction:column;align-items:stretch;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div>
                        <strong style="color:var(--dourado);font-size:1.05em;">👤 ${Utils.escapeHtml(c.nome)}</strong>
                        <br>
                        <small>📱 ${Utils.mascararTelefone(c.tel)}</small>
                    </div>
                    <div style="text-align:right;">
                        <span class="badge badge-pendente">${c.pedidos.length} pedido(s)</span>
                        <br>
                        <strong style="color:var(--dourado);font-size:1.15em;">R$ ${c.total.toFixed(2)}</strong>
                    </div>
                </div>
                <div style="background:var(--bg-secondary);padding:8px 12px;border-radius:8px;margin-top:8px;font-size:0.85em;max-height:150px;overflow-y:auto;">
                    ${c.pedidos.map(p => {
                        const pid = p.pedido_id || `#${p.id}`;
                        const itensTexto = formatarItensPedido(p.itens);
                        const formaPgto = formatarPagamento(p.pagamentostatus);
                        return `<div style="padding:4px 0;border-bottom:1px solid var(--border-color);">
                            <strong>${pid}</strong> — ${formaPgto} — <strong>R$ ${(p.total || 0).toFixed(2)}</strong>
                            <br>
                            <small style="color:var(--text-secondary);">${Utils.escapeHtml(itensTexto)}</small>
                        </div>`;
                    }).join('')}
                </div>
                <div style="display:flex;gap:6px;margin-top:8px;">
                    <button class="btn btn-whatsapp btn-sm" onclick="enviarLembreteCliente(${i})" style="flex:1;">
                        📱 Enviar Lembrete (${c.pedidos.length} ${c.pedidos.length === 1 ? 'pedido' : 'pedidos'})
                    </button>
                </div>
            </div>
        `).join('');

        document.getElementById('modalLembretePendentes').classList.add('active');
    } catch (e) { tratarErro(e, 'Erro ao carregar pendentes'); }
}
window.lembrarTodosPendentes = lembrarTodosPendentes;

function enviarLembreteCliente(idx) {
    const cliente = State.clientesPendentes?.[idx];
    if (!cliente) { mostrarToast('Cliente não encontrado', 'error'); return; }

    const msg = montarMensagemLembrete(cliente.pedidos);
    window.open(`https://wa.me/55${cliente.tel}?text=${encodeURIComponent(msg)}`, '_blank');
    mostrarToast(`✅ WhatsApp aberto para ${cliente.nome}`, 'success');
}
window.enviarLembreteCliente = enviarLembreteCliente;

function fecharModalLembrete() {
    document.getElementById('modalLembretePendentes').classList.remove('active');
}
window.fecharModalLembrete = fecharModalLembrete;

// ============================================================
// DESCONTO EM PEDIDOS
// ============================================================
window.abrirModalDesconto = function(id) {
    const pedido = State.cache.pedidos.find(p => p.id === id);
    if (!pedido) { mostrarToast('Pedido não encontrado', 'error'); return; }

    document.getElementById('descontoPedidoId').value = id;
    document.getElementById('descontoPedidoInfo').value = `${pedido.pedido_id || '#' + pedido.id} — ${pedido.cliente} — R$ ${(pedido.total || 0).toFixed(2)}`;
    document.getElementById('descontoValorAtual').value = `R$ ${(pedido.total || 0).toFixed(2)}`;
    document.getElementById('descontoTipo').value = 'valor';
    document.getElementById('descontoInput').value = '';
    document.getElementById('descontoPreview').style.display = 'none';
    document.getElementById('modalDesconto').classList.add('active');
    setTimeout(() => document.getElementById('descontoInput').focus(), 200);
};

window.fecharModalDesconto = function() {
    document.getElementById('modalDesconto').classList.remove('active');
};

window.atualizarPreviewDesconto = function() {
    const id = document.getElementById('descontoPedidoId').value;
    const pedido = State.cache.pedidos.find(p => p.id == id);
    if (!pedido) return;

    const tipo = document.getElementById('descontoTipo').value;
    const valorInput = document.getElementById('descontoInput').value.trim();
    const totalOriginal = pedido.total || 0;

    if (!valorInput) {
        document.getElementById('descontoPreview').style.display = 'none';
        return;
    }

    let descValor = 0;
    const num = parseFloat(valorInput.replace('%', '').replace(',', '.'));

    if (isNaN(num) || num < 0) {
        document.getElementById('descontoPreview').style.display = 'none';
        return;
    }

    if (tipo === 'porcentagem') {
        if (num > 100) { document.getElementById('descontoPreview').style.display = 'none'; return; }
        descValor = (totalOriginal * num) / 100;
    } else {
        if (num > totalOriginal) { document.getElementById('descontoPreview').style.display = 'none'; return; }
        descValor = num;
    }

    descValor = Math.round(descValor * 100) / 100;
    const novoTotal = Math.max(0, totalOriginal - descValor);

    document.getElementById('descOriginal').textContent = `R$ ${totalOriginal.toFixed(2)}`;
    document.getElementById('descValor').textContent = `- R$ ${descValor.toFixed(2)}`;
    document.getElementById('descNovoTotal').textContent = `R$ ${novoTotal.toFixed(2)}`;
    document.getElementById('descontoPreview').style.display = 'block';
};

window.aplicarDescontoPedido = async function() {
    const id = document.getElementById('descontoPedidoId').value;
    const pedido = State.cache.pedidos.find(p => p.id == id);
    if (!pedido) { mostrarToast('Pedido não encontrado', 'error'); return; }

    const tipo = document.getElementById('descontoTipo').value;
    const valorInput = document.getElementById('descontoInput').value.trim();

    if (!valorInput) { mostrarToast('Digite o valor do desconto', 'warning'); return; }

    const num = parseFloat(valorInput.replace('%', '').replace(',', '.'));
    if (isNaN(num) || num < 0) { mostrarToast('Valor inválido', 'warning'); return; }

    const totalOriginal = pedido.total || 0;
    let descValor = 0;
    let descTexto = '';

    if (tipo === 'porcentagem') {
        if (num > 100) { mostrarToast('Porcentagem deve ser até 100%', 'warning'); return; }
        descValor = (totalOriginal * num) / 100;
        descTexto = `${num}%`;
    } else {
        if (num > totalOriginal) { mostrarToast('Desconto maior que o total', 'warning'); return; }
        descValor = num;
        descTexto = `R$ ${num.toFixed(2)}`;
    }

    descValor = Math.round(descValor * 100) / 100;
    const novoTotal = Math.max(0, totalOriginal - descValor);

    if (!confirm(`Aplicar desconto de ${descTexto}?\n\nValor original: R$ ${totalOriginal.toFixed(2)}\nDesconto: -R$ ${descValor.toFixed(2)}\nNovo total: R$ ${novoTotal.toFixed(2)}`)) return;

    const btn = document.querySelector('#modalDesconto .btn-success');
    await executarComLoading(btn, '⏳ Aplicando...', async () => {
        try {
            const obsAtual = pedido.obs || '';
            const novaObs = obsAtual.includes('Desconto:')
                ? obsAtual
                : `${obsAtual} | 🎁 Desconto: ${descTexto}`;

            const { error } = await sb.from('todospedidos')
                .update({
                    total: novoTotal,
                    desconto: descTexto,
                    obs: novaObs
                })
                .eq('id', id);

            if (error) throw error;

            fecharModalDesconto();
            await carregarPagamentos();
            await carregarPedidos(1);
            await carregarDashboard();

            mostrarToast(`✅ Desconto de ${descTexto} aplicado! Novo total: R$ ${novoTotal.toFixed(2)}`, 'success');
        } catch (e) {
            console.error('Erro ao aplicar desconto:', e);
            mostrarToast('❌ Erro: ' + e.message, 'error');
        }
    });
};

// ============================================================
// EXPORTAÇÃO: ESTOQUE DOS CARDÁPIOS
// ============================================================
window.exportarEstoqueCSV = function() {
    const dados = State.cache.estoque || [];
    if (dados.length === 0) { mostrarToast('Sem itens no estoque', 'warning'); return; }

    const linhas = [
        ['ID', 'Nome', 'Emoji', 'Preco (R$)', 'Estoque Total', 'Alocado C2', 'Disponivel C1', 'Valor em Estoque (R$)']
    ];

    dados.forEach(i => {
        const total = i.quantidadetotal || 0;
        const c2 = i.alocadocardapio2 || 0;
        const dispC1 = total - c2;
        const preco = i.preco || 0;
        linhas.push([
            i.id,
            `"${(i.nome || '').replace(/"/g, '""')}"`,
            i.emoji || '',
            preco.toFixed(2).replace('.', ','),
            total,
            c2,
            dispC1,
            (total * preco).toFixed(2).replace('.', ',')
        ]);
    });

    const csv = '\uFEFF' + linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estoque_cardapios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarToast('📥 CSV do estoque gerado!', 'success');
};

window.exportarEstoquePDF = function() {
    const dados = State.cache.estoque || [];
    if (dados.length === 0) { mostrarToast('Sem itens no estoque', 'warning'); return; }

    let totalGeral = 0;
    let linhas = '';
    dados.forEach(i => {
        const total = i.quantidadetotal || 0;
        const c2 = i.alocadocardapio2 || 0;
        const dispC1 = total - c2;
        const preco = i.preco || 0;
        const valor = total * preco;
        totalGeral += valor;

        linhas += `
            <tr>
                <td>${i.emoji || ''} ${i.nome || ''}</td>
                <td style="text-align:right;">R$ ${preco.toFixed(2)}</td>
                <td style="text-align:center;">${total}</td>
                <td style="text-align:center;">${c2}</td>
                <td style="text-align:center;">${dispC1}</td>
                <td style="text-align:right;">R$ ${valor.toFixed(2)}</td>
            </tr>
        `;
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Relatorio de Estoque - Cardapios</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
                h1 { color: #CC5500; font-size: 24px; margin-bottom: 6px; }
                .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
                .resumo { background: #f5f5f5; padding: 14px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 30px; }
                .resumo div { font-size: 14px; }
                .resumo strong { color: #CC5500; font-size: 18px; display: block; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #CC5500; color: white; padding: 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f9f9f9; }
                .footer { margin-top: 20px; font-size: 11px; color: #999; text-align: center; }
                @media print { body { padding: 12px; } }
            </style>
        </head>
        <body>
            <h1>📦 Relatorio de Estoque - Cardapios</h1>
            <div class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
            <div class="resumo">
                <div><strong>${dados.length}</strong>Itens cadastrados</div>
                <div><strong>R$ ${totalGeral.toFixed(2)}</strong>Valor total em estoque</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align:right;">Preco</th>
                        <th style="text-align:center;">Estoque</th>
                        <th style="text-align:center;">C2</th>
                        <th style="text-align:center;">Disp. C1</th>
                        <th style="text-align:right;">Valor</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
            <div class="footer">Dindins Gourmet FX - Relatorio gerado automaticamente</div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (!win) { mostrarToast('⚠️ Permita pop-ups para gerar PDF', 'warning'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
    mostrarToast('📄 PDF aberto. Escolha "Salvar como PDF".', 'info');
};

// ============================================================
// EXPORTAÇÃO: INSUMOS
// ============================================================
window.exportarInsumosCSV = function() {
    const dados = State.cache.insumos || [];
    if (dados.length === 0) { mostrarToast('Sem insumos', 'warning'); return; }

    const linhas = [
        ['ID', 'Nome', 'Unidade', 'Preco/Unidade (R$)', 'Estoque', 'Minimo', 'Valor em Estoque (R$)', 'Fornecedor', 'Observacoes']
    ];

    dados.forEach(i => {
        const preco = i.preco_por_unidade || 0;
        const estoque = i.quantidade_estoque || 0;
        linhas.push([
            i.id,
            `"${(i.nome || '').replace(/"/g, '""')}"`,
            i.unidade || '',
            preco.toFixed(4).replace('.', ','),
            String(estoque).replace('.', ','),
            String(i.quantidade_minima || 0).replace('.', ','),
            (preco * estoque).toFixed(2).replace('.', ','),
            `"${(i.fornecedor || '').replace(/"/g, '""')}"`,
            `"${(i.observacoes || '').replace(/"/g, '""')}"`
        ]);
    });

    const csv = '\uFEFF' + linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `insumos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarToast('📥 CSV dos insumos gerado!', 'success');
};

window.exportarInsumosPDF = function() {
    const dados = State.cache.insumos || [];
    if (dados.length === 0) { mostrarToast('Sem insumos', 'warning'); return; }

    let totalGeral = 0;
    let criticos = 0;
    let linhas = '';
    dados.forEach(i => {
        const preco = i.preco_por_unidade || 0;
        const estoque = i.quantidade_estoque || 0;
        const minimo = i.quantidade_minima || 0;
        const valor = preco * estoque;
        totalGeral += valor;

        let status = 'OK';
        let corStatus = '#22c55e';
        if (estoque <= 0) { status = 'Critico'; corStatus = '#ef4444'; criticos++; }
        else if (estoque <= minimo) { status = 'Baixo'; corStatus = '#f59e0b'; criticos++; }

        linhas += `
            <tr>
                <td>${i.nome || ''}</td>
                <td>${i.unidade || ''}</td>
                <td style="text-align:right;">R$ ${preco.toFixed(4)}</td>
                <td style="text-align:center;">${estoque}</td>
                <td style="text-align:center;">${minimo}</td>
                <td style="text-align:right;">R$ ${valor.toFixed(2)}</td>
                <td style="text-align:center;color:${corStatus};font-weight:bold;">${status}</td>
            </tr>
        `;
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Relatorio de Insumos</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
                h1 { color: #CC5500; font-size: 24px; margin-bottom: 6px; }
                .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
                .resumo { background: #f5f5f5; padding: 14px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 30px; }
                .resumo div { font-size: 14px; }
                .resumo strong { color: #CC5500; font-size: 18px; display: block; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #CC5500; color: white; padding: 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f9f9f9; }
                .footer { margin-top: 20px; font-size: 11px; color: #999; text-align: center; }
                @media print { body { padding: 12px; } }
            </style>
        </head>
        <body>
            <h1>🧪 Relatorio de Insumos</h1>
            <div class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
            <div class="resumo">
                <div><strong>${dados.length}</strong>Insumos cadastrados</div>
                <div><strong>${criticos}</strong>Em nivel critico/baixo</div>
                <div><strong>R$ ${totalGeral.toFixed(2)}</strong>Valor total em estoque</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Unidade</th>
                        <th style="text-align:right;">Preco/Un</th>
                        <th style="text-align:center;">Estoque</th>
                        <th style="text-align:center;">Minimo</th>
                        <th style="text-align:right;">Valor</th>
                        <th style="text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
            <div class="footer">Dindins Gourmet FX - Relatorio gerado automaticamente</div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (!win) { mostrarToast('⚠️ Permita pop-ups para gerar PDF', 'warning'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
    mostrarToast('📄 PDF aberto. Escolha "Salvar como PDF".', 'info');
};

console.log('✅ Admin parte 2 carregada! v17.0');
console.log('📥 Exportação CSV/PDF de estoque e insumos');
console.log('🎁 Desconto em pedidos via aba Pagamentos');
console.log('💵 Valor pago parcial');
console.log('📊 Resumo consolidado do cliente');
console.log('📞 Filtro por telefone em Financeiro');
