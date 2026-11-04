import { getFirebaseMessaging, VAPID_KEY, isFirebaseConfigured } from '../config/firebase';
import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import type { EstadoFinanceiro, CalculoOrcamentario } from '../types/finance';
import { formatarBRL } from '../utils/calculations';

export interface NotificationStatus {
  suportado: boolean;
  permissao: NotificationPermission;
  tokenFCM: string | null;
  firebaseConfigurado: boolean;
}

export interface AlertaFinanceiro {
  id: string;
  tipo:
    | 'vencimento_hoje'
    | 'vencimento_proximo'
    | 'conta_atrasada'
    | 'saldo_negativo'
    | 'margem_critica'
    | 'estouro_fixas'
    | 'estouro_superfluos'
    | 'meta_investimento_atingida'
    | 'sem_investimentos';
  nivel: 'urgente' | 'alerta' | 'sucesso' | 'info';
  titulo: string;
  mensagem: string;
  itemRelacionadoId?: string;
  valor?: number;
  dataCriacao: string;
}

export interface PreferenciasNotificacao {
  contasVencendo: boolean;
  saldoNegativo: boolean;
  estouroMetas503020: boolean;
  investimentos: boolean;
}

const STORAGE_KEY_TOKEN = 'gestorlar_fcm_token';
const STORAGE_KEY_PREFS = 'gestorlar_notif_preferencias';
const STORAGE_KEY_ULTIMOS_DISPAROS = 'gestorlar_notif_ultimos_disparos';

export const PREFERENCIAS_PADRAO: PreferenciasNotificacao = {
  contasVencendo: true,
  saldoNegativo: true,
  estouroMetas503020: true,
  investimentos: true,
};

/**
 * Obtém as preferências salvas pelo usuário
 */
export function obterPreferenciasNotificacao(): PreferenciasNotificacao {
  if (typeof window === 'undefined') return PREFERENCIAS_PADRAO;
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_PREFS);
    if (salvo) return { ...PREFERENCIAS_PADRAO, ...JSON.parse(salvo) };
  } catch {
    // fallback
  }
  return PREFERENCIAS_PADRAO;
}

/**
 * Salva as preferências de notificação do usuário
 */
export function salvarPreferenciasNotificacao(prefs: PreferenciasNotificacao): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  } catch {
    // quota
  }
}

/**
 * Retorna o status atual das permissões e do token no navegador
 */
export function obterStatusNotificacoes(): NotificationStatus {
  const suportado = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  const permissao = suportado ? Notification.permission : 'denied';
  const tokenFCM = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;

  return {
    suportado,
    permissao,
    tokenFCM,
    firebaseConfigurado: isFirebaseConfigured,
  };
}

/**
 * Registra o Service Worker dedicado para Web Push do Firebase
 */
export async function registrarServiceWorkerPush(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    return reg;
  } catch (error) {
    console.warn('Falha ao registrar firebase-messaging-sw.js:', error);
    return null;
  }
}

/**
 * Solicita autorização ao usuário e obtém o Token FCM do Firebase Cloud Messaging
 */
export async function solicitarPermissaoNotificacoes(): Promise<{
  sucesso: boolean;
  token?: string;
  permissao: NotificationPermission;
  mensagem: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      sucesso: false,
      permissao: 'denied',
      mensagem: 'Notificações push não são suportadas neste navegador.',
    };
  }

  try {
    const permissao = await Notification.requestPermission();

    if (permissao !== 'granted') {
      return {
        sucesso: false,
        permissao,
        mensagem:
          permissao === 'denied'
            ? 'Permissão bloqueada no navegador. Permita o envio nas configurações do site.'
            : 'Permissão não concedida.',
      };
    }

    // Registra o Service Worker
    const swRegistration = await registrarServiceWorkerPush();

    // Tenta obter Token FCM pelo Firebase Messaging
    let tokenFCM: string | null = null;
    const messaging = await getFirebaseMessaging();

    if (messaging && swRegistration) {
      try {
        tokenFCM = await getToken(messaging, {
          vapidKey: VAPID_KEY || undefined,
          serviceWorkerRegistration: swRegistration,
        });

        if (tokenFCM) {
          localStorage.setItem(STORAGE_KEY_TOKEN, tokenFCM);
        }
      } catch (fcmError) {
        console.warn('Aviso: Token FCM não gerado (verifique as chaves VAPID/Firebase no .env):', fcmError);
      }
    }

    // Dispara notificação de boas-vindas para confirmação visual
    await dispararNotificacaoLocal(
      '🔔 GestorLar • Notificações Push Ativadas!',
      'Você receberá alertas inteligentes de contas a vencer, risco de saldo negativo e metas 50-30-20.'
    );

    return {
      sucesso: true,
      token: tokenFCM || undefined,
      permissao: 'granted',
      mensagem: tokenFCM
        ? 'Notificações Push com Firebase FCM ativadas com sucesso!'
        : 'Notificações ativadas! (Configure as credenciais no .env para envio via Firebase Console).',
    };
  } catch (error: any) {
    console.error('Erro ao solicitar permissão de notificações:', error);
    return {
      sucesso: false,
      permissao: Notification.permission,
      mensagem: `Erro ao ativar notificações: ${error?.message || 'Falha inesperada'}`,
    };
  }
}

/**
 * Dispara uma notificação nativa direta no dispositivo
 */
export async function dispararNotificacaoLocal(
  titulo: string,
  corpo: string,
  urlDestino: string = '/'
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    // Dá preferência ao Service Worker para suporte em background/mobile PWA
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(titulo, {
          body: corpo,
          icon: '/notification-logo.png',
          badge: '/push-badge.png',
          tag: 'gestorlar-local-' + Date.now(),
          data: { url: urlDestino },
        });
        return true;
      }
    }

    // Fallback nativo do navegador
    new Notification(titulo, {
      body: corpo,
      icon: '/notification-logo.png',
    });
    return true;
  } catch (err) {
    console.warn('Erro ao disparar notificação local:', err);
    return false;
  }
}

/**
 * Escuta notificações recebidas em primeiro plano (quando o app estiver aberto)
 */
export async function escutarNotificacoesPrimeiroPlano(
  aoReceber: (mensagem: MessagePayload) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    const cancelarInscricao = onMessage(messaging, (payload) => {
      if (payload.notification?.title) {
        dispararNotificacaoLocal(
          payload.notification.title,
          payload.notification.body || ''
        );
      }
      aoReceber(payload);
    });
    return cancelarInscricao;
  } catch (error) {
    console.warn('Falha ao registrar ouvinte de mensagens em primeiro plano:', error);
    return null;
  }
}

// =========================================================================
// MOTOR DE GERAÇÃO DE ALERTAS FINANCEIROS INTELIGENTES (CONTAS, SALDO, 50-30-20)
// =========================================================================

/**
 * Extrai o dia numérico do vencimento (suporta "Dia 10", "15", "2026-10-25")
 */
function extrairDiaVencimento(vencimento: string): number | null {
  if (!vencimento) return null;
  const match = vencimento.match(/\b([1-9]|[12][0-9]|3[01])\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Analisa todo o orçamento em tempo real e compila todos os alertas relevantes
 */
export function gerarAlertasDoMomento(
  estado: EstadoFinanceiro,
  calculos: CalculoOrcamentario
): AlertaFinanceiro[] {
  const alertas: AlertaFinanceiro[] = [];
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const dataHojeStr = hoje.toISOString().split('T')[0];

  // 1. ANÁLISE DE CONTAS PENDENTES / A VENCER / ATRASADAS
  for (const it of estado.itens) {
    if (it.pago) continue;

    const diaVenc = extrairDiaVencimento(it.vencimento);
    if (!diaVenc) continue;

    if (diaVenc === diaAtual) {
      alertas.push({
        id: `alerta_venc_hoje_${it.id}`,
        tipo: 'vencimento_hoje',
        nivel: 'urgente',
        titulo: `🚨 Conta Vence HOJE: "${it.titulo}"`,
        mensagem: `O pagamento de ${formatarBRL(it.valor)} (${it.tipoDetalhado}) vence hoje! Evite juros e quite agora.`,
        itemRelacionadoId: it.id,
        valor: it.valor,
        dataCriacao: dataHojeStr,
      });
    } else if (diaVenc > diaAtual && diaVenc <= diaAtual + 3) {
      const diasRestantes = diaVenc - diaAtual;
      alertas.push({
        id: `alerta_venc_prox_${it.id}`,
        tipo: 'vencimento_proximo',
        nivel: 'alerta',
        titulo: `⏰ Conta a Vencer: "${it.titulo}"`,
        mensagem: `Vence em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} (Dia ${diaVenc}) no valor de ${formatarBRL(it.valor)}.`,
        itemRelacionadoId: it.id,
        valor: it.valor,
        dataCriacao: dataHojeStr,
      });
    } else if (diaVenc < diaAtual) {
      const diasAtraso = diaAtual - diaVenc;
      alertas.push({
        id: `alerta_venc_atraso_${it.id}`,
        tipo: 'conta_atrasada',
        nivel: 'urgente',
        titulo: `⚠️ Conta Atrasada: "${it.titulo}"`,
        mensagem: `Venceu há ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'} (Dia ${diaVenc}) e continua pendente (${formatarBRL(it.valor)}).`,
        itemRelacionadoId: it.id,
        valor: it.valor,
        dataCriacao: dataHojeStr,
      });
    }
  }

  // 2. ANÁLISE DE SALDO LIVRE E RISCO DE DÉFICIT
  if (calculos.saldoLivre < 0) {
    alertas.push({
      id: `alerta_saldo_negativo_${dataHojeStr}`,
      tipo: 'saldo_negativo',
      nivel: 'urgente',
      titulo: '🔴 Orçamento no Vermelho! Saldo Negativo',
      mensagem: `Seus gastos superaram sua renda em ${formatarBRL(Math.abs(calculos.saldoLivre))} (${calculos.taxaComprometimento.toFixed(1)}% comprometido). Reajuste despesas supérfluas!`,
      valor: Math.abs(calculos.saldoLivre),
      dataCriacao: dataHojeStr,
    });
  } else if (calculos.saldoLivre < estado.rendaFamiliar * 0.1) {
    alertas.push({
      id: `alerta_margem_critica_${dataHojeStr}`,
      tipo: 'margem_critica',
      nivel: 'alerta',
      titulo: '⚠️ Margem Financeira Crítica (Menos de 10%)',
      mensagem: `Atenção: resta apenas ${formatarBRL(calculos.saldoLivre)} de saldo livre (${calculos.taxaComprometimento.toFixed(1)}% da renda já comprometida).`,
      valor: calculos.saldoLivre,
      dataCriacao: dataHojeStr,
    });
  }

  // 3. ANÁLISE DE TETOS DA REGRA 50-30-20
  if (calculos.percentFixas > estado.metasRegra.fixas) {
    alertas.push({
      id: `alerta_estouro_fixas_${dataHojeStr}`,
      tipo: 'estouro_fixas',
      nivel: 'alerta',
      titulo: '📌 Teto de Contas Fixas Ultrapassado',
      mensagem: `Contas essenciais atingiram ${calculos.percentFixas.toFixed(1)}% da renda (Teto recomendado: ${estado.metasRegra.fixas}%). Excesso de ${formatarBRL(calculos.desvioFixas)}.`,
      valor: calculos.desvioFixas,
      dataCriacao: dataHojeStr,
    });
  }

  if (calculos.percentSuperfluos > estado.metasRegra.superfluos) {
    alertas.push({
      id: `alerta_estouro_superfluos_${dataHojeStr}`,
      tipo: 'estouro_superfluos',
      nivel: 'alerta',
      titulo: '🛍️ Limite de Supérfluos Ultrapassado',
      mensagem: `Gastos com estilo de vida atingiram ${calculos.percentSuperfluos.toFixed(1)}% da renda (Limite: ${estado.metasRegra.superfluos}%). Excesso de ${formatarBRL(calculos.desvioSuperfluos)}.`,
      valor: calculos.desvioSuperfluos,
      dataCriacao: dataHojeStr,
    });
  }

  // 4. ANÁLISE DE INVESTIMENTOS
  if (calculos.percentInvestimentos >= estado.metasRegra.investimentos && calculos.totalInvestimentos > 0) {
    alertas.push({
      id: `alerta_meta_inv_${dataHojeStr}`,
      tipo: 'meta_investimento_atingida',
      nivel: 'sucesso',
      titulo: '🎯 Parabéns! Meta de Investimentos Concluída',
      mensagem: `Você atingiu sua meta de aportes com ${formatarBRL(calculos.totalInvestimentos)} (${calculos.percentInvestimentos.toFixed(1)}% da renda). Excelente disciplina financeira!`,
      valor: calculos.totalInvestimentos,
      dataCriacao: dataHojeStr,
    });
  } else if (diaAtual >= 20 && calculos.totalInvestimentos === 0) {
    alertas.push({
      id: `alerta_sem_inv_${dataHojeStr}`,
      tipo: 'sem_investimentos',
      nivel: 'info',
      titulo: '📈 Lembrete: Nenhum Aporte Registrado',
      mensagem: 'Estamos na reta final do mês e você ainda não realizou aportes para sua reserva ou investimentos.',
      dataCriacao: dataHojeStr,
    });
  }

  return alertas;
}

/**
 * Executa a verificação global de alertas e envia notificações push para os eventos não notificados hoje
 */
export function executarVerificacaoGlobalENotificar(
  estado: EstadoFinanceiro,
  calculos: CalculoOrcamentario
): void {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  const prefs = obterPreferenciasNotificacao();
  const hoje = new Date().toISOString().split('T')[0];

  let ultimosDisparos: Record<string, string> = {};
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_ULTIMOS_DISPAROS);
    if (salvo) ultimosDisparos = JSON.parse(salvo);
  } catch {
    ultimosDisparos = {};
  }

  const alertas = gerarAlertasDoMomento(estado, calculos);

  for (const alerta of alertas) {
    // Filtra conforme as preferências do usuário
    if (
      (alerta.tipo.startsWith('vencimento') || alerta.tipo === 'conta_atrasada') &&
      !prefs.contasVencendo
    ) {
      continue;
    }
    if (
      (alerta.tipo === 'saldo_negativo' || alerta.tipo === 'margem_critica') &&
      !prefs.saldoNegativo
    ) {
      continue;
    }
    if (
      (alerta.tipo === 'estouro_fixas' || alerta.tipo === 'estouro_superfluos') &&
      !prefs.estouroMetas503020
    ) {
      continue;
    }
    if (
      (alerta.tipo === 'meta_investimento_atingida' || alerta.tipo === 'sem_investimentos') &&
      !prefs.investimentos
    ) {
      continue;
    }

    // Evita reenviar o mesmo alerta mais de uma vez no mesmo dia
    const chaveAlerta = `${alerta.id}_${hoje}`;
    if (ultimosDisparos[chaveAlerta]) {
      continue;
    }

    // Dispara a notificação push nativa no dispositivo
    dispararNotificacaoLocal(alerta.titulo, alerta.mensagem);
    ultimosDisparos[chaveAlerta] = new Date().toISOString();
  }

  try {
    localStorage.setItem(STORAGE_KEY_ULTIMOS_DISPAROS, JSON.stringify(ultimosDisparos));
  } catch {
    // ignore
  }
}
