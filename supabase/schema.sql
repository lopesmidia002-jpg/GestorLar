-- ========================================================
-- GESTORLAR - SCHEMA DIRETO DO SUPABASE (ZERO LOGIN / AUTO-SYNC)
-- Execute este script no SQL Editor do Supabase
-- ========================================================

-- 1. Tabela de Perfil e Configurações Orçamentárias da Família
CREATE TABLE IF NOT EXISTS public.perfis_orcamento (
  user_id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  renda_familiar NUMERIC(12, 2) NOT NULL DEFAULT 6000.00,
  meta_fixas NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  meta_superfluos NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
  meta_investimentos NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Lançamentos Orçamentários (Contas, Supérfluos, Aportes)
CREATE TABLE IF NOT EXISTS public.itens_lancamento (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('fixas', 'superfluos', 'investimentos')),
  tipo_detalhado TEXT NOT NULL DEFAULT 'Geral',
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  vencimento TEXT NOT NULL DEFAULT 'Dia 10',
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Remover restrições e permitir acesso direto da aplicação (Zero Login)
ALTER TABLE public.itens_lancamento DROP CONSTRAINT IF EXISTS itens_lancamento_user_id_fkey;
ALTER TABLE public.perfis_orcamento DROP CONSTRAINT IF EXISTS perfis_orcamento_user_id_fkey;

-- Permitir acesso direto via API Anon (sem tela de login)
ALTER TABLE public.perfis_orcamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_lancamento DISABLE ROW LEVEL SECURITY;

-- 4. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_itens_categoria ON public.itens_lancamento(categoria);

-- 5. Habilitar Replicação em Tempo Real Multi-Dispositivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.perfis_orcamento, public.itens_lancamento;
