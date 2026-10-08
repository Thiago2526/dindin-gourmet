// ============================================================
// CONFIGURAÇÃO COMPARTILHADA — Dindins Gourmet FX
// ============================================================
// ⚠️ Este arquivo é PÚBLICO. Nunca coloque chaves SECRETAS aqui.
// A chave "publishable" é segura para o frontend.
// ============================================================

(function() {
    'use strict';

    // ──────────────────────────────────────────────────────────
    // SUPABASE
    // ──────────────────────────────────────────────────────────
    const SUPABASE_URL = 'https://khgkneegpxcgufslupby.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_yiQJTpp-mB2sD3QGtSBrOA_euX6346G';

    // ──────────────────────────────────────────────────────────
    // VALIDAÇÃO DE SEGURANÇA
    // ──────────────────────────────────────────────────────────
    if (SUPABASE_KEY.startsWith('eyJ') || SUPABASE_KEY.startsWith('sb_secret_')) {
        console.error('🚨 CHAVE SECRETA NO FRONTEND! 🚨');
        alert('🚨 ERRO CRÍTICO DE SEGURANÇA. Contate o suporte.');
        throw new Error('Chave secreta no cliente — não use service_role no frontend');
    }

    console.log('%c🔒 Segurança OK — config carregada', 'color: #22c55e; font-weight: bold;');

    // ──────────────────────────────────────────────────────────
    // EXPORTA COMO GLOBAL
    // ──────────────────────────────────────────────────────────
    window.CONFIG = {
        SUPABASE_URL,
        SUPABASE_KEY,

        // Configurações gerais
        APP_NAME: 'Dindins Gourmet FX',
        APP_VERSION: '1.0.0',
        TIMEZONE: 'America/Sao_Paulo',

        // Contatos
        WHATSAPP_PADRAO: '(61) 98647-1897',
        DOMINIO: 'dindinsgourmet.com.br'
    };

    // Cria o client do Supabase (se a lib estiver carregada)
    if (window.supabase && !window.sb) {
        window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
                storage: window.localStorage,
                flowType: 'pkce'
            }
        });
        console.log('✅ Supabase client criado');
    }
})();
