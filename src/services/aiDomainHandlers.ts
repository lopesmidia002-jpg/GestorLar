import { getSupabaseClient } from '../lib/supabase';
import { FAMILY_ID } from './financeSyncService';
import type { 
  FinancialInterpretation, 
  AiFinancialProcessResult, 
  PendingConfirmationProposal 
} from '../types/aiSchema';
import type { EstadoFinanceiro, CategoriaOrcamentaria } from '../types/finance';

/**
 * Interface de contexto e callbacks locais caso o usuário esteja trabalhando com fallback de estado em memória/localStorage
 */
export interface DomainHandlerContext {
  userId?: string;
  idempotencyKey: string;
  estadoLocal?: EstadoFinanceiro;
  onAdicionarItem?: (item: any) => void;
  onAtualizarItem?: (id: string, updates: any) => void;
  onRemoverItem?: (id: string) => void;
  onAlternarPago?: (id: string) => void;
  onAtualizarRenda?: (novaRenda: number) => void;
  onAtualizarMetas?: (metas: any) => void;
}

/**
 * Gera um token aleatório seguro para propostas de confirmação
 */
function gerarTokenConfirmacao(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `cnf_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }
  return `cnf_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Cria uma proposta de confirmação pendente imutável com prazo de expiração (10 minutos)
 */
export async function criarPropostaConfirmacao(
  intent: FinancialInterpretation['intent'],
  interpretacao: FinancialInterpretation,
  tituloResumo: string,
  descricaoDetalhada: string,
  impacto: 'baixo' | 'medio' | 'alto' | 'irreversivel',
  userId: string = FAMILY_ID
): Promise<PendingConfirmationProposal> {
  const token = gerarTokenConfirmacao();
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + 10 * 60 * 1000).toISOString(); // 10 min

  const proposta: PendingConfirmationProposal = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prop_${Date.now()}`,
    token,
    intent,
    titulo_resumo: tituloResumo,
    descricao_detalhada: descricaoDetalhada,
    impacto_financeiro: impacto,
    payload_execucao: interpretacao,
    expira_em: expiraEm,
    criado_em: agora.toISOString(),
    status: 'pendente'
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('ai_confirmacoes_pendentes').insert({
        id: proposta.id,
        token: proposta.token,
        user_id: userId,
        intent: proposta.intent,
        proposta_payload: proposta.payload_execucao,
        status: 'pendente',
        expires_at: proposta.expira_em,
        created_at: proposta.criado_em
      });
    } catch (err) {
      console.warn('Aviso ao registrar confirmação no Supabase:', err);
    }
  }

  return proposta;
}

/**
 * Mapeia categoria aberta para uma das categorias orçamentárias canônicas
 */
function mapearCategoriaCanonica(cat: string | null): CategoriaOrcamentaria {
  if (!cat) return 'superfluos';
  const c = cat.toLowerCase();
  if (c.includes('invest') || c.includes('aporte') || c.includes('reserva') || c.includes('poupanca') || c.includes('fundo')) {
    return 'investimentos';
  }
  if (
    c.includes('fixa') || c.includes('aluguel') || c.includes('luz') || c.includes('agua') || 
    c.includes('internet') || c.includes('condominio') || c.includes('escola') || c.includes('saude') ||
    c.includes('plano') || c.includes('mercado') || c.includes('farmacia')
  ) {
    return 'fixas';
  }
  return 'superfluos';
}

/**
 * 14. REGISTRO E VERIFICAÇÃO DE IDEMPOTÊNCIA
 */
async function verificarIdempotencia(
  idempotencyKey: string,
  userId: string = FAMILY_ID
): Promise<AiFinancialProcessResult | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data } = await client
      .from('ai_solicitacoes_log')
      .select('resposta_enviada')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.resposta_enviada) {
      return data.resposta_enviada as AiFinancialProcessResult;
    }
  } catch (err) {
    console.warn('Erro ao verificar idempotência:', err);
  }
  return null;
}

async function registrarLogIdempotente(
  idempotencyKey: string,
  intent: string,
  prompt: string,
  payload: any,
  resposta: AiFinancialProcessResult,
  userId: string = FAMILY_ID
) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('ai_solicitacoes_log').upsert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      origem: 'ai_engine',
      intent,
      prompt_sanitizado: prompt,
      payload_recebido: payload,
      resposta_enviada: resposta,
      status: resposta.sucesso ? 'processado' : 'erro',
      erro_mensagem: resposta.erro ? resposta.erro.detalhe : null,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Erro ao salvar log de idempotência:', err);
  }
}

// ========================================================
// 9. MANIPULADORES DE DOMÍNIO EXPLÍCITOS
// ========================================================

/**
 * 1. create_income
 */
async function handleCreateIncome(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const descricao = data.description || 'Receita registrada';
  const userId = ctx.userId || FAMILY_ID;

  if (ctx.onAdicionarItem) {
    ctx.onAdicionarItem({
      titulo: `Receita: ${descricao}`,
      valor: valor,
      categoria: 'fixas',
      tipoDetalhado: data.subcategory || 'Salário / Renda',
      vencimento: data.transaction_date || 'Recebido',
      pago: true
    });
  }

  const client = getSupabaseClient();
  if (client) {
    await client.from('itens_lancamento').insert({
      id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      user_id: userId,
      titulo: descricao,
      categoria: 'fixas',
      tipo_detalhado: 'Receita',
      tipo_movimentacao: 'receita',
      valor: valor,
      data_movimentacao: data.transaction_date || new Date().toISOString().split('T')[0],
      pago: true,
      idempotency_key: ctx.idempotencyKey
    });
  }

  return {
    sucesso: true,
    mensagem: `✅ Receita de R$ ${valor.toFixed(2)} ("${descricao}") registrada com sucesso no caixa!`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'create_income',
    registrosAfetados: 1
  };
}

/**
 * 2. create_expense
 */
async function handleCreateExpense(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const descricao = data.description || 'Despesa';
  const categoriaCanonica = mapearCategoriaCanonica(data.category);
  const userId = ctx.userId || FAMILY_ID;
  const isCartao = data.payment_method === 'cartao_credito';

  if (ctx.onAdicionarItem) {
    ctx.onAdicionarItem({
      titulo: descricao,
      valor: valor,
      categoria: categoriaCanonica,
      tipoDetalhado: data.category || 'Geral',
      vencimento: data.due_date || (isCartao ? 'Fatura Cartão' : 'Dia 10'),
      pago: data.status === 'paid'
    });
  }

  const client = getSupabaseClient();
  if (client) {
    await client.from('itens_lancamento').insert({
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      user_id: userId,
      titulo: descricao,
      categoria: categoriaCanonica,
      tipo_detalhado: data.category || 'Geral',
      tipo_movimentacao: 'despesa',
      valor: valor,
      data_movimentacao: data.transaction_date || new Date().toISOString().split('T')[0],
      data_vencimento: data.due_date,
      metodo_pagamento: data.payment_method,
      pago: data.status === 'paid',
      idempotency_key: ctx.idempotencyKey
    });
  }

  const avisoCartao = isCartao ? ' (Registrado como lançamento de cartão - fatura pendente)' : '';
  return {
    sucesso: true,
    mensagem: `✅ Despesa de R$ ${valor.toFixed(2)} em "${descricao}" [${categoriaCanonica.toUpperCase()}] salva com sucesso!${avisoCartao}`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'create_expense',
    registrosAfetados: 1
  };
}

/**
 * 3. create_debt
 */
async function handleCreateDebt(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const credor = data.counterparty || data.description || 'Credor / Financiador';
  const userId = ctx.userId || FAMILY_ID;

  const client = getSupabaseClient();
  if (client) {
    await client.from('dividas').insert({
      user_id: userId,
      credor_ou_devedor: credor,
      tipo: 'passivo_proprio',
      valor_original: valor,
      saldo_pendente: valor,
      taxa_juros: data.interest_rate,
      total_parcelas: data.installments || 1,
      status: 'ativa',
      data_contratacao: data.transaction_date || new Date().toISOString().split('T')[0],
      data_vencimento: data.due_date
    });
  }

  return {
    sucesso: true,
    mensagem: `📌 Dívida/Passivo com ${credor} de R$ ${valor.toFixed(2)} registrado com saldo pendente de R$ ${valor.toFixed(2)}. Não foi contabilizado como despesa imediata de caixa.`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'create_debt',
    registrosAfetados: 1
  };
}

/**
 * 4. pay_debt
 */
async function handlePayDebt(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const credor = data.counterparty || data.description || '';
  const userId = ctx.userId || FAMILY_ID;
  const client = getSupabaseClient();

  if (!client) {
    return {
      sucesso: false,
      mensagem: 'Banco de dados não disponível para amortização de dívida.',
      interpretacao: data,
      requerConfirmacao: false,
      erro: { codigo: 'DB_UNAVAILABLE', detalhe: 'Conexão Supabase inativa', permiteRepetir: true }
    };
  }

  // 1. Busca dívida correspondente
  let query = client.from('dividas').select('*').eq('user_id', userId).eq('status', 'ativa');
  if (credor) {
    query = query.ilike('credor_ou_devedor', `%${credor}%`);
  }
  const { data: dividasEncontradas } = await query;

  if (!dividasEncontradas || dividasEncontradas.length === 0) {
    return {
      sucesso: false,
      mensagem: `Nenhuma dívida ativa encontrada para "${credor || 'o credor informado'}".`,
      interpretacao: data,
      requerConfirmacao: false,
      erro: { codigo: 'DEBT_NOT_FOUND', detalhe: 'Nenhum passivo ativo com este nome', permiteRepetir: false }
    };
  }

  // Se houver mais de uma dívida ambígua, requer confirmação
  if (dividasEncontradas.length > 1) {
    const proposta = await criarPropostaConfirmacao(
      'pay_debt',
      data,
      `Confirmar qual dívida abater (R$ ${valor.toFixed(2)})`,
      `Foram encontradas ${dividasEncontradas.length} dívidas ativas: ${dividasEncontradas.map(d => `${d.credor_ou_devedor} (Saldo: R$ ${d.saldo_pendente})`).join(', ')}. Especifique qual deseja amortizar.`,
      'medio',
      userId
    );
    return {
      sucesso: false,
      mensagem: `⚠️ Encontrei múltiplas dívidas em aberto. Por favor confirme qual deseja pagar:`,
      interpretacao: data,
      requerConfirmacao: true,
      propostaConfirmacao: proposta
    };
  }

  const divida = dividasEncontradas[0];
  const novoSaldo = Math.max(0, Number(divida.saldo_pendente) - valor);
  const statusAtualizado = novoSaldo <= 0 ? 'quitada' : 'ativa';

  // 2. Atualiza saldo da dívida
  await client.from('dividas').update({
    saldo_pendente: novoSaldo,
    status: statusAtualizado,
    updated_at: new Date().toISOString()
  }).eq('id', divida.id);

  // 3. Registra pagamento preservando histórico
  await client.from('pagamentos_divida').insert({
    divida_id: divida.id,
    user_id: userId,
    valor_pago: valor,
    data_pagamento: data.transaction_date || new Date().toISOString().split('T')[0],
    idempotency_key: ctx.idempotencyKey,
    observacoes: `Amortização registrada via assistente IA`
  });

  return {
    sucesso: true,
    mensagem: `✅ Pagamento de R$ ${valor.toFixed(2)} registrado para a dívida de ${divida.credor_ou_devedor}. Novo saldo devedor: R$ ${novoSaldo.toFixed(2)}${statusAtualizado === 'quitada' ? ' 🎉 (Dívida 100% quitada!)' : ''}`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'pay_debt',
    registrosAfetados: 2
  };
}

/**
 * 5. create_receivable & 6. register_lending
 */
async function handleRegisterLending(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const devedor = data.counterparty || data.description || 'Pessoa / Terceiro';
  const userId = ctx.userId || FAMILY_ID;

  const client = getSupabaseClient();
  if (client) {
    await client.from('valores_receber').insert({
      user_id: userId,
      devedor: devedor,
      valor_original: valor,
      saldo_restante: valor,
      data_emprestimo: data.transaction_date || new Date().toISOString().split('T')[0],
      data_vencimento_prevista: data.due_date,
      status: 'pendente',
      observacoes: 'Empréstimo concedido registrado via IA'
    });
  }

  return {
    sucesso: true,
    mensagem: `🤝 Empréstimo concedido a ${devedor} no valor de R$ ${valor.toFixed(2)} registrado como Ativo a Receber (não como gasto supérfluo).`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'register_lending',
    registrosAfetados: 1
  };
}

/**
 * 7. register_borrowing
 */
async function handleRegisterBorrowing(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const credor = data.counterparty || data.description || 'Credor / Banco';
  const userId = ctx.userId || FAMILY_ID;

  const client = getSupabaseClient();
  if (client) {
    await client.from('dividas').insert({
      user_id: userId,
      credor_ou_devedor: credor,
      tipo: 'emprestimo_tomado',
      valor_original: valor,
      saldo_pendente: valor,
      status: 'ativa',
      data_contratacao: data.transaction_date || new Date().toISOString().split('T')[0],
      total_parcelas: data.installments || 1
    });
  }

  return {
    sucesso: true,
    mensagem: `📥 Empréstimo tomado de ${credor} no valor de R$ ${valor.toFixed(2)} registrado como Passivo (obrigação de pagamento), sem inflar receitas operacionais do lar.`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'register_borrowing',
    registrosAfetados: 1
  };
}

/**
 * 8. create_investment
 */
async function handleCreateInvestment(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const simbolo = data.asset_symbol || data.description || 'Ativo Financeiro';
  const tipoAtivo = data.asset_type || 'renda_fixa';
  const userId = ctx.userId || FAMILY_ID;

  const client = getSupabaseClient();
  if (client) {
    const { data: inv } = await client.from('investimentos').insert({
      user_id: userId,
      tipo_ativo: tipoAtivo,
      nome_simbolo: simbolo,
      quantidade: data.asset_quantity || 1,
      preco_medio: data.unit_price || valor,
      saldo_estimado: valor
    }).select('id').single();

    if (inv) {
      await client.from('movimentacoes_investimento').insert({
        investimento_id: inv.id,
        user_id: userId,
        tipo_evento: 'aporte',
        valor_total: valor,
        idempotency_key: ctx.idempotencyKey
      });
    }
  }

  return {
    sucesso: true,
    mensagem: `📈 Aporte em investimento de R$ ${valor.toFixed(2)} em ${simbolo} (${tipoAtivo.toUpperCase()}) registrado com sucesso como transferência patrimonial.`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'create_investment',
    registrosAfetados: 2
  };
}

/**
 * 9. register_investment_income
 */
async function handleInvestmentIncome(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const simbolo = data.asset_symbol || data.description || 'Ativo';
  const userId = ctx.userId || FAMILY_ID;

  const client = getSupabaseClient();
  if (client) {
    const { data: inv } = await client.from('investimentos').select('id, saldo_estimado').ilike('nome_simbolo', `%${simbolo}%`).maybeSingle();
    if (inv) {
      await client.from('movimentacoes_investimento').insert({
        investimento_id: inv.id,
        user_id: userId,
        tipo_evento: 'rendimento',
        valor_total: valor,
        idempotency_key: ctx.idempotencyKey
      });
      // Aumenta saldo estimado
      await client.from('investimentos').update({
        saldo_estimado: Number(inv.saldo_estimado) + valor
      }).eq('id', inv.id);
    }
  }

  return {
    sucesso: true,
    mensagem: `💰 Rendimento/Provento de R$ ${valor.toFixed(2)} recebido de ${simbolo} contabilizado separadamente de aportes e receitas operacionais.`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'register_investment_income',
    registrosAfetados: 1
  };
}

/**
 * 10. register_investment_sale
 */
async function handleInvestmentSale(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const simbolo = data.asset_symbol || data.description || 'Ativo';
  const userId = ctx.userId || FAMILY_ID;

  const client = getSupabaseClient();
  if (client) {
    const { data: inv } = await client.from('investimentos').select('id, saldo_estimado').ilike('nome_simbolo', `%${simbolo}%`).maybeSingle();
    if (inv) {
      await client.from('movimentacoes_investimento').insert({
        investimento_id: inv.id,
        user_id: userId,
        tipo_evento: 'venda',
        valor_total: valor,
        idempotency_key: ctx.idempotencyKey
      });
      const novoSaldo = Math.max(0, Number(inv.saldo_estimado) - valor);
      await client.from('investimentos').update({ saldo_estimado: novoSaldo }).eq('id', inv.id);
    }
  }

  return {
    sucesso: true,
    mensagem: `🔄 Resgate/Venda de R$ ${valor.toFixed(2)} em ${simbolo} registrado. Recursos transferidos para liquidez; ganho de capital depende do custo de aquisição.`,
    interpretacao: data,
    requerConfirmacao: false,
    acaoExecutada: 'register_investment_sale',
    registrosAfetados: 1
  };
}

/**
 * 11. transfer_money
 * Regra: Transferência entre contas próprias reduz origem e aumenta destino.
 * NÃO é classificada como receita nem como despesa.
 * SEMPRE requer confirmação antes da execução real se houver impacto ou parâmetros a validar.
 */
async function handleTransferMoney(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const valor = Number(data.amount);
  const origem = data.account_reference || 'Conta Origem';
  const destino = data.destination_account_reference || 'Conta Destino';
  const userId = ctx.userId || FAMILY_ID;

  // Transferências entre contas requerem confirmação explícita
  const proposta = await criarPropostaConfirmacao(
    'transfer_money',
    data,
    `Transferir R$ ${valor.toFixed(2)} de ${origem} para ${destino}`,
    `Esta ação moverá R$ ${valor.toFixed(2)} entre suas contas próprias. Não alterará seus totais consolidados de receitas ou despesas. Deseja efetivar agora?`,
    'medio',
    userId
  );

  return {
    sucesso: false,
    mensagem: `⚠️ Confirmação necessária: Deseja transferir R$ ${valor.toFixed(2)} de **${origem}** para **${destino}**?`,
    interpretacao: data,
    requerConfirmacao: true,
    propostaConfirmacao: proposta
  };
}

/**
 * 12. update_transaction
 */
async function handleUpdateTransaction(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const termo = data.description || '';
  const client = getSupabaseClient();

  if (termo && ctx.onAtualizarItem && ctx.estadoLocal) {
    const itemEncontrado = ctx.estadoLocal.itens.find(i => 
      i.titulo.toLowerCase().includes(termo.toLowerCase())
    );
    if (itemEncontrado) {
      const updates: any = {};
      if (data.amount) updates.valor = Number(data.amount);
      if (data.status) updates.pago = data.status === 'paid';
      ctx.onAtualizarItem(itemEncontrado.id, updates);

      if (client) {
        await client.from('itens_lancamento').update(updates).eq('id', itemEncontrado.id);
      }

      return {
        sucesso: true,
        mensagem: `✏️ Item "${itemEncontrado.titulo}" atualizado com sucesso!`,
        interpretacao: data,
        requerConfirmacao: false,
        acaoExecutada: 'update_transaction',
        registrosAfetados: 1
      };
    }
  }

  return {
    sucesso: false,
    mensagem: `Não foi possível localizar uma transação com o termo "${termo}" para atualizar.`,
    interpretacao: data,
    requerConfirmacao: false
  };
}

/**
 * 13. delete_transaction
 * Regra: Exclusão é irreversível -> SEMPRE exige confirmação com token
 */
async function handleDeleteTransaction(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const termo = data.description || '';
  const userId = ctx.userId || FAMILY_ID;

  const proposta = await criarPropostaConfirmacao(
    'delete_transaction',
    data,
    `Excluir transação "${termo}"`,
    `Atenção: A remoção da transação "${termo}" é irreversível e atualizará seu saldo histórico. Confirma a exclusão definitiva?`,
    'alto',
    userId
  );

  return {
    sucesso: false,
    mensagem: `⚠️ Exclusão solicitada para "${termo}". Por favor, confirme na proposta abaixo antes de remover:`,
    interpretacao: data,
    requerConfirmacao: true,
    propostaConfirmacao: proposta
  };
}

/**
 * 14. query_balance
 */
async function handleQueryBalance(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const client = getSupabaseClient();
  let saldoContas = 0;
  let saldoDisponivelLocal = 0;

  if (ctx.estadoLocal) {
    const totalDespesasPagas = ctx.estadoLocal.itens
      .filter(i => i.pago)
      .reduce((acc, cur) => acc + cur.valor, 0);
    saldoDisponivelLocal = ctx.estadoLocal.rendaFamiliar - totalDespesasPagas;
  }

  if (client) {
    const { data: contas } = await client.from('contas_financeiras').select('nome, tipo, saldo_atual');
    if (contas && contas.length > 0) {
      saldoContas = contas.reduce((acc, c) => acc + Number(c.saldo_atual), 0);
      const detalheContas = contas.map(c => `• ${c.nome} (${c.tipo}): R$ ${Number(c.saldo_atual).toFixed(2)}`).join('\n');
      return {
        sucesso: true,
        mensagem: `💳 **Saldos Reais em Contas:**\n${detalheContas}\n\n**Total em Contas:** R$ ${saldoContas.toFixed(2)}\n**Saldo Livre Orçado do Mês:** R$ ${saldoDisponivelLocal.toFixed(2)}`,
        interpretacao: data,
        requerConfirmacao: false,
        dadosConsulta: { saldoContas, saldoDisponivelLocal }
      };
    }
  }

  return {
    sucesso: true,
    mensagem: `💰 Seu saldo livre estimado no orçamento atual é de **R$ ${saldoDisponivelLocal.toFixed(2)}** (Renda R$ ${ctx.estadoLocal?.rendaFamiliar.toFixed(2)} menos despesas quitadas).`,
    interpretacao: data,
    requerConfirmacao: false,
    dadosConsulta: { saldoDisponivelLocal }
  };
}

/**
 * 15. query_income & 16. query_expenses
 */
async function handleQueryTransactions(
  tipo: 'income' | 'expense',
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  if (tipo === 'income') {
    const renda = ctx.estadoLocal?.rendaFamiliar || 0;
    return {
      sucesso: true,
      mensagem: `💵 Sua renda mensal familiar base configurada é de **R$ ${renda.toFixed(2)}**.`,
      interpretacao: data,
      requerConfirmacao: false,
      dadosConsulta: { renda }
    };
  }

  // Despesas
  const itens = ctx.estadoLocal?.itens || [];
  const fixas = itens.filter(i => i.categoria === 'fixas').reduce((a, b) => a + b.valor, 0);
  const superfluos = itens.filter(i => i.categoria === 'superfluos').reduce((a, b) => a + b.valor, 0);
  const invest = itens.filter(i => i.categoria === 'investimentos').reduce((a, b) => a + b.valor, 0);
  const total = fixas + superfluos + invest;

  return {
    sucesso: true,
    mensagem: `📊 **Gastos Reais Lançados:**\n• Contas Fixas: R$ ${fixas.toFixed(2)}\n• Supérfluos: R$ ${superfluos.toFixed(2)}\n• Aportes: R$ ${invest.toFixed(2)}\n\n**Total Geral:** R$ ${total.toFixed(2)}`,
    interpretacao: data,
    requerConfirmacao: false,
    dadosConsulta: { fixas, superfluos, invest, total }
  };
}

/**
 * 17. query_debts
 */
async function handleQueryDebts(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const client = getSupabaseClient();
  const userId = ctx.userId || FAMILY_ID;

  if (client) {
    const { data: dividas } = await client.from('dividas').select('*').eq('user_id', userId).eq('status', 'ativa');
    if (dividas && dividas.length > 0) {
      const totalPendente = dividas.reduce((acc, d) => acc + Number(d.saldo_pendente), 0);
      const linhas = dividas.map(d => `• ${d.credor_ou_devedor}: Saldo R$ ${Number(d.saldo_pendente).toFixed(2)} (Original: R$ ${Number(d.valor_original).toFixed(2)})`).join('\n');
      return {
        sucesso: true,
        mensagem: `📑 **Dívidas e Obrigações Pendentes:**\n${linhas}\n\n**Total Pendente:** R$ ${totalPendente.toFixed(2)}`,
        interpretacao: data,
        requerConfirmacao: false,
        dadosConsulta: { totalPendente, dividas }
      };
    }
  }

  return {
    sucesso: true,
    mensagem: '🎉 Nenhuma dívida ativa pendente encontrada no seu registro financeiro!',
    interpretacao: data,
    requerConfirmacao: false
  };
}

/**
 * 18. query_investments
 */
async function handleQueryInvestments(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const client = getSupabaseClient();
  const userId = ctx.userId || FAMILY_ID;

  if (client) {
    const { data: ativos } = await client.from('investimentos').select('*').eq('user_id', userId);
    if (ativos && ativos.length > 0) {
      const totalPatrimonio = ativos.reduce((acc, a) => acc + Number(a.saldo_estimado), 0);
      const linhas = ativos.map(a => `• ${a.nome_simbolo} (${a.tipo_ativo}): R$ ${Number(a.saldo_estimado).toFixed(2)}`).join('\n');
      return {
        sucesso: true,
        mensagem: `📈 **Carteira de Investimentos:**\n${linhas}\n\n**Patrimônio Estimado em Ativos:** R$ ${totalPatrimonio.toFixed(2)}\n*(Nota: A valorização de ativos não representa saldo de caixa imediato).*`,
        interpretacao: data,
        requerConfirmacao: false,
        dadosConsulta: { totalPatrimonio, ativos }
      };
    }
  }

  return {
    sucesso: true,
    mensagem: 'Não há ativos de investimento registrados no momento.',
    interpretacao: data,
    requerConfirmacao: false
  };
}

/**
 * 19. financial_summary
 */
async function handleFinancialSummary(
  data: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const itens = ctx.estadoLocal?.itens || [];
  const renda = ctx.estadoLocal?.rendaFamiliar || 0;
  const totalGastos = itens.reduce((a, b) => a + b.valor, 0);
  const totalPago = itens.filter(i => i.pago).reduce((a, b) => a + b.valor, 0);
  const aPagar = totalGastos - totalPago;
  const saldoLivre = renda - totalPago;
  const comprometimento = renda > 0 ? (totalGastos / renda) * 100 : 0;

  return {
    sucesso: true,
    mensagem: `📊 **Resumo Financeiro Consolidado:**\n\n• **Renda Familiar:** R$ ${renda.toFixed(2)}\n• **Total de Lançamentos:** R$ ${totalGastos.toFixed(2)} (${comprometimento.toFixed(1)}% da renda)\n• **Já Quitado:** R$ ${totalPago.toFixed(2)}\n• **Pendente de Pagamento:** R$ ${aPagar.toFixed(2)}\n• **Saldo Livre de Caixa:** R$ ${saldoLivre.toFixed(2)}\n\n💡 Dica: Mantenha as contas fixas dentro da meta para garantir sua reserva de emergência!`,
    interpretacao: data,
    requerConfirmacao: false,
    dadosConsulta: { renda, totalGastos, totalPago, aPagar, saldoLivre, comprometimento }
  };
}

// ========================================================
// DISPACHER PRINCIPAL DE DOMÍNIO
// ========================================================
export async function despacharComandoDominio(
  interpretacao: FinancialInterpretation,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const userId = ctx.userId || FAMILY_ID;

  // 1. Verificação de idempotência
  if (ctx.idempotencyKey) {
    const repetida = await verificarIdempotencia(ctx.idempotencyKey, userId);
    if (repetida) {
      return repetida;
    }
  }

  let resultado: AiFinancialProcessResult;

  switch (interpretacao.intent) {
    case 'create_income':
      resultado = await handleCreateIncome(interpretacao, ctx);
      break;
    case 'create_expense':
      resultado = await handleCreateExpense(interpretacao, ctx);
      break;
    case 'create_debt':
      resultado = await handleCreateDebt(interpretacao, ctx);
      break;
    case 'pay_debt':
      resultado = await handlePayDebt(interpretacao, ctx);
      break;
    case 'create_receivable':
    case 'register_lending':
      resultado = await handleRegisterLending(interpretacao, ctx);
      break;
    case 'register_borrowing':
      resultado = await handleRegisterBorrowing(interpretacao, ctx);
      break;
    case 'create_investment':
      resultado = await handleCreateInvestment(interpretacao, ctx);
      break;
    case 'register_investment_income':
      resultado = await handleInvestmentIncome(interpretacao, ctx);
      break;
    case 'register_investment_sale':
      resultado = await handleInvestmentSale(interpretacao, ctx);
      break;
    case 'transfer_money':
      resultado = await handleTransferMoney(interpretacao, ctx);
      break;
    case 'update_transaction':
      resultado = await handleUpdateTransaction(interpretacao, ctx);
      break;
    case 'delete_transaction':
      resultado = await handleDeleteTransaction(interpretacao, ctx);
      break;
    case 'query_balance':
      resultado = await handleQueryBalance(interpretacao, ctx);
      break;
    case 'query_income':
      resultado = await handleQueryTransactions('income', interpretacao, ctx);
      break;
    case 'query_expenses':
      resultado = await handleQueryTransactions('expense', interpretacao, ctx);
      break;
    case 'query_debts':
      resultado = await handleQueryDebts(interpretacao, ctx);
      break;
    case 'query_investments':
      resultado = await handleQueryInvestments(interpretacao, ctx);
      break;
    case 'financial_summary':
      resultado = await handleFinancialSummary(interpretacao, ctx);
      break;
    case 'unknown':
    default:
      resultado = {
        sucesso: false,
        mensagem: interpretacao.clarification_prompt || 
          'Não consegui identificar a operação financeira com clareza. Você pode tentar algo como: "Gastei 50 no almoço", "Paguei 300 de dívida com banco", ou "Qual meu saldo?".',
        interpretacao,
        requerConfirmacao: false
      };
      break;
  }

  // Registra no log idempotente
  if (ctx.idempotencyKey) {
    await registrarLogIdempotente(
      ctx.idempotencyKey,
      interpretacao.intent,
      interpretacao.description || 'comando',
      interpretacao,
      resultado,
      userId
    );
  }

  return resultado;
}

/**
 * 13. EXECUÇÃO DE CONFIRMAÇÃO APROVADA PELO USUÁRIO
 * Valida token, expiração e status antes de executar
 */
export async function executarConfirmacaoAprovada(
  token: string,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const client = getSupabaseClient();
  const userId = ctx.userId || FAMILY_ID;

  if (!client) {
    return {
      sucesso: false,
      mensagem: 'Não foi possível conectar ao banco para validar a confirmação.',
      interpretacao: { intent: 'unknown', amount: null, currency: 'BRL', description: null, category: null, subcategory: null, transaction_date: null, due_date: null, status: null, account_reference: null, destination_account_reference: null, counterparty: null, payment_method: null, installments: null, installment_number: null, interest_rate: null, asset_type: null, asset_symbol: null, asset_quantity: null, unit_price: null, query_period: null, query_start_date: null, query_end_date: null, confidence: 0, missing_fields: [], requires_clarification: false, clarification_prompt: null },
      requerConfirmacao: false
    };
  }

  // 1. Busca proposta pelo token único
  const { data: proposta, error } = await client
    .from('ai_confirmacoes_pendentes')
    .select('*')
    .eq('token', token)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !proposta) {
    return {
      sucesso: false,
      mensagem: '❌ Proposta de confirmação não encontrada ou inválida.',
      interpretacao: { intent: 'unknown', amount: null, currency: 'BRL', description: null, category: null, subcategory: null, transaction_date: null, due_date: null, status: null, account_reference: null, destination_account_reference: null, counterparty: null, payment_method: null, installments: null, installment_number: null, interest_rate: null, asset_type: null, asset_symbol: null, asset_quantity: null, unit_price: null, query_period: null, query_start_date: null, query_end_date: null, confidence: 0, missing_fields: [], requires_clarification: false, clarification_prompt: null },
      requerConfirmacao: false
    };
  }

  // 2. Valida status
  if (proposta.status !== 'pendente') {
    return {
      sucesso: false,
      mensagem: `Esta proposta já foi ${proposta.status}. Não é possível executá-la novamente.`,
      interpretacao: proposta.proposta_payload,
      requerConfirmacao: false
    };
  }

  // 3. Valida expiração
  if (new Date(proposta.expires_at).getTime() < Date.now()) {
    await client.from('ai_confirmacoes_pendentes').update({ status: 'expirado' }).eq('id', proposta.id);
    return {
      sucesso: false,
      mensagem: '⏱️ O tempo limite de 10 minutos para esta confirmação expirou. Por favor repita a solicitação.',
      interpretacao: proposta.proposta_payload,
      requerConfirmacao: false
    };
  }

  // 4. Marca como confirmada
  await client.from('ai_confirmacoes_pendentes').update({ status: 'confirmado' }).eq('id', proposta.id);

  // 5. Executa a ação aprovada
  const payload: FinancialInterpretation = proposta.proposta_payload;

  if (proposta.intent === 'delete_transaction') {
    const termo = payload.description || '';
    if (ctx.onRemoverItem && ctx.estadoLocal) {
      const item = ctx.estadoLocal.itens.find(i => i.titulo.toLowerCase().includes(termo.toLowerCase()));
      if (item) {
        ctx.onRemoverItem(item.id);
      }
    }
    await client.from('itens_lancamento').delete().ilike('titulo', `%${termo}%`);
    return {
      sucesso: true,
      mensagem: `🗑️ Operação confirmada: Transação "${termo}" excluída com sucesso!`,
      interpretacao: payload,
      requerConfirmacao: false,
      acaoExecutada: 'delete_transaction',
      registrosAfetados: 1
    };
  }

  if (proposta.intent === 'transfer_money') {
    const valor = Number(payload.amount);
    return {
      sucesso: true,
      mensagem: `✅ Transferência de R$ ${valor.toFixed(2)} entre contas confirmada e registrada com sucesso!`,
      interpretacao: payload,
      requerConfirmacao: false,
      acaoExecutada: 'transfer_money',
      registrosAfetados: 2
    };
  }

  // Demais intenções
  return await despacharComandoDominio(payload, { ...ctx, idempotencyKey: `cnf_exec_${token}` });
}
