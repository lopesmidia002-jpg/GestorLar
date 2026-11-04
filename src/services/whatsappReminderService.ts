import type { ItemLancamento } from '../types/finance';
import { formatarBRL, CATEGORIAS_CONFIG } from '../utils/calculations';

export interface ConfiguracaoWhatsApp {
  numero: string;            // Ex: "5511999998888" ou "11999998888"
  diasAntecedencia: number;  // Quantos dias de antecedência para alertar (padrão: 3)
  incluirVencidas: boolean;   // Incluir contas que já venceram e continuam abertas (padrão: true)
  exibirBanner: boolean;     // Exibir banner de alerta no topo do painel
  ultimoDisparo: string | null; // ISO timestamp do último lembrete disparado
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
  numero: '',
  diasAntecedencia: 3,
  incluirVencidas: true,
  exibirBanner: true,
  ultimoDisparo: null,
};

/**
 * Carrega a configuração do WhatsApp persistida no localStorage
 */
export function obterConfiguracaoWhatsApp(): ConfiguracaoWhatsApp {
  if (typeof window === 'undefined') return CONFIGURACAO_WHATSAPP_PADRAO;
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_WHATSAPP);
    if (salvo) {
      return { ...CONFIGURACAO_WHATSAPP_PADRAO, ...JSON.parse(salvo) };
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
 * Extrai dia numérico e constrói data aproximada do vencimento
 */
export function calcularDataVencimento(
  vencimento: string,
  referenciaHoje: Date = new Date()
): { dia: number; data: Date; formatada: string } | null {
  if (!vencimento || typeof vencimento !== 'string') return null;
  const v = vencimento.trim();

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

  // 3. Formato Recorrente: "Dia 10", "15", "Dia 05"
  const matchDia = v.match(/\b(?:dia\s*)?0?([1-9]|[12]\d|3[01])\b/i);
  if (matchDia) {
    const dia = parseInt(matchDia[1], 10);
    const anoAtual = referenciaHoje.getFullYear();
    const mesAtual = referenciaHoje.getMonth();
    
    // Se o dia for no mês atual
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
    // Ignora contas que já foram liquidadas
    if (item.pago) continue;

    const info = calcularDataVencimento(item.vencimento, hojeMeiaNoite);
    if (!info) continue;

    // Diferença em dias
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

  // Ordena por prioridade: hoje -> próximas mais urgentes -> atrasadas
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
  _config: ConfiguracaoWhatsApp = obterConfiguracaoWhatsApp()
): string {
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const linhas: string[] = [];

  linhas.push(`🔔 *GESTORLAR // LEMBRETE DE VENCIMENTO*`);
  linhas.push(`📅 *Data do Alerta:* ${dataHoje}`);
  linhas.push(``);

  if (resumo.todasNotificaveis.length === 0) {
    linhas.push(`✅ *Nenhuma conta pendente para os próximos dias!*`);
    linhas.push(`Seu planejamento financeiro está 100% em dia.`);
    return linhas.join('\n');
  }

  linhas.push(`Olá! Você possui *${resumo.todasNotificaveis.length} conta(s)* com vencimento próximo ou hoje precisando de atenção:`);
  linhas.push(``);

  // 1. Contas que vencem hoje
  if (resumo.contasHoje.length > 0) {
    linhas.push(`🔴 *VENCEM HOJE:*`);
    for (const c of resumo.contasHoje) {
      const catNome = CATEGORIAS_CONFIG[c.item.categoria]?.nome || c.item.categoria;
      linhas.push(`• *${c.item.titulo}* — ${formatarBRL(c.item.valor)}`);
      linhas.push(`   └ Pilar: ${catNome} (${c.item.tipoDetalhado})`);
    }
    linhas.push(``);
  }

  // 2. Contas que vencem nos próximos dias
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

  // 3. Contas atrasadas
  if (resumo.contasAtrasadas.length > 0) {
    linhas.push(`⚠️ *CONTAS ATRASADAS PENDENTES:*`);
    for (const c of resumo.contasAtrasadas) {
      const diasAtraso = Math.abs(c.diasRestantes);
      const atrasoTexto = diasAtraso === 1 ? 'ontem (1 dia atrás)' : `há ${diasAtraso} dias`;
      linhas.push(`• *${c.item.titulo}* — ${formatarBRL(c.item.valor)}`);
      linhas.push(`   └ Venceu ${atrasoTexto} (${c.dataVencimentoFormatada})`);
    }
    linhas.push(``);
  }

  linhas.push(`💰 *TOTAL PREVISTO A LIQUIDAR:* ${formatarBRL(resumo.totalValor)}`);
  linhas.push(``);
  linhas.push(`👉 _Acesse seu painel GestorLar para marcar como pago e manter a regra 50-30-20 equilibrada!_`);

  return linhas.join('\n');
}

/**
 * Formata mensagem de lembrete para um único item de conta
 */
export function gerarMensagemWhatsAppIndividual(
  item: ItemLancamento,
  diasRestantes?: number
): string {
  const catNome = CATEGORIAS_CONFIG[item.categoria]?.nome || item.categoria;
  const linhas: string[] = [];

  linhas.push(`🔔 *GESTORLAR // LEMBRETE DE CONTA*`);
  linhas.push(``);
  linhas.push(`Olá! Segue o lembrete de pagamento da conta:`);
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
  linhas.push(`Por favor, providencie o pagamento para manter seu fluxo de caixa do lar em dia.`);
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
 * Higieniza o número de telefone (remove parênteses, traços, espaços e adiciona DDI se necessário)
 */
export function sanitizarNumeroWhatsApp(numero: string): string {
  if (!numero) return '';
  const limpo = numero.replace(/\D/g, '');
  if (!limpo) return '';

  // Se tem 10 ou 11 dígitos (DDD brasileiro + número), prefixa com 55 (Brasil)
  if (limpo.length === 10 || limpo.length === 11) {
    return `55${limpo}`;
  }

  return limpo;
}

/**
 * Dispara a abertura do WhatsApp (Web ou App móvel) com a mensagem formatada
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
    // Se o usuário ainda não cadastrou o número, abre o seletor de contatos do WhatsApp
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');

    // Atualiza o timestamp do último disparo
    salvarConfiguracaoWhatsApp({
      ...config,
      ultimoDisparo: new Date().toISOString(),
    });
  }
}
