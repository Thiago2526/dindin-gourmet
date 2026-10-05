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
