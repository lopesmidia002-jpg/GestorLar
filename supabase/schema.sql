-- ========================================================
-- GESTORLAR - SCHEMA DO SUPABASE (OBSIDIAN FINTECH PWA)
-- Execute este script no SQL Editor do seu projeto Supabase
-- ========================================================

-- 1. Tabela de Perfil e Configurações Orçamentárias da Família
CREATE TABLE IF NOT EXISTS public.perfis_orcamento (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('fixas', 'superfluos', 'investimentos')),
  tipo_detalhado TEXT NOT NULL DEFAULT 'Geral',
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  vencimento TEXT NOT NULL DEFAULT 'Dia 10',
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Habilitação de Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_itens_user_id ON public.itens_lancamento(user_id);
CREATE INDEX IF NOT EXISTS idx_itens_categoria ON public.itens_lancamento(categoria);

-- 4. Habilitação de RLS (Row Level Security - Segurança por Família/Usuário)
ALTER TABLE public.perfis_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_lancamento ENABLE ROW LEVEL SECURITY;

-- Políticas para perfis_orcamento
CREATE POLICY "Usuários podem visualizar apenas seu próprio perfil orçamentário"
  ON public.perfis_orcamento FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio perfil orçamentário"
  ON public.perfis_orcamento FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas seu próprio perfil orçamentário"
  ON public.perfis_orcamento FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para itens_lancamento
CREATE POLICY "Usuários podem visualizar apenas seus próprios lançamentos"
  ON public.itens_lancamento FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir lançamentos associados à sua conta"
  ON public.itens_lancamento FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas seus próprios lançamentos"
  ON public.itens_lancamento FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir apenas seus próprios lançamentos"
  ON public.itens_lancamento FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Habilitar Replicação em Tempo Real (Realtime Sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.perfis_orcamento;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_lancamento;
