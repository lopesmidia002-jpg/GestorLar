-- ========================================================
-- GESTORLAR - SCHEMA V2 EXPANDIDO COM REGRAS CONTÁBEIS E IA
-- Módulo completo de Contas, Dívidas, Investimentos, Empréstimos,
-- Idempotência, Confirmações Pendentes e Auditoria de Comandos
-- ========================================================

-- Extensão para UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. TABELA: CONTAS FINANCEIRAS
-- ========================================================
CREATE TABLE IF NOT EXISTS public.contas_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'investimento', 'carteira', 'cartao_credito')),
  saldo_atual NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  limite_credito NUMERIC(14, 2) DEFAULT 0.00,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  instituicao TEXT,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 2. EVOLUÇÃO DA TABELA ITENS_LANCAMENTO
-- ========================================================
ALTER TABLE public.itens_lancamento 
  ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_movimentacao TEXT DEFAULT 'despesa' CHECK (tipo_movimentacao IN ('receita', 'despesa', 'transferencia', 'aporte', 'resgate')),
  ADD COLUMN IF NOT EXISTS data_movimentacao DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS data_vencimento DATE,
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS origem_lancamento TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_itens_idempotency 
  ON public.itens_lancamento(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- ========================================================
-- 3. TABELA: DÍVIDAS E FINANCIAMENTOS (PASSIVOS)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.dividas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  credor_ou_devedor TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'passivo_proprio' CHECK (tipo IN ('passivo_proprio', 'emprestimo_tomado')),
  valor_original NUMERIC(14, 2) NOT NULL CHECK (valor_original > 0),
  saldo_pendente NUMERIC(14, 2) NOT NULL CHECK (saldo_pendente >= 0),
  taxa_juros NUMERIC(6, 3),
  condicoes TEXT,
  data_contratacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  total_parcelas INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'quitada', 'renegociada', 'cancelada')),
  plano_parcelas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico de pagamentos de dívidas (cada amortização registrada sem sobrescrever histórico)
CREATE TABLE IF NOT EXISTS public.pagamentos_divida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  divida_id UUID NOT NULL REFERENCES public.dividas(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  valor_pago NUMERIC(14, 2) NOT NULL CHECK (valor_pago > 0),
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  conta_origem_id UUID REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  numero_parcela INTEGER,
  observacoes TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 4. TABELA: VALORES A RECEBER (EMPRÉSTIMOS A TERCEIROS)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.valores_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  devedor TEXT NOT NULL,
  valor_original NUMERIC(14, 2) NOT NULL CHECK (valor_original > 0),
  saldo_restante NUMERIC(14, 2) NOT NULL CHECK (saldo_restante >= 0),
  data_emprestimo DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento_prevista DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido_parcial', 'quitado', 'perdido')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 5. TABELA: INVESTIMENTOS E MOVIMENTAÇÕES PATRIMONIAIS
-- ========================================================
CREATE TABLE IF NOT EXISTS public.investimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  tipo_ativo TEXT NOT NULL CHECK (tipo_ativo IN ('renda_fixa', 'acoes', 'fii', 'cripto', 'tesouro', 'cdb', 'fundo')),
  nome_simbolo TEXT NOT NULL,
  quantidade NUMERIC(16, 6) NOT NULL DEFAULT 1.0,
  preco_medio NUMERIC(14, 4) NOT NULL DEFAULT 0.00,
  saldo_estimado NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  instituicao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_investimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investimento_id UUID NOT NULL REFERENCES public.investimentos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('aporte', 'rendimento', 'venda', 'taxa')),
  quantidade NUMERIC(16, 6),
  preco_unitario NUMERIC(14, 4),
  valor_total NUMERIC(14, 2) NOT NULL CHECK (valor_total > 0),
  taxas_impostos NUMERIC(12, 2) DEFAULT 0.00,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  conta_origem_destino_id UUID REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 6. TABELA: CONFIRMAÇÕES PENDENTES DA IA (SECURITY TOKENS)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.ai_confirmacoes_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  intent TEXT NOT NULL,
  proposta_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'expirado')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 7. TABELA: LOG DE IDEMPOTÊNCIA E AUDITORIA DA IA
-- ========================================================
CREATE TABLE IF NOT EXISTS public.ai_solicitacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  origem TEXT NOT NULL,
  intent TEXT,
  prompt_sanitizado TEXT,
  payload_recebido JSONB,
  resposta_enviada JSONB,
  status TEXT NOT NULL DEFAULT 'processado' CHECK (status IN ('processado', 'erro', 'bloqueado', 'pendente_confirmacao')),
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 8. ÍNDICES DE PERFORMANCE E CONSULTA
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_contas_user ON public.contas_financeiras(user_id);
CREATE INDEX IF NOT EXISTS idx_dividas_user_status ON public.dividas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_divida ON public.pagamentos_divida(divida_id);
CREATE INDEX IF NOT EXISTS idx_valores_receber_user ON public.valores_receber(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investimentos_user ON public.investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_mov_investimento ON public.movimentacoes_investimento(investimento_id);
CREATE INDEX IF NOT EXISTS idx_ai_conf_token ON public.ai_confirmacoes_pendentes(token);
CREATE INDEX IF NOT EXISTS idx_ai_conf_user ON public.ai_confirmacoes_pendentes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_log_idempotency ON public.ai_solicitacoes_log(idempotency_key);

-- ========================================================
-- 9. FUNÇÃO ATÔMICA: TRANSFERÊNCIA ENTRE CONTAS
-- ========================================================
CREATE OR REPLACE FUNCTION public.executar_transferencia_contas(
  p_user_id TEXT,
  p_origem_id UUID,
  p_destino_id UUID,
  p_valor NUMERIC(14, 2),
  p_descricao TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_origem NUMERIC(14, 2);
  v_nome_origem TEXT;
  v_nome_destino TEXT;
  v_log_existente JSONB;
BEGIN
  -- 1. Verificação de idempotência
  SELECT resposta_enviada INTO v_log_existente 
  FROM public.ai_solicitacoes_log 
  WHERE idempotency_key = p_idempotency_key;

  IF v_log_existente IS NOT NULL THEN
    RETURN v_log_existente;
  END IF;

  -- 2. Validações básicas
  IF p_origem_id = p_destino_id THEN
    RAISE EXCEPTION 'A conta de origem e destino não podem ser iguais';
  END IF;

  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor de transferência deve ser maior que zero';
  END IF;

  -- 3. Trava e lê saldo da conta de origem
  SELECT saldo_atual, nome INTO v_saldo_origem, v_nome_origem
  FROM public.contas_financeiras
  WHERE id = p_origem_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de origem não encontrada ou não pertence ao usuário';
  END IF;

  -- 4. Trava conta de destino
  SELECT nome INTO v_nome_destino
  FROM public.contas_financeiras
  WHERE id = p_destino_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de destino não encontrada ou não pertence ao usuário';
  END IF;

  -- 5. Executa a transferência atômica (Deduz da origem, adiciona no destino)
  UPDATE public.contas_financeiras
  SET saldo_atual = saldo_atual - p_valor, updated_at = NOW()
  WHERE id = p_origem_id;

  UPDATE public.contas_financeiras
  SET saldo_atual = saldo_atual + p_valor, updated_at = NOW()
  WHERE id = p_destino_id;

  -- 6. Registra no log de idempotência
  INSERT INTO public.ai_solicitacoes_log (
    idempotency_key, user_id, origem, intent, prompt_sanitizado, payload_recebido, resposta_enviada, status
  ) VALUES (
    p_idempotency_key,
    p_user_id,
    'transfer_money',
    'transfer_money',
    p_descricao,
    jsonb_build_object('origem_id', p_origem_id, 'destino_id', p_destino_id, 'valor', p_valor),
    jsonb_build_object(
      'sucesso', true, 
      'mensagem', format('Transferência de R$ %s de %s para %s realizada com sucesso.', p_valor, v_nome_origem, v_nome_destino),
      'origem', v_nome_origem,
      'destino', v_nome_destino,
      'valor', p_valor
    ),
    'processado'
  );

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', format('Transferência de R$ %s realizada de %s para %s', p_valor, v_nome_origem, v_nome_destino),
    'origem_id', p_origem_id,
    'destino_id', p_destino_id,
    'valor', p_valor
  );
END;
$$;

-- ========================================================
-- 10. REPLICAÇÃO EM TEMPO REAL
-- ========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.contas_financeiras, 
  public.dividas, 
  public.pagamentos_divida, 
  public.valores_receber, 
  public.investimentos, 
  public.ai_confirmacoes_pendentes;
