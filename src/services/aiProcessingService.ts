import { getSupabaseConfig } from '../lib/supabase';
import { 
  FinancialInterpretationSchema, 
  type FinancialInterpretation, 
  type AiFinancialProcessResult 
} from '../types/aiSchema';
import { despacharComandoDominio, type DomainHandlerContext } from './aiDomainHandlers';
import { 
  processarComandoAssistente, 
  normalizarValorMonetario, 
  identificarCategoriaESubcategoria, 
  extrairTituloLimpo 
} from '../utils/aiAssistantParser';

/**
 * 6. DETECÇÃO DE FORMATOS SUPORTADOS PELO NAVEGADOR (MediaRecorder.isTypeSupported)
 * Não presume que todos os navegadores utilizam o mesmo formato (ex: Safari usa audio/mp4, Chrome usa audio/webm).
 */
export function obterMimeTypeSuportado(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'audio/webm';
  }

  const candidatos = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ];

  for (const mime of candidatos) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return '';
}

/**
 * Limites operacionais de áudio
 */
export const AUDIO_LIMITS = {
  MIN_DURATION_SECONDS: 0.5,
  MAX_DURATION_SECONDS: 60,
  MAX_SIZE_BYTES: 10 * 1024 * 1024 // 10MB
};

/**
 * Gerador de chave de idempotência criptográfica
 */
export function gerarChaveIdempotente(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `idem_${crypto.randomUUID()}`;
  }
  return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normaliza e sanitiza texto transcrito sem alterar significado
 */
export function normalizarTranscricao(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(por favor|ei assistente|gestorlar|olá|ola|ei)\s*[,:]?\s*/i, '');
}

/**
 * Converte o resultado do parser NLP local em um objeto validado pelo schema estrito Zod
 */
function converterParserParaSchemaZod(
  resultadoParser: ReturnType<typeof processarComandoAssistente>,
  promptOriginal: string
): FinancialInterpretation {
  const agora = new Date().toISOString().split('T')[0];
  let intent: FinancialInterpretation['intent'] = 'unknown';

  if (resultadoParser.acaoExecutada) {
    switch (resultadoParser.acaoExecutada) {
      case 'adicionar_despesa':
      case 'lote_despesas':
        intent = 'create_expense';
        break;
      case 'atualizar_renda':
        intent = 'create_income';
        break;
      case 'marcar_pago':
      case 'marcar_todos_pagos':
        intent = 'update_transaction';
        break;
      case 'consultar_saldo':
        intent = 'query_balance';
        break;
      case 'consultar_gastos':
      case 'maior_gasto':
        intent = 'query_expenses';
        break;
      case 'consultar_contas_pendentes':
        intent = 'financial_summary';
        break;
    }
  }

  // Identificação adicional para intenções contábeis
  const promptLower = promptOriginal.toLowerCase();
  if (promptLower.includes('transferir') || promptLower.includes('transferência') || promptLower.includes('transferencia')) {
    intent = 'transfer_money';
  } else if (promptLower.includes('emprestei') || promptLower.includes('emprestar para') || promptLower.includes('me deve')) {
    intent = 'register_lending';
  } else if (promptLower.includes('peguei emprestado') || promptLower.includes('financiei')) {
    intent = 'register_borrowing';
  } else if (promptLower.includes('paguei divida') || promptLower.includes('quitar divida')) {
    intent = 'pay_debt';
  } else if (promptLower.includes('investi') || promptLower.includes('aporte') || promptLower.includes('cdb') || promptLower.includes('tesouro')) {
    intent = 'create_investment';
  } else if (promptLower.includes('rendeu') || promptLower.includes('dividendo') || promptLower.includes('rendimento')) {
    intent = 'register_investment_income';
  } else if (promptLower.includes('resgatei') || promptLower.includes('vendi acao') || promptLower.includes('vender investimento')) {
    intent = 'register_investment_sale';
  } else if (promptLower.includes('excluir') || promptLower.includes('apagar') || promptLower.includes('deletar')) {
    intent = 'delete_transaction';
  }

  const valorExtraido = normalizarValorMonetario(promptOriginal);
  const catDetectada = identificarCategoriaESubcategoria(promptOriginal);
  const tituloExtraido = extrairTituloLimpo(promptOriginal, catDetectada.subcategoria);

  const rawObj = {
    intent,
    amount: valorExtraido !== null && valorExtraido > 0 ? valorExtraido.toFixed(2) : null,
    currency: 'BRL' as const,
    description: tituloExtraido || promptOriginal.slice(0, 160),
    category: catDetectada.categoria,
    subcategory: catDetectada.subcategoria,
    transaction_date: agora,
    due_date: null,
    status: promptLower.includes('paguei') || promptLower.includes('quitei') ? 'paid' as const : 'pending' as const,
    account_reference: null,
    destination_account_reference: null,
    counterparty: null,
    payment_method: null,
    installments: null,
    installment_number: null,
    interest_rate: null,
    asset_type: null,
    asset_symbol: null,
    asset_quantity: null,
    unit_price: null,
    query_period: null,
    query_start_date: null,
    query_end_date: null,
    confidence: resultadoParser.sucesso ? 0.95 : 0.4,
    missing_fields: [],
    requires_clarification: !resultadoParser.sucesso,
    clarification_prompt: resultadoParser.sucesso ? null : resultadoParser.mensagemResposta
  };

  const parsed = FinancialInterpretationSchema.safeParse(rawObj);
  if (parsed.success) {
    return parsed.data;
  }
  
  // Objeto de fallback seguro rigorosamente válido
  return {
    intent: 'unknown',
    amount: null,
    currency: 'BRL',
    description: promptOriginal.slice(0, 160),
    category: null,
    subcategory: null,
    transaction_date: agora,
    due_date: null,
    status: null,
    account_reference: null,
    destination_account_reference: null,
    counterparty: null,
    payment_method: null,
    installments: null,
    installment_number: null,
    interest_rate: null,
    asset_type: null,
    asset_symbol: null,
    asset_quantity: null,
    unit_price: null,
    query_period: null,
    query_start_date: null,
    query_end_date: null,
    confidence: 0,
    missing_fields: [],
    requires_clarification: true,
    clarification_prompt: resultadoParser.mensagemResposta
  };
}

/**
 * 6. FLUXO COMPLETO DO ÁUDIO (ENVIO HTTPS PARA EDGE FUNCTION OU MOTOR LOCAL RIGOROSO)
 */
export async function processarAudioComando(
  audioBlob: Blob,
  duracaoSegundos: number,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  // 1. Verificações pré-envio no cliente
  if (duracaoSegundos < AUDIO_LIMITS.MIN_DURATION_SECONDS) {
    return {
      sucesso: false,
      mensagem: 'Gravação muito curta para identificar a fala. Por favor fale mais pausadamente.',
      interpretacao: converterParserParaSchemaZod({ sucesso: false, mensagemResposta: 'Gravação muito curta', acaoExecutada: '' }, ''),
      requerConfirmacao: false,
      erro: { codigo: 'AUDIO_TOO_SHORT', detalhe: 'Duração inferior a 0.5s', permiteRepetir: true }
    };
  }

  if (duracaoSegundos > AUDIO_LIMITS.MAX_DURATION_SECONDS) {
    return {
      sucesso: false,
      mensagem: `A gravação excedeu o limite máximo de ${AUDIO_LIMITS.MAX_DURATION_SECONDS} segundos. Resuma seu comando.`,
      interpretacao: converterParserParaSchemaZod({ sucesso: false, mensagemResposta: 'Áudio excedeu limite', acaoExecutada: '' }, ''),
      requerConfirmacao: false,
      erro: { codigo: 'AUDIO_TOO_LONG', detalhe: 'Duração excede 60s', permiteRepetir: true }
    };
  }

  if (audioBlob.size > AUDIO_LIMITS.MAX_SIZE_BYTES) {
    return {
      sucesso: false,
      mensagem: 'O arquivo de áudio excede o limite de tamanho (10MB). Rejeitado antes do envio.',
      interpretacao: converterParserParaSchemaZod({ sucesso: false, mensagemResposta: 'Arquivo muito grande', acaoExecutada: '' }, ''),
      requerConfirmacao: false,
      erro: { codigo: 'FILE_TOO_LARGE', detalhe: 'Tamanho excede 10MB', permiteRepetir: false }
    };
  }

  const config = getSupabaseConfig();
  const idempotencyKey = ctx.idempotencyKey || gerarChaveIdempotente();

  // 2. Tenta envio HTTPS para a Edge Function Autenticada
  if (config.url && config.anonKey) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'comando.webm');

      const urlFunction = `${config.url}/functions/v1/process-financial-command`;
      const response = await fetch(urlFunction, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.anonKey}`,
          'apikey': config.anonKey,
          'x-idempotency-key': idempotencyKey,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sucesso && data.interpretacao) {
          // Despacha para regras contábeis do domínio
          return await despacharComandoDominio(data.interpretacao, {
            ...ctx,
            userId: data.userId,
            idempotencyKey
          });
        }
      } else {
        const errorJson = await response.json().catch(() => null);
        if (errorJson && errorJson.erro) {
          // Se o serviço atingir seu limite ou estiver indisponível:
          // NÃO SIMULA TRANSCRIÇÃO. INFORMA O USUÁRIO DE FORMA CLARA.
          return {
            sucesso: false,
            mensagem: `⚠️ ${errorJson.erro.detalhe}`,
            interpretacao: converterParserParaSchemaZod({ sucesso: false, mensagemResposta: errorJson.erro.detalhe, acaoExecutada: '' }, ''),
            requerConfirmacao: false,
            erro: errorJson.erro
          };
        }
      }
    } catch (e: any) {
      console.warn('Edge Function remota não acessível no momento, avaliando processamento local...', e);
    }
  }

  // Se o servidor de áudio estiver offline ou inacessível, avisa o usuário com clareza
  return {
    sucesso: false,
    mensagem: '⚠️ O serviço de transcrição em nuvem não pôde ser contatado. Para sua segurança, nenhuma movimentação foi gravada a partir de dados incompletos. Você pode tentar novamente ou digitar o comando diretamente no chat.',
    interpretacao: converterParserParaSchemaZod({ sucesso: false, mensagemResposta: 'Serviço de transcrição indisponível', acaoExecutada: '' }, ''),
    requerConfirmacao: false,
    erro: {
      codigo: 'TRANSCRIPTION_SERVICE_UNAVAILABLE',
      detalhe: 'Serviço de áudio remoto indisponível.',
      permiteRepetir: true
    }
  };
}

/**
 * 7. FLUXO DE TEXTO (MESMO MECANISMO DE INTERPRETAÇÃO E EXECUÇÃO FINANCEIRA)
 */
export async function processarTextoComando(
  texto: string,
  ctx: DomainHandlerContext
): Promise<AiFinancialProcessResult> {
  const textoSanitizado = normalizarTranscricao(texto);
  if (!textoSanitizado) {
    return {
      sucesso: false,
      mensagem: 'Por favor, digite uma mensagem financeira válida.',
      interpretacao: converterParserParaSchemaZod({ sucesso: false, mensagemResposta: 'Texto vazio', acaoExecutada: '' }, ''),
      requerConfirmacao: false,
      erro: { codigo: 'EMPTY_TEXT', detalhe: 'Texto em branco', permiteRepetir: true }
    };
  }

  const config = getSupabaseConfig();
  const idempotencyKey = ctx.idempotencyKey || gerarChaveIdempotente();

  // 1. Tenta Edge Function de IA se disponível
  if (config.url && config.anonKey) {
    try {
      const urlFunction = `${config.url}/functions/v1/process-financial-command`;
      const response = await fetch(urlFunction, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.anonKey}`,
          'apikey': config.anonKey,
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({ texto: textoSanitizado }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sucesso && data.interpretacao) {
          // Despacha com validação no backend
          return await despacharComandoDominio(data.interpretacao, {
            ...ctx,
            userId: data.userId,
            idempotencyKey
          });
        }
      }
    } catch (e) {
      console.warn('Edge Function remota não acessível para texto, utilizando motor de regras local...', e);
    }
  }

  // 2. Motor de Domínio com Parser NLP e Schema Zod Rigoroso
  if (ctx.estadoLocal) {
    const resParser = processarComandoAssistente(textoSanitizado, ctx.estadoLocal, {
      adicionarItem: ctx.onAdicionarItem ? (item) => ctx.onAdicionarItem!(item) : () => {},
      atualizarItem: ctx.onAtualizarItem ? (id, updates) => ctx.onAtualizarItem!(id, updates) : () => {},
      removerItem: ctx.onRemoverItem ? (id) => ctx.onRemoverItem!(id) : () => {},
      alternarPago: ctx.onAlternarPago ? (id) => ctx.onAlternarPago!(id) : () => {},
      atualizarRenda: ctx.onAtualizarRenda ? (renda) => ctx.onAtualizarRenda!(renda) : () => {},
      atualizarMetas: ctx.onAtualizarMetas ? (metas) => ctx.onAtualizarMetas!(metas) : () => {},
    });

    const interpretacaoZod = converterParserParaSchemaZod(resParser, textoSanitizado);

    // Se a intenção for transferência, exclusão ou requer confirmação especial:
    if (interpretacaoZod.intent === 'transfer_money' || interpretacaoZod.intent === 'delete_transaction') {
      return await despacharComandoDominio(interpretacaoZod, { ...ctx, idempotencyKey });
    }

    return {
      sucesso: resParser.sucesso,
      mensagem: resParser.mensagemResposta,
      interpretacao: interpretacaoZod,
      requerConfirmacao: false,
      acaoExecutada: resParser.acaoExecutada
    };
  }

  return {
    sucesso: false,
    mensagem: 'Não foi possível processar o comando no momento.',
    interpretacao: converterParserParaSchemaZod({ sucesso: false, mensagemResposta: 'Estado indisponível', acaoExecutada: '' }, textoSanitizado),
    requerConfirmacao: false
  };
}
