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

        const formaPagamento = fmtPagamento(x.pagamento);

        let localTexto = '—';
        const matchSetor = obs.match(/Entrega:\s*([^|]+)/);
        if (matchSetor) {
            localTexto = `📍 Entrega: ${matchSetor[1].trim()}`;
        } else if (obs.includes('Retirada no local')) {
            localTexto = '📍 Retirada no local';
        }

        // ✅ NOVO: extrai o endereço do obs
        let enderecoTexto = '';
        const matchEndereco = obs.match(/Endereço:\s*([^|]+)/);
        if (matchEndereco) {
            enderecoTexto = matchEndereco[1].trim();
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

        const vp = x.valorpago || 0;
        const tp = x.total || 0;
        let sp;
        if (x.pagamentostatus === 'pago') {
            sp = '<span class="badge badge-pago">✅ PAGO</span>';
        } else if (vp > 0 && vp < tp) {
            sp = '<span class="badge badge-pendente" style="background:#8b5cf6;color:white;">💜 PARCIAL</span>';
        } else {
            sp = '<span class="badge badge-pendente">⏳ PENDENTE</span>';
        }

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

        // ✅ Bloco de endereço (só aparece se tiver)
        const enderecoHtml = enderecoTexto
            ? `<div style="background:#fff7ed;border:1px solid #fed7aa;padding:8px 12px;border-radius:8px;margin-top:6px;font-size:0.9em;color:#9a3412;">
                <strong>🏠 Endereço:</strong> ${Utils.escapeHtml(enderecoTexto)}
               </div>`
            : '';

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
                        <strong style="color:var(--dourado);font-size:1.2em;">R$ ${tp.toFixed(2)}</strong>
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
                    ${enderecoHtml}
                </div>

                ${ih}

                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border-color);">
                    <div style="font-size:0.9em;color:var(--text-secondary);">
                        💰 Subtotal: <strong>R$ ${subtotal.toFixed(2)}</strong>
                        ${taxa > 0 ? `<br>🛵 Taxa: <strong>R$ ${taxa.toFixed(2)}</strong>` : ''}
                    </div>
                    <div style="font-size:1.1em;color:var(--dourado);font-weight:800;">
                        💵 TOTAL: R$ ${tp.toFixed(2)}
                    </div>
                </div>

                <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
                    ${be} ${bw} <button class="btn btn-danger btn-sm" onclick="excluirPedido(${x.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}
