import type { ItemLancamento } from '../types/finance';
import { formatarBRL, CATEGORIAS_CONFIG } from '../utils/calculations';

export interface DestinatarioWhatsApp {
  id: string;
  nome: string;                 // Ex: "Titular", "Cônjuge", "Familiar"
  numero: string;               // Ex: "11987654321" ou "5511987654321"
  ativo: boolean;               // Se está habilitado para receber os alertas automáticos
  tipo?: 'titular' | 'conjuge' | 'familiar' | 'outro';
}

export interface HistoricoDisparoWhatsApp {
  id: string;
  dataHora: string;
  contasNotificadas: number;
  totalValor: number;
  destinatarios: string[];       // Nomes ou números que receberam
  modo: 'automatico' | 'manual';
  status: 'sucesso' | 'erro' | 'parcial';
  detalhes?: string;
}

export interface ConfiguracaoWhatsApp {
  destinatarios: DestinatarioWhatsApp[]; // Múltiplos números cadastrados
  numero: string;                       // Campo legado/padrão para retrocompatibilidade
  diasAntecedencia: number;             // Quantos dias de antecedência para alertar (padrão: 3)
  incluirVencidas: boolean;              // Incluir contas que já venceram e continuam abertas (padrão: true)
  exibirBanner: boolean;                // Exibir banner de alerta no topo do painel
  disparoAutomatico: boolean;           // Se deve disparar automaticamente
  modoDisparoAutomatico: 'ao_abrir' | 'horario_fixo';
  horarioFixoDisparo: string;           // Ex: "09:00"
  webhookApiUrl?: string;               // URL opcional de Webhook / API WhatsApp (Z-API / Evolution / Baileys) para envio silencioso
  webhookApiKey?: string;               // Chave de autorização do Webhook / API
  ultimoDisparo: string | null;         // Timestamp ISO completo
  ultimoDisparoData: string | null;     // Formato YYYY-MM-DD para garantir disparo único diário
  historico: HistoricoDisparoWhatsApp[];
}

export interface ContaVencimentoInfo {
  item: ItemLancamento;
  diaVencimento: number;
  dataCalculada: Date;
  dataVencimentoFormatada: string;
  diasRestantes: number; // 0 = hoje, >0 = faltam N dias, <0 = atrasada
  status: 'hoje' | 'proxima' | 'atrasada' | 'futura';
}

export interface ResumoLembretesWhatsApp {
  contasHoje: ContaVencimentoInfo[];
  contasProximas: ContaVencimentoInfo[];
  contasAtrasadas: ContaVencimentoInfo[];
  todasNotificaveis: ContaVencimentoInfo[];
  totalValor: number;
  temAlertas: boolean;
}

const STORAGE_KEY_WHATSAPP = 'gestorlar_whatsapp_config';

export const CONFIGURACAO_WHATSAPP_PADRAO: ConfiguracaoWhatsApp = {
  destinatarios: [],
  numero: '',
  diasAntecedencia: 3,
  incluirVencidas: true,
  exibirBanner: true,
  disparoAutomatico: true,
  modoDisparoAutomatico: 'ao_abrir',
  horarioFixoDisparo: '09:00',
  webhookApiUrl: '',
  webhookApiKey: '',
  ultimoDisparo: null,
  ultimoDisparoData: null,
  historico: [],
};

/**
 * Carrega a configuração do WhatsApp persistida no localStorage com auto-migração
 */
export function obterConfiguracaoWhatsApp(): ConfiguracaoWhatsApp {
  if (typeof window === 'undefined') return CONFIGURACAO_WHATSAPP_PADRAO;
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_WHATSAPP);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      const config: ConfiguracaoWhatsApp = { ...CONFIGURACAO_WHATSAPP_PADRAO, ...parsed };

      // Se havia um número legado configurado e nenhum destinatário na lista, migra automaticamente
      if ((!config.destinatarios || config.destinatarios.length === 0) && config.numero && config.numero.trim()) {
        config.destinatarios = [
          {
            id: 'dest_titular_' + Date.now(),
            nome: 'Número Principal',
            numero: config.numero.trim(),
            ativo: true,
            tipo: 'titular',
          },
        ];
      }

      if (!Array.isArray(config.destinatarios)) {
        config.destinatarios = [];
      }

      if (!Array.isArray(config.historico)) {
        config.historico = [];
      }

      return config;
    }
  } catch (e) {
    console.warn('Erro ao carregar configurações do WhatsApp:', e);
  }
  return CONFIGURACAO_WHATSAPP_PADRAO;
}

/**
 * Salva a configuração do WhatsApp no localStorage
 */
export function salvarConfiguracaoWhatsApp(config: ConfiguracaoWhatsApp): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_WHATSAPP, JSON.stringify(config));
  } catch (e) {
    console.warn('Erro ao salvar configurações do WhatsApp:', e);
  }
}

/**
 * Cadastra um novo número de WhatsApp na lista de destinatários
 */
export function cadastrarDestinatarioWhatsApp(
  nome: string,
  numero: string,
  tipo: DestinatarioWhatsApp['tipo'] = 'outro'
): ConfiguracaoWhatsApp {
  const config = obterConfiguracaoWhatsApp();
  const novo: DestinatarioWhatsApp = {
    id: `dest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    nome: nome.trim() || 'Contato',
    numero: numero.trim(),
    ativo: true,
    tipo,
  };

  const novaConfig: ConfiguracaoWhatsApp = {
    ...config,
    destinatarios: [...config.destinatarios, novo],
    numero: config.numero || novo.numero,
  };

  salvarConfiguracaoWhatsApp(novaConfig);
  return novaConfig;
}

/**
 * Atualiza um destinatário existente
 */
export function atualizarDestinatarioWhatsApp(
  id: string,
  updates: Partial<DestinatarioWhatsApp>
): ConfiguracaoWhatsApp {
  const config = obterConfiguracaoWhatsApp();
  const novaLista = config.destinatarios.map((d) =>
    d.id === id ? { ...d, ...updates } : d
  );

  const novaConfig: ConfiguracaoWhatsApp = {
    ...config,
    destinatarios: novaLista,
  };

  salvarConfiguracaoWhatsApp(novaConfig);
  return novaConfig;
}

/**
 * Remove um destinatário da lista
 */
export function removerDestinatarioWhatsApp(id: string): ConfiguracaoWhatsApp {
  const config = obterConfiguracaoWhatsApp();
  const novaLista = config.destinatarios.filter((d) => d.id !== id);

  const novaConfig: ConfiguracaoWhatsApp = {
    ...config,
    destinatarios: novaLista,
  };

  salvarConfiguracaoWhatsApp(novaConfig);
  return novaConfig;
}

/**
 * Alterna status ativo/inativo de um destinatário
 */
export function alternarAtivoDestinatarioWhatsApp(id: string): ConfiguracaoWhatsApp {
  const config = obterConfiguracaoWhatsApp();
  const novaLista = config.destinatarios.map((d) =>
    d.id === id ? { ...d, ativo: !d.ativo } : d
  );

  const novaConfig: ConfiguracaoWhatsApp = {
    ...config,
    destinatarios: novaLista,
  };

  salvarConfiguracaoWhatsApp(novaConfig);
  return novaConfig;
}

/**
 * Extrai dia numérico e constrói data aproximada do vencimento
 */
export function calcularDataVencimento(
  vencimento: string,
  referenciaHoje: Date = new Date()
): { dia: number; data: Date; formatada: string } | null {
  if (!vencimento || typeof vencimento !== 'string') return null;
  const v = vencimento.trim();
  const vLower = v.toLowerCase();

  // Ignora vencimentos não definidos ou sem agendamento
  if (
    vLower === 'a definir' ||
    vLower === 'sem vencimento' ||
    vLower === 'indefinido' ||
    vLower === 'não informado' ||
    vLower === 'nao informado' ||
    vLower === 'fatura cartão' ||
    vLower === 'fatura cartao'
  ) {
    return null;
  }

  // 1. Formato ISO: YYYY-MM-DD
  const matchIso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    const ano = parseInt(matchIso[1], 10);
    const mes = parseInt(matchIso[2], 10) - 1;
    const dia = parseInt(matchIso[3], 10);
    const data = new Date(ano, mes, dia, 0, 0, 0, 0);
    const formatada = `${dia.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')}/${ano}`;
    return { dia, data, formatada };
  }

  // 2. Formato Brasileiro: DD/MM/YYYY
  const matchBr = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchBr) {
    const dia = parseInt(matchBr[1], 10);
    const mes = parseInt(matchBr[2], 10) - 1;
    const ano = parseInt(matchBr[3], 10);
    const data = new Date(ano, mes, dia, 0, 0, 0, 0);
    const formatada = `${dia.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')}/${ano}`;
    return { dia, data, formatada };
  }

  // 3. Formato Recorrente com palavra "Dia" explícita: "Dia 10", "Dia 15", "Dia 05"
  const matchDiaPrefixo = v.match(/^dia\s*0?([1-9]|[12]\d|3[01])$/i) || v.match(/\bdia\s*0?([1-9]|[12]\d|3[01])\b/i);
  if (matchDiaPrefixo) {
    const dia = parseInt(matchDiaPrefixo[1], 10);
    const anoAtual = referenciaHoje.getFullYear();
    const mesAtual = referenciaHoje.getMonth();
    
    const dataAtual = new Date(anoAtual, mesAtual, dia, 0, 0, 0, 0);
    const formatada = `Dia ${dia.toString().padStart(2, '0')} (${(mesAtual + 1).toString().padStart(2, '0')}/${anoAtual})`;
    return { dia, data: dataAtual, formatada };
  }

  // 4. Apenas o número puro do dia (ex: "10", "5")
  const matchApenasDia = v.match(/^0?([1-9]|[12]\d|3[01])$/);
  if (matchApenasDia) {
    const dia = parseInt(matchApenasDia[1], 10);
    const anoAtual = referenciaHoje.getFullYear();
    const mesAtual = referenciaHoje.getMonth();
    
    const dataAtual = new Date(anoAtual, mesAtual, dia, 0, 0, 0, 0);
    const formatada = `Dia ${dia.toString().padStart(2, '0')} (${(mesAtual + 1).toString().padStart(2, '0')}/${anoAtual})`;
    return { dia, data: dataAtual, formatada };
  }

  return null;
}

/**
 * Analisa a lista de itens e identifica quais contas estão a vencer ou atrasadas
 */
export function analisarContasParaLembrete(
  itens: ItemLancamento[],
  config: ConfiguracaoWhatsApp = obterConfiguracaoWhatsApp()
): ResumoLembretesWhatsApp {
  const agora = new Date();
  const hojeMeiaNoite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0);

  const contasHoje: ContaVencimentoInfo[] = [];
  const contasProximas: ContaVencimentoInfo[] = [];
  const contasAtrasadas: ContaVencimentoInfo[] = [];
  const todasNotificaveis: ContaVencimentoInfo[] = [];
  let totalValor = 0;

  for (const item of itens) {
    if (item.pago) continue;

    const info = calcularDataVencimento(item.vencimento, hojeMeiaNoite);
    if (!info) continue;

    const diffMs = info.data.getTime() - hojeMeiaNoite.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let status: ContaVencimentoInfo['status'] = 'futura';

    if (diffDias === 0) {
      status = 'hoje';
    } else if (diffDias > 0 && diffDias <= config.diasAntecedencia) {
      status = 'proxima';
    } else if (diffDias < 0) {
      status = 'atrasada';
    }

    const contaInfo: ContaVencimentoInfo = {
      item,
      diaVencimento: info.dia,
      dataCalculada: info.data,
      dataVencimentoFormatada: info.formatada,
      diasRestantes: diffDias,
      status,
    };

    if (status === 'hoje') {
      contasHoje.push(contaInfo);
      todasNotificaveis.push(contaInfo);
      totalValor += item.valor;
    } else if (status === 'proxima') {
      contasProximas.push(contaInfo);
      todasNotificaveis.push(contaInfo);
      totalValor += item.valor;
    } else if (status === 'atrasada' && config.incluirVencidas) {
      contasAtrasadas.push(contaInfo);
      todasNotificaveis.push(contaInfo);
      totalValor += item.valor;
    }
  }

  todasNotificaveis.sort((a, b) => a.diasRestantes - b.diasRestantes);

  return {
    contasHoje,
    contasProximas,
    contasAtrasadas,
    todasNotificaveis,
    totalValor,
    temAlertas: todasNotificaveis.length > 0,
  };
}

/**
 * Formata mensagem consolidada para envio no WhatsApp
 */
export function gerarMensagemWhatsAppConsolidada(
  resumo: ResumoLembretesWhatsApp,
  _config: ConfiguracaoWhatsApp = obterConfiguracaoWhatsApp(),
  nomeDestinatario?: string
): string {
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const linhas: string[] = [];

  linhas.push(`🔔 *GESTORLAR // ALERTA AUTOMÁTICO DE VENCIMENTO*`);
  linhas.push(`📅 *Data:* ${dataHoje}`);
  linhas.push(``);

  if (resumo.todasNotificaveis.length === 0) {
    linhas.push(`✅ *Nenhuma conta pendente para os próximos dias!*`);
    linhas.push(`Seu planejamento orçamentário está 100% equilibrado.`);
    return linhas.join('\n');
  }

  const saudacao = nomeDestinatario ? `Olá, *${nomeDestinatario}*!` : `Olá!`;
  linhas.push(`${saudacao} O sistema identificou *${resumo.todasNotificaveis.length} conta(s)* precisando de liquidação:`);
  linhas.push(``);

  if (resumo.contasHoje.length > 0) {
    linhas.push(`🔴 *VENCEM HOJE:*`);
    for (const c of resumo.contasHoje) {
      const catNome = CATEGORIAS_CONFIG[c.item.categoria]?.nome || c.item.categoria;
      linhas.push(`• *${c.item.titulo}* — ${formatarBRL(c.item.valor)}`);
      linhas.push(`   └ Pilar: ${catNome} (${c.item.tipoDetalhado})`);
    }
    linhas.push(``);
  }

  if (resumo.contasProximas.length > 0) {
    linhas.push(`⏰ *VENCENDO NOS PRÓXIMOS DIAS:*`);
    for (const c of resumo.contasProximas) {
      const diasTexto = c.diasRestantes === 1 ? 'amanhã' : `em ${c.diasRestantes} dias`;
      const catNome = CATEGORIAS_CONFIG[c.item.categoria]?.nome || c.item.categoria;
      linhas.push(`• *${c.item.titulo}* — ${formatarBRL(c.item.valor)}`);
      linhas.push(`   └ Vence ${diasTexto} (${c.dataVencimentoFormatada}) • ${catNome}`);
    }
    linhas.push(``);
  }

  if (resumo.contasAtrasadas.length > 0) {
    linhas.push(`⚠️ *CONTAS ATRASADAS PENDENTES:*`);
    for (const c of resumo.contasAtrasadas) {
      const diasAtraso = Math.abs(c.diasRestantes);
      const atrasoTexto = diasAtraso === 1 ? 'ontem' : `há ${diasAtraso} dias`;
      linhas.push(`• *${c.item.titulo}* — ${formatarBRL(c.item.valor)}`);
      linhas.push(`   └ Venceu ${atrasoTexto} (${c.dataVencimentoFormatada})`);
    }
    linhas.push(``);
  }

  linhas.push(`💰 *TOTAL PREVISTO:* ${formatarBRL(resumo.totalValor)}`);
  linhas.push(``);
  linhas.push(`👉 _Acesse o GestorLar para quitar e manter sua regra 50-30-20 em dia!_`);

  return linhas.join('\n');
}

/**
 * Formata mensagem de lembrete para um único item de conta
 */
export function gerarMensagemWhatsAppIndividual(
  item: ItemLancamento,
  diasRestantes?: number,
  nomeDestinatario?: string
): string {
  const catNome = CATEGORIAS_CONFIG[item.categoria]?.nome || item.categoria;
  const linhas: string[] = [];

  linhas.push(`🔔 *GESTORLAR // LEMBRETE DE CONTA*`);
  linhas.push(``);
  const saudacao = nomeDestinatario ? `Olá, *${nomeDestinatario}*!` : `Olá!`;
  linhas.push(`${saudacao} Segue o lembrete de pagamento da conta:`);
  linhas.push(``);
  linhas.push(`📌 *Conta:* ${item.titulo}`);
  linhas.push(`💵 *Valor:* ${formatarBRL(item.valor)}`);
  
  if (diasRestantes !== undefined) {
    if (diasRestantes === 0) {
      linhas.push(`📅 *Vencimento:* ${item.vencimento} 🔴 *(VENCE HOJE!)*`);
    } else if (diasRestantes === 1) {
      linhas.push(`📅 *Vencimento:* ${item.vencimento} ⏰ *(Vence Amanhã!)*`);
    } else if (diasRestantes > 1) {
      linhas.push(`📅 *Vencimento:* ${item.vencimento} ⏰ *(Vence em ${diasRestantes} dias)*`);
    } else {
      linhas.push(`📅 *Vencimento:* ${item.vencimento} ⚠️ *(Atrasada há ${Math.abs(diasRestantes)} dias)*`);
    }
  } else {
    linhas.push(`📅 *Vencimento:* ${item.vencimento}`);
  }

  linhas.push(`📂 *Pilar:* ${catNome} • ${item.tipoDetalhado}`);
  linhas.push(``);
  linhas.push(`Por favor, providencie o pagamento para manter seu fluxo de caixa em dia.`);
  linhas.push(`👉 _Gestor Financeiro do Lar • Metodologia 50-30-20_`);

  return linhas.join('\n');
}

/**
 * Formata mensagem de lembrete para todas as contas de um dia específico do calendário
 */
export function gerarMensagemWhatsAppDia(
  dia: number,
  mesNome: string,
  itens: ItemLancamento[]
): string {
  const linhas: string[] = [];
  const pendentes = itens.filter(i => !i.pago);
  const total = pendentes.reduce((acc, curr) => acc + curr.valor, 0);

  linhas.push(`🔔 *GESTORLAR // AGENDA DO DIA ${dia} DE ${mesNome.toUpperCase()}*`);
  linhas.push(``);
  linhas.push(`Você tem *${pendentes.length} conta(s) pendente(s)* agendadas para o dia ${dia}:`);
  linhas.push(``);

  for (const item of pendentes) {
    const catNome = CATEGORIAS_CONFIG[item.categoria]?.nome || item.categoria;
    linhas.push(`• *${item.titulo}* — ${formatarBRL(item.valor)} [${catNome}]`);
  }

  linhas.push(``);
  linhas.push(`💰 *Total a pagar neste dia:* ${formatarBRL(total)}`);
  linhas.push(``);
  linhas.push(`👉 _Acesse o GestorLar para liquidar estes compromissos._`);

  return linhas.join('\n');
}

/**
 * Higieniza o número de telefone (remove caracteres não numéricos e prefixa 55 se brasileiro)
 */
export function sanitizarNumeroWhatsApp(numero: string): string {
  if (!numero) return '';
  const limpo = numero.replace(/\D/g, '');
  if (!limpo) return '';

  if (limpo.length === 10 || limpo.length === 11) {
    return `55${limpo}`;
  }

  return limpo;
}

/**
 * Dispara a abertura do WhatsApp (Web ou App móvel) para um número específico
 */
export function dispararWhatsApp(
  mensagem: string,
  numeroTelefone?: string
): void {
  const config = obterConfiguracaoWhatsApp();
  const numAlvo = sanitizarNumeroWhatsApp(numeroTelefone || config.numero);

  let url = '';
  if (numAlvo) {
    url = `https://api.whatsapp.com/send?phone=${numAlvo}&text=${encodeURIComponent(mensagem)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');

    const agora = new Date();
    salvarConfiguracaoWhatsApp({
      ...config,
      ultimoDisparo: agora.toISOString(),
      ultimoDisparoData: agora.toISOString().split('T')[0],
    });
  }
}

/**
 * Dispara mensagens para múltiplos destinatários cadastrados (Webhooks ou janela sequencial)
 */
export async function dispararParaMultiplosDestinatarios(
  destinatarios: DestinatarioWhatsApp[],
  resumo: ResumoLembretesWhatsApp,
  config: ConfiguracaoWhatsApp = obterConfiguracaoWhatsApp(),
  modo: 'automatico' | 'manual' = 'manual'
): Promise<{ enviados: number; total: number; viaWebhook: boolean }> {
  const ativos = destinatarios.filter(d => d.ativo && d.numero.trim());
  if (ativos.length === 0) {
    return { enviados: 0, total: 0, viaWebhook: false };
  }

  // 1. Se houver Webhook API configurada (Z-API, Evolution API, Baileys, etc.), dispara silent HTTP POST
  if (config.webhookApiUrl && config.webhookApiUrl.startsWith('http')) {
    try {
      const payload = {
        evento: 'gestorlar_alerta_vencimento',
        modo,
        dataHora: new Date().toISOString(),
        totalContas: resumo.todasNotificaveis.length,
        totalValor: resumo.totalValor,
        destinatarios: ativos.map(d => ({
          nome: d.nome,
          numero: sanitizarNumeroWhatsApp(d.numero),
        })),
        mensagem: gerarMensagemWhatsAppConsolidada(resumo, config),
        contas: resumo.todasNotificaveis.map(c => ({
          titulo: c.item.titulo,
          valor: c.item.valor,
          vencimento: c.item.vencimento,
          status: c.status,
          categoria: c.item.categoria,
        })),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.webhookApiKey) {
        headers['Authorization'] = `Bearer ${config.webhookApiKey}`;
      }

      await fetch(config.webhookApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      // Registra no histórico
      const agora = new Date();
      const novoHistorico: HistoricoDisparoWhatsApp = {
        id: `disp_${Date.now()}`,
        dataHora: agora.toISOString(),
        contasNotificadas: resumo.todasNotificaveis.length,
        totalValor: resumo.totalValor,
        destinatarios: ativos.map(d => d.nome),
        modo,
        status: 'sucesso',
        detalhes: 'Disparado via Webhook API em background',
      };

      salvarConfiguracaoWhatsApp({
        ...config,
        ultimoDisparo: agora.toISOString(),
        ultimoDisparoData: agora.toISOString().split('T')[0],
        historico: [novoHistorico, ...(config.historico || [])].slice(0, 30),
      });

      return { enviados: ativos.length, total: ativos.length, viaWebhook: true };
    } catch (err) {
      console.warn('Falha no webhook WhatsApp, acionando fallback de abertura direta:', err);
    }
  }

  // 2. Disparo direto cliente: abre WhatsApp para cada destinatário
  for (let i = 0; i < ativos.length; i++) {
    const dest = ativos[i];
    const msg = gerarMensagemWhatsAppConsolidada(resumo, config, dest.nome);
    const numAlvo = sanitizarNumeroWhatsApp(dest.numero);

    if (numAlvo && typeof window !== 'undefined') {
      setTimeout(() => {
        const url = `https://api.whatsapp.com/send?phone=${numAlvo}&text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }, i * 600); // Espaçamento suave para evitar bloqueios de popup no navegador
    }
  }

  const agora = new Date();
  const novoHistorico: HistoricoDisparoWhatsApp = {
    id: `disp_${Date.now()}`,
    dataHora: agora.toISOString(),
    contasNotificadas: resumo.todasNotificaveis.length,
    totalValor: resumo.totalValor,
    destinatarios: ativos.map(d => d.nome),
    modo,
    status: 'sucesso',
    detalhes: `Disparado para ${ativos.length} número(s) cadastrado(s)`,
  };

  salvarConfiguracaoWhatsApp({
    ...config,
    ultimoDisparo: agora.toISOString(),
    ultimoDisparoData: agora.toISOString().split('T')[0],
    historico: [novoHistorico, ...(config.historico || [])].slice(0, 30),
  });

  return { enviados: ativos.length, total: ativos.length, viaWebhook: false };
}

/**
 * Robô de Automação Diária: verifica e dispara automaticamente para os números cadastrados
 */
export async function executarDisparoAutomaticoSeNecessario(
  itens: ItemLancamento[],
  forcar: boolean = false
): Promise<{
  disparado: boolean;
  motivo?: string;
  totalDestinatarios?: number;
  totalContas?: number;
}> {
  const config = obterConfiguracaoWhatsApp();

  if (!config.disparoAutomatico && !forcar) {
    return { disparado: false, motivo: 'Disparo automático desativado nas preferências.' };
  }

  const ativos = config.destinatarios.filter(d => d.ativo && d.numero.trim());
  if (ativos.length === 0 && (!config.numero || !config.numero.trim())) {
    return { disparado: false, motivo: 'Nenhum número de WhatsApp ativo cadastrado.' };
  }

  const resumo = analisarContasParaLembrete(itens, config);
  if (!resumo.temAlertas && !forcar) {
    return { disparado: false, motivo: 'Nenhuma conta a vencer ou pendente encontrada.' };
  }

  const hojeStr = new Date().toISOString().split('T')[0];

  // Verifica se já disparou hoje (para não spammar o usuário ao recarregar a tela várias vezes)
  if (!forcar && config.ultimoDisparoData === hojeStr) {
    return { disparado: false, motivo: `Alerta automático já foi disparado hoje (${hojeStr}).` };
  }

  // Lista de destinatários a notificar
  const listaAlvo: DestinatarioWhatsApp[] = ativos.length > 0 
    ? ativos 
    : [{ id: 'padrao', nome: 'Principal', numero: config.numero, ativo: true }];

  const resultado = await dispararParaMultiplosDestinatarios(
    listaAlvo, 
    resumo, 
    config, 
    forcar ? 'manual' : 'automatico'
  );

  return {
    disparado: true,
    totalDestinatarios: resultado.enviados,
    totalContas: resumo.todasNotificaveis.length,
  };
}
