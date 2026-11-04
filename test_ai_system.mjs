import { z } from 'zod';
import { 
  FinancialInterpretationSchema, 
  AiIntentEnum, 
  PendingConfirmationProposalSchema,
  RequestIdempotencySchema
} from './src/types/aiSchema.ts';

console.log('🧪 Iniciando Testes Unitários do Motor Financeiro IA e Schemas...');

let testesPassados = 0;
let totalTestes = 0;

function assert(condicao, mensagem) {
  totalTestes++;
  if (condicao) {
    testesPassados++;
    console.log(`  ✅ [PASS] ${mensagem}`);
  } else {
    console.error(`  ❌ [FAIL] ${mensagem}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// TESTE 1: Schema Zod de Interpretação - 19 Intenções
// ----------------------------------------------------
console.log('\n1. Testando Enum de Intenções Obrigatórias:');
const todasIntencoes = [
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
];

assert(AiIntentEnum.options.length === 20, `Possui exatamente 20 opções (19 de domínio + unknown) - Encontrado: ${AiIntentEnum.options.length}`);
todasIntencoes.forEach(intent => {
  assert(AiIntentEnum.safeParse(intent).success, `Intenção válida suportada: ${intent}`);
});

// ----------------------------------------------------
// TESTE 2: Precisão Decimal e Rejeição de Inválidos
// ----------------------------------------------------
console.log('\n2. Testando Validação de Precisão Decimal e Campos:');

const objetoValido = {
  intent: 'create_expense',
  amount: '65.00',
  currency: 'BRL',
  description: 'Almoço no restaurante',
  category: 'Alimentação',
  subcategory: 'Restaurantes',
  transaction_date: '2026-10-22',
  due_date: null,
  status: 'paid',
  account_reference: null,
  destination_account_reference: null,
  counterparty: null,
  payment_method: 'pix',
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
  confidence: 0.98,
  missing_fields: [],
  requires_clarification: false,
  clarification_prompt: null
};

const parseValido = FinancialInterpretationSchema.safeParse(objetoValido);
assert(parseValido.success, 'Objeto de despesa válido passa no schema Zod rigoroso');

// Rejeição de campos extras desconhecidos (strict)
const objetoComInjecao = {
  ...objetoValido,
  comando_sql_malicioso: "DROP TABLE contas;",
  user_id_falso: "hack_user"
};
const parseInjecao = FinancialInterpretationSchema.safeParse(objetoComInjecao);
assert(!parseInjecao.success, 'Rejeita estritamente (.strict) campos inesperados e injeções');

// Rejeição de valor zero ou negativo
const objetoValorZero = { ...objetoValido, amount: '0.00' };
const parseZero = FinancialInterpretationSchema.safeParse(objetoValorZero);
assert(!parseZero.success, 'Rejeita valor monetário zero (deve ser estritamente > 0)');

const objetoValorNegativo = { ...objetoValido, amount: '-50.00' };
const parseNegativo = FinancialInterpretationSchema.safeParse(objetoValorNegativo);
assert(!parseNegativo.success, 'Rejeita valor monetário negativo');

// ----------------------------------------------------
// TESTE 3: Proposta de Confirmação com Token Criptográfico
// ----------------------------------------------------
console.log('\n3. Testando Proposta de Confirmação e Idempotência:');

const propostaExemplo = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  token: 'cnf_98f7e6d5c4b3a210',
  intent: 'transfer_money',
  titulo_resumo: 'Transferir R$ 500,00',
  descricao_detalhada: 'Transferência de Conta Corrente para Poupança',
  impacto_financeiro: 'medio',
  payload_execucao: {
    ...objetoValido,
    intent: 'transfer_money',
    amount: '500.00',
    account_reference: 'Corrente',
    destination_account_reference: 'Poupanca'
  },
  expira_em: new Date(Date.now() + 600000).toISOString(),
  criado_em: new Date().toISOString(),
  status: 'pendente'
};

const parseProposta = PendingConfirmationProposalSchema.safeParse(propostaExemplo);
assert(parseProposta.success, 'Proposta de confirmação atende aos requisitos de integridade');

const idempotenciaExemplo = {
  idempotency_key: 'idem_a1b2c3d4e5f6',
  origin: 'voice_audio',
  client_timestamp: new Date().toISOString()
};
const parseIdem = RequestIdempotencySchema.safeParse(idempotenciaExemplo);
assert(parseIdem.success, 'Chave de idempotência validada com sucesso');

// ----------------------------------------------------
// RESUMO DOS TESTES
// ----------------------------------------------------
console.log(`\n========================================`);
console.log(`🎯 Testes Concluídos: ${testesPassados}/${totalTestes} passaram com sucesso!`);
console.log(`========================================\n`);
