<!-- MODAL APLICAR DESCONTO -->
<div class="modal-overlay" id="modalDesconto">
    <div class="modal-box">
        <button class="close-btn" onclick="fecharModalDesconto()">✕</button>
        <h3>🎁 Aplicar Desconto</h3>
        <input type="hidden" id="descontoPedidoId">
        <div class="form-group">
            <label>Pedido</label>
            <input type="text" id="descontoPedidoInfo" readonly style="background:var(--bg-secondary);">
        </div>
        <div class="form-group">
            <label>Valor Atual</label>
            <input type="text" id="descontoValorAtual" readonly style="background:var(--bg-secondary);font-weight:700;color:var(--dourado);">
        </div>
        <div class="form-group">
            <label>Tipo de Desconto</label>
            <select id="descontoTipo" onchange="atualizarPreviewDesconto()">
                <option value="valor">💵 Valor fixo (R$)</option>
                <option value="porcentagem">📊 Porcentagem (%)</option>
            </select>
        </div>
        <div class="form-group">
            <label>Valor do Desconto</label>
            <input type="text" id="descontoInput" placeholder="Ex: 5 ou 10" oninput="atualizarPreviewDesconto()">
        </div>
        <div class="resultado-calculadora" id="descontoPreview" style="display:none;">
            <div class="resultado-linha"><span>Valor original:</span><strong id="descOriginal">R$ 0,00</strong></div>
            <div class="resultado-linha"><span>Desconto:</span><strong id="descValor" style="color:#f59e0b;">- R$ 0,00</strong></div>
            <div class="resultado-linha destaque"><span>💰 Novo total:</span><strong id="descNovoTotal">R$ 0,00</strong></div>
        </div>
        <div class="btn-row" style="margin-top:16px;">
            <button class="btn btn-success" onclick="aplicarDescontoPedido()">✅ Aplicar Desconto</button>
            <button class="btn btn-danger" onclick="fecharModalDesconto()">✕</button>
        </div>
    </div>
</div>
