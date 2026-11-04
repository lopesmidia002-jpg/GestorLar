import { z } from 'zod';

/**
 * 9. INTENÇÕES OBRIGATÓRIAS DO SISTEMA
 * Cada intenção possui um manipulador de domínio explícito e campos permitidos específicos.
 */
export const AiIntentEnum = z.enum([
  'create_income',
  'create_expense',
  'create_debt',
  'pay_debt',
  'create_receivable',
  'register_lending',
  'register_borrowing',
  'create_investment',
  'register_investment_income',
  'register_investment_sale',
  'transfer_money',
  'update_transaction',
  'delete_transaction',
  'query_balance',
  'query_income',
  'query_expenses',
  'query_debts',
  'query_investments',
  'financial_summary',
  'unknown'
]);

export type AiIntent = z.infer<typeof AiIntentEnum>;

/**
 * Validação rigorosa de valor monetário com precisão decimal:
 * Ex: "65.00", "1250.50", "10.00" (rejeita valores negativos, vazios ou sem formato numérico válido).
 */
export const DecimalAmountString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, {
    message: 'O valor deve ser uma string decimal válida com até 2 casas (ex: "65.00")'
  })
  .refine((val) => Number(val) > 0, {
    message: 'O valor monetário deve ser estritamente maior que zero'
  });

/**
 * Validação de data ISO (YYYY-MM-DD)
 */
export const IsoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data deve estar no formato ISO YYYY-MM-DD'
  });

/**
 * 8. SCHEMA DE INTERPRETAÇÃO ESTRUTURADO DA IA
 * Schema estrito validado no servidor e cliente.
 * Campos desconhecidos são rejeitados via .strict() para impedir injeções ou comandos anômalos.
 */
export const FinancialInterpretationSchema = z.object({
  intent: AiIntentEnum,
  amount: DecimalAmountString.nullable().default(null),
  currency: z.literal('BRL').default('BRL'),
  description: z.string().max(160, 'Descrição não pode exceder 160 caracteres').nullable().default(null),
  category: z.string().max(60, 'Categoria não pode exceder 60 caracteres').nullable().default(null),
  subcategory: z.string().max(60).nullable().default(null),
  transaction_date: IsoDateString.nullable().default(null),
  due_date: IsoDateString.nullable().default(null),
  status: z.enum(['paid', 'pending', 'scheduled']).nullable().default(null),
  
  // Referências a contas e partes (pessoas / credores)
  account_reference: z.string().max(80).nullable().default(null),
  destination_account_reference: z.string().max(80).nullable().default(null),
  counterparty: z.string().max(100).nullable().default(null), // credor, devedor ou terceiro
  payment_method: z.enum(['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'boleto', 'transferencia']).nullable().default(null),
  
  // Dados de parcelamento e dívidas
  installments: z.number().int().min(1).max(360).nullable().default(null),
  installment_number: z.number().int().min(1).nullable().default(null),
  interest_rate: z.number().min(0).max(100).nullable().default(null),
  
  // Dados de investimentos
  asset_type: z.enum(['renda_fixa', 'acoes', 'fii', 'cripto', 'tesouro', 'cdb', 'fundo']).nullable().default(null),
  asset_symbol: z.string().max(20).nullable().default(null),
  asset_quantity: z.number().positive().nullable().default(null),
  unit_price: z.number().positive().nullable().default(null),
  
  // Parâmetros de consulta
  query_period: z.enum(['hoje', 'ontem', 'esta_semana', 'este_mes', 'mes_passado', 'este_ano', 'personalizado']).nullable().default(null),
  query_start_date: IsoDateString.nullable().default(null),
  query_end_date: IsoDateString.nullable().default(null),
  
  // Campos de controle de incerteza da IA (nunca usados como autorização direta de execução)
  confidence: z.number().min(0).max(1).default(1.0),
  missing_fields: z.array(z.string()).default([]),
  requires_clarification: z.boolean().default(false),
  clarification_prompt: z.string().nullable().default(null)
}).strict();

export type FinancialInterpretation = z.infer<typeof FinancialInterpretationSchema>;

/**
 * 13. PROPOSTA DE CONFIRMAÇÃO DE OPERAÇÃO
 * Imutável, com token criptográfico de uso único e tempo de expiração.
 */
export const PendingConfirmationProposalSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(16),
  intent: AiIntentEnum,
  titulo_resumo: z.string().max(120),
  descricao_detalhada: z.string(),
  impacto_financeiro: z.enum(['baixo', 'medio', 'alto', 'irreversivel']),
  payload_execucao: FinancialInterpretationSchema,
  expira_em: z.string(), // ISO string
  criado_em: z.string(), // ISO string
  status: z.enum(['pendente', 'confirmado', 'cancelado', 'expirado']).default('pendente')
});

export type PendingConfirmationProposal = z.infer<typeof PendingConfirmationProposalSchema>;

/**
 * 14. SCHEMA DE IDEMPOTÊNCIA E AUDITORIA
 */
export const RequestIdempotencySchema = z.object({
  idempotency_key: z.string().min(8).max(128),
  origin: z.enum(['voice_audio', 'text_input', 'quick_chip', 'api']),
  client_timestamp: z.string()
});

export type RequestIdempotency = z.infer<typeof RequestIdempotencySchema>;

/**
 * RESPOSTA OFICIAL DO PROCESSAMENTO FINANCEIRO
 */
export interface AiFinancialProcessResult {
  sucesso: boolean;
  mensagem: string;
  interpretacao: FinancialInterpretation;
  requerConfirmacao: boolean;
  propostaConfirmacao?: PendingConfirmationProposal;
  acaoExecutada?: string;
  registrosAfetados?: number;
  dadosConsulta?: any;
  erro?: {
    codigo: string;
    detalhe: string;
    permiteRepetir: boolean;
  };
}
