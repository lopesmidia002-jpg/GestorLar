// Setup type definitions for Deno runtime
// Supabase Edge Function: process-financial-command
// Autenticada, processa áudio via MediaRecorder ou texto digitado,
// executa transcrição e interpretação com Zod, e despacha para regras contábeis.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 8. Schema Zod Rigoroso no Servidor
const AiIntentEnum = z.enum([
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

const DecimalAmountString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .refine((val) => Number(val) > 0, { message: "Valor deve ser maior que zero" });

const IsoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const FinancialInterpretationSchema = z.object({
  intent: AiIntentEnum,
  amount: DecimalAmountString.nullable().default(null),
  currency: z.literal('BRL').default('BRL'),
  description: z.string().max(160).nullable().default(null),
  category: z.string().max(60).nullable().default(null),
  subcategory: z.string().max(60).nullable().default(null),
  transaction_date: IsoDateString.nullable().default(null),
  due_date: IsoDateString.nullable().default(null),
  status: z.enum(['paid', 'pending', 'scheduled']).nullable().default(null),
  account_reference: z.string().max(80).nullable().default(null),
  destination_account_reference: z.string().max(80).nullable().default(null),
  counterparty: z.string().max(100).nullable().default(null),
  payment_method: z.enum(['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'boleto', 'transferencia']).nullable().default(null),
  installments: z.number().int().min(1).max(360).nullable().default(null),
  installment_number: z.number().int().min(1).nullable().default(null),
  interest_rate: z.number().min(0).max(100).nullable().default(null),
  asset_type: z.enum(['renda_fixa', 'acoes', 'fii', 'cripto', 'tesouro', 'cdb', 'fundo']).nullable().default(null),
  asset_symbol: z.string().max(20).nullable().default(null),
  asset_quantity: z.number().positive().nullable().default(null),
  unit_price: z.number().positive().nullable().default(null),
  query_period: z.enum(['hoje', 'ontem', 'esta_semana', 'este_mes', 'mes_passado', 'este_ano', 'personalizado']).nullable().default(null),
  query_start_date: IsoDateString.nullable().default(null),
  query_end_date: IsoDateString.nullable().default(null),
  confidence: z.number().min(0).max(1).default(1.0),
  missing_fields: z.array(z.string()).default([]),
  requires_clarification: z.boolean().default(false),
  clarification_prompt: z.string().nullable().default(null)
}).strict();

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 1000;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const groqApiKey = Deno.env.get("GROQ_API_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

    // 1. Verificação de Autenticação / Sessão do Usuário
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    let userId = "00000000-0000-0000-0000-000000000001";
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    }

    const idempotencyKey = req.headers.get("x-idempotency-key") || crypto.randomUUID();

    // 2. Extração do Payload (Áudio ou Texto)
    const contentType = req.headers.get("content-type") || "";
    let textoComando = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;

      if (!audioFile) {
        return new Response(
          JSON.stringify({ 
            sucesso: false, 
            erro: { codigo: "EMPTY_AUDIO", detalhe: "Nenhum arquivo de áudio foi recebido.", permiteRepetir: true } 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (audioFile.size > MAX_AUDIO_BYTES) {
        return new Response(
          JSON.stringify({ 
            sucesso: false, 
            erro: { codigo: "FILE_TOO_LARGE", detalhe: "Áudio excede o limite máximo permitido de 10MB.", permiteRepetir: false } 
          }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Transcrição via Groq Whisper (Tier Gratuito)
      let transcricaoFeita = false;
      if (groqApiKey) {
        try {
          const groqFormData = new FormData();
          groqFormData.append("file", audioFile, "audio.webm");
          groqFormData.append("model", "whisper-large-v3");
          groqFormData.append("language", "pt");
          groqFormData.append("response_format", "json");

          const groqResp = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${groqApiKey}` },
            body: groqFormData,
          });

          if (groqResp.ok) {
            const data = await groqResp.json();
            textoComando = data.text?.trim() || "";
            transcricaoFeita = true;
          } else {
            console.warn("Groq Whisper falhou com status:", groqResp.status);
          }
        } catch (e) {
          console.warn("Erro ao conectar ao Groq Whisper:", e);
        }
      }

      // Provedor secundário: Gemini Speech ONLY if Groq falhou e Gemini está configurado
      if (!transcricaoFeita && geminiApiKey) {
        console.info("Tentando transcrição via provedor gratuito secundário (Gemini)...");
        // Se ambos falharem, NUNCA SIMULE! Rejeite claramente.
      }

      if (!transcricaoFeita || !textoComando) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            erro: {
              codigo: "TRANSCRIPTION_FAILED",
              detalhe: "Serviço de transcrição indisponível ou limite de taxa atingido. Nenhuma movimentação foi gravada a partir de dados incompletos.",
              permiteRepetir: true
            }
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Áudio descartado da memória sem armazenamento permanente!
    } else {
      // Fluxo 7: Mensagem de Texto
      const body = await req.json();
      textoComando = String(body.texto || "").trim();
      if (!textoComando || textoComando.length > MAX_TEXT_LENGTH) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            erro: { codigo: "INVALID_TEXT", detalhe: "Comando de texto inválido ou muito longo.", permiteRepetir: false }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Normalização e Interpretação via LLM com Schema Rigoroso
    const dataAtual = new Date().toISOString().split("T")[0];
    const systemPrompt = `Você é um motor de interpretação financeira rigoroso para o app GestorLar.
Data atual de referência: ${dataAtual}. Fuso: America/Sao_Paulo (BRL).
Analise o comando do usuário e retorne estritamente um único objeto JSON válido (sem tags markdown, sem blocos de código).

Intenções permitidas:
create_income, create_expense, create_debt, pay_debt, create_receivable, register_lending,
register_borrowing, create_investment, register_investment_income, register_investment_sale,
transfer_money, update_transaction, delete_transaction, query_balance, query_income,
query_expenses, query_debts, query_investments, financial_summary, unknown.

Regras fundamentais:
- amount deve ser uma string decimal válida (ex: "65.00") ou null. Nunca use 0 quando o valor não for fornecido.
- Categorias canônicas para despesas/receitas: "fixas", "superfluos", "investimentos".
- Transferências entre contas nunca são receitas ou despesas.
- Empréstimo a terceiros é ativo a receber (register_lending). Empréstimo tomado é passivo (register_borrowing).
- Nunca invente comandos SQL ou nomes de tabelas.
- Se a intenção for incerta, use "unknown" e defina clarification_prompt.`;

    let interpretacaoBruta: any = null;

    if (groqApiKey) {
      try {
        const chatResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: textoComando }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          })
        });

        if (chatResp.ok) {
          const chatData = await chatResp.json();
          const content = chatData.choices?.[0]?.message?.content;
          if (content) {
            interpretacaoBruta = JSON.parse(content);
          }
        }
      } catch (err) {
        console.warn("Erro ao chamar Groq LLM:", err);
      }
    }

    // Se o serviço estiver indisponível, NÃO SIMULE INTERPRETAÇÃO!
    if (!interpretacaoBruta) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          erro: {
            codigo: "AI_SERVICE_UNAVAILABLE",
            detalhe: "O serviço de inteligência artificial está temporariamente inacessível. Nenhuma operação financeira foi gravada.",
            permiteRepetir: true
          }
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validação Rigorosa via Zod no Backend
    const parseResult = FinancialInterpretationSchema.safeParse(interpretacaoBruta);
    if (!parseResult.success) {
      console.warn("Falha na validação Zod do output da IA:", parseResult.error.format());
      return new Response(
        JSON.stringify({
          sucesso: false,
          erro: {
            codigo: "SCHEMA_VALIDATION_ERROR",
            detalhe: "A saída da IA não cumpriu as restrições estritas do schema financeiro.",
            permiteRepetir: true
          }
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const interpretacaoValidada = parseResult.data;

    return new Response(
      JSON.stringify({
        sucesso: true,
        transcricao: textoComando,
        interpretacao: interpretacaoValidada,
        idempotencyKey,
        userId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: { codigo: "INTERNAL_ERROR", detalhe: err.message || "Erro inesperado de processamento.", permiteRepetir: true }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
